import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../tokyo/index.html", import.meta.url), "utf8");
const data = fs.readFileSync(new URL("../tokyo/data.js", import.meta.url), "utf8");

assert.match(html, /window\.CURRENT_REGION_ID = "tokyo"/);
assert.match(html, /src="\.\.\/config\/regions\.js"/);
assert.match(html, /src="\.\/data\.js"/);
assert.match(html, /src="\.\.\/app\.js"/);
assert.doesNotMatch(html, /src="\.\/app\.js"/);
assert.match(data, /window\.storeData = /);

console.log("tokyo region page: ok");
