# 日曜日の陽菜

> また、日曜日に。

父親が、娘の死を「自分のせいだ」と思い続けながら、娘の残したものを通して、少しずつ赦されていく——
探索型ストーリーゲーム『日曜日の陽菜』。

プロローグ「届かなかった日曜日」から FINAL CHAPTER・エンディングまで、**全編をプレイできます**。

## 概要

- ジャンル: 探索型ストーリーゲーム
- 視点: **一人称（プレイヤー＝主人公 佐伯誠司）**＋ドラッグで見回し・クリック探索
- 技術: Three.js による 3D 表現 + Web Audio による環境音合成（音声素材なし）
- 対応: PC / タブレット / スマホ（レスポンシブ）

静かな家・学校・海辺を巡りながら、妻と娘を亡くした父が、娘の残したものを通して少しずつ赦されていく物語を追体験します。

## 章立て

プロローグ → CH1 部屋に入れない → CH2 陽菜の部屋 → CH3 父の記憶（回想）→
CH4 知らなかった陽菜（学校・作文）→ CH5 日曜日の候補 → CH6 やり直し（夢）→
CH7 陽菜の声（音声メモ）→ FINAL 日曜日（海辺）→ エンディング

## 主な機能

- **一人称の3D探索**: 佐伯家・陽菜の部屋・学校の面談室・海辺をシームレスに移動
- **フォトリアルな3Dアセット**: Poly Haven（CC0）の家具・小物 ＋ HDRI ライティング
- **キャラクター（VRM）**: 娘・陽菜を VRoid 系アニメモデル（VRM）で表示。髪のゆれ（スプリングボーン）対応。海辺では半透明の「幻」として登場
- **見回し探索**: ドラッグでその場を見回し、光るヒントの出る物をクリックして調べる
- **物語演出**: カメラ補間・フェード・白文字キャプション・タイプ表示会話・**選択肢**・**書類ビュー**（日記／作文／ノート／メモ）・**音声メモ再生**・**回想（セピア）**
- **環境音の合成**: 雨・波・風・低いドローン・時計などをすべて Web Audio API でリアルタイム生成（音声ファイル不要）
- **3Dの雨パーティクル**・海面のうねり
- ファビコン / アプリアイコン(192・512) / OGP / PWA マニフェスト対応

## 使用技術

| 区分 | 技術 |
| --- | --- |
| 3D | [Three.js](https://threejs.org/)（GLTFLoader / RGBELoader） |
| キャラクター | [@pixiv/three-vrm](https://github.com/pixiv/three-vrm)（VRM） |
| 3Dアセット | [Poly Haven](https://polyhaven.com/)（CC0）のフォトリアルなモデル・HDRI |
| ビルド | [Vite](https://vitejs.dev/) |
| 音 | Web Audio API（環境音をコードで合成） |
| 言語 | JavaScript (ES Modules) |

### 3Dアセットについて

家具（ソファ・食卓・椅子・コンロ・壁掛け時計・学習机・椅子・本棚・教科書）と
室内ライティング用の HDRI は、すべて **Poly Haven の CC0（著作権表示不要）** 素材です。

娘・陽菜のキャラクターは VRM（`public/models/characters/hina.vrm`）で、
three-vrm のサンプル（VRoid 系アニメモデル）を**プレースホルダ**として使用しています。
自作の VRoid モデル（[VRoid Studio](https://vroid.com/studio) で女子高生を作成 → VRM 書き出し）に
差し替え可能です。同じファイル名で置き換えるだけで反映されます。

```bash
node scripts/fetch-assets.mjs   # public/models/ と public/hdri/ に取得し manifest.json を生成
```

- 起動時に `AssetManager`（`src/core/assets.js`）が `public/models/manifest.json` を読み、
  gltf モデルと HDRI を並列プリロードします。
- 手作りジオメトリ（`src/core/build.js`）を**プレースホルダ**として配置し、
  読み込み完了後に実モデルへ自動で差し替えます（bounding box にフィット）。
- **アセットが無い／取得失敗時は手作りジオメトリのまま動作**します（フォールバック）。
- 新しいモデルを足すには `scripts/fetch-assets.mjs` の `MODELS` に Poly Haven の ID を追加し、
  `src/scenes/house.js` の `upgradeHouse()` で `swap()` または `place()` を呼ぶだけです。

### 床・壁・天井の外部テクスチャ

床・壁・天井などコードで色を塗っていた面は、**Poly Haven の CC0 テクスチャ**（1k jpg・軽量）に
置き換えています。仕組み:

- メッシュに `mesh.userData.surface = { tex: "wood_floor", tile: 2.2 }` を付けるだけ。
  `tile` は「テクスチャ1枚あたりの実寸（m）」で、メッシュ寸法から繰り返し回数を自動計算。
- シーンの `upgrade*()` 内で `assets.applySurfaceTextures(scene)` を呼ぶと一括適用。
- 新しいテクスチャは `scripts/fetch-assets.mjs` の `TEXTURES` に Poly Haven の ID を足して
  `node scripts/fetch-assets.mjs` を実行 → `userData.surface.tex` で指定するだけ。

## マップエディタ（このゲーム専用の軽量編集ツール）

配置や向きがおかしい箇所を、ブラウザ上で手動修正するための最小限のツールです。

```
npm run dev → http://localhost:5173/editor.html
```

できること:

- **シーン選択**（house / hinaRoom / school / beach / funeral）
- オブジェクトの**選択**（クリック）・**移動 / 回転 / 拡縮**（W / E / R、ギズモ操作）
- **削除**（Del）・**追加**（パレットから種類を選んで配置）・**種類変更**
- **保存**（`<シーン名>.json` をダウンロード＋クリップボードへコピー）
- **読込**（保存した JSON ファイル、または `public/maps/` の既存データ）

保存した JSON を **`public/maps/<シーン名>.json`** に置くと、ゲーム起動時に自動適用されます
（各 `upgrade*()` 末尾の `loadMapData()` が読み込み）。

マップデータは人間が読んで直せる JSON です（位置=m、回転=ラジアン、`note` に日本語ラベル付き）:

```json
{
  "scene": "house",
  "overrides": { "sofa": { "note": "ソファ", "pos": [-4.5, 0.15, 2.55], "rot": [0,0,0], "scale": 0.85 } },
  "removed": [],
  "added": [ { "type": "wall_clock", "note": "時計", "name": "add:0", "pos": [0,3,−6], "rot": [0,0,0], "scale": 1 } ]
}
```

設計（関心の分離）:

- `src/editor/MapKit.js` … 配置できるオブジェクトの種類登録簿（パレット）
- `src/editor/mapIO.js` … マップ JSON の保存（`serialize`）・適用（`applyMapData` / `loadMapData`）
- `src/editor/Editor.js` … エディタ UI 本体（OrbitControls / TransformControls）
- 編集対象の識別名は各シーンの `nameRefs(refs)` が付与（`sofa` `altar` `clock` など）

## 起動方法

```bash
cd nichiyoubi-no-hina
npm install
npm run dev      # 開発サーバー（http://localhost:5173）
npm run build    # 本番ビルド（dist/）
npm run preview  # ビルド結果のプレビュー
```

アイコンを作り直す場合:

```bash
node scripts/generate-icons.mjs   # public/icons/icon-192.png, icon-512.png を再生成
```

操作:

- 「はじめる」をクリックで開始（このタイミングで音声が有効化されます）
- 会話は **クリック / スペース / Enter** で送る
- 探索パートでは、光るヒントの出る物を **クリック**

## ディレクトリ構成

```
nichiyoubi-no-hina/
├─ index.html              # ゲーム本体エントリ（OGP・favicon・manifest 設定）
├─ editor.html             # マップエディタのエントリ
├─ package.json
├─ scripts/
│  ├─ generate-icons.mjs   # 依存なしの PNG アイコン生成
│  └─ fetch-assets.mjs     # Poly Haven (CC0) のモデル・HDRI・テクスチャ取得
├─ public/
│  ├─ manifest.webmanifest
│  ├─ icons/               # favicon.svg / icon-192,512.png / ogp.svg
│  ├─ hdri/                # 室内 HDRI（IBL用）
│  ├─ textures/            # 床・壁・天井の PBR テクスチャ
│  ├─ maps/                # マップエディタの保存データ（<scene>.json）
│  └─ models/              # GLTFモデル＋manifest.json
│     └─ characters/       # 陽菜の VRM
└─ src/
   ├─ main.js              # 起動・タイトル・進行の起点（プロローグ→本編→ラスト）
   ├─ style.css            # UI（会話/キャプション/選択肢/書類/音声メモ/タイトル）
   ├─ core/
   │  ├─ Game.js           # レンダラ・カメラ・演出ヘルパ・インタラクト・見回し
   │  ├─ AudioSystem.js    # Web Audio による環境音合成
   │  ├─ assets.js         # GLTF/HDRI/VRM/テクスチャのロードと差し替え
   │  ├─ Rain.js           # 3D 雨パーティクル
   │  └─ build.js          # ジオメトリ／家具ヘルパ（プレースホルダ）＋ nameRefs
   ├─ editor/              # ★ マップ編集エンジン（ゲーム本体と分離）
   │  ├─ Editor.js         # エディタ UI 本体
   │  ├─ MapKit.js         # 配置できるオブジェクトの種類登録簿
   │  ├─ mapIO.js          # マップ JSON の保存・適用
   │  └─ main.js           # editor.html 用エントリ
   ├─ scenes/
   │  ├─ funeral.js        # 葬式場
   │  ├─ house.js          # 佐伯家の屋内（＋VRM配置ヘルパ）
   │  ├─ hinaRoom.js       # 陽菜の部屋
   │  ├─ school.js         # 学校・面談室
   │  └─ beach.js          # 海辺（FINAL）
   └─ story/
      ├─ prologue.js       # プロローグ「届かなかった日曜日」
      └─ chapters.js       # CHAPTER 1〜FINAL＋エンディング
```

## 今後の改善案

- **陽菜の VRM を自作モデルに差し替え**（VRoid Studio で女子高生を作成）
- キャラクターのアニメーション（歩く・座る・うつむく等。現在は静止＋髪のゆれのみ）。Mixamo 等のモーション導入
- 和物アセットの追加（仏壇・冷蔵庫・洗濯機・制服・弁当など。Poly Haven に無いものは Sketchfab の CC0 から）
- 環境音のさらなる作り込み・任意で楽曲BGMの追加
- セーブ／ロード、章選択、字幕速度設定、アクセシビリティ対応
- スマホ向け操作の最適化（タップ領域・縦持ち対応）

---

※ 本作はセンシティブな題材（家族の喪失）を扱います。静かな環境・イヤホンでの体験を推奨します。
