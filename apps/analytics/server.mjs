import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8788);
const DATA_DIR = process.env.DATA_DIR || "/data";
const MAX_BODY = 2048;
const METRIC_DAYS = 400;
const ALLOWED_HOSTS = new Set([
  "tools.kokoapi.space",
  "repasses.kokoapi.space",
]);

await mkdir(DATA_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, "analytics.sqlite"));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS pageviews (
    day TEXT NOT NULL,
    site TEXT NOT NULL,
    path TEXT NOT NULL,
    source TEXT NOT NULL,
    pageviews INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, site, path, source)
  );
`);

// Migrate the old opt-in schema to aggregate pageviews without browser counters.
const pageviewColumns = db.prepare("PRAGMA table_info(pageviews)").all().map((column) => column.name);
if (pageviewColumns.includes("visitors")) {
  db.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE pageviews_replacement (
      day TEXT NOT NULL,
      site TEXT NOT NULL,
      path TEXT NOT NULL,
      source TEXT NOT NULL,
      pageviews INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, site, path, source)
    );
    INSERT INTO pageviews_replacement(day, site, path, source, pageviews)
      SELECT day, site, path, source, pageviews FROM pageviews;
    DROP TABLE pageviews;
    ALTER TABLE pageviews_replacement RENAME TO pageviews;
    COMMIT;
  `);
}
db.exec(`
  CREATE INDEX IF NOT EXISTS pageviews_day_idx ON pageviews(day);
  DROP TABLE IF EXISTS daily_visitors;
  DROP TABLE IF EXISTS daily_site_visitors;
`);

const incrementPage = db.prepare(`
  INSERT INTO pageviews(day, site, path, source, pageviews)
  VALUES (?, ?, ?, ?, 1)
  ON CONFLICT(day, site, path, source) DO UPDATE SET
    pageviews = pageviews + 1
`);

async function loadAdminPassword() {
  const path = join(DATA_DIR, "dashboard-password");
  try {
    const existing = (await readFile(path, "utf8")).trim();
    if (existing.length >= 32) return existing;
  } catch {}
  const password = randomBytes(32).toString("base64url");
  await writeFile(path, `${password}\n`, { mode: 0o600, flag: "wx" }).catch(async (err) => {
    if (err.code !== "EEXIST") throw err;
  });
  return (await readFile(path, "utf8")).trim();
}

const adminPassword = await loadAdminPassword();

function send(res, status, body, type = "application/json; charset=utf-8", headers = {}) {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  res.end(body);
}

function json(res, status, value, headers = {}) {
  send(res, status, JSON.stringify(value), "application/json; charset=utf-8", headers);
}

function authorized(req) {
  const value = req.headers.authorization || "";
  if (!value.startsWith("Basic ")) return false;
  let decoded;
  try { decoded = Buffer.from(value.slice(6), "base64").toString("utf8"); } catch { return false; }
  const split = decoded.indexOf(":");
  if (split < 0 || decoded.slice(0, split) !== "admin") return false;
  const supplied = Buffer.from(decoded.slice(split + 1));
  const expected = Buffer.from(adminPassword);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function normalizedPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 180) return null;
  const path = value.split(/[?#]/, 1)[0].replace(/\/{2,}/g, "/");
  // Secret links contain unguessable IDs. Never store or count reader URLs.
  if (/^\/secret\/[^/]+\/?$/i.test(path) && path !== "/secret/") return null;
  if (!/^\/(?:$|[a-z0-9][a-z0-9/_-]*)$/i.test(path)) return null;
  return path === "/" ? "/" : path.replace(/\/$/, "");
}

const searchHosts = ["google.", "bing.com", "search.yahoo.", "duckduckgo.com", "search.brave.com", "ecosia.org", "startpage.com", "yandex.", "baidu.com", "qwant.com", "search.naver.com", "seznam.cz"];
const socialHosts = ["facebook.com", "instagram.com", "linkedin.com", "tiktok.com", "reddit.com", "x.com", "twitter.com", "youtube.com", "t.co"];

function classifySource(referrer, campaign, siteHost) {
  if (campaign) return "campaign";
  if (!referrer) return "direct";
  let hostname;
  try { hostname = new URL(referrer).hostname.toLowerCase(); } catch { return "unknown"; }
  if (hostname === siteHost || hostname.endsWith(`.${siteHost}`)) return "internal";
  if (searchHosts.some((item) => hostname === item || hostname.includes(item))) return "organic-search";
  if (socialHosts.some((item) => hostname === item || hostname.endsWith(`.${item}`))) return "social";
  return "referral";
}

function cleanup() {
  const today = new Date();
  const metricsBefore = new Date(today.getTime() - METRIC_DAYS * 86400000).toISOString().slice(0, 10);
  db.prepare("DELETE FROM pageviews WHERE day < ?").run(metricsBefore);
  db.exec("PRAGMA wal_checkpoint(PASSIVE)");
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("payload-too-large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleCollect(req, res) {
  const origin = req.headers.origin;
  let siteHost;
  try { siteHost = new URL(origin).hostname.toLowerCase(); } catch { return json(res, 403, { ok: false }); }
  if (!ALLOWED_HOSTS.has(siteHost) || new URL(origin).origin !== `https://${siteHost}`) {
    return json(res, 403, { ok: false });
  }
  if (req.headers["content-type"]?.split(";")[0] !== "application/json") {
    return json(res, 415, { ok: false });
  }
  let body;
  try { body = await readBody(req); } catch (err) {
    return json(res, err.message === "payload-too-large" ? 413 : 400, { ok: false });
  }
  const path = normalizedPath(body.path);
  if (!path) return json(res, 400, { ok: false });
  let referrer = "";
  if (typeof body.referrer === "string" && body.referrer.length <= 300) {
    try { referrer = new URL(body.referrer).origin; } catch {}
  }
  const day = new Date().toISOString().slice(0, 10);
  const source = classifySource(referrer, body.campaign === true, siteHost);
  // Count aggregate pageviews only: no browser ID, fingerprint or unique-person claim.
  incrementPage.run(day, siteHost, path, source);
  return json(res, 202, { ok: true });
}

function handleStats(res, days) {
  const rows = db.prepare(`
    SELECT day, site, path, source, pageviews
    FROM pageviews WHERE day >= date('now', ?)
    ORDER BY day DESC, site, pageviews DESC
  `).all(`-${days} days`);
  const pageTotals = db.prepare(`
    SELECT site, SUM(pageviews) AS pageviews
    FROM pageviews WHERE day >= date('now', ?)
    GROUP BY site
  `).all(`-${days} days`);
  const totals = pageTotals.sort((a, b) => a.site.localeCompare(b.site));
  return json(res, 200, { days, totals, rows });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/analytics/health") return json(res, 200, { ok: true });
    if (req.method === "GET" && url.pathname === "/analytics/client.js") {
      return send(res, 200, await readFile(new URL("./client.js", import.meta.url)), "text/javascript; charset=utf-8", { "cache-control": "public, max-age=300" });
    }
    if (req.method === "GET" && url.pathname === "/analytics/client.css") {
      return send(res, 200, await readFile(new URL("./client.css", import.meta.url)), "text/css; charset=utf-8", { "cache-control": "public, max-age=300" });
    }
    if (req.method === "GET" && url.pathname === "/analytics/dashboard.css") {
      return send(res, 200, await readFile(new URL("./dashboard.css", import.meta.url)), "text/css; charset=utf-8", { "cache-control": "no-store" });
    }
    if (req.method === "GET" && url.pathname === "/analytics/dashboard.js") {
      return send(res, 200, await readFile(new URL("./dashboard.js", import.meta.url)), "text/javascript; charset=utf-8", { "cache-control": "no-store" });
    }
    if (url.pathname === "/analytics/admin" || url.pathname === "/analytics/admin/") {
      if (!authorized(req)) return send(res, 401, "Sign in to view analytics.", "text/plain; charset=utf-8", { "www-authenticate": 'Basic realm="kokoapi analytics", charset="UTF-8"' });
      return send(res, 200, await readFile(new URL("./dashboard.html", import.meta.url)), "text/html; charset=utf-8");
    }
    if (url.pathname === "/analytics/admin/data") {
      if (!authorized(req)) return json(res, 401, { ok: false }, { "www-authenticate": 'Basic realm="kokoapi analytics", charset="UTF-8"' });
      const days = Math.max(1, Math.min(400, Number(url.searchParams.get("days")) || 30));
      return handleStats(res, days);
    }
    if (req.method === "POST" && url.pathname === "/analytics/collect") return await handleCollect(req, res);
    if (req.method === "OPTIONS" && url.pathname === "/analytics/collect") return send(res, 204, "", "text/plain", { allow: "POST, OPTIONS" });
    return json(res, 404, { ok: false });
  } catch {
    return json(res, 500, { ok: false });
  }
});

setInterval(() => { try { cleanup(); } catch {} }, 15 * 60000).unref();
cleanup();
server.listen(PORT, HOST, () => console.log(`analytics collector listening on ${HOST}:${PORT}`));
