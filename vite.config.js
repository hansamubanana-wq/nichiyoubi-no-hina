import { defineConfig } from "vite";
import { resolve } from "path";

// PORT 環境変数があればそれを使う（プレビュー連携用）。
export default defineConfig({
  base: "./",
  // マルチページ：ゲーム本体（index.html）とマップエディタ（editor.html）
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        editor: resolve(__dirname, "editor.html"),
      },
    },
  },
  // three の二重読み込みを防ぐ（examples/jsm のローダーと本体を同一インスタンスに）
  resolve: { dedupe: ["three"] },
  optimizeDeps: { include: ["three"] },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
  },
});
