import * as THREE from "three";
import { box, mat, table, chair, figure } from "../core/build.js";

// 学校・面談室。CHAPTER 4。担任と向かい合い、作文を受け取る。
export function buildSchool() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10141a);
  scene.fog = new THREE.Fog(0x10141a, 9, 26);
  const refs = {};

  const w = 7, d = 6, h = 2.8;
  scene.add(box(w, 0.2, d, mat(0x8a8170, { roughness: 0.6 }), 0, -0.1, 0)); // 床（リノリウム風）
  const wallMat = mat(0xbfc6c0, { roughness: 0.96 });
  scene.add(box(w, h, 0.2, wallMat, 0, h / 2, -d / 2));
  scene.add(box(0.2, h, d, wallMat, -w / 2, h / 2, 0));
  scene.add(box(0.2, h, d, wallMat, w / 2, h / 2, 0));
  scene.add(box(w, 0.2, d, mat(0xd5d8d0, { roughness: 1 }), 0, h, 0));

  // 大きな窓（夕方の光）
  scene.add(box(2.6, 1.6, 0.06, mat(0xcfd8dd, { roughness: 0.2, metalness: 0.1 }), 0, 1.6, -d / 2 + 0.05));

  // テーブル（中央）— 後で wooden_table_02 に差し替え
  const t = table({ w: 1.6, d: 0.9 });
  t.position.set(0, 0, 0);
  scene.add(t);
  refs.table = t;

  // 椅子2脚（向かい合い）
  const c1 = chair();
  c1.position.set(0, 0, 0.9); // 誠司側（手前）
  const c2 = chair();
  c2.position.set(0, 0, -0.9);
  c2.rotation.y = Math.PI;
  scene.add(c1, c2);
  refs.chairs = [c1, c2];

  // 担任（向かい・シルエット）
  const teacher = figure({ color: 0x2b3038, height: 1.68 });
  teacher.position.set(0, 0, -1.5);
  scene.add(teacher);
  refs.teacher = teacher;

  // 作文「私の家族」（テーブルの上）
  const essay = box(0.22, 0.01, 0.3, mat(0xf0ead8, { roughness: 0.8 }), 0, 0.79, 0.1);
  scene.add(essay);
  refs.essay = essay;

  // 照明
  scene.add(new THREE.AmbientLight(0x4a5060, 0.6));
  scene.add(new THREE.HemisphereLight(0x6a7080, 0x20242a, 0.5));
  const sun = new THREE.DirectionalLight(0xffd9a8, 0.9);
  sun.position.set(0, 3, -5);
  sun.castShadow = true;
  scene.add(sun);

  const cam = {
    seat: { pos: [0, 1.35, 1.7], look: [0, 1.2, -1.5] }, // 誠司の席から担任を見る
    essay: { pos: [0, 1.2, 1.0], look: [0, 0.78, 0.1] }, // 作文を見る
    window: { pos: [0.5, 1.4, 1.2], look: [0, 1.6, -3] },
  };

  return { scene, refs, cam };
}

export async function upgradeSchool(assets, scene, refs) {
  if (!assets) return;
  await assets.ready;
  assets.applyEnvironment(scene, 0.3);
  await assets.swap(scene, refs.table, "wooden_table_02", { scaleMul: 0.92 });
  if (refs.chairs) {
    await assets.swap(scene, refs.chairs[0], "dining_chair_02", { rotationY: 0 });
    await assets.swap(scene, refs.chairs[1], "dining_chair_02", { rotationY: Math.PI });
  }
}
