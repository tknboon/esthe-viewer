import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  chooseOfficialMapCandidate,
  distanceMeters,
  evaluateStationDistance,
  extractOfficialMapCandidates,
  isSafePublicHttpUrl,
} from "./official-location-candidates.mjs";

const require = createRequire(import.meta.url);
const { normalizeStationGroupLabel } = require("../config/station-normalizer.js");
const bounds = { south: 35.45, west: 139.2, north: 35.95, east: 140.15 };

const businessMap = `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240!2d139.70133!3d35.697894!3m3!1m2!1splace!2sHarmony%20Thai%20Spa!5e0!3m2!1sja!2sjp"></iframe>`;
const businessCandidates = extractOfficialMapCandidates(businessMap, bounds);
assert.equal(businessCandidates.length, 1);
assert.deepEqual(businessCandidates[0].latLng, { lat: 35.697894, lng: 139.70133 });
assert.equal(businessCandidates[0].label, "Harmony Thai Spa");
assert.equal(chooseOfficialMapCandidate(businessCandidates, "西武新宿駅", normalizeStationGroupLabel).candidate.label, "Harmony Thai Spa");

const stationMap = `<iframe src="https://www.google.com/maps/embed/v1/place?q=%E5%BE%A1%E5%BE%92%E7%94%BA%E9%A7%85&amp;center=35.7075,139.7748"></iframe>`;
const stationCandidates = extractOfficialMapCandidates(stationMap, bounds);
assert.equal(chooseOfficialMapCandidate(stationCandidates, "御徒町駅北口", normalizeStationGroupLabel).candidate, null);

const routeMap = `<iframe src="https://www.google.com/maps/embed?pb=!1m28!2d139.70!3d35.69!2d139.71!3d35.70!2sDestination"></iframe>`;
assert.equal(extractOfficialMapCandidates(routeMap, bounds)[0].reason, "経路地図または複数地点");

const outOfBoundsMap = `<iframe src="https://www.google.com/maps/embed?pb=!2d135.70!3d35.00!2sOsaka%20Spa"></iframe>`;
assert.equal(extractOfficialMapCandidates(outOfBoundsMap, bounds)[0].reason, "地域範囲外");

assert.equal(isSafePublicHttpUrl("https://example.com/store"), true);
assert.equal(isSafePublicHttpUrl("http://127.0.0.1/private"), false);
assert.equal(isSafePublicHttpUrl("http://192.168.1.10/private"), false);
assert.equal(isSafePublicHttpUrl("file:///C:/secrets.txt"), false);

assert.ok(distanceMeters({ lat: 35.7723, lng: 139.5213 }, { lat: 35.7720, lng: 139.5195 }) < 300);
assert.equal(
  evaluateStationDistance({ lat: 35.7723, lng: 139.5213 }, { lat: 35.7720, lng: 139.5195 }).accepted,
  true
);
assert.equal(
  evaluateStationDistance({ lat: 35.6433, lng: 139.6691 }, { lat: 35.6980, lng: 139.7075 }).accepted,
  false
);

console.log("official location candidate extraction: ok");
