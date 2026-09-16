import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = process.env.REMOTION_PUBLIC_DIR ?? "/tmp/vid-public";
const frames = (process.argv[2] ?? "60").split(",").map(Number);
const outDir = process.argv[3] ?? "/tmp/stills";

const bundled = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), publicDir });
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});
const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });
for (const f of frames) {
  await renderStill({
    composition,
    serveUrl: bundled,
    frame: f,
    output: path.join(outDir, `f${f}.png`),
    puppeteerInstance: browser,
    overwrite: true,
  });
  console.log("still", f);
}
await browser.close({ silent: false });
