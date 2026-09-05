// kokoapi.space — shared UI: theme toggle, language toggle and [data-i18n]
// translation application. Loaded with defer on every page.

(function () {
  "use strict";

  var LANG_KEY = "koko-lang";
  var THEME_KEY = "koko-theme";

  // Fallback translations for shared chrome (nav labels, buttons).
  var DEFAULTS = {
    "nav.image": { en: "Image tools", pt: "Imagem" },
    "nav.pdf": { en: "PDF tools", pt: "PDF" },
    "nav.convert": { en: "File converter", pt: "Conversor de arquivos" },
    "nav.secret": { en: "Secret Sender", pt: "Secret Sender" },
    "nav.qrcode": { en: "QR toolkit", pt: "QR Code" },
    "btn.theme": { en: "Toggle theme", pt: "Alternar tema" },
  };

  function getLang() {
    var v = null;
    try { v = localStorage.getItem(LANG_KEY); } catch (e) {}
    return v === "pt" ? "pt" : "en";
  }

  function setLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyI18n(lang);
    var btn = document.getElementById("lang-toggle");
    if (btn) {
      btn.textContent = lang === "pt" ? "🇺🇸 EN" : "🇧🇷 PT";
      btn.setAttribute("aria-label", lang === "pt" ? "Switch to English" : "Mudar para português");
    }
  }

  function applyI18n(lang) {
    var pageDict = window.KOKO_I18N || {};
    var dict = {};
    Object.keys(DEFAULTS).forEach(function (k) { dict[k] = DEFAULTS[k]; });
    Object.keys(pageDict).forEach(function (k) {
      if (pageDict[k]) dict[k] = { en: pageDict[k].en, pt: pageDict[k].pt };
    });
    document.documentElement.setAttribute("lang", lang === "pt" ? "pt-BR" : "en");
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-i18n");
      var entry = dict[key];
      if (entry && entry[lang]) nodes[i].textContent = entry[lang];
    }
    // Fallback: translate static leaf text that exactly matches a dictionary
    // entry but is not (yet) annotated with data-i18n.
    if (lang !== "pt") return; // data-i18n nodes above already restored EN.
    var byEn = {};
    Object.keys(dict).forEach(function (k) {
      if (dict[k] && dict[k].en && dict[k].pt) byEn[dict[k].en] = dict[k].pt;
    });
    var leaves = document.querySelectorAll("body p, body span, body a, body h1, body h2, body h3, body h4, body button, body label, body li, body th, body dt, body legend");
    for (var j = 0; j < leaves.length; j++) {
      var el = leaves[j];
      if (el.getAttribute && el.getAttribute("data-i18n") !== null) continue;
      if (el.children && el.children.length) continue;
      var t = (el.textContent || "").trim();
      if (!t) continue;
      var pt = byEn[t];
      if (pt) el.textContent = pt;
    }
  }

  function getTheme() {
    var v = null;
    try { v = localStorage.getItem(THEME_KEY); } catch (e) {}
    return v === "light" ? "light" : "dark";
  }

  function setTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    document.documentElement.setAttribute("data-theme", theme);
  }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    setTheme(getTheme());

    var themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        setTheme(getTheme() === "light" ? "dark" : "light");
      });
    }

    var langBtn = document.getElementById("lang-toggle");
    if (langBtn) {
      langBtn.addEventListener("click", function () {
        setLang(getLang() === "pt" ? "en" : "pt");
      });
    }
    setLang(getLang());

    // Drag & drop support for every <label class="file-drop"> that wraps a
    // hidden file input: dropped files are forwarded to the input's change event.
    var drops = document.querySelectorAll("label.file-drop input[type=file]");
    Array.prototype.forEach.call(drops, function (input) {
      var label = input.closest("label");
      if (!label) return;
      ["dragenter", "dragover"].forEach(function (name) {
        label.addEventListener(name, function (e) {
          e.preventDefault();
          e.stopPropagation();
        });
      });
      label.addEventListener("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!e.dataTransfer || !e.dataTransfer.files.length) return;
        try {
          var dt = new DataTransfer();
          Array.prototype.forEach.call(e.dataTransfer.files, function (f) {
            dt.items.add(f);
          });
          input.files = dt.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (err) {
          // DataTransfer is not available in every browser; ignore.
        }
      });
    });
  });
})();
