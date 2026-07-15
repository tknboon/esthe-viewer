import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMonitorRegion } from "./config/monitor-regions.mjs";

const MONITOR_REGION_ID = process.env.ESTHE_REGION_ID || "aichi";
const MONITOR_REGION = getMonitorRegion(MONITOR_REGION_ID);
const TARGET_URLS = MONITOR_REGION.targetUrls;
const ROOT = process.cwd();
const SNAPSHOT_PATH = path.join(ROOT, MONITOR_REGION.outputFiles.snapshot);
const REPORT_PATH = path.join(ROOT, MONITOR_REGION.outputFiles.report);
const CSV_PATH = path.join(ROOT, MONITOR_REGION.outputFiles.csv);
const DATA_JS_PATH = path.join(ROOT, MONITOR_REGION.outputFiles.data);
const LEGACY_CSV_PATH = path.join(ROOT, MONITOR_REGION.outputFiles.legacyCsv);
const STATUS_PATH = path.join(ROOT, MONITOR_REGION.outputFiles.status);
const FAILURE_LOG_PATH = path.join(ROOT, MONITOR_REGION.outputFiles.failureLog);
const HISTORY_PATH = path.join(ROOT, MONITOR_REGION.outputFiles.history);
const HTML_INPUT_PATH = process.env.ESTHE_MONITOR_HTML_PATH || "";
const HTML_INPUT_DIR = process.env.ESTHE_MONITOR_HTML_DIR || "";
const MUNICIPALITY_DIR_PATH = process.env.ESTHE_MONITOR_MUNICIPALITY_DIR || "";
const DETAIL_DIR_PATH = process.env.ESTHE_MONITOR_DETAIL_DIR || "";

const CSV_HEADER = ["店舗名", "最寄駅", "住所または座標", "緯度", "経度", "掲載URL", "オフィシャルHP", "備考", "電話", "営業"];
const HTML_DECODE_MARKERS = ["駅・市区町村で絞り込む", "アジアンエステ", "店舗情報を見る", "全国メンズエステランキング", "アクセス"];

async function main() {
  const fetchedAt = new Date().toISOString();
  const listingSources = await loadListingSources();
  const current = await buildSnapshot(listingSources, fetchedAt);
  const previous = await readJson(SNAPSHOT_PATH);
  const diff = compareSnapshots(previous, current);
  const updateHistory = await updateDailyHistory(fetchedAt, diff, previous);

  const keptRows = await updateCsvAndData(current);
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(current, null, 2), "utf8");
  await fs.writeFile(REPORT_PATH, renderReport(current, diff), "utf8");
  await writeDataJs(DATA_JS_PATH, current, updateHistory, keptRows);
  await writeStatus({
    ok: true,
    checkedAt: fetchedAt,
    sourceUrls: TARGET_URLS,
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
        sourceCount: current.sourceSummaries.length,
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

async function buildSnapshot(listingSources, fetchedAt) {
  const stores = listingSources.flatMap((source) => {
    const normalizedHtml = decodeEntities(source.html);
    return extractStoreCards(normalizedHtml);
  });
  const storesWithDetails = await enrichStoresWithDetailPages(stores);
  const municipalityInfo = await buildMunicipalityByListingUrl(listingSources);
  const storeNames = [...new Set(storesWithDetails.map((store) => store.name).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
  const matchedShopLinks = [...new Set(storesWithDetails.map((store) => store.listingUrl).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
  const sourceSummaries = listingSources.map((source) => {
    const normalizedHtml = decodeEntities(source.html);
    const extracted = extractStoreCards(normalizedHtml);
    return {
      url: source.url,
      title: extractTagText(normalizedHtml, "title"),
      countText: extractCountText(normalizedHtml),
      matchedStoreCount: [...new Set(extracted.map((store) => store.name).filter(Boolean))].length,
      matchedLinkCount: [...new Set(extracted.map((store) => store.listingUrl).filter(Boolean))].length,
    };
  });
  const pageTitle = sourceSummaries.map((source) => source.title).filter(Boolean).join(" / ");
  const countText = sourceSummaries.map((source) => `${source.url}=${source.countText || "なし"}`).join(" | ");
  const detailedStoreCount = storesWithDetails.filter((store) => store.address || (store.latitude && store.longitude)).length;

  return {
    sourceUrls: TARGET_URLS,
    sourceSummaries,
    fetchedAt,
    pageTitle,
    countText,
    storeNames,
    matchedShopLinks,
    extractedStores: storesWithDetails,
    municipalityByListingUrl: municipalityInfo.primaryByListingUrl,
    municipalityLabelsByListingUrl: municipalityInfo.labelsByListingUrl,
    detailPageCount: storesWithDetails.filter((store) => store.detailLoaded).length,
    detailedStoreCount,
    checksum: JSON.stringify({
      countText,
      storeNames,
      matchedShopLinks,
      detailedStoreCount,
      sourceSummaries,
    }),
  };
}

async function enrichStoresWithDetailPages(stores) {
  const detailCache = new Map();
  const accessCache = new Map();
  const enriched = [];

  for (const store of stores) {
    const detailHtml = await loadDetailHtml(store.listingUrl, detailCache);
    const accessHtml = await loadAccessHtml(store.listingUrl, accessCache);
    if (!detailHtml) {
      enriched.push({ ...store, detailLoaded: false });
      continue;
    }

    const detail = extractDetailData(detailHtml, accessHtml, store);
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
      html = await readHtmlFile(detailFilePath);
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
    }
  }

  if (!html && !HTML_INPUT_PATH) {
    html = await fetchOptionalText(listingUrl);
  }

  cache.set(listingUrl, html);
  return html;
}

async function loadAccessHtml(listingUrl, cache) {
  if (!listingUrl) return "";
  if (cache.has(listingUrl)) return cache.get(listingUrl);

  let html = "";
  const accessFilePath = buildAccessFilePath(listingUrl);
  if (accessFilePath) {
    try {
      html = await readHtmlFile(accessFilePath);
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
    }
  }

  if (!html && !HTML_INPUT_PATH) {
    html = await fetchOptionalText(buildAccessUrl(listingUrl));
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

function buildAccessFilePath(listingUrl) {
  if (!DETAIL_DIR_PATH) return "";
  const detailId = extractDetailId(listingUrl);
  if (!detailId) return "";
  return path.join(DETAIL_DIR_PATH, `${detailId}__access.html`);
}

function buildAccessUrl(listingUrl) {
  return `${String(listingUrl || "").replace(/\/+$/, "")}/access/`;
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
        if (store.officialUrl) row["オフィシャルHP"] = store.officialUrl;
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
  return keptRows;
}

function createRowFromStore(store) {
  const row = {
    "店舗名": store.name,
    "最寄駅": store.station,
    "住所または座標": store.station,
    "緯度": "",
    "経度": "",
    "掲載URL": store.listingUrl,
    "オフィシャルHP": store.officialUrl || "",
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
    // An access-page address supersedes any coordinates retained from an older scrape.
    row["緯度"] = "";
    row["経度"] = "";
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

function extractDetailData(html, accessHtml, store = null) {
  const normalizedHtml = decodeEntities(html);
  const normalizedAccessHtml = decodeEntities(accessHtml || "");
  const inlineAccessHtml = extractAccessSection(normalizedHtml);
  const accessSourceHtml = normalizedAccessHtml || inlineAccessHtml || normalizedHtml;
  const text = htmlToText(accessSourceHtml);
  const lines = text
    .split("\n")
    .map((line) => compactText(line))
    .filter(Boolean);

  const mapLocation = extractMapLocationQuery(accessSourceHtml);
  const coordinates = extractCoordinates(mapLocation);
  const address = mapLocation || extractAddress(lines);
  const note = extractAccessNote(lines, address, coordinates);
  const roomLocations = extractRoomLocations(accessSourceHtml, store);

  return {
    address,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    officialUrl: extractOfficialUrl(normalizedHtml),
    note,
    roomLocations,
  };
}

function extractMapLocationQuery(html) {
  const source = String(html || "");
  const mapArea = source.match(/<div class="borderbox map-area">[\s\S]*?<\/div>\s*<\/div>/i)?.[0] || source;
  const match = mapArea.match(/https:\/\/www\.google\.com\/maps(?:\/embed\/v1\/place)?\?[^"'\s]*\bq=([^&"'\s]+)/i);
  if (!match?.[1]) return "";

  try {
    return compactText(decodeURIComponent(match[1].replaceAll("+", " ")));
  } catch (error) {
    return "";
  }
}

function extractOfficialUrl(html) {
  const officialMatch = html.match(/<td>\s*<a href="(https?:\/\/[^"]+)"[^>]*>\s*オフィシャルHP\s*<\/a>\s*<\/td>/i);
  if (officialMatch?.[1]) {
    return officialMatch[1];
  }

  const visualMatch = html.match(/<div class="sub_visual">\s*<a[^>]*href="(https?:\/\/[^"]+)"/i);
  if (visualMatch?.[1]) {
    return visualMatch[1];
  }

  return "";
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
  if (MONITOR_REGION.invalidAddressPattern.test(candidate)) return "";
  if (/電話をかける|24時間営業|割引特典|ネット予約|動画を見る|クーポン|店舗情報|セラピスト/.test(candidate)) return "";
  if (!MONITOR_REGION.addressScopePattern.test(candidate)) return "";
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

function extractRoomLocations(html, store) {
  const normalizedHtml = decodeEntities(html || "");
  if (!normalizedHtml.includes('borderbox map-area')) return [];

  const stationTokens = splitStationLabelTokens(store?.station || "");
  const remainingTokens = [...stationTokens];
  const chunks = [...normalizedHtml.matchAll(
    /<div class="borderbox map-area">[\s\S]*?(?=<div class="borderbox map-area">|<div class="margin-bottom-10 pc-header-spacer clear-none" id="tky"|<div class="second">|<!--\s*東京マップ|$)/g
  )].map((match) => match[0]);
  const rooms = [];

  for (const chunk of chunks) {
    const block = chunk;
    const text = htmlToText(block);
    const lines = text.split("\n").map((line) => compactText(line)).filter(Boolean);
    const coordinates = extractCoordinates(block || text);
    const address = extractAddress(lines);
    const note = extractAccessNote(lines, address, coordinates);
    const label = pickRoomLabelFromBlock(`${text}\n${address}\n${note}`, stationTokens);

    rooms.push({
      label,
      address,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      note,
    });
  }

  for (const room of rooms) {
    if (room.label) {
      const index = remainingTokens.findIndex((token) => normalizeRoomToken(token) === normalizeRoomToken(room.label));
      if (index >= 0) remainingTokens.splice(index, 1);
    }
  }

  for (const room of rooms) {
    if (!room.label && remainingTokens.length) {
      room.label = remainingTokens.shift();
    }
  }

  return rooms.filter((room) => room.label || room.address || room.latitude || room.longitude);
}

function splitStationLabelTokens(value) {
  return String(value || "")
    .split(/[・/／,，]/)
    .map((part) => compactText(part))
    .filter(Boolean);
}

function normalizeRoomToken(value) {
  return compactText(String(value || "").replace(/駅|ルーム/g, ""));
}

function pickRoomLabelFromBlock(text, stationTokens) {
  const haystack = compactText(text);
  if (!haystack || !stationTokens.length) return "";
  const match = stationTokens.find((token) => {
    const normalized = normalizeRoomToken(token);
    return normalized && haystack.includes(normalized);
  });
  return match || "";
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
    /<li class="active">\s*<a[^>]*href="\/[^/]+\/asian\/"[\s\S]*?<span class="badge[^"]*">(\d+)<\/span>/i
  );
  if (activeTabMatch) return `${activeTabMatch[1]}件`;

  const blockCount =
    html.split('<div class="shop-ranking blog-thumb-v2 margin-bottom-5 rd-border area-shop-list-3">').length - 1;
  return blockCount > 0 ? `${blockCount}件` : "";
}

function compareSnapshots(previous, current) {
  const currentDisplayMap = buildStoreDisplayMap(current.extractedStores || []);

  if (!previous) {
    return {
      added: current.storeNames.map((name) => formatStoreHistoryLabel(name, currentDisplayMap)),
      removed: [],
      changed: ["初回スナップショット取得"],
      sourceAddedUrls: current.sourceUrls || [],
      sourceRemovedUrls: [],
    };
  }

  const previousNames = new Set(previous.storeNames || []);
  const currentNames = new Set(current.storeNames || []);
  const previousDisplayMap = buildStoreDisplayMap(previous.extractedStores || []);
  const added = [...currentNames]
    .filter((name) => !previousNames.has(name))
    .sort((a, b) => a.localeCompare(b, "ja"))
    .map((name) => formatStoreHistoryLabel(name, currentDisplayMap));
  const removed = [...previousNames]
    .filter((name) => !currentNames.has(name))
    .sort((a, b) => a.localeCompare(b, "ja"))
    .map((name) => formatStoreHistoryLabel(name, previousDisplayMap));
  const changed = [];
  const previousSourceUrls = previous.sourceUrls || [];
  const currentSourceUrls = current.sourceUrls || [];
  const sourceAddedUrls = currentSourceUrls.filter((url) => !previousSourceUrls.includes(url));
  const sourceRemovedUrls = previousSourceUrls.filter((url) => !currentSourceUrls.includes(url));

  if ((previous.countText || "") !== (current.countText || "")) {
    changed.push(`掲載件数表示: ${previous.countText || "なし"} -> ${current.countText || "なし"}`);
  }
  if ((previous.pageTitle || "") !== (current.pageTitle || "")) {
    changed.push(`ページタイトル: ${previous.pageTitle || "なし"} -> ${current.pageTitle || "なし"}`);
  }
  if (JSON.stringify(previous.sourceUrls || []) !== JSON.stringify(current.sourceUrls || [])) {
    changed.push(`巡回対象: ${(previous.sourceUrls || []).join(", ") || "なし"} -> ${(current.sourceUrls || []).join(", ") || "なし"}`);
  }
  if ((previous.matchedShopLinks || []).length !== (current.matchedShopLinks || []).length) {
    changed.push(`店舗リンク数: ${(previous.matchedShopLinks || []).length} -> ${(current.matchedShopLinks || []).length}`);
  }
  if ((previous.detailedStoreCount || 0) !== (current.detailedStoreCount || 0)) {
    changed.push(`詳細取得件数: ${previous.detailedStoreCount || 0} -> ${current.detailedStoreCount || 0}`);
  }

  return { added, removed, changed, sourceAddedUrls, sourceRemovedUrls };
}

function buildStoreDisplayMap(stores) {
  const displayMap = new Map();

  for (const store of stores) {
    if (!store?.name) continue;
    const station = cleanHistoryStation(store.station || "");
    displayMap.set(store.name, station ? `${store.name}/${station}` : store.name);
  }

  return displayMap;
}

function formatStoreHistoryLabel(name, displayMap) {
  return displayMap.get(name) || name;
}

function cleanHistoryStation(value) {
  return compactText(value).replace(/\s+/g, "").replace(/徒歩.*$/, "");
}

function renderReport(current, diff) {
  return [
    `# ${MONITOR_REGION.reportLabel}`,
    "",
    `- checked_at: ${current.fetchedAt}`,
    `- sources: ${(current.sourceUrls || []).join(", ")}`,
    `- title: ${current.pageTitle || "なし"}`,
    `- count_text: ${current.countText || "なし"}`,
    `- matched_store_count: ${current.storeNames.length}`,
    `- matched_link_count: ${current.matchedShopLinks.length}`,
    `- detail_page_count: ${current.detailPageCount}`,
    `- detailed_store_count: ${current.detailedStoreCount}`,
    "",
    "## Source Summaries",
    ...formatSourceSummaries(current.sourceSummaries || []),
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
    `# ${MONITOR_REGION.reportLabel}`,
    "",
    `- checked_at: ${failedAt}`,
    `- sources: ${TARGET_URLS.join(", ")}`,
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

function formatSourceSummaries(items) {
  if (!items.length) return ["- none"];
  return items.flatMap((item) => [
    `- url: ${item.url}`,
    `  - title: ${item.title || "なし"}`,
    `  - count_text: ${item.countText || "なし"}`,
    `  - matched_store_count: ${item.matchedStoreCount || 0}`,
    `  - matched_link_count: ${item.matchedLinkCount || 0}`,
  ]);
}

async function loadListingSources() {
  if (HTML_INPUT_DIR) {
    const entries = await fs.readdir(HTML_INPUT_DIR);
    const htmlFiles = entries.filter((entry) => entry.toLowerCase().endsWith(".html")).sort((a, b) => a.localeCompare(b, "ja"));
    const fileSources = [];
    for (const entry of htmlFiles) {
      const filePath = path.join(HTML_INPUT_DIR, entry);
      const regionKey = path.basename(entry, ".html");
      const matchedUrl = TARGET_URLS.find((url) => {
        try {
          const pathname = new URL(url).pathname.split("/").filter(Boolean);
          return pathname[0] === regionKey;
        } catch (error) {
          return false;
        }
      });
      fileSources.push({
        url: matchedUrl || entry,
        html: await readHtmlFile(filePath),
      });
    }
    return fileSources.sort((left, right) => {
      const leftIndex = TARGET_URLS.indexOf(left.url);
      const rightIndex = TARGET_URLS.indexOf(right.url);
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
    });
  }

  if (HTML_INPUT_PATH) {
    return [{ url: TARGET_URLS[0], html: await readHtmlFile(HTML_INPUT_PATH) }];
  }

  return Promise.all(
    TARGET_URLS.map(async (url) => ({
      url,
      html: await fetchText(url),
    }))
  );
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

async function fetchOptionalText(url) {
  try {
    return await fetchText(url);
  } catch (error) {
    if (String(error?.message || "").includes(": 404")) return "";
    throw error;
  }
}

async function readHtmlFile(filePath) {
  const buffer = await fs.readFile(filePath);
  return decodeHtmlBuffer(buffer);
}

function decodeHtmlBuffer(buffer) {
  const utf8 = buffer.toString("utf8");
  const shiftJis = new TextDecoder("shift_jis").decode(buffer);
  return scoreHtmlCandidate(shiftJis) > scoreHtmlCandidate(utf8) ? shiftJis : utf8;
}

function scoreHtmlCandidate(text) {
  if (!text) return -1;

  let score = 0;
  for (const marker of HTML_DECODE_MARKERS) {
    if (text.includes(marker)) score += 3;
  }
  if (text.includes("shop-detail/")) score += 1;
  if (text.includes("�")) score -= 2;
  return score;
}

async function handleFailure(error) {
  const failedAt = new Date().toISOString();
  const detail = formatError(error);
  await fs.appendFile(FAILURE_LOG_PATH, `[${failedAt}] monitor failed\n${detail}\n\n`, "utf8");
  await writeStatus({
    ok: false,
    checkedAt: failedAt,
    sourceUrls: TARGET_URLS,
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

async function writeDataJs(filePath, snapshot, updateHistory, rows) {
  const officialUrlByListingUrl = Object.fromEntries(
    (snapshot.extractedStores || [])
      .filter((store) => store?.listingUrl && store?.officialUrl)
      .map((store) => [store.listingUrl, store.officialUrl])
  );
  const roomLocationsByListingUrl = Object.fromEntries(
    (snapshot.extractedStores || [])
      .filter((store) => store?.listingUrl && Array.isArray(store?.roomLocations) && store.roomLocations.length)
      .map((store) => [store.listingUrl, store.roomLocations])
  );
  const content = [
    `window.storeMeta = ${JSON.stringify({
      lastUpdatedAt: snapshot.fetchedAt,
      updateHistory,
      municipalityByListingUrl: snapshot.municipalityByListingUrl || {},
      municipalityLabelsByListingUrl: snapshot.municipalityLabelsByListingUrl || {},
      officialUrlByListingUrl,
      roomLocationsByListingUrl,
    })};`,
    `window.storeData = ${JSON.stringify(rows)};`,
  ].join("\n");
  await fs.writeFile(filePath, content, "utf8");
}

async function buildMunicipalityByListingUrl(listingSources) {
  const primaryByListingUrl = {};
  const labelsByListingUrl = {};

  for (const source of listingSources) {
    const childLinks = extractMunicipalityLinks(source.url, decodeEntities(source.html));
    if (!childLinks.length) continue;

    const grouped = new Map();

    for (const entry of childLinks) {
      const html = await loadMunicipalityHtml(entry.url);
      const stores = extractStoreCards(decodeEntities(html));
      for (const store of stores) {
        if (!store.listingUrl) continue;
        if (!grouped.has(store.listingUrl)) {
          grouped.set(store.listingUrl, new Set());
        }
        grouped.get(store.listingUrl).add(entry.label);
      }
    }

    for (const [listingUrl, labels] of grouped.entries()) {
      const values = [...labels];
      labelsByListingUrl[listingUrl] = values;
      primaryByListingUrl[listingUrl] = values.length > 1 ? "複数市" : values[0];
    }
  }

  return { primaryByListingUrl, labelsByListingUrl };
}

async function loadMunicipalityHtml(url) {
  let html = "";
  const filePath = buildMunicipalityFilePath(url);

  if (filePath) {
    try {
      html = await readHtmlFile(filePath);
    } catch (error) {
      html = "";
    }
  }

  if (!html) {
    html = await fetchText(url);
  }

  return html;
}

function buildMunicipalityFilePath(url) {
  if (!MUNICIPALITY_DIR_PATH) return "";

  const match = url.match(/^https:\/\/www\.esthe-ranking\.jp\/([^/]+)\/([^/]+)\/asian\/?$/i);
  if (!match) return "";

  const [, region, slug] = match;
  return path.join(MUNICIPALITY_DIR_PATH, `${region}__${slug}.html`);
}

function extractMunicipalityLinks(parentUrl, html) {
  const sectionMatch = html.match(/駅・市区町村で絞り込む([\s\S]*?)(?:近くのエリア|###|<h3|<h2)/i);
  if (!sectionMatch) return [];

  const parent = new URL(parentUrl);
  const parentParts = parent.pathname.split("/").filter(Boolean);
  const parentRegionKey = parentParts[0] || "";
  const links = [];
  const seen = new Set();
  const linkRegex = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(sectionMatch[1])) !== null) {
    const url = toAbsoluteUrl(match[1]);
    const label = compactText(stripTags(match[2] || ""));
    if (!url || !label || label === "全て") continue;

    let target;
    try {
      target = new URL(url);
    } catch (error) {
      continue;
    }

    const targetParts = target.pathname.split("/").filter(Boolean);
    if ((targetParts[0] || "") !== parentRegionKey) continue;
    if (!target.pathname.endsWith("/asian/")) continue;
    if (target.href === parent.href) continue;
    if (!target.pathname.includes(`/${parentRegionKey}/`)) continue;
    if (["schedule", "video", "girlsranking", "therakeep"].includes(targetParts[0] || "")) continue;
    if ((targetParts[1] || "").endsWith("-haken")) continue;

    const key = `${label}__${target.href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ label, url: target.href });
  }

  return links;
}

async function updateDailyHistory(fetchedAt, diff, previous) {
  const history = (await readJson(HISTORY_PATH)) || [];
  const dayKey = formatTokyoDayKey(fetchedAt);
  const shouldSuppressInitialAdded = Boolean(diff.added.length && ((diff.sourceAddedUrls || []).length || !previous));
  const existing = history.find((item) => item.dayKey === dayKey) || null;
  const entry = {
    dayKey,
    fetchedAt,
    added: uniqueStrings([
      ...(existing?.added || []),
      ...(shouldSuppressInitialAdded ? [] : diff.added),
    ]),
    removed: uniqueStrings([
      ...(existing?.removed || []),
      ...(diff.removed || []),
    ]),
    suppressedAdded: uniqueStrings([
      ...(existing?.suppressedAdded || []),
      ...(shouldSuppressInitialAdded ? diff.added : []),
    ]),
    suppressedSourceUrls: uniqueStrings([
      ...(existing?.suppressedSourceUrls || []),
      ...(shouldSuppressInitialAdded ? (diff.sourceAddedUrls || []) : []),
    ]),
  };

  const nextHistory = history.filter((item) => item.dayKey !== dayKey);
  nextHistory.unshift(entry);
  const trimmedHistory = nextHistory.slice(0, 31);
  await fs.writeFile(HISTORY_PATH, JSON.stringify(trimmedHistory, null, 2), "utf8");
  return trimmedHistory;
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function formatTokyoDayKey(value) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(value));
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async (error) => {
    try {
      await handleFailure(error);
    } catch (writeError) {
      console.error(writeError);
    }
    console.error(error);
    process.exitCode = 1;
  });
}

export { applyDetailLocationToRow, extractDetailData, extractMapLocationQuery };

