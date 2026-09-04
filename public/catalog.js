/* Self-Hosting Catalog — /apps/ filtering (progressive enhancement).
   Static, dependency-free, no inline scripts (CSP: script-src 'self').
   The server renders all apps; this only filters/sorts the rendered cards
   and keeps the state shareable via the URL query string. */

(function () {
  "use strict";

  var root = document.getElementById("catalog");
  if (!root) return;

  var grid = document.getElementById("catalog-grid");
  var countEl = root.querySelector("[data-count]");
  var noResults = document.getElementById("no-results");
  var clearBtn = document.getElementById("clear-filters");
  var toggleBtn = document.getElementById("filters-toggle");
  var searchInput = document.getElementById("q");
  var sortSelect = document.getElementById("sort");
  if (!grid || !searchInput || !sortSelect) return;

  var CAPS = ["docker", "kubernetes", "sso"];
  var MULTI = ["category", "license", "arch", "db", "language"];

  var cards = Array.prototype.slice.call(grid.querySelectorAll("[data-product]"));
  var total = cards.length;
  var allInputs = Array.prototype.slice.call(
    root.querySelectorAll('input[name]'),
  );

  function radioValue(name) {
    var el = allInputs.filter(function (i) {
      return i.name === name && i.checked;
    })[0];
    return el ? el.value : undefined;
  }

  function checkedValues(name) {
    var set = new Set();
    allInputs.forEach(function (el) {
      if (el.name === name && el.checked) set.add(el.value);
    });
    return set;
  }

  function matchCard(card) {
    var d = card.dataset;

    var q = searchInput.value.trim().toLowerCase();
    if (q) {
      var haystack = (d.search || "").toLowerCase();
      var tokens = q.split(/\s+/);
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i] && haystack.indexOf(tokens[i]) === -1) return false;
      }
    }

    function attrFor(name) {
      return name === "db" ? "databases" : name;
    }

    for (var m = 0; m < MULTI.length; m++) {
      var name = MULTI[m];
      var values = checkedValues(name);
      if (values.size === 0) continue;
      var own = (d[attrFor(name)] || "").split(/\s+/);
      var hit = false;
      for (var k = 0; k < own.length; k++) {
        if (values.has(own[k])) {
          hit = true;
          break;
        }
      }
      if (!hit) return false;
    }

    var cpu = radioValue("cpu");
    if (cpu && d.cpu !== cpu) return false;

    var ram = radioValue("ram");
    if (ram && d.ramtier !== ram) return false;

    for (var c = 0; c < CAPS.length; c++) {
      var cap = CAPS[c];
      if (checkedValues(cap).size > 0 && d[cap] !== "1") return false;
    }

    return true;
  }

  function compare(a, b) {
    var mode = sortSelect.value;
    var da = a.dataset;
    var db = b.dataset;
    var nameA = da.name || "";
    var nameB = db.name || "";

    if (mode === "ram") return (Number(da.ram) || 0) - (Number(db.ram) || 0);
    if (mode === "newest") return (db.updated || "").localeCompare(da.updated || "");
    if (mode === "featured") {
      var fd = (Number(db.featured) || 0) - (Number(da.featured) || 0);
      if (fd !== 0) return fd;
    }
    return nameA.localeCompare(nameB);
  }

  function hasActiveFilters() {
    if (searchInput.value.trim()) return true;
    for (var i = 0; i < allInputs.length; i++) {
      if (allInputs[i].checked) return true;
    }
    return false;
  }

  function render() {
    var visible = [];
    cards.forEach(function (card) {
      var show = matchCard(card);
      card.classList.toggle("is-hidden", !show);
      if (show) visible.push(card);
    });

    visible.sort(compare);
    var fragment = document.createDocumentFragment();
    visible.forEach(function (card) {
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);

    if (countEl)
      countEl.textContent = "Showing " + visible.length + " of " + total + " apps";
    if (noResults) noResults.style.display = visible.length === 0 ? "block" : "none";
    if (clearBtn) clearBtn.classList.toggle("hidden", !hasActiveFilters());
  }

  function syncUrl() {
    var params = new URLSearchParams();
    var q = searchInput.value.trim();
    if (q) params.set("q", q);
    if (sortSelect.value !== "featured") params.set("sort", sortSelect.value);

    allInputs.forEach(function (el) {
      if (el.checked && el.type === "radio") params.set(el.name, el.value);
    });

    var seen = new Set();
    allInputs.forEach(function (el) {
      if (el.type === "radio" || !el.checked || seen.has(el.name)) return;
      seen.add(el.name);
      var vals = allInputs
        .filter(function (i) {
          return i.name === el.name && i.checked;
        })
        .map(function (i) {
          return i.value;
        });
      params.set(el.name, vals.join("|"));
    });

    var url = new URL(location.href);
    url.search = params.toString();
    history.replaceState(null, "", url.toString());
  }

  function applyQuery() {
    var params = new URLSearchParams(location.search);
    var q = params.get("q");
    if (q) searchInput.value = q;

    var sort = params.get("sort");
    if (sort && ["featured", "name", "ram", "newest"].indexOf(sort) !== -1) {
      sortSelect.value = sort;
    }

    allInputs.forEach(function (el) {
      var param = params.get(el.name);
      if (param === null) return;
      if (el.type === "radio") {
        el.checked = el.value === param;
      } else {
        el.checked = param.split("|").indexOf(el.value) !== -1;
      }
    });
    render();
  }

  var inputTimer = 0;
  root.addEventListener("input", function () {
    window.clearTimeout(inputTimer);
    inputTimer = window.setTimeout(function () {
      render();
      syncUrl();
    }, 120);
  });

  root.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "sort" || t.tagName === "SELECT" || t.tagName === "INPUT") {
      render();
      syncUrl();
    }
  });

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var open = document.body.classList.toggle("filters-open");
      toggleBtn.setAttribute("aria-expanded", String(open));
      toggleBtn.textContent = open ? "Hide filters" : "Show filters";
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      searchInput.value = "";
      allInputs.forEach(function (el) {
        el.checked = false;
      });
      sortSelect.value = "featured";
      render();
      syncUrl();
      document.body.classList.remove("filters-open");
      if (toggleBtn) {
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.textContent = "Show filters";
      }
    });
  }

  applyQuery();
})();
