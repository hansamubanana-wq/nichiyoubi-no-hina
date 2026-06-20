import * as THREE from "three";
import { AudioSystem } from "./AudioSystem.js";

// ゲーム全体の制御。レンダラ／カメラ／演出（会話・キャプション・フェード・
// カメラ補間）と、クリック可能オブジェクト（インタラクト）を司る。
export class Game {
  constructor() {
    this.canvas = document.getElementById("scene");
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    this.audio = new AudioSystem();
    this.clock = new THREE.Clock();
    this.updaters = []; // 毎フレーム呼ぶ関数
    this.interactables = [];
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-2, -2);
    this.hovered = null;

    // DOM
    this.dom = {
      fade: document.getElementById("fade"),
      caption: document.querySelector("#caption p"),
      dialogue: document.getElementById("dialogue"),
      dName: document.querySelector("#dialogue .name"),
      dText: document.querySelector("#dialogue .text"),
      objective: document.getElementById("objective"),
      hint: document.getElementById("cursor-hint"),
    };

    this._bindEvents();
    this._loop();
  }

  _bindEvents() {
    window.addEventListener("resize", () => this._resize());
    this._resize();

    const setPointer = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      this.pointer.x = (x / window.innerWidth) * 2 - 1;
      this.pointer.y = -(y / window.innerHeight) * 2 + 1;
      this._px = x;
      this._py = y;
    };
    window.addEventListener("pointerdown", (e) => {
      setPointer(e);
      this._down = true;
      this._dragged = false;
      this._downX = this._px;
      this._downY = this._py;
    });

    window.addEventListener("pointermove", (e) => {
      const prevX = this._px;
      const prevY = this._py;
      setPointer(e);
      if (this._down && this.look) {
        const dx = this._px - prevX;
        const dy = this._py - prevY;
        if (Math.abs(this._px - this._downX) + Math.abs(this._py - this._downY) > 6)
          this._dragged = true;
        this._orbit(dx, dy);
      }
    });

    window.addEventListener("pointerup", () => {
      if (!this._down) return;
      this._down = false;
      if (this._dragged) return; // ドラッグ＝見回し。クリック扱いにしない
      this._updateHover();
      if (this.hovered) {
        const it = this.hovered;
        this.audio.blip(440, 0.08);
        if (it.once) this.removeInteractable(it.object);
        this._clearHint();
        it.handler && it.handler();
      }
    });
  }

  // ---- 見回し（その場で振り向く一人称ルック。壁の外には出ない） ----
  // eyePos: 立ち位置, focus: 初期に向く点
  enableLook(eyePos, focus, { minPitch = -0.5, maxPitch = 0.55, yawRange = 1.7 } = {}) {
    const pos = new THREE.Vector3(...eyePos);
    const dir = new THREE.Vector3(...focus).sub(pos).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    const pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    this.look = {
      pos,
      yaw,
      pitch,
      yaw0: yaw,
      minPitch,
      maxPitch,
      yawRange,
    };
    this._applyLook();
  }
  disableLook() {
    this.look = null;
  }
  _orbit(dx, dy) {
    const l = this.look;
    if (!l) return;
    l.yaw -= dx * 0.0045; // その場回転：全方向に見回せる
    l.pitch = THREE.MathUtils.clamp(l.pitch + dy * 0.0035, l.minPitch, l.maxPitch);
    this._applyLook();
  }
  _applyLook() {
    const l = this.look;
    const cp = Math.cos(l.pitch);
    const fwd = new THREE.Vector3(
      Math.sin(l.yaw) * cp,
      Math.sin(l.pitch),
      Math.cos(l.yaw) * cp
    );
    this.camera.position.copy(l.pos);
    const target = l.pos.clone().add(fwd);
    this.camera.lookAt(target);
    this._lookTarget = target;
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.updaters.forEach((fn) => fn(dt));
    if (this.interactables.length) this._updateHover();
    this.renderer.render(this.scene, this.camera);
  }

  _updateHover() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objs = this.interactables.map((i) => i.object);
    const hits = this.raycaster.intersectObjects(objs, true);
    let found = null;
    if (hits.length) {
      // ヒットしたメッシュから登録オブジェクトを辿る
      let o = hits[0].object;
      while (o && !objs.includes(o)) o = o.parent;
      if (o) found = this.interactables.find((i) => i.object === o);
    }
    if (found !== this.hovered) {
      this.hovered = found;
      document.body.style.cursor = found ? "pointer" : "default";
    }
    if (found) {
      this.dom.hint.textContent = found.hint || "調べる";
      this.dom.hint.classList.remove("hidden");
      this.dom.hint.style.left = this._px + "px";
      this.dom.hint.style.top = this._py + "px";
    } else {
      this._clearHint();
    }
  }

  _clearHint() {
    this.dom.hint.classList.add("hidden");
  }

  // ---- シーン管理 ----
  setScene(scene) {
    this.scene = scene;
    this.clearInteractables();
  }

  addUpdater(fn) {
    this.updaters.push(fn);
    return fn;
  }
  removeUpdater(fn) {
    this.updaters = this.updaters.filter((f) => f !== fn);
  }

  // ---- インタラクト ----
  addInteractable(object, hint, handler, { once = true } = {}) {
    const entry = { object, hint, handler, once };
    this.interactables.push(entry);
    return entry;
  }
  removeInteractable(object) {
    this.interactables = this.interactables.filter((i) => i.object !== object);
    if (this.hovered && this.hovered.object === object) {
      this.hovered = null;
      this._clearHint();
      document.body.style.cursor = "default";
    }
  }
  clearInteractables() {
    this.interactables = [];
    this.hovered = null;
    this._clearHint();
    document.body.style.cursor = "default";
  }

  // ---- 演出ヘルパ（async） ----
  wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // フェード（black=暗転 / clear=明転）。CSSトランジションに合わせて待つ。
  fade(to = "black", time = 1.6) {
    this.dom.fade.style.transition = `opacity ${time}s ease`;
    this.dom.fade.style.background = "#000";
    this.dom.fade.style.opacity = to === "black" ? "1" : "0";
    return this.wait(time * 1000);
  }
  fadeWhite(to = "white", time = 1.6) {
    this.dom.fade.style.transition = `opacity ${time}s ease`;
    this.dom.fade.style.background = "#fff";
    this.dom.fade.style.opacity = to === "white" ? "1" : "0";
    return this.wait(time * 1000);
  }

  // 中央キャプション（白文字）。textを表示→hold→消す。
  async caption(text, { hold = 2600, fadeAfter = true } = {}) {
    const el = this.dom.caption;
    el.textContent = text;
    el.classList.remove("show");
    await this.wait(60);
    el.classList.add("show");
    await this.wait(hold);
    if (fadeAfter) {
      el.classList.remove("show");
      await this.wait(2000);
    }
  }

  // 会話。speaker は空文字で地の文。クリック/スペースで進む。
  say(speaker, text, { auto = 0 } = {}) {
    return new Promise((resolve) => {
      const d = this.dom.dialogue;
      this.dom.dName.textContent = speaker || "";
      d.classList.remove("hidden", "ready");
      // タイプ表示
      const chars = [...text];
      let i = 0;
      this.dom.dText.textContent = "";
      let done = false;
      const speed = 42;
      const typer = setInterval(() => {
        this.dom.dText.textContent += chars[i] ?? "";
        if (chars[i] && chars[i].trim() && i % 2 === 0)
          this.audio.blip(660 + Math.random() * 80, 0.012, "triangle");
        i++;
        if (i >= chars.length) {
          clearInterval(typer);
          done = true;
          d.classList.add("ready");
          if (auto) setTimeout(finish, auto);
        }
      }, speed);

      const finish = () => {
        cleanup();
        resolve();
      };
      const advance = () => {
        if (!done) {
          // 早送り
          clearInterval(typer);
          this.dom.dText.textContent = text;
          done = true;
          d.classList.add("ready");
          if (auto) setTimeout(finish, auto);
          return;
        }
        finish();
      };
      const onKey = (e) => {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          advance();
        }
      };
      const onClick = (e) => {
        // インタラクト中のクリックは会話送りに使わない
        if (this.hovered) return;
        advance();
      };
      const cleanup = () => {
        clearInterval(typer);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("pointerdown", onClick);
      };
      // 少し遅らせて誤クリック防止
      setTimeout(() => {
        window.addEventListener("keydown", onKey);
        window.addEventListener("pointerdown", onClick);
      }, 120);
    });
  }

  hideDialogue() {
    this.dom.dialogue.classList.add("hidden");
  }

  setObjective(text) {
    if (!text) {
      this.dom.objective.classList.add("hidden");
      return;
    }
    this.dom.objective.textContent = "── " + text + " ──";
    this.dom.objective.classList.remove("hidden");
  }

  // カメラを位置・注視点へ補間
  camTo(pos, look, time = 2.5, ease = easeInOut) {
    return new Promise((resolve) => {
      const startPos = this.camera.position.clone();
      const startLook = this._lookTarget
        ? this._lookTarget.clone()
        : new THREE.Vector3(0, 1, 0);
      const endPos = new THREE.Vector3(...pos);
      const endLook = new THREE.Vector3(...look);
      let t = 0;
      const fn = (dt) => {
        t += dt / time;
        const k = ease(Math.min(t, 1));
        this.camera.position.lerpVectors(startPos, endPos, k);
        const cur = startLook.clone().lerp(endLook, k);
        this.camera.lookAt(cur);
        this._lookTarget = cur;
        if (t >= 1) {
          this.removeUpdater(fn);
          this._lookTarget = endLook;
          resolve();
        }
      };
      this.addUpdater(fn);
    });
  }

  // 即座にカメラ配置
  placeCamera(pos, look) {
    this.camera.position.set(...pos);
    const l = new THREE.Vector3(...look);
    this.camera.lookAt(l);
    this._lookTarget = l;
  }

  // 選択肢。選ばれた index を返す。
  choice(options) {
    return new Promise((resolve) => {
      const el = document.getElementById("choices");
      el.innerHTML = "";
      options.forEach((opt, i) => {
        const b = document.createElement("button");
        b.textContent = opt;
        b.addEventListener("click", () => {
          this.audio.blip(520, 0.1);
          el.classList.add("hidden");
          el.innerHTML = "";
          resolve(i);
        });
        el.appendChild(b);
      });
      el.classList.remove("hidden");
    });
  }

  // 書類（日記・作文・ノート・メモ）を表示。閉じると解決。
  showDocument({ title, body }) {
    return new Promise((resolve) => {
      const d = document.getElementById("document");
      d.querySelector(".doc-title").textContent = title;
      d.querySelector(".doc-body").textContent = body;
      const closeBtn = d.querySelector(".doc-close");
      this.audio.blip(360, 0.06);
      d.classList.remove("hidden");
      const close = () => {
        cleanup();
        d.classList.add("hidden");
        setTimeout(resolve, 600);
      };
      const onBg = (e) => {
        if (e.target === d) close();
      };
      const cleanup = () => {
        closeBtn.removeEventListener("click", close);
        d.removeEventListener("click", onBg);
      };
      setTimeout(() => {
        closeBtn.addEventListener("click", close);
        d.addEventListener("click", onBg);
      }, 200);
    });
  }

  // 音声メモ（陽菜の声）。声の代わりにテキストを順に再生表示する。
  async audioMemo(title, lines) {
    const el = document.getElementById("audiomemo");
    el.querySelector(".memo-title").textContent = title;
    const wave = el.querySelector(".memo-wave");
    const txt = el.querySelector(".memo-text");
    txt.textContent = "";
    el.classList.remove("hidden");
    await this.wait(600);
    wave.classList.add("playing");
    await this.wait(700);
    for (const line of lines) {
      txt.textContent = line;
      this.audio.note(300 + Math.random() * 130, 0.1);
      await this.wait(Math.max(1700, line.length * 150));
    }
    wave.classList.remove("playing");
    await this.wait(1000);
    el.classList.add("hidden");
    await this.wait(700);
  }

  flashbackEnter() {
    document.body.classList.add("flashback");
    return this.wait(1600);
  }
  flashbackExit() {
    document.body.classList.remove("flashback");
    return this.wait(1600);
  }

  disposeScene(scene) {
    scene.traverse((o) => {
      // VRM 等の毎フレーム更新を解除（破棄後の参照エラー防止）
      if (o.userData && o.userData.vrmUpdater) {
        this.removeUpdater(o.userData.vrmUpdater);
        o.userData.vrmUpdater = null;
      }
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
}

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
