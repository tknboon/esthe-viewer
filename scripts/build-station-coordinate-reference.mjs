import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const { normalizeStationGroupLabel } = require("../config/station-normalizer.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regionId = process.argv[2] || "tokyo";
const reportPath = path.join(root, `region-data/${regionId}/official_location_candidates.json`);
const outputPath = path.join(root, `region-data/${regionId}/station_coordinates.json`);
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "config", "regions.js"), "utf8"), sandbox);
const region = sandbox.window.REGIONS[regionId];
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const references = readJsonObject(outputPath);
const stationGroups = [...new Set(report
  .filter((item) => item.label && item.latitude && item.longitude)
  .map((item) => normalizeStationGroupLabel(item.station || ""))
  .filter((station) => station && !station.includes("・")))];

let fetched = 0;
for (const stationGroup of stationGroups) {
  if (references[stationGroup]) continue;
  if (fetched > 0) await delay(1100);
  const reference = await geocodeStation(stationGroup, region);
  if (reference) references[stationGroup] = reference;
  fetched += 1;
}

fs.writeFileSync(outputPath, `${JSON.stringify(sortObject(references), null, 2)}\n`, "utf8");
console.log(`${regionId} station coordinates: ${Object.keys(references).length} cached / ${fetched} fetched`);
console.log(outputPath);

async function geocodeStation(stationGroup, regionConfig) {
  const query = `${stationGroup} ${regionConfig.rootLabel} 日本`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "jp");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: { "user-agent": "AichiEstheViewer/1.0 (+https://www.aichi-esthe.com/)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`station geocode failed: ${response.status} ${stationGroup}`);
  const results = await response.json();
  const selected = results
    .map((item) => ({ item, lat: Number(item.lat), lng: Number(item.lon) }))
    .find(({ lat, lng }) => Number.isFinite(lat)
      && Number.isFinite(lng)
      && lat >= regionConfig.geocodeBounds.south
      && lat <= regionConfig.geocodeBounds.north
      && lng >= regionConfig.geocodeBounds.west
      && lng <= regionConfig.geocodeBounds.east);
  if (!selected) return null;
  return {
    lat: selected.lat,
    lng: selected.lng,
    displayName: selected.item.display_name || "",
    query,
    source: "OpenStreetMap Nominatim",
    updatedAt: new Date().toISOString(),
  };
}

function readJsonObject(filePath) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (error) {
    return {};
  }
}

function sortObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "ja")));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
