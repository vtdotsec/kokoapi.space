// kokoapi.space — /qrcode/ client. Generator (qrcode-generator) + scanner (jsQR).
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  function setStatus(id, text, isError) {
    var el = $(id);
    if (el) {
      el.textContent = text || "";
      el.classList.toggle("is-error", !!isError);
    }
  }

  function flashCopy(btn) {
    var old = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(function () { btn.textContent = old; }, 1500);
  }

  function copyText(text, btn) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flashCopy(btn); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      flashCopy(btn);
    }
  }

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

  /* ---------------- generator ---------------- */

  var FIELD_DEFS = {
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

  function esc(v) {
    return String(v).replace(/[\\;,:"\n]/g, " ").trim();
  }

  function buildContent(type) {
    function val(id) {
      var el = $(id);
      return el ? el.value.trim() : "";
    }
    if (type === "url") return val("qr-url") || "https://";
    if (type === "text") return $("qr-text") ? $("qr-text").value : "";
    if (type === "wifi") {
      var ssid = esc(val("qr-wifi-ssid"));
      var pass = esc(val("qr-wifi-pass"));
      var sec = val("qr-wifi-sec");
      if (!ssid) return "";
      var out = "WIFI:T:" + (sec === "nopass" ? "nopass" : sec) + ";S:" + ssid + ";";
      if (sec !== "nopass" && pass) out += "P:" + pass + ";";
      return out + ";";
    }
    if (type === "vcard") {
      var lines = ["BEGIN:VCARD", "VERSION:3.0"];
      var name = val("qr-vc-name");
      if (name) lines.push("FN:" + name);
      var phone = val("qr-vc-phone");
      if (phone) lines.push("TEL:" + phone);
      var email = val("qr-vc-email");
      if (email) lines.push("EMAIL:" + email);
      var org = val("qr-vc-org");
      if (org) lines.push("ORG:" + org);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
    if (type === "email") {
      var to = val("qr-em-to");
      if (!to) return "";
      var subject = val("qr-em-subject");
      var body = val("qr-em-body");
      var mail = "mailto:" + to;
      var parts = [];
      if (subject) parts.push("subject=" + encodeURIComponent(subject));
      if (body) parts.push("body=" + encodeURIComponent(body));
      if (parts.length) mail += "?" + parts.join("&");
      return mail;
    }
    if (type === "sms") {
      var num = val("qr-sms-num");
      if (!num) return "";
      var msg = val("qr-sms-body");
      return msg ? "SMSTO:" + num + ":" + msg : "SMSTO:" + num;
    }
    if (type === "tel") {
      var t = val("qr-tel-num");
      return t ? "TEL:" + t : "";
    }
    return "";
  }

  function renderFields(type) {
    var host = $("qr-fields");
    host.textContent = "";
    (FIELD_DEFS[type] || []).forEach(function (def) {
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
      el.addEventListener("input", draw);
      el.addEventListener("change", draw);
      host.appendChild(el);
    });
  }

  function draw() {
    var type = $("qr-type").value;
    var content = buildContent(type);
    var size = Number($("qr-size").value);
    var canvas = $("qr-canvas");
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
      qr = qrcode(0, "M");
      qr.addData(content, "Byte");
      qr.make();
    } catch (e) {
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

  function generatorInit() {
    $("qr-type").addEventListener("change", function () {
      renderFields($("qr-type").value);
      draw();
    });
    $("qr-size").addEventListener("input", draw);
    $("qr-download").addEventListener("click", function () {
      var canvas = $("qr-canvas");
      canvas.toBlob(function (blob) {
        if (blob) download(blob, "qrcode.png");
      }, "image/png");
    });
    renderFields($("qr-type").value);
    draw();
  }

  /* ---------------- scanner ---------------- */

  var stream = null;
  var raf = 0;

  function stopCamera() {
    cancelAnimationFrame(raf);
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    $("scan-video").hidden = true;
    $("scan-idle").hidden = false;
    $("scan-idle").textContent = "Camera is off.";
    $("scan-start").disabled = false;
    $("scan-stop").disabled = true;
  }

  function decodeFromImageData(imageData) {
    var code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    return code ? code.data : null;
  }

  function scanLoop(video, canvas) {
    if (!stream) return;
    var w = 480;
    var h = Math.round(video.videoHeight * (w / video.videoWidth));
    canvas.width = w;
    canvas.height = h || 1;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    var data = canvas.getContext("2d").getImageData(0, 0, w, h);
    var text = decodeFromImageData(data);
    if (text) {
      $("scan-result").value = text;
      setStatus("scan-status", "Code detected.");
      stopCamera();
      return;
    }
    raf = requestAnimationFrame(function () { scanLoop(video, canvas); });
  }

  function scannerInit() {
    var video = $("scan-video");
    var canvas = document.createElement("canvas");

    $("scan-start").addEventListener("click", function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("scan-status", "Camera is not available in this browser/context.", true);
        return;
      }
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then(function (s) {
          stream = s;
          video.srcObject = s;
          video.hidden = false;
          $("scan-idle").hidden = true;
          $("scan-start").disabled = true;
          $("scan-stop").disabled = false;
          setStatus("scan-status", "Point the camera at a QR code.");
          video.play();
          raf = requestAnimationFrame(function () { scanLoop(video, canvas); });
        })
        .catch(function () {
          setStatus("scan-status", "Camera access was denied or unavailable.", true);
        });
    });

    $("scan-stop").addEventListener("click", stopCamera);
    $("scan-copy").addEventListener("click", function () {
      copyText($("scan-result").value, $("scan-copy"));
    });

    $("scan-file").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      e.target.value = "";
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        var text = decodeFromImageData(c.getContext("2d").getImageData(0, 0, c.width, c.height));
        if (text) {
          $("scan-result").value = text;
          setStatus("scan-status", "Code detected in the image.");
        } else {
          $("scan-result").value = "";
          setStatus("scan-status", "No QR code found in the image.", true);
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        setStatus("scan-status", "The file could not be read as an image.", true);
      };
      img.src = url;
    });
  }

  /* ---------------- tabs & init ---------------- */

  var TOOLS = ["gen", "scan"];
  var TOOL_LABELS = { gen: "Generate", scan: "Scan" };
  var sideButtons = Array.prototype.slice.call(document.querySelectorAll(".tool-nav button[data-tool]"));
  var sideSelect = document.querySelector(".tool-side .side-select");

  function activate(tool) {
    sideButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
    });
    TOOLS.forEach(function (t) {
      $("tool-" + t).hidden = t !== tool;
    });
    if (sideSelect) sideSelect.value = tool;
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
  activate("gen");

  generatorInit();
  scannerInit();
})();
