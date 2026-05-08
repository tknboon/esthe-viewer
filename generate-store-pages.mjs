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
const rootAreasDir = path.join(workspace, "areas");
const docsAreasDir = path.join(workspace, "docs", "areas");
const rootStationsDir = path.join(workspace, "stations");
const docsStationsDir = path.join(workspace, "docs", "stations");
const rootSitemapPath = path.join(workspace, "sitemap.xml");
const docsSitemapPath = path.join(workspace, "docs", "sitemap.xml");
const rootRobotsPath = path.join(workspace, "robots.txt");
const docsRobotsPath = path.join(workspace, "docs", "robots.txt");
const SITE_ORIGIN = "https://www.aichi-esthe.com";

const regionLabels = new Map(Object.entries({
  nagoya: "名古屋・名駅・納屋橋",
  sakae: "栄",
  shinsakae: "新栄町・千種・今池",
  kanayama: "金山・熱田",
  kurokawa: "黒川・大曽根",
  hoshigaoka: "星ヶ丘・藤が丘",
  moriyama: "守山・小幡",
  otai: "小田井・比良",
  tokaidori: "東海通・高畑",
  kasadera: "笠寺・柴田",
  horita: "堀田・新瑞橋",
  tsurumai: "大須・鶴舞",
  showa: "名古屋・昭和区・天白区",
  komaki: "小牧・春日井",
  owari: "尾張・一宮",
  chita: "知多・大府・半田",
  toyota: "西三河・豊田・岡崎",
  toyohashi: "東三河・豊橋・豊川",
}));

const dataCode = fs.readFileSync(dataPath, "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(dataCode, sandbox);

const rows = Array.isArray(sandbox.window.storeData) ? sandbox.window.storeData : [];
const meta = sandbox.window.storeMeta || {};

const kanaMap = new Map(Object.entries({
  "ア": "a", "イ": "i", "ウ": "u", "エ": "e", "オ": "o",
  "カ": "ka", "キ": "ki", "ク": "ku", "ケ": "ke", "コ": "ko",
  "サ": "sa", "シ": "shi", "ス": "su", "セ": "se", "ソ": "so",
  "タ": "ta", "チ": "chi", "ツ": "tsu", "テ": "te", "ト": "to",
  "ナ": "na", "ニ": "ni", "ヌ": "nu", "ネ": "ne", "ノ": "no",
  "ハ": "ha", "ヒ": "hi", "フ": "fu", "ヘ": "he", "ホ": "ho",
  "マ": "ma", "ミ": "mi", "ム": "mu", "メ": "me", "モ": "mo",
  "ヤ": "ya", "ユ": "yu", "ヨ": "yo",
  "ラ": "ra", "リ": "ri", "ル": "ru", "レ": "re", "ロ": "ro",
  "ワ": "wa", "ヲ": "wo", "ン": "n",
  "ガ": "ga", "ギ": "gi", "グ": "gu", "ゲ": "ge", "ゴ": "go",
  "ザ": "za", "ジ": "ji", "ズ": "zu", "ゼ": "ze", "ゾ": "zo",
  "ダ": "da", "ヂ": "ji", "ヅ": "zu", "デ": "de", "ド": "do",
  "バ": "ba", "ビ": "bi", "ブ": "bu", "ベ": "be", "ボ": "bo",
  "パ": "pa", "ピ": "pi", "プ": "pu", "ペ": "pe", "ポ": "po",
  "ァ": "a", "ィ": "i", "ゥ": "u", "ェ": "e", "ォ": "o",
  "ャ": "ya", "ュ": "yu", "ョ": "yo", "ッ": "",
  "ー": "-",
}));

const stationRomanOverrides = new Map(Object.entries({
  "名古屋駅": "nagoya",
  "名駅": "meieki",
  "栄駅": "sakae",
  "丸の内駅": "marunouchi",
  "伏見駅": "fushimi",
  "金山駅": "kanayama",
  "豊田市駅": "toyota",
  "新豊田駅": "shin-toyota",
  "豊橋駅": "toyohashi",
  "一宮駅": "ichinomiya",
  "尾張一宮駅": "owari-ichinomiya",
  "木曽川駅": "kisogawa",
  "奥町駅": "okucho",
  "安城駅": "anjo",
  "岡崎駅": "okazaki",
  "刈谷駅": "kariya",
  "小牧駅": "komaki",
  "春日井駅": "kasugai",
  "黒川駅": "kurokawa",
  "今池駅": "imaike",
  "千種駅": "chikusa",
  "大須観音駅": "osukannon",
  "鶴舞駅": "tsurumai",
  "藤が丘駅": "fujigaoka",
  "星ヶ丘駅": "hoshigaoka",
}));

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

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getRowValue(row, ...keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function getStoreStableId(row, index) {
  const listingUrl = getRowValue(row, "掲載URL");
  const match = String(listingUrl).match(/shop-detail\/([^/]+)\//);
  return match?.[1] || `store-${index + 1}`;
}

function kanaToRoman(text) {
  let result = "";
  const katakana = String(text || "").replace(/[\u3041-\u3096]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
  for (const char of katakana) {
    result += kanaMap.get(char) ?? char;
  }
  return result;
}

function slugPart(text) {
  const roman = kanaToRoman(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
  return roman;
}

function stationSlug(station) {
  const primary = normalizeText(station).split(/[・/／,、\s]+/).find(Boolean) || "";
  if (!primary) return "";
  if (stationRomanOverrides.has(primary)) return stationRomanOverrides.get(primary);
  const withoutSuffix = primary.replace(/駅|ルーム/g, "");
  return slugPart(withoutSuffix);
}

function primaryStationLabel(station) {
  return normalizeText(station).split(/[・/／,、\s]+/).find(Boolean) || "";
}

function getRegionSlug(row) {
  const listingUrl = getRowValue(row, "掲載URL");
  const match = String(listingUrl).match(/esthe-ranking\.jp\/([^/]+)\//);
  return match?.[1] || "aichi";
}

function getRegionLabel(row) {
  const regionSlug = getRegionSlug(row);
  return regionLabels.get(regionSlug) || "愛知県";
}

function getStorePageSlug(row, index) {
  const stableId = getStoreStableId(row, index);
  const shortId = stableId.replace(/-/g, "").slice(0, 8);
  const name = getRowValue(row, "店舗名");
  const station = getRowValue(row, "最寄駅");
  const pieces = [stationSlug(station), slugPart(name)].filter((part) => part && part.length >= 2);
  const readable = pieces.join("-").slice(0, 72).replace(/-+$/g, "");
  return `${readable || "store"}-${shortId}`;
}

function buildDescription(row) {
  const name = getRowValue(row, "店舗名") || "店舗";
  const station = getRowValue(row, "最寄駅");
  const hours = getRowValue(row, "営業時間", "営業");
  const location = getRowValue(row, "住所または座標");
  const phone = getRowValue(row, "電話番号", "電話");
  const parts = [
    station,
    location,
    hours ? `営業時間 ${hours}` : "",
    phone ? `電話 ${phone}` : "",
  ].filter(Boolean);
  return `${name}の店舗情報。${parts.join("、")}。`;
}

function renderField(label, value, htmlValue = "") {
  if (!value && !htmlValue) return "";
  return `              <div class="field">
                <span class="field-label">${escapeHtml(label)}</span>
                <span class="field-value">${htmlValue || escapeHtml(value)}</span>
              </div>`;
}

function buildJsonLd(row, index, canonicalUrl) {
  const name = getRowValue(row, "店舗名") || "店舗情報";
  const station = getRowValue(row, "最寄駅");
  const location = getRowValue(row, "住所または座標");
  const phone = getRowValue(row, "電話番号", "電話");
  const hours = getRowValue(row, "営業時間", "営業");
  const officialUrl = getRowValue(row, "オフィシャルHP", "公式HP");
  const latitude = getRowValue(row, "緯度");
  const longitude = getRowValue(row, "経度");
  const data = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": `${canonicalUrl}#business`,
    name,
    url: officialUrl || canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    telephone: phone || undefined,
    address: location ? { "@type": "PostalAddress", streetAddress: location, addressRegion: "愛知県", addressCountry: "JP" } : undefined,
    geo: latitude && longitude ? { "@type": "GeoCoordinates", latitude, longitude } : undefined,
    areaServed: station || "愛知県",
    openingHours: hours || undefined,
    identifier: getStoreStableId(row, index),
  };
  return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
}

function renderRedirectPage(fromId, toSlug) {
  const target = `./${encodeURIComponent(toSlug)}.html`;
  const canonical = `${SITE_ORIGIN}/stores/${encodeURIComponent(toSlug)}.html`;
  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(target)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <title>移動しました | 愛知県のアジアンエステ</title>
  </head>
  <body>
    <p><a href="${escapeHtml(target)}">店舗ページへ移動します。</a></p>
  </body>
</html>
`;
}

function renderStorePage(row, index, slug) {
  const stableId = getStoreStableId(row, index);
  const name = getRowValue(row, "店舗名") || "店舗情報";
  const station = getRowValue(row, "最寄駅");
  const location = getRowValue(row, "住所または座標");
  const hours = getRowValue(row, "営業時間", "営業");
  const phone = getRowValue(row, "電話番号", "電話");
  const officialUrl = getRowValue(row, "オフィシャルHP", "公式HP");
  const listingUrl = getRowValue(row, "掲載URL");
  const notes = getRowValue(row, "備考");
  const description = buildDescription(row);
  const title = `${name} | 愛知県のアジアンエステ`;
  const canonicalUrl = `${SITE_ORIGIN}/stores/${encodeURIComponent(slug)}.html`;
  const lastUpdatedAt = meta.lastUpdatedAt || new Date().toISOString();
  const mapQuery = getRowValue(row, "緯度") && getRowValue(row, "経度")
    ? `${getRowValue(row, "緯度")},${getRowValue(row, "経度")}`
    : [location, station, name].filter(Boolean).join(" ");
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const initialFields = [
    renderField("営業時間", hours),
    renderField("電話番号", phone, phone ? `<a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>` : ""),
    renderField("最寄り", station),
    renderField("住所・場所", location),
    renderField("備考", notes),
    renderField("公式サイト", officialUrl, officialUrl ? `<a href="${escapeHtml(officialUrl)}" target="_blank" rel="noreferrer">${escapeHtml(officialUrl)}</a>` : ""),
  ].filter(Boolean).join("\n");

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
    <script type="application/ld+json">${buildJsonLd(row, index, canonicalUrl)}</script>
    <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body data-store-id="${escapeHtml(stableId)}" data-root-path="..">
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
                <p id="storeStation" class="store-station">${escapeHtml([station, "愛知県"].filter(Boolean).join(" / "))}</p>
              </div>
              <div id="storeBadges" class="store-badges"></div>
            </div>
            <div id="storeInfoGrid" class="store-grid">
${initialFields || `              <div class="empty-state">表示できる店舗情報がありません。</div>`}
            </div>
            <div id="storeActions" class="store-actions store-detail-actions">
              ${phone ? `<a class="action-link" href="tel:${escapeHtml(phone)}">電話</a>` : ""}
              <a class="action-link primary" href="${escapeHtml(mapUrl)}" target="_blank" rel="noreferrer">Googleマップ</a>
              ${officialUrl ? `<a class="action-link" href="${escapeHtml(officialUrl)}" target="_blank" rel="noreferrer">オフィシャルHP</a>` : ""}
              ${listingUrl ? `<a class="action-link" href="${escapeHtml(listingUrl)}" target="_blank" rel="noreferrer">掲載ページ</a>` : ""}
              <a class="action-link" href="../index.html?store=${encodeURIComponent(stableId)}">地図で見る</a>
            </div>
          </article>

          <section class="panel-block store-page-section">
            <div class="analytics-head">
              <span class="input-label">店舗レビュー</span>
              <strong id="reviewSummary" class="analytics-total">0件</strong>
            </div>
            <div id="reviewList" class="review-list store-page-review-list">
              <div class="empty-state compact">レビューはまだありません。</div>
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

function renderStoreLinkList(records) {
  return records.map((record) => `              <a class="nearby-store-item" href="../stores/${escapeHtml(record.slug)}.html">
                <span>${escapeHtml(record.name)}</span>
                <small>${escapeHtml([record.station, record.areaLabel].filter(Boolean).join(" / "))}</small>
              </a>`).join("\n");
}

function renderStationLinkList(records) {
  const seen = new Map();
  for (const record of records) {
    if (!record.stationSlug || !record.stationLabel) continue;
    if (!seen.has(record.stationSlug)) seen.set(record.stationSlug, { label: record.stationLabel, count: 0 });
    seen.get(record.stationSlug).count += 1;
  }
  return [...seen.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label, "ja"))
    .map(([slug, item]) => `              <a class="nearby-store-item" href="../stations/${escapeHtml(slug)}.html">
                <span>${escapeHtml(item.label)}</span>
                <small>${item.count}件</small>
              </a>`)
    .join("\n");
}

function renderCollectionPage({ type, slug, label, records, relatedRecords = [] }) {
  const isArea = type === "area";
  const dirName = isArea ? "areas" : "stations";
  const pageTitle = `${label}のアジアンエステ | 愛知県のアジアンエステ`;
  const description = `${label}周辺のアジアンエステ店舗一覧。営業時間、電話番号、場所、公式サイト、レビュー情報を確認できます。`;
  const canonicalUrl = `${SITE_ORIGIN}/${dirName}/${encodeURIComponent(slug)}.html`;
  const storeLinks = renderStoreLinkList(records);
  const stationLinks = isArea ? renderStationLinkList(records) : "";
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: pageTitle,
    description,
    url: canonicalUrl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: records.length,
      itemListElement: records.slice(0, 100).map((record, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: record.name,
        url: `${SITE_ORIGIN}/stores/${encodeURIComponent(record.slug)}.html`,
      })),
    },
  };

  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:site_name" content="愛知県のアジアンエステ" />
    <script type="application/ld+json">${JSON.stringify(itemList, null, 2).replace(/</g, "\\u003c")}</script>
    <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    <div class="app-shell store-page-shell">
      <header class="hero store-page-hero">
        <div class="hero-copy-block">
          <p class="hero-kicker">${isArea ? "地区ページ" : "駅ページ"}</p>
          <h1>${escapeHtml(label)}</h1>
        </div>
      </header>

      <main class="store-page-layout">
        <section class="store-page-main">
          <section class="panel-block store-page-section">
            <div class="analytics-head">
              <span class="input-label">${escapeHtml(label)}の店舗</span>
              <strong class="analytics-total">${records.length}件</strong>
            </div>
            <div class="nearby-store-list">
${storeLinks || `              <div class="empty-state compact">店舗はありません。</div>`}
            </div>
          </section>
        </section>

        <aside class="store-page-side">
          <section class="panel-block">
            <p class="mini-label">ナビゲーション</p>
            <div class="store-side-actions">
              <a class="action-link primary" href="../index.html">地図に戻る</a>
              <a class="action-link" href="../sitemap.xml">サイトマップ</a>
            </div>
          </section>
          ${stationLinks ? `<section class="panel-block">
            <p class="mini-label">駅から探す</p>
            <div class="nearby-store-list">
${stationLinks}
            </div>
          </section>` : ""}
          ${relatedRecords.length ? `<section class="panel-block">
            <p class="mini-label">関連店舗</p>
            <div class="nearby-store-list">
${renderStoreLinkList(relatedRecords.slice(0, 10))}
            </div>
          </section>` : ""}
        </aside>
      </main>
    </div>
  </body>
</html>
`;
}

ensureCleanDir(rootStoresDir);
ensureCleanDir(docsStoresDir);
ensureCleanDir(rootAreasDir);
ensureCleanDir(docsAreasDir);
ensureCleanDir(rootStationsDir);
ensureCleanDir(docsStationsDir);

const seenIds = new Set();
const seenSlugs = new Set();
const storeRecords = [];
let generated = 0;
let redirects = 0;
let areaPages = 0;
let stationPages = 0;
const sitemapUrls = [
  `${SITE_ORIGIN}/`,
  `${SITE_ORIGIN}/store.html`,
];

rows.forEach((row, index) => {
  const stableId = getStoreStableId(row, index);
  if (!stableId || seenIds.has(stableId)) return;
  seenIds.add(stableId);

  let slug = getStorePageSlug(row, index);
  if (seenSlugs.has(slug)) slug = `${slug}-${index + 1}`;
  seenSlugs.add(slug);

  const html = renderStorePage(row, index, slug);
  fs.writeFileSync(path.join(rootStoresDir, `${slug}.html`), html, "utf8");
  fs.writeFileSync(path.join(docsStoresDir, `${slug}.html`), html, "utf8");

  if (slug !== stableId) {
    const redirectHtml = renderRedirectPage(stableId, slug);
    fs.writeFileSync(path.join(rootStoresDir, `${stableId}.html`), redirectHtml, "utf8");
    fs.writeFileSync(path.join(docsStoresDir, `${stableId}.html`), redirectHtml, "utf8");
    redirects += 1;
  }

  sitemapUrls.push(`${SITE_ORIGIN}/stores/${encodeURIComponent(slug)}.html`);
  storeRecords.push({
    row,
    index,
    stableId,
    slug,
    name: getRowValue(row, "店舗名") || "店舗情報",
    station: getRowValue(row, "最寄駅"),
    stationLabel: primaryStationLabel(getRowValue(row, "最寄駅")),
    stationSlug: stationSlug(getRowValue(row, "最寄駅")),
    areaSlug: getRegionSlug(row),
    areaLabel: getRegionLabel(row),
  });
  generated += 1;
});

const areaGroups = new Map();
const stationGroups = new Map();

for (const record of storeRecords) {
  if (!areaGroups.has(record.areaSlug)) areaGroups.set(record.areaSlug, []);
  areaGroups.get(record.areaSlug).push(record);

  if (record.stationSlug && /[a-z]/.test(record.stationSlug) && record.stationLabel) {
    if (!stationGroups.has(record.stationSlug)) stationGroups.set(record.stationSlug, []);
    stationGroups.get(record.stationSlug).push(record);
  }
}

for (const [areaSlug, records] of areaGroups.entries()) {
  records.sort((a, b) => a.station.localeCompare(b.station, "ja") || a.name.localeCompare(b.name, "ja"));
  const label = records[0]?.areaLabel || areaSlug;
  const html = renderCollectionPage({ type: "area", slug: areaSlug, label, records });
  fs.writeFileSync(path.join(rootAreasDir, `${areaSlug}.html`), html, "utf8");
  fs.writeFileSync(path.join(docsAreasDir, `${areaSlug}.html`), html, "utf8");
  sitemapUrls.push(`${SITE_ORIGIN}/areas/${encodeURIComponent(areaSlug)}.html`);
  areaPages += 1;
}

for (const [stationPageSlug, records] of stationGroups.entries()) {
  records.sort((a, b) => a.areaLabel.localeCompare(b.areaLabel, "ja") || a.name.localeCompare(b.name, "ja"));
  const label = records[0]?.stationLabel || stationPageSlug;
  const relatedRecords = storeRecords.filter((record) => record.areaSlug === records[0]?.areaSlug && record.stationSlug !== stationPageSlug);
  const html = renderCollectionPage({ type: "station", slug: stationPageSlug, label, records, relatedRecords });
  fs.writeFileSync(path.join(rootStationsDir, `${stationPageSlug}.html`), html, "utf8");
  fs.writeFileSync(path.join(docsStationsDir, `${stationPageSlug}.html`), html, "utf8");
  sitemapUrls.push(`${SITE_ORIGIN}/stations/${encodeURIComponent(stationPageSlug)}.html`);
  stationPages += 1;
}

const lastmod = String(meta.lastUpdatedAt || new Date().toISOString()).slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((url) => `  <url>
    <loc>${escapeHtml(url)}</loc>
    <lastmod>${escapeHtml(lastmod)}</lastmod>
  </url>`).join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;

fs.writeFileSync(rootSitemapPath, sitemap, "utf8");
fs.writeFileSync(docsSitemapPath, sitemap, "utf8");
fs.writeFileSync(rootRobotsPath, robots, "utf8");
fs.writeFileSync(docsRobotsPath, robots, "utf8");

console.log(`Generated ${generated} store pages, ${redirects} redirects, ${areaPages} area pages, and ${stationPages} station pages.`);
