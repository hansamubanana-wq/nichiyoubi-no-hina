import * as THREE from "three";
import {
  box,
  mat,
  table,
  chair,
  bento,
  altar,
  door,
  stairs,
  cardigan,
  laundry,
  figure,
  nameRefs,
} from "../core/build.js";
import { loadMapData } from "../editor/mapIO.js";

// 佐伯家の屋内。リビング・食卓・台所が一続き、右手に階段と陽菜の部屋。
// 演出で使う主要オブジェクトへの参照を返す。
export function buildHouse() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0e12);
  scene.fog = new THREE.Fog(0x0c0e12, 10, 40);

  const refs = {};

  // ---- 床・壁（横長のワンフロア）。userData.surface で外部テクスチャを適用 ----
  const floor = box(24, 0.2, 14, mat(0x4a3a2a, { roughness: 0.75 }), 0, -0.1, 0);
  floor.userData.surface = { tex: "wood_floor", tile: 2.2 };
  scene.add(floor);
  // 畳風のラグ（リビング）
  scene.add(box(5, 0.04, 4, mat(0x6b6147, { roughness: 1 }), -5, 0.01, 1));

  const wallMat = mat(0xb6aa92, { roughness: 0.97 });
  const wBack = box(24, 5, 0.3, wallMat, 0, 2.5, -7); // 奥壁
  const wLeft = box(0.3, 5, 14, wallMat, -12, 2.5, 0); // 左壁
  const wRight = box(0.3, 5, 14, wallMat, 12, 2.5, 0); // 右壁
  [wBack, wLeft, wRight].forEach((w) => {
    w.userData.surface = { tex: "beige_wall_001", tile: 2.6 };
    scene.add(w);
  });
  const ceil = box(24, 0.3, 14, mat(0x8a8068, { roughness: 1 }), 0, 5, 0); // 天井
  ceil.userData.surface = { tex: "painted_plaster_wall", tile: 3.0 };
  scene.add(ceil);

  // ---- リビング（左寄り）：祭壇・ソファ・カーディガン ----
  const al = altar();
  al.position.set(-9.5, 0, -6.0);
  scene.add(al);
  refs.altar = al;

  // ソファ
  const sofa = new THREE.Group();
  const sofaMat = mat(0x5c5343, { roughness: 0.9 });
  sofa.add(box(2.6, 0.5, 1.0, sofaMat, 0, 0.4, 0));
  sofa.add(box(2.6, 0.7, 0.3, sofaMat, 0, 0.75, -0.45));
  sofa.add(box(0.3, 0.7, 1.0, sofaMat, -1.25, 0.6, 0));
  sofa.add(box(0.3, 0.7, 1.0, sofaMat, 1.25, 0.6, 0));
  sofa.position.set(-5, 0, 2.5);
  sofa.rotation.y = Math.PI;
  scene.add(sofa);
  refs.sofa = sofa;
  // 母のカーディガン
  const card = cardigan();
  card.position.set(-5.4, 0.66, 2.4);
  card.rotation.y = 0.3;
  scene.add(card);
  refs.cardigan = card;

  // ---- 食卓（中央） ----
  const t = table({ w: 1.9, d: 1.0 });
  t.position.set(0, 0, 0.5);
  scene.add(t);
  refs.table = t;
  const c1 = chair();
  c1.position.set(0, 0, 1.4);
  const c2 = chair();
  c2.position.set(0, 0, -0.4);
  c2.rotation.y = Math.PI;
  scene.add(c1, c2);
  refs.chairs = [c1, c2];
  // お弁当2つ
  const b1 = bento({ color: 0x36506b });
  b1.position.set(-0.4, 0.78, 0.5);
  const b2 = bento({ color: 0x7b3b4a });
  b2.position.set(0.4, 0.78, 0.5);
  scene.add(b1, b2);
  refs.bentos = [b1, b2];

  // 壁掛け時計
  const clock = new THREE.Group();
  clock.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24),
      mat(0xe8e2d4, { roughness: 0.5 })
    )
  );
  clock.children[0].rotation.x = Math.PI / 2;
  clock.add(box(0.02, 0.22, 0.02, mat(0x222), 0, 0.08, 0.04));
  clock.add(box(0.16, 0.02, 0.02, mat(0x222), 0.06, 0, 0.04));
  clock.position.set(0, 3.4, -6.8);
  scene.add(clock);
  refs.clock = clock;

  // ---- 台所（中央〜右の奥壁沿い） ----
  const counterMat = mat(0x8f8676, { roughness: 0.6 });
  scene.add(box(4.5, 0.9, 0.8, counterMat, 4.5, 0.45, -6.4)); // カウンター
  // 鍋（実コンロモデルに差し替えるまでの暫定。upgradeHouse で撤去される）
  const pot = new THREE.Group();
  pot.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.2, 0.24, 20),
      mat(0x3a3f44, { metalness: 0.4, roughness: 0.5 })
    )
  );
  pot.position.set(3.4, 1.1, -6.4);
  scene.add(pot);
  refs.stove = pot;

  // 冷蔵庫（右の奥）
  const fridge = box(1.0, 1.9, 0.9, mat(0xd9d4c8, { roughness: 0.4 }), 6.8, 0.95, -6.2);
  scene.add(fridge);
  // メモ（黄色い付箋）
  const memo = box(0.22, 0.28, 0.01, mat(0xe8d873, { roughness: 0.9 }), 6.3, 1.3, -5.75);
  scene.add(memo);
  refs.fridge = fridge;
  refs.fridgeMemo = memo;

  // 洗濯機（右手前）
  const washer = new THREE.Group();
  washer.add(box(0.9, 1.1, 0.9, mat(0xe2ddd2, { roughness: 0.4 }), 0, 0.55, 0));
  washer.add(
    new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 24),
      mat(0x2b3138, { metalness: 0.3, roughness: 0.4 })
    )
  );
  washer.children[1].position.set(0, 0.6, 0.46);
  washer.position.set(9.5, 0, -1.0);
  scene.add(washer);
  refs.washer = washer;
  // 畳み方メモ
  const wmemo = box(0.2, 0.24, 0.01, mat(0xe8e2d4, { roughness: 0.9 }), 9.5, 1.3, -0.5);
  scene.add(wmemo);
  refs.washerMemo = wmemo;

  // ゴミ袋（玄関手前）
  const trash = new THREE.Group();
  trash.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      mat(0xd6d2c8, { roughness: 0.7, transparent: true, opacity: 0.85 })
    )
  );
  trash.children[0].scale.set(1, 1.2, 1);
  trash.position.set(8.5, 0.35, 3.5);
  scene.add(trash);
  refs.trash = trash;

  // ---- 階段・2階の廊下・陽菜の部屋 ----
  const st = stairs({ steps: 8 });
  st.position.set(10.5, 0, -3);
  scene.add(st);
  // 2階の床（廊下）
  scene.add(box(5, 0.2, 4, mat(0x4a3a2a, { roughness: 0.75 }), 9.5, 1.5, -5));
  // 陽菜の部屋のドア
  const dr = door({ color: 0x6a523a });
  dr.position.set(8.0, 1.6, -6.5);
  scene.add(dr);
  refs.door = dr;

  // ---- 人物（一人称：誠司は描かない。陽菜のみ） ----
  const hina = figure({ color: 0x33373f, height: 1.6 });
  hina.position.set(-2.6, 0, 2.0); // 食卓カメラの正面を遮らない位置
  scene.add(hina);
  refs.hina = hina;

  // ---- 照明：夕方〜夜の室内 ----
  scene.add(new THREE.AmbientLight(0x40464f, 0.55));
  const hemi = new THREE.HemisphereLight(0x4b5564, 0x1a1612, 0.5);
  scene.add(hemi);
  // 室内灯
  const lamp = new THREE.PointLight(0xffd9a0, 18, 16, 2);
  lamp.position.set(-3, 4.2, 1);
  lamp.castShadow = true;
  scene.add(lamp);
  refs.lamp = lamp;
  const kitchenLamp = new THREE.PointLight(0xffe6bc, 12, 12, 2);
  kitchenLamp.position.set(4.5, 4, -5);
  scene.add(kitchenLamp);

  // ---- カメラ視点プリセット ----
  const cam = {
    entrance: { pos: [8.5, 1.6, 5.5], look: [-2, 1.2, 0] },
    living: { pos: [-3, 1.7, 5], look: [-8, 1.2, -4] },
    cardigan: { pos: [-5.2, 1.4, 4.4], look: [-5.4, 0.7, 2.4] },
    altar: { pos: [-8.5, 1.6, -2.5], look: [-9.5, 1.0, -6] },
    table: { pos: [0, 1.5, 3.2], look: [0, 0.7, 0.3] },
    tableClose: { pos: [-0.2, 1.2, 2.0], look: [0, 0.8, 0] },
    kitchen: { pos: [3.4, 1.6, -3.8], look: [3.6, 1.0, -6.4] },
    fridge: { pos: [6.2, 1.5, -3.8], look: [6.4, 1.3, -5.9] },
    washer: { pos: [9.5, 1.5, 1.6], look: [9.5, 1.0, -1.0] },
    overview: { pos: [6, 3.4, 7], look: [0, 1, -2] },
    stairsBottom: { pos: [9.0, 1.6, 1.5], look: [9.5, 2.2, -4.5] },
    doorFront: { pos: [9.6, 2.1, -4.2], look: [8.0, 1.7, -6.5] },
    hallway: { pos: [10.5, 2.0, -3.2], look: [8.2, 1.6, -6.5] },
  };

  nameRefs(refs);
  return { scene, refs, cam };
}

// VRM をシーンに配置し、指定の足元位置・身長に合わせる。
export async function placeVRM(assets, scene, name, { position, height = 1.55, rotationY = 0, ghost = false, opacity = 1, game } = {}) {
  const vrm = await assets.loadVRM(name, { ghost, opacity });
  if (!vrm) return null;
  const root = vrm.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const scale = height / (size.y || 1);
  root.scale.setScalar(scale);
  root.rotation.y = rotationY;
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.x += position[0] - box2.getCenter(new THREE.Vector3()).x;
  root.position.z += position[2] - box2.getCenter(new THREE.Vector3()).z;
  root.position.y += position[1] - box2.min.y;
  scene.add(root);
  // スプリングボーン等の更新（髪のゆれ）
  if (game && vrm.update) {
    const fn = (dt) => vrm.update(dt);
    game.addUpdater(fn);
    root.userData.vrmUpdater = fn;
    root.userData.vrm = vrm;
  }
  return vrm;
}

// 手作りプレースホルダを Poly Haven の実モデル（CC0）に差し替える。
// アセット未取得時は手作りのまま継続する。
export async function upgradeHouse(assets, scene, refs, game, opts = {}) {
  const { withHina = false } = opts;
  if (!assets) return;
  await assets.ready;
  assets.applyEnvironment(scene, 0.3);
  assets.applySurfaceTextures(scene); // 床・壁・天井に外部テクスチャ

  // 陽菜（VRM）。存命時（プロローグ）のみ登場。
  // 故人となった本編では家に出さない（シルエットも撤去）。
  if (withHina) {
    const hinaPos = refs.hina.position.toArray();
    const hinaRotY = refs.hina.rotation.y;
    const vrm = await placeVRM(assets, scene, "hina", {
      position: hinaPos,
      height: 1.58,
      rotationY: hinaRotY + Math.PI, // 室内側を向く
      game,
    });
    if (vrm) {
      if (refs.hina.parent) refs.hina.parent.remove(refs.hina);
      refs.hina = vrm.scene; // 「陽菜に声をかける」対象を VRM に
    }
  } else if (refs.hina && refs.hina.parent) {
    refs.hina.parent.remove(refs.hina); // 本編では陽菜は不在
  }

  // ソファ（背もたれが奥＝-z を向く向きに調整）
  await assets.swap(scene, refs.sofa, "sofa_03", { rotationY: 0, scaleMul: 1.0 });
  // 食卓テーブル
  await assets.swap(scene, refs.table, "wooden_table_02", { scaleMul: 1.0 });
  // 椅子2脚
  if (refs.chairs) {
    await assets.swap(scene, refs.chairs[0], "dining_chair_02", { rotationY: 0 });
    await assets.swap(scene, refs.chairs[1], "dining_chair_02", {
      rotationY: Math.PI,
    });
  }
  // 壁掛け時計（壁面なので中心合わせ）
  await assets.swap(scene, refs.clock, "wall_clock", {
    fit: "max",
    align: "center",
  });
  // コンロ（据え置き型。鍋プレースホルダは撤去し、床置きの実モデルへ）
  if (refs.stove && refs.stove.parent) refs.stove.parent.remove(refs.stove);
  const stove = await assets.place(scene, "electric_stove", {
    center: [2.0, 0, -6.0],
    size: [0.7, 0.9, 0.7],
    rotationY: 0,
    fit: "height",
  });
  if (stove) {
    stove.name = "stove";
    stove.userData.kitType = "electric_stove";
    refs.stove = stove; // 「朝食を作る」インタラクト対象を更新
  }

  // マップエディタで保存した配置修正（public/maps/house.json）を適用
  if (!opts.skipMap) await loadMapData(scene, "house", assets);
}
