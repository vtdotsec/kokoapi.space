(() => {
  "use strict";
  const CONSENT_KEY = "koko-analytics-consent";
  const ID_KEY = "koko-analytics-daily-id";
  const isPortuguese = document.documentElement.lang.toLowerCase().startsWith("pt");
  const secretReader = /^\/secret\/[^/]+\/?$/i.test(location.pathname) && location.pathname !== "/secret/";

  function getPreference() {
    try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
  }
  function setPreference(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch {}
  }
  function clearVisitorId() {
    try { localStorage.removeItem(ID_KEY); } catch {}
  }

  function dayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function visitorId() {
    const today = dayKey();
    try {
      const saved = JSON.parse(localStorage.getItem(ID_KEY) || "null");
      if (saved && saved.day === today && /^[a-f0-9-]{36}$/i.test(saved.id)) return saved.id;
      const id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, JSON.stringify({ day: today, id }));
      return id;
    } catch { return crypto.randomUUID(); }
  }

  function sendPageview(path, referrer, campaign) {
    if (secretReader || getPreference() !== "granted") return;
    const safePath = path.split(/[?#]/, 1)[0];
    let sourceOrigin = "";
    try { sourceOrigin = referrer ? new URL(referrer).origin : ""; } catch {}
    fetch("/analytics/collect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({
        path: safePath,
        referrer: sourceOrigin,
        campaign: campaign === true,
        visitorId: visitorId(),
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
    link.textContent = isPortuguese ? "Preferências de privacidade" : "Privacy preferences";
    link.addEventListener("click", showConsent);
    footer.append(link);
  }

  function showConsent() {
    setPreference("");
    document.querySelector("[data-analytics-banner]")?.remove();
    const banner = document.createElement("section");
    banner.className = "analytics-banner";
    banner.dataset.analyticsBanner = "";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", isPortuguese ? "Preferências de privacidade" : "Privacy preferences");
    const copy = document.createElement("p");
    copy.textContent = isPortuguese
      ? "Analytics opcional e próprio. Se aceitar, medimos páginas e origem para estimar visitas; não coletamos o conteúdo dos arquivos. O identificador aleatório muda diariamente."
      : "Optional, first-party analytics. If you opt in, we count pages and traffic sources; file contents are never collected. The random browser ID changes daily.";
    const details = document.createElement("a");
    details.href = isPortuguese ? "/privacidade/" : "/privacy/";
    details.textContent = isPortuguese ? "Como os dados são usados" : "How data is used";
    const actions = document.createElement("div");
    actions.className = "analytics-banner-actions";
    const reject = document.createElement("button");
    reject.type = "button";
    reject.textContent = isPortuguese ? "Recusar" : "Decline";
    reject.addEventListener("click", () => {
      setPreference("denied");
      clearVisitorId();
      banner.remove();
    });
    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "analytics-accept";
    accept.textContent = isPortuguese ? "Aceitar analytics" : "Allow analytics";
    accept.addEventListener("click", () => {
      setPreference("granted");
      banner.remove();
      sendPageview(location.pathname, document.referrer, hasCampaign());
    });
    actions.append(reject, accept);
    banner.append(copy, details, actions);
    document.body.append(banner);
  }

  function hasCampaign() {
    const params = new URLSearchParams(location.search);
    return ["utm_source", "utm_medium", "utm_campaign"].some((key) => params.has(key));
  }

  function bootstrap() {
    settingsLink();
    if (secretReader) return;
    const choice = getPreference();
    if (choice === "granted") sendPageview(location.pathname, document.referrer, hasCampaign());
    else if (!choice) showConsent();

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
