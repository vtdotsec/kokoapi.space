// kokoapi.space — shared UI: language toggle, theme toggle and i18n application.
// All translations live in the central dictionary window.KOKO_I18N
// (public/_ui/i18n-pages.js), which must be loaded before this file.

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

  function applyI18n(lang) {
    var D = dict();
    document.documentElement.setAttribute("lang", lang === "pt" ? "pt-BR" : "en");

    // Explicit annotations: data-i18n (text), data-i18n-placeholder,
    // data-i18n-value (inputs).
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute("data-i18n");
      if (D[key] && D[key][lang]) el.textContent = D[key][lang];
    }
    var ph = document.querySelectorAll("[data-i18n-placeholder]");
    for (var j = 0; j < ph.length; j++) {
      var pkey = ph[j].getAttribute("data-i18n-placeholder");
      if (D[pkey] && D[pkey][lang]) ph[j].setAttribute("placeholder", D[pkey][lang]);
    }
    var val = document.querySelectorAll("[data-i18n-value]");
    for (var k = 0; k < val.length; k++) {
      var vkey = val[k].getAttribute("data-i18n-value");
      if (D[vkey] && D[vkey][lang]) val[k].value = D[vkey][lang];
    }

    if (lang !== "pt") return; // data-i18n nodes already restored to EN.

    // Fallback: translate static leaf text that exactly matches a dictionary
    // entry but has no annotation (covers any residual footer/middle strings).
    var byEn = {};
    Object.keys(D).forEach(function (key) {
      if (D[key] && D[key].en && D[key].pt) byEn[D[key].en] = D[key].pt;
    });
    var leaves = document.querySelectorAll(
      "body p, body span, body a, body h1, body h2, body h3, body h4, body button, body label, body li, body th, body dt, body legend"
    );
    for (var m = 0; m < leaves.length; m++) {
      var el2 = leaves[m];
      if (el2.getAttribute && el2.getAttribute("data-i18n") !== null) continue;
      if (el2.children && el2.children.length) continue;
      var t = (el2.textContent || "").trim();
      if (!t) continue;
      var pt = byEn[t];
      if (pt) el2.textContent = pt;
    }
  }

  function setLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyI18n(lang);
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
  });
})();
