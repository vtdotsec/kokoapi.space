// kokoapi.space — /secret/ client.
// Plain JavaScript, no dependencies. All encryption/decryption happens here with the
// Web Crypto API. The AES-GCM key lives in the URL fragment and is never sent anywhere.

(function () {
  "use strict";

  var MAX_BYTES = 10 * 1024 * 1024; // 10 MB, mirrors the server limit

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- base64url / bytes helpers ---------------- */

  function bytesToB64url(bytes) {
    var bin = "";
    var u8 = new Uint8Array(bytes);
    var CHUNK = 0x8000;
    for (var i = 0; i < u8.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
    }
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function b64urlToBytes(s) {
    var b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin = atob(b64);
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  /* ---------------- crypto helpers ---------------- */

  function randomBytes(n) {
    var u8 = new Uint8Array(n);
    crypto.getRandomValues(u8);
    return u8;
  }

  function importKey(raw) {
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  }

  function encrypt(key, iv, data) {
    return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data);
  }

  function decrypt(key, iv, data) {
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
  }

  function textBytes(text) {
    return new TextEncoder().encode(text);
  }

  function bytesToText(bytes) {
    return new TextDecoder().decode(bytes);
  }

  /* ---------------- dom helpers ---------------- */

  function show(id) { $(id).hidden = false; }
  function hide(id) { $(id).hidden = true; }

  function setError(text) {
    var el = $("create-error");
    el.textContent = text || "";
  }

  function copyToClipboard(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () {
        legacyCopy(text, done);
      });
    } else {
      legacyCopy(text, done);
    }
  }

  function legacyCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    done(ok);
  }

  function flashCopyButton(btn) {
    var original = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(function () { btn.textContent = original; }, 1500);
  }

  function apiError(res, fallback) {
    return res.json().then(function (j) {
      return j && j.error ? j.error : fallback;
    }).catch(function () { return fallback; });
  }

  /* ---------------- state ---------------- */

  var currentMode = "text";
  var resultObjectUrl = null;

  function readableBytes(n) {
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MB";
    if (n >= 1024) return Math.round(n / 1024) + " KB";
    return n + " B";
  }

  function expireLabel(v) {
    var map = { read: "after one read", "1h": "in 1 hour", "24h": "in 24 hours", "7d": "in 7 days" };
    return map[v] || v;
  }

  function setMode(mode) {
    currentMode = mode;
    var textMode = mode === "text";
    $("mode-text").setAttribute("aria-pressed", String(textMode));
    $("mode-file").setAttribute("aria-pressed", String(!textMode));
    $("panel-text").hidden = !textMode;
    $("panel-file").hidden = textMode;
    setError("");
  }

  function selectedExpiry() {
    var els = document.querySelectorAll('input[name="expires"]');
    for (var i = 0; i < els.length; i++) {
      if (els[i].checked) return els[i].value;
    }
    return "24h";
  }

  /* ---------------- create flow ---------------- */

  function payloadBytes() {
    if (currentMode === "text") {
      var text = $("text-input").value;
      if (!text) return null;
      return { kind: "text", bytes: textBytes(text) };
    }
    var file = $("file-input").files && $("file-input").files[0];
    if (!file) return null;
    return { kind: "file", file: file };
  }

  function updateFileLabel() {
    var file = $("file-input").files && $("file-input").files[0];
    if (file) {
      $("file-placeholder").hidden = true;
      $("file-chosen").hidden = false;
      $("file-chosen").textContent = file.name + " — " + readableBytes(file.size);
    } else {
      $("file-placeholder").hidden = false;
      $("file-chosen").hidden = true;
    }
  }

  function showCreateView() {
    hide("result-view");
    hide("reader-view");
    show("create-view");
    setError("");
  }

  function showResult(url, kind, expiry) {
    hide("create-view");
    hide("reader-view");
    show("result-view");
    $("result-link").value = url;
    $("result-hint").textContent =
      (kind === "file" ? "File" : "Text") +
      " — expires " + expireLabel(expiry) + ". Keep the whole link: everything after the # is the decryption key.";
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    var payload;
    try {
      payload = payloadBytes();
    } catch (err) {
      setError("Could not read the payload: " + err.message);
      return;
    }
    if (!payload) {
      setError(currentMode === "text" ? "Paste something to share first." : "Choose a file first.");
      return;
    }
    var bytes = payload.kind === "file" ? new Uint8Array(await payload.file.arrayBuffer()) : payload.bytes;
    if (bytes.byteLength === 0) {
      setError(currentMode === "text" ? "Paste something to share first." : "The file is empty.");
      return;
    }
    if (bytes.byteLength > MAX_BYTES) {
      setError("Payload is " + readableBytes(bytes.byteLength) + " — the limit is 10 MB.");
      return;
    }

    var btn = $("create-form").querySelector("button[type=submit]");
    btn.disabled = true;
    var originalLabel = btn.textContent;
    btn.textContent = "Encrypting…";
    try {
      var key = randomBytes(32);
      var iv = randomBytes(12);
      var k = await importKey(key);
      var cipher = new Uint8Array(await encrypt(k, iv, bytes));
      var expires = selectedExpiry();

      var body = {
        v: 1,
        kind: payload.kind,
        cipher: bytesToB64url(cipher),
        iv: bytesToB64url(iv),
        size: bytes.byteLength,
        expires: expires,
      };
      if (payload.kind === "file") {
        body.name = payload.file.name;
        body.type = payload.file.type || "application/octet-stream";
      }

      var res = await fetch("/secret/api/blob", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        var msg = await apiError(res, "The server rejected the upload. Try again.");
        setError(msg);
        return;
      }
      var j = await res.json();
      var url = location.origin + j.path + "#" + bytesToB64url(key);
      showResult(url, payload.kind, expires);
    } catch (err) {
      setError("Encryption or upload failed: " + (err && err.message ? err.message : "unknown error"));
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }

  /* ---------------- reader flow ---------------- */

  function pathId() {
    var m = location.pathname.match(/^\/secret\/([^/]+)\/?$/);
    return m ? m[1] : null;
  }

  function readKey() {
    var h = location.hash;
    if (!h || h.length < 2) return null;
    return b64urlToBytes(h.slice(1));
  }

  function showReaderError(title, msg) {
    hide("reader-loading");
    hide("reader-content");
    show("reader-error");
    $("reader-error-title").textContent = title;
    $("reader-error-msg").textContent = msg;
  }

  function showReaderContent(meta, plainBytes) {
    hide("reader-loading");
    hide("reader-error");
    show("reader-content");

    if (meta.burn) {
      show("reader-burn-note");
      $("reader-burn-note").textContent =
        "This secret was set to burn after one read and has now been deleted from the server.";
    }

    if (meta.kind === "file") {
      hide("reader-text-wrap");
      show("reader-file-wrap");
      var fname = String(meta.name || "download").replace(/[\\\/\u0000-\u001f]/g, "_");
      $("reader-file-meta").textContent = fname + " — " + readableBytes(meta.size);
      $("reader-file-note").textContent =
        meta.burn
          ? "Download it now: opening this page consumed the secret."
          : "This secret can be opened again until it expires.";
      if (resultObjectUrl) URL.revokeObjectURL(resultObjectUrl);
      var file = new File([plainBytes], fname, { type: meta.type || "application/octet-stream" });
      resultObjectUrl = URL.createObjectURL(file);
      var dl = $("reader-download");
      dl.href = resultObjectUrl;
      dl.setAttribute("download", fname);
    } else {
      hide("reader-file-wrap");
      show("reader-text-wrap");
      $("reader-text").textContent = bytesToText(plainBytes);
      $("reader-meta-line").textContent =
        readableBytes(plainBytes.byteLength) + (meta.burn ? " — read once" : " — decrypted locally");
    }
  }

  async function handleRead() {
    var id = pathId();
    var key = readKey();
    if (!id || !key) {
      showReaderError(
        "Missing decryption key",
        "The link needs its #key fragment to be decryptable. If you pasted it from a chat app, make sure the whole link was copied."
      );
      return;
    }

    try {
      var metaRes = await fetch("/secret/api/blob/" + encodeURIComponent(id) + "/meta");
      if (metaRes.status === 404) {
        showReaderError(
          "Secret not found",
          "It expired, was already read (burn after read), or was deleted."
        );
        return;
      }
      if (!metaRes.ok) {
        var metaErr = await apiError(metaRes, "Could not load the secret metadata.");
        showReaderError("Request failed", metaErr);
        return;
      }
      var meta = await metaRes.json();

      var cipherRes = await fetch("/secret/api/blob/" + encodeURIComponent(id) + "/cipher");
      if (cipherRes.status === 404) {
        showReaderError(
          "Secret not found",
          "It expired or was already read once. For burn-after-read secrets, opening the page consumes them."
        );
        return;
      }
      if (!cipherRes.ok) {
        var cipherErr = await apiError(cipherRes, "Could not download the encrypted payload.");
        showReaderError("Request failed", cipherErr);
        return;
      }
      var cipher = new Uint8Array(await cipherRes.arrayBuffer());

      var k = await importKey(key);
      var iv = b64urlToBytes(meta.iv);
      var plain = new Uint8Array(await decrypt(k, iv, cipher));

      if (plain.byteLength !== meta.size) {
        showReaderError("Decryption failed", "The decrypted payload does not match the expected size. The key may be wrong.");
        return;
      }
      showReaderContent(meta, plain);
    } catch (err) {
      showReaderError(
        "Decryption failed",
        err && err.name === "OperationError"
          ? "Wrong key, corrupted payload, or the secret is no longer valid."
          : err && err.message ? err.message : "An unexpected error occurred."
      );
    }
  }

  /* ---------------- wiring ---------------- */

  function init() {
    $("mode-text").addEventListener("click", function () { setMode("text"); });
    $("mode-file").addEventListener("click", function () { setMode("file"); });
    $("file-input").addEventListener("change", updateFileLabel);
    $("create-form").addEventListener("submit", handleCreate);

    $("btn-new").addEventListener("click", function () {
      $("create-form").reset();
      updateFileLabel();
      setMode("text");
      showCreateView();
    });

    $("copy-link").addEventListener("click", function () {
      var val = $("result-link").value;
      $("result-link").select();
      copyToClipboard(val, function (ok) {
        if (ok) flashCopyButton($("copy-link"));
      });
    });
    $("copy-text").addEventListener("click", function () {
      copyToClipboard($("reader-text").textContent, function (ok) {
        if (ok) flashCopyButton($("copy-text"));
      });
    });

    var id = pathId();
    if (id) {
      hide("create-view");
      hide("result-view");
      show("reader-view");
      show("reader-loading");
      handleRead();
    } else {
      show("create-view");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
