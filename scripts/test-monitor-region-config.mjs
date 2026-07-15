import assert from "node:assert/strict";
import { getMonitorRegion, MONITOR_REGIONS } from "../config/monitor-regions.mjs";

const aichi = getMonitorRegion("aichi");

assert.equal(aichi.regionId, "aichi");
assert.equal(aichi.targetUrls.length, 18);
assert.equal(aichi.reportLabel, "esthe-ranking toyota monitor");
assert.equal(aichi.outputFiles.data, "data.js");
assert.equal(aichi.outputFiles.snapshot, "esthe_ranking_snapshot.json");
assert.equal(aichi.outputFiles.csv, "toyota_esthe_map_points_ja.csv");
assert.match("愛知県名古屋市中区", aichi.addressScopePattern);
assert.match("愛知県全域", aichi.invalidAddressPattern);

const tokyo = getMonitorRegion("tokyo");
assert.equal(tokyo.targetUrls.length, 8);
assert.equal(tokyo.outputFiles.data, "region-data/tokyo/data.js");
assert.ok(tokyo.targetUrls.every((url) => url.startsWith("https://www.esthe-ranking.jp/")));
assert.ok(Object.values(tokyo.outputFiles).every((filePath) => filePath.startsWith("region-data/tokyo/")));
assert.notEqual(tokyo.outputFiles.data, aichi.outputFiles.data);

assert.throws(() => getMonitorRegion("osaka"), /Unknown monitor region: osaka/);

MONITOR_REGIONS.invalidTest = { regionId: "invalidTest", targetUrls: [], outputFiles: {} };
assert.throws(() => getMonitorRegion("invalidTest"), /Invalid monitor region config: invalidTest/);
delete MONITOR_REGIONS.invalidTest;

console.log("monitor region config: ok");
