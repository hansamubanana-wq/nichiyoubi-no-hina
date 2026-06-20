import * as THREE from "three";
import { buildFuneral } from "../scenes/funeral.js";
import { buildHouse, upgradeHouse } from "../scenes/house.js";
import { laundry } from "../core/build.js";
import { loadMapData } from "../editor/mapIO.js";

// プロローグ「届かなかった日曜日」の進行。
// 台本の流れに沿って、シーン構築・カメラ・会話・環境音を順に展開する。
export async function runPrologue(game, assets) {
  let rainUpdater = null;
  const attachRain = (rain) => {
    rainUpdater = game.addUpdater((dt) => rain.update(dt));
  };
  const detachRain = () => {
    if (rainUpdater) game.removeUpdater(rainUpdater);
    rainUpdater = null;
  };

  // ============================================================
  // 0. 黒画面
  // ============================================================
  game.audio.start("rain", 0.5, 3);
  game.audio.start("drone", 0.3, 5);
  await game.wait(1500);
  await game.caption("妻が死んだ日、\n家から音が消えた。", { hold: 4200 });
  await game.wait(800);

  // ============================================================
  // 1. 葬式場
  // ============================================================
  const funeral = buildFuneral();
  game.setScene(funeral.scene);
  if (assets) {
    assets.applyEnvironment(funeral.scene, 0.18);
    await loadMapData(funeral.scene, "funeral", assets); // エディタの配置修正を適用
  }
  attachRain(funeral.rain);
  game.placeCamera(funeral.cam.portrait.pos, funeral.cam.portrait.look);
  await game.fade("clear", 3);
  await game.wait(2000);

  await game.say("", "雨の音だけが、ホールに満ちている。");
  await game.say("親族A", "娘さん、高校生でしょう……");
  await game.say("親族B", "お父さんも、大変ね……");
  await game.wait(600);
  // 引いて陽菜の存在を映す
  await game.camTo(funeral.cam.wide.pos, funeral.cam.wide.look, 4);
  await game.say("", "陽菜は何も言わない。");
  await game.say("", "誠司も、何も言わない。");
  await game.wait(1200);

  await game.fade("black", 2.5);
  game.hideDialogue();
  detachRain();
  game.disposeScene(funeral.scene);
  game.audio.fade("rain", 0.18, 3);
  game.audio.fade("drone", 0.18, 3);

  // ============================================================
  // 2. 帰宅（リビング）
  // ============================================================
  const house = buildHouse();
  const { refs, cam } = house;
  game.setScene(house.scene);
  game.placeCamera(cam.entrance.pos, cam.entrance.look);
  await upgradeHouse(assets, house.scene, refs, game, { withHina: true }); // 存命の陽菜を配置
  await game.wait(800);
  await game.fade("clear", 2.5);
  game.audio.start("rain", 0.12, 4); // 窓の外の雨（弱く）

  await game.say("", "玄関を開けると、家の中は静かだった。");
  await game.camTo(cam.living.pos, cam.living.look, 4);
  await game.say("", "リビングには、小さな祭壇。母の写真。花。線香の匂い。");

  // カーディガン
  await game.camTo(cam.cardigan.pos, cam.cardigan.look, 3);
  await game.say("", "ソファには、母がよく使っていたカーディガン。");
  await game.say("", "誠司は手を伸ばす。……でも、触れられない。");
  game.audio.note(330, 0.16);
  await game.wait(1200);
  await game.say("", "陽菜が横を通る。何も言わない。");
  await game.wait(600);

  // ============================================================
  // 3. 食卓
  // ============================================================
  await game.fade("black", 1.8);
  game.hideDialogue();
  game.placeCamera(cam.table.pos, cam.table.look);
  game.audio.startClock(0.1);
  await game.fade("clear", 2);

  await game.say("", "食卓には、弁当が二つ。誰も食べない。");
  await game.say("", "時計の音だけが、聞こえている。");
  await game.say("陽菜", "学校、明日から行く。");
  await game.say("誠司", "休んでもいい。");
  await game.say("陽菜", "行く。");
  await game.say("誠司", "……分かった。");
  await game.wait(800);
  game.audio.stopClock();

  // ============================================================
  // 4. 数日間の生活（プレイヤー操作）
  // ============================================================
  await game.fade("black", 1.8);
  game.hideDialogue();
  game.placeCamera(cam.overview.pos, cam.overview.look);
  await game.fade("clear", 2);
  await game.say("", "それから、数日が過ぎた。やることは、小さい。");
  game.hideDialogue();

  await dailyLife(game, refs, cam);

  // ============================================================
  // 5. 5日目・夜（台所）
  // ============================================================
  await game.fade("black", 1.8);
  game.setObjective(null);
  game.placeCamera(cam.kitchen.pos, cam.kitchen.look);
  game.audio.start("drone", 0.16, 4);
  await game.fade("clear", 2);

  await game.say("", "五日目の夜。誠司は味噌汁を作っていた。");
  await game.say("誠司", "母さんの味って、難しいな。");
  await game.say("", "陽菜は返事をしない。");
  await game.wait(500);
  await game.say("誠司", "今度の日曜、どこか行くか。");
  await game.say("", "……沈黙。");
  await game.say("誠司", "海でも、映画でも、買い物でも。");
  await game.say("", "陽菜は下を向く。");
  await game.say("陽菜", "……別に。");
  await game.say("誠司", "そっか。");
  await game.wait(600);
  await game.say("", "誠司が鍋に向き直る。その背中に、陽菜が小さく言う。");
  await game.say("陽菜", "……考えとく。");
  game.audio.note(392, 0.16);
  await game.say("", "誠司の手が止まる。");
  await game.say("誠司", "うん。");
  await game.wait(800);

  // ============================================================
  // 6. 7日目・夕方（洗濯物 → 階段 → ドア）
  // ============================================================
  await game.fade("black", 1.8);
  game.hideDialogue();
  game.audio.fade("drone", 0.1, 3);
  game.placeCamera(cam.washer.pos, cam.washer.look);
  await game.fade("clear", 2);
  await game.say("", "七日目の夕方。誠司は洗濯物を畳んでいた。");
  await game.say("", "陽菜の制服。靴下。ハンカチ。カーディガン。");
  await game.say("", "誠司はそれを持って、階段を上がる。");

  // 階段を上がる
  await game.fade("black", 1.4);
  game.placeCamera(cam.doorFront.pos, cam.doorFront.look);
  await game.fade("clear", 1.6);
  await game.say("", "陽菜の部屋の前。ノックする。");
  await game.say("誠司", "陽菜。");
  await game.say("", "返事はない。");
  await game.say("誠司", "洗濯物、置いとくぞ。");
  await game.wait(500);

  // ドアを開ける（画面は廊下のまま＝中は見せない）
  await game.camTo(cam.hallway.pos, cam.hallway.look, 2.5);
  openDoor(game, refs.door);
  game.audio.blip(220, 0.06, "sine");
  await game.wait(1400);

  // 洗濯物が床に落ちる
  dropLaundry(game, refs);
  game.audio.blip(140, 0.1, "sine");
  await game.wait(400);
  game.audio.stopAll(2.5); // 無音へ
  await game.say("", "誠司の動きが、止まる。");
  await game.wait(1500);
  await game.say("誠司", "……陽菜？");
  await game.wait(1600);

  // 暗転
  await game.fade("black", 3);
  game.hideDialogue();
  game.disposeScene(house.scene);

  // ============================================================
  // 7. 白文字 → タイトル
  // ============================================================
  await game.wait(1500);
  await game.fadeWhite("white", 0.1); // 黒のまま（fade要素は黒）→ キャプションは黒地に白
  game.dom.fade.style.background = "#000";
  game.dom.fade.style.opacity = "1";
  await game.caption("日曜日は、来なかった。", { hold: 4500 });
  await game.wait(1000);

  return { done: true };
}

// ---- 数日間の生活：4つの小さな家事 ----
async function dailyLife(game, refs, cam) {
  const EYE = [4, 1.6, 1.0];
  const FOCUS = [3.4, 1.0, -6.4];
  game.setObjective("数日間を過ごす（画面ドラッグで見回す）");
  await game.camTo(EYE, FOCUS, 2.5);
  game.enableLook(EYE, FOCUS);
  const tasks = [
    {
      obj: refs.stove,
      hint: "朝食を作る",
      view: cam.kitchen,
      lines: [
        ["", "トーストを焼く。少し、焦げた。"],
        ["誠司", "……まあ、食えるか。"],
      ],
    },
    {
      obj: refs.washer,
      hint: "洗濯する",
      view: cam.washer,
      lines: [
        ["", "洗濯機を回す。タオルの畳み方が、いまだに分からない。"],
      ],
    },
    {
      obj: refs.trash,
      hint: "ゴミを出す",
      view: cam.entrance,
      lines: [["", "ゴミを出す。燃えるゴミの日を、メモで覚えた。"]],
    },
    {
      obj: refs.hina,
      hint: "陽菜に声をかける",
      view: cam.table,
      lines: [
        ["誠司", "……飯、できてるぞ。"],
        ["", "陽菜は小さくうなずくだけ。会話は、ほとんどない。"],
      ],
    },
  ];

  let remaining = tasks.length;

  await new Promise((resolveAll) => {
    const registerRemaining = () => {
      game.clearInteractables();
      tasks.forEach((task) => {
        if (task._done) return;
        game.addInteractable(
          task.obj,
          task.hint,
          async () => {
            task._done = true;
            remaining--;
            // インタラクト中はクリック・見回しを無効化
            game.clearInteractables();
            game.disableLook();
            await game.camTo(task.view.pos, task.view.look, 2);
            for (const [sp, tx] of task.lines) await game.say(sp, tx);
            game.hideDialogue();
            if (remaining <= 0) {
              resolveAll();
            } else {
              game.setObjective(`数日間を過ごす（あと ${remaining}・ドラッグで見回す）`);
              await game.camTo(EYE, FOCUS, 2);
              game.enableLook(EYE, FOCUS);
              registerRemaining();
            }
          },
          { once: true }
        );
      });
    };
    registerRemaining();
  });

  game.disableLook();
  game.clearInteractables();
}

function openDoor(game, doorGroup) {
  const pivot = doorGroup.userData.pivot;
  let t = 0;
  const fn = (dt) => {
    t += dt;
    pivot.rotation.y = THREE.MathUtils.lerp(
      pivot.rotation.y,
      -Math.PI / 2.4,
      Math.min(dt * 2, 1)
    );
    if (t > 1.5) game.removeUpdater(fn);
  };
  game.addUpdater(fn);
}

function dropLaundry(game, refs) {
  const pile = laundry();
  pile.position.set(8.6, 2.6, -5.2); // 廊下の床あたりに落ちる
  game.scene.add(pile);
  let v = 0;
  const fn = (dt) => {
    v += 9.8 * dt;
    pile.position.y -= v * dt;
    if (pile.position.y <= 1.6) {
      pile.position.y = 1.6;
      game.removeUpdater(fn);
    }
  };
  game.addUpdater(fn);
}
