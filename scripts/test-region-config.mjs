import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

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
assert.deepEqual([...tokyo.areaOrder], ["shinjuku", "ikebukuro", "shibuya", "ueno", "akihabara", "kinshicho", "kamata", "tachikawa"]);
assert.equal(Object.keys(tokyo.areaLabels).length, 8);

console.log("browser region config: ok");
