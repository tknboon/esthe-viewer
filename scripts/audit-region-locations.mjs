import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { getMonitorRegion } from "../config/monitor-regions.mjs";

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

export function normalizeStationForAudit(value) {
  return String(value || "")
    .trim()
    .replace(/駅.*$/, "駅");
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
