import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeStationGroupLabel } = require("../config/station-normalizer.js");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL("../region-data/osaka/data.js", import.meta.url), "utf8"), sandbox);

const rows = sandbox.window.storeData || [];
const references = sandbox.window.storeMeta?.stationCoordinates || {};
const immediateRows = rows.filter((row) => {
  if (row["緯度"] && row["経度"]) return true;
  const station = String(row["最寄駅"] || "");
  const candidates = [
    normalizeStationGroupLabel(station),
    ...station.split(/[・/／,，]/).map((part) => normalizeStationGroupLabel(part)),
  ].filter(Boolean);
  return candidates.some((candidate) => references[candidate]);
});

assert.ok(Object.keys(references).length >= 50, "osaka: station coordinate references are incomplete");
assert.ok(
  immediateRows.length / rows.length >= 0.8,
  `osaka: only ${immediateRows.length}/${rows.length} stores have an immediate map position`
);

const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
assert.match(app, /resolveStationFallbackLatLng/);
assert.match(app, /地点を表示中 \/ \$\{state\.filteredRows\.length\}店舗/);

console.log(`osaka map coverage: ${immediateRows.length}/${rows.length} stores immediately positioned`);
