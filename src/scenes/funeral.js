import * as THREE from "three";
import { box, mat, portrait, figure } from "../core/build.js";
import { Rain } from "../core/Rain.js";

// 葬式場。薄暗いホール、正面に遺影、手前に誠司と陽菜のシルエット。
export function buildFuneral() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0d11);
  scene.fog = new THREE.Fog(0x0a0d11, 6, 26);

  // 床・壁
  const floor = box(30, 0.2, 30, mat(0x161a1f, { roughness: 0.6 }), 0, -0.1, 0);
  scene.add(floor);
  const backWall = box(30, 9, 0.3, mat(0x202833, { roughness: 1 }), 0, 4.5, -10);
  scene.add(backWall);
  scene.add(box(0.3, 9, 30, mat(0x1a2129), -15, 4.5, 0));
  scene.add(box(0.3, 9, 30, mat(0x1a2129), 15, 4.5, 0));

  // 祭壇台と遺影
  const dais = box(5, 1.0, 1.6, mat(0x12161b, { roughness: 0.5 }), 0, 0.5, -8.5);
  scene.add(dais);
  const photo = portrait({ w: 1.1, h: 1.45, frame: 0x1c1f24 });
  photo.position.set(0, 2.2, -8.6);
  scene.add(photo);

  // 遺影を照らすスポット（祭壇のみ明るい）
  const spot = new THREE.SpotLight(0xfff2dd, 24, 18, Math.PI / 7, 0.6, 1.4);
  spot.position.set(0, 7, -4);
  spot.target.position.set(0, 2.2, -8.6);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  scene.add(spot, spot.target);

  // 白菊（祭壇まわり）
  const flowerMat = mat(0xe6e0d2, { roughness: 0.9 });
  for (let i = 0; i < 40; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), flowerMat);
    f.position.set(
      -2.2 + Math.random() * 4.4,
      1.05 + Math.random() * 0.3,
      -8.0 - Math.random() * 0.5
    );
    scene.add(f);
  }

  // 一人称視点（プレイヤー＝誠司）。誠司自身は描かない。
  // 陽菜は隣に立っている（その存在だけを映す）。
  const hina = figure({ color: 0x232a33, height: 1.6 });
  hina.position.set(-1.3, 0, -0.2);
  scene.add(hina);

  // 列席者のシルエット（左右にぼんやり）
  for (let i = 0; i < 8; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const f = figure({ color: 0x12161b, height: 1.5 + Math.random() * 0.2 });
    f.position.set(side * (3 + Math.random() * 2), 0, -4 + i * 0.7);
    scene.add(f);
  }

  // 弱い環境光
  scene.add(new THREE.AmbientLight(0x3a4452, 0.5));
  const hemi = new THREE.HemisphereLight(0x2a3340, 0x0a0d11, 0.4);
  scene.add(hemi);

  // 窓の外の雨（背景演出）
  const rain = new Rain(1400, 34, 14);
  rain.points.position.set(0, 0, 4);
  scene.add(rain.points);

  return {
    scene,
    rain,
    cam: {
      // 遺影を見上げる誠司の視点（一人称）
      portrait: { pos: [0, 1.55, 0.2], look: [0, 2.2, -8.6] },
      // 隣に立つ陽菜へ視線を向ける
      wide: { pos: [0.2, 1.55, 0.4], look: [-1.3, 1.4, -0.2] },
    },
    figures: { hina },
  };
}
