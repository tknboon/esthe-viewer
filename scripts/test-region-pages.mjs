import assert from "node:assert/strict";
import fs from "node:fs";

for (const regionId of ["tokyo", "osaka"]) {
  const html = fs.readFileSync(new URL(`../${regionId}/index.html`, import.meta.url), "utf8");
  const data = fs.readFileSync(new URL(`../${regionId}/data.js`, import.meta.url), "utf8");

  assert.match(html, new RegExp(`window\\.CURRENT_REGION_ID = "${regionId}"`));
  assert.doesNotMatch(html, /markerclusterer/i);
  assert.match(html, /data-region-link="aichi" href="\/"/);
  assert.match(html, /data-region-link="tokyo" href="\/tokyo\/"/);
  assert.match(html, /data-region-link="osaka" href="\/osaka\/"/);
  assert.match(html, /src="\.\.\/config\/regions\.js\?v=[a-f0-9]{12}"/);
  assert.match(html, /src="\.\.\/config\/location-verification\.js\?v=[a-f0-9]{12}"/);
  assert.match(html, /src="\.\/data\.js\?v=[a-f0-9]{12}"/);
  assert.match(html, /src="\.\.\/app\.js\?v=[a-f0-9]{12}"/);
  assert.doesNotMatch(html, /app\.js\?v=[a-f0-9]{12}\?v=/);
  assert.doesNotMatch(html, /styles\.css\?v=[a-f0-9]{12}\?v=/);
  assert.doesNotMatch(html, /src="\.\/app\.js"/);
  assert.match(data, /window\.storeData = /);
}

console.log("regional pages: ok");
