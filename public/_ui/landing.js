// Sizes the embedded tool widget (iframe[data-koko-widget]) on focused landing
// pages. The app inside the iframe posts its content height as it changes.
// External file (not inline) so the production CSP (script-src 'self') holds.
(function () {
  "use strict";
  var frame = document.querySelector("iframe[data-koko-widget]");
  if (!frame) return;
  window.addEventListener("message", function (e) {
    if (e.origin !== window.location.origin) return;
    var d = e.data;
    if (!d || d.type !== "koko-widget-height" || typeof d.height !== "number") return;
    var h = Math.max(320, Math.min(Math.round(d.height), 2400));
    if (frame.style.height !== h + "px") frame.style.height = h + "px";
  });
})();
