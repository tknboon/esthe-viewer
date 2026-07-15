import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const workflow = fs.readFileSync(new URL("../.github/workflows/update-esthe-data.yml", import.meta.url), "utf8");

assert.match(app, /const isCorrectionQueue = CURRENT_REGION_ID === "tokyo"/);
assert.match(app, /sortedGroups\.filter\(\(group\) => group\.rows\.length >= 2\)\.slice\(0, 12\)/);
assert.match(app, /\(selectedIndex \+ 1\) % rows\.length/);
assert.match(html, /id="locationAuditHeading"/);
assert.match(styles, /\.location-audit-list\.is-correction-queue[\s\S]*max-height: 360px/);
assert.match(workflow, /build-location-correction-queue\.mjs tokyo/);
assert.match(workflow, /region-data\/tokyo\/location_correction_queue\.csv/);
assert.match(html, /config\/location-candidate\.js/);
assert.match(app, /getSafeSourceCoordinateCandidate/);
assert.match(app, /CURRENT_REGION_ID !== "tokyo"/);

console.log("location correction UI contracts: ok");
