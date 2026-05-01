import fs from "node:fs/promises";
import path from "node:path";

const TARGET_URL = "https://www.esthe-ranking.jp/toyota/asian/";
const ROOT = process.cwd();
const SNAPSHOT_PATH = path.join(ROOT, "esthe_ranking_snapshot.json");
const REPORT_PATH = path.join(ROOT, "esthe_ranking_report.md");
const CSV_PATH = path.join(ROOT, "toyota_esthe_map_points_ja.csv");
const DATA_JS_PATH = path.join(ROOT, "data.js");
const LEGACY_CSV_PATH = path.join(ROOT, "toyota_esthe_legacy_rows.csv");
const STATUS_PATH = path.join(ROOT, "esthe_ranking_status.json");
const FAILURE_LOG_PATH = path.join(ROOT, "esthe_ranking_failure.log");
const HTML_INPUT_PATH = process.env.ESTHE_MONITOR_HTML_PATH || "";
const DETAIL_DIR_PATH = process.env.ESTHE_MONITOR_DETAIL_DIR || "";

const CSV_HEADER = ["店舗名", "最寄駅", "住所または座標", "緯度", "経度", "掲載URL", "備考", "電話", "営業"];

async function main() {
  const fetchedAt = new Date().toISOString();
  const listingHtml = await loadSourceHtml(TARGET_URL);
  const current = await buildSnapshot(listingHtml, fetchedAt);
  const previous = await readJson(SNAPSHOT_PATH);
  const diff = compareSnapshots(previous, current);

  await updateCsvAndData(current);
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(current, null, 2), "utf8");
  await fs.writeFile(REPORT_PATH, renderReport(current, diff), "utf8");
  await writeStatus({
    ok: true,
    checkedAt: fetchedAt,
    sourceUrl: TARGET_URL,
    matchedStoreCount: current.storeNames.length,
    matchedLinkCount: current.matchedShopLinks.length,
    detailPageCount: current.detailPageCount,
    detailedStoreCount: current.detailedStoreCount,
    reportPath: REPORT_PATH,
    snapshotPath: SNAPSHOT_PATH,
    failureLogPath: FAILURE_LOG_PATH,
  });

  process.stdout.write(
    JSON.stringify(
      {
        fetchedAt,
        totalMatchedStores: current.storeNames.length,
        detailPageCount: current.detailPageCount,
        detailedStoreCount: current.detailedStoreCount,
        added: diff.added,
        removed: diff.removed,
        changed: diff.changed,
        reportPath: REPORT_PATH,
        snapshotPath: SNAPSHOT_PATH,
      },
      null,
      2
    )
  );
}

async function buildSnapshot(listingHtml, fetchedAt) {
  const normalizedHtml = decodeEntities(listingHtml);
  const stores = extractStoreCards(normalizedHtml);
  const storesWithDetails = await enrichStoresWithDetailPages(stores);
  const storeNames = [...new Set(storesWithDetails.map((store) => store.name).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
  const matchedShopLinks = [...new Set(storesWithDetails.map((store) => store.listingUrl).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
  const pageTitle = extractTagText(normalizedHtml, "title");
  const countText = extractCountText(normalizedHtml);
  const detailedStoreCount = storesWithDetails.filter((store) => store.address || (store.latitude && store.longitude)).length;

  return {
    sourceUrl: TARGET_URL,
    fetchedAt,
    pageTitle,
    countText,
    storeNames,
    matchedShopLinks,
    extractedStores: storesWithDetails,
    detailPageCount: storesWithDetails.filter((store) => store.detailLoaded).length,
    detailedStoreCount,
    checksum: JSON.stringify({
      countText,
      storeNames,
      matchedShopLinks,
      detailedStoreCount,
    }),
  };
}

async function enrichStoresWithDetailPages(stores) {
  const detailCache = new Map();
  const enriched = [];

  for (const store of stores) {
    const detailHtml = await loadDetailHtml(store.listingUrl, detailCache);
    if (!detailHtml) {
      enriched.push({ ...store, detailLoaded: false });
      continue;
    }

    const detail = extractDetailData(detailHtml);
    enriched.push({
      ...store,
      ...detail,
      detailLoaded: true,
    });
  }

  return enriched;
}

async function loadDetailHtml(listingUrl, cache) {
  if (!listingUrl) return "";
  if (cache.has(listingUrl)) return cache.get(listingUrl);

  let html = "";
  const detailFilePath = buildDetailFilePath(listingUrl);
  if (detailFilePath) {
    try {
      html = await fs.readFile(detailFilePath, "utf8");
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
    }
  }

  if (!html && !HTML_INPUT_PATH) {
    html = await fetchText(listingUrl);
  }

  cache.set(listingUrl, html);
  return html;
}

function buildDetailFilePath(listingUrl) {
  if (!DETAIL_DIR_PATH) return "";
  const detailId = extractDetailId(listingUrl);
  if (!detailId) return "";
  return path.join(DETAIL_DIR_PATH, `${detailId}.html`);
}

function extractDetailId(listingUrl) {
  const match = listingUrl.match(/shop-detail\/([a-z0-9-]+)\//i);
  return match ? match[1] : "";
}

async function updateCsvAndData(snapshot) {
  const rows = await readCsv(CSV_PATH);

  for (const row of rows) {
    if (row["緯度"] && row["経度"]) {
      row["住所または座標"] = `${row["緯度"]}, ${row["経度"]}`;
    }
  }

  const rowsByName = new Map();
  const rowsByUrl = new Map();
  for (const row of rows) {
    const name = row["店舗名"] || "";
    const url = row["掲載URL"] || "";
    if (!rowsByName.has(name)) rowsByName.set(name, []);
    rowsByName.get(name).push(row);
    if (url) {
      if (!rowsByUrl.has(url)) rowsByUrl.set(url, []);
      rowsByUrl.get(url).push(row);
    }
  }

  for (const store of snapshot.extractedStores) {
    const matchingRows = (store.listingUrl && rowsByUrl.get(store.listingUrl)) || rowsByName.get(store.name) || [];

    if (matchingRows.length) {
      for (const row of matchingRows) {
        row["店舗名"] = row["店舗名"] || store.name;
        row["最寄駅"] = row["最寄駅"] || store.station;
        row["掲載URL"] = store.listingUrl || row["掲載URL"];
        if (store.phone) row["電話"] = store.phone;
        if (store.hours) row["営業"] = store.hours;
      }

      if (matchingRows.length === 1) {
        const row = matchingRows[0];
        applyDetailLocationToRow(row, store);
      }

      continue;
    }

    const row = createRowFromStore(store);
    rows.push(row);
    if (!rowsByName.has(row["店舗名"])) rowsByName.set(row["店舗名"], []);
    rowsByName.get(row["店舗名"]).push(row);
    if (row["掲載URL"]) {
      if (!rowsByUrl.has(row["掲載URL"])) rowsByUrl.set(row["掲載URL"], []);
      rowsByUrl.get(row["掲載URL"]).push(row);
    }
  }

  const currentUrlSet = new Set(snapshot.matchedShopLinks || []);
  const keptRows = rows.filter((row) => currentUrlSet.has((row["掲載URL"] || "").trim()));
  const legacyRows = rows.filter((row) => !currentUrlSet.has((row["掲載URL"] || "").trim()));

  await writeCsv(CSV_PATH, keptRows);
  await writeCsv(LEGACY_CSV_PATH, legacyRows);
  await writeDataJs(DATA_JS_PATH, keptRows);
}

function createRowFromStore(store) {
  const row = {
    "店舗名": store.name,
    "最寄駅": store.station,
    "住所または座標": store.station,
    "緯度": "",
    "経度": "",
    "掲載URL": store.listingUrl,
    "備考": "自動巡回で新規追加。位置情報は未補完",
    "電話": store.phone,
    "営業": store.hours,
  };

  applyDetailLocationToRow(row, store);
  return row;
}

function applyDetailLocationToRow(row, store) {
  if (store.latitude && store.longitude) {
    row["緯度"] = store.latitude;
    row["経度"] = store.longitude;
    row["住所または座標"] = `${store.latitude}, ${store.longitude}`;
  } else if (store.address) {
    row["住所または座標"] = store.address;
  }

  if (store.note) {
    row["備考"] = store.note;
  }
}

function extractStoreCards(html) {
  const marker = '<div class="shop-ranking blog-thumb-v2 margin-bottom-5 rd-border area-shop-list-3">';
  const blocks = html.split(marker).slice(1).map((chunk) => marker + chunk);
  const stores = [];

  for (const block of blocks) {
    const titleMatch = block.match(
      /<h3>\s*<a[^>]*href="([^"]*shop-detail[^"]*)"[^>]*>\s*<b>([\s\S]*?)<\/b>\s*<\/a>\s*<\/h3>/i
    );
    const name = compactText(stripTags(titleMatch?.[2] || ""));
    if (!name) continue;

    stores.push({
      name,
      station: cleanStationText(extractInfoText(block, "train")),
      hours: cleanHoursText(extractInfoText(block, "clock-o")),
      phone: extractPhone(block),
      listingUrl: toAbsoluteUrl(titleMatch?.[1] || ""),
      address: "",
      latitude: "",
      longitude: "",
      note: "",
    });
  }

  return stores;
}

function extractDetailData(html) {
  const normalizedHtml = decodeEntities(html);
  const accessHtml = extractAccessSection(normalizedHtml);
  const text = htmlToText(accessHtml || normalizedHtml);
  const lines = text
    .split("\n")
    .map((line) => compactText(line))
    .filter(Boolean);

  const coordinates = extractCoordinates(accessHtml || text);
  const address = extractAddress(lines);
  const note = extractAccessNote(lines, address, coordinates);

  return {
    address,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    note,
  };
}

function extractAccessSection(html) {
  const marker = '<h3 class="sub-ttl">アクセス</h3>';
  const index = html.indexOf(marker);
  if (index === -1) return "";
  return html.slice(index, index + 2500);
}

function extractCoordinates(text) {
  const match = text.match(/([0-9]{2}\.[0-9]{4,})\s*,\s*([0-9]{3}\.[0-9]{4,})/);
  if (!match) {
    return { latitude: "", longitude: "" };
  }

  return {
    latitude: trimTrailingZeros(match[1]),
    longitude: trimTrailingZeros(match[2]),
  };
}

function extractAddress(lines) {
  for (const line of lines) {
    if (!line.startsWith("所在地")) continue;
    const cleaned = compactText(line.replace(/^所在地[:：]?/, ""));
    const candidate = normalizeAddressCandidate(cleaned);
    if (candidate) return candidate;
  }

  for (const line of lines) {
    const candidate = normalizeAddressCandidate(line);
    if (candidate) return candidate;
  }

  return "";
}

function normalizeAddressCandidate(value) {
  const candidate = compactText(value);
  if (!candidate) return "";
  if (/^[0-9]{2}\.[0-9]+,\s*[0-9]{3}\.[0-9]+$/.test(candidate)) return "";
  if (/電話をかける|24時間営業|割引特典|ネット予約|動画を見る|クーポン|店舗情報|セラピスト/.test(candidate)) return "";
  if (!/(愛知県|豊田市|岡崎市|刈谷市|安城市|知立市|高浜市|碧南市|みよし市|西尾市|幸田町)/.test(candidate)) return "";
  return candidate;
}

function extractAccessNote(lines, address, coordinates) {
  const noteKeywords = ["付近", "目印", "駐車場", "となり", "近く", "入口", "徒歩", "着きましたら", "裏側", "番", "沿い"];
  for (const line of lines) {
    if (line === "アクセス" || line === "地図アプリで開く") continue;
    if (address && line === address) continue;
    if (coordinates.latitude && line.includes(coordinates.latitude)) continue;
    if (noteKeywords.some((keyword) => line.includes(keyword))) {
      return line.replace(/^※\s*/, "");
    }
  }

  if (coordinates.latitude && coordinates.longitude && address) {
    return "アクセス欄に緯度経度と住所あり";
  }
  if (coordinates.latitude && coordinates.longitude) {
    return "アクセス欄は緯度経度のみ";
  }
  if (address) {
    return "アクセス欄に住所あり";
  }

  return "";
}

function extractInfoText(block, iconName) {
  const match = block.match(
    new RegExp(`<li><i class="fa fa-${escapeRegExp(iconName)}">[\\s\\S]*?<\\/i>\\s*([\\s\\S]*?)<\\/li>`, "i")
  );
  return compactText(stripTags(match?.[1] || ""));
}

function extractPhone(block) {
  const match = block.match(/href="tel:([\d-]+)"/i);
  return match ? match[1] : "";
}

function extractTagText(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? compactText(stripTags(match[1])) : "";
}

function extractCountText(html) {
  const activeTabMatch = html.match(
    /<li class="active">\s*<a[^>]*href="\/toyota\/asian\/"[\s\S]*?<span class="badge[^"]*">(\d+)<\/span>/i
  );
  if (activeTabMatch) return `${activeTabMatch[1]}件`;

  const blockCount =
    html.split('<div class="shop-ranking blog-thumb-v2 margin-bottom-5 rd-border area-shop-list-3">').length - 1;
  return blockCount > 0 ? `${blockCount}件` : "";
}

function compareSnapshots(previous, current) {
  if (!previous) {
    return {
      added: current.storeNames,
      removed: [],
      changed: ["初回スナップショット取得"],
    };
  }

  const previousNames = new Set(previous.storeNames || []);
  const currentNames = new Set(current.storeNames || []);
  const added = [...currentNames].filter((name) => !previousNames.has(name)).sort((a, b) => a.localeCompare(b, "ja"));
  const removed = [...previousNames].filter((name) => !currentNames.has(name)).sort((a, b) => a.localeCompare(b, "ja"));
  const changed = [];

  if ((previous.countText || "") !== (current.countText || "")) {
    changed.push(`掲載件数表記: ${previous.countText || "なし"} -> ${current.countText || "なし"}`);
  }
  if ((previous.pageTitle || "") !== (current.pageTitle || "")) {
    changed.push(`ページタイトル: ${previous.pageTitle || "なし"} -> ${current.pageTitle || "なし"}`);
  }
  if ((previous.matchedShopLinks || []).length !== (current.matchedShopLinks || []).length) {
    changed.push(`店舗リンク数: ${(previous.matchedShopLinks || []).length} -> ${(current.matchedShopLinks || []).length}`);
  }
  if ((previous.detailedStoreCount || 0) !== (current.detailedStoreCount || 0)) {
    changed.push(`詳細取得件数: ${previous.detailedStoreCount || 0} -> ${current.detailedStoreCount || 0}`);
  }

  return { added, removed, changed };
}

function renderReport(current, diff) {
  return [
    "# esthe-ranking toyota monitor",
    "",
    `- checked_at: ${current.fetchedAt}`,
    `- source: ${current.sourceUrl}`,
    `- title: ${current.pageTitle || "なし"}`,
    `- count_text: ${current.countText || "なし"}`,
    `- matched_store_count: ${current.storeNames.length}`,
    `- matched_link_count: ${current.matchedShopLinks.length}`,
    `- detail_page_count: ${current.detailPageCount}`,
    `- detailed_store_count: ${current.detailedStoreCount}`,
    "",
    "## Added",
    ...formatList(diff.added),
    "",
    "## Removed",
    ...formatList(diff.removed),
    "",
    "## Changed",
    ...formatList(diff.changed),
    "",
    "## Current Stores",
    ...formatList(current.storeNames),
    "",
  ].join("\n");
}

function renderFailureReport(failedAt, detail) {
  return [
    "# esthe-ranking toyota monitor",
    "",
    `- checked_at: ${failedAt}`,
    `- source: ${TARGET_URL}`,
    "- status: failed",
    "",
    "## Error",
    "",
    "```text",
    detail,
    "```",
    "",
    `- failure_log: ${FAILURE_LOG_PATH}`,
    "",
  ].join("\n");
}

function formatList(items) {
  if (!items.length) return ["- none"];
  return items.map((item) => `- ${item}`);
}

async function loadSourceHtml(url) {
  if (HTML_INPUT_PATH) {
    return fs.readFile(HTML_INPUT_PATH, "utf8");
  }
  return fetchText(url);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 Codex monitor",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function handleFailure(error) {
  const failedAt = new Date().toISOString();
  const detail = formatError(error);
  await fs.appendFile(FAILURE_LOG_PATH, `[${failedAt}] monitor failed\n${detail}\n\n`, "utf8");
  await writeStatus({
    ok: false,
    checkedAt: failedAt,
    sourceUrl: TARGET_URL,
    error: detail,
    failureLogPath: FAILURE_LOG_PATH,
    reportPath: REPORT_PATH,
    snapshotPath: SNAPSHOT_PATH,
  });
  await fs.writeFile(REPORT_PATH, renderFailureReport(failedAt, detail), "utf8");
}

async function writeStatus(status) {
  await fs.writeFile(STATUS_PATH, JSON.stringify(status, null, 2), "utf8");
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  const [header, ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((key, idx) => [key, values[idx] ?? ""])));
}

async function writeCsv(filePath, rows) {
  const lines = [CSV_HEADER.join(","), ...rows.map((row) => CSV_HEADER.map((key) => csvEscape(row[key] || "")).join(","))];
  await fs.writeFile(filePath, lines.join("\r\n"), "utf8");
}

async function writeDataJs(filePath, rows) {
  await fs.writeFile(filePath, `window.storeData = ${JSON.stringify(rows)};`, "utf8");
}

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&frasl;", "/");
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, " ");
}

function htmlToText(html) {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|tr|td|th|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function compactText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanStationText(value) {
  return compactText(value).replace(/\s+/g, "").replace(/徒歩.*$/, "");
}

function cleanHoursText(value) {
  return compactText(value).replace(/\s+/g, " ");
}

function trimTrailingZeros(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : value;
}

function csvEscape(value) {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toAbsoluteUrl(value) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return `https://www.esthe-ranking.jp${value}`;
  return value;
}

function isNotFoundError(error) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function formatError(error) {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }
  return String(error);
}

main().catch(async (error) => {
  try {
    await handleFailure(error);
  } catch (writeError) {
    console.error(writeError);
  }
  console.error(error);
  process.exitCode = 1;
});
