import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function loadBrowserScript(relativePath) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"), sandbox);
  return sandbox.window;
}

const { REGIONS } = loadBrowserScript("../config/regions.js");
const { storeData } = loadBrowserScript("../region-data/tokyo/data.js");
const invalidLocationPattern = new RegExp(REGIONS.tokyo.invalidLocationPattern);
const queryCounts = new Map();

for (const row of storeData) {
  const location = String(row["住所または座標"] || "").trim();
  const station = String(row["最寄駅"] || "").trim();
  const name = String(row["店舗名"] || "").trim();
  const hasUsableLocation = location && !invalidLocationPattern.test(location);
  const query = hasUsableLocation ? location : station || name;
  queryCounts.set(query, (queryCounts.get(query) || 0) + 1);
}

assert.equal(queryCounts.get("東京都") || 0, 0);
assert.ok(Math.max(...queryCounts.values()) < 100);

console.log("tokyo location fallback: ok");
