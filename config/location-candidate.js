(function initLocationCandidate(root) {
  function readCoordinate(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const number = Number(raw);
    return Number.isFinite(number) ? number : null;
  }

  function readLatLng(candidate) {
    const lat = readCoordinate(candidate?.latitude);
    const lng = readCoordinate(candidate?.longitude);
    if (lat === null || lng === null) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  function parseCoordinateText(value) {
    const raw = String(value ?? "").trim();
    const match = raw.match(
      /^(\d{1,2})\s*[°度]\s*(\d{1,2})\s*['′分]\s*(\d+(?:\.\d+)?)\s*["″秒]?\s*([NS])\s*[,，\s]+\s*(\d{1,3})\s*[°度]\s*(\d{1,2})\s*['′分]\s*(\d+(?:\.\d+)?)\s*["″秒]?\s*([EW])$/i
    );
    if (!match) return null;

    const toDecimal = (degrees, minutes, seconds, direction) => {
      const decimal = Number(degrees) + Number(minutes) / 60 + Number(seconds) / 3600;
      return /[SW]/i.test(direction) ? -decimal : decimal;
    };
    return readLatLng({
      latitude: toDecimal(match[1], match[2], match[3], match[4]),
      longitude: toDecimal(match[5], match[6], match[7], match[8]),
    });
  }

  function hasDetailedAddress(value) {
    const address = String(value || "").trim();
    return /[0-9０-９]/.test(address) && /[都道府県区市町村]/.test(address);
  }

  function isInsideBounds(latLng, bounds) {
    if (!latLng || !bounds) return false;
    return latLng.lat >= bounds.south
      && latLng.lat <= bounds.north
      && latLng.lng >= bounds.west
      && latLng.lng <= bounds.east;
  }

  function hasMultipleStationLabels(station, normalizedStation) {
    const rawStation = String(station || "").trim();
    const stationNameCount = (rawStation.match(/駅/g) || []).length;
    return stationNameCount >= 2
      || String(normalizedStation || "").includes("・")
      || /[、,，＆&|｜]/.test(rawStation);
  }

  function selectSafeSingleCoordinateCandidate({ station, candidates, bounds, normalizeStationGroupLabel }) {
    const normalizeStation = typeof normalizeStationGroupLabel === "function"
      ? normalizeStationGroupLabel
      : (value) => String(value || "").trim();
    const stationGroup = normalizeStation(station || "");
    const usableCandidates = (Array.isArray(candidates) ? candidates : []).filter((candidate) =>
      Boolean(readLatLng(candidate) || hasDetailedAddress(candidate?.address))
    );

    if (!usableCandidates.length) return { candidate: null, reason: "候補なし" };
    if (usableCandidates.length > 1) return { candidate: null, reason: "候補が複数" };
    if (!stationGroup) return { candidate: null, reason: "駅名なし" };
    if (hasMultipleStationLabels(station, stationGroup)) return { candidate: null, reason: "複数駅表記" };

    const candidate = usableCandidates[0];
    const latLng = readLatLng(candidate);
    if (!latLng) return { candidate: null, reason: "座標なし" };
    if (!isInsideBounds(latLng, bounds)) return { candidate: null, reason: "地域範囲外" };

    const candidateStation = normalizeStation(candidate?.label || "");
    if (!candidateStation || candidateStation !== stationGroup) {
      return { candidate: null, reason: "駅名不一致" };
    }

    return { candidate: { ...candidate, ...latLng }, reason: "" };
  }

  const api = {
    hasDetailedAddress,
    hasMultipleStationLabels,
    parseCoordinateText,
    readLatLng,
    selectSafeSingleCoordinateCandidate,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LocationCandidate = api;
})(typeof window !== "undefined" ? window : globalThis);
