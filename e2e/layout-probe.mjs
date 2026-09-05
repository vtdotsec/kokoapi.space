import { chromium } from "@playwright/test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "..", "dist");
const mime = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json",
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  let f = path.join(dist, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404); res.end("nf"); return; }
  res.setHeader("content-type", mime[path.extname(f)] || "application/octet-stream");
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(4324, r));
const browser = await chromium.launch();

for (const w of [1280, 1024, 940, 900, 870, 860, 820, 760, 700, 500, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto("http://127.0.0.1:4324/convert/");
  await page.waitForTimeout(120);
  const info = await page.evaluate(() => {
    const hits = [];
    document.querySelectorAll("body *").forEach((el) => {
      const txt = (el.textContent || "").trim();
      if (!/Markdown to HTML|Markdown \/ HTML to PDF|JSON.*CSV|Create ZIP|Extract archive/.test(txt)) return;
      if (el.children.length > 4) return; // only leaves/containers
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      hits.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "").toString().slice(0, 60),
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        disp: cs.display, dir: cs.flexDirection, over: cs.overflowX,
        txt: txt.slice(0, 40),
      });
    });
    return { navVisible: !!document.querySelector(".cv-side-nav") && getComputedStyle(document.querySelector(".cv-side-nav")).display !== "none",
             selectVisible: !!document.querySelector(".side-select") && getComputedStyle(document.querySelector(".side-select")).display !== "none",
             hits: hits.slice(0, 12) };
  });
  console.log("=== width", w, "nav?", info.navVisible, "select?", info.selectVisible);
  for (const h of info.hits) console.log("   ", h.tag, "[" + h.cls + "]", `x=${h.x} y=${h.y} w=${h.w} h=${h.h}`, h.disp, h.dir || "", "|", h.txt);
  await page.close();
}
await browser.close();
server.close();
console.log("probe done");
