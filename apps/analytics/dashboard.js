(() => {
  "use strict";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  async function load() {
    const notice = document.querySelector("#notice");
    notice.textContent = "Loading…";
    try {
      const response = await fetch(`/analytics/admin/data?days=${document.querySelector("#days").value}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the report.");
      const data = await response.json();
      const sum = (items, key) => items.reduce((total, row) => total + Number(row[key] || 0), 0);
      const views = sum(data.totals, "pageviews");
      const browserDays = sum(data.totals, "visitorDays");
      const organic = sum(data.rows.filter((row) => row.source === "organic-search"), "pageviews");
      document.querySelector("#cards").innerHTML = `<div class="card"><b>${views.toLocaleString()}</b><span>Pageviews</span></div><div class="card"><b>${browserDays.toLocaleString()}</b><span>Unique browser-days · approximate</span></div><div class="card"><b>${organic.toLocaleString()}</b><span>Organic-search pageviews</span></div>`;
      document.querySelector("#rows").innerHTML = data.rows.map((row) => `<tr><td>${escapeHtml(row.site)}</td><td>${escapeHtml(row.path)}</td><td>${escapeHtml(row.source)}</td><td>${Number(row.pageviews).toLocaleString()}</td><td>${Number(row.visitors).toLocaleString()}</td></tr>`).join("") || '<tr><td colspan="5">No opted-in visits yet.</td></tr>';
      notice.textContent = "Referrer is stored as a source category only. Raw page queries, fragments, file contents, IP addresses and user agents are not stored in this analytics database.";
    } catch (error) { notice.textContent = error.message; }
  }

  document.querySelector("#refresh").addEventListener("click", load);
  document.querySelector("#days").addEventListener("change", load);
  load();
})();
