// kokoapi.space — shared hamburger menu (same widget on every page).
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var btn = document.getElementById("site-menu-toggle");
    var menu = document.getElementById("site-menu");
    if (!btn || !menu) return;

    function isOpen() {
      return menu.classList.contains("open");
    }

    function setOpen(open) {
      menu.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!isOpen());
    });

    document.addEventListener("click", function (e) {
      if (!isOpen()) return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) setOpen(false);
    });

    menu.addEventListener("click", function () {
      setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  });
})();
