// kokoapi.space — shared UI: language toggle, theme toggle and i18n engine.
// All translations live in the central dictionary window.KOKO_I18N
// (public/_ui/i18n-pages.js), loaded before this file on every page.

(function () {
  "use strict";

  var LANG_KEY = "koko-lang";
  var THEME_KEY = "koko-theme";

  function getLang() {
    var v = null;
    try { v = localStorage.getItem(LANG_KEY); } catch (e) {}
    return v === "pt" ? "pt" : "en";
  }

  function dict() {
    return window.KOKO_I18N || {};
  }

  function applyTo(el, text) {
    // textContent assignment is safe for annotated leaves; for containers that
    // only hold one text child we avoid wiping inner structure by keeping
    // child nodes intact (annotated elements are leaves by convention).
    if (el.childNodes.length === 1 && el.firstChild.nodeType === 3) {
      el.firstChild.nodeValue = text;
    } else if (!el.children || el.children.length === 0) {
      el.textContent = text;
    } else {
      // Container with nested annotated elements (e.g. footer span + link):
      // only replace its plain text nodes, leaving children untouched.
      var nodes = Array.prototype.slice.call(el.childNodes);
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeType === 3 && nodes[i].nodeValue && nodes[i].nodeValue.trim()) {
          nodes[i].nodeValue = text;
          break;
        }
      }
    }
  }

  function updateTranslations(lang) {
    var D = dict();
    document.documentElement.setAttribute("lang", lang === "pt" ? "pt-BR" : "en");

    // 1) Text content via data-i18n.
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute("data-i18n");
      if (!key || !D[key] || !D[key][lang]) continue;
      applyTo(el, D[key][lang]);
    }

    // 2) Placeholder / value attributes.
    var attrMap = [
      ["data-i18n-placeholder", "placeholder"],
      ["data-i18n-value", "value"],
      ["data-i18n-title", "title"],
    ];
    for (var a = 0; a < attrMap.length; a++) {
      var q = document.querySelectorAll("[" + attrMap[a][0] + "]");
      for (var b = 0; b < q.length; b++) {
        var k = q[b].getAttribute(attrMap[a][0]);
        if (D[k] && D[k][lang]) q[b].setAttribute(attrMap[a][1], D[k][lang]);
      }
    }

    if (lang !== "pt") return; // annotated nodes already restored to EN.

    // 3) Fallback for unannotated static leaves whose exact text matches a
    // dictionary entry (covers residual footer/middle strings).
    var byEn = {};
    Object.keys(D).forEach(function (key) {
      if (D[key] && D[key].en && D[key].pt) byEn[D[key].en] = D[key].pt;
    });
    var leaves = document.querySelectorAll(
      "body p, body span, body a, body h1, body h2, body h3, body h4, body button, body label, body li, body th, body dt, body legend, body div"
    );
    for (var m = 0; m < leaves.length; m++) {
      var el2 = leaves[m];
      if (el2.getAttribute && el2.getAttribute("data-i18n") !== null) continue;
      if (el2.children && el2.children.length) continue;
      if (el2.closest && el2.closest("#theme-toggle, #lang-toggle")) continue;
      var t = (el2.textContent || "").trim();
      if (!t) continue;
      var pt = byEn[t];
      if (pt) applyTo(el2, pt);
    }
  }

  function setLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    updateTranslations(lang);
    var btn = document.getElementById("lang-toggle");
    if (btn) {
      var us = btn.querySelector(".flag-us");
      var br = btn.querySelector(".flag-br");
      if (us) us.hidden = lang === "pt";
      if (br) br.hidden = lang === "en";
      btn.setAttribute("aria-label", lang === "pt" ? "Switch to English" : "Mudar para português");
      btn.setAttribute("title", lang === "pt" ? "English" : "Português");
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
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
      btn.setAttribute("title", theme === "light" ? "Dark" : "Light");
    }
  }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function init() {
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

    // Re-run once everything (fonts/layout, late nodes) is fully loaded.
    if (document.readyState === "complete") {
      updateTranslations(getLang());
    } else {
      window.addEventListener("load", function () {
        updateTranslations(getLang());
      });
    }
  }

  // Public handle (also useful for tests / manual re-application).
  window.updateTranslations = updateTranslations;

  ready(init);
})();
