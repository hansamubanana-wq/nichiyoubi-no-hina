import "./style.css";
import * as THREE from "three";
import { Game } from "./core/Game.js";
import { AssetManager } from "./core/assets.js";
import { runPrologue } from "./story/prologue.js";
import { runChapters } from "./story/chapters.js";

// 大きなタイトルカード演出（黒地に題名）
async function titleCard(game, text, hold = 4200) {
  const p = game.dom.caption;
  p.style.fontSize = "clamp(2.4rem, 9vw, 4.6rem)";
  p.style.letterSpacing = "0.3em";
  await game.caption(text, { hold });
  p.style.fontSize = "";
  p.style.letterSpacing = "";
}

const game = new Game();
// 3Dアセット（Poly Haven / CC0）を起動と同時にプリロード
const assets = new AssetManager(game.renderer);

// 開発時のみ：デバッグ用にゲームインスタンスを公開
if (import.meta.env.DEV) {
  window.__game = game;
  window.__assets = assets;
  window.__THREE = THREE;
}

const titleScreen = document.getElementById("title-screen");
const startBtn = document.getElementById("start-btn");
const loading = document.getElementById("loading");

// 起動時：ローディングを隠してタイトルを見せる
window.addEventListener("load", () => {
  setTimeout(() => loading.classList.add("gone"), 400);
});

let started = false;
startBtn.addEventListener("click", async () => {
  if (started) return;
  started = true;

  // ユーザー操作後に音声を初期化（自動再生制限の回避）
  game.audio.init();

  titleScreen.classList.add("gone");
  await game.wait(1400);

  // プロローグ「届かなかった日曜日」
  await runPrologue(game, assets);

  // タイトルカード（題名の提示）
  await game.wait(800);
  await titleCard(game, "日曜日の陽菜");
  await game.wait(600);

  // 本編 CHAPTER 1 〜 FINAL ＋ エンディング
  const result = await runChapters(game, assets);

  if (result && result.done) {
    // クリア後：背景は雨の家から「海辺の日曜日」へ。「また、日曜日に。」
    await game.wait(1200);
    game.dom.caption.classList.remove("show");
    await game.wait(1200);
    const btn = document.getElementById("start-btn");
    btn.textContent = "もう一度";
    btn.onclick = () => location.reload();
    titleScreen.classList.remove("gone");
    titleScreen.classList.add("ending");
    game.dom.fade.style.opacity = "0"; // 背景の海辺タイトルを見せる
  }
});
