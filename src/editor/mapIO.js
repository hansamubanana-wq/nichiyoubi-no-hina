import * as THREE from "three";
import { createObject, TYPE_LABELS } from "./MapKit.js";

// マップデータ（オーバーライド）の入出力。
//
// 形式（人間が読んで直しやすい JSON）:
// {
//   "scene": "house",
//   "overrides": {            // 既存オブジェクトの位置・向き・スケールを上書き
//     "sofa": { "note":"ソファ", "pos":[x,y,z], "rot":[rx,ry,rz], "scale":1 }
//   },
//   "removed": ["someName"],  // 既存オブジェクトを消す
//   "added": [                // 新規オブジェクトを足す
//     { "type":"wall_clock", "note":"時計", "pos":[...], "rot":[...], "scale":1 }
//   ]
// }
//
// pos: メートル, rot: ラジアン(XYZオイラー), scale: 一様倍率

const r3 = (v) => [round(v.x), round(v.y), round(v.z)];
const round = (n) => Math.round(n * 1000) / 1000;

export function transformOf(obj) {
  return {
    pos: r3(obj.position),
    rot: r3(obj.rotation),
    scale: round(obj.scale.x),
  };
}

export function applyTransform(obj, t) {
  if (t.pos) obj.position.set(t.pos[0], t.pos[1], t.pos[2]);
  if (t.rot) obj.rotation.set(t.rot[0], t.rot[1], t.rot[2]);
  if (t.scale != null) obj.scale.setScalar(t.scale);
}

// 名前の無いトップレベルオブジェクトに auto:N を決定的に付与する。
// エディタとランタイムで同じ規則を使うことで、index 参照を一致させる。
// （ライト・カメラ・ヘルパー・グリッドは番号を消費しない＝スキップ）
export function assignAutoNames(scene) {
  let auto = 0;
  for (const c of scene.children) {
    if (c.isLight || c.isCamera) continue;
    if (c.name === "__grid") continue;
    if (c.type && c.type.includes("Helper")) continue;
    if (c.isTransformControls || c.isTransformControlsRoot) continue;
    if (!c.name) c.name = `auto:${auto++}`;
  }
}

// ランタイムでシーンにマップデータを適用する。
export async function applyMapData(scene, map, assets) {
  if (!map) return;
  assignAutoNames(scene); // index 参照（auto:N）を解決

  // 上書き
  if (map.overrides) {
    for (const [name, t] of Object.entries(map.overrides)) {
      const obj = scene.getObjectByName(name);
      if (obj) applyTransform(obj, t);
    }
  }
  // 削除
  if (map.removed) {
    for (const name of map.removed) {
      const obj = scene.getObjectByName(name);
      if (obj && obj.parent) obj.parent.remove(obj);
    }
  }
  // 追加
  if (map.added) {
    for (const item of map.added) {
      const o = await createObject(item.type, assets);
      applyTransform(o, item);
      if (item.name) o.name = item.name;
      o.traverse((m) => {
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      scene.add(o);
    }
  }
}

// public/maps/<scene>.json があれば取得して適用（無ければ何もしない）。
export async function loadMapData(scene, sceneName, assets) {
  try {
    const res = await fetch(`/maps/${sceneName}.json`);
    if (!res.ok) return;
    const map = await res.json();
    await applyMapData(scene, map, assets);
  } catch (e) {
    /* マップ未配置時は無視 */
  }
}

// エディタの編集状態 → マップデータ JSON 文字列
export function serialize(sceneName, items) {
  const overrides = {};
  const removed = [];
  const added = [];
  for (const it of items) {
    if (it.removed) {
      if (!it.added) removed.push(it.name);
      continue;
    }
    const t = transformOf(it.obj);
    const note = TYPE_LABELS[it.type] || it.name;
    if (it.added) {
      // 既存オブジェクトの「種類変更」（名前が add: で始まらない）は、
      // 元のオブジェクトを削除しつつ新種類を追加する（二重配置を防ぐ）。
      if (!String(it.name).startsWith("add:")) removed.push(it.name);
      added.push({ type: it.type, note, name: it.name, ...t });
    } else if (it.dirty) {
      overrides[it.name] = { note, ...t };
    }
  }
  return JSON.stringify({ scene: sceneName, overrides, removed, added }, null, 2);
}
