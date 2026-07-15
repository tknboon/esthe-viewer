import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../tokyo/index.html", import.meta.url), "utf8");
const data = fs.readFileSync(new URL("../tokyo/data.js", import.meta.url), "utf8");

assert.match(html, /window\.CURRENT_REGION_ID = "tokyo"/);
assert.match(html, /@googlemaps\/markerclusterer@2\.6\.2\/dist\/index\.min\.js/);
assert.match(html, /data-region-link="aichi" href="\/"/);
assert.match(html, /data-region-link="tokyo" href="\/tokyo\/"/);
assert.match(html, /src="\.\.\/config\/regions\.js\?v=[a-f0-9]{12}"/);
assert.match(html, /src="\.\/data\.js\?v=[a-f0-9]{12}"/);
assert.match(html, /src="\.\.\/app\.js\?v=[a-f0-9]{12}"/);
assert.doesNotMatch(html, /app\.js\?v=[a-f0-9]{12}\?v=/);
assert.doesNotMatch(html, /styles\.css\?v=[a-f0-9]{12}\?v=/);
assert.doesNotMatch(html, /src="\.\/app\.js"/);
assert.match(data, /window\.storeData = /);

console.log("tokyo region page: ok");
