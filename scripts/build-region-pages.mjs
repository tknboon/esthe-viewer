import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const regions = [
  {
    regionId: "tokyo",
    dataPath: "region-data/tokyo/data.js",
  },
];

const template = await fs.readFile(path.join(ROOT, "index.html"), "utf8");

for (const region of regions) {
  const configVersion = await fileVersion("config/regions.js");
  const dataVersion = await fileVersion(region.dataPath);
  let html = template;
  html = replaceRequired(
    html,
    '    <script src="./config/regions.js"></script>',
    `    <script>window.CURRENT_REGION_ID = ${JSON.stringify(region.regionId)};</script>\n    <script src="../config/regions.js?v=${configVersion}"></script>`
  );

  for (const asset of ["favicon.svg", "styles.css", "firebase-config.js", "analytics-config.js", "analytics.js", "app.js"]) {
    const version = await fileVersion(asset);
    html = replaceRequired(html, `./${asset}`, `../${asset}?v=${version}`);
  }
  html = replaceRequired(html, './data.js', `./data.js?v=${dataVersion}`);

  const outputDirectory = path.join(ROOT, region.regionId);
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(outputDirectory, "index.html"), html, "utf8");
  await fs.copyFile(path.join(ROOT, region.dataPath), path.join(outputDirectory, "data.js"));
}

async function fileVersion(relativePath) {
  const content = await fs.readFile(path.join(ROOT, relativePath));
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function replaceRequired(source, target, replacement) {
  if (!source.includes(target)) {
    throw new Error(`Region page template token not found: ${target}`);
  }
  return source.replace(target, replacement);
}

console.log(`region pages built: ${regions.map((region) => region.regionId).join(", ")}`);
