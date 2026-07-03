(function () {
  const token = String(window.siteAnalyticsConfig?.cloudflareToken || "").trim();
  if (!token) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute("data-cf-beacon", JSON.stringify({ token }));
  document.head.appendChild(script);
})();
