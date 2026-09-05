// kokoapi.space — /pdf/ client.
// All PDF work happens locally with pdf-lib (structure) + pdf.js (rendering).
// Nothing is uploaded: files are read from disk, processed, and downloaded.

(function () {
  "use strict";

  var PDFLib = window.PDFLib;
  var pdfjsLib = window.pdfjsLib;
  var fflate = window.fflate;

  if (!PDFLib || !pdfjsLib) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<p class="note" style="border-left-color:var(--danger)">A required library failed to load. The toolkit needs its local scripts to work.</p>',
    );
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf/vendor/pdf.worker.min.js";
  if (pdfjsLib.GlobalWorkerOptions.standardFontDataUrl === undefined) {
    // v4 exposes this; v3 derives it from the worker path. Nothing to do.
  } else {
    pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = "/pdf/vendor/standard_fonts/";
  }

  var $ = function (id) { return document.getElementById(id); };

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  function baseName(name) {
    var n = String(name || "document");
    var slash = Math.max(n.lastIndexOf("/"), n.lastIndexOf("\\"));
    if (slash >= 0) n = n.slice(slash + 1);
    return n.replace(/\.pdf$/i, "") || "document";
  }

  function cleanName(name) {
    return name.replace(/[\\\/:*?"<>|\u0000-\u001f]/g, "_");
  }

  function readableBytes(n) {
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MB";
    if (n >= 1024) return Math.round(n / 1024) + " KB";
    return n + " B";
  }

  function setStatus(id, text, isError) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("is-error", !!isError);
  }

  function markBusy(btn, busy, label) {
    btn.disabled = busy;
    btn.textContent = busy ? (label || "Working…") : btn.dataset.label || btn.textContent;
  }

  function bytesOf(file) {
    return file.arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  /* ================================================================ */
  /* Tool switching                                                    */
  /* ================================================================ */

  var TOOLS = ["merge", "split", "organize"];
  var segButtons = Array.prototype.slice.call(document.querySelectorAll(".seg-btn"));

  function activate(tool) {
    segButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
    });
    TOOLS.forEach(function (t) {
      $("tool-" + t).hidden = t !== tool;
    });
  }

  segButtons.forEach(function (b) {
    b.addEventListener("click", function () { activate(b.dataset.tool); });
  });

  /* ================================================================ */
  /* Merge                                                             */
  /* ================================================================ */

  var mergeItems = []; // { file }
  var mergeListEl = $("merge-list");
  var mergeRun = $("merge-run");
  mergeRun.dataset.label = "Merge and download";

  function mergeCanRun() {
    mergeRun.disabled = mergeItems.length < 2;
  }

  function renderMergeList() {
    mergeListEl.hidden = mergeItems.length === 0;
    mergeListEl.textContent = "";
    mergeItems.forEach(function (item, i) {
      var li = document.createElement("li");
      li.className = "file-row";
      li.dataset.index = String(i);

      var name = document.createElement("span");
      name.className = "name";
      name.textContent = String(i + 1) + ". " + item.file.name;

      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = readableBytes(item.file.size);

      var btns = document.createElement("span");
      btns.className = "row-btns";

      var up = document.createElement("button");
      up.type = "button";
      up.className = "icon-btn";
      up.textContent = "↑";
      up.title = "Move up";
      up.disabled = i === 0;
      up.addEventListener("click", function () {
        swapMerge(i, i - 1);
      });

      var down = document.createElement("button");
      down.type = "button";
      down.className = "icon-btn";
      down.textContent = "↓";
      down.title = "Move down";
      down.disabled = i === mergeItems.length - 1;
      down.addEventListener("click", function () {
        swapMerge(i, i + 1);
      });

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-btn danger";
      remove.textContent = "✕";
      remove.title = "Remove";
      remove.addEventListener("click", function () {
        mergeItems.splice(i, 1);
        renderMergeList();
        mergeCanRun();
      });

      btns.appendChild(up);
      btns.appendChild(down);
      btns.appendChild(remove);
      li.appendChild(name);
      li.appendChild(meta);
      li.appendChild(btns);
      mergeListEl.appendChild(li);
    });
    mergeCanRun();
  }

  function swapMerge(a, b) {
    var tmp = mergeItems[a];
    mergeItems[a] = mergeItems[b];
    mergeItems[b] = tmp;
    renderMergeList();
  }

  $("merge-files").addEventListener("change", function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    files.forEach(function (f) {
      if (!mergeItems.some(function (it) { return it.file === f; })) {
        mergeItems.push({ file: f });
      }
    });
    e.target.value = "";
    renderMergeList();
  });

  mergeRun.addEventListener("click", async function () {
    if (mergeItems.length < 2) return;
    markBusy(mergeRun, true, "Merging…");
    setStatus("merge-status", "");
    try {
      var out = await PDFLib.PDFDocument.create();
      for (var i = 0; i < mergeItems.length; i++) {
        var file = mergeItems[i].file;
        var bytes = await bytesOf(file);
        var src;
        try {
          src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        } catch (e) {
          throw new Error('"' + file.name + '" is not a readable PDF' + (e && e.message === "EncryptedPDFError" ? " (encrypted)" : ""));
        }
        var indices = [];
        for (var p = 0; p < src.getPageCount(); p++) indices.push(p);
        var pages = await out.copyPages(src, indices);
        pages.forEach(function (page) { out.addPage(page); });
      }
      var result = await out.save();
      download(new Blob([result], { type: "application/pdf" }), "merged.pdf");
      setStatus("merge-status", "Merged " + mergeItems.length + " files.");
    } catch (err) {
      setStatus("merge-status", err && err.message ? err.message : "Merge failed.", true);
    } finally {
      markBusy(mergeRun, false);
    }
  });

  /* ================================================================ */
  /* Split                                                             */
  /* ================================================================ */

  var splitState = null; // { bytes, name, pageCount }
  var splitRun = $("split-run");
  splitRun.dataset.label = "Split and download";
  var rangeInput = $("split-range");
  var rangeOption = $("tool-split").querySelector('input[value="range"]');
  var pagesOption = $("tool-split").querySelector('input[value="pages"]');

  function splitCanRun() {
    splitRun.disabled = !splitState;
  }

  function updateRangeDisabled() {
    rangeInput.disabled = !rangeOption.checked;
  }
  rangeOption.addEventListener("change", updateRangeDisabled);
  pagesOption.addEventListener("change", updateRangeDisabled);
  updateRangeDisabled();

  $("split-file").addEventListener("change", async function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    splitState = null;
    splitRun.disabled = true;
    setStatus("split-status", "Reading…");
    $("split-info").textContent = "";
    try {
      var bytes = await bytesOf(file);
      var doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      splitState = { bytes: bytes, name: file.name, pageCount: doc.getPageCount() };
      $("split-info").textContent =
        file.name + " — " + doc.getPageCount() + " page" + (doc.getPageCount() === 1 ? "" : "s");
      setStatus("split-status", "");
      splitCanRun();
    } catch (err) {
      setStatus("split-status", '"' + file.name + '" could not be read as a PDF (encrypted or corrupted).', true);
      $("split-info").textContent = "";
    }
  });

  function parseRanges(input, max) {
    var tokens = String(input).split(",");
    var wanted = new Set();
    var re = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (!t.trim()) continue;
      var m = t.match(re);
      if (!m) return { error: "Invalid range: \"" + t.trim() + "\". Use something like 1, 3-5." };
      var a = Number(m[1]);
      var b = m[2] === undefined ? a : Number(m[2]);
      if (a < 1 || b > max || a > b) {
        return { error: "Range \"" + t.trim() + "\" is outside the document (1–" + max + ")." };
      }
      for (var n = a; n <= b; n++) wanted.add(n);
    }
    if (wanted.size === 0) return { error: "Enter at least one page, e.g. 1, 3-5." };
    return { pages: Array.from(wanted).sort(function (x, y) { return x - y; }) };
  }

  splitRun.addEventListener("click", async function () {
    if (!splitState) return;
    markBusy(splitRun, true, "Splitting…");
    setStatus("split-status", "");
    try {
      var src = await PDFLib.PDFDocument.load(splitState.bytes, { ignoreEncryption: true });
      var total = splitState.pageCount;
      var base = cleanName(baseName(splitState.name));

      if (pagesOption.checked) {
        // One PDF per page, packed into a ZIP.
        var files = {};
        for (var i = 0; i < total; i++) {
          var one = await PDFLib.PDFDocument.create();
          var cp = await one.copyPages(src, [i]);
          one.addPage(cp[0]);
          var pageBytes = await one.save();
          files[base + "-page-" + pad(i + 1, total) + ".pdf"] = new Uint8Array(pageBytes);
        }
        var zip = fflate.zipSync(files, { level: 6 });
        download(new Blob([zip], { type: "application/zip" }), base + "-pages.zip");
        setStatus("split-status", "Split " + total + " page" + (total === 1 ? "" : "s") + " into " + total + " file" + (total === 1 ? "" : "s") + ".");
      } else {
        var parsed = parseRanges(rangeInput.value, total);
        if (parsed.error) {
          setStatus("split-status", parsed.error, true);
          return;
        }
        var out = await PDFLib.PDFDocument.create();
        for (var k = 0; k < parsed.pages.length; k++) {
          var cp2 = await out.copyPages(src, [parsed.pages[k] - 1]);
          out.addPage(cp2[0]);
        }
        var result = await out.save();
        download(new Blob([result], { type: "application/pdf" }), base + "-split.pdf");
        setStatus("split-status", "Extracted " + parsed.pages.length + " page" + (parsed.pages.length === 1 ? "" : "s") + ".");
      }
    } catch (err) {
      setStatus("split-status", err && err.message ? err.message : "Split failed.", true);
    } finally {
      markBusy(splitRun, false);
    }
  });

  function pad(n, total) {
    var width = String(total).length;
    var s = String(n);
    while (s.length < width) s = "0" + s;
    return s;
  }

  /* ================================================================ */
  /* Organize: thumbnails, rotate, delete                             */
  /* ================================================================ */

  var org = null; // { doc, bytes, name, items: [{idx, rot}], }
  var orgRun = $("org-run");
  orgRun.dataset.label = "Download result";
  var orgBar = document.querySelector("#tool-organize .org-bar");
  var orgHelp = $("org-help");
  var orgThumbs = $("org-thumbs");
  var THUMB_W = 150;

  function orgCanRun() {
    orgRun.disabled = !org || org.items.length === 0;
    $("org-count").textContent = org && org.items.length ? org.items.length + " page" + (org.items.length === 1 ? "" : "s") : "";
    orgBar.hidden = !org || org.items.length === 0;
    orgThumbs.hidden = !org || org.items.length === 0;
    orgHelp.hidden = !org || org.items.length === 0;
  }

  $("org-file").addEventListener("change", async function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setStatus("org-status", "");
    orgRun.disabled = true;
    $("org-thumbs").hidden = true;
    $("org-help").hidden = true;
    orgBar.hidden = true;
    setStatus("org-status", "Loading pages…");

    try {
      var bytes = await bytesOf(file);
      var task = pdfjsLib.getDocument({ data: bytes.slice() });
      var pdf = await task.promise;
      if (org) {
        org.items.forEach(function (it) {
          if (it.task) {
            try { it.task.cancel(); } catch (err) {}
          }
        });
        try { org.doc.destroy(); } catch (err) {}
        org = null;
      }
      org = { doc: pdf, bytes: bytes, name: file.name, items: [] };
      for (var i = 0; i < pdf.numPages; i++) {
        org.items.push({ idx: i, rot: 0, task: null });
      }
      setStatus("org-status", "");
      renderOrgThumbs();
      orgCanRun();
    } catch (err) {
      setStatus("org-status", '"' + file.name + '" could not be read as a PDF (encrypted or corrupted).', true);
    }
  });

  function rotationBase(page) {
    // Page proxies expose .rotate in v3+; fall back to the viewport angle.
    if (typeof page.rotate === "number") return page.rotate;
    return page.getViewport({ scale: 1 }).rotation;
  }

  async function renderOrgThumb(item) {
    var page = await org.doc.getPage(item.idx);
    var base = page.getViewport({ scale: 1 });
    var scale = THUMB_W / base.width;
    var rotation = (rotationBase(page) + item.rot) % 360;
    var vp = page.getViewport({ scale: scale, rotation: rotation });

    item.canvas.width = Math.max(1, Math.floor(vp.width));
    item.canvas.height = Math.max(1, Math.floor(vp.height));
    var ctx = item.canvas.getContext("2d");
    if (item.task) {
      try { item.task.cancel(); } catch (err) {}
      item.task = null;
    }
    item.task = page.render({ canvasContext: ctx, viewport: vp });
    try {
      await item.task.promise;
    } catch (err) {
      if (err && err.name !== "RenderingCancelledException") throw err;
    }
  }

  function renderOrgThumbs() {
    orgThumbs.textContent = "";
    org.items.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "thumb";

      var canvas = document.createElement("canvas");
      canvas.className = "thumb-canvas";
      item.canvas = canvas;

      var row = document.createElement("div");
      row.className = "thumb-row";

      var label = document.createElement("span");
      label.className = "thumb-label";
      label.textContent = "P" + (item.idx + 1);

      var rotLabel = document.createElement("span");
      rotLabel.className = "thumb-rot";
      rotLabel.textContent = item.rot ? item.rot + "°" : "";

      var rotate = document.createElement("button");
      rotate.type = "button";
      rotate.className = "icon-btn";
      rotate.textContent = "↻";
      rotate.title = "Rotate 90° clockwise";
      rotate.addEventListener("click", function () {
        item.rot = (item.rot + 90) % 360;
        rotLabel.textContent = item.rot ? item.rot + "°" : "";
        renderOrgThumb(item).catch(function (err) {
          setStatus("org-status", err && err.message ? err.message : "Render failed.", true);
        });
      });

      var del = document.createElement("button");
      del.type = "button";
      del.className = "icon-btn danger";
      del.textContent = "✕";
      del.title = "Delete page";
      del.addEventListener("click", function () {
        if (item.task) {
          try { item.task.cancel(); } catch (err) {}
        }
        var at = org.items.indexOf(item);
        if (at !== -1) org.items.splice(at, 1);
        card.remove();
        orgCanRun();
      });

      row.appendChild(label);
      row.appendChild(rotLabel);
      row.appendChild(rotate);
      row.appendChild(del);

      card.appendChild(canvas);
      card.appendChild(row);
      orgThumbs.appendChild(card);
    });
    orgThumbs.hidden = false;

    org.items.forEach(function (item) {
      renderOrgThumb(item).catch(function (err) {
        // A cancelled task from a previous document/session is not an error.
        if (org && org.items.indexOf(item) !== -1) {
          setStatus("org-status", err && err.message ? err.message : "Could not render thumbnails.", true);
        }
      });
    });
  }

  orgRun.addEventListener("click", async function () {
    if (!org || org.items.length === 0) return;
    markBusy(orgRun, true, "Building PDF…");
    setStatus("org-status", "");
    try {
      var src = await PDFLib.PDFDocument.load(org.bytes, { ignoreEncryption: true });
      var out = await PDFLib.PDFDocument.create();
      for (var i = 0; i < org.items.length; i++) {
        var item = org.items[i];
        var original = src.getPage(item.idx);
        var absolute = (original.getRotation().angle + item.rot) % 360;
        var copied = await out.copyPages(src, [item.idx]);
        copied[0].setRotation(PDFLib.degrees(absolute));
        out.addPage(copied[0]);
      }
      var result = await out.save();
      var base = cleanName(baseName(org.name));
      download(new Blob([result], { type: "application/pdf" }), base + "-organized.pdf");
      setStatus("org-status", "Downloaded " + org.items.length + " page" + (org.items.length === 1 ? "" : "s") + ".");
    } catch (err) {
      setStatus("org-status", err && err.message ? err.message : "Export failed.", true);
    } finally {
      markBusy(orgRun, false);
    }
  });

  orgCanRun();
})();
