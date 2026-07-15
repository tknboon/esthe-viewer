(function exposeStationNormalizer(root) {
  function isStationAccessSuffix(value) {
    const suffix = String(value || "").replace(/\s+/g, "").trim();
    if (!suffix) return false;

    return /^(?:\d+[A-Za-z]?番?(?:出口|口)|[A-Za-z]\d*(?:出口|口)|[東西南北]\d*[A-Za-z]?番?(?:出口|口)(?:[A-Za-z]\d*)?|.+(?:出口|改札口|口)(?:[A-Za-z]\d*)?(?:(?:徒歩|徒步)?\d+分)?|(?:徒歩|徒步)?\d+分|より|すぐ|[東西南北]|発.*)$/u.test(suffix);
  }

  function normalizeSingleStationGroupLabel(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "";

    const match = text.match(/^(.+?駅)(.+)$/u);
    if (!match) return text;
    return isStationAccessSuffix(match[2]) ? match[1] : text;
  }

  function normalizeStationGroupLabel(value) {
    const text = String(value || "")
      .replace(/[／/]/g, "・")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return "";

    const parts = text
      .replace(/徒歩.*$/u, "")
      .replace(/車で.*$/u, "")
      .replace(/から.*$/u, "")
      .split("・")
      .map((part) => part.trim())
      .filter(Boolean);
    const normalizedParts = [];

    for (const part of parts) {
      const previous = normalizedParts[normalizedParts.length - 1] || "";
      if (previous.endsWith("駅") && isStationAccessSuffix(part)) continue;
      const normalizedPart = normalizeSingleStationGroupLabel(part);
      if (normalizedPart) normalizedParts.push(normalizedPart);
    }

    return normalizedParts.join("・").replace(/\s+/g, " ").trim();
  }

  const api = { isStationAccessSuffix, normalizeStationGroupLabel };
  root.stationNormalizer = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
