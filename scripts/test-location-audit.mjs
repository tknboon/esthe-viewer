import assert from "node:assert/strict";
import {
  auditLocationRows,
  classifyLocationRow,
  hasCriticalLocationAudit,
  normalizeStationForAudit,
} from "./audit-region-locations.mjs";

const invalidLocationPattern = /^東京都$/;
const broad = classifyLocationRow({
  "店舗名": "テスト店",
  "最寄駅": "新宿駅",
  "住所または座標": "東京都",
  "緯度": "",
  "経度": "",
}, invalidLocationPattern);
assert.equal(broad.quality, "station");
assert.equal(broad.query, "新宿駅");

const broadWithoutGuard = classifyLocationRow({
  "店舗名": "テスト店",
  "最寄駅": "新宿駅",
  "住所または座標": "東京都",
  "緯度": "",
  "経度": "",
}, /^$/);
assert.equal(broadWithoutGuard.query, "東京都");
assert.equal(normalizeStationForAudit("新宿駅西口"), "新宿駅");
assert.equal(normalizeStationForAudit("三軒茶屋駅南口A"), "三軒茶屋駅");

const precise = classifyLocationRow({
  "店舗名": "住所あり店",
  "最寄駅": "新宿駅",
  "住所または座標": "東京都新宿区歌舞伎町1-3-16",
  "緯度": "",
  "経度": "",
}, invalidLocationPattern);
assert.equal(precise.quality, "precise");

const audit = auditLocationRows([
  { "店舗名": "A", "最寄駅": "新宿駅", "住所または座標": "東京都" },
  { "店舗名": "B", "最寄駅": "新宿駅", "住所または座標": "東京都" },
  { "店舗名": "C", "最寄駅": "", "住所または座標": "" },
], invalidLocationPattern);
assert.deepEqual(audit.counts, { precise: 0, station: 2, unknown: 1 });
assert.deepEqual(audit.repeatedQueries[0], ["新宿駅", 2]);
assert.deepEqual(audit.repeatedStations[0], ["新宿駅", 2]);
assert.equal(hasCriticalLocationAudit(audit), true);
assert.equal(hasCriticalLocationAudit({
  total: 100,
  counts: { unknown: 4 },
  maxQueryConcentration: 99,
  maxCoordinateConcentration: 99,
  maxStationConcentration: 99,
}), false);
assert.equal(hasCriticalLocationAudit({
  total: 100,
  counts: { unknown: 0 },
  maxQueryConcentration: 100,
  maxCoordinateConcentration: 1,
  maxStationConcentration: 1,
}), true);

console.log("location audit: ok");
