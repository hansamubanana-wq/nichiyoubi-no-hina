import * as THREE from "three";

// 手作りジオメトリ用のヘルパ群。後で GLTF アセットに差し替えられるよう、
// 家具などは関数単位で分けてある。

// refs の各オブジェクトに、キー名を name として付与する（マップエディタ用の識別子）。
// 値が配列の場合は key0, key1 ... とする。
export function nameRefs(refs) {
  for (const [key, val] of Object.entries(refs)) {
    if (!val) continue;
    if (Array.isArray(val)) {
      val.forEach((o, i) => {
        if (o && o.isObject3D && !o.name) o.name = `${key}${i}`;
      });
    } else if (val.isObject3D && !val.name) {
      val.name = key;
    }
  }
}

export function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.0,
    ...opts,
  });
}

export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// 一枚の部屋（床・壁・天井）。openFront=true で手前の壁を抜く。
export function room({
  w = 8,
  h = 3.2,
  d = 8,
  floorColor = 0x4a3f33,
  wallColor = 0xb9ad97,
  x = 0,
  z = 0,
  ceiling = true,
} = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const floor = box(w, 0.2, d, mat(floorColor, { roughness: 0.7 }), 0, -0.1, 0);
  g.add(floor);

  const wallMat = mat(wallColor, { roughness: 0.95 });
  // 奥
  g.add(box(w, h, 0.2, wallMat, 0, h / 2, -d / 2));
  // 左右
  g.add(box(0.2, h, d, wallMat, -w / 2, h / 2, 0));
  g.add(box(0.2, h, d, wallMat, w / 2, h / 2, 0));
  if (ceiling) {
    g.add(box(w, 0.2, d, mat(0x8a8170, { roughness: 1 }), 0, h, 0));
  }
  return g;
}

// 遺影（写真立て）
export function portrait({ w = 1.0, h = 1.3, frame = 0x2a2622 } = {}) {
  const g = new THREE.Group();
  g.add(box(w + 0.12, h + 0.12, 0.06, mat(frame, { roughness: 0.6 })));
  // 中の写真（淡いグレー＝抽象表現）
  const photo = box(w, h, 0.02, mat(0xd9d2c4, { roughness: 0.9 }), 0, 0, 0.04);
  g.add(photo);
  // 喪章リボン
  g.add(box(0.12, 0.5, 0.02, mat(0x1a1a1a), w / 2 - 0.02, h / 2 - 0.1, 0.05));
  return g;
}

// テーブル
export function table({ w = 1.8, d = 0.9, h = 0.74, color = 0x6b4f37 } = {}) {
  const g = new THREE.Group();
  const top = box(w, 0.08, d, mat(color, { roughness: 0.5 }), 0, h, 0);
  g.add(top);
  const legMat = mat(0x4e3a28);
  const lx = w / 2 - 0.12;
  const lz = d / 2 - 0.12;
  [
    [-lx, -lz],
    [lx, -lz],
    [-lx, lz],
    [lx, lz],
  ].forEach(([x, z]) => g.add(box(0.08, h, 0.08, legMat, x, h / 2, z)));
  return g;
}

// お弁当箱
export function bento({ color = 0x36506b } = {}) {
  const g = new THREE.Group();
  g.add(box(0.26, 0.06, 0.18, mat(color, { roughness: 0.4 }), 0, 0.03, 0));
  g.add(box(0.27, 0.03, 0.19, mat(0xeae3d4, { roughness: 0.3 }), 0, 0.075, 0));
  return g;
}

// 椅子
export function chair({ color = 0x5a4632 } = {}) {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.6 });
  g.add(box(0.42, 0.05, 0.42, m, 0, 0.45, 0));
  g.add(box(0.42, 0.5, 0.05, m, 0, 0.7, -0.18));
  const legMat = mat(0x3e2f20);
  [
    [-0.18, -0.18],
    [0.18, -0.18],
    [-0.18, 0.18],
    [0.18, 0.18],
  ].forEach(([x, z]) => g.add(box(0.05, 0.45, 0.05, legMat, x, 0.22, z)));
  return g;
}

// 小さな祭壇（写真・花・線香）
export function altar() {
  const g = new THREE.Group();
  // 台
  g.add(box(1.6, 0.5, 0.6, mat(0x3a2c20, { roughness: 0.5 }), 0, 0.25, 0));
  g.add(box(1.7, 0.06, 0.7, mat(0x2a2018), 0, 0.53, 0));
  // 写真2枚（母・陽菜）
  const p1 = portrait({ w: 0.42, h: 0.55 });
  p1.position.set(-0.35, 1.0, -0.1);
  p1.scale.setScalar(0.9);
  const p2 = portrait({ w: 0.42, h: 0.55 });
  p2.position.set(0.35, 1.0, -0.1);
  p2.scale.setScalar(0.9);
  g.add(p1, p2);
  // 花
  const flowerMat = mat(0xd8d2c0, { roughness: 0.9 });
  const vase = box(0.16, 0.3, 0.16, mat(0x6a7b6a), -0.65, 0.7, 0.1);
  g.add(vase);
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      flowerMat
    );
    f.position.set(
      -0.65 + (Math.random() - 0.5) * 0.18,
      0.92 + Math.random() * 0.12,
      0.1 + (Math.random() - 0.5) * 0.12
    );
    g.add(f);
  }
  // 線香立てと煙（細い半透明の柱）
  g.add(box(0.12, 0.05, 0.12, mat(0x222019), 0.55, 0.58, 0.15));
  return g;
}

// ドア
export function door({ color = 0x5b4632, open = false } = {}) {
  const g = new THREE.Group();
  const panel = box(0.86, 2.0, 0.06, mat(color, { roughness: 0.7 }), 0, 1.0, 0);
  // ヒンジを左端に：ピボット用に位置調整
  panel.position.x = 0.43;
  const pivot = new THREE.Group();
  pivot.add(panel);
  pivot.position.x = -0.43;
  if (open) pivot.rotation.y = -Math.PI / 2.4;
  g.add(pivot);
  g.userData.pivot = pivot;
  // ノブ
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 12),
    mat(0xb59a5e, { metalness: 0.6, roughness: 0.3 })
  );
  knob.position.set(0.72, 1.0, 0.06);
  panel.add(knob);
  return g;
}

// 階段
export function stairs({ steps = 8, color = 0x6b5640 } = {}) {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.8 });
  for (let i = 0; i < steps; i++) {
    g.add(box(1.4, 0.18, 0.3, m, 0, 0.09 + i * 0.18, -i * 0.3));
  }
  return g;
}

// カーディガン（畳まれた布）
export function cardigan({ color = 0xa9967e } = {}) {
  const g = new THREE.Group();
  g.add(box(0.5, 0.08, 0.36, mat(color, { roughness: 1 }), 0, 0.04, 0));
  g.add(box(0.46, 0.06, 0.3, mat(color, { roughness: 1 }), 0, 0.1, 0));
  return g;
}

// 洗濯物の山
export function laundry() {
  const g = new THREE.Group();
  const colors = [0xded6c6, 0x8aa0b4, 0xb0a48c, 0xc9bfa8];
  for (let i = 0; i < 5; i++) {
    const c = colors[i % colors.length];
    const m = box(
      0.34 + Math.random() * 0.1,
      0.07,
      0.26 + Math.random() * 0.08,
      mat(c, { roughness: 1 }),
      (Math.random() - 0.5) * 0.08,
      0.04 + i * 0.07,
      (Math.random() - 0.5) * 0.08
    );
    m.rotation.y = (Math.random() - 0.5) * 0.4;
    g.add(m);
  }
  return g;
}

// 抽象的な人物シルエット（立ち姿。顔は描かない＝余白を残す表現）
export function figure({ color = 0x2b2f36, height = 1.66 } = {}) {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 1 });
  // 胴
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, height * 0.42, 4, 12),
    m
  );
  torso.position.y = height * 0.55;
  torso.castShadow = true;
  g.add(torso);
  // 頭
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), m);
  head.position.y = height * 0.92;
  head.castShadow = true;
  g.add(head);
  return g;
}
