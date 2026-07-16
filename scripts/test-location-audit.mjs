import assert from "node:assert/strict";
import {
  auditLocationRows,
  buildLocationCorrectionQueue,
  classifyLocationRow,
  hasCriticalLocationAudit,
  locationCorrectionQueueToCsv,
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
assert.equal(normalizeStationForAudit("秋葉原駅昭和通り口"), "秋葉原駅");
assert.equal(normalizeStationForAudit("日暮里駅・南口"), "日暮里駅");
assert.equal(normalizeStationForAudit("三鷹駅・吉祥寺駅"), "三鷹駅・吉祥寺駅");
assert.equal(normalizeStationForAudit("新宿駅から徒歩5分"), "新宿駅");

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

const correctionQueue = buildLocationCorrectionQueue([
  { "店舗名": "候補あり", "最寄駅": "新宿駅西口", "住所または座標": "東京都", "掲載URL": "https://example.com/a" },
  { "店舗名": "手動確認", "最寄駅": "新宿駅東口", "住所または座標": "東京都", "掲載URL": "https://example.com/b" },
], invalidLocationPattern, {
  "https://example.com/a": [{ latitude: "35.1", longitude: "139.1", note: "座標候補" }],
});
assert.equal(correctionQueue.length, 2);
assert.equal(correctionQueue[0].storeName, "候補あり");
assert.equal(correctionQueue[0].candidateType, "coordinate");
assert.equal(correctionQueue[0].stationGroup, "新宿駅");
assert.equal(correctionQueue[0].stationCount, 2);
assert.match(locationCorrectionQueueToCsv(correctionQueue), /"優先度","候補種別"/);
assert.match(locationCorrectionQueueToCsv(correctionQueue), /"候補あり"/);
assert.match(locationCorrectionQueueToCsv([{ storeName: "=HYPERLINK(\"x\")" }]), /"'=HYPERLINK\(""x""\)"/);
assert.match(locationCorrectionQueueToCsv([{ storeName: "引用,改行\nあり" }]), /"引用,改行\nあり"/);

const invalidCoordinateQueue = buildLocationCorrectionQueue([
  { "店舗名": "不正座標", "最寄駅": "新宿駅", "住所または座標": "東京都", "掲載URL": "https://example.com/invalid" },
], invalidLocationPattern, {
  "https://example.com/invalid": [{ latitude: "999", longitude: "not-a-number" }],
});
assert.equal(invalidCoordinateQueue[0].candidateType, "manual");

const blankCoordinateQueue = buildLocationCorrectionQueue([
  { "店舗名": "空座標", "最寄駅": "新宿駅", "住所または座標": "東京都", "掲載URL": "https://example.com/blank" },
], invalidLocationPattern, {
  "https://example.com/blank": [{ label: "新宿駅", latitude: "", longitude: "" }],
});
assert.equal(blankCoordinateQueue[0].candidateType, "manual");
assert.equal(blankCoordinateQueue[0].candidateCount, 0);

const safeCoordinateQueue = buildLocationCorrectionQueue([
  { "店舗名": "安全候補", "最寄駅": "新宿駅西口", "住所または座標": "東京都", "掲載URL": "https://example.com/safe" },
], invalidLocationPattern, {
  "https://example.com/safe": [{ label: "新宿駅西口", latitude: "35.690", longitude: "139.700" }],
}, {
  geocodeBounds: { south: 35.45, west: 139.2, north: 35.95, east: 140.15 },
});
assert.equal(safeCoordinateQueue[0].autoApplicable, true);
assert.equal(safeCoordinateQueue[0].holdReason, "");

const manualOverrideAudit = auditLocationRows([
  { "店舗名": "手動補正", "最寄駅": "清瀬駅", "住所または座標": "東京都", "掲載URL": "https://example.com/manual" },
], invalidLocationPattern, {
  "https://example.com/manual": { lat: 35.7723, lng: 139.5213 },
});
assert.deepEqual(manualOverrideAudit.counts, { precise: 1, station: 0, unknown: 0 });
assert.equal(buildLocationCorrectionQueue([
  { "店舗名": "手動補正", "最寄駅": "清瀬駅", "住所または座標": "東京都", "掲載URL": "https://example.com/manual" },
], invalidLocationPattern, {}, {
  manualLocationOverrides: {
    "https://example.com/manual": { lat: 35.7723, lng: 139.5213 },
  },
}).length, 0);

const multipleCandidateQueue = buildLocationCorrectionQueue([
  { "店舗名": "複数候補", "最寄駅": "新宿駅・大久保駅", "住所または座標": "東京都", "掲載URL": "https://example.com/multiple" },
], invalidLocationPattern, {
  "https://example.com/multiple": [
    { label: "新宿駅", latitude: "35.1", longitude: "139.1" },
    { label: "大久保駅", address: "東京都新宿区百人町1-1" },
  ],
});
assert.equal(multipleCandidateQueue[0].candidateType, "multiple");
assert.equal(multipleCandidateQueue[0].candidateCount, 2);
assert.equal(multipleCandidateQueue[0].latitude, "");

console.log("location audit: ok");
