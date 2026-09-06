// E2E helper: serves the built static site from ./dist like the production nginx
// (try_files $uri $uri.html $uri/index.html) and proxies /secret/ to the Node
// service on :8787. Used by Playwright only.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const PORT = Number(process.env.PORT || 4321);
const SECRET = { host: "127.0.0.1", port: 8787 };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".webmanifest": "application/manifest+json",
};

function sendFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(data);
  });
}

function resolveStatic(pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!rel) rel = "index.html";
  const base = path.join(DIST, rel);
  const tries = [];
  try {
    const st = fs.statSync(base);
    if (st.isDirectory()) tries.push(path.join(base, "index.html"));
    else tries.push(base);
  } catch {
    tries.push(base, base + ".html", path.join(base, "index.html"));
  }
  for (const t of tries) {
    try {
      if (fs.statSync(t).isFile()) return t;
    } catch {}
  }
  return null;
}

function proxySecret(req, res) {
  const proxy = http.request(
    {
      host: SECRET.host,
      port: SECRET.port,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: `127.0.0.1:${SECRET.port}` },
    },
    (pRes) => {
      res.writeHead(pRes.statusCode || 502, pRes.headers);
      pRes.pipe(res);
    },
  );
  proxy.on("error", () => {
    res.writeHead(502);
    res.end("Secret service unavailable");
  });
  req.pipe(proxy);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/secret/" || url.pathname.startsWith("/secret/")) {
      return proxySecret(req, res);
    }
    const file = resolveStatic(url.pathname);
    if (file) return sendFile(res, file);
    // Deep tool URLs (/image/crop, /pdf/split, ...) are served by the service
    // toolbox page and activate the tool client-side (History API routing).
    const first = url.pathname.split("/").filter(Boolean)[0];
    if (first) {
      const fallback = resolveStatic("/" + first + "/");
      if (fallback) return sendFile(res, fallback);
    }
    res.writeHead(404);
    res.end("Not found");
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`e2e static server on http://127.0.0.1:${PORT} (dist: ${DIST})`);
  });
