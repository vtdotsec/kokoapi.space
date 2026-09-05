// Integration test for the /secret/ backend. Run: node test.mjs
// Exercises the API with real Web Crypto encryption, mirroring what app.js does.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "secret-test-"));
process.env.DATA_DIR = tmp;

const { createApp } = await import(path.join(path.dirname(fileURLToPath(import.meta.url)), "server.mjs"));

const { server, sweep } = createApp();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function encrypt(plain) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const algo = { name: "AES-GCM", iv };
  const k = await crypto.webcrypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt"]);
  const cipher = Buffer.from(await crypto.webcrypto.subtle.encrypt(algo, k, plain));
  return { key, iv, cipher };
}

async function createBlob(body) {
  return fetch(`${base}/secret/api/blob`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readSecret(id, key) {
  const metaRes = await fetch(`${base}/secret/api/blob/${id}/meta`);
  assert.equal(metaRes.status, 200, "meta 200");
  const meta = await metaRes.json();
  const cipherRes = await fetch(`${base}/secret/api/blob/${id}/cipher`);
  assert.equal(cipherRes.status, 200, "cipher 200");
  const cipher = Buffer.from(await cipherRes.arrayBuffer());
  const k = await crypto.webcrypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = Buffer.from(await crypto.webcrypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(meta.iv, "base64url") }, k, cipher));
  return { meta, plain };
}

let passed = 0;

async function main() {
  // 1. Text round-trip
  {
    const content = Buffer.from("correct horse battery staple\nsecond line");
    const { key, iv, cipher } = await encrypt(content);
    const res = await createBlob({
      v: 1, kind: "text", expires: "24h",
      iv: iv.toString("base64url"), cipher: cipher.toString("base64url"), size: content.length,
    });
    assert.equal(res.status, 201);
    const { id } = await res.json();
    assert.match(id, /^[A-Za-z0-9_-]{16,64}$/);
    const { meta, plain } = await readSecret(id, key);
    assert.equal(meta.kind, "text");
    assert.equal(meta.burn, false);
    assert.deepEqual(plain, content);
    console.log("ok — text round-trip");
    passed++;
  }

  // 2. Burn after read
  {
    const content = Buffer.from("burn me");
    const { key, iv, cipher } = await encrypt(content);
    const res = await createBlob({
      v: 1, kind: "text", expires: "read",
      iv: iv.toString("base64url"), cipher: cipher.toString("base64url"), size: content.length,
    });
    const { id } = await res.json();
    const { plain, meta } = await readSecret(id, key);
    assert.deepEqual(plain, content);
    assert.equal(meta.burn, true);
    assert.equal((await fetch(`${base}/secret/api/blob/${id}/meta`)).status, 404, "meta gone after burn");
    assert.equal((await fetch(`${base}/secret/api/blob/${id}/cipher`)).status, 404, "cipher gone after burn");
    console.log("ok — burn-after-read");
    passed++;
  }

  // 3. File secret keeps name/type
  {
    const content = Buffer.from("fake pdf bytes");
    const { key, iv, cipher } = await encrypt(content);
    const res = await createBlob({
      v: 1, kind: "file", expires: "7d", name: "notes.pdf", type: "application/pdf",
      iv: iv.toString("base64url"), cipher: cipher.toString("base64url"), size: content.length,
    });
    assert.equal(res.status, 201);
    const { id } = await res.json();
    const { meta, plain } = await readSecret(id, key);
    assert.equal(meta.kind, "file");
    assert.equal(meta.name, "notes.pdf");
    assert.equal(meta.type, "application/pdf");
    assert.deepEqual(plain, content);
    console.log("ok — file secret");
    passed++;
  }

  // 4. Validation
  {
    const enc = await encrypt(Buffer.from("x".repeat(100)));
    const over = await createBlob({
      v: 1, kind: "text", expires: "24h", iv: enc.iv.toString("base64url"),
      cipher: enc.cipher.toString("base64url"), size: 11 * 1024 * 1024,
    });
    assert.equal(over.status, 400, "size limit enforced");
    const badExp = await createBlob({
      v: 1, kind: "text", expires: "forever", iv: enc.iv.toString("base64url"),
      cipher: enc.cipher.toString("base64url"), size: 100,
    });
    assert.equal(badExp.status, 400, "bad expiry rejected");
    const badKind = await createBlob({
      v: 1, kind: "link", expires: "24h", iv: enc.iv.toString("base64url"),
      cipher: enc.cipher.toString("base64url"), size: 100,
    });
    assert.equal(badKind.status, 400, "bad kind rejected");
    assert.equal((await fetch(`${base}/secret/api/blob/${"a".repeat(22)}/meta`)).status, 404, "unknown id");
    console.log("ok — validation");
    passed++;
  }

  // 5. Timed secrets only start counting after the first read (reveal).
  {
    const content = Buffer.from("timed");
    const { key, iv, cipher } = await encrypt(content);
    const res = await createBlob({
      v: 1, kind: "text", expires: "1h",
      iv: iv.toString("base64url"), cipher: cipher.toString("base64url"), size: content.length,
    });
    const { id } = await res.json();
    // Before reveal the secret has no expiry and must not be purged.
    const before = await (await fetch(`${base}/secret/api/blob/${id}/meta`)).json();
    assert.ok(before.expiresAt == null, "no expiry before reveal");
    await readSecret(id, key);
    const after = await (await fetch(`${base}/secret/api/blob/${id}/meta`)).json();
    assert.ok(after.expiresAt > Date.now(), "expiry starts after reveal");
    console.log("ok — expiry starts on reveal");
    passed++;
  }

  // 6. Sweep removes expired blobs
  {
    const content = Buffer.from("old");
    const { iv, cipher } = await encrypt(content);
    const res = await createBlob({
      v: 1, kind: "text", expires: "1h", iv: iv.toString("base64url"),
      cipher: cipher.toString("base64url"), size: content.length,
    });
    const { id } = await res.json();
    const metaPath = path.join(tmp, `${id}.json`);
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    meta.expiresAt = Date.now() - 1000;
    fs.writeFileSync(metaPath, JSON.stringify(meta));
    await sweep();
    assert.ok(!fs.existsSync(metaPath), "meta removed by sweep");
    assert.ok(!fs.existsSync(path.join(tmp, `${id}.bin`)), "bin removed by sweep");

    // Orphaned .bin files (no meta) are also purged.
    const orphanId = "orphan-bin-id-000000000000";
    fs.writeFileSync(path.join(tmp, `${orphanId}.bin`), Buffer.from("orphan"));
    await sweep();
    assert.ok(!fs.existsSync(path.join(tmp, `${orphanId}.bin`)), "orphan bin removed by sweep");
    console.log("ok — expiry sweep");
    passed++;
  }

  // 7. Static page
  {
    const res = await fetch(`${base}/secret/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /Secret Sender/);
    const css = await fetch(`${base}/secret/app.css`);
    assert.equal(css.status, 200);
    const js = await fetch(`${base}/secret/app.js`);
    assert.equal(js.status, 200);
    console.log("ok — static assets");
    passed++;
  }

  console.log(`\nall ${passed} checks passed`);
}

main()
  .catch((err) => {
    console.error("FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(() => server.close());
