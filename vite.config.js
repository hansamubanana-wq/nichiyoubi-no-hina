import { defineConfig } from "vite";

// PORT 環境変数があればそれを使う（プレビュー連携用）。
export default defineConfig({
  base: "./",
  // three の二重読み込みを防ぐ（examples/jsm のローダーと本体を同一インスタンスに）
  resolve: { dedupe: ["three"] },
  optimizeDeps: { include: ["three"] },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
  },
});
