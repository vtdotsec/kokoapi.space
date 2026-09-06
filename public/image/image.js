// kokoapi.space — /image/ client.
// Local-only image work: Canvas/Blob encode/decode. No libraries beyond fflate
// (used only to package stripped files into a ZIP). Files never leave the browser.

(function () {
  "use strict";

  function loadScript(url) {
    if (!window.__kokoLibs) window.__kokoLibs = {};
    return window.__kokoLibs[url] || (window.__kokoLibs[url] = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { delete window.__kokoLibs[url]; reject(new Error("Failed to load " + url)); };
      document.head.appendChild(s);
    }));
  }
  function loadFflate() { return loadScript("/image/vendor/fflate.js"); }

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
    var n = String(name || "image");
    var slash = Math.max(n.lastIndexOf("/"), n.lastIndexOf("\\"));
    if (slash >= 0) n = n.slice(slash + 1);
    return n.replace(/\.[^.]+$/, "") || "image";
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
    if (busy) {
      btn.dataset.label = btn.textContent;
      btn.disabled = true;
      btn.textContent = label;
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.label || btn.textContent;
    }
  }

  function checkedRadio(name) {
    var els = document.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < els.length; i++) {
      if (els[i].checked) return els[i].value;
    }
    return null;
  }

  function bindRangeOutput(id) {
    var input = $(id);
    var output = document.querySelector('output[for="' + id + '"]');
    if (input && output) {
      var update = function () { output.textContent = input.value; };
      input.addEventListener("input", update);
      update();
    }
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error("This browser cannot encode " + type + " images."));
      }, type, quality);
    });
  }

  function loadViaImage(blob) {
    var url = URL.createObjectURL(blob);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = "async";
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("File is not a decodable image")); };
      img.src = url;
    }).finally(function () {
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    });
  }

  // Draws the decoded image onto a fresh canvas. EXIF orientation is applied by the
  // browser and metadata is dropped by the re-encode.
  async function decodeToCanvas(blob) {
    var source = null;
    if (typeof createImageBitmap === "function") {
      try {
        source = await createImageBitmap(blob);
      } catch (e) {
        source = null;
      }
    }
    if (!source) source = await loadViaImage(blob);
    var canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d").drawImage(source, 0, 0);
    if (typeof source.close === "function") {
      try { source.close(); } catch (e) {}
    }
    return canvas;
  }

  function scaledCanvas(canvas, width, height) {
    if (width === canvas.width && height === canvas.height) return canvas;
    var out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    out.getContext("2d").drawImage(canvas, 0, 0, width, height);
    return out;
  }

  var TYPE_TO_MIME = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
    avif: "image/avif",
  };
  var TYPE_TO_EXT = { png: "png", jpeg: "jpg", webp: "webp", avif: "avif" };

  var avifSupported = null;
  function probeAvif() {
    if (avifSupported !== null) return Promise.resolve(avifSupported);
    return new Promise(function (resolve) {
      var canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      var ctx = canvas.getContext("2d");
      if (!ctx) {
        avifSupported = false;
        return resolve(false);
      }
      ctx.fillRect(0, 0, 2, 2);
      canvas.toBlob(function (blob) {
        avifSupported = !!(blob && blob.type === "image/avif");
        resolve(avifSupported);
      }, "image/avif", 0.5);
    });
  }

  /* ================================================================ */
  /* Tab switching                                                     */
  /* ================================================================ */

  var TOOLS = ["convert", "resize", "strip", "crop", "wmark", "filters", "batch", "qrcode"];
  var TOOL_LABELS = {
    convert: "Convert",
    resize: "Compress & Resize",
    strip: "Strip Metadata",
    crop: "Crop",
    wmark: "Watermark",
    filters: "Filters",
    batch: "Batch",
    qrcode: "QR code",
  };
  var sideButtons = Array.prototype.slice.call(document.querySelectorAll(".tool-nav button[data-tool]"));
  var sideSelect = document.querySelector(".tool-side .side-select");

  // Focused landing pages load this app in an iframe as ?tool=<name>&embed=1.
  var embedParams = new URLSearchParams(location.search);
  var embedTool =
    TOOLS.indexOf(embedParams.get("tool") || "") !== -1 ? embedParams.get("tool") : "convert";
  if (embedParams.get("embed") === "1") document.body.classList.add("embed");

  function activate(tool) {
    sideButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
    });
    TOOLS.forEach(function (t) {
      $("tool-" + t).hidden = t !== tool;
    });
    if (sideSelect) sideSelect.value = tool;
    if (tool === "qrcode") qrStart();
  }

  sideButtons.forEach(function (b) {
    b.addEventListener("click", function () { activate(b.dataset.tool); });
  });

  if (sideSelect) {
    TOOLS.forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t;
      opt.textContent = TOOL_LABELS[t] || t;
      sideSelect.appendChild(opt);
    });
    sideSelect.addEventListener("change", function () {
      if (sideSelect.value) activate(sideSelect.value);
    });
  }
  activate(embedTool);

  // In embed mode only the active panel is visible; keep the host iframe sized
  // to the content as previews, thumbnails and status lines change height.
  if (document.body.classList.contains("embed")) {
    var embedWidget = document.querySelector(".tool-main");
    var reportEmbedHeight = function () {
      if (!embedWidget) return;
      window.parent.postMessage(
        { type: "koko-widget-height", height: Math.ceil(embedWidget.offsetHeight) + 16 },
        "*"
      );
    };
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(reportEmbedHeight).observe(embedWidget);
    }
    window.addEventListener("resize", reportEmbedHeight);
    window.addEventListener("load", reportEmbedHeight);
    reportEmbedHeight();
  }

  /* ================================================================ */
  /* Convert                                                           */
  /* ================================================================ */

  var convertState = null; // { file, name, canvas, w, h }
  var convertRun = $("convert-run");
  convertRun.dataset.label = "Convert and download";
  bindRangeOutput("convert-quality");

  var qualityLine = $("convert-quality-line");
  function updateConvertQualityVisibility() {
    var fmt = checkedRadio("convert-fmt");
    qualityLine.hidden = fmt === "png";
  }
  Array.prototype.slice
    .call(document.querySelectorAll('input[name="convert-fmt"]'))
    .forEach(function (el) { el.addEventListener("change", updateConvertQualityVisibility); });

  function convertExt() {
    var fmt = checkedRadio("convert-fmt") || "png";
    var mime = TYPE_TO_MIME[fmt];
    var quality = mime === "image/png" ? undefined : Number($("convert-quality").value) / 100;
    return { fmt: fmt, ext: TYPE_TO_EXT[fmt], mime: mime, quality: quality };
  }

  $("convert-file").addEventListener("change", async function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    convertRun.disabled = true;
    convertState = null;
    setStatus("convert-status", "Decoding…");
    $("convert-info").textContent = "";
    try {
      var canvas = await decodeToCanvas(file);
      convertState = { file: file, canvas: canvas, w: canvas.width, h: canvas.height };
      $("convert-info").textContent =
        file.name + " — " + readableBytes(file.size) + " — " + canvas.width + "×" + canvas.height + " px";
      convertRun.disabled = false;
      setStatus("convert-status", "");
    } catch (err) {
      setStatus("convert-status", err && err.message ? err.message : "The file could not be decoded.", true);
    }
  });

  convertRun.addEventListener("click", async function () {
    if (!convertState) return;
    markBusy(convertRun, true, "Encoding…");
    setStatus("convert-status", "");
    try {
      var cfg = convertExt();
      var blob = await canvasToBlob(convertState.canvas, cfg.mime, cfg.quality);
      var base = cleanName(baseName(convertState.file.name));
      download(blob, base + "." + cfg.ext);
      setStatus(
        "convert-status",
        "Converted " + readableBytes(convertState.file.size) + " → " + readableBytes(blob.size) + " (" + cfg.fmt.toUpperCase() + ")."
      );
    } catch (err) {
      setStatus("convert-status", err && err.message ? err.message : "Conversion failed.", true);
    } finally {
      markBusy(convertRun, false);
    }
  });

  /* ================================================================ */
  /* Compress & Resize                                                 */
  /* ================================================================ */

  var resizeState = null; // { file, canvas, w, h }
  var resizeRun = $("resize-run");
  resizeRun.dataset.label = "Compress and download";
  var sizeSlider = $("resize-size");
  bindRangeOutput("resize-quality");

  function resizeDims() {
    if (!resizeState) return { w: 0, h: 0 };
    var longest = Number(sizeSlider.value);
    var w = resizeState.w;
    var h = resizeState.h;
    if (longest >= Math.max(w, h)) return { w: w, h: h };
    var s = longest / Math.max(w, h);
    return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
  }

  function updateResizeReadout() {
    if (!resizeState) return;
    var d = resizeDims();
    $("resize-dims").textContent = d.w + "×" + d.h + " px (" + Math.round((100 * d.w) / resizeState.w) + "% of original)";
    var out = document.querySelector('output[for="resize-size"]');
    if (out) out.textContent = sizeSlider.value;
  }

  sizeSlider.addEventListener("input", updateResizeReadout);

  $("resize-file").addEventListener("change", async function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    resizeRun.disabled = true;
    resizeState = null;
    sizeSlider.disabled = true;
    setStatus("resize-status", "Decoding…");
    $("resize-info").textContent = "";
    try {
      var canvas = await decodeToCanvas(file);
      resizeState = { file: file, canvas: canvas, w: canvas.width, h: canvas.height };
      var longest = Math.max(canvas.width, canvas.height);
      sizeSlider.min = "16";
      sizeSlider.max = String(Math.max(16, longest));
      sizeSlider.value = String(longest);
      sizeSlider.disabled = false;
      $("resize-info").textContent =
        file.name + " — " + readableBytes(file.size) + " — " + canvas.width + "×" + canvas.height + " px";
      updateResizeReadout();
      resizeRun.disabled = false;
      setStatus("resize-status", "");
    } catch (err) {
      setStatus("resize-status", err && err.message ? err.message : "The file could not be decoded.", true);
    }
  });

  resizeRun.addEventListener("click", async function () {
    if (!resizeState) return;
    markBusy(resizeRun, true, "Encoding…");
    setStatus("resize-status", "");
    try {
      var d = resizeDims();
      var canvas = scaledCanvas(resizeState.canvas, d.w, d.h);
      var fmt = $("resize-format").value;
      var mime;
      if (fmt === "auto") {
        var src = (resizeState.file.type || "").toLowerCase();
        if (src === "image/png") mime = "image/png";
        else if (src === "image/jpeg" || src === "image/jpg") mime = "image/jpeg";
        else mime = "image/webp";
      } else {
        mime = TYPE_TO_MIME[fmt];
      }
      var ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
      var quality = mime === "image/png" ? undefined : Number($("resize-quality").value) / 100;
      var blob = await canvasToBlob(canvas, mime, quality);
      var base = cleanName(baseName(resizeState.file.name));
      download(blob, base + "." + ext);
      var reduction = blob.size < resizeState.file.size
        ? " (" + Math.round(100 - (100 * blob.size) / resizeState.file.size) + "% smaller)"
        : "";
      setStatus(
        "resize-status",
        readableBytes(resizeState.file.size) + " → " + readableBytes(blob.size) + reduction + ". Metadata stripped."
      );
    } catch (err) {
      setStatus("resize-status", err && err.message ? err.message : "Compression failed.", true);
    } finally {
      markBusy(resizeRun, false);
    }
  });

  /* ================================================================ */
  /* Strip metadata (batch)                                            */
  /* ================================================================ */

  var stripRun = $("strip-run");
  stripRun.dataset.label = "Strip and download";
  var stripSelection = [];

  $("strip-files").addEventListener("change", function (e) {
    stripSelection = Array.prototype.slice.call(e.target.files || []);
    stripRun.disabled = stripSelection.length === 0;
    $("strip-info").textContent = stripSelection.length
      ? stripSelection.length + " image" + (stripSelection.length === 1 ? "" : "s") + " selected."
      : "";
    e.target.value = "";
  });

  stripRun.addEventListener("click", async function () {
    if (stripSelection.length === 0) return;
    markBusy(stripRun, true, "Re-encoding…");
    setStatus("strip-status", "");
    try {
      var png = checkedRadio("strip-fmt") === "png";
      var mime = png ? "image/png" : "image/jpeg";
      var ext = png ? "png" : "jpg";
      var quality = png ? undefined : 0.9;

      var entries = {};
      for (var i = 0; i < stripSelection.length; i++) {
        var canvas = await decodeToCanvas(stripSelection[i]);
        var blob = await canvasToBlob(canvas, mime, quality);
        var name = cleanName(baseName(stripSelection[i].name)) + "-clean." + ext;
        entries[name] = new Uint8Array(await blob.arrayBuffer());
        setStatus("strip-status", "Stripped " + (i + 1) + " of " + stripSelection.length + ".");
      }

      if (stripSelection.length === 1) {
        var key = Object.keys(entries)[0];
        download(new Blob([entries[key]], { type: mime }), key);
      } else {
        await loadFflate();
        var zip = window.fflate.zipSync(entries, { level: 6 });
        download(new Blob([zip], { type: "application/zip" }), "stripped-images.zip");
      }
      setStatus("strip-status", "Exported " + stripSelection.length + " file" + (stripSelection.length === 1 ? "" : "s") + " without metadata.");
    } catch (err) {
      setStatus("strip-status", err && err.message ? err.message : "Stripping failed.", true);
    } finally {
      markBusy(stripRun, false);
    }
  });

  /* ================================================================ */
  /* Crop                                                              */
  /* ================================================================ */

  var cropState = null; // { file, canvas } decoded at natural size
  var cropSel = null;   // { x, y, w, h } in source pixels
  var cropDrag = null;  // drag start in source pixels
  var cropCanvas = $("crop-canvas");
  var cropRun = $("crop-run");
  var cropReset = $("crop-reset");
  var cropRaf = 0;

  function cropPos(e) {
    var rect = cropCanvas.getBoundingClientRect();
    var sx = rect.width ? cropCanvas.width / rect.width : 1;
    var sy = rect.height ? cropCanvas.height / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
    };
  }

  function cropNormalize(a, b) {
    var W = cropState.canvas.width;
    var H = cropState.canvas.height;
    var x = Math.max(0, Math.round(Math.min(a.x, b.x, W)));
    var y = Math.max(0, Math.round(Math.min(a.y, b.y, H)));
    var x2 = Math.max(0, Math.round(Math.min(Math.max(a.x, b.x), W)));
    var y2 = Math.max(0, Math.round(Math.min(Math.max(a.y, b.y), H)));
    var w = x2 - x;
    var h = y2 - y;
    if (w < 1 || h < 1) return null;
    return { x: x, y: y, w: w, h: h };
  }

  function cropSync() {
    var s = cropSel;
    cropRun.disabled = !s;
    cropReset.disabled = !s;
    $("crop-readout").textContent = s
      ? "x " + s.x + ", y " + s.y + ", w " + s.w + ", h " + s.h + " px"
      : "";
  }

  function cropDraw() {
    if (!cropState) return;
    var src = cropState.canvas;
    var ctx = cropCanvas.getContext("2d");
    cropCanvas.hidden = false;
    cropCanvas.width = src.width;
    cropCanvas.height = src.height;
    ctx.clearRect(0, 0, src.width, src.height);
    ctx.drawImage(src, 0, 0);
    var s = cropSel;
    if (!s) return;
    var W = src.width;
    var H = src.height;
    ctx.fillStyle = "rgba(10, 12, 20, 0.42)";
    ctx.fillRect(0, 0, W, s.y);
    ctx.fillRect(0, s.y + s.h, W, H - s.y - s.h);
    ctx.fillRect(0, s.y, s.x, s.h);
    ctx.fillRect(s.x + s.w, s.y, W - s.x - s.w, s.h);
    var rect = cropCanvas.getBoundingClientRect();
    var sc = rect.width ? cropCanvas.width / rect.width : 1;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = Math.max(1, 1.5 / sc);
    ctx.setLineDash([Math.max(3, 6 / sc), Math.max(2, 4 / sc)]);
    var lw = ctx.lineWidth;
    ctx.strokeRect(s.x + lw / 2, s.y + lw / 2, Math.max(lw, s.w - lw), Math.max(lw, s.h - lw));
    ctx.restore();
  }

  function cropScheduleDraw() {
    if (cropRaf) return;
    cropRaf = requestAnimationFrame(function () {
      cropRaf = 0;
      cropDraw();
    });
  }

  cropCanvas.addEventListener("pointerdown", function (e) {
    if (!cropState) return;
    cropCanvas.setPointerCapture(e.pointerId);
    cropDrag = cropPos(e);
    cropSel = null;
    cropDraw();
    cropSync();
  });

  cropCanvas.addEventListener("pointermove", function (e) {
    if (!cropDrag) return;
    cropSel = cropNormalize(cropDrag, cropPos(e));
    cropSync();
    cropScheduleDraw();
  });

  function cropEnd(e) {
    if (!cropDrag) return;
    if (cropCanvas.hasPointerCapture && cropCanvas.hasPointerCapture(e.pointerId)) {
      cropCanvas.releasePointerCapture(e.pointerId);
    }
    cropDrag = null;
    cropDraw();
    cropSync();
  }
  cropCanvas.addEventListener("pointerup", cropEnd);
  cropCanvas.addEventListener("pointercancel", cropEnd);

  $("crop-file").addEventListener("change", async function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    cropState = null;
    cropSel = null;
    cropDrag = null;
    cropRun.disabled = true;
    cropReset.disabled = true;
    cropCanvas.hidden = true;
    $("crop-readout").textContent = "";
    setStatus("crop-status", "Decoding…");
    $("crop-info").textContent = "";
    try {
      var canvas = await decodeToCanvas(file);
      cropState = { file: file, canvas: canvas };
      $("crop-info").textContent =
        file.name + " — " + readableBytes(file.size) + " — " + canvas.width + "×" + canvas.height + " px";
      cropDraw();
      cropSync();
      setStatus("crop-status", "Drag across the image to select a crop area.");
    } catch (err) {
      setStatus("crop-status", err && err.message ? err.message : "The file could not be decoded.", true);
    }
  });

  cropReset.addEventListener("click", function () {
    cropSel = null;
    cropDrag = null;
    cropDraw();
    cropSync();
    setStatus("crop-status", "Selection cleared.");
  });

  cropRun.addEventListener("click", async function () {
    if (!cropState || !cropSel) return;
    var s = cropSel;
    markBusy(cropRun, true, "Cropping…");
    setStatus("crop-status", "");
    try {
      var out = document.createElement("canvas");
      out.width = s.w;
      out.height = s.h;
      out.getContext("2d").drawImage(cropState.canvas, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
      var blob = await canvasToBlob(out, "image/png");
      var base = cleanName(baseName(cropState.file.name));
      download(blob, base + "-crop.png");
      setStatus("crop-status", "Saved " + s.w + "×" + s.h + " px crop as " + base + "-crop.png.");
    } catch (err) {
      setStatus("crop-status", err && err.message ? err.message : "Cropping failed.", true);
    } finally {
      markBusy(cropRun, false);
    }
  });

  /* ================================================================ */
  /* Watermark                                                         */
  /* ================================================================ */

  var wmarkState = null; // { file, canvas }
  var wmarkLogo = null;  // { file, canvas }
  var wmarkRun = $("wmark-run");
  var wmarkSize = $("wmark-size");
  var wmarkTimer = 0;
  var UI_FONT = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

  bindRangeOutput("wmark-size");
  bindRangeOutput("wmark-opacity");

  function wmarkIsLogo() {
    return checkedRadio("wmark-mode") === "logo";
  }

  function wmarkAnchor(pos) {
    var ax = 0.5;
    var ay = 0.5;
    if (pos.indexOf("left") !== -1) ax = 0;
    else if (pos.indexOf("right") !== -1) ax = 1;
    if (pos.indexOf("top") !== -1) ay = 0;
    else if (pos.indexOf("bottom") !== -1) ay = 1;
    return { ax: ax, ay: ay };
  }

  function wmarkInset(w, h) {
    return Math.max(10, Math.round(Math.min(w, h) * 0.035));
  }

  function wmarkPlace(bw, bh, W, H, a) {
    var pad = wmarkInset(W, H);
    var x = a.ax * (W - bw) + (a.ax === 0 ? pad : a.ax === 1 ? -pad : 0);
    var y = a.ay * (H - bh) + (a.ay === 0 ? pad : a.ay === 1 ? -pad : 0);
    return { x: Math.round(x), y: Math.round(y) };
  }

  function wmarkDrawText(ctx, W, H) {
    var text = $("wmark-text").value;
    if (!String(text).trim()) return;
    var size = Number(wmarkSize.value) || 48;
    ctx.font = "600 " + size + "px " + UI_FONT;
    var tw = ctx.measureText(text).width;
    var bh = Math.round(size * 1.2);
    var p = wmarkPlace(tw, bh, W, H, wmarkAnchor($("wmark-pos").value));
    var off = Math.max(1, Math.round(size / 60));
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = off;
    ctx.shadowOffsetY = off;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, p.x, p.y + Math.round(size * 0.1));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = "transparent";
  }

  function wmarkDrawLogo(ctx, W, H) {
    if (!wmarkLogo) return;
    var logo = wmarkLogo.canvas;
    var pct = (Number(wmarkSize.value) || 25) / 100;
    var lw = Math.max(1, Math.round(W * pct));
    var lh = Math.max(1, Math.round(logo.height * (lw / logo.width)));
    var p = wmarkPlace(lw, lh, W, H, wmarkAnchor($("wmark-pos").value));
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(logo, p.x, p.y, lw, lh);
  }

  function wmarkRenderNow() {
    if (!wmarkState) return;
    var base = wmarkState.canvas;
    var cv = $("wmark-preview");
    var ctx = cv.getContext("2d");
    cv.hidden = false;
    cv.width = base.width;
    cv.height = base.height;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(base, 0, 0);
    ctx.save();
    var alpha = Number($("wmark-opacity").value) / 100;
    ctx.globalAlpha = alpha < 1 ? alpha : 1;
    if (wmarkIsLogo()) wmarkDrawLogo(ctx, cv.width, cv.height);
    else wmarkDrawText(ctx, cv.width, cv.height);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function wmarkSchedule() {
    if (wmarkTimer) clearTimeout(wmarkTimer);
    wmarkTimer = setTimeout(function () {
      wmarkTimer = 0;
      wmarkRenderNow();
    }, 80);
  }

  function wmarkSyncMode() {
    var logo = wmarkIsLogo();
    $("wmark-text-line").hidden = logo;
    $("wmark-logo-line").hidden = !logo;
    if (logo) {
      wmarkSize.min = "5";
      wmarkSize.max = "100";
      wmarkSize.value = "25";
      $("wmark-size-label").textContent = "Size (% of width)";
    } else {
      wmarkSize.min = "8";
      wmarkSize.max = "160";
      wmarkSize.value = "48";
      $("wmark-size-label").textContent = "Font size (px)";
    }
    var out = document.querySelector('output[for="wmark-size"]');
    if (out) out.textContent = wmarkSize.value;
    wmarkSchedule();
  }

  Array.prototype.slice
    .call(document.querySelectorAll('input[name="wmark-mode"]'))
    .forEach(function (el) {
      el.addEventListener("change", wmarkSyncMode);
    });
  wmarkSyncMode();

  $("wmark-text").addEventListener("input", wmarkSchedule);
  wmarkSize.addEventListener("input", wmarkSchedule);
  $("wmark-opacity").addEventListener("input", wmarkSchedule);
  $("wmark-pos").addEventListener("change", wmarkSchedule);

  $("wmark-file").addEventListener("change", async function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    wmarkRun.disabled = true;
    wmarkState = null;
    setStatus("wmark-status", "Decoding…");
    $("wmark-info").textContent = "";
    try {
      var canvas = await decodeToCanvas(file);
      wmarkState = { file: file, canvas: canvas };
      $("wmark-info").textContent =
        file.name + " — " + readableBytes(file.size) + " — " + canvas.width + "×" + canvas.height + " px";
      wmarkRun.disabled = false;
      wmarkRenderNow();
      setStatus("wmark-status", "");
    } catch (err) {
      setStatus("wmark-status", err && err.message ? err.message : "The file could not be decoded.", true);
    }
  });

  $("wmark-logo").addEventListener("change", async function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    wmarkLogo = null;
    setStatus("wmark-status", "Decoding logo…");
    try {
      var canvas = await decodeToCanvas(file);
      wmarkLogo = { file: file, canvas: canvas };
      setStatus("wmark-status", "Logo ready: " + file.name + ".");
      wmarkSchedule();
    } catch (err) {
      setStatus("wmark-status", "Logo could not be decoded.", true);
    }
  });

  wmarkRun.addEventListener("click", async function () {
    if (!wmarkState) return;
    if (!wmarkIsLogo() && !String($("wmark-text").value).trim()) {
      setStatus("wmark-status", "Enter the watermark text first.", true);
      return;
    }
    if (wmarkIsLogo() && !wmarkLogo) {
      setStatus("wmark-status", "Choose a logo image first.", true);
      return;
    }
    markBusy(wmarkRun, true, "Rendering…");
    setStatus("wmark-status", "");
    try {
      wmarkRenderNow();
      var fmt = $("wmark-format").value;
      var mime = TYPE_TO_MIME[fmt];
      var blob = await canvasToBlob($("wmark-preview"), mime, fmt === "png" ? undefined : 0.92);
      var base = cleanName(baseName(wmarkState.file.name));
      download(blob, base + "-watermarked." + TYPE_TO_EXT[fmt]);
      setStatus(
        "wmark-status",
        "Saved " + base + "-watermarked." + TYPE_TO_EXT[fmt] + " (" + readableBytes(blob.size) + ")."
      );
    } catch (err) {
      setStatus("wmark-status", err && err.message ? err.message : "Watermarking failed.", true);
    } finally {
      markBusy(wmarkRun, false);
    }
  });

  /* ================================================================ */
  /* Filters                                                           */
  /* ================================================================ */

  var filtersState = null; // { file, canvas }
  var filtersRun = $("filters-run");
  var filtersTimer = 0;

  bindRangeOutput("filters-brightness");
  bindRangeOutput("filters-contrast");
  bindRangeOutput("filters-saturation");

  function filtersFilterString() {
    var parts = [];
    var b = Number($("filters-brightness").value);
    if (b) parts.push("brightness(" + (1 + b / 100) + ")");
    var c = Number($("filters-contrast").value);
    if (c) parts.push("contrast(" + (1 + c / 100) + ")");
    var s = Number($("filters-saturation").value);
    if (s) parts.push("saturate(" + (1 + s / 100) + ")");
    if ($("filters-gray").checked) parts.push("grayscale(1)");
    if ($("filters-invert").checked) parts.push("invert(1)");
    return parts.length ? parts.join(" ") : "none";
  }

  function filtersDraw() {
    if (!filtersState) return;
    var cv = $("filters-preview");
    var ctx = cv.getContext("2d");
    cv.hidden = false;
    cv.width = filtersState.canvas.width;
    cv.height = filtersState.canvas.height;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.filter = filtersFilterString();
    ctx.drawImage(filtersState.canvas, 0, 0);
    ctx.filter = "none";
  }

  function filtersSchedule() {
    if (filtersTimer) clearTimeout(filtersTimer);
    filtersTimer = setTimeout(function () {
      filtersTimer = 0;
      filtersDraw();
    }, 60);
  }

  ["filters-brightness", "filters-contrast", "filters-saturation"].forEach(function (id) {
    $(id).addEventListener("input", filtersSchedule);
  });
  ["filters-gray", "filters-invert"].forEach(function (id) {
    $(id).addEventListener("change", filtersSchedule);
  });

  $("filters-file").addEventListener("change", async function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    filtersRun.disabled = true;
    filtersState = null;
    setStatus("filters-status", "Decoding…");
    $("filters-info").textContent = "";
    try {
      var canvas = await decodeToCanvas(file);
      filtersState = { file: file, canvas: canvas };
      $("filters-info").textContent =
        file.name + " — " + readableBytes(file.size) + " — " + canvas.width + "×" + canvas.height + " px";
      filtersRun.disabled = false;
      filtersDraw();
      setStatus("filters-status", "");
    } catch (err) {
      setStatus("filters-status", err && err.message ? err.message : "The file could not be decoded.", true);
    }
  });

  $("filters-reset").addEventListener("click", function () {
    $("filters-brightness").value = "0";
    $("filters-contrast").value = "0";
    $("filters-saturation").value = "0";
    $("filters-gray").checked = false;
    $("filters-invert").checked = false;
    ["filters-brightness", "filters-contrast", "filters-saturation"].forEach(function (id) {
      var out = document.querySelector('output[for="' + id + '"]');
      if (out) out.textContent = "0";
    });
    filtersDraw();
    setStatus("filters-status", "Filters reset.");
  });

  filtersRun.addEventListener("click", async function () {
    if (!filtersState) return;
    markBusy(filtersRun, true, "Encoding…");
    setStatus("filters-status", "");
    try {
      filtersDraw();
      var blob = await canvasToBlob($("filters-preview"), "image/png");
      var base = cleanName(baseName(filtersState.file.name));
      download(blob, base + "-filtered.png");
      setStatus("filters-status", "Saved " + base + "-filtered.png (" + readableBytes(blob.size) + ").");
    } catch (err) {
      setStatus("filters-status", err && err.message ? err.message : "Encoding failed.", true);
    } finally {
      markBusy(filtersRun, false);
    }
  });

  /* ================================================================ */
  /* Batch                                                             */
  /* ================================================================ */

  var batchFiles = [];
  var batchRun = $("batch-run");
  var batchLongest = $("batch-longest");
  bindRangeOutput("batch-quality");

  function batchRefreshList() {
    var ul = $("batch-list");
    ul.textContent = "";
    var total = 0;
    batchFiles.forEach(function (f) {
      total += f.size;
      var li = document.createElement("li");
      var nm = document.createElement("span");
      nm.textContent = baseName(f.name);
      var sz = document.createElement("span");
      sz.className = "fs";
      sz.textContent = readableBytes(f.size);
      li.appendChild(nm);
      li.appendChild(sz);
      ul.appendChild(li);
    });
    $("batch-note").textContent = batchFiles.length
      ? batchFiles.length + " image" + (batchFiles.length === 1 ? "" : "s") + " selected — " + readableBytes(total) + " total."
      : "";
    batchRun.disabled = batchFiles.length === 0;
  }

  function batchUniqueName(used, name) {
    if (!used[name]) {
      used[name] = 1;
      return name;
    }
    var dot = name.lastIndexOf(".");
    var stem = dot > 0 ? name.slice(0, dot) : name;
    var ext = dot > 0 ? name.slice(dot) : "";
    for (var i = 2; i < 10000; i++) {
      var cand = stem + " (" + i + ")" + ext;
      if (!used[cand]) {
        used[cand] = 1;
        return cand;
      }
    }
    return name;
  }

  $("batch-files").addEventListener("change", function (e) {
    batchFiles = Array.prototype.slice.call(e.target.files || []);
    batchRefreshList();
    setStatus("batch-status", "");
    e.target.value = "";
  });

  batchRun.addEventListener("click", async function () {
    if (batchFiles.length === 0) return;
    var fmt = $("batch-format").value;
    var mime = TYPE_TO_MIME[fmt];
    var ext = TYPE_TO_EXT[fmt];
    var quality = mime === "image/png" ? undefined : Number($("batch-quality").value) / 100;
    var longest = Number(batchLongest.value);
    if (!isFinite(longest) || longest <= 0) longest = 0;

    markBusy(batchRun, true, "Converting…");
    setStatus("batch-status", "");
    var entries = {};
    var used = {};
    try {
      for (var i = 0; i < batchFiles.length; i++) {
        var file = batchFiles[i];
        var canvas = await decodeToCanvas(file);
        if (longest > 0) {
          var m = Math.max(canvas.width, canvas.height);
          if (longest < m) {
            var k = longest / m;
            canvas = scaledCanvas(
              canvas,
              Math.max(1, Math.round(canvas.width * k)),
              Math.max(1, Math.round(canvas.height * k))
            );
          }
        }
        var blob = await canvasToBlob(canvas, mime, quality);
        var name = batchUniqueName(used, cleanName(baseName(file.name)) + "." + ext);
        entries[name] = new Uint8Array(await blob.arrayBuffer());
        setStatus("batch-status", "Converted " + (i + 1) + " of " + batchFiles.length + ".");
      }
      await loadFflate();
      var zip = window.fflate.zipSync(entries, { level: 6 });
      var zipName = "images-" + fmt + ".zip";
      download(new Blob([zip], { type: "application/zip" }), zipName);
      setStatus(
        "batch-status",
        "Converted " + batchFiles.length + " image" + (batchFiles.length === 1 ? "" : "s") + " → " + zipName + " (" + readableBytes(zip.length) + ")."
      );
    } catch (err) {
      setStatus("batch-status", err && err.message ? err.message : "Batch conversion failed.", true);
    } finally {
      markBusy(batchRun, false);
    }
  });

  /* ================================================================ */
  /* Init                                                              */
  /* ================================================================ */

  probeAvif().then(function (ok) {
    if (!ok) {
      var label = $("convert-avif-label");
      if (label) {
        label.classList.add("is-disabled");
        var input = label.querySelector("input");
        input.disabled = true;
        input.checked = false;
      }
    }
  });
  updateConvertQualityVisibility();

  /* ================================================================ */
  /* QR code generator (part of the image tools)                       */
  /* ================================================================ */

  var QR_FIELDS = {
    url: [["qr-url", "text", "URL"]],
    text: [["qr-text", "textarea", "Text"]],
    wifi: [
      ["qr-wifi-ssid", "text", "Network name (SSID)"],
      ["qr-wifi-pass", "text", "Password"],
      ["qr-wifi-sec", "select", "Security", ["WPA", "WEP", "WPA2", "nopass"]],
    ],
    vcard: [
      ["qr-vc-name", "text", "Full name"],
      ["qr-vc-phone", "text", "Phone"],
      ["qr-vc-email", "text", "E-mail"],
      ["qr-vc-org", "text", "Organization (optional)"],
    ],
    email: [
      ["qr-em-to", "text", "To"],
      ["qr-em-subject", "text", "Subject"],
      ["qr-em-body", "textarea", "Body"],
    ],
    sms: [
      ["qr-sms-num", "text", "Phone number"],
      ["qr-sms-body", "text", "Message"],
    ],
    tel: [["qr-tel-num", "text", "Phone number"]],
  };

  function qrFieldValue(id) {
    var el = $(id);
    return el ? el.value.trim() : "";
  }

  function qrClean(v) {
    return String(v).replace(/[\\;,:"\n]/g, " ").trim();
  }

  function qrBuildContent(type) {
    if (type === "url") return qrFieldValue("qr-url") || "https://";
    if (type === "text") return $("qr-text") ? $("qr-text").value : "";
    if (type === "wifi") {
      var ssid = qrClean(qrFieldValue("qr-wifi-ssid"));
      var pass = qrClean(qrFieldValue("qr-wifi-pass"));
      var sec = qrFieldValue("qr-wifi-sec");
      if (!ssid) return "";
      var out = "WIFI:T:" + (sec === "nopass" ? "nopass" : sec) + ";S:" + ssid + ";";
      if (sec !== "nopass" && pass) out += "P:" + pass + ";";
      return out + ";";
    }
    if (type === "vcard") {
      var lines = ["BEGIN:VCARD", "VERSION:3.0"];
      var name = qrFieldValue("qr-vc-name");
      if (name) lines.push("FN:" + name);
      var phone = qrFieldValue("qr-vc-phone");
      if (phone) lines.push("TEL:" + phone);
      var email = qrFieldValue("qr-vc-email");
      if (email) lines.push("EMAIL:" + email);
      var org = qrFieldValue("qr-vc-org");
      if (org) lines.push("ORG:" + org);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
    if (type === "email") {
      var to = qrFieldValue("qr-em-to");
      if (!to) return "";
      var subject = qrFieldValue("qr-em-subject");
      var body = qrFieldValue("qr-em-body");
      var mail = "mailto:" + to;
      var parts = [];
      if (subject) parts.push("subject=" + encodeURIComponent(subject));
      if (body) parts.push("body=" + encodeURIComponent(body));
      if (parts.length) mail += "?" + parts.join("&");
      return mail;
    }
    if (type === "sms") {
      var num = qrFieldValue("qr-sms-num");
      if (!num) return "";
      var msg = qrFieldValue("qr-sms-body");
      return msg ? "SMSTO:" + num + ":" + msg : "SMSTO:" + num;
    }
    if (type === "tel") {
      var t = qrFieldValue("qr-tel-num");
      return t ? "TEL:" + t : "";
    }
    return "";
  }

  function qrRenderFields(type) {
    var host = $("qr-fields");
    if (!host) return;
    host.textContent = "";
    (QR_FIELDS[type] || []).forEach(function (def) {
      var id = def[0], kind = def[1], label = def[2];
      var l = document.createElement("label");
      l.className = "field-label";
      l.textContent = label;
      host.appendChild(l);
      var el;
      if (kind === "textarea") {
        el = document.createElement("textarea");
        el.rows = 3;
      } else if (kind === "select") {
        el = document.createElement("select");
        (def[3] || []).forEach(function (opt) {
          var o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          el.appendChild(o);
        });
      } else {
        el = document.createElement("input");
        el.type = kind;
        el.autocomplete = "off";
        el.spellcheck = false;
      }
      el.id = id;
      el.addEventListener("input", qrDraw);
      el.addEventListener("change", qrDraw);
      host.appendChild(el);
    });
  }

  var qrLibPromise = null;
  function qrLoadLib() {
    if (!qrLibPromise) qrLibPromise = loadScript("/image/vendor/qrcode.js");
    return qrLibPromise;
  }

  function qrPaint() {
    var typeEl = $("qr-type");
    var canvas = $("qr-canvas");
    if (!typeEl || !canvas) return;
    var content = qrBuildContent(typeEl.value);
    var size = Number($("qr-size").value);
    canvas.width = size;
    canvas.height = size;
    canvas.style.maxWidth = Math.min(size, 320) + "px";
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    if (!content) {
      setStatus("qr-status", "Fill in the fields to generate a code.");
      return;
    }
    var qr;
    try {
      qr = window.qrcode(0, "M");
      qr.addData(content, "Byte");
      qr.make();
    } catch (err) {
      setStatus("qr-status", "Content is too large for a QR code.", true);
      return;
    }
    var count = qr.getModuleCount();
    var cell = size / (count + 8); // quiet zone of 4 modules per side
    ctx.fillStyle = "#000000";
    var off = 4 * cell;
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(Math.round(off + c * cell), Math.round(off + r * cell), Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
    setStatus("qr-status", "");
  }

  function qrDraw() {
    qrLoadLib().then(qrPaint).catch(function () {
      setStatus("qr-status", "The QR generator could not be loaded.", true);
    });
  }

  // Wired once, the first time the QR tool is shown (activate() calls this).
  function qrStart() {
    var typeEl = $("qr-type");
    if (!typeEl || typeEl._qrWired) return;
    typeEl._qrWired = true;
    typeEl.addEventListener("change", function () {
      qrRenderFields(typeEl.value);
      qrDraw();
    });
    var size = $("qr-size");
    if (size) size.addEventListener("input", qrDraw);
    var dl = $("qr-download");
    if (dl) {
      dl.addEventListener("click", function () {
        var canvas = $("qr-canvas");
        canvas.toBlob(function (blob) {
          if (blob) download(blob, "qrcode.png");
        }, "image/png");
      });
    }
    qrRenderFields(typeEl.value);
    qrDraw();
  }
})();
