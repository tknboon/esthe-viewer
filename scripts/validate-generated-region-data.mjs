import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { getMonitorRegion } from "../config/monitor-regions.mjs";

const regionId = process.argv[2] || "aichi";
const region = getMonitorRegion(regionId);
const source = fs.readFileSync(region.outputFiles.data, "utf8");
const snapshot = JSON.parse(fs.readFileSync(region.outputFiles.snapshot, "utf8"));
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const rows = sandbox.window.storeData || [];
const allowedAreas = new Set(region.targetUrls.map((url) => new URL(url).pathname.split("/").filter(Boolean)[0]));
const invalidRows = rows.filter((row) => {
  try {
    const area = new URL(row["掲載URL"]).pathname.split("/").filter(Boolean)[0];
    return !allowedAreas.has(area);
  } catch (error) {
    return true;
  }
});
const invalidNoteValues = new Set(["六本木・麻布十番", "東京エリア簡単検索", "お探しのエリアをクリック", "東京エリア簡単検索 お探しのエリアをクリック"]);
const invalidNotes = rows.filter((row) => invalidNoteValues.has(String(row["備考"] || "").trim()));
const locationCount = rows.filter((row) => row["住所または座標"]).length;
const rowUrls = new Set(rows.map((row) => row["掲載URL"]).filter(Boolean));
const snapshotUrls = new Set(snapshot.matchedShopLinks || []);
const missingUrls = [...snapshotUrls].filter((url) => !rowUrls.has(url));
const extraUrls = [...rowUrls].filter((url) => !snapshotUrls.has(url));
const emptySources = (snapshot.sourceSummaries || []).filter((sourceSummary) => !sourceSummary.matchedLinkCount);
const summaryUrls = new Set((snapshot.sourceSummaries || []).map((sourceSummary) => sourceSummary.url));
const missingSources = region.targetUrls.filter((url) => !summaryUrls.has(url));
const unexpectedSources = [...summaryUrls].filter((url) => !region.targetUrls.includes(url));
const detailedLocationRatio = snapshotUrls.size ? (snapshot.detailedStoreCount || 0) / snapshotUrls.size : 0;

assert.ok(rows.length > 0, `${regionId}: no stores generated`);
assert.equal(invalidRows.length, 0, `${regionId}: rows outside configured source areas`);
assert.equal(invalidNotes.length, 0, `${regionId}: navigation text leaked into notes`);
assert.equal(missingUrls.length, 0, `${regionId}: snapshot listings missing from generated data`);
assert.equal(extraUrls.length, 0, `${regionId}: generated data contains stale listings`);
assert.equal(emptySources.length, 0, `${regionId}: one or more configured sources returned no listings`);
assert.equal((snapshot.sourceSummaries || []).length, region.targetUrls.length, `${regionId}: source summary count differs from configuration`);
assert.equal(missingSources.length, 0, `${regionId}: configured sources missing from snapshot summaries`);
assert.equal(unexpectedSources.length, 0, `${regionId}: snapshot contains unconfigured source summaries`);
assert.ok(detailedLocationRatio >= 0.8, `${regionId}: fewer than 80% of snapshot listings have detailed locations`);
assert.ok(locationCount > 0, `${regionId}: generated rows have no usable locations`);
assert.ok(sandbox.window.storeMeta?.lastUpdatedAt, `${regionId}: missing lastUpdatedAt`);

console.log(`${regionId} generated data: ${rows.length} stores / ${locationCount} locations`);
