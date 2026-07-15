import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const regions = [
  {
    regionId: "tokyo",
    dataPath: "region-data/tokyo/data.js",
  },
];

const template = await fs.readFile(path.join(ROOT, "index.html"), "utf8");

for (const region of regions) {
  let html = template;
  html = replaceRequired(
    html,
    '    <script src="./config/regions.js"></script>',
    `    <script>window.CURRENT_REGION_ID = ${JSON.stringify(region.regionId)};</script>\n    <script src="../config/regions.js"></script>`
  );

  for (const asset of ["favicon.svg", "styles.css", "firebase-config.js", "analytics-config.js", "analytics.js", "app.js"]) {
    html = replaceRequired(html, `./${asset}`, `../${asset}`);
  }

  const outputDirectory = path.join(ROOT, region.regionId);
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(outputDirectory, "index.html"), html, "utf8");
  await fs.copyFile(path.join(ROOT, region.dataPath), path.join(outputDirectory, "data.js"));
}

function replaceRequired(source, target, replacement) {
  if (!source.includes(target)) {
    throw new Error(`Region page template token not found: ${target}`);
  }
  return source.replace(target, replacement);
}

console.log(`region pages built: ${regions.map((region) => region.regionId).join(", ")}`);
