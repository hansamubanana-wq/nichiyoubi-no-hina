import * as THREE from "three";
import { box, mat, portrait } from "../core/build.js";

// 陽菜の部屋。CHAPTER 1〜6 で使う。机・ベッド・本棚・制服・スマホ・写真など。
export function buildHinaRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0e12);
  scene.fog = new THREE.Fog(0x0c0e12, 8, 26);
  const refs = {};

  // 部屋
  const w = 6, d = 6, h = 2.7;
  scene.add(box(w, 0.2, d, mat(0x6b5640, { roughness: 0.7 }), 0, -0.1, 0)); // 床
  const wallMat = mat(0xc8bda6, { roughness: 0.97 });
  scene.add(box(w, h, 0.2, wallMat, 0, h / 2, -d / 2)); // 奥
  scene.add(box(0.2, h, d, wallMat, -w / 2, h / 2, 0)); // 左
  scene.add(box(0.2, h, d, wallMat, w / 2, h / 2, 0)); // 右
  scene.add(box(w, 0.2, d, mat(0x9a9078, { roughness: 1 }), 0, h, 0)); // 天井

  // 窓（奥壁）＋やわらかい外光
  scene.add(box(1.8, 1.3, 0.06, mat(0x2a3b4a, { roughness: 0.2, metalness: 0.1 }), 1.4, 1.5, -d / 2 + 0.06));
  scene.add(box(2.0, 1.5, 0.08, mat(0xe8e2d4, { roughness: 0.8 }), 1.4, 1.5, -d / 2 + 0.02));

  // ベッド（左奥）
  const bed = new THREE.Group();
  bed.add(box(1.1, 0.4, 2.0, mat(0x6a5a48, { roughness: 0.8 }), 0, 0.2, 0));
  bed.add(box(1.12, 0.16, 2.0, mat(0xb7c2cb, { roughness: 1 }), 0, 0.46, 0)); // 掛布団
  bed.add(box(0.7, 0.12, 0.4, mat(0xe6e0d2, { roughness: 1 }), 0, 0.5, -0.7)); // 枕
  bed.position.set(-1.9, 0, -1.6);
  scene.add(bed);
  refs.bed = bed;

  // 机（右手前）— 後で SchoolDesk_01 に差し替え
  const desk = new THREE.Group();
  desk.add(box(1.3, 0.06, 0.6, mat(0x8a6f4e, { roughness: 0.5 }), 0, 0.74, 0));
  [[-0.55, -0.22], [0.55, -0.22], [-0.55, 0.22], [0.55, 0.22]].forEach(([x, z]) =>
    desk.add(box(0.06, 0.74, 0.06, mat(0x6a4f30), x, 0.37, z))
  );
  desk.position.set(1.6, 0, 1.4);
  desk.rotation.y = -Math.PI / 2;
  scene.add(desk);
  refs.desk = desk;

  // 机の椅子 — 後で SchoolChair_01 に差し替え
  const deskChair = new THREE.Group();
  deskChair.add(box(0.4, 0.04, 0.4, mat(0x5a4632), 0, 0.45, 0));
  deskChair.add(box(0.4, 0.45, 0.04, mat(0x5a4632), 0, 0.68, -0.18));
  deskChair.position.set(1.0, 0, 1.4);
  scene.add(deskChair);
  refs.deskChair = deskChair;

  // 本棚（右奥）— 後で wooden_bookshelf_worn に差し替え
  const shelf = new THREE.Group();
  shelf.add(box(0.9, 1.8, 0.3, mat(0x6a5238, { roughness: 0.7 }), 0, 0.9, 0));
  for (let i = 0; i < 3; i++)
    shelf.add(box(0.86, 0.04, 0.3, mat(0x4a3826), 0, 0.4 + i * 0.5, 0.01));
  shelf.position.set(2.4, 0, -1.8);
  shelf.rotation.y = -Math.PI / 2;
  scene.add(shelf);
  refs.shelf = shelf;

  // 机上：教科書・スマホ・文化祭パンフ・日記・ノート・引き出しメモ
  // 教科書（差し替え対象 placeholder）
  const books = box(0.5, 0.18, 0.26, mat(0x7a5a8a, { roughness: 0.6 }), 1.75, 0.86, 1.7);
  scene.add(books);
  refs.books = books;

  // スマホ（机の上・閉じている）
  const phone = box(0.09, 0.015, 0.18, mat(0x111316, { roughness: 0.3, metalness: 0.5 }), 1.5, 0.78, 1.2);
  scene.add(phone);
  refs.phone = phone;

  // 日記（机の上）
  const diary = box(0.2, 0.04, 0.26, mat(0x7b3b4a, { roughness: 0.6 }), 1.7, 0.79, 1.1);
  scene.add(diary);
  refs.diary = diary;

  // 文化祭パンフレット
  const pamphlet = box(0.21, 0.01, 0.29, mat(0xd8c463, { roughness: 0.7 }), 1.45, 0.78, 1.5);
  pamphlet.rotation.y = 0.3;
  scene.add(pamphlet);
  refs.pamphlet = pamphlet;

  // 引き出し（机の正面）＋中のメモ。位置は引き出し前あたり。
  const drawer = box(0.5, 0.18, 0.04, mat(0x7a5f3e, { roughness: 0.6 }), 1.28, 0.55, 1.4);
  scene.add(drawer);
  refs.drawer = drawer;

  // ノート「日曜日に行く場所」（CH5）。机の引き出しの上に置かれる想定。
  const note = box(0.22, 0.03, 0.3, mat(0x4a6b8a, { roughness: 0.6 }), 1.62, 0.8, 0.9);
  scene.add(note);
  refs.note = note;

  // 母との写真（机の上・小さな写真立て）
  const photo = portrait({ w: 0.22, h: 0.28, frame: 0x3a2c20 });
  photo.scale.setScalar(0.9);
  photo.position.set(1.85, 0.95, 0.9);
  photo.rotation.y = -0.4;
  scene.add(photo);
  refs.photo = photo;

  // 制服（壁のフック）
  const uniform = new THREE.Group();
  uniform.add(box(0.42, 0.6, 0.08, mat(0x2b3a4a, { roughness: 0.9 }), 0, 0, 0)); // 上着
  uniform.add(box(0.4, 0.4, 0.06, mat(0x6b7a8a, { roughness: 0.9 }), 0, -0.45, 0)); // スカート
  uniform.position.set(-2.85, 1.7, 0.6);
  scene.add(uniform);
  refs.uniform = uniform;

  // 照明
  scene.add(new THREE.AmbientLight(0x44495a, 0.6));
  scene.add(new THREE.HemisphereLight(0x5a6478, 0x1a1612, 0.5));
  const win = new THREE.DirectionalLight(0xbfd0e0, 0.7);
  win.position.set(2, 3, -4);
  scene.add(win);
  const lamp = new THREE.PointLight(0xffe0b0, 8, 12, 2);
  lamp.position.set(0, 2.4, 0.5);
  lamp.castShadow = true;
  scene.add(lamp);
  refs.lamp = lamp;

  const cam = {
    door: { pos: [-0.2, 1.55, 3.3], look: [0.6, 1.2, -1] },
    overview: { pos: [-1.6, 1.7, 2.6], look: [1.2, 1.0, -0.5] },
    desk: { pos: [1.0, 1.4, 2.3], look: [1.7, 0.85, 1.1] },
    deskClose: { pos: [1.5, 1.25, 1.9], look: [1.7, 0.8, 1.0] },
    drawer: { pos: [0.7, 1.15, 2.0], look: [1.28, 0.6, 1.4] },
    shelf: { pos: [0.6, 1.5, -0.4], look: [2.2, 1.1, -1.6] },
    bed: { pos: [-0.2, 1.5, 0.6], look: [-1.9, 0.6, -1.6] },
    phone: { pos: [1.2, 1.15, 1.7], look: [1.5, 0.78, 1.2] },
    note: { pos: [1.1, 1.2, 1.6], look: [1.62, 0.8, 0.9] },
    window: { pos: [0, 1.5, 1.5], look: [1.4, 1.5, -3] },
  };

  return { scene, refs, cam };
}

// 実モデル（CC0）へ差し替え
export async function upgradeHinaRoom(assets, scene, refs) {
  if (!assets) return;
  await assets.ready;
  assets.applyEnvironment(scene, 0.25);
  await assets.swap(scene, refs.desk, "SchoolDesk_01", { rotationY: Math.PI / 2 });
  await assets.swap(scene, refs.deskChair, "SchoolChair_01", { rotationY: -Math.PI / 2 });
  await assets.swap(scene, refs.shelf, "wooden_bookshelf_worn", { rotationY: -Math.PI / 2 });
  await assets.swap(scene, refs.books, "book_encyclopedia_set_01", { fit: "max" });
}
