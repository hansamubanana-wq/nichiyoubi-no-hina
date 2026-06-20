// 依存なしで PNG アイコンを生成する。
// 意匠：暗い空に金色の太陽（日曜）と、淡い水平線（海）。
import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size * 0.5;
  const sunY = size * 0.42;
  const sunR = size * 0.18;
  const horizon = size * 0.62;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // 背景グラデ（上：紺 → 下：暗）
      const ty = y / size;
      let r = lerp(18, 10, ty),
        g = lerp(26, 14, ty),
        b = lerp(38, 20, ty);
      // 海（水平線より下を少し明るく）
      if (y > horizon) {
        const seaT = (y - horizon) / (size - horizon);
        r = lerp(20, 14, seaT) + 6;
        g = lerp(34, 22, seaT) + 8;
        b = lerp(50, 34, seaT) + 10;
      }
      // 太陽（金色のソフトな円）
      const d = Math.hypot(x - cx, y - sunY);
      if (d < sunR * 1.8) {
        const glow = Math.max(0, 1 - d / (sunR * 1.8));
        const core = d < sunR ? 1 : Math.max(0, 1 - (d - sunR) / (sunR * 0.8));
        const a = Math.min(1, core * 0.9 + glow * 0.45);
        r = lerp(r, 232, a);
        g = lerp(g, 196, a);
        b = lerp(b, 120, a);
      }
      // 水平線の光の帯
      if (Math.abs(y - horizon) < size * 0.012) {
        r = lerp(r, 220, 0.5);
        g = lerp(g, 200, 0.5);
        b = lerp(b, 150, 0.5);
      }
      px[i] = Math.round(r);
      px[i + 1] = Math.round(g);
      px[i + 2] = Math.round(b);
      px[i + 3] = 255;
    }
  }
  return png(size, size, px);
}

const outDir = new URL("../public/icons/", import.meta.url);
mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(new URL(`icon-${size}.png`, outDir), render(size));
  console.log(`icon-${size}.png written`);
}
