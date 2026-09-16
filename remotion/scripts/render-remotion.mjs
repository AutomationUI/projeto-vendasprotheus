import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = process.env.REMOTION_PUBLIC_DIR ?? "/tmp/vid-public";
const out = process.argv[2] ?? "/mnt/documents/vendas-protheus-demo.mp4";
const frames = process.argv[3] ?? null;

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  publicDir,
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  crf: 18,
  outputLocation: out,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 2,
  frameRange: frames ? frames.split("-").map(Number) : undefined,
  onProgress: ({ progress }) => {
    if (Math.round(progress * 100) % 10 === 0) process.stdout.write(`${Math.round(progress * 100)}% `);
  },
});

await browser.close({ silent: false });
console.log("\ndone", out);
