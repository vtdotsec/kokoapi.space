// kokoapi.space — /image/ client.
// Local-only image work: Canvas/Blob encode/decode. No libraries beyond fflate
// (used only to package stripped files into a ZIP). Files never leave the browser.

(function () {
  "use strict";

  var fflate = window.fflate;

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

  var TOOLS = ["convert", "resize", "strip"];
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
        var zip = fflate.zipSync(entries, { level: 6 });
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
})();
