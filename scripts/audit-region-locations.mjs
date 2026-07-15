import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { getMonitorRegion } from "../config/monitor-regions.mjs";

const require = createRequire(import.meta.url);
const { normalizeStationGroupLabel: normalizeStationForAudit } = require("../config/station-normalizer.js");
const { hasDetailedAddress, readLatLng, selectSafeSingleCoordinateCandidate } = require("../config/location-candidate.js");

export function classifyLocationRow(row, invalidLocationPattern) {
  const location = String(row["住所または座標"] || "").trim();
  const station = String(row["最寄駅"] || "").trim();
  const name = String(row["店舗名"] || "").trim();
  const latitude = String(row["緯度"] || "").trim();
  const longitude = String(row["経度"] || "").trim();
  const hasCoordinates = Boolean(latitude && longitude);
  const isCoordinateLocation = /^\s*[0-9]{2}\.[0-9]+\s*,\s*[0-9]{3}\.[0-9]+\s*$/.test(location);
  const hasUsableLocation = Boolean(location && !isCoordinateLocation && !invalidLocationPattern.test(location));
  const hasDetailedAddress = Boolean(
    hasUsableLocation &&
    /[0-9０-９]/.test(location) &&
    /[都道府県区市町村]/.test(location)
  );
  const quality = hasCoordinates || hasDetailedAddress ? "precise" : station ? "station" : "unknown";
  const query = hasCoordinates && !hasUsableLocation
    ? `${latitude},${longitude}`
    : hasUsableLocation ? location : station || name;

  return { quality, query, location, station, name, latitude, longitude };
}

export { normalizeStationForAudit };

function isDetailedAddress(value) {
  return hasDetailedAddress(value);
}

function isValidCoordinateCandidate(candidate) {
  return Boolean(readLatLng(candidate));
}

function candidateMatchesStation(candidate, station) {
  const candidateStation = normalizeStationForAudit(candidate?.label || "");
  const stationGroup = normalizeStationForAudit(station || "");
  if (!candidateStation || !stationGroup) return true;
  const stationParts = stationGroup.split("・");
  return stationParts.some((part) => part === candidateStation || part.includes(candidateStation) || candidateStation.includes(part));
}

export function buildLocationCorrectionQueue(rows, invalidLocationPattern, roomLocationsByListingUrl = {}, options = {}) {
  const stationRows = (rows || [])
    .map((row) => ({ row, location: classifyLocationRow(row, invalidLocationPattern) }))
    .filter((item) => item.location.quality === "station");
  const stationCounts = new Map();

  for (const item of stationRows) {
    const group = normalizeStationForAudit(item.location.station) || item.location.station || item.location.name;
    stationCounts.set(group, (stationCounts.get(group) || 0) + 1);
  }

  return stationRows.map(({ row, location }) => {
    const listingUrl = String(row["掲載URL"] || "").trim();
    const candidates = Array.isArray(roomLocationsByListingUrl[listingUrl]) ? roomLocationsByListingUrl[listingUrl] : [];
    const matchingCandidates = candidates.filter((candidate) => candidateMatchesStation(candidate, location.station));
    const sourceCandidates = matchingCandidates.filter((candidate) =>
      isValidCoordinateCandidate(candidate) || isDetailedAddress(candidate?.address)
    );
    const coordinateCandidate = sourceCandidates.find((candidate) => isValidCoordinateCandidate(candidate));
    const addressCandidate = sourceCandidates.find((candidate) => isDetailedAddress(candidate?.address));
    const candidate = sourceCandidates.length === 1 ? sourceCandidates[0] : null;
    const candidateType = sourceCandidates.length > 1
      ? "multiple"
      : coordinateCandidate ? "coordinate" : addressCandidate ? "address" : "manual";
    const stationGroup = normalizeStationForAudit(location.station) || location.station || location.name;
    const autoSelection = selectSafeSingleCoordinateCandidate({
      station: location.station,
      candidates,
      bounds: options.geocodeBounds || null,
      normalizeStationGroupLabel: normalizeStationForAudit,
    });

    return {
      stationGroup,
      stationCount: stationCounts.get(stationGroup) || 1,
      storeName: location.name,
      station: location.station,
      listingUrl,
      candidateType,
      candidateCount: sourceCandidates.length,
      autoApplicable: Boolean(autoSelection.candidate),
      holdReason: autoSelection.reason,
      candidateAddress: String(candidate?.address || "").trim(),
      latitude: String(candidate?.latitude || "").trim(),
      longitude: String(candidate?.longitude || "").trim(),
      candidateNote: sourceCandidates.length > 1
        ? sourceCandidates.map((item) => [item.label, item.address, item.latitude && item.longitude ? `${item.latitude},${item.longitude}` : ""]
          .filter(Boolean).join(" ")).join(" | ")
        : String(candidate?.note || "").trim(),
    };
  }).sort((left, right) => {
    const priority = { coordinate: 0, address: 1, multiple: 2, manual: 3 };
    return priority[left.candidateType] - priority[right.candidateType]
      || right.stationCount - left.stationCount
      || left.stationGroup.localeCompare(right.stationGroup, "ja")
      || left.storeName.localeCompare(right.storeName, "ja");
  });
}

export function locationCorrectionQueueToCsv(queue) {
  const columns = [
    ["優先度", (row, index) => index + 1],
    ["候補種別", (row) => row.candidateType],
    ["駅グループ", (row) => row.stationGroup],
    ["同駅件数", (row) => row.stationCount],
    ["店舗名", (row) => row.storeName],
    ["最寄駅", (row) => row.station],
    ["掲載URL", (row) => row.listingUrl],
    ["候補数", (row) => row.candidateCount],
    ["自動適用", (row) => row.autoApplicable ? "可" : "保留"],
    ["保留理由", (row) => row.holdReason],
    ["候補住所", (row) => row.candidateAddress],
    ["緯度", (row) => row.latitude],
    ["経度", (row) => row.longitude],
    ["候補メモ", (row) => row.candidateNote],
  ];
  const escapeCsv = (value) => {
    const text = String(value ?? "");
    const safeText = /^[\t ]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };
  return [
    columns.map(([label]) => escapeCsv(label)).join(","),
    ...(queue || []).map((row, index) => columns.map(([, read]) => escapeCsv(read(row, index))).join(",")),
  ].join("\n") + "\n";
}

export function auditLocationRows(rows, invalidLocationPattern) {
  const counts = { precise: 0, station: 0, unknown: 0 };
  const queryGroups = new Map();
  const coordinateGroups = new Map();
  const stationGroups = new Map();

  for (const row of rows || []) {
    const result = classifyLocationRow(row, invalidLocationPattern);
    counts[result.quality] += 1;
    if (result.query) {
      queryGroups.set(result.query, (queryGroups.get(result.query) || 0) + 1);
    }
    if (result.latitude && result.longitude) {
      const coordinate = `${result.latitude},${result.longitude}`;
      coordinateGroups.set(coordinate, (coordinateGroups.get(coordinate) || 0) + 1);
    }
    if (result.quality === "station") {
      const stationGroup = normalizeStationForAudit(result.station);
      if (stationGroup) stationGroups.set(stationGroup, (stationGroups.get(stationGroup) || 0) + 1);
    }
  }

  const repeatedQueries = [...queryGroups.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ja"));
  const repeatedCoordinates = [...coordinateGroups.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1]);
  const repeatedStations = [...stationGroups.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ja"));

  return {
    total: rows.length,
    counts,
    repeatedQueries,
    repeatedCoordinates,
    repeatedStations,
    maxQueryConcentration: repeatedQueries[0]?.[1] || 1,
    maxCoordinateConcentration: repeatedCoordinates[0]?.[1] || 1,
    maxStationConcentration: repeatedStations[0]?.[1] || 1,
  };
}

export function hasCriticalLocationAudit(audit) {
  const unknownRatio = audit.total ? audit.counts.unknown / audit.total : 1;
  return (
    audit.maxQueryConcentration >= 100 ||
    audit.maxCoordinateConcentration >= 100 ||
    audit.maxStationConcentration >= 100 ||
    unknownRatio >= 0.05
  );
}

function loadBrowserScript(filePath) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(filePath, "utf8"), sandbox);
  return sandbox.window;
}

export function auditRegion(regionId) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const monitorRegion = getMonitorRegion(regionId);
  const regions = loadBrowserScript(path.join(root, "config", "regions.js")).REGIONS;
  const rows = loadBrowserScript(path.join(root, monitorRegion.outputFiles.data)).storeData || [];
  const invalidLocationPattern = new RegExp(regions[regionId]?.invalidLocationPattern || "^$");
  return auditLocationRows(rows, invalidLocationPattern);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const regionId = process.argv[2] || "aichi";
  const audit = auditRegion(regionId);
  console.log(`${regionId} location audit: ${audit.total} stores`);
  console.log(`  address/coordinates: ${audit.counts.precise}`);
  console.log(`  station fallback: ${audit.counts.station}`);
  console.log(`  unknown: ${audit.counts.unknown}`);
  console.log(`  max query concentration: ${audit.maxQueryConcentration}`);
  console.log(`  max station concentration: ${audit.maxStationConcentration}`);
  console.log(`  repeated exact coordinates: ${audit.repeatedCoordinates.length}`);
  if (hasCriticalLocationAudit(audit)) process.exitCode = 1;
}
