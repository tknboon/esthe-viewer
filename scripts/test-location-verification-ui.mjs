import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveVerificationFields } = require("../config/location-verification.js");

const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

assert.match(html, /id="locationVerifiedCount"/);
assert.match(html, /id="locationUnverifiedCount"/);
assert.match(html, /data-location-audit-mode="station"/);
assert.match(html, /data-location-audit-mode="unverified"/);
assert.match(html, /config\/location-verification\.js/);
assert.match(app, /locationChanged: state\.profileLocationDirty/);
assert.match(app, /function isLocationVerified\(row\)/);
assert.match(app, /data-location-row-id=/);
assert.match(app, /renderLocationAudit\(\);[\s\S]*renderStoreProfileSummary/);
assert.match(styles, /\.location-verification-grid/);
assert.match(styles, /\.location-audit-mode/);

const verifiedBlock = app.match(/function isLocationVerified\(row\)[\s\S]*?\n}/)?.[0] || "";
const saveBlock = app.match(/function handleStoreProfileSave\(\)[\s\S]*?\n}/)?.[0] || "";
const clearBlock = app.match(/function handleStoreLocationClear\(\)[\s\S]*?\n}/)?.[0] || "";
const mapClickBlock = app.match(/function handleStoreLocationMapClick\(event\)[\s\S]*?\n}/)?.[0] || "";
assert.match(verifiedBlock, /profile\?\.locationVerified === true/);
assert.match(saveBlock, /locationChanged: state\.profileLocationDirty/);
assert.match(saveBlock, /renderLocationAudit\(\)/);
assert.match(clearBlock, /state\.profileLocationDirty = true/);
assert.match(mapClickBlock, /state\.profileLocationDirty = true/);

const savedAt = "2026-07-18T12:00:00.000Z";
assert.deepEqual(resolveVerificationFields({
  existingProfile: { latitude: 35.1, longitude: 139.1 },
  draftLatLng: { lat: 35.1, lng: 139.1 },
  locationChanged: false,
  savedAt,
}), { locationVerified: false, locationVerifiedAt: "" });
assert.deepEqual(resolveVerificationFields({
  existingProfile: { locationVerified: true, locationVerifiedAt: "2026-07-17T10:00:00.000Z" },
  draftLatLng: { lat: 35.1, lng: 139.1 },
  locationChanged: false,
  savedAt,
}), { locationVerified: true, locationVerifiedAt: "2026-07-17T10:00:00.000Z" });
assert.deepEqual(resolveVerificationFields({
  existingProfile: {},
  draftLatLng: { lat: 35.2, lng: 139.2 },
  locationChanged: true,
  savedAt,
}), { locationVerified: true, locationVerifiedAt: savedAt });
assert.deepEqual(resolveVerificationFields({
  existingProfile: { locationVerified: true, locationVerifiedAt: savedAt },
  draftLatLng: null,
  locationChanged: true,
  savedAt,
}), { locationVerified: false, locationVerifiedAt: "" });

console.log("location verification UI contracts: ok");
