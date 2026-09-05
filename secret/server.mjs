// kokoapi.space — ephemeral sharing backend ("/secret/").
//
// Plain Node HTTP server, zero dependencies. Stores only ciphertext + IV on disk
// under DATA_DIR. The decryption key lives in the URL fragment and never reaches
// this process.
//
// Routes (all under /secret/):
//   GET  /secret/                  -> composer/reader page
//   GET  /secret/app.css|app.js    -> static assets
//   POST /secret/api/blob          -> store an encrypted payload
//   GET  /secret/api/blob/<id>/meta    -> metadata (non-destructive)
//   GET  /secret/api/blob/<id>/cipher  -> ciphertext; deletes the blob on burn-after-read
//   GET  /secret/api/health        -> liveness
//
// Storage: one meta file (<id>.json) and one raw ciphertext file (<id>.bin)
// per blob. A timer sweeps expired blobs; read-once blobs are deleted at read time.

import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

const DATA_DIR = process.env.DATA_DIR || "/data";
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";

// A 10 MB plaintext is what the UI promises; base64 upload adds ~33% on top.
const MAX_PLAIN_BYTES = 10 * 1024 * 1024;
const MAX_CIPHER_BYTES = MAX_PLAIN_BYTES + 64; // GCM tag + slack
const MAX_BODY_BYTES = 16 * 1024 * 1024;

const LIFETIME_MS = {
  read: 7 * 24 * 3600 * 1000, // unread burn blobs are still purged after 7 days
  "1h": 3600 * 1000,
  "24h": 24 * 3600 * 1000,
  "7d": 7 * 24 * 3600 * 1000,
};

const ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
const MIME_RE = /^[\w.+-]+\/[\w.+-]+$/;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const json = (res, code, body) => {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(data);
};

const fail = (res, code, error) => json(res, code, { ok: false, error });

const now = () => Date.now();

function clientIp(req) {
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf) return cf;
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function makeRateLimiter(max, windowMs) {
  const hits = new Map();
  return function allow(key) {
    const t = now();
    let arr = hits.get(key);
    if (!arr) {
      arr = [];
      hits.set(key, arr);
    }
    // Drop entries older than the window; also shed maps that fell idle.
    while (arr.length && arr[0] <= t - windowMs) arr.shift();
    if (arr.length >= max) return false;
    arr.push(t);
    if (hits.size > 10_000) {
      for (const [k, v] of hits) {
        if (v.length === 0 || v[v.length - 1] <= t - windowMs) hits.delete(k);
      }
    }
    return true;
  };
}

const allowCreate = makeRateLimiter(15, 60_000); // 15 creates/minute/IP
const allowRead = makeRateLimiter(120, 60_000);

/* ------------------------------------------------------------------ */
/* Blob store (flat files under DATA_DIR)                              */
/* ------------------------------------------------------------------ */

function metaPath(id) {
  return path.join(DATA_DIR, id + ".json");
}
function binPath(id) {
  return path.join(DATA_DIR, id + ".bin");
}

const newId = () => crypto.randomBytes(16).toString("base64url");

async function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const done = (err, value) => {
      if (settled) return;
      settled = true;
      req.removeListener("data", onData);
      req.removeListener("end", onEnd);
      req.removeListener("error", onError);
      req.removeListener("aborted", onAborted);
      if (err) reject(err);
      else resolve(value);
    };
    const onData = (chunk) => {
      size += chunk.length;
      if (size > limit) {
        const e = new Error("Payload too large");
        e.statusCode = 413;
        done(e);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => done(null, Buffer.concat(chunks));
    const onError = (e) => done(e);
    const onAborted = () => {
      const e = new Error("Request aborted");
      e.statusCode = 400;
      done(e);
    };
    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);
    req.on("aborted", onAborted);
  });
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

function staticFile(res, rel) {
  const file = path.join(PUBLIC_DIR, rel);
  // Only known files may be served.
  if (rel !== "index.html" && rel !== "app.js" && rel !== "app.css") {
    fail(res, 404, "Not found");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      fail(res, 404, "Not found");
      return;
    }
    const type =
      rel.endsWith(".css") ? "text/css; charset=utf-8"
      : rel.endsWith(".js") ? "text/javascript; charset=utf-8"
      : "text/html; charset=utf-8";
    res.writeHead(200, {
      "content-type": type,
      "cache-control": rel === "index.html" ? "no-cache" : "public, max-age=300",
      "x-content-type-options": "nosniff",
    });
    res.end(data);
  });
}

async function handleCreate(req, res) {
  if (!allowCreate(clientIp(req))) return fail(res, 429, "Too many requests, slow down");

  const raw = await readBody(req, MAX_BODY_BYTES).catch((e) => {
    fail(res, e.statusCode || 400, e.message || "Bad request");
    return null;
  });
  if (raw === null) return;

  let body;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return fail(res, 400, "Invalid JSON body");
  }
  if (body.v !== 1) return fail(res, 400, "Unsupported payload version");
  if (body.kind !== "text" && body.kind !== "file") return fail(res, 400, "Invalid kind");
  if (!LIFETIME_MS[body.expires]) return fail(res, 400, "Invalid expiry option");

  const iv = Buffer.from(String(body.iv || ""), "base64url");
  if (iv.length !== 12) return fail(res, 400, "Invalid IV");

  let cipher;
  try {
    cipher = Buffer.from(String(body.cipher || ""), "base64url");
  } catch {
    return fail(res, 400, "Invalid ciphertext encoding");
  }
  if (cipher.length === 0 || cipher.length > MAX_CIPHER_BYTES) {
    return fail(res, 413, "Ciphertext exceeds the size limit");
  }
  const size = Number(body.size);
  if (!Number.isInteger(size) || size <= 0 || size > MAX_PLAIN_BYTES) {
    return fail(res, 400, "Invalid size");
  }

  const meta = {
    v: 1,
    kind: body.kind,
    createdAt: now(),
    expiresAt: now() + LIFETIME_MS[body.expires],
    burn: body.expires === "read",
    iv: iv.toString("base64url"),
    size,
  };
  if (body.kind === "file") {
    // Names are used only client-side for the download; strip control chars.
    const name = String(body.name || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
    const type = String(body.type || "application/octet-stream");
    if (!name || name.length > 200) return fail(res, 400, "Invalid file name");
    if (!MIME_RE.test(type) || type.length > 120) {
      return fail(res, 400, "Invalid file type");
    }
    meta.name = name;
    meta.type = type;
  }

  const id = newId();
  try {
    await fsp.writeFile(binPath(id), cipher, { flag: "wx" });
    await fsp.writeFile(metaPath(id), JSON.stringify(meta), { flag: "wx" });
  } catch {
    // Roll back a partial write (e.g. meta failed after bin).
    await fsp.rm(binPath(id), { force: true });
    await fsp.rm(metaPath(id), { force: true });
    return fail(res, 500, "Storage failure");
  }
  json(res, 201, { ok: true, id, path: `/secret/${id}` });
}

async function loadMeta(id) {
  try {
    const raw = await fsp.readFile(metaPath(id), "utf8");
    const meta = JSON.parse(raw);
    if (meta.v !== 1 || !meta.iv || !meta.size) return null;
    return meta;
  } catch {
    return null;
  }
}

async function handleMeta(req, res, id) {
  if (!ID_RE.test(id)) return fail(res, 404, "Not found");
  const meta = await loadMeta(id);
  if (!meta) return fail(res, 404, "Not found");
  const out = { ok: true, v: meta.v, kind: meta.kind, size: meta.size, iv: meta.iv, burn: meta.burn };
  if (meta.kind === "file") {
    out.name = meta.name;
    out.type = meta.type;
  }
  json(res, 200, out);
}

// Burn-after-read blobs are deleted here, before the bytes are sent. A per-id
// in-flight guard keeps two simultaneous reads from both succeeding.
const inflightBurn = new Set();

async function handleCipher(req, res, id) {
  if (!ID_RE.test(id)) return fail(res, 404, "Not found");
  const meta = await loadMeta(id);
  if (!meta) return fail(res, 404, "Not found");
  if (meta.expiresAt && meta.expiresAt <= now()) {
    await fsp.rm(binPath(id), { force: true });
    await fsp.rm(metaPath(id), { force: true });
    return fail(res, 404, "Not found");
  }

  let data;
  try {
    data = await fsp.readFile(binPath(id));
  } catch {
    // Cipher file missing but meta present: clean the orphan meta.
    await fsp.rm(metaPath(id), { force: true });
    return fail(res, 404, "Not found");
  }

  if (meta.burn) {
    if (inflightBurn.has(id)) return fail(res, 404, "Not found");
    inflightBurn.add(id);
    try {
      await fsp.rm(metaPath(id), { force: true });
      await fsp.rm(binPath(id), { force: true });
    } finally {
      inflightBurn.delete(id);
    }
  }

  res.writeHead(200, {
    "content-type": "application/octet-stream",
    "content-length": data.length,
    "cache-control": "no-store",
  });
  res.end(data);
}

async function sweep() {
  let entries;
  try {
    entries = await fsp.readdir(DATA_DIR);
  } catch {
    return;
  }
  const t = now();
  const metaIds = new Set();
  const binIds = new Set();
  for (const name of entries) {
    if (name.endsWith(".json")) {
      const id = name.slice(0, -5);
      metaIds.add(id);
      try {
        const meta = JSON.parse(await fsp.readFile(metaPath(id), "utf8"));
        if (meta.expiresAt && meta.expiresAt <= t) {
          await fsp.rm(metaPath(id), { force: true });
          await fsp.rm(binPath(id), { force: true });
        }
      } catch {
        await fsp.rm(metaPath(id), { force: true });
        await fsp.rm(binPath(id), { force: true });
      }
    } else if (name.endsWith(".bin")) {
      binIds.add(name.slice(0, -4));
    }
  }
  // Remove orphaned .bin files whose meta is gone or unreadable.
  for (const id of binIds) {
    if (!metaIds.has(id)) {
      await fsp.rm(binPath(id), { force: true });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

export function createApp() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const p = url.pathname;

    try {
      // Health
      if (req.method === "GET" && p === "/secret/api/health") {
        return json(res, 200, { ok: true });
      }

      // Static UI
      if (req.method === "GET" && (p === "/secret/" || p === "/secret")) {
        return staticFile(res, "index.html");
      }
      if (req.method === "GET" && (p === "/secret/app.js" || p === "/secret/app.css")) {
        return staticFile(res, p.slice("/secret/".length));
      }

      // API
      if (p === "/secret/api/blob" && req.method === "POST") {
        return handleCreate(req, res);
      }
      const m = p.match(/^\/secret\/api\/blob\/([^/]+)\/(meta|cipher)$/);
      if (m && req.method === "GET") {
        if (!allowRead(clientIp(req))) return fail(res, 429, "Too many requests, slow down");
        return m[2] === "meta" ? handleMeta(req, res, m[1]) : handleCipher(req, res, m[1]);
      }

      // Unknown API paths get a proper 404, not the SPA fallback.
      if (p.startsWith("/secret/api/")) {
        return fail(res, 404, "Not found");
      }

      // Anything else under /secret is a client-side route (composer/reader).
      if (req.method === "GET" && p.startsWith("/secret/")) {
        return staticFile(res, "index.html");
      }
      if (p.startsWith("/secret/")) {
        return fail(res, 405, "Method not allowed");
      }
      return fail(res, 404, "Not found");
    } catch (e) {
      // Never leak stack traces to clients.
      if (!res.headersSent) {
        fail(res, e.statusCode || 500, e.statusCode ? e.message : "Internal error");
      } else {
        res.destroy();
      }
    }
  });

  // Hourly expiry sweep; also fine to let the process stay lean.
  const timer = setInterval(() => sweep().catch(() => {}), 10 * 60 * 1000);
  timer.unref();

  return { server, sweep };
}

// Start directly when executed (not when imported by the test suite).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server } = createApp();
  server.listen(PORT, HOST, () => {
    console.log(`kokoapi secret listening on http://${HOST}:${PORT} (data: ${DATA_DIR})`);
  });
}
