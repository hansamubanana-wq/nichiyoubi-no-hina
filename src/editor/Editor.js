import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { AssetManager } from "../core/assets.js";
import { createObject, PALETTE, TYPE_LABELS } from "./MapKit.js";
import { serialize, applyMapData, transformOf } from "./mapIO.js";

import { buildHouse, upgradeHouse } from "../scenes/house.js";
import { buildHinaRoom, upgradeHinaRoom } from "../scenes/hinaRoom.js";
import { buildSchool, upgradeSchool } from "../scenes/school.js";
import { buildBeach } from "../scenes/beach.js";
import { buildFuneral } from "../scenes/funeral.js";

// このゲーム専用の軽量マップ編集エンジン。
// 既存シーンを読み込み、オブジェクトの配置/移動/回転/拡縮/削除/追加/種類変更を行い、
// 人間が読める JSON（public/maps/<scene>.json）として保存・読込する。

const SCENES = {
  house: { build: buildHouse, upgrade: upgradeHouse },
  hinaRoom: { build: buildHinaRoom, upgrade: upgradeHinaRoom },
  school: { build: buildSchool, upgrade: upgradeSchool },
  beach: { build: buildBeach, upgrade: null },
  funeral: { build: buildFuneral, upgrade: null },
};

export class Editor {
  constructor() {
    this.canvas = document.getElementById("scene");
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.assets = new AssetManager(this.renderer);

    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 300);
    this.camera.position.set(6, 5, 8);

    this.orbit = new OrbitControls(this.camera, this.canvas);
    this.orbit.target.set(0, 1, 0);

    this.gizmo = new TransformControls(this.camera, this.canvas);
    this.gizmo.addEventListener("dragging-changed", (e) => {
      this.orbit.enabled = !e.value;
    });
    this.gizmo.addEventListener("objectChange", () => {
      if (this.selected) this.selected.dirty = true;
      this._refreshInfo();
    });
    this._gizmoHelper = this.gizmo.getHelper ? this.gizmo.getHelper() : this.gizmo;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.sceneName = "house";
    this.items = []; // { name, obj, type, added, dirty, removed }
    this.selected = null;
    this.addCounter = 0;

    this._buildUI();
    this._bind();
    this._loop();
    this.loadScene("house");
  }

  // ---------- シーン読み込み ----------
  async loadScene(name) {
    this.sceneName = name;
    this._setStatus(`「${name}」を読み込み中…`);
    await this.assets.ready;
    const def = SCENES[name];
    const built = def.build();
    if (def.upgrade) await def.upgrade(this.assets, built.scene, built.refs, null, { skipMap: true });

    // エディタ用の足場（グリッド・光）を追加
    const grid = new THREE.GridHelper(40, 40, 0x4a5568, 0x2a3038);
    grid.position.y = 0.01;
    grid.name = "__grid";
    built.scene.add(grid);
    this.grid = grid;
    if (!built.scene.getObjectByProperty("isDirectionalLight", true)) {
      const dl = new THREE.DirectionalLight(0xffffff, 0.6);
      dl.position.set(5, 10, 6);
      built.scene.add(dl);
    }

    this.scene = built.scene;
    this.scene.add(this._gizmoHelper);

    // 編集対象を列挙（足場・ライト・gizmo を除く）
    this.items = [];
    let auto = 0;
    for (const child of [...this.scene.children]) {
      if (child === this.grid || child === this._gizmoHelper) continue;
      if (child.isLight || child.isCamera) continue;
      if (child.type === "Mesh" && child.geometry?.type === "SphereGeometry" && !child.material?.map)
        {/* 小さな装飾も編集可にする */}
      if (!child.name) child.name = `auto:${auto++}`;
      this.items.push({
        name: child.name,
        obj: child,
        type: child.userData.kitType || null,
        added: false,
        dirty: false,
        removed: false,
      });
    }

    // 既存の保存マップを取り込み（あれば適用＋dirty/added 復元）
    await this._mergeSavedMap(name);

    this.gizmo.detach();
    this.selected = null;
    this._refreshList();
    this._setStatus(`「${name}」読み込み完了（${this.items.length} オブジェクト）`);
  }

  async _mergeSavedMap(name) {
    let map = null;
    try {
      const res = await fetch(`/maps/${name}.json`);
      if (res.ok) map = await res.json();
    } catch (e) {}
    if (!map) return;
    await applyMapData(this.scene, map, this.assets);
    // overrides は dirty として復元
    if (map.overrides) {
      for (const n of Object.keys(map.overrides)) {
        const it = this.items.find((i) => i.name === n);
        if (it) it.dirty = true;
      }
    }
    // removed
    if (map.removed) {
      for (const n of map.removed) {
        const it = this.items.find((i) => i.name === n);
        if (it) it.removed = true;
      }
    }
    // added は新規 item として登録
    if (map.added) {
      for (const a of map.added) {
        const obj = this.scene.getObjectByName(a.name);
        if (obj)
          this.items.push({ name: a.name, obj, type: a.type, added: true, dirty: true, removed: false });
      }
    }
  }

  // ---------- 操作 ----------
  select(item) {
    if (!item || item.removed) {
      this.gizmo.detach();
      this.selected = null;
    } else {
      this.selected = item;
      this.gizmo.attach(item.obj);
    }
    this._refreshList();
    this._refreshInfo();
  }

  setMode(mode) {
    this.gizmo.setMode(mode);
    this._modeBtns &&
      Object.entries(this._modeBtns).forEach(([m, b]) =>
        b.classList.toggle("on", m === mode)
      );
  }

  toggleSnap() {
    this._snap = !this._snap;
    this.gizmo.setTranslationSnap(this._snap ? 0.25 : null);
    this.gizmo.setRotationSnap(this._snap ? THREE.MathUtils.degToRad(15) : null);
    this._snapBtn.classList.toggle("on", this._snap);
  }

  deleteSelected() {
    if (!this.selected) return;
    const it = this.selected;
    this.gizmo.detach();
    if (it.obj.parent) it.obj.parent.remove(it.obj);
    if (it.added) {
      this.items = this.items.filter((x) => x !== it);
    } else {
      it.removed = true;
    }
    this.selected = null;
    this._refreshList();
  }

  async addObject(type) {
    const obj = await createObject(type, this.assets);
    obj.userData.kitType = type;
    obj.name = `add:${this.addCounter++}`;
    const t = this.orbit.target;
    obj.position.set(Math.round(t.x), 0, Math.round(t.z));
    obj.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    this.scene.add(obj);
    const item = { name: obj.name, obj, type, added: true, dirty: true, removed: false };
    this.items.push(item);
    this._refreshList();
    this.select(item);
    this.setMode("translate");
  }

  // 種類変更（選択中の追加オブジェクトを別種類で作り直す。位置は維持）
  async changeType(type) {
    const it = this.selected;
    if (!it) return;
    const t = transformOf(it.obj);
    if (it.obj.parent) it.obj.parent.remove(it.obj);
    const obj = await createObject(type, this.assets);
    obj.userData.kitType = type;
    obj.name = it.name;
    obj.position.set(t.pos[0], t.pos[1], t.pos[2]);
    obj.rotation.set(t.rot[0], t.rot[1], t.rot[2]);
    obj.scale.setScalar(t.scale);
    obj.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    this.scene.add(obj);
    it.obj = obj;
    it.type = type;
    it.added = true; // 種類変更後は再生成が必要なので added 扱いで保存
    it.dirty = true;
    this.select(it);
  }

  save() {
    const json = serialize(this.sceneName, this.items);
    // ダウンロード
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${this.sceneName}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    // クリップボードにもコピー
    navigator.clipboard && navigator.clipboard.writeText(json).catch(() => {});
    this._setStatus(
      `保存しました → ${this.sceneName}.json を public/maps/ に置いてください（クリップボードにもコピー済み）`
    );
  }

  async loadFromFile(file) {
    const text = await file.text();
    const map = JSON.parse(text);
    await this.loadScene(map.scene || this.sceneName); // ベースを作り直し
    await applyMapData(this.scene, map, this.assets);
    // 状態復元
    if (map.overrides)
      for (const n of Object.keys(map.overrides)) {
        const it = this.items.find((i) => i.name === n);
        if (it) it.dirty = true;
      }
    if (map.removed)
      for (const n of map.removed) {
        const it = this.items.find((i) => i.name === n);
        if (it) it.removed = true;
      }
    if (map.added)
      for (const a of map.added) {
        const obj = this.scene.getObjectByName(a.name);
        if (obj) this.items.push({ name: a.name, obj, type: a.type, added: true, dirty: true, removed: false });
      }
    this._refreshList();
    this._setStatus("ファイルを読み込みました");
  }

  // ---------- 入力 ----------
  _bind() {
    addEventListener("resize", () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
    });
    this.renderer.setSize(innerWidth, innerHeight);

    this.canvas.addEventListener("pointerdown", (e) => {
      if (this.gizmo.dragging) return;
      this.pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const objs = this.items.filter((i) => !i.removed).map((i) => i.obj);
      const hits = this.raycaster.intersectObjects(objs, true);
      if (hits.length) {
        let o = hits[0].object;
        while (o && !objs.includes(o)) o = o.parent;
        const it = this.items.find((i) => i.obj === o);
        if (it) this.select(it);
      }
    });

    addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "w") this.setMode("translate");
      else if (e.key === "e") this.setMode("rotate");
      else if (e.key === "r") this.setMode("scale");
      else if (e.key === "Delete" || e.key === "x") this.deleteSelected();
      else if (e.key === "Escape") this.select(null);
    });
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    this.orbit.update();
    if (this.scene) this.renderer.render(this.scene, this.camera);
  }

  // ---------- UI ----------
  _buildUI() {
    const panel = document.getElementById("panel");
    panel.innerHTML = "";

    // シーン選択
    const sceneSel = el("select", { id: "sceneSel" });
    Object.keys(SCENES).forEach((n) => sceneSel.appendChild(el("option", { value: n }, n)));
    sceneSel.addEventListener("change", () => this.loadScene(sceneSel.value));
    panel.append(section("シーン", sceneSel));

    // モード
    const modeWrap = el("div", { class: "row" });
    this._modeBtns = {};
    [["translate", "移動(W)"], ["rotate", "回転(E)"], ["scale", "拡縮(R)"]].forEach(([m, label]) => {
      const b = el("button", {}, label);
      b.addEventListener("click", () => this.setMode(m));
      this._modeBtns[m] = b;
      modeWrap.append(b);
    });
    this._snapBtn = el("button", {}, "スナップ");
    this._snapBtn.addEventListener("click", () => this.toggleSnap());
    modeWrap.append(this._snapBtn);
    panel.append(section("変形", modeWrap));

    // 操作
    const opWrap = el("div", { class: "row" });
    const delBtn = el("button", { class: "danger" }, "削除(Del)");
    delBtn.addEventListener("click", () => this.deleteSelected());
    opWrap.append(delBtn);
    panel.append(section("操作", opWrap));

    // 種類変更
    const typeSel = el("select", { id: "typeSel" });
    Object.keys(TYPE_LABELS).forEach((t) =>
      typeSel.appendChild(el("option", { value: t }, TYPE_LABELS[t]))
    );
    const typeBtn = el("button", {}, "選択中を この種類に");
    typeBtn.addEventListener("click", () => this.changeType(typeSel.value));
    panel.append(section("種類変更", el("div", { class: "col" }, typeSel, typeBtn)));

    // パレット（追加）
    const pal = el("div", { class: "palette" });
    PALETTE.forEach((g) => {
      pal.append(el("div", { class: "pal-group" }, g.group));
      const row = el("div", { class: "row wrap" });
      g.items.forEach((t) => {
        const b = el("button", { class: "pal" }, TYPE_LABELS[t] || t);
        b.addEventListener("click", () => this.addObject(t));
        row.append(b);
      });
      pal.append(row);
    });
    panel.append(section("追加（パレット）", pal));

    // 保存・読込
    const ioWrap = el("div", { class: "row" });
    const saveBtn = el("button", { class: "primary" }, "保存(JSON)");
    saveBtn.addEventListener("click", () => this.save());
    const fileInput = el("input", { type: "file", accept: ".json", id: "fileInput" });
    fileInput.style.display = "none";
    fileInput.addEventListener("change", (e) => {
      if (e.target.files[0]) this.loadFromFile(e.target.files[0]);
    });
    const loadBtn = el("button", {}, "読込(ファイル)");
    loadBtn.addEventListener("click", () => fileInput.click());
    const reloadBtn = el("button", {}, "再読込");
    reloadBtn.addEventListener("click", () => this.loadScene(this.sceneName));
    ioWrap.append(saveBtn, loadBtn, reloadBtn, fileInput);
    panel.append(section("保存・読込", ioWrap));

    // 情報
    this._info = el("div", { class: "info" }, "未選択");
    panel.append(section("選択中", this._info));

    // オブジェクト一覧
    this._list = el("div", { class: "list" });
    panel.append(section("オブジェクト一覧", this._list));

    // ステータス
    this._status = document.getElementById("status");

    this.setMode("translate");
  }

  _refreshInfo() {
    if (!this.selected) {
      this._info.textContent = "未選択";
      return;
    }
    const t = transformOf(this.selected.obj);
    this._info.innerHTML =
      `<b>${this.selected.name}</b>` +
      (this.selected.type ? ` <span class="tag">${TYPE_LABELS[this.selected.type] || this.selected.type}</span>` : "") +
      `<br>pos ${t.pos.join(", ")}<br>rot ${t.rot.map((r) => (r).toFixed(2)).join(", ")}<br>scale ${t.scale}`;
  }

  _refreshList() {
    this._list.innerHTML = "";
    this.items.forEach((it) => {
      const row = el("div", { class: "list-item" + (it === this.selected ? " sel" : "") + (it.removed ? " removed" : "") });
      const label = (it.added ? "＋" : "") + (it.dirty && !it.added ? "＊" : "") + it.name;
      row.append(el("span", {}, label));
      row.addEventListener("click", () => this.select(it));
      this._list.append(row);
    });
  }

  _setStatus(msg) {
    if (this._status) this._status.textContent = msg;
  }
}

// 小さな DOM ヘルパ
function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  children.forEach((c) => e.append(c.nodeType ? c : document.createTextNode(c)));
  return e;
}
function section(title, ...children) {
  const s = el("div", { class: "section" });
  s.append(el("h3", {}, title));
  children.forEach((c) => s.append(c));
  return s;
}
