import assert from "node:assert/strict";
import fs from "node:fs";

const report = JSON.parse(fs.readFileSync(new URL("../region-data/tokyo/official_location_candidates.json", import.meta.url), "utf8"));
const stations = JSON.parse(fs.readFileSync(new URL("../region-data/tokyo/station_coordinates.json", import.meta.url), "utf8"));
const newFace = report.find((item) => item.storeName === "New Face");

assert.ok(report.length >= 1);
assert.ok(stations["清瀬駅"]);
assert.ok(stations["東新宿駅"]);
assert.equal(newFace?.decision, "hold");
assert.match(newFace?.reason || "", /駅から7\.0km・範囲外/);
assert.ok(Number(newFace?.distanceMeters) > 6000);
assert.equal(report.some((item) => item.storeName === "カリーナ"), false);

console.log("official location report: ok");
