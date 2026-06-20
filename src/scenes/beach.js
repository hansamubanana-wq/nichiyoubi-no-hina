import * as THREE from "three";
import { box, mat, portrait } from "../core/build.js";

// 海辺。FINAL CHAPTER。晴れた朝。誠司が遺影と写真を持って海へ。
// 陽菜が幻として波打ち際に現れる。
export function buildBeach() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbcd6e6);
  scene.fog = new THREE.Fog(0xcfe2ec, 30, 120);
  const refs = {};

  // 空（大きな半球グラデーション）
  const skyGeo = new THREE.SphereGeometry(200, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(0x7fb4dc) },
      bottom: { value: new THREE.Color(0xeef3ee) },
    },
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 bottom; void main(){ float t=clamp((normalize(vP).y*0.5+0.5),0.0,1.0); gl_FragColor=vec4(mix(bottom,top,t),1.0);}`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // 砂浜
  const sand = box(120, 0.2, 80, mat(0xd8c9a8, { roughness: 1 }), 0, -0.1, 20);
  scene.add(sand);

  // 海（ゆるく波打つ平面）
  const seaGeo = new THREE.PlaneGeometry(120, 80, 60, 40);
  const seaMat = mat(0x4f86a6, { roughness: 0.25, metalness: 0.2 });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.02, -28);
  scene.add(sea);
  refs.sea = sea;
  refs._seaBase = seaGeo.attributes.position.array.slice();

  // 太陽の光
  scene.add(new THREE.AmbientLight(0xcfe0ec, 0.8));
  scene.add(new THREE.HemisphereLight(0xbfe0f0, 0xd8c9a8, 0.7));
  const sun = new THREE.DirectionalLight(0xfff4e2, 1.6);
  sun.position.set(-12, 18, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  // 遺影と写真（砂の上に並べて置く）
  const frame1 = portrait({ w: 0.5, h: 0.65, frame: 0x2a2218 }); // 妻
  frame1.position.set(-0.5, 0.33, 1.0);
  frame1.rotation.y = 0.12;
  scene.add(frame1);
  const frame2 = portrait({ w: 0.5, h: 0.65, frame: 0x2a2218 }); // 陽菜
  frame2.position.set(0.5, 0.33, 1.0);
  frame2.rotation.y = -0.12;
  scene.add(frame2);
  refs.frames = [frame1, frame2];

  const cam = {
    // 砂浜に座って海を見る誠司の視点（一人称・低め）
    sit: { pos: [0, 0.9, 2.4], look: [0, 0.7, -10] },
    frames: { pos: [0.0, 1.0, 2.0], look: [0, 0.4, 1.0] },
    // 波打ち際に立つ陽菜を見る
    hina: { pos: [0, 1.1, 2.2], look: [0.4, 1.2, -3.2] },
  };

  return { scene, refs, cam };
}

// 海面をゆらす
export function makeSeaUpdater(refs) {
  const geo = refs.sea.geometry;
  const pos = geo.attributes.position;
  const base = refs._seaBase;
  let t = 0;
  return (dt) => {
    t += dt;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      pos.array[i * 3 + 2] =
        base[i * 3 + 2] +
        Math.sin(x * 0.25 + t * 1.2) * 0.12 +
        Math.cos(y * 0.3 + t * 0.9) * 0.1;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
}
