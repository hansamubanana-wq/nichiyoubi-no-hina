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
  portrait,
} from "../core/build.js";

// マップエディタ／マップ読み込みで配置できるオブジェクトの登録簿。
// 「種類」を文字列キーで指定して生成する。手作りジオメトリと外部アセットの両方を扱う。
// 新しい種類を足したいときは、ここに 1 行追加するだけ。

// 手作り（同期）ファクトリ
const PROCEDURAL = {
  box: () => box(1, 1, 1, mat(0x9a8f78)),
  floorTile: () => {
    const m = box(2, 0.1, 2, mat(0x6b5640, { roughness: 0.8 }));
    m.userData.surface = { tex: "wood_floor", tile: 2.0 };
    return m;
  },
  wallPanel: () => {
    const m = box(2, 2.6, 0.2, mat(0xb6aa92, { roughness: 0.95 }));
    m.userData.surface = { tex: "beige_wall_001", tile: 2.4 };
    return m;
  },
  table: () => table(),
  chair: () => chair(),
  bento: () => bento(),
  altar: () => altar(),
  door: () => door(),
  stairs: () => stairs(),
  cardigan: () => cardigan(),
  laundry: () => laundry(),
  figure: () => figure(),
  portrait: () => portrait(),
  bed: () => {
    const g = new THREE.Group();
    g.add(box(1.1, 0.4, 2.0, mat(0x6a5a48, { roughness: 0.8 }), 0, 0.2, 0));
    g.add(box(1.12, 0.16, 2.0, mat(0xb7c2cb, { roughness: 1 }), 0, 0.46, 0));
    g.add(box(0.7, 0.12, 0.4, mat(0xe6e0d2, { roughness: 1 }), 0, 0.5, -0.7));
    return g;
  },
};

// 外部アセット（gltf）キー
const ASSET_MODELS = [
  "sofa_03",
  "wooden_table_02",
  "dining_chair_02",
  "electric_stove",
  "wall_clock",
  "SchoolDesk_01",
  "SchoolChair_01",
  "wooden_bookshelf_worn",
  "book_encyclopedia_set_01",
];

// エディタのパレットに並べる一覧（ラベル付き）
export const PALETTE = [
  { group: "床・壁", items: ["floorTile", "wallPanel"] },
  {
    group: "家具(アセット)",
    items: [
      "sofa_03",
      "wooden_table_02",
      "dining_chair_02",
      "electric_stove",
      "wall_clock",
      "SchoolDesk_01",
      "SchoolChair_01",
      "wooden_bookshelf_worn",
      "book_encyclopedia_set_01",
    ],
  },
  {
    group: "家具(手作り)",
    items: ["table", "chair", "bed", "altar", "door", "stairs"],
  },
  { group: "小物", items: ["bento", "cardigan", "laundry", "portrait", "box"] },
  { group: "人物", items: ["figure", "hina"] },
];

export const TYPE_LABELS = {
  floorTile: "床タイル",
  wallPanel: "壁パネル",
  sofa_03: "ソファ",
  wooden_table_02: "木テーブル",
  dining_chair_02: "ダイニング椅子",
  electric_stove: "コンロ",
  wall_clock: "壁掛け時計",
  SchoolDesk_01: "学習机",
  SchoolChair_01: "学校椅子",
  wooden_bookshelf_worn: "本棚",
  book_encyclopedia_set_01: "教科書",
  table: "机(手作り)",
  chair: "椅子(手作り)",
  bed: "ベッド",
  altar: "祭壇",
  door: "ドア",
  stairs: "階段",
  bento: "弁当",
  cardigan: "カーディガン",
  laundry: "洗濯物",
  portrait: "写真立て",
  box: "箱",
  figure: "人物(影)",
  hina: "陽菜(VRM)",
};

export function isKnownType(type) {
  return (
    !!PROCEDURAL[type] || ASSET_MODELS.includes(type) || type === "hina"
  );
}

// 種類からオブジェクトを生成（非同期。アセットはロードを待つ）。
export async function createObject(type, assets) {
  if (PROCEDURAL[type]) {
    const o = PROCEDURAL[type]();
    // テクスチャを持つ手作り床/壁は即適用（traverse は単体メッシュにも有効）
    if (assets && o.userData && o.userData.surface) {
      assets.applySurfaceTextures(o);
    }
    return o;
  }
  if (ASSET_MODELS.includes(type) && assets) {
    const m = await assets._getClone(type);
    if (m) return m;
  }
  if (type === "hina" && assets) {
    const vrm = await assets.loadVRM("hina");
    if (vrm) return vrm.scene;
  }
  // フォールバック
  return box(0.5, 0.5, 0.5, mat(0xff00ff));
}
