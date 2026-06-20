import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

// 3Dアセット管理。public/models/manifest.json を読み、gltf モデルと HDRI を
// ロード・キャッシュする。手作りプレースホルダに自動フィットさせて差し替える。
export class AssetManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.gltfLoader = new GLTFLoader();
    this.rgbeLoader = new RGBELoader();
    // VRM 用ローダー（キャラクター）
    this.vrmLoader = new GLTFLoader();
    this.vrmLoader.register((parser) => new VRMLoaderPlugin(parser));
    this.cache = new Map(); // name -> Promise<THREE.Group>
    this.manifest = null;
    this.envTexture = null;
    this.ready = this._init();
  }

  async _init() {
    try {
      const res = await fetch("/models/manifest.json");
      if (!res.ok) throw new Error("manifest not found");
      this.manifest = await res.json();
    } catch (e) {
      console.warn("[assets] マニフェスト未取得。手作りジオメトリで継続:", e.message);
      this.manifest = { models: {}, hdri: null };
      return;
    }
    // 並列プリロード
    const jobs = Object.keys(this.manifest.models).map((n) =>
      this.load(n).catch((e) => console.warn(`[assets] ${n} ロード失敗`, e))
    );
    if (this.manifest.hdri) jobs.push(this._loadEnv().catch(() => {}));
    await Promise.all(jobs);
  }

  load(name) {
    if (!this.manifest || !this.manifest.models[name]) return Promise.resolve(null);
    if (this.cache.has(name)) return this.cache.get(name);
    const url = "/" + this.manifest.models[name];
    const p = new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        reject
      );
    });
    this.cache.set(name, p);
    return p;
  }

  async _loadEnv() {
    const url = "/" + this.manifest.hdri;
    const tex = await this.rgbeLoader.loadAsync(url);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.envTexture = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    pmrem.dispose();
  }

  // シーンに環境マップ（IBL）を控えめに適用。背景は変えず反射のみ。
  applyEnvironment(scene, intensity = 0.28) {
    if (!this.envTexture) return;
    scene.environment = this.envTexture;
    scene.environmentIntensity = intensity;
  }

  async _getClone(name) {
    const src = await this.load(name);
    if (!src) return null;
    const clone = src.clone(true);
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return clone;
  }

  // プレースホルダを実モデルに置き換える。
  // placeholder の世界bboxにフィットさせ、同じ床位置に揃える。
  async swap(scene, placeholder, name, opts = {}) {
    const { align = "bottom", fit = "height", rotationY = 0, scaleMul = 1 } = opts;
    const model = await this._getClone(name);
    if (!model) return null;

    const Box3 = THREE.Box3;
    const phBox = new Box3().setFromObject(placeholder);
    const phSize = phBox.getSize(new THREE.Vector3());
    const phCenter = phBox.getCenter(new THREE.Vector3());

    model.rotation.y = rotationY;
    model.updateMatrixWorld(true);
    let mBox = new Box3().setFromObject(model);
    let mSize = mBox.getSize(new THREE.Vector3());

    let scale;
    if (fit === "footprint") {
      scale = Math.min(phSize.x / mSize.x, phSize.z / mSize.z);
    } else if (fit === "max") {
      scale =
        Math.max(phSize.x, phSize.y, phSize.z) /
        Math.max(mSize.x, mSize.y, mSize.z);
    } else {
      scale = phSize.y / mSize.y; // height
    }
    scale *= scaleMul;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);

    mBox = new Box3().setFromObject(model);
    const mCenter = mBox.getCenter(new THREE.Vector3());
    const dx = phCenter.x - mCenter.x;
    const dz = phCenter.z - mCenter.z;
    const dy =
      align === "bottom" ? phBox.min.y - mBox.min.y : phCenter.y - mCenter.y;
    model.position.x += dx;
    model.position.y += dy;
    model.position.z += dz;

    scene.add(model);
    if (placeholder.parent) placeholder.parent.remove(placeholder);
    return model;
  }

  // VRM（陽菜）を新規インスタンスで読み込む。毎回フレッシュに生成する。
  // opts.ghost=true で半透明の幻として表示。
  async loadVRM(name, opts = {}) {
    if (!this.manifest || !this.manifest.vrms || !this.manifest.vrms[name])
      return null;
    const { ghost = false, opacity = 1, pose = true } = opts;
    const url = "/" + this.manifest.vrms[name];
    const gltf = await this.vrmLoader.loadAsync(url);
    const vrm = gltf.userData.vrm;
    if (!vrm) return null;
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.rotateVRM0(vrm); // VRM0.0 を +Z 正面に補正
    vrm.scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        if (ghost || opacity < 1) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            m.transparent = true;
            m.opacity = opacity < 1 ? opacity : 0.55;
            m.depthWrite = false;
          });
        }
      }
    });
    if (pose) this._relaxPose(vrm);
    return vrm;
  }

  // T字ポーズを自然な「気をつけ」気味に
  _relaxPose(vrm) {
    const h = vrm.humanoid;
    if (!h) return;
    const set = (bone, x, y, z) => {
      const n = h.getNormalizedBoneNode(bone);
      if (n) n.rotation.set(x, y, z);
    };
    set("leftUpperArm", 0, 0, 1.2);
    set("rightUpperArm", 0, 0, -1.2);
    set("leftLowerArm", 0, -0.2, 0.1);
    set("rightLowerArm", 0, 0.2, -0.1);
    if (vrm.update) vrm.update(0);
  }

  // 任意の寸法・位置に配置（プレースホルダなし）。
  async place(scene, name, { center, size, rotationY = 0, align = "bottom", fit = "height", scaleMul = 1 } = {}) {
    const model = await this._getClone(name);
    if (!model) return null;
    const Box3 = THREE.Box3;
    model.rotation.y = rotationY;
    model.updateMatrixWorld(true);
    let mBox = new Box3().setFromObject(model);
    let mSize = mBox.getSize(new THREE.Vector3());
    let scale;
    if (fit === "footprint") scale = Math.min(size[0] / mSize.x, size[2] / mSize.z);
    else if (fit === "max")
      scale = Math.max(...size) / Math.max(mSize.x, mSize.y, mSize.z);
    else scale = size[1] / mSize.y;
    scale *= scaleMul;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    mBox = new Box3().setFromObject(model);
    const mCenter = mBox.getCenter(new THREE.Vector3());
    model.position.x += center[0] - mCenter.x;
    model.position.z += center[2] - mCenter.z;
    model.position.y +=
      align === "bottom" ? center[1] - mBox.min.y : center[1] - mCenter.y;
    scene.add(model);
    return model;
  }
}
