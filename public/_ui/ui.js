// kokoapi.space — shared UI: theme toggle, file-drop validation and toasts.

(function () {
  "use strict";

  var THEME_KEY = "koko-theme";

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

  function fileProblem(input, file) {
    if (!file) return "No file selected.";
    if (file.size === 0) return "The file is empty.";
    var accept = (input.getAttribute("accept") || "").toLowerCase();
    if (!accept) return null;
    var name = (file.name || "").toLowerCase();
    if (accept.indexOf("image/") !== -1) {
      if (/^image\//.test(file.type || "")) return null;
      if (/\.(png|jpe?g|webp|gif|svg|bmp|avif|ico)$/.test(name)) return null;
      return "Not an image file.";
    }
    if (accept.indexOf("pdf") !== -1) {
      if (file.type && file.type !== "application/pdf" && !name.endsWith(".pdf")) {
        return "Not a PDF file.";
      }
    }
    return null;
  }

  function showToast(msg, isError) {
    var host = document.getElementById("koko-toast");
    if (!host) {
      host = document.createElement("div");
      host.id = "koko-toast";
      host.setAttribute("role", "status");
      document.body.appendChild(host);
    }
    var toast = document.createElement("div");
    toast.className = "toast" + (isError ? " toast-error" : "");
    toast.textContent = msg;
    host.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 4000);
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
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        setTheme(getTheme() === "light" ? "dark" : "light");
      });
    }

    // Drag & drop for every <label class="file-drop"> wrapping a file input,
    // with accept/type/empty-file validation before the change event fires.
    var inputs = document.querySelectorAll("label.file-drop input[type=file]");
    Array.prototype.forEach.call(inputs, function (input) {
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
        var first = e.dataTransfer.files[0];
        var problem = fileProblem(input, first);
        if (problem) {
          showToast(problem, true);
          return;
        }
        try {
          var dt = new DataTransfer();
          Array.prototype.forEach.call(e.dataTransfer.files, function (f) {
            dt.items.add(f);
          });
          input.files = dt.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (err) {
          // DataTransfer unavailable (older browsers); nothing else to do.
        }
      });
    });
  });

  window.kokoShowToast = showToast;
})();
