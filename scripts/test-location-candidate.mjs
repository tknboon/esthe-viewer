import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { selectSafeSingleCoordinateCandidate } = require("../config/location-candidate.js");
const { normalizeStationGroupLabel } = require("../config/station-normalizer.js");

const bounds = { south: 35.45, west: 139.2, north: 35.95, east: 140.15 };
const select = (station, candidates) => selectSafeSingleCoordinateCandidate({
  station,
  candidates,
  bounds,
  normalizeStationGroupLabel,
});

const safe = select("新宿駅西口", [
  { label: "新宿駅西口", latitude: "35.690", longitude: "139.700" },
]);
assert.deepEqual({ lat: safe.candidate.lat, lng: safe.candidate.lng }, { lat: 35.69, lng: 139.7 });
assert.equal(safe.reason, "");

assert.equal(select("新宿駅", [{ label: "新宿駅", latitude: "", longitude: "" }]).reason, "候補なし");
assert.equal(select("新宿駅", [{ label: "渋谷駅", latitude: "35.690", longitude: "139.700" }]).reason, "駅名不一致");
assert.equal(select("新宿駅・大久保駅", [{ label: "新宿駅", latitude: "35.690", longitude: "139.700" }]).reason, "複数駅表記");
assert.equal(select("新宿駅、大久保駅", [{ label: "新宿駅、大久保駅", latitude: "35.690", longitude: "139.700" }]).reason, "複数駅表記");
assert.equal(select("新宿駅&大久保駅", [{ label: "新宿駅&大久保駅", latitude: "35.690", longitude: "139.700" }]).reason, "複数駅表記");
assert.equal(select("新宿駅", [{ label: "新宿駅", latitude: "34.690", longitude: "139.700" }]).reason, "地域範囲外");
assert.equal(select("新宿駅", [
  { label: "新宿駅", latitude: "35.690", longitude: "139.700" },
  { label: "新宿駅", address: "東京都新宿区西新宿1丁目" },
]).reason, "候補が複数");

console.log("location candidate safety: ok");
