(() => {
  "use strict";
  const OPT_OUT_KEY = "koko-analytics-opt-out";
  const isPortuguese = document.documentElement.lang.toLowerCase().startsWith("pt");
  const secretReader = /^\/secret\/[^/]+\/?$/i.test(location.pathname) && location.pathname !== "/secret/";
  let memoryOptOut = false;
  try {
    if (localStorage.getItem("koko-analytics-consent") === "denied") {
      localStorage.setItem(OPT_OUT_KEY, "1");
    }
    localStorage.removeItem("koko-analytics-consent");
    localStorage.removeItem("koko-analytics-daily-id");
  } catch {}

  function optedOut() {
    try { return memoryOptOut || localStorage.getItem(OPT_OUT_KEY) === "1"; } catch { return memoryOptOut; }
  }

  function sendPageview(path, referrer, campaign) {
    if (secretReader || optedOut()) return;
    const safePath = path.split(/[?#]/, 1)[0];
    let sourceOrigin = "";
    try { sourceOrigin = referrer ? new URL(referrer).origin : ""; } catch {}
    fetch("/analytics/collect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      referrerPolicy: "no-referrer",
      body: JSON.stringify({
        path: safePath,
        referrer: sourceOrigin,
        campaign: campaign === true,
      }),
    }).catch(() => {});
  }

  function settingsLink() {
    const footer = document.querySelector(".site-footer, footer");
    if (!footer || footer.querySelector("[data-analytics-settings]")) return;
    const link = document.createElement("button");
    link.type = "button";
    link.className = "analytics-settings-link";
    link.dataset.analyticsSettings = "";
    const updateLabel = () => {
      link.textContent = optedOut()
        ? (isPortuguese ? "Ativar métricas agregadas" : "Enable aggregate metrics")
        : (isPortuguese ? "Desativar métricas agregadas" : "Disable aggregate metrics");
      link.setAttribute("aria-label", link.textContent);
    };
    updateLabel();
    link.addEventListener("click", () => {
      if (optedOut()) {
        memoryOptOut = false;
        try { localStorage.removeItem(OPT_OUT_KEY); } catch { memoryOptOut = true; }
        if (!optedOut()) sendPageview(location.pathname, "", false);
      } else {
        memoryOptOut = true;
        try { localStorage.setItem(OPT_OUT_KEY, "1"); } catch {}
      }
      updateLabel();
    });
    footer.append(link);
  }

  function hasCampaign() {
    const params = new URLSearchParams(location.search);
    return ["utm_source", "utm_medium", "utm_campaign"].some((key) => params.has(key));
  }

  function bootstrap() {
    settingsLink();
    if (secretReader) return;
    sendPageview(location.pathname, document.referrer, hasCampaign());

    let lastPath = location.pathname;
    const originalPushState = history.pushState.bind(history);
    history.pushState = (...args) => {
      originalPushState(...args);
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        sendPageview(lastPath, "", false);
      }
    };
    addEventListener("popstate", () => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        sendPageview(lastPath, "", false);
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  else bootstrap();
})();
