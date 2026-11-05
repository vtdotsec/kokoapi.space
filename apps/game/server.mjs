import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "dist");
const dataDir = process.env.DATA_DIR || path.join(here, "data");
const password = process.env.GAME_ACCESS_PASSWORD;
const port = Number(process.env.PORT || 8789);

if (!password || password.length < 24) {
  throw new Error("GAME_ACCESS_PASSWORD must be set to a value of at least 24 characters.");
}
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "santa-bruma.sqlite"), { timeout: 3000 });
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  CREATE TABLE IF NOT EXISTS save_slot (
    slot INTEGER PRIMARY KEY CHECK (slot = 1),
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;
`);
const readSave = db.prepare("SELECT payload, updated_at FROM save_slot WHERE slot = 1");
const writeSave = db.prepare(`
  INSERT INTO save_slot (slot, payload, updated_at) VALUES (1, ?, ?)
  ON CONFLICT(slot) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
`);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

function timingSafeTextEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function authorized(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  let decoded;
  try { decoded = Buffer.from(header.slice(6), "base64").toString("utf8"); }
  catch { return false; }
  const split = decoded.indexOf(":");
  return split >= 0 && timingSafeTextEqual(decoded.slice(0, split), "player") && timingSafeTextEqual(decoded.slice(split + 1), password);
}

function sendJson(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  res.end(body);
}

function isSaveShape(value) {
  if (!value || value.version !== 1 || !value.player || !value.inventory || !Array.isArray(value.zombies)) return false;
  const p = value.player;
  if (![p.x, p.z, p.rotation, p.health, p.ammo, p.reserve].every(Number.isFinite)) return false;
  if (p.x < 0.4 || p.x > 23.6 || p.z < -3.5 || p.z > 3.5) return false;
  if (p.health < 0 || p.health > 100 || p.ammo < 0 || p.ammo > 6 || p.reserve < 0 || p.reserve > 24) return false;
  if (typeof value.inventory.fuse !== "boolean" || typeof value.inventory.keycard !== "boolean") return false;
  if (value.zombies.length !== 3 || !value.zombies.every((z) => Number.isFinite(z.x) && Number.isFinite(z.z) && Number.isFinite(z.health) && z.health >= 0 && z.health <= 2)) return false;
  return Number.isFinite(value.elapsed) && value.elapsed >= 0 && value.elapsed <= 86400;
}

async function readJsonBody(req, maxBytes = 65536) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("body-too-large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const headers = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
};

const server = http.createServer(async (req, res) => {
  const baseHeaders = { ...headers };
  if (req.url === "/health" && req.method === "GET") {
    return sendJson(res, 200, { ok: true });
  }
  if (!authorized(req)) {
    res.writeHead(401, {
      ...baseHeaders,
      "WWW-Authenticate": 'Basic realm="Santa Bruma - Plantao Zero", charset="UTF-8"',
      "Cache-Control": "no-store",
      "Content-Length": "0",
    });
    return res.end();
  }

  let url;
  try { url = new URL(req.url, "http://game.local"); }
  catch { return sendJson(res, 400, { error: "bad-request" }); }

  if (url.pathname === "/api/save" && req.method === "GET") {
    const row = readSave.get();
    return sendJson(res, 200, row ? { save: JSON.parse(row.payload), updatedAt: row.updated_at } : { save: null, updatedAt: null });
  }
  if (url.pathname === "/api/save" && req.method === "POST") {
    if (!(req.headers["content-type"] || "").startsWith("application/json")) return sendJson(res, 415, { error: "json-required" });
    let save;
    try { save = await readJsonBody(req); }
    catch (error) { return sendJson(res, error.message === "body-too-large" ? 413 : 400, { error: "invalid-save" }); }
    if (!isSaveShape(save)) return sendJson(res, 422, { error: "invalid-save-shape" });
    const updatedAt = new Date().toISOString();
    writeSave.run(JSON.stringify(save), updatedAt);
    return sendJson(res, 200, { ok: true, updatedAt });
  }
  if (url.pathname.startsWith("/api/")) return sendJson(res, 404, { error: "not-found" });
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "method-not-allowed" });

  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return sendJson(res, 400, { error: "bad-path" }); }
  if (pathname.includes("\\") || pathname.includes("\0")) return sendJson(res, 400, { error: "bad-path" });
  let filePath = path.resolve(dist, `.${pathname}`);
  if (filePath !== dist && !filePath.startsWith(dist + path.sep)) return sendJson(res, 403, { error: "forbidden" });
  try {
    if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) throw new Error("not-file");
    const ext = path.extname(filePath).toLowerCase();
    const immutable = pathname.startsWith("/assets/");
    res.writeHead(200, {
      ...baseHeaders,
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-store",
    });
    if (req.method === "HEAD") return res.end();
    return fs.createReadStream(filePath).pipe(res);
  } catch {
    return sendJson(res, 404, { error: "not-found" });
  }
});

server.listen(port, "0.0.0.0", () => process.stdout.write(`Santa Bruma listening on ${port}\n`));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
