import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { getMonitorRegion } from "../config/monitor-regions.mjs";

const source = fs.readFileSync(new URL("../config/regions.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const aichi = sandbox.window.REGIONS.aichi;

assert.equal(aichi.regionId, "aichi");
assert.equal(aichi.manualStationOverrides["https://www.esthe-ranking.jp/sakae/shop-detail/f2e48aef-65d9-4065-8b47-e367232c1384/"], "丸の内駅・伏見駅");
assert.equal(aichi.recoveredRemovedHistory["2026-05-07"].length, 23);
assert.match("愛知県全域", new RegExp(aichi.invalidLocationPattern));

const tokyo = sandbox.window.REGIONS.tokyo;
assert.equal(tokyo.regionId, "tokyo");
assert.equal(tokyo.title, "東京都のアジアンエステ");
assert.equal(tokyo.areaOrder.length, 47);
assert.equal(new Set(tokyo.areaOrder).size, 47);
assert.equal(Object.keys(tokyo.areaLabels).length, 47);
assert.equal(tokyo.stationGroupRegions.length, 47);
assert.equal(tokyo.areaLabels.hachioji, "八王子");
assert.equal(tokyo.areaLabels.kasai, "葛西・西葛西");
const monitoredTokyoAreas = getMonitorRegion("tokyo").targetUrls.map((url) => new URL(url).pathname.split("/").filter(Boolean)[0]);
assert.deepEqual([...monitoredTokyoAreas].sort(), [...tokyo.areaOrder].sort());
assert.ok(tokyo.geocodeBounds.west > 139);
assert.deepEqual(
  { ...tokyo.manualLocationOverrides["https://www.esthe-ranking.jp/ueno/shop-detail/257920fe-f7c8-4d94-94b3-ad605977fd3e/"] },
  { lat: 35.7074, lng: 139.7746 }
);

console.log("browser region config: ok");
