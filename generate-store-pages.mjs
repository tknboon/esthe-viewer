import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.dirname(new URL(import.meta.url).pathname);
const workspace = process.platform === "win32" && root.startsWith("/")
  ? decodeURIComponent(root.slice(1))
  : decodeURIComponent(root);

const dataPath = path.join(workspace, "data.js");
const rootStoresDir = path.join(workspace, "stores");
const docsStoresDir = path.join(workspace, "docs", "stores");
const rootSitemapPath = path.join(workspace, "sitemap.xml");
const docsSitemapPath = path.join(workspace, "docs", "sitemap.xml");

const dataCode = fs.readFileSync(dataPath, "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(dataCode, sandbox);

const rows = Array.isArray(sandbox.window.storeData) ? sandbox.window.storeData : [];
const meta = sandbox.window.storeMeta || {};

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getStorePageId(row, index) {
  const listingUrl = row["掲載URL"] || "";
  const match = String(listingUrl).match(/shop-detail\/([^/]+)\//);
  return match?.[1] || `store-${index + 1}`;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buildDescription(row) {
  const name = normalizeText(row["店舗名"]);
  const station = normalizeText(row["最寄駅"]);
  const hours = normalizeText(row["営業時間"] || row["営業"]);
  const location = normalizeText(row["住所または座標"]);
  const parts = [
    station,
    location,
    hours ? `営業時間 ${hours}` : "",
  ].filter(Boolean);
  return `${name}の店舗情報。${parts.join("、")}。`;
}

function renderStorePage(row, index) {
  const id = getStorePageId(row, index);
  const name = normalizeText(row["店舗名"]) || "店舗情報";
  const station = normalizeText(row["最寄駅"]);
  const description = buildDescription(row);
  const title = `${name} | 愛知県のアジアンエステ`;
  const canonicalUrl = `https://www.aichi-esthe.com/stores/${encodeURIComponent(id)}.html`;
  const lastUpdatedAt = meta.lastUpdatedAt || new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:site_name" content="愛知県のアジアンエステ" />
    <meta property="article:modified_time" content="${escapeHtml(lastUpdatedAt)}" />
    <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body data-store-id="${escapeHtml(id)}" data-root-path="..">
    <div class="app-shell store-page-shell">
      <header class="hero store-page-hero">
        <div class="hero-copy-block">
          <p class="hero-kicker">店舗情報</p>
          <h1 id="storePageTitle">${escapeHtml(name)}</h1>
        </div>
      </header>

      <main class="store-page-layout">
        <section class="store-page-main">
          <article class="store-card store-detail-card">
            <div class="store-head">
              <div>
                <h2 id="storeName" class="store-title">${escapeHtml(name)}</h2>
                <p id="storeStation" class="store-station">${escapeHtml(station)}</p>
              </div>
              <div id="storeBadges" class="store-badges"></div>
            </div>
            <div id="storeInfoGrid" class="store-grid"></div>
            <div id="storeActions" class="store-actions store-detail-actions"></div>
          </article>

          <section class="panel-block store-page-section">
            <div class="analytics-head">
              <span class="input-label">店舗レビュー</span>
              <strong id="reviewSummary" class="analytics-total">0件</strong>
            </div>
            <div id="reviewList" class="review-list store-page-review-list">
              <div class="empty-state compact">レビューを確認中です。</div>
            </div>
          </section>
        </section>

        <aside class="store-page-side">
          <section class="panel-block">
            <p class="mini-label">共有</p>
            <div class="store-side-actions">
              <a class="action-link primary" href="../index.html">地図に戻る</a>
              <button id="copyPageUrlButton" class="action-link" type="button">URLをコピー</button>
            </div>
            <p id="copyStatusText" class="sync-meta-text"></p>
          </section>

          <section class="panel-block">
            <p class="mini-label">近くの候補</p>
            <div id="nearbyStoreList" class="nearby-store-list">
              <div class="empty-state compact">店舗を読み込み中です。</div>
            </div>
          </section>
        </aside>
      </main>
    </div>

    <script src="../data.js"></script>
    <script src="../firebase-config.js"></script>
    <script src="https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore-compat.js"></script>
    <script src="../store-page.js"></script>
  </body>
</html>
`;
}

ensureCleanDir(rootStoresDir);
ensureCleanDir(docsStoresDir);

const seenIds = new Set();
let generated = 0;
const sitemapUrls = [
  "https://www.aichi-esthe.com/",
  "https://www.aichi-esthe.com/store.html",
];

rows.forEach((row, index) => {
  const id = getStorePageId(row, index);
  if (!id || seenIds.has(id)) return;
  seenIds.add(id);
  const html = renderStorePage(row, index);
  fs.writeFileSync(path.join(rootStoresDir, `${id}.html`), html, "utf8");
  fs.writeFileSync(path.join(docsStoresDir, `${id}.html`), html, "utf8");
  sitemapUrls.push(`https://www.aichi-esthe.com/stores/${encodeURIComponent(id)}.html`);
  generated += 1;
});

const lastmod = String(meta.lastUpdatedAt || new Date().toISOString()).slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((url) => `  <url>
    <loc>${escapeHtml(url)}</loc>
    <lastmod>${escapeHtml(lastmod)}</lastmod>
  </url>`).join("\n")}
</urlset>
`;

fs.writeFileSync(rootSitemapPath, sitemap, "utf8");
fs.writeFileSync(docsSitemapPath, sitemap, "utf8");

console.log(`Generated ${generated} store pages.`);
