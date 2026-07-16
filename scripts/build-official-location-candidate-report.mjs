import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildLocationCorrectionQueue } from "./audit-region-locations.mjs";
import {
  chooseOfficialMapCandidate,
  evaluateStationDistance,
  extractOfficialMapCandidates,
  isSafePublicHttpUrl,
} from "./official-location-candidates.mjs";
import { getMonitorRegion } from "../config/monitor-regions.mjs";

const require = createRequire(import.meta.url);
const { normalizeStationGroupLabel } = require("../config/station-normalizer.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regionId = process.argv[2] || "tokyo";
const options = readOptions(process.argv.slice(3));
const monitorRegion = getMonitorRegion(regionId);
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "config", "regions.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, monitorRegion.outputFiles.data), "utf8"), sandbox);

const region = sandbox.window.REGIONS[regionId];
const stationReferencePath = path.join(root, `region-data/${regionId}/station_coordinates.json`);
const stationReferences = readJsonObject(stationReferencePath);
const rows = sandbox.window.storeData || [];
const correctionQueue = buildLocationCorrectionQueue(
  rows,
  new RegExp(region?.invalidLocationPattern || "^$"),
  sandbox.window.storeMeta?.roomLocationsByListingUrl || {},
  {
    geocodeBounds: region?.geocodeBounds || null,
    manualLocationOverrides: region?.manualLocationOverrides || {},
  }
);
const manualUrls = new Set(correctionQueue.filter((item) => item.candidateType === "manual").map((item) => item.listingUrl));
const rowsByUrl = new Map(rows.map((row) => [String(row["掲載URL"] || ""), row]));
const targets = correctionQueue
  .filter((item) => manualUrls.has(item.listingUrl))
  .map((item) => ({ item, row: rowsByUrl.get(item.listingUrl) || {} }))
  .slice(0, options.limit || undefined);

const results = new Array(targets.length);
let cursor = 0;
await Promise.all(Array.from({ length: Math.min(options.concurrency, targets.length || 1) }, async () => {
  while (cursor < targets.length) {
    const index = cursor++;
    results[index] = await inspectOfficialPage(
      targets[index],
      region?.geocodeBounds || null,
      stationReferences,
      options.timeoutMs,
      options.maxDistanceMeters
    );
  }
}));

const outputPath = path.resolve(root, options.output || `region-data/${regionId}/official_location_candidates.csv`);
fs.writeFileSync(outputPath, `\uFEFF${toCsv(results)}`, "utf8");
const jsonOutputPath = outputPath.replace(/\.csv$/i, ".json");
const coordinateCandidates = results.filter((item) => item.label && item.latitude && item.longitude);
fs.writeFileSync(jsonOutputPath, `${JSON.stringify(coordinateCandidates, null, 2)}\n`, "utf8");
const reviewCount = results.filter((item) => item.decision === "review").length;
const fetchedCount = results.filter((item) => item.httpStatus >= 200 && item.httpStatus < 400).length;
console.log(`${regionId} official location report: ${results.length} stores / ${fetchedCount} fetched / ${reviewCount} review candidates`);
console.log(outputPath);

async function inspectOfficialPage({ item, row }, bounds, stationReferences, timeoutMs, maxDistanceMeters) {
  const officialUrl = String(row["オフィシャルHP"] || row["公式HP"] || "").trim();
  const base = {
    storeName: item.storeName,
    station: item.station,
    listingUrl: item.listingUrl,
    officialUrl,
    resolvedUrl: "",
    httpStatus: 0,
    mapCount: 0,
    decision: "hold",
    reason: officialUrl ? "取得失敗" : "公式HPなし",
    label: "",
    latitude: "",
    longitude: "",
    stationLatitude: "",
    stationLongitude: "",
    distanceMeters: "",
  };
  if (!officialUrl) return base;
  if (!isSafePublicHttpUrl(officialUrl)) return { ...base, reason: "安全でない公式HP URL" };

  try {
    const response = await fetchPublicUrl(officialUrl, timeoutMs);
    const html = await response.text();
    const candidates = extractOfficialMapCandidates(html, bounds);
    const selection = chooseOfficialMapCandidate(candidates, item.station, normalizeStationGroupLabel);
    const stationGroup = normalizeStationGroupLabel(item.station || "");
    const stationReference = stationReferences[stationGroup] || null;
    const distanceResult = selection.candidate && stationReference
      ? evaluateStationDistance(selection.candidate.latLng, stationReference, maxDistanceMeters)
      : null;
    const decision = selection.candidate
      ? (distanceResult?.accepted ? "review" : "hold")
      : "hold";
    const reason = selection.candidate
      ? (distanceResult?.reason || "駅座標なし")
      : selection.reason;
    return {
      ...base,
      resolvedUrl: response.url,
      httpStatus: response.status,
      mapCount: candidates.length,
      decision,
      reason,
      label: selection.candidate?.label || "",
      latitude: selection.candidate?.latLng?.lat ?? "",
      longitude: selection.candidate?.latLng?.lng ?? "",
      stationLatitude: stationReference?.lat ?? "",
      stationLongitude: stationReference?.lng ?? "",
      distanceMeters: distanceResult?.distance === null || distanceResult?.distance === undefined
        ? ""
        : Math.round(distanceResult.distance),
    };
  } catch (error) {
    return { ...base, reason: `${error?.name || "Error"}: ${error?.message || "取得失敗"}` };
  }
}

async function fetchPublicUrl(initialUrl, timeoutMs) {
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    if (!isSafePublicHttpUrl(currentUrl)) throw new Error("unsafe redirect URL");
    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0 (compatible; AichiEstheLocationAudit/1.0)" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    currentUrl = new URL(location, currentUrl).href;
  }
  throw new Error("too many redirects");
}

function readOptions(args) {
  const values = Object.fromEntries(args.map((arg) => {
    const [key, value = ""] = arg.replace(/^--/, "").split("=", 2);
    return [key, value];
  }));
  return {
    concurrency: Math.max(1, Number(values.concurrency) || 6),
    timeoutMs: Math.max(1000, Number(values.timeout) || 8000),
    maxDistanceMeters: Math.max(100, Number(values["max-distance"]) || 3000),
    limit: Math.max(0, Number(values.limit) || 0),
    output: values.output || "",
  };
}

function toCsv(items) {
  const columns = [
    ["店舗名", "storeName"], ["最寄駅", "station"], ["掲載URL", "listingUrl"],
    ["公式HP", "officialUrl"], ["取得先URL", "resolvedUrl"], ["HTTP", "httpStatus"],
    ["地図数", "mapCount"], ["判定", "decision"], ["理由", "reason"],
    ["地図ラベル", "label"], ["緯度", "latitude"], ["経度", "longitude"],
    ["駅緯度", "stationLatitude"], ["駅経度", "stationLongitude"], ["駅からの距離m", "distanceMeters"],
  ];
  const escape = (value) => {
    const text = String(value ?? "");
    const safe = /^[\t ]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [
    columns.map(([label]) => escape(label)).join(","),
    ...items.map((item) => columns.map(([, key]) => escape(item[key])).join(",")),
  ].join("\n") + "\n";
}

function readJsonObject(filePath) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (error) {
    return {};
  }
}
