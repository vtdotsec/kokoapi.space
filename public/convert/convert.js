/* kokoapi.space — /convert/ client logic.
   All conversion is local; nothing is uploaded. Libraries are vendored under
   /convert/vendor/ because the site runs a strict `script-src 'self'` CSP. */
(function () {
  "use strict";

  var PDFLib = window.PDFLib;
  var pdfjsLib = window.pdfjsLib;
  var fflate = window.fflate;
  var marked = window.marked;
  var jsyaml = window.jsyaml;

  if (!PDFLib || !pdfjsLib || !fflate || !marked || !jsyaml) {
    var p = document.createElement("p");
    p.className = "note";
    p.textContent =
      "A required local library failed to load. The converter needs its vendored scripts to work.";
    p.style.borderLeftColor = "var(--danger)";
    document.body.insertBefore(p, document.body.firstChild);
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/convert/vendor/pdf.worker.min.js";

  /* ================================================================ */
  /* Helpers                                                            */
  /* ================================================================ */

  function $(id) {
    return document.getElementById(id);
  }

  function $q(sel, root) {
    return (root || document).querySelector(sel);
  }

  function setStatus(id, text, isError) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("is-error", !!isError);
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 4000);
  }

  function markBusy(btn, busy, busyLabel) {
    if (busy) {
      if (!btn.dataset.idleLabel) {
        btn.dataset.idleLabel = btn.textContent;
        btn.dataset.idleDisabled = btn.disabled ? "1" : "0";
      }
      btn.disabled = true;
      if (busyLabel) btn.textContent = busyLabel;
    } else {
      if (btn.dataset.idleLabel) {
        btn.textContent = btn.dataset.idleLabel;
        if (btn.dataset.idleDisabled !== "1") btn.disabled = false;
        delete btn.dataset.idleLabel;
      }
    }
  }

  function fmtBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB";
    return (n / 1073741824).toFixed(2) + " GB";
  }

  function baseName(p) {
    p = String(p || "").replace(/\\/g, "/");
    return p.slice(p.lastIndexOf("/") + 1) || "file";
  }

  function stem(p) {
    var n = baseName(p);
    var i = n.lastIndexOf(".");
    return i > 0 ? n.slice(0, i) : n;
  }

  function cleanName(p) {
    var n = String(p || "").replace(/[\\/\x00-\x1f]/g, "_").replace(/^\.+/, "");
    return n || "file";
  }

  function uniqueName(name, used) {
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
    var dot = name.lastIndexOf(".");
    var base = dot > 0 ? name.slice(0, dot) : name;
    var ext = dot > 0 ? name.slice(dot) : "";
    var i = 2;
    var cand = base + " (" + i + ")" + ext;
    while (used.has(cand)) {
      i += 1;
      cand = base + " (" + i + ")" + ext;
    }
    used.add(cand);
    return cand;
  }

  function readU8(file) {
    return file.arrayBuffer().then(function (buf) {
      return new Uint8Array(buf);
    });
  }

  function copyTextSmart(text, fallbackEl) {
    var p = Promise.resolve(false);
    if (navigator.clipboard && window.isSecureContext) {
      p = navigator.clipboard.writeText(text).then(
        function () {
          return true;
        },
        function () {
          return false;
        }
      );
    }
    return p.then(function (ok) {
      if (!ok && fallbackEl) {
        try {
          fallbackEl.focus();
          fallbackEl.select();
          ok = document.execCommand("copy");
        } catch (err) {
          ok = false;
        }
      }
      return ok;
    });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* PDF text needs to stay inside the WinAnsi character set used by pdf-lib
     standard fonts. Map common typographic characters; transliterate the rest. */
  var WIDE_MAP = {
    "\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'",
    "\u201c": '"', "\u201d": '"', "\u201e": '"',
    "\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2013": "-",
    "\u2014": "-", "\u2015": "-", "\u2012": "-", "\u00ad": "-",
    "\u2026": "...", "\u00a0": " ", "\u2022": "-", "\u00b7": "-",
    "\u20ac": "EUR", "\u00a9": "(c)", "\u00ae": "(r)", "\u2122": "(tm)",
    "\u2190": "<-", "\u2191": "^", "\u2192": "->", "\u2193": "v",
    "\u00d7": "x", "\u00f7": "/", "\u2264": "<=", "\u2265": ">=",
    "\u2260": "!=", "\u00ab": '"', "\u00bb": '"', "\u00b9": "1",
    "\u00b2": "2", "\u00b3": "3", "\u00bc": "1/4", "\u00bd": "1/2",
    "\u00be": "3/4"
  };

  function encWide(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var c = s.charCodeAt(i);
      if (c <= 0x7f) {
        out += ch;
        continue;
      }
      if (WIDE_MAP[ch] !== undefined) {
        out += WIDE_MAP[ch];
        continue;
      }
      var ok = "";
      if (c >= 0xa0 && c <= 0xff) {
        ok = ch;
      } else {
        var nf;
        try {
          nf = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        } catch (err) {
          nf = ch;
        }
        for (var j = 0; j < nf.length; j++) {
          var cc = nf.charCodeAt(j);
          if (cc >= 0xa0 && cc <= 0xff) ok += nf.charAt(j);
        }
      }
      out += ok || "?";
    }
    return out;
  }

  function encSafe(t) {
    return encWide(String(t)).replace(/[ \t\r\n\f\v\u00a0]+/g, " ");
  }

  /* ================================================================ */
  /* 1. Markdown → HTML                                                 */
  /* ================================================================ */

  var mhSrc = $("cv-md2html-src");
  var mhRun = $("cv-md2html-run");
  var mhDl = $("cv-md2html-dl");
  var mhStatus = "cv-md2html-status";
  var mhBusy = false;
  var mhLastHtml = "";

  function mhRefresh() {
    mhRun.disabled = mhBusy || !mhSrc.value.trim();
    mhDl.disabled = !mhLastHtml;
  }

  mhSrc.addEventListener("input", mhRefresh);

  function wrapHtmlPage(bodyHtml, title) {
    return (
      "<!doctype html>\n<html lang=\"en\">\n<head>\n" +
      "<meta charset=\"utf-8\">\n" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
      "<title>" + escapeHtml(title) + "</title>\n" +
      "<style>\n" +
      "body{max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#17181d}\n" +
      "code,pre{font-family:ui-monospace,Menlo,Consolas,monospace}\n" +
      "pre{background:#f6f7f8;border:1px solid #e3e4e8;padding:.6rem .8rem;overflow:auto}\n" +
      "blockquote{border-left:3px solid #cfd1d8;margin-left:0;padding-left:.9rem;color:#4a4d57}\n" +
      "img{max-width:100%}table{border-collapse:collapse}\n" +
      "td,th{border:1px solid #e3e4e8;padding:.3rem .6rem}\n" +
      "h1,h2,h3{line-height:1.25}\n" +
      "</style>\n</head>\n<body>\n" +
      bodyHtml +
      "\n</body>\n</html>\n"
    );
  }

  function h1FromHtml(html) {
    var tpl = document.createElement("template");
    tpl.innerHTML = html;
    var h = tpl.content.querySelector("h1");
    return h ? h.textContent.trim() : "";
  }

  function fileWord(s) {
    var m = String(s || "").match(/[A-Za-z0-9]+/);
    return m ? m[0].toLowerCase() : "";
  }

  mhRun.addEventListener("click", function () {
    var src = mhSrc.value;
    if (!src.trim() || mhBusy) return;
    mhBusy = true;
    mhRefresh();
    markBusy(mhRun, true, "Converting…");
    setStatus(mhStatus, "");
    try {
      mhLastHtml = marked.parse(src);
      $("cv-md2html-out").innerHTML = mhLastHtml;
      $("cv-md2html-out").hidden = false;
      var rawPre = $("cv-md2html-raw-pre");
      rawPre.textContent = mhLastHtml;
      $("cv-md2html-raw").hidden = false;
      setStatus(mhStatus, "Rendered " + mhLastHtml.length + " characters of HTML.");
    } catch (err) {
      setStatus(mhStatus, (err && err.message) || "Could not parse this Markdown.", true);
    } finally {
      markBusy(mhRun, false);
      mhBusy = false;
      mhRefresh();
    }
  });

  mhDl.addEventListener("click", function () {
    if (!mhLastHtml) return;
    var title = h1FromHtml(mhLastHtml) || "Converted";
    var blob = new Blob([wrapHtmlPage(mhLastHtml, title)], {
      type: "text/html;charset=utf-8"
    });
    var name = (fileWord(title) || "converted") + ".html";
    download(blob, name);
    setStatus(mhStatus, "Downloaded " + name + ".");
  });

  /* ================================================================ */
  /* 2. Markdown / HTML → PDF (pdf-lib, standard fonts)                 */
  /* ================================================================ */

  var PAGE_W = 595.28; // A4 portrait, points
  var PAGE_H = 841.89;
  var MARGIN = 56;

  var STYLE_INLINE = {
    b: 1, strong: 1, i: 1, em: 1, code: 1, a: 1, span: 1, u: 1,
    small: 1, s: 1, strike: 1, del: 1, ins: 1, tt: 1, kbd: 1, label: 1, mark: 1
  };

  var TEXT_INK = null; // filled below, needs PDFLib

  function makeColors() {
    function ink(hex) {
      var n = parseInt(hex.slice(1), 16);
      return PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
    }
    TEXT_INK = ink("#17181d");
    return {
      text: TEXT_INK,
      sub: ink("#3f424b"),
      link: ink("#4f46e5"),
      fade: ink("#e9eaee"),
      rule: ink("#c9cbd2")
    };
  }
  var COLORS = makeColors();
  var CW = PAGE_W - 2 * MARGIN;

  function domToBlocks(html) {
    var tpl = document.createElement("template");
    tpl.innerHTML = html;
    var out = [];
    flowNodes(tpl.content, out, { b: 0, i: 0, m: 0, link: 0 });
    return out;
  }

  function cloneSt(st) {
    return { b: st.b, i: st.i, m: st.m, link: st.link };
  }

  function styleFor(tag, st) {
    var s = cloneSt(st);
    if (tag === "b" || tag === "strong") s.b = 1;
    if (tag === "i" || tag === "em") s.i = 1;
    if (tag === "code" || tag === "tt" || tag === "kbd") s.m = 1;
    if (tag === "a") s.link = 1;
    return s;
  }

  function inlineTokens(node, st) {
    var out = [];
    for (var i = 0; i < node.childNodes.length; i++) {
      var ch = node.childNodes[i];
      if (!ch || ch.nodeType === 8) continue;
      if (ch.nodeType === 3) {
        var t = encSafe(ch.data);
        if (t) out.push({ t: t, st: st });
        continue;
      }
      if (ch.nodeType !== 1) continue;
      var tag = (ch.tagName || "").toLowerCase();
      if (tag === "br") {
        out.push({ br: 1 });
      } else if (tag === "img") {
        var alt = ch.getAttribute("alt") || "";
        if (alt) out.push({ t: encSafe(alt), st: st });
      } else if (STYLE_INLINE[tag]) {
        var sub = inlineTokens(ch, styleFor(tag, st));
        for (var k = 0; k < sub.length; k++) out.push(sub[k]);
      } else {
        /* Block-level tag inside an inline context: flatten, but force a break. */
        if (out.length && !out[out.length - 1].br) out.push({ br: 1 });
        var flat = inlineTokens(ch, st);
        for (var j = 0; j < flat.length; j++) out.push(flat[j]);
      }
    }
    return out;
  }

  function preText(el) {
    return String(el.textContent || "").replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  }

  function parseList(el, ordered, st) {
    var items = [];
    for (var i = 0; i < el.children.length; i++) {
      var li = el.children[i];
      if ((li.tagName || "").toLowerCase() !== "li") continue;
      items.push(liContent(li, st));
    }
    return { kind: "list", ordered: !!ordered, items: items };
  }

  function liContent(li, st) {
    var item = { runs: [], sub: [] };
    for (var i = 0; i < li.childNodes.length; i++) {
      var ch = li.childNodes[i];
      if (!ch || ch.nodeType === 8) continue;
      if (ch.nodeType === 3) {
        var t = encSafe(ch.data);
        if (t) item.runs.push({ t: t, st: st });
        continue;
      }
      if (ch.nodeType !== 1) continue;
      var tag = (ch.tagName || "").toLowerCase();
      if (tag === "br") {
        item.runs.push({ br: 1 });
      } else if (STYLE_INLINE[tag]) {
        var tok = inlineTokens(ch, styleFor(tag, st));
        for (var k = 0; k < tok.length; k++) item.runs.push(tok[k]);
      } else if (tag === "ul" || tag === "ol") {
        item.sub.push(parseList(ch, tag === "ol", st));
      } else if (tag === "p" || tag === "div") {
        if (item.runs.length && !item.runs[item.runs.length - 1].br) {
          item.runs.push({ br: 1 });
        }
        var pTok = inlineTokens(ch, st);
        for (var m = 0; m < pTok.length; m++) item.runs.push(pTok[m]);
      } else if (tag === "pre") {
        item.sub.push({ kind: "pre", text: preText(ch) });
      } else if (tag === "blockquote") {
        var inner = [];
        flowNodes(ch.childNodes, inner, st);
        item.sub.push({ kind: "quote", blocks: inner });
      } else if (tag === "img") {
        var alt2 = ch.getAttribute("alt") || "";
        if (alt2) item.runs.push({ t: encSafe(alt2), st: st });
      } else if (tag === "hr") {
        item.sub.push({ kind: "hr" });
      } else {
        /* generic container inside a list item */
        var gen = liContent(ch, st);
        for (var g = 0; g < gen.runs.length; g++) item.runs.push(gen.runs[g]);
        for (var s = 0; s < gen.sub.length; s++) item.sub.push(gen.sub[s]);
      }
    }
    return item;
  }

  function flowNodes(nodes, sink, st) {
    var open = null;
    function para() {
      if (!open) open = { kind: "p", runs: [] };
      return open;
    }
    function close() {
      if (open) {
        if (open.runs.length) sink.push(open);
        open = null;
      }
    }
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node || node.nodeType === 8) continue;
      if (node.nodeType === 3) {
        var t = encSafe(node.data);
        if (t) para().runs.push({ t: t, st: st });
        continue;
      }
      if (node.nodeType !== 1) continue;
      var tag = (node.tagName || "").toLowerCase();
      if (tag === "br") {
        para().runs.push({ br: 1 });
        continue;
      }
      if (STYLE_INLINE[tag]) {
        var toks = inlineTokens(node, styleFor(tag, st));
        if (toks.length) {
          var p = para();
          for (var m = 0; m < toks.length; m++) p.runs.push(toks[m]);
        }
        continue;
      }
      close();
      if (/^h[1-6]$/.test(tag)) {
        sink.push({ kind: "h", level: parseInt(tag.charAt(1), 10), runs: inlineTokens(node, st) });
      } else if (tag === "p") {
        sink.push({ kind: "p", runs: inlineTokens(node, st) });
      } else if (tag === "pre") {
        sink.push({ kind: "pre", text: preText(node) });
      } else if (tag === "blockquote") {
        var inner = [];
        flowNodes(node.childNodes, inner, st);
        if (inner.length) sink.push({ kind: "quote", blocks: inner });
      } else if (tag === "ul" || tag === "ol") {
        sink.push(parseList(node, tag === "ol", st));
      } else if (tag === "hr") {
        sink.push({ kind: "hr" });
      } else if (tag === "img") {
        var alt = node.getAttribute("alt") || "";
        if (alt) sink.push({ kind: "p", runs: [{ t: encSafe(alt), st: st }] });
      } else if (tag === "table") {
        var rows = node.querySelectorAll("tr");
        var lines = [];
        for (var r = 0; r < rows.length; r++) {
          var cells = rows[r].querySelectorAll("th, td");
          var parts = [];
          for (var c = 0; c < cells.length; c++) {
            var cell = String(cells[c].textContent || "").replace(/\s+/g, " ").trim();
            if (cell) parts.push(cell);
          }
          if (parts.length) lines.push(parts.join(" | "));
        }
        if (lines.length) sink.push({ kind: "pre", text: lines.join("\n") });
      } else {
        /* generic block container — transparent */
        flowNodes(node.childNodes, sink, st);
        close();
      }
    }
    close();
  }

  function firstH1Text(blocks) {
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.kind === "h" && b.level === 1) {
        var s = "";
        for (var j = 0; j < b.runs.length; j++) {
          if (!b.runs[j].br) s += b.runs[j].t;
        }
        s = s.replace(/\s+/g, " ").trim();
        if (s) return s;
      }
      if (b.kind === "quote") {
        var q = firstH1Text(b.blocks || []);
        if (q) return q;
      }
    }
    return "";
  }

  function newPage(ctx) {
    ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN;
  }

  function ensureFit(ctx, lead) {
    if (ctx.y - lead < MARGIN) newPage(ctx);
  }

  function fontKeyFor(st) {
    if (st.m) return st.b ? "mb" : "m";
    if (st.b && st.i) return "bi";
    if (st.b) return "b";
    if (st.i) return "i";
    return "n";
  }

  function fitCount(s, font, size, maxW) {
    if (!s || font.widthOfTextAtSize(s, size) <= maxW) return s.length;
    var lo = 0;
    var hi = s.length;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (font.widthOfTextAtSize(s.slice(0, mid), size) <= maxW) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function renderWrapped(ctx, x, w, tokens, opt) {
    if (!tokens || !tokens.length) return;
    var size = opt.size;
    var lead = opt.leading || Math.round(size * 145) / 100;
    var color = opt.color || COLORS.text;
    var line = [];
    var lineW = 0;

    function fontKey(st) {
      var k = fontKeyFor(st);
      if (opt.bold) {
        k = k === "n" ? "b" : k === "i" ? "bi" : k === "m" ? "mb" : k;
      }
      return k;
    }
    function flush() {
      if (!line.length) return;
      ensureFit(ctx, lead);
      var lx = x;
      for (var i = 0; i < line.length; i++) {
        var wd = line[i];
        var f = ctx.fonts[wd.k];
        var col = wd.st && wd.st.link ? COLORS.link : color;
        var ww = f.widthOfTextAtSize(wd.w, size);
        ctx.page.drawText(wd.w, { x: lx, y: ctx.y, size: size, font: f, color: col });
        lx += ww + f.widthOfTextAtSize(" ", size);
      }
      ctx.y -= lead;
      line = [];
      lineW = 0;
    }
    function addWord(word, st) {
      var k = fontKey(st);
      var f = ctx.fonts[k];
      var ww = f.widthOfTextAtSize(word, size);
      var sp = f.widthOfTextAtSize(" ", size);
      if (line.length && lineW + sp + ww > w) flush();
      if (!line.length) lineW = ww;
      else lineW += sp + ww;
      line.push({ w: word, k: k, st: st });
    }

    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (tk.br) {
        if (line.length) flush();
        continue;
      }
      var text = tk.t;
      if (!text) continue;
      var parts = text.split(/\s+/);
      for (var p = 0; p < parts.length; p++) {
        if (parts[p]) addWord(parts[p], tk.st);
      }
    }
    flush();
  }

  function renderHeading(ctx, b, x, w) {
    var map = { 1: [19, 12, 6], 2: [15, 10, 4], 3: [12.5, 8, 3], 4: [10.5, 6, 3], 5: [10.5, 6, 2], 6: [10.5, 6, 2] };
    var m = map[b.level] || map[3];
    ensureFit(ctx, m[0] * 1.35);
    ctx.y -= m[1];
    renderWrapped(ctx, x, w, b.runs || [], { size: m[0], color: COLORS.text, bold: true });
    ctx.y -= m[2];
  }

  function renderPre(ctx, b, x, w) {
    if (!b.text) return;
    var size = 8.5;
    var lead = Math.round(size * 145) / 100;
    var font = ctx.fonts.m;
    var color = COLORS.sub;
    var srcLines = b.text.split("\n");
    var laid = [];
    var total = 0;
    for (var i = 0; i < srcLines.length; i++) {
      var line = srcLines[i].replace(/\t/g, "    ");
      if (!line.length) {
        laid.push("");
        total += lead;
        continue;
      }
      if (font.widthOfTextAtSize(line, size) <= w) {
        laid.push(line);
        total += lead;
      } else {
        var rest = line;
        while (rest.length) {
          var n = fitCount(rest, font, size, w);
          if (n === 0) break;
          laid.push(rest.slice(0, n));
          total += lead;
          rest = rest.slice(n);
        }
      }
    }
    if (ctx.y - total >= MARGIN) {
      var bottom = ctx.y - total - 1;
      ctx.page.drawRectangle({ x: x - 6, y: bottom, width: w + 12, height: total + 6, color: COLORS.fade });
      for (var j = 0; j < laid.length; j++) {
        if (laid[j]) ctx.page.drawText(laid[j], { x: x, y: ctx.y, size: size, font: font, color: color });
        ctx.y -= lead;
      }
    } else {
      for (var k = 0; k < laid.length; k++) {
        ensureFit(ctx, lead);
        if (laid[k]) ctx.page.drawText(laid[k], { x: x, y: ctx.y, size: size, font: font, color: color });
        ctx.y -= lead;
      }
    }
  }

  function renderQuote(ctx, b, x, w, qd) {
    var blocks = b.blocks || [];
    if (!blocks.length) return;
    var innerX = x + 14;
    var innerW = w - 14;
    var startPg = ctx.page;
    var startY = ctx.y;
    renderFlowBlocks(ctx, blocks, innerX, innerW, qd + 1);
    if (ctx.page === startPg && ctx.y < startY) {
      ctx.page.drawRectangle({ x: x, y: ctx.y + 2, width: 2.5, height: startY - ctx.y + 4, color: COLORS.rule });
    }
    ctx.y -= 8;
  }

  function renderList(ctx, lst, x, w, qd) {
    var color = qd ? COLORS.sub : COLORS.text;
    var size = 10.5;
    var mf = ctx.fonts.b;
    var items = lst.items || [];
    var ordered = !!lst.ordered;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.runs.length && !item.sub.length) continue;
      var marker = ordered ? i + 1 + ". " : i % 2 === 0 ? "- " : "+ ";
      var mw = mf.widthOfTextAtSize(marker, size) + 2;
      if (ctx.y - size * 1.6 < MARGIN) newPage(ctx);
      ctx.page.drawText(marker, { x: x, y: ctx.y, size: size, font: mf, color: color });
      if (item.runs.length) {
        renderWrapped(ctx, x + mw, w - mw, item.runs, { size: size, color: color });
      }
      if (item.sub.length) {
        renderFlowBlocks(ctx, item.sub, x + mw, w - mw, qd);
      }
      ctx.y -= 3;
    }
    ctx.y -= 4;
  }

  function renderFlowBlocks(ctx, blocks, x, w, qd) {
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      switch (b.kind) {
        case "p":
          renderWrapped(ctx, x, w, b.runs || [], { size: 10.5, color: qd ? COLORS.sub : COLORS.text });
          ctx.y -= 6;
          break;
        case "h":
          renderHeading(ctx, b, x, w);
          break;
        case "pre":
          renderPre(ctx, b, x, w);
          ctx.y -= 4;
          break;
        case "quote":
          renderQuote(ctx, b, x, w, qd);
          break;
        case "hr":
          if (ctx.y - 20 < MARGIN) newPage(ctx);
          ctx.page.drawRectangle({ x: x, y: ctx.y - 7, width: w, height: 0.8, color: COLORS.rule });
          ctx.y -= 14;
          break;
        case "list":
          renderList(ctx, b, x, w, qd);
          break;
        default:
          break;
      }
    }
  }

  async function htmlToPdfBytes(html) {
    var doc = await PDFLib.PDFDocument.create();
    var ctx = { doc: doc, page: null, y: 0, fonts: {} };
    newPage(ctx);
    var defs = [
      ["n", PDFLib.StandardFonts.Helvetica],
      ["b", PDFLib.StandardFonts.HelveticaBold],
      ["i", PDFLib.StandardFonts.HelveticaOblique],
      ["bi", PDFLib.StandardFonts.HelveticaBoldOblique],
      ["m", PDFLib.StandardFonts.Courier],
      ["mb", PDFLib.StandardFonts.CourierBold]
    ];
    for (var i = 0; i < defs.length; i++) {
      ctx.fonts[defs[i][0]] = await doc.embedFont(defs[i][1]);
    }
    var blocks = domToBlocks(html);
    renderFlowBlocks(ctx, blocks, MARGIN, CW, 0);
    var title = firstH1Text(blocks);
    if (title) doc.setTitle(title);
    doc.setCreator("kokoapi.space File converter");
    return { bytes: await doc.save(), title: title };
  }

  var m2pSrc = $("cv-m2p-src");
  var m2pRun = $("cv-m2p-run");
  var m2pBusy = false;

  function m2pMode() {
    var el = $q('input[name="cv-m2p-mode"]:checked');
    return el ? el.value : "md";
  }
  function m2pRefresh() {
    m2pRun.disabled = m2pBusy || !m2pSrc.value.trim();
  }
  m2pSrc.addEventListener("input", m2pRefresh);
  var m2pRadios = document.querySelectorAll('input[name="cv-m2p-mode"]');
  for (var m2i = 0; m2i < m2pRadios.length; m2i++) {
    m2pRadios[m2i].addEventListener("change", function () {
      setStatus("cv-m2p-status", "");
    });
  }

  m2pRun.addEventListener("click", async function () {
    var src = m2pSrc.value;
    if (!src.trim() || m2pBusy) return;
    m2pBusy = true;
    m2pRefresh();
    markBusy(m2pRun, true, "Building PDF…");
    setStatus("cv-m2p-status", "");
    try {
      var html = m2pMode() === "md" ? marked.parse(src) : src;
      var out = await simpleTextPdf(src, m2pMode() === "md");
      var name = (fileWord(out.title) || "document") + ".pdf";
      download(new Blob([out.bytes], { type: "application/pdf" }), name);
      setStatus("cv-m2p-status", "Created " + name + " (" + fmtBytes(out.bytes.length) + ").");
    } catch (err) {
      setStatus("cv-m2p-status", (err && err.message) || "PDF export failed.", true);
    } finally {
      markBusy(m2pRun, false);
      m2pBusy = false;
      m2pRefresh();
    }
  });

  /* ================================================================ */
  /* 3. PDF → TXT (pdf.js)                                              */
  /* ================================================================ */

  var p2tFile = $("cv-pdf2txt-file");
  var p2tCopy = $("cv-pdf2txt-copy");
  var p2tDl = $("cv-pdf2txt-dl");
  var p2tOut = $("cv-pdf2txt-out");
  var p2tBusy = false;
  var p2tText = null;
  var p2tName = "";

  function p2tRefresh() {
    var has = p2tText !== null;
    p2tCopy.disabled = p2tBusy || !has;
    p2tDl.disabled = p2tBusy || !has;
  }

  p2tFile.addEventListener("change", async function () {
    var file = p2tFile.files && p2tFile.files[0];
    if (!file) return;
    p2tFile.value = "";
    p2tBusy = true;
    p2tText = null;
    p2tName = file.name;
    p2tOut.value = "";
    $("cv-pdf2txt-info").hidden = true;
    p2tRefresh();
    setStatus("cv-pdf2txt-status", "Reading " + file.name + "…");
    var doc = null;
    try {
      var u8 = await readU8(file);
      var task = pdfjsLib.getDocument({ data: u8 });
      try {
        doc = await task.promise;
      } catch (err) {
        if (err && err.name === "PasswordException") {
          throw new Error("This PDF is encrypted and needs a password — it cannot be opened without one.");
        }
        throw err;
      }
      var chunks = [];
      for (var i = 0; i < doc.numPages; i++) {
        var page = await doc.getPage(i);
        var content = await page.getTextContent();
        var rows = {};
        var order = [];
        for (var k = 0; k < content.items.length; k++) {
          var it = content.items[k];
          if (!it || typeof it.str !== "string") continue;
          if (!it.str && !it.hasEOL) continue;
          var tr = it.transform;
          var yk = Math.round(tr[5] * 2) / 2;
          if (rows[yk] === undefined) {
            rows[yk] = [];
            order.push(yk);
          }
          rows[yk].push({ x: tr[4], str: it.str, eol: !!it.hasEOL });
        }
        order.sort(function (a, b) {
          return b - a;
        });
        var pageLines = [];
        for (var r = 0; r < order.length; r++) {
          var items = rows[order[r]];
          items.sort(function (a, b) {
            return a.x - b.x;
          });
          var lineText = "";
          for (var c = 0; c < items.length; c++) {
            if (c > 0) {
              var prev = items[c - 1];
              if (prev.eol || !lineText || /\s$/.test(lineText)) lineText += items[c].str;
              else lineText += " " + items[c].str;
            } else {
              lineText = items[c].str;
            }
          }
          pageLines.push(lineText.replace(/\s+$/, ""));
        }
        chunks.push(pageLines.join("\n"));
        if (doc.numPages > 1) {
          setStatus("cv-pdf2txt-status", "Read page " + (i + 1) + " of " + doc.numPages + ".");
        }
      }
      var text = chunks.join("\n\n").replace(/\n{3,}/g, "\n\n");
      p2tText = text;
      p2tOut.value = text;
      $("cv-pdf2txt-info").hidden = false;
      $("cv-pdf2txt-info").textContent =
        file.name + " — " + doc.numPages + " page" + (doc.numPages === 1 ? "" : "s") + ", " + text.length + " characters.";
      if (!text.trim()) {
        setStatus("cv-pdf2txt-status", "No selectable text was found — this PDF probably contains scanned images (no OCR is performed).");
      } else {
        setStatus("cv-pdf2txt-status", "Extracted " + text.length + " characters from " + doc.numPages + " page" + (doc.numPages === 1 ? "" : "s") + ".");
      }
    } catch (err) {
      setStatus("cv-pdf2txt-status", (err && err.message) || "\u201c" + file.name + "\u201d could not be read as a PDF.", true);
    } finally {
      if (doc) {
        try {
          doc.destroy();
        } catch (err) {}
      }
      p2tBusy = false;
      p2tRefresh();
    }
  });

  p2tCopy.addEventListener("click", function () {
    if (p2tText === null) return;
    copyTextSmart(p2tText, p2tOut).then(function (ok) {
      setStatus("cv-pdf2txt-status", ok ? "Copied to the clipboard." : "Copy failed — select the text and copy manually.", !ok);
    });
  });

  p2tDl.addEventListener("click", function () {
    if (p2tText === null) return;
    var blob = new Blob([p2tText], { type: "text/plain;charset=utf-8" });
    var name = cleanName(stem(p2tName)) + ".txt";
    download(blob, name);
    setStatus("cv-pdf2txt-status", "Downloaded " + name + ".");
  });

  /* ================================================================ */
  /* 4. Convert images (batch) → ZIP (canvas + fflate)                  */
  /* ================================================================ */

  var MIME_BY_FMT = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };

  function loadImageEl(url) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () {
        res(im);
      };
      im.onerror = function () {
        rej(new Error("The browser could not decode this image."));
      };
      im.src = url;
    });
  }

  async function decodeImage(file) {
    var src = null;
    var revoke = null;
    if (window.createImageBitmap) {
      try {
        var bmp = await createImageBitmap(file);
        src = {
          width: bmp.width,
          height: bmp.height,
          draw: function (ctx) {
            ctx.drawImage(bmp, 0, 0);
          },
          close: function () {
            try {
              bmp.close();
            } catch (err) {}
          }
        };
      } catch (err) {
        src = null;
      }
    }
    if (!src) {
      var url = URL.createObjectURL(file);
      revoke = url;
      var img = await loadImageEl(url);
      src = {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: function (ctx) {
          ctx.drawImage(img, 0, 0);
        },
        close: function () {}
      };
    }
    return {
      src: src,
      revoke: revoke
    };
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise(function (res, rej) {
      canvas.toBlob(
        function (blob) {
          if (blob) res(blob);
          else rej(new Error("The canvas could not be encoded as " + mime + "."));
        },
        mime,
        quality
      );
    });
  }

  var img2FilesInput = $("cv-img2-files");
  var img2Run = $("cv-img2-run");
  var img2Busy = false;
  var img2Files = [];

  function img2Refresh() {
    img2Run.disabled = img2Busy || img2Files.length === 0;
  }

  function renderFileList(listId, files) {
    var ul = $(listId);
    ul.textContent = "";
    files.forEach(function (f) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.textContent = baseName(f.name);
      var size = document.createElement("span");
      size.className = "fs";
      size.textContent = fmtBytes(f.size);
      li.appendChild(name);
      li.appendChild(size);
      ul.appendChild(li);
    });
    ul.hidden = files.length === 0;
  }

  function updateFilesNote(noteId, files) {
    var note = $(noteId);
    if (!files.length) {
      note.hidden = true;
      return;
    }
    var total = 0;
    files.forEach(function (f) {
      total += f.size;
    });
    note.textContent = files.length + " file" + (files.length === 1 ? "" : "s") + " · " + fmtBytes(total);
    note.hidden = false;
  }

  img2FilesInput.addEventListener("change", function () {
    img2Files = Array.prototype.slice.call(img2FilesInput.files || []);
    renderFileList("cv-img2-list", img2Files);
    updateFilesNote("cv-img2-files-note", img2Files);
    img2Refresh();
  });

  var img2Fmt = $("cv-img2-fmt");
  var img2Quality = $("cv-img2-quality");
  var img2QualityOut = $q('output[for="cv-img2-quality"]');
  img2Quality.addEventListener("input", function () {
    img2QualityOut.textContent = img2Quality.value;
  });

  function img2ShowQuality() {
    var lossy = img2Fmt.value === "jpeg" || img2Fmt.value === "webp";
    $("cv-img2-quality-row").hidden = !lossy;
  }
  img2Fmt.addEventListener("change", img2ShowQuality);

  img2Run.addEventListener("click", async function () {
    if (img2Busy || img2Files.length === 0) return;
    img2Busy = true;
    img2Refresh();
    markBusy(img2Run, true, "Converting…");
    setStatus("cv-img2-status", "");
    var fmt = img2Fmt.value;
    var mime = MIME_BY_FMT[fmt];
    var quality = parseInt(img2Quality.value, 10) / 100;
    var entries = {};
    var used = new Set();
    var okCount = 0;
    var errors = [];
    try {
      for (var i = 0; i < img2Files.length; i++) {
        var file = img2Files[i];
        setStatus("cv-img2-status", "Converting " + (i + 1) + " of " + img2Files.length + " (" + baseName(file.name) + ")…");
        try {
          var outName = uniqueName(stem(file.name) + "." + fmt, used);
          var dec = await decodeImage(file);
          try {
            var W = dec.src.width;
            var H = dec.src.height;
            if (!W || !H) throw new Error("No dimensions could be read.");
            if (W * H > 60000000) {
              throw new Error(W + "×" + H + " is too large to process in the browser.");
            }
            var canvas = document.createElement("canvas");
            canvas.width = W;
            canvas.height = H;
            var ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas 2D is not available.");
            if (fmt === "jpeg") {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, W, H);
            }
            dec.src.draw(ctx);
            var blob = await canvasToBlob(canvas, mime, fmt === "png" ? undefined : quality);
            entries[outName] = new Uint8Array(await blob.arrayBuffer());
            okCount += 1;
          } finally {
            dec.src.close();
            if (dec.revoke) URL.revokeObjectURL(dec.revoke);
          }
        } catch (err) {
          errors.push(baseName(file.name) + ": " + ((err && err.message) || "conversion failed"));
        }
      }
      if (!okCount) {
        throw new Error("No file could be converted. " + errors.join(" "));
      }
      var zipName = "images-" + fmt + ".zip";
      var zipBytes = fflate.zipSync(entries, { level: 6 });
      download(new Blob([zipBytes], { type: "application/zip" }), zipName);
      var msg = "Downloaded " + zipName + " with " + okCount + " file" + (okCount === 1 ? "" : "s") + ".";
      if (errors.length) msg += " Skipped " + errors.length + ": " + errors.join(" ");
      setStatus("cv-img2-status", msg, errors.length === okCount);
    } catch (err) {
      setStatus("cv-img2-status", (err && err.message) || "Image conversion failed.", true);
    } finally {
      markBusy(img2Run, false);
      img2Busy = false;
      img2Refresh();
    }
  });

  /* ================================================================ */
  /* 5. JSON ↔ CSV                                                      */
  /* ================================================================ */

  function csvEscape(v) {
    var s = String(v === undefined || v === null ? "" : v);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function parseCsv(text) {
    var src = String(text).replace(/^\uFEFF/, "");
    var rows = [];
    var row = [];
    var field = "";
    var inQ = false;
    var i = 0;
    while (i < src.length) {
      var ch = src.charAt(i);
      if (inQ) {
        if (ch === '"') {
          if (src.charAt(i + 1) === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQ = false;
          i += 1;
          continue;
        }
        field += ch;
        i += 1;
        continue;
      }
      if (ch === '"') {
        inQ = true;
        i += 1;
        continue;
      }
      if (ch === ",") {
        row.push(field);
        field = "";
        i += 1;
        continue;
      }
      if (ch === "\r") {
        if (src.charAt(i + 1) === "\n") i += 1;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i += 1;
        continue;
      }
      if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
    }
    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }
    while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
      rows.pop();
    }
    return rows;
  }

  function jsonToCsv(data) {
    var keys = [];
    var keySeen = {};
    var rowCount = 0;
    var isRowsArray = Array.isArray(data);

    function registerKey(k) {
      if (!keySeen[k]) {
        keySeen[k] = true;
        keys.push(k);
      }
    }
    function scalar(v) {
      return v === null || v === undefined || typeof v === "string" ||
        typeof v === "number" || typeof v === "boolean";
    }

    if (isRowsArray) {
      for (var r = 0; r < data.length; r++) {
        var obj = data[r];
        if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
          throw new Error("Row " + (r + 1) + " is not a flat object. JSON → CSV needs an array of flat objects.");
        }
        for (var k in obj) {
          if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
          if (!scalar(obj[k])) {
            throw new Error("Row " + (r + 1) + ", key \u201c" + k + "\u201d is an object/array; only flat scalar values are supported.");
          }
          registerKey(k);
        }
      }
      rowCount = data.length;
    } else if (data && typeof data === "object") {
      for (var col in data) {
        if (!Object.prototype.hasOwnProperty.call(data, col)) continue;
        if (!Array.isArray(data[col])) {
          throw new Error("Key \u201c" + col + "\u201d is not an array. An object input must map column names to arrays of equal length.");
        }
        registerKey(col);
        rowCount = Math.max(rowCount, data[col].length);
      }
    } else {
      throw new Error("JSON must be an array of flat objects or an object of arrays.");
    }

    var out = [keys.map(csvEscape).join(",")];
    for (var i = 0; i < rowCount; i++) {
      var cells = [];
      for (var j = 0; j < keys.length; j++) {
        var val = "";
        if (isRowsArray) {
          var rec = data[i];
          if (rec && rec[keys[j]] !== undefined) val = rec[keys[j]];
        } else {
          var arr = data[keys[j]];
          if (arr && i < arr.length && arr[i] !== undefined) val = arr[i];
        }
        cells.push(csvEscape(val));
      }
      out.push(cells.join(","));
    }
    return out.join("\n") + "\n";
  }

  function csvToJson(text) {
    var rows = parseCsv(text);
    if (!rows.length) throw new Error("No data found — the CSV needs at least a header row.");
    var header = rows[0].map(function (h) {
      return String(h).trim();
    });
    var seen = {};
    for (var i = 0; i < header.length; i++) {
      if (!header[i]) throw new Error("Column " + (i + 1) + " of the header row is empty.");
      if (seen[header[i]]) throw new Error("Duplicate column name \u201c" + header[i] + "\u201d in the header row.");
      seen[header[i]] = true;
    }
    var out = [];
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (row.length > header.length) {
        throw new Error("Row " + r + " has " + row.length + " values but the header has " + header.length + " columns.");
      }
      var obj = {};
      for (var c = 0; c < header.length; c++) {
        obj[header[c]] = row[c] === undefined ? "" : row[c];
      }
      out.push(obj);
    }
    return out;
  }

  var jcIn = $("cv-jsoncsv-in");
  var jcOut = $("cv-jsoncsv-out");
  var jcRun = $("cv-jsoncsv-run");
  var jcSwap = $("cv-jsoncsv-swap");
  var jcDl = $("cv-jsoncsv-dl");
  var jcBusy = false;
  var jcLastDir = "json2csv";

  function jcDir() {
    var el = $q('input[name="cv-jsoncsv-dir"]:checked');
    return el ? el.value : "json2csv";
  }
  function jcRefresh() {
    var dir = jcDir();
    jcLastDir = dir;
    var hasIn = !!jcIn.value.trim();
    var hasOut = !!jcOut.value.trim();
    jcRun.disabled = jcBusy || !hasIn;
    jcDl.disabled = jcBusy || !hasOut;
    jcSwap.disabled = !hasOut;
    jcDl.textContent = dir === "json2csv" ? "Download .csv" : "Download .json";
  }
  jcIn.addEventListener("input", jcRefresh);
  jcOut.addEventListener("input", jcRefresh);
  var jcRadios = document.querySelectorAll('input[name="cv-jsoncsv-dir"]');
  for (var jci = 0; jci < jcRadios.length; jci++) {
    jcRadios[jci].addEventListener("change", function () {
      jcRefresh();
      setStatus("cv-jsoncsv-status", "");
    });
  }

  jcRun.addEventListener("click", function () {
    if (jcBusy || !jcIn.value.trim()) return;
    jcBusy = true;
    jcRefresh();
    markBusy(jcRun, true, "Converting…");
    setStatus("cv-jsoncsv-status", "");
    try {
      var dir = jcDir();
      var outText;
      var summary;
      if (dir === "json2csv") {
        var parsed = JSON.parse(jcIn.value);
        outText = jsonToCsv(parsed);
        var count = Array.isArray(parsed) ? parsed.length : 0;
        if (!Array.isArray(parsed) && parsed && typeof parsed === "object") {
          var lens = Object.keys(parsed).map(function (k) {
            return parsed[k].length;
          });
          count = lens.length ? Math.max.apply(null, lens) : 0;
        }
        summary = "Converted JSON → CSV (" + count + " row" + (count === 1 ? "" : "s") + ").";
      } else {
        outText = JSON.stringify(csvToJson(jcIn.value), null, 2);
        summary = "Converted CSV → JSON.";
      }
      jcOut.value = outText;
      setStatus("cv-jsoncsv-status", summary);
    } catch (err) {
      var msg = err && err.message ? err.message : String(err);
      if (/^JSON/.test(msg) || /position/.test(msg)) {
        msg = "JSON parse error: " + msg;
      }
      setStatus("cv-jsoncsv-status", msg, true);
    } finally {
      markBusy(jcRun, false);
      jcBusy = false;
      jcRefresh();
    }
  });

  jcSwap.addEventListener("click", function () {
    if (!jcOut.value.trim()) return;
    var tmp = jcIn.value;
    jcIn.value = jcOut.value;
    jcOut.value = "";
    var dir = jcDir();
    var flip = dir === "json2csv" ? "csv2json" : "json2csv";
    var radio = $q('input[name="cv-jsoncsv-dir"][value="' + flip + '"]');
    if (radio) radio.checked = true;
    jcRefresh();
    setStatus("cv-jsoncsv-status", "Swapped sides — direction is now " + (flip === "json2csv" ? "JSON → CSV" : "CSV → JSON") + ".");
  });

  jcDl.addEventListener("click", function () {
    if (!jcOut.value.trim()) return;
    var ext = jcLastDir === "json2csv" ? "csv" : "json";
    var name = "data." + ext;
    var type = ext === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
    download(new Blob([jcOut.value], { type: type }), name);
    setStatus("cv-jsoncsv-status", "Downloaded " + name + ".");
  });

  /* ================================================================ */
  /* 6. YAML ↔ JSON                                                     */
  /* ================================================================ */

  var yjIn = $("cv-yamljson-in");
  var yjOut = $("cv-yamljson-out");
  var yjRun = $("cv-yamljson-run");
  var yjDl = $("cv-yamljson-dl");
  var yjBusy = false;
  var yjLastDir = "yaml2json";

  function yjDir() {
    var el = $q('input[name="cv-yamljson-dir"]:checked');
    return el ? el.value : "yaml2json";
  }
  function yjRefresh() {
    var dir = yjDir();
    yjLastDir = dir;
    var hasIn = !!yjIn.value.trim();
    var hasOut = !!yjOut.value.trim();
    yjRun.disabled = yjBusy || !hasIn;
    yjDl.disabled = yjBusy || !hasOut;
    yjDl.textContent = dir === "yaml2json" ? "Download .json" : "Download .yaml";
  }
  yjIn.addEventListener("input", yjRefresh);
  var yjRadios = document.querySelectorAll('input[name="cv-yamljson-dir"]');
  for (var yji = 0; yji < yjRadios.length; yji++) {
    yjRadios[yji].addEventListener("change", function () {
      yjRefresh();
      setStatus("cv-yamljson-status", "");
    });
  }

  yjRun.addEventListener("click", function () {
    if (yjBusy || !yjIn.value.trim()) return;
    yjBusy = true;
    yjRefresh();
    markBusy(yjRun, true, "Converting…");
    setStatus("cv-yamljson-status", "");
    try {
      var dir = yjDir();
      var outText;
      if (dir === "yaml2json") {
        var obj = jsyaml.load(yjIn.value);
        if (obj === undefined) throw new Error("The YAML input has no content.");
        outText = JSON.stringify(obj, null, 2);
        setStatus("cv-yamljson-status", "Converted YAML → JSON.");
      } else {
        var data = JSON.parse(yjIn.value);
        outText = String(jsyaml.dump(data, { lineWidth: 100, noCompatMode: true })).replace(/\n$/, "");
        setStatus("cv-yamljson-status", "Converted JSON → YAML.");
      }
      yjOut.value = outText;
    } catch (err) {
      var msg = err && (err.reason || err.message) ? (err.reason || err.message) : String(err);
      if (err instanceof SyntaxError) msg = "JSON parse error: " + msg;
      setStatus("cv-yamljson-status", msg, true);
    } finally {
      markBusy(yjRun, false);
      yjBusy = false;
      yjRefresh();
    }
  });

  yjDl.addEventListener("click", function () {
    if (!yjOut.value.trim()) return;
    var ext = yjLastDir === "yaml2json" ? "json" : "yaml";
    var name = "converted." + ext;
    var type = ext === "json" ? "application/json;charset=utf-8" : "text/yaml;charset=utf-8";
    download(new Blob([yjOut.value], { type: type }), name);
    setStatus("cv-yamljson-status", "Downloaded " + name + ".");
  });

  /* ================================================================ */
  /* 7. XML → JSON                                                      */
  /* ================================================================ */

  function decodeEntities(s) {
    return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (m, body) {
      if (body.charAt(0) === "#") {
        var code = body.charAt(1) === "x" || body.charAt(1) === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
        if (!isNaN(code) && code > 0 && code <= 0x10ffff) {
          try {
            return String.fromCodePoint(code);
          } catch (err) {
            return "\ufffd";
          }
        }
        return "\ufffd";
      }
      var named = {
        amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0",
        copy: "\u00a9", reg: "\u00ae", hellip: "\u2026", mdash: "\u2014",
        ndash: "\u2013", ldquo: "\u201c", rdquo: "\u201d", lsquo: "\u2018",
        rsquo: "\u2019", bull: "\u2022", euro: "\u20ac", trade: "\u2122"
      };
      return named[body] !== undefined ? named[body] : m;
    });
  }

  function xmlToJson(xml) {
    var src = String(xml).replace(/^\uFEFF/, "");
    var pos = 0;
    var len = src.length;

    function fail(msg) {
      throw new Error(msg + " (near offset " + pos + ").");
    }
    function isWs() {
      var c = src.charAt(pos);
      return c === " " || c === "\t" || c === "\n" || c === "\r";
    }
    function skipWs() {
      while (pos < len && isWs()) pos += 1;
    }
    function nameEnd(from) {
      var i = from === undefined ? pos : from;
      while (i < len && /[A-Za-z0-9_.:\-]/.test(src.charAt(i))) i += 1;
      return i;
    }
    function scanText() {
      var start = pos;
      var out = "";
      while (pos < len) {
        if (src.charAt(pos) === "<") {
          if (src.slice(pos, pos + 9) === "<![CDATA[") {
            var end = src.indexOf("]]>", pos + 9);
            if (end === -1) fail("Unterminated CDATA section");
            out += src.slice(pos + 9, end);
            pos = end + 3;
            continue;
          }
          if (src.slice(pos, pos + 4) === "<!--") {
            var cEnd = src.indexOf("-->", pos + 4);
            if (cEnd === -1) fail("Unterminated comment");
            pos = cEnd + 3;
            continue;
          }
          break;
        }
        out += src.charAt(pos);
        pos += 1;
      }
      void start;
      return decodeEntities(out);
    }
    function skipMisc() {
      for (;;) {
        skipWs();
        if (pos >= len) return;
        if (src.slice(pos, pos + 4) === "<!--") {
          var e = src.indexOf("-->", pos + 4);
          if (e === -1) fail("Unterminated comment");
          pos = e + 3;
          continue;
        }
        if (src.slice(pos, pos + 2) === "<?") {
          var pEnd = src.indexOf("?>", pos + 2);
          if (pEnd === -1) fail("Unterminated processing instruction");
          pos = pEnd + 2;
          continue;
        }
        if (/^<!DOCTYPE/i.test(src.slice(pos, pos + 9))) {
          var dEnd = src.indexOf(">", pos);
          if (dEnd === -1) fail("Unterminated DOCTYPE");
          pos = dEnd + 1;
          continue;
        }
        return;
      }
    }
    function parseAttrs(tag) {
      var attrs = {};
      for (;;) {
        skipWs();
        if (pos >= len) fail("Unexpected end inside tag <" + tag + ">");
        var c = src.charAt(pos);
        if (c === ">" || c === "/") break;
        var nEnd = nameEnd();
        if (nEnd === pos) fail("Expected an attribute name in <" + tag + ">");
        var aname = src.slice(pos, nEnd);
        pos = nEnd;
        skipWs();
        var aval = true;
        if (src.charAt(pos) === "=") {
          pos += 1;
          skipWs();
          var q = src.charAt(pos);
          if (q !== '"' && q !== "'") fail("Attribute value for \u201c" + aname + "\u201d must be quoted");
          var vEnd = src.indexOf(q, pos + 1);
          if (vEnd === -1) fail("Unterminated attribute value for \u201c" + aname + "\u201d");
          aval = decodeEntities(src.slice(pos + 1, vEnd));
          pos = vEnd + 1;
        }
        attrs[aname] = aval;
      }
      return attrs;
    }
    function parseElement() {
      if (src.charAt(pos) !== "<") fail("Expected an element");
      pos += 1;
      var nEnd = nameEnd();
      if (nEnd === pos) fail("Expected an element name");
      var tag = src.slice(pos, nEnd);
      pos = nEnd;
      var attrs = parseAttrs(tag);
      if (src.charAt(pos) === "/" && src.charAt(pos + 1) === ">") {
        pos += 2;
        var self = { tag: tag };
        if (Object.keys(attrs).length) self.attrs = attrs;
        return self;
      }
      if (src.charAt(pos) !== ">") fail("Malformed tag <" + tag + ">");
      pos += 1;
      var text = "";
      var children = [];
      var hasText = false;
      for (;;) {
        skipMisc();
        if (pos >= len) fail("Missing closing tag </" + tag + ">");
        if (src.charAt(pos) === "<" && src.charAt(pos + 1) === "/") {
          var closeStart = pos + 2;
          var cEnd = nameEnd(closeStart);
          var closeName = src.slice(closeStart, cEnd);
          if (closeName !== tag) fail("Mismatched closing tag </" + closeName + "> (expected </" + tag + ">)");
          pos = cEnd;
          skipWs();
          if (src.charAt(pos) !== ">") fail("Malformed closing tag </" + tag + ">");
          pos += 1;
          break;
        }
        var before = pos;
        var t = scanText();
        if (t) {
          text += t;
          hasText = true;
        }
        if (before === pos) {
          children.push(parseElement());
        }
      }
      var node = { tag: tag };
      if (Object.keys(attrs).length) node.attrs = attrs;
      if (children.length) {
        node.children = children;
        var meaningful = text.replace(/\s+/g, " ").trim();
        if (meaningful) node.children.unshift({ tag: "#text", text: meaningful });
      } else if (hasText) {
        var trimmed = text.replace(/\s+/g, " ").trim();
        if (trimmed) node.text = trimmed;
      }
      return node;
    }

    skipMisc();
    if (pos >= len) throw new Error("No XML content found.");
    if (src.charAt(pos) !== "<" || src.charAt(pos + 1) === "!" || src.charAt(pos + 1) === "?") {
      throw new Error("No root element found.");
    }
    var root = parseElement();
    skipMisc();
    skipWs();
    if (pos < len) throw new Error("Unexpected content after the root element (multiple roots are not supported).");
    return root;
  }

  var xjIn = $("cv-xml2json-in");
  var xjOut = $("cv-xml2json-out");
  var xjRun = $("cv-xml2json-run");
  var xjDl = $("cv-xml2json-dl");
  var xjBusy = false;

  function xjRefresh() {
    var hasIn = !!xjIn.value.trim();
    var hasOut = !!xjOut.value.trim();
    xjRun.disabled = xjBusy || !hasIn;
    xjDl.disabled = xjBusy || !hasOut;
  }
  xjIn.addEventListener("input", xjRefresh);

  xjRun.addEventListener("click", function () {
    if (xjBusy || !xjIn.value.trim()) return;
    xjBusy = true;
    xjRefresh();
    markBusy(xjRun, true, "Converting…");
    setStatus("cv-xml2json-status", "");
    try {
      var root = xmlToJson(xjIn.value);
      xjOut.value = JSON.stringify(root, null, 2);
      setStatus("cv-xml2json-status", "Converted XML → JSON.");
    } catch (err) {
      setStatus("cv-xml2json-status", (err && err.message) || "XML parse failed.", true);
    } finally {
      markBusy(xjRun, false);
      xjBusy = false;
      xjRefresh();
    }
  });

  xjDl.addEventListener("click", function () {
    if (!xjOut.value.trim()) return;
    download(new Blob([xjOut.value], { type: "application/json;charset=utf-8" }), "data.json");
    setStatus("cv-xml2json-status", "Downloaded data.json.");
  });

  /* ================================================================ */
  /* TAR (ustar) — small reader/writer. fflate 0.8.2 has no tarSync.    */
  /* ================================================================ */

  var TEXT_ENC = new TextEncoder();
  var TAR_BLOCK = 512;

  function setStr(bytes, off, max, str) {
    var b = TEXT_ENC.encode(str);
    if (b.length > max) return false;
    bytes.set(b, off);
    return true;
  }

  function getStr(bytes, off, max) {
    var s = "";
    for (var i = off; i < off + max && i < bytes.length; i++) {
      var c = bytes[i];
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  }

  function octField(n, digits) {
    var s = Math.floor(n).toString(8);
    if (s.length > digits) throw new Error("Value too large for a TAR header field.");
    while (s.length < digits) s = "0" + s;
    return s + "\0";
  }

  function concatU8(parts) {
    var total = 0;
    for (var i = 0; i < parts.length; i++) total += parts[i].length;
    var out = new Uint8Array(total);
    var off = 0;
    for (var j = 0; j < parts.length; j++) {
      out.set(parts[j], off);
      off += parts[j].length;
    }
    return out;
  }

  function tarCreate(entries) {
    var now = Math.floor(Date.now() / 1000);
    var parts = [];
    for (var i = 0; i < entries.length; i++) {
      var name = entries[i].name;
      var data = entries[i].data;
      var prefix = "";
      var byteName = TEXT_ENC.encode(name);
      if (byteName.length > 100) {
        var splitAt = -1;
        for (var s = 0; s < name.length; s++) {
          if (name.charAt(s) !== "/") continue;
          var preB = TEXT_ENC.encode(name.slice(0, s)).length;
          var sufB = TEXT_ENC.encode(name.slice(s + 1)).length;
          if (preB <= 155 && sufB <= 100) splitAt = s;
        }
        if (splitAt === -1) {
          throw new Error("Path too long for a TAR archive: " + name);
        }
        prefix = name.slice(0, splitAt);
        name = name.slice(splitAt + 1);
      }
      var h = new Uint8Array(TAR_BLOCK);
      if (!setStr(h, 0, 100, name)) throw new Error("File name too long for TAR: " + name);
      setStr(h, 100, 8, "0000644\0");
      setStr(h, 108, 8, "0000000\0");
      setStr(h, 116, 8, "0000000\0");
      setStr(h, 124, 12, octField(data.length, 11));
      setStr(h, 136, 12, octField(now, 11));
      setStr(h, 148, 8, "        ");
      h[156] = 48; /* '0' */
      setStr(h, 257, 8, "ustar\0");
      setStr(h, 263, 2, "00");
      if (prefix) setStr(h, 345, 155, prefix);
      var sum = 0;
      for (var b = 0; b < TAR_BLOCK; b++) sum += h[b];
      var sumStr = sum.toString(8);
      while (sumStr.length < 6) sumStr = "0" + sumStr;
      setStr(h, 148, 8, sumStr + "\0 ");
      parts.push(h);
      parts.push(data);
      var pad = TAR_BLOCK - (data.length % TAR_BLOCK);
      if (pad && pad !== TAR_BLOCK) parts.push(new Uint8Array(pad));
    }
    parts.push(new Uint8Array(TAR_BLOCK * 2));
    return concatU8(parts);
  }

  function tarEntries(bytes) {
    var out = [];
    var off = 0;
    var header = null;
    while (off + TAR_BLOCK <= bytes.length) {
      header = bytes.subarray(off, off + TAR_BLOCK);
      var allZero = true;
      for (var z = 0; z < TAR_BLOCK; z++) {
        if (header[z] !== 0) {
          allZero = false;
          break;
        }
      }
      if (allZero) break;
      var magic = getStr(header, 257, 6);
      if (magic !== "ustar") throw new Error("Not a valid ustar TAR archive.");
      var sizeTxt = getStr(header, 124, 12).replace(/\s/g, "");
      var size = parseInt(sizeTxt, 8);
      if (isNaN(size) || size < 0) throw new Error("TAR header has an invalid size field.");
      var rawName = getStr(header, 0, 100).replace(/\s+$/, "");
      var prefix = getStr(header, 345, 155).replace(/\s+$/, "");
      var full = prefix ? prefix + "/" + rawName : rawName;
      var type = String.fromCharCode(header[156]);
      off += TAR_BLOCK;
      if ((type === "0" || type === "\u0000" || type === "") && rawName) {
        var data = bytes.subarray(off, off + size);
        out.push({ name: full, data: data });
      }
      var step = Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
      off += step;
    }
    if (!out.length) throw new Error("No files found in this TAR archive.");
    return out;
  }

  /* ================================================================ */
  /* 8. Create archive (ZIP / TAR / GZIP)                               */
  /* ================================================================ */

  var mkFilesInput = $("cv-mkzip-files");
  var mkMode = $("cv-mkzip-mode");
  var mkRun = $("cv-mkzip-run");
  var mkBusy = false;
  var mkFiles = [];

  function mkRefresh() {
    var mode = mkMode.value;
    var ok = mode === "gzip" ? mkFiles.length === 1 : mkFiles.length >= 1;
    mkRun.disabled = mkBusy || !ok;
  }
  mkFilesInput.addEventListener("change", function () {
    mkFiles = Array.prototype.slice.call(mkFilesInput.files || []);
    renderFileList("cv-mkzip-list", mkFiles);
    updateFilesNote("cv-mkzip-files-note", mkFiles);
    mkRefresh();
  });
  mkMode.addEventListener("change", mkRefresh);

  mkRun.addEventListener("click", async function () {
    var mode = mkMode.value;
    if (mkBusy || mkFiles.length === 0) return;
    if (mode === "gzip" && mkFiles.length !== 1) {
      setStatus("cv-mkzip-status", "GZIP takes exactly one file — select a single file.", true);
      return;
    }
    mkBusy = true;
    mkRefresh();
    markBusy(mkRun, true, "Packing…");
    setStatus("cv-mkzip-status", "");
    try {
      var entries = [];
      var used = new Set();
      for (var i = 0; i < mkFiles.length; i++) {
        var file = mkFiles[i];
        setStatus("cv-mkzip-status", "Reading " + (i + 1) + " of " + mkFiles.length + " (" + baseName(file.name) + ")…");
        var u8 = await readU8(file);
        entries.push({ name: uniqueName(cleanName(baseName(file.name)), used), data: u8 });
      }
      var outBytes;
      var outName;
      var kind;
      if (mode === "zip") {
        var map = {};
        entries.forEach(function (e) {
          map[e.name] = e.data;
        });
        outBytes = fflate.zipSync(map, { level: 6 });
        outName = "archive.zip";
        kind = "ZIP";
      } else if (mode === "tar") {
        outBytes = tarCreate(entries);
        outName = "archive.tar";
        kind = "TAR";
      } else {
        outBytes = fflate.gzipSync(entries[0].data);
        outName = cleanName(stem(mkFiles[0].name)) + ".gz";
        kind = "GZIP";
      }
      download(new Blob([outBytes], { type: "application/octet-stream" }), outName);
      setStatus("cv-mkzip-status", "Created " + kind + " " + outName + " with " + entries.length + " file" + (entries.length === 1 ? "" : "s") + " (" + fmtBytes(outBytes.length) + ").");
    } catch (err) {
      setStatus("cv-mkzip-status", (err && err.message) || "Could not create the archive.", true);
    } finally {
      markBusy(mkRun, false);
      mkBusy = false;
      mkRefresh();
    }
  });

  /* ================================================================ */
  /* 9. Extract archive (ZIP / TAR / GZIP)                              */
  /* ================================================================ */

  function sniffKind(u8) {
    if (u8.length >= 4 && u8[0] === 0x50 && u8[1] === 0x4b) return "zip";
    if (u8.length > 262) {
      var magic = "";
      for (var i = 257; i < 263; i++) magic += String.fromCharCode(u8[i]);
      if (magic.indexOf("ustar") === 0) return "tar";
    }
    if (u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b) return "gzip";
    return "";
  }

  function dropGzSuffix(name) {
    return String(name).replace(/\.(tar\.)?gz$/i, "") || stem(name);
  }

  function openArchive(u8, fileName) {
    var kind = sniffKind(u8);
    var entries = [];
    if (kind === "zip") {
      var files = fflate.unzipSync(u8);
      var names = Object.keys(files);
      names.forEach(function (n) {
        entries.push({ name: n, data: files[n] });
      });
      return { kind: "ZIP", entries: entries };
    }
    if (kind === "tar") {
      return { kind: "TAR", entries: tarEntries(u8) };
    }
    if (kind === "gzip") {
      var inner = fflate.gunzipSync(u8);
      var innerKind = sniffKind(inner);
      if (innerKind === "tar") {
        return { kind: "GZIP (TAR inside)", entries: tarEntries(inner) };
      }
      if (innerKind === "zip") {
        var zfiles = fflate.unzipSync(inner);
        Object.keys(zfiles).forEach(function (n) {
          entries.push({ name: n, data: zfiles[n] });
        });
        return { kind: "GZIP (ZIP inside)", entries: entries };
      }
      return {
        kind: "GZIP",
        entries: [{ name: dropGzSuffix(fileName), data: inner }]
      };
    }
    throw new Error("Unrecognized archive. Expected ZIP, TAR or GZIP magic bytes.");
  }

  var unFile = $("cv-unpack-file");
  var unList = $("cv-unpack-list");
  var unAll = $("cv-unpack-all");
  var unBusy = false;
  var unEntries = [];
  var unKind = "";
  var unSourceName = "";

  function isFolderEntry(e) {
    return /\/$/.test(e.name) && e.data.length === 0;
  }

  function fileEntries(entries) {
    return entries.filter(function (e) {
      return !isFolderEntry(e);
    });
  }

  function renderEntries() {
    unList.textContent = "";
    var files = fileEntries(unEntries);
    var total = 0;
    files.forEach(function (e) {
      total += e.data.length;
    });
    var label = unKind + " — " + unEntries.length + " entr" + (unEntries.length === 1 ? "y" : "ies") + " · " + fmtBytes(total);
    if (unEntries.length !== files.length) {
      label += " (" + (unEntries.length - files.length) + " folder" + (unEntries.length - files.length === 1 ? "" : "s") + ")";
    }
    var info = $("cv-unpack-info");
    info.textContent = label;
    info.hidden = false;

    unEntries.forEach(function (e) {
      var li = document.createElement("li");
      var main = document.createElement("span");
      main.className = "row-main";
      var nm = document.createElement("span");
      nm.className = "name";
      nm.textContent = e.name;
      main.appendChild(nm);
      li.appendChild(main);
      if (isFolderEntry(e)) {
        var folder = document.createElement("span");
        folder.className = "fs";
        folder.textContent = "folder";
        li.appendChild(folder);
      } else {
        var acts = document.createElement("span");
        acts.className = "row-actions";
        var size = document.createElement("span");
        size.className = "fs";
        size.textContent = fmtBytes(e.data.length);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-ghost btn-sm";
        btn.textContent = "Download";
        btn.addEventListener("click", function () {
          download(new Blob([e.data], { type: "application/octet-stream" }), cleanName(baseName(e.name)));
          setStatus("cv-unpack-status", "Downloaded " + baseName(e.name) + ".");
        });
        acts.appendChild(size);
        acts.appendChild(btn);
        li.appendChild(acts);
      }
      unList.appendChild(li);
    });
    unList.hidden = false;
    unAll.hidden = files.length <= 1;
    unAll.textContent = "Download all as ZIP";
    setStatus("cv-unpack-status", "Opened " + unKind + " — " + files.length + " file" + (files.length === 1 ? "" : "s") + " ready.");
  }

  unFile.addEventListener("change", async function () {
    var file = unFile.files && unFile.files[0];
    if (!file) return;
    unFile.value = "";
    unBusy = true;
    unAll.disabled = true;
    unList.hidden = true;
    unList.textContent = "";
    $("cv-unpack-info").hidden = true;
    setStatus("cv-unpack-status", "Reading " + file.name + "…");
    try {
      var u8 = await readU8(file);
      var res = openArchive(u8, file.name);
      unKind = res.kind;
      unEntries = res.entries;
      unSourceName = file.name;
      renderEntries();
      unAll.disabled = false;
    } catch (err) {
      unEntries = [];
      setStatus("cv-unpack-status", (err && err.message) || "\u201c" + file.name + "\u201d could not be opened as an archive.", true);
      unAll.hidden = true;
    } finally {
      unBusy = false;
    }
  });

  unAll.addEventListener("click", function () {
    var files = fileEntries(unEntries);
    if (files.length <= 1) return;
    markBusy(unAll, true, "Zipping…");
    setStatus("cv-unpack-status", "");
    try {
      var map = {};
      files.forEach(function (e) {
        map[e.name] = e.data;
      });
      var zipBytes = fflate.zipSync(map, { level: 6 });
      var name = cleanName(stem(unSourceName)) + "-extracted.zip";
      download(new Blob([zipBytes], { type: "application/zip" }), name);
      setStatus("cv-unpack-status", "Downloaded " + name + " with " + files.length + " files.");
    } catch (err) {
      setStatus("cv-unpack-status", (err && err.message) || "Could not build the ZIP.", true);
    } finally {
      markBusy(unAll, false);
    }
  });

  /* init */
  mhRefresh();
  m2pRefresh();
  p2tRefresh();
  img2ShowQuality();
  jcRefresh();
  yjRefresh();
  xjRefresh();
  mkRefresh();

  /* Deterministic text->PDF export (fix: previously blank output).
     Parses markdown (or strips HTML), wraps words, and draws with pdf-lib
     standard fonts, adding pages when the cursor reaches the bottom margin. */
  async function simpleTextPdf(src, isMd) {
    var doc = await PDFLib.PDFDocument.create();
    var helv = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    var W = 595.28, H = 841.89, M = 50, CW = W - M * 2;
    var page = doc.addPage([W, H]);
    var y = H - M;

    function newPage() { page = doc.addPage([W, H]); y = H - M; }

    function drawOne(text, size) {
      if (!text) return;
      if (y - size * 1.45 < M) newPage();
      page.drawText(text, { x: M, y: y, size: size, font: helv });
      y -= size * 1.45;
    }

    function drawParagraph(text, size) {
      var words = String(text).split(/\s+/);
      var line = "";
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        var probe = line ? line + " " + w : w;
        if (helv.widthOfTextAtSize(probe, size) <= CW) {
          line = probe;
        } else {
          drawOne(line, size);
          line = w;
        }
      }
      if (line) drawOne(line, size);
      if (size >= 10) y -= size * 0.5;
    }

    var raw;
    if (isMd) {
      raw = src.split(/\r?\n/);
    } else {
      var t = src
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>|<\/pre>/gi, "\n")
        .replace(/<[^>]+>/g, " ");
      t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
           .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
      raw = t.split(/\r?\n/);
    }

    var wrote = false;
    var inCode = false;
    var list = false;
    for (var i = 0; i < raw.length; i++) {
      var line = String(raw[i]).replace(/\t/g, "    ").replace(/\s+$/, "");
      var trimmed = line.trim();
      if (isMd) {
        if (/^```/.test(trimmed)) { inCode = !inCode; continue; }
        var hm = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (hm) {
          var lvl = hm[1].length;
          drawParagraph(hm[2], lvl <= 1 ? 20 : lvl === 2 ? 16 : lvl === 3 ? 13 : 11.5);
          wrote = true;
          continue;
        }
        if (/^---+$|^\*\*\*+$/.test(trimmed)) {
          if (y - 24 < M) newPage();
          page.drawRectangle({ x: M, y: y - 6, width: CW, height: 1, color: PDFLib.rgb(0, 0, 0) });
          y -= 18;
          continue;
        }
        if (inCode) {
          drawParagraph(trimmed, 9.5);
          wrote = true;
          continue;
        }
        if (list || /^[-*+]\s+/.test(trimmed)) {
          drawParagraph(trimmed.replace(/^[-*+]\s+/, "• "), 10.5);
          list = true;
          wrote = true;
          continue;
        }
        if (!trimmed) { list = false; if (wrote) y -= 4; continue; }
        drawParagraph(trimmed, 11);
        wrote = true;
        list = false;
      } else {
        if (!trimmed) continue;
        drawParagraph(trimmed, 11);
        wrote = true;
      }
    }
    if (!wrote) {
      // Never ship an empty document: fall back to the raw text.
      drawParagraph(String(src || "Empty input").slice(0, 2000), 11);
    }
    var bytes = await doc.save();
    return { bytes: bytes, title: "" };
  }

})();
