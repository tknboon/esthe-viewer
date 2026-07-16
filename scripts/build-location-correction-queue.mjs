import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildLocationCorrectionQueue, locationCorrectionQueueToCsv } from "./audit-region-locations.mjs";
import { getMonitorRegion } from "../config/monitor-regions.mjs";

const regionId = process.argv[2] || "tokyo";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const monitorRegion = getMonitorRegion(regionId);
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "config", "regions.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, monitorRegion.outputFiles.data), "utf8"), sandbox);

const invalidLocationPattern = new RegExp(sandbox.window.REGIONS[regionId]?.invalidLocationPattern || "^$");
const queue = buildLocationCorrectionQueue(
  sandbox.window.storeData || [],
  invalidLocationPattern,
  sandbox.window.storeMeta?.roomLocationsByListingUrl || {},
  {
    geocodeBounds: sandbox.window.REGIONS[regionId]?.geocodeBounds || null,
    manualLocationOverrides: sandbox.window.REGIONS[regionId]?.manualLocationOverrides || {},
  }
);
const outputPath = path.join(path.dirname(path.join(root, monitorRegion.outputFiles.data)), "location_correction_queue.csv");
fs.writeFileSync(outputPath, `\uFEFF${locationCorrectionQueueToCsv(queue)}`, "utf8");

const candidateCount = queue.filter((row) => row.candidateType !== "manual").length;
const autoApplicableCount = queue.filter((row) => row.autoApplicable).length;
console.log(`${regionId} correction queue: ${queue.length} stores / ${candidateCount} source candidates / ${autoApplicableCount} auto applicable`);
console.log(outputPath);
