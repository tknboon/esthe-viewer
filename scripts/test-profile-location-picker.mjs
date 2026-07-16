import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

assert.match(html, /id="storeLocationPickButton"/);
assert.match(html, /id="storeLocationClearButton"/);
assert.match(html, /id="storeLocationStatus"/);
assert.match(app, /state\.map\.addListener\("click", handleStoreLocationMapClick\)/);
assert.match(app, /latitude: state\.profileLocationDraft\?\.lat/);
assert.match(app, /longitude: state\.profileLocationDraft\?\.lng/);
assert.match(app, /if \(profileLatLng\) \{/);
assert.match(app, /getProfileLatLng\(profile\) \? `<span>地図位置: 指定済み/);
assert.match(app, /if \(!rawLat \|\| !rawLng\) return null/);
assert.match(app, /const variant = createExplicitRoomVariantRow[\s\S]*applyProfileLocationToRow\(variant\)/);
assert.match(app, /applyProfileLocationToRow\(row\);\s+expanded\.push\(row\)/);
assert.match(styles, /\.store-location-controls/);

console.log("profile location picker contracts: ok");
