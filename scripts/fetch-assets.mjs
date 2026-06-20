// Poly Haven (CC0) から 3D モデルと HDRI をダウンロードする。
// gltf は .gltf + .bin + textures の複数ファイル構成なので、
// gltf 内の相対参照を保ったまま public/models/<id>/ 以下に展開する。
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const API = "https://api.polyhaven.com";
const ROOT = new URL("../public/", import.meta.url);

// 取得するモデル（すべて Poly Haven / CC0）
const MODELS = [
  "sofa_03",
  "wooden_table_02",
  "dining_chair_02",
  "electric_stove",
  "wall_clock",
  // 陽菜の部屋・学校用
  "SchoolDesk_01",
  "SchoolChair_01",
  "wooden_bookshelf_worn",
  "book_encyclopedia_set_01",
];
const MODEL_RES = ["2k", "1k"]; // 優先順
const HDRI = "lythwood_room";
const HDRI_RES = "1k";

// 床・壁・天井などの PBR テクスチャ（Poly Haven / CC0・軽量1k jpg）
const TEXTURES = ["wood_floor", "beige_wall_001", "painted_plaster_wall"];
const TEX_RES = "1k";

// キャラクター VRM（陽菜）。VRoid 系のアニメ女子サンプル。
// ※プレースホルダ。自作の VRoid モデルに差し替え可能。
const VRMS = [
  {
    name: "hina",
    url: "https://raw.githubusercontent.com/pixiv/three-vrm/v0.6.11/packages/three-vrm/examples/models/three-vrm-girl.vrm",
  },
];

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function download(url, destURL) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await mkdir(dirname(destURL.pathname.replace(/^\/([A-Za-z]:)/, "$1")), {
    recursive: true,
  }).catch(() => {});
  await writeFile(destURL, buf);
  return buf.length;
}

function pickRes(obj, prefs) {
  for (const p of prefs) if (obj[p]) return [p, obj[p]];
  const k = Object.keys(obj)[0];
  return [k, obj[k]];
}

async function fetchModel(id) {
  const files = await getJSON(`${API}/files/${id}`);
  const [res, resEntry] = pickRes(files.gltf, MODEL_RES);
  const entry = resEntry.gltf; // gltf[res].gltf = { url, include }
  const dir = new URL(`models/${id}/`, ROOT);
  await mkdir(dir, { recursive: true });
  // 本体 gltf
  const gltfName = entry.url.split("/").pop();
  let total = await download(entry.url, new URL(gltfName, dir));
  // 付随ファイル（.bin / textures）— include のキーが相対パス
  for (const [rel, info] of Object.entries(entry.include || {})) {
    total += await download(info.url, new URL(rel, dir));
  }
  console.log(`✓ model ${id} (${res})  ${(total / 1e6).toFixed(2)} MB  -> ${gltfName}`);
  return { id, gltf: `models/${id}/${gltfName}` };
}

async function fetchHDRI(id) {
  const files = await getJSON(`${API}/files/${id}`);
  const entry = files.hdri[HDRI_RES].hdr;
  const name = entry.url.split("/").pop();
  const dest = new URL(`hdri/${name}`, ROOT);
  await mkdir(new URL("hdri/", ROOT), { recursive: true });
  const sz = await download(entry.url, dest);
  console.log(`✓ hdri ${id} (${HDRI_RES})  ${(sz / 1e6).toFixed(2)} MB  -> ${name}`);
  return { id, file: `hdri/${name}` };
}

async function fetchTexture(id) {
  const files = await getJSON(`${API}/files/${id}`);
  const dir = new URL(`textures/${id}/`, ROOT);
  await mkdir(dir, { recursive: true });
  const maps = { Diffuse: "diff", nor_gl: "nor", Rough: "rough" };
  const result = {};
  let total = 0;
  for (const [key, short] of Object.entries(maps)) {
    const entry = files[key]?.[TEX_RES]?.jpg;
    if (!entry) continue;
    const name = entry.url.split("/").pop();
    total += await download(entry.url, new URL(name, dir));
    result[short] = `textures/${id}/${name}`;
  }
  console.log(`✓ texture ${id} (${TEX_RES})  ${(total / 1e6).toFixed(2)} MB`);
  return result;
}

const manifest = { models: {}, hdri: null, vrms: {}, textures: {} };
for (const id of MODELS) {
  try {
    const m = await fetchModel(id);
    manifest.models[id] = m.gltf;
  } catch (e) {
    console.error(`✗ model ${id}: ${e.message}`);
  }
}
try {
  const h = await fetchHDRI(HDRI);
  manifest.hdri = h.file;
} catch (e) {
  console.error(`✗ hdri ${HDRI}: ${e.message}`);
}
for (const id of TEXTURES) {
  try {
    manifest.textures[id] = await fetchTexture(id);
  } catch (e) {
    console.error(`✗ texture ${id}: ${e.message}`);
  }
}
for (const v of VRMS) {
  try {
    const dest = new URL(`models/characters/${v.name}.vrm`, ROOT);
    await mkdir(new URL("models/characters/", ROOT), { recursive: true });
    const sz = await download(v.url, dest);
    manifest.vrms[v.name] = `models/characters/${v.name}.vrm`;
    console.log(`✓ vrm ${v.name}  ${(sz / 1e6).toFixed(2)} MB`);
  } catch (e) {
    console.error(`✗ vrm ${v.name}: ${e.message}`);
  }
}

await writeFile(
  new URL("models/manifest.json", ROOT),
  JSON.stringify(manifest, null, 2)
);
console.log("\nmanifest written: public/models/manifest.json");
