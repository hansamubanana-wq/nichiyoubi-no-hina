import * as THREE from "three";
import { buildHouse, upgradeHouse, placeVRM } from "../scenes/house.js";
import { buildHinaRoom, upgradeHinaRoom } from "../scenes/hinaRoom.js";
import { buildSchool, upgradeSchool } from "../scenes/school.js";
import { buildBeach, makeSeaUpdater } from "../scenes/beach.js";

// 本編 CHAPTER 1 〜 FINAL ＋ エンディング。
// プロローグの後、タイトルカードを経てここへ続く。

let su = []; // 現在シーンの updater（遷移時にまとめて解除）
function addSU(game, fn) {
  su.push(fn);
  return game.addUpdater(fn);
}
function clearSU(game) {
  su.forEach((fn) => game.removeUpdater(fn));
  su = [];
}

// シーン遷移（暗転 → 旧破棄 → 新構築 → 実モデル化 → 明転）
async function transition(game, assets, build, upgrade, { fadeIn = true } = {}) {
  await game.fade("black", 1.6);
  game.hideDialogue();
  game.setObjective(null);
  clearSU(game);
  game.clearInteractables();
  game.disableLook();
  const old = game.scene;
  const s = build();
  game.setScene(s.scene);
  if (upgrade) await upgrade(assets, s.scene, s.refs, game);
  if (old && old !== s.scene) game.disposeScene(old);
  s._game = game;
  return s;
}

// 「N個調べる」探索パート。全部終わると解決。
async function explore(game, objective, eye, focus, tasks) {
  game.setObjective(objective);
  await game.camTo(eye, focus, 2.2);
  game.enableLook(eye, focus);
  let remaining = tasks.length;
  await new Promise((resolveAll) => {
    const register = () => {
      game.clearInteractables();
      tasks.forEach((task) => {
        if (task._done) return;
        game.addInteractable(
          task.obj,
          task.hint,
          async () => {
            task._done = true;
            remaining--;
            game.clearInteractables();
            game.disableLook();
            if (task.view) await game.camTo(task.view.pos, task.view.look, 1.8);
            await task.run();
            game.hideDialogue();
            if (remaining <= 0) resolveAll();
            else {
              await game.camTo(eye, focus, 1.8);
              game.enableLook(eye, focus);
              register();
            }
          },
          { once: true }
        );
      });
    };
    register();
  });
  game.disableLook();
  game.clearInteractables();
  game.setObjective(null);
}

export async function runChapters(game, assets) {
  // 雨を弱く（家の外）
  game.audio.start("rain", 0.1, 4);

  // ============================================================
  // CHAPTER 1「部屋に入れない」（49日後）
  // ============================================================
  await game.caption("四十九日が、過ぎた。", { hold: 3200 });
  const house1 = await transition(game, assets, buildHouse, upgradeHouse);
  const { refs: r1, cam: c1 } = house1;
  game.placeCamera(c1.doorFront.pos, c1.doorFront.look);
  await game.fade("clear", 2);

  await game.say("", "段ボール箱には「陽菜のもの」と書いてある。");
  await game.say("", "陽菜の部屋の、ドアの前。");

  // ドアを調べる → まだ入れない
  game.setObjective("陽菜の部屋を片付ける");
  await new Promise((res) => {
    game.addInteractable(
      r1.door,
      "ドアを開ける",
      async () => {
        game.clearInteractables();
        await game.say("誠司", "……まだ、無理だ。");
        res();
      },
      { once: true }
    );
  });
  await game.say("", "誠司は、階段を降りる。");

  // リビング探索：祭壇・冷蔵庫・洗濯機
  await game.fade("black", 1.4);
  game.placeCamera(c1.overview.pos, c1.overview.look);
  await game.fade("clear", 1.6);

  await explore(
    game,
    "家の中を見てまわる（ドラッグで見回す）",
    [3, 1.6, 1.5],
    [-2, 1.1, -4],
    [
      {
        obj: r1.altar,
        hint: "祭壇を見る",
        view: c1.altar,
        run: async () => {
          await game.say("", "母と陽菜の写真が、並んでいる。");
          await game.say("誠司", "二人とも、俺を置いていった。");
        },
      },
      {
        obj: r1.fridgeMemo,
        hint: "冷蔵庫のメモ",
        view: c1.fridge,
        run: async () => {
          await game.showDocument({
            title: "冷蔵庫のメモ",
            body: "牛乳\n卵\nパパのコーヒー",
          });
          await game.say("誠司", "俺の分まで、書いてたのか。");
        },
      },
      {
        obj: r1.washerMemo,
        hint: "洗濯機のメモ",
        view: c1.washer,
        run: async () => {
          await game.showDocument({
            title: "洗濯機に貼られたメモ",
            body: "タオルは三つ折り。\nパパ、毎回ぐちゃぐちゃ。",
          });
          await game.say("", "少し笑いかけて、すぐ泣きそうになる。");
        },
      },
    ]
  );

  await game.say("", "……もう一度、あの部屋の前に立とう。");

  // ============================================================
  // CHAPTER 2「陽菜の部屋」
  // ============================================================
  const room = await transition(game, assets, buildHinaRoom, upgradeHinaRoom);
  const { refs: rr, cam: rc } = room;
  game.placeCamera(rc.door.pos, rc.door.look);
  await game.fade("clear", 2.2);
  game.audio.start("drone", 0.14, 5);

  await game.say("", "ようやく、ドアを開けた。");
  await game.say("", "部屋は、そのままだった。机。ベッド。制服。教科書。");
  await game.camTo(rc.drawer.pos, rc.drawer.look, 3);

  // 机の引き出し → メモ
  await new Promise((res) => {
    game.setObjective("机の引き出しを調べる");
    game.enableLook(rc.overview.pos, rc.overview.look);
    game.placeCamera(rc.overview.pos, rc.overview.look);
    game.addInteractable(
      rr.drawer,
      "引き出しを開ける",
      async () => {
        game.clearInteractables();
        game.disableLook();
        await game.camTo(rc.drawer.pos, rc.drawer.look, 1.8);
        res();
      },
      { once: true }
    );
  });
  game.setObjective(null);
  await game.showDocument({
    title: "小さなメモ",
    body: "日曜日、行きたい場所を考える。\nパパ、少し笑ってた。",
  });
  await game.say("誠司", "行く気、あったのか。");

  // 選択肢ごとに個別の文言。ただし結末（メモを持っていく）は共通。
  const ch = await game.choice(["読み返す", "ポケットに入れる", "机に戻す"]);
  if (ch === 0) {
    await game.say("", "もう一度、読み返す。何度も、何度も。");
    await game.say("", "誠司は、メモを手のひらに包んだ。");
  } else if (ch === 1) {
    await game.say("", "メモを、そっとポケットに入れた。");
    await game.say("", "胸の近くに、しまっておきたかった。");
  } else {
    await game.say("", "机に戻そうとして、手が止まる。");
    await game.say("", "……やっぱり、持っていくことにした。");
  }

  // ============================================================
  // CHAPTER 3「父の記憶」
  // ============================================================
  await game.caption("ものを調べるたび、小さな記憶がよみがえる。", { hold: 3200 });
  game.placeCamera(rc.overview.pos, rc.overview.look);

  // 回想1：焦げたトースト
  await flashbackToast(game);
  await game.showDocument({
    title: "陽菜の日記より",
    body:
      "パパの焦げたトースト、苦かった。\nでも、作ってくれたから食べた。\nたぶんパパも、頑張ってる。",
  });
  await game.say("誠司", "見てたのか……俺のこと。");

  // 回想2：洗濯物
  await flashbackLaundry(game);
  await game.showDocument({
    title: "陽菜の日記より",
    body:
      "パパ、洗濯下手すぎ。\nでも、私に聞こうとしてた。\nママがいなくなってから、パパも迷子みたい。",
  });
  await game.say("", "誠司は、日記を閉じた。");

  // ============================================================
  // CHAPTER 4「知らなかった陽菜」
  // ============================================================
  await game.caption("誠司は、学校へ行った。", { hold: 2800 });
  const school = await transition(game, assets, buildSchool, upgradeSchool);
  const { refs: sr, cam: sc } = school;
  game.placeCamera(sc.seat.pos, sc.seat.look);
  game.audio.fade("rain", 0.04, 3);
  await game.fade("clear", 2);

  await game.say("担任", "陽菜さんは、あまり話さなくなっていました。");
  await game.say("誠司", "家でも、そうでした。");
  await game.say("担任", "でも、お父さんのことは、よく書いていました。");
  await game.say("", "担任が、一枚の作文を差し出した。");
  await game.camTo(sc.essay.pos, sc.essay.look, 2.2);
  await game.showDocument({
    title: "作文「私の家族」　佐伯 陽菜",
    body:
      "父は無口です。\nでも、優しい人です。\n最近はずっと疲れています。\n私は父に、何を言えばいいのか分かりません。\nでも本当は、父が一人にならないようにしたいです。",
  });
  await game.say("誠司", "……俺は、何も見えてなかった。");

  // ============================================================
  // CHAPTER 5「日曜日の候補」
  // ============================================================
  await game.caption("家に戻る。陽菜の部屋へ。", { hold: 2800 });
  const room2 = await transition(game, assets, buildHinaRoom, upgradeHinaRoom);
  const { refs: rr2, cam: rc2 } = room2;
  game.placeCamera(rc2.overview.pos, rc2.overview.look);
  game.audio.start("drone", 0.12, 4);
  await game.fade("clear", 2);

  await game.say("", "机の上に、一冊のノートを見つけた。");
  await new Promise((res) => {
    game.setObjective("ノートを開く");
    game.enableLook(rc2.overview.pos, rc2.overview.look);
    game.addInteractable(
      rr2.note,
      "ノートを開く",
      async () => {
        game.clearInteractables();
        game.disableLook();
        await game.camTo(rc2.note.pos, rc2.note.look, 1.8);
        res();
      },
      { once: true }
    );
  });
  game.setObjective(null);
  await game.showDocument({
    title: "ノート「日曜日に行く場所」",
    body:
      "・海\n・水族館\n・映画\n・お母さんが好きだった喫茶店\n・何もしないで散歩\n\n海がいいかも。\nママと三人で行った場所。\nパパ、覚えてるかな。",
  });
  await game.say("", "誠司は、声を出せなかった。");

  // ============================================================
  // CHAPTER 6「やり直し」（夢）
  // ============================================================
  await game.caption("その夜、誠司は夢を見た。", { hold: 3000 });
  await dreamChapter(game, assets);

  // ============================================================
  // CHAPTER 7「陽菜の声」
  // ============================================================
  await game.caption("陽菜のスマホの、ロックが解けた。", { hold: 3200 });
  const room3 = await transition(game, assets, buildHinaRoom, upgradeHinaRoom);
  game.placeCamera(room3.cam.phone.pos, room3.cam.phone.look);
  await game.fade("clear", 2);
  await game.say("", "音声メモが、一件。タイトルは「日曜日のこと」。");
  game.audio.fade("drone", 0.06, 3);

  await game.audioMemo("日曜日のこと", [
    "パパへ。",
    "これ、聞くことないかもしれないけど。",
    "日曜日、海がいいな。",
    "ママと三人で行ったところ。",
    "パパ、覚えてる？",
    "覚えてなかったら怒る。",
    "私ね、パパのこと嫌いじゃないよ。",
    "怒ってもない。",
    "ただ、何を話せばいいか分かんなかった。",
    "パパが泣かないから、私も泣いちゃだめだと思った。",
    "でも、本当はさ……",
    "二人で泣けばよかったね。",
    "日曜日、海行こうね。",
  ]);
  await game.say("", "誠司は、床に座り込んだ。");

  // ============================================================
  // FINAL CHAPTER「日曜日」
  // ============================================================
  await finalChapter(game, assets);

  // ============================================================
  // エンディング
  // ============================================================
  await endingChapter(game, assets);

  return { done: true };
}

// ---- 回想1：焦げたトースト ----
async function flashbackToast(game) {
  await game.flashbackEnter();
  await game.say("", "── あの朝。");
  await game.say("誠司", "悪い。焦げた。");
  await game.say("陽菜", "いい。");
  await game.say("", "二人で食べた。陽菜は、少しだけ笑っていた。");
  await game.flashbackExit();
}

// ---- 回想2：洗濯物 ----
async function flashbackLaundry(game) {
  await game.flashbackEnter();
  await game.say("", "── あの夜。");
  await game.say("誠司", "母さん、こうやってたか。");
  await game.say("陽菜", "……うん。");
  await game.flashbackExit();
}

// ---- CHAPTER 6 夢 ----
async function dreamChapter(game, assets) {
  const house = await transition(game, assets, buildHouse, upgradeHouse);
  const { cam } = house;
  document.body.classList.add("flashback");
  game.placeCamera(cam.table.pos, cam.table.look);
  game.audio.start("drone", 0.18, 3);
  await game.fade("clear", 2.4);

  // 場面1：食卓（選択肢は個別だが、結末は共通＝陽菜は静かに笑うだけ）
  await game.say("", "夢の中。食卓。陽菜が、黙っている。");
  const ch = await game.choice([
    "「大丈夫か」と聞く",
    "何も言わない",
    "「日曜、海に行こう」と言う",
  ]);
  if (ch === 0) await game.say("誠司", "……大丈夫か。");
  else if (ch === 2) await game.say("誠司", "日曜、海に行こう。");
  else await game.say("", "誠司は、ただ陽菜を見ていた。");
  await game.say("", "陽菜は、少し笑うだけだった。");
  await game.say("陽菜", "パパ、無理しなくていいよ。");

  // 場面2：部屋の前（ドアは開かない）
  await game.fade("black", 1.8);
  game.placeCamera(cam.doorFront.pos, cam.doorFront.look);
  await game.fade("clear", 1.8);
  await game.say("", "気づくと、部屋の前にいた。");

  for (let i = 0; i < 3; i++) {
    await new Promise((res) => {
      game.addInteractable(
        house.refs.door,
        "ドアを開ける",
        async () => {
          game.clearInteractables();
          game.audio.blip(140, 0.06);
          res();
        },
        { once: true }
      );
    });
    if (i < 2) await game.say("", "……開かない。");
  }
  await game.caption("過去は、開かない。", { hold: 3200 });
  await game.say("誠司", "頼む……一回でいい。");
  await game.say("誠司", "一回でいいから、戻してくれ。");
  await game.fade("black", 2.5);
  document.body.classList.remove("flashback");
  game.audio.fade("drone", 0.1, 3);
}

// ---- FINAL：海辺 ----
async function finalChapter(game, assets) {
  await game.fade("black", 1.6);
  game.hideDialogue();
  await game.caption("日曜日。", { hold: 2600 });

  const beach = await transition(game, assets, buildBeach, null);
  const { refs: br, cam: bc } = beach;
  addSU(game, makeSeaUpdater(br));
  game.audio.stopAll(2);
  game.audio.start("waves", 0.5, 4);
  game.audio.start("wind", 0.15, 5);
  game.placeCamera(bc.sit.pos, bc.sit.look);
  await game.fade("clear", 3);

  await game.say("", "空は、晴れていた。波の音。");
  await game.say("誠司", "陽菜。");
  await game.say("誠司", "遅くなって、ごめんな。");
  await game.say("誠司", "父さんな……お前に、何もしてやれなかったと思ってた。");
  await game.say("誠司", "何も聞けなかった。何も分かってやれなかった。");
  await game.say("", "長い、沈黙。");
  await game.say("誠司", "でも、お前は……俺のこと、見ててくれたんだな。");
  game.audio.note(392, 0.18);
  await game.say("", "誠司は、泣いた。");

  // 陽菜の幻（VRM）が波打ち際に現れる
  let hina = null;
  if (assets) {
    hina = await placeVRM(assets, beach.scene, "hina", {
      position: [0.5, 0, -3.0],
      height: 1.6,
      rotationY: Math.PI, // 海（手前）を背に、誠司の方を向く
      ghost: true,
      opacity: 0.0,
      game,
    });
  }
  await game.camTo(bc.hina.pos, bc.hina.look, 3);
  if (hina) await fadeVRM(game, hina, 0.0, 0.6, 2.5);
  await game.say("陽菜", "パパ。");
  await game.say("", "そこには、誰もいない。でも、波打ち際に、陽菜が立っているように見えた。");
  await game.say("陽菜", "遅いよ。");
  await game.say("誠司", "悪い。");
  await game.say("陽菜", "ほんと、遅い。");
  await game.say("誠司", "……海、来たぞ。");
  await game.say("陽菜", "うん。");
  await game.say("陽菜", "きれいだね。");
  await game.say("誠司", "ああ。");
  await game.say("陽菜", "パパ。もう、一人で泣かないで。");
  await game.say("", "誠司は、答えられない。");
  await game.say("陽菜", "ちゃんと、ご飯食べて。");
  await game.say("誠司", "……分かった。");
  await game.say("陽菜", "洗濯も、ちゃんと三つ折り。");
  await game.say("誠司", "分かった。");

  // 陽菜が薄くなる
  if (hina) fadeVRM(game, hina, 0.6, 0.0, 4);
  await game.say("誠司", "陽菜。");
  await game.say("誠司", "父さんの娘でいてくれて、ありがとう。");
  await game.say("陽菜", "パパの娘でよかった。");
  await game.wait(1500);
  await game.say("", "陽菜の姿が、消える。波の音だけが、残った。");
  await game.wait(1200);
}

// VRM の不透明度をトゥイーン
function fadeVRM(game, vrm, from, to, time) {
  return new Promise((resolve) => {
    let t = 0;
    const setOp = (v) => {
      vrm.scene.traverse((o) => {
        if (o.isMesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            m.transparent = true;
            m.depthWrite = false;
            m.opacity = v;
          });
        }
      });
    };
    setOp(from);
    const fn = (dt) => {
      t += dt / time;
      const k = Math.min(t, 1);
      setOp(from + (to - from) * k);
      if (t >= 1) {
        game.removeUpdater(fn);
        resolve();
      }
    };
    game.addUpdater(fn);
  });
}

// ---- エンディング ----
async function endingChapter(game, assets) {
  await game.fade("black", 2.5);
  game.hideDialogue();
  await game.caption("数か月後。", { hold: 2800 });

  const house = await transition(game, assets, buildHouse, upgradeHouse);
  const { cam } = house;
  game.audio.start("rain", 0.0, 1); // 静か
  game.audio.fade("waves", 0.0, 2);
  game.placeCamera(cam.kitchen.pos, cam.kitchen.look);
  await game.fade("clear", 2.5);

  await game.say("", "誠司は、朝食を作っている。トーストは、少し焦げている。");
  await game.say("", "でも、捨てない。");
  await game.camTo(cam.table.pos, cam.table.look, 3);
  await game.say("", "食卓には、一人分。祭壇には、母と陽菜の写真。");
  await game.say("", "誠司は、手を合わせた。");
  await game.say("誠司", "いただきます。");
  await game.say("", "そして、食べる。少し、苦い。");
  game.audio.note(523, 0.16);
  await game.say("", "誠司は、小さく笑った。");
  await game.wait(1500);
  await game.fade("black", 3);
  game.hideDialogue();
  game.audio.stopAll(3);
}
