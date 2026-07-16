const MAP_URL_PATTERN = /(?:href|src)=["']([^"']*(?:google\.com\/maps|maps\.app\.goo\.gl)[^"']*)["']/gi;

export function extractOfficialMapCandidates(html, bounds = null) {
  const source = String(html || "");
  const urls = [...source.matchAll(MAP_URL_PATTERN)].map((match) => decodeHtmlUrl(match[1]));
  const uniqueUrls = [...new Set(urls)];
  return uniqueUrls.map((url) => parseGoogleMapUrl(url, bounds));
}

export function chooseOfficialMapCandidate(candidates, station, normalizeStationGroupLabel) {
  const usable = (Array.isArray(candidates) ? candidates : []).filter((candidate) => candidate.latLng);
  if (!usable.length) return { candidate: null, reason: "座標候補なし" };

  const normalizedStation = normalizeStationGroupLabel(station || "");
  const reviewed = usable.filter((candidate) => {
    if (candidate.reason) return false;
    const normalizedLabel = normalizeStationGroupLabel(candidate.label || candidate.query || "");
    return normalizedLabel && normalizedLabel !== normalizedStation && !normalizedLabel.endsWith("駅");
  });
  const coordinateKeys = new Set(reviewed.map((candidate) => `${candidate.latLng.lat.toFixed(6)},${candidate.latLng.lng.toFixed(6)}`));

  if (!reviewed.length) return { candidate: null, reason: usable[0].reason || "駅地図またはラベルなし" };
  if (coordinateKeys.size > 1) return { candidate: null, reason: "公式HP内に複数座標" };
  return { candidate: reviewed[0], reason: "駅からの距離確認が必要" };
}

export function isSafePublicHttpUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch (error) {
    return false;
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return false;
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname === "::1") return false;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return true;
  const parts = hostname.split(".").map(Number);
  return !(parts[0] === 0
    || parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168));
}

export function distanceMeters(left, right) {
  if (!left || !right) return null;
  const values = [left.lat, left.lng, right.lat, right.lng].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const [leftLat, leftLng, rightLat, rightLng] = values.map((value) => value * Math.PI / 180);
  const deltaLat = rightLat - leftLat;
  const deltaLng = rightLng - leftLng;
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function evaluateStationDistance(candidateLatLng, stationLatLng, maxDistanceMeters = 3000) {
  const distance = distanceMeters(candidateLatLng, stationLatLng);
  if (distance === null) return { accepted: false, distance: null, reason: "駅座標なし" };
  if (distance > maxDistanceMeters) {
    return { accepted: false, distance, reason: `駅から${formatDistance(distance)}・範囲外` };
  }
  return { accepted: true, distance, reason: `駅から${formatDistance(distance)}・手動確認` };
}

function parseGoogleMapUrl(rawUrl, bounds) {
  const url = String(rawUrl || "").trim();
  const decoded = safeDecode(url);
  const query = readQueryParameter(decoded, "q") || readQueryParameter(decoded, "query");
  const center = readCoordinatePair(readQueryParameter(decoded, "center"));
  const pb = readQueryParameter(decoded, "pb");
  const pbCoordinates = pb ? extractPbCoordinatePairs(pb) : [];
  const label = pb ? extractPbLabel(pb) : query;
  const latLng = center || (pbCoordinates.length === 1 ? pbCoordinates[0] : null);
  const isRouteMap = /!1m(?:2[0-9]|3[0-9])|!4m\d+!3e2/.test(pb);

  let reason = "";
  if (isRouteMap || pbCoordinates.length > 1) reason = "経路地図または複数地点";
  else if (!latLng) reason = "座標なし";
  else if (bounds && !isInsideBounds(latLng, bounds)) reason = "地域範囲外";
  else if (!label) reason = "地図ラベルなし";

  return { url, query, label, latLng, reason };
}

function extractPbCoordinatePairs(pbValue) {
  const pb = safeDecode(pbValue);
  const pairs = [];
  for (const match of pb.matchAll(/!2d(-?\d+(?:\.\d+))!3d(-?\d+(?:\.\d+))/g)) {
    const latLng = { lat: Number(match[2]), lng: Number(match[1]) };
    if (!pairs.some((item) => Math.abs(item.lat - latLng.lat) < 0.000001 && Math.abs(item.lng - latLng.lng) < 0.000001)) {
      pairs.push(latLng);
    }
  }
  return pairs;
}

function extractPbLabel(pbValue) {
  const labels = [...safeDecode(pbValue).matchAll(/!2s([^!]+)/g)]
    .map((match) => safeDecode(match[1]).replace(/\+/g, " ").trim())
    .filter((label) => label && !/^[a-z]{2}(?:-[A-Z]{2})?$/i.test(label) && label !== "place");
  return labels[labels.length - 1] || "";
}

function readCoordinatePair(value) {
  const match = String(value || "").match(/^\s*(-?\d+(?:\.\d+))\s*,\s*(-?\d+(?:\.\d+))\s*$/);
  if (!match) return null;
  const latLng = { lat: Number(match[1]), lng: Number(match[2]) };
  return Number.isFinite(latLng.lat) && Number.isFinite(latLng.lng) ? latLng : null;
}

function readQueryParameter(url, name) {
  const match = String(url || "").match(new RegExp(`[?&]${name}=([^&#]+)`, "i"));
  return match?.[1] ? safeDecode(match[1].replace(/\+/g, " ")) : "";
}

function decodeHtmlUrl(value) {
  return String(value || "").replace(/&amp;/g, "&").replace(/&#0*38;/g, "&");
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch (error) {
    return String(value || "");
  }
}

function isInsideBounds(latLng, bounds) {
  return latLng.lat >= bounds.south
    && latLng.lat <= bounds.north
    && latLng.lng >= bounds.west
    && latLng.lng <= bounds.east;
}

function formatDistance(distance) {
  return distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`;
}
