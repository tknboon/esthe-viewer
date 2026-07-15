const state = {
  rows: [],
  filteredRows: [],
  view: "cards",
  appliedKeyword: "",
  selectedRow: null,
  reviewsByStore: {},
  storeProfilesByKey: {},
  favoritesByStore: {},
  excludedByStore: {},
  map: null,
  infoWindow: null,
  markers: new Map(),
  markerClusterer: null,
  profileMap: null,
  profileInfoWindow: null,
  profileMarkers: new Map(),
  geocoder: null,
  geocodeQueue: [],
  geocodeRunning: false,
  geocodeCache: {},
  mapReady: false,
  mapSyncQueued: false,
  profileMapSyncQueued: false,
  regionExpanded: false,
  expandedRegions: {},
  expandedUpdateHistory: {},
  updateHistoryInitialized: false,
  activeSidebarTab: "history",
  streetViewPanorama: null,
  streetViewService: null,
  archivedDetailCache: {},
  archivedDetailLoading: {},
  sharedSync: {
    enabled: false,
    authReady: false,
    signingIn: false,
    user: null,
    db: null,
    auth: null,
    unsubscribers: [],
    statusMode: "local",
    errorMessage: "",
    documentsMeta: {},
    lastBackupAt: "",
    legacyWriteFailedAt: "",
    legacyWriteFailedDocId: "",
    legacyWriteErrorMessage: "",
  },
};

const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const sidebarTabs = document.querySelectorAll("[data-sidebar-tab]");
const sidebarPanels = document.querySelectorAll("[data-sidebar-panel]");
const lastUpdatedText = document.querySelector("#lastUpdatedText");
const syncStatusText = document.querySelector("#syncStatusText");
const syncAuthButton = document.querySelector("#syncAuthButton");
const syncMetaText = document.querySelector("#syncMetaText");
const syncBackupButton = document.querySelector("#syncBackupButton");
const regionSummary = document.querySelector("#regionSummary");
const reviewTotalCount = document.querySelector("#reviewTotalCount");
const monthlyRevenueChart = document.querySelector("#monthlyRevenueChart");
const dailyUpdateHistory = document.querySelector("#dailyUpdateHistory");
const storeTotalCount = document.querySelector("#storeTotalCount");
const storeNet7Text = document.querySelector("#storeNet7Text");
const storeNet30Text = document.querySelector("#storeNet30Text");
const storeLatestChangeText = document.querySelector("#storeLatestChangeText");
const storeTrendBars = document.querySelector("#storeTrendBars");
const locationPreciseCount = document.querySelector("#locationPreciseCount");
const locationStationCount = document.querySelector("#locationStationCount");
const locationUnknownCount = document.querySelector("#locationUnknownCount");
const locationAuditList = document.querySelector("#locationAuditList");
const locationAuditHeading = document.querySelector("#locationAuditHeading");
const archivedReviewList = document.querySelector("#archivedReviewList");
const cardsView = document.querySelector("#cardsView");
const tableView = document.querySelector("#tableView");
const tableBody = document.querySelector("#tableBody");
const visibleCount = document.querySelector("#visibleCount");
const uniqueCount = document.querySelector("#uniqueCount");
const mapReadyCount = document.querySelector("#mapReadyCount");
const allDayCount = document.querySelector("#allDayCount");
const statusText = document.querySelector("#statusText");
const profileMapCount = document.querySelector("#profileMapCount");
const profileMapStatusText = document.querySelector("#profileMapStatusText");
const selectedStoreName = document.querySelector("#selectedStoreName");
const selectedStoreMeta = document.querySelector("#selectedStoreMeta");
const selectedStoreProfileMeta = document.querySelector("#selectedStoreProfileMeta");
const editAccessText = document.querySelector("#editAccessText");
const selectedReviewSummary = document.querySelector("#selectedReviewSummary");
const streetViewCanvas = document.querySelector("#streetViewCanvas");
const streetViewEmptyState = document.querySelector("#streetViewEmptyState");
const streetViewStatusText = document.querySelector("#streetViewStatusText");
const selectedPhoneLink = document.querySelector("#selectedPhoneLink");
const selectedPhoneSearchLink = document.querySelector("#selectedPhoneSearchLink");
const selectedMapLink = document.querySelector("#selectedMapLink");
const selectedListingLink = document.querySelector("#selectedListingLink");
const favoriteToggleButton = document.querySelector("#favoriteToggleButton");
const excludeToggleButton = document.querySelector("#excludeToggleButton");
const storeProfileToolbar = document.querySelector("#storeProfileToolbar");
const storeProfilePanel = document.querySelector("#storeProfilePanel");
const storeAddressInput = document.querySelector("#storeAddressInput");
const storeNoteInput = document.querySelector("#storeNoteInput");
const storeSmsInput = document.querySelector("#storeSmsInput");
const storeMenuInput = document.querySelector("#storeMenuInput");
const storeDisclosureInput = document.querySelector("#storeDisclosureInput");
const storeGuideClarityInput = document.querySelector("#storeGuideClarityInput");
const storeProfileActions = document.querySelector("#storeProfileActions");
const storeProfileSaveButton = document.querySelector("#storeProfileSaveButton");
const storeProfileEditButton = document.querySelector("#storeProfileEditButton");
const mapList = document.querySelector("#mapList");
const mapListCount = document.querySelector("#mapListCount");
const reviewForm = document.querySelector("#reviewForm");
const reviewVisitDateInput = document.querySelector("#reviewVisitDateInput");
const reviewAuthorInput = document.querySelector("#reviewAuthorInput");
const reviewNationalityInput = document.querySelector("#reviewNationalityInput");
const reviewDurationInput = document.querySelector("#reviewDurationInput");
const reviewPriceInput = document.querySelector("#reviewPriceInput");
const reviewShowerInput = document.querySelector("#reviewShowerInput");
const reviewMassageInput = document.querySelector("#reviewMassageInput");
const reviewFaceRatingInput = document.querySelector("#reviewFaceRatingInput");
const reviewBodyRatingInput = document.querySelector("#reviewBodyRatingInput");
const reviewPersonalityRatingInput = document.querySelector("#reviewPersonalityRatingInput");
const reviewServiceRatingInput = document.querySelector("#reviewServiceRatingInput");
const reviewOverallRatingInput = document.querySelector("#reviewOverallRatingInput");
const reviewCommentInput = document.querySelector("#reviewCommentInput");
const reviewSubmitButton = document.querySelector("#reviewSubmitButton");
const reviewList = document.querySelector("#reviewList");
const reviewToggleButton = document.querySelector("#reviewToggleButton");
const reviewStorageNote = document.querySelector("#reviewStorageNote");
const heroTitle = document.querySelector(".hero h1");
const regionSwitchLinks = document.querySelectorAll("[data-region-link]");
const REGIONS = window.REGIONS || {};
const CURRENT_REGION_ID = window.CURRENT_REGION_ID || "aichi";
const CURRENT_REGION = REGIONS[CURRENT_REGION_ID] || REGIONS.aichi || {};
const REGION_LABELS = CURRENT_REGION.areaLabels || {};
const REGION_DISPLAY_ORDER = CURRENT_REGION.areaOrder || Object.keys(REGION_LABELS);
const REGION_MUNICIPALITIES = CURRENT_REGION.municipalityMap || {};
const REGION_ROOT_LABEL = CURRENT_REGION.rootLabel || "地域";
const REGION_MAP_CENTER = CURRENT_REGION.mapCenter || { lat: 35, lng: 135 };
const REGION_MAP_ZOOM = CURRENT_REGION.mapZoom || 12;
const REGION_PROFILE_MAP_ZOOM = CURRENT_REGION.profileMapZoom || 11;
const REGION_GEOCODE_SUFFIX = CURRENT_REGION.geocodeSuffix || "";
const REGION_GEOCODE_BOUNDS = CURRENT_REGION.geocodeBounds || null;
const REGION_GEOCODE_SCOPE_PATTERN = CURRENT_REGION.geocodeScopePattern ? new RegExp(CURRENT_REGION.geocodeScopePattern) : /^$/;
const REGION_INVALID_LOCATION_PATTERN = CURRENT_REGION.invalidLocationPattern ? new RegExp(CURRENT_REGION.invalidLocationPattern) : /^$/;
const LOCAL_STORAGE_PREFIX = `${CURRENT_REGION_ID}-esthe`;
const LEGACY_LOCAL_STORAGE_PREFIX = CURRENT_REGION.legacyStoragePrefix || "";
const LOCAL_STORAGE_SUFFIXES = {
  reviews: "reviews",
  storeProfiles: "store-profiles",
  favorites: "favorites",
  excluded: "excluded",
  geocodeCache: "geocode-cache",
  safetyBackup: "safety-backup",
  backupMeta: "backup-meta",
};
const LEGACY_LOCAL_STORAGE_KEYS = {
  reviews: `${LEGACY_LOCAL_STORAGE_PREFIX}-reviews`,
  storeProfiles: `${LEGACY_LOCAL_STORAGE_PREFIX}-store-profiles`,
  favorites: `${LEGACY_LOCAL_STORAGE_PREFIX}-favorites`,
  excluded: `${LEGACY_LOCAL_STORAGE_PREFIX}-excluded`,
  geocodeCache: `${LEGACY_LOCAL_STORAGE_PREFIX}-geocode-cache`,
  safetyBackup: `${LEGACY_LOCAL_STORAGE_PREFIX}-safety-backup`,
  backupMeta: `${LEGACY_LOCAL_STORAGE_PREFIX}-backup-meta`,
};

const MANUAL_STATION_OVERRIDES = CURRENT_REGION.manualStationOverrides || {};
const MANUAL_LOCATION_OVERRIDES = CURRENT_REGION.manualLocationOverrides || {};

const STATION_GROUP_REGIONS = new Set(CURRENT_REGION.stationGroupRegions || []);
const MAIN_MAP_CLUSTERING_ENABLED = CURRENT_REGION_ID === "tokyo";

const RECOVERED_REMOVED_HISTORY = CURRENT_REGION.recoveredRemovedHistory || {};

const MANUAL_ROOM_LOCATION_OVERRIDES = CURRENT_REGION.roomLocationOverrides || {};

init();

function init() {
  try {
    applyRegionPageMeta();
    state.rows = (window.storeData || []).map(normalizeRow);
    if (!state.rows.length) {
      throw new Error("No embedded data");
    }
    state.geocodeCache = readGeocodeCache();
    state.reviewsByStore = readReviews();
    state.storeProfilesByKey = readStoreProfiles();
    state.rows.forEach(applyProfileLocationToRow);
    primeArchivedProfileDetails();
    state.favoritesByStore = readFavorites();
    state.excludedByStore = readExcluded();
    state.sharedSync.lastBackupAt = readBackupMeta().savedAt || "";
    renderSidebarTabs();
    renderLastUpdated();
    renderStoreStats();
    renderUpdateHistory();
    setDefaultReviewValues();
    bindEvents();
    applyFilters();
    renderReviewAnalytics();
    initSharedSync();
  } catch (error) {
    if (statusText) {
      statusText.textContent = "データの読み込みに失敗しました。";
    }
    if (cardsView) {
      cardsView.innerHTML = `<div class="empty-state">表示できる店舗データがありません。</div>`;
    }
    console.error(error);
  }
}

function applyRegionPageMeta() {
  if (CURRENT_REGION.title) {
    document.title = CURRENT_REGION.title;
  }
  if (heroTitle && CURRENT_REGION.h1Label) {
    heroTitle.textContent = CURRENT_REGION.h1Label;
  }
  for (const link of regionSwitchLinks) {
    const isCurrent = link.dataset.regionLink === CURRENT_REGION_ID;
    link.classList.toggle("is-current", isCurrent);
    if (isCurrent) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function renderLastUpdated() {
  if (!lastUpdatedText) return;

  const rawValue = window.storeMeta?.lastUpdatedAt;
  if (!rawValue) {
    lastUpdatedText.textContent = "最終更新: 不明";
    return;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    lastUpdatedText.textContent = `最終更新: ${rawValue}`;
    return;
  }

  const formatted = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  lastUpdatedText.textContent = `最終更新: ${formatted}`;
}

function getNormalizedUpdateHistoryEntries() {
  return (Array.isArray(window.storeMeta?.updateHistory) ? window.storeMeta.updateHistory : [])
    .map(normalizeHistoryEntry)
    .filter((entry) => {
      const added = Array.isArray(entry?.added) ? entry.added : [];
      const removed = Array.isArray(entry?.removed) ? entry.removed : [];
      return added.length || removed.length;
    });
}

function renderStoreStats() {
  if (!storeTotalCount && !storeTrendBars) return;

  const history = getNormalizedUpdateHistoryEntries();
  const currentCount = state.rows.length;
  const net7 = calculateHistoryNetChange(history, 7);
  const net28 = calculateHistoryNetChange(history, 28);
  const recent7 = calculateHistoryChangeCounts(history, 7);

  if (storeTotalCount) storeTotalCount.textContent = `${currentCount}件`;
  if (storeNet7Text) storeNet7Text.textContent = formatSignedCount(net7);
  if (storeNet30Text) storeNet30Text.textContent = formatSignedCount(net28);
  if (storeLatestChangeText) {
    storeLatestChangeText.textContent = `開店 ${recent7.added} / 閉店 ${recent7.removed}`;
  }

  renderLocationAudit();
  renderStoreTrendBars(buildDailyHistoryEntries(history, 28));
}

function renderLocationAudit() {
  const audit = buildLocationAudit(state.rows);
  const isCorrectionQueue = CURRENT_REGION_ID === "tokyo";
  if (locationPreciseCount) locationPreciseCount.textContent = `${audit.precise.length}件`;
  if (locationStationCount) locationStationCount.textContent = `${audit.station.length}件`;
  if (locationUnknownCount) locationUnknownCount.textContent = `${audit.unknown.length}件`;
  if (!locationAuditList) return;
  if (locationAuditHeading) {
    locationAuditHeading.textContent = isCorrectionQueue ? "駅周辺配置の補正キュー" : "駅周辺配置が多い地点";
  }
  locationAuditList.classList.toggle("is-correction-queue", isCorrectionQueue);

  const sortedGroups = [...audit.stationGroups.values()]
    .sort((left, right) => right.rows.length - left.rows.length || left.label.localeCompare(right.label, "ja"));
  const groups = isCorrectionQueue
    ? sortedGroups
    : sortedGroups.filter((group) => group.rows.length >= 2).slice(0, 12);

  locationAuditList.innerHTML = groups.length
    ? groups.map((group) => {
        const selectedIndex = group.rows.findIndex((row) => row.id === state.selectedRow?.id);
        const progressLabel = isCorrectionQueue && selectedIndex >= 0
          ? `${selectedIndex + 1}/${group.rows.length}`
          : `${group.rows.length}件`;
        return `
        <button class="location-audit-item" type="button" data-location-group="${escapeHtml(group.groupKey)}">
          <span>
            <span class="location-audit-name">${escapeHtml(group.label)}</span>
            ${isCorrectionQueue ? "<small>クリックで店舗を順番に確認</small>" : ""}
          </span>
          <strong>${progressLabel}</strong>
        </button>
      `;
      }).join("")
    : `<div class="empty-state compact">駅周辺にまとめた店舗はありません。</div>`;
}

function buildLocationAudit(rows) {
  const audit = {
    precise: [],
    station: [],
    unknown: [],
    stationGroups: new Map(),
  };

  for (const row of rows || []) {
    const quality = getLocationQuality(row);
    audit[quality].push(row);
    if (quality !== "station") continue;

    const groupKey = getLocationAuditGroupKey(row);
    if (!audit.stationGroups.has(groupKey)) {
      audit.stationGroups.set(groupKey, { groupKey, label: groupKey, rows: [] });
    }
    audit.stationGroups.get(groupKey).rows.push(row);
  }

  return audit;
}

function getLocationAuditGroupKey(row) {
  return row?.stationGroup || normalizeStationGroupLabel(row?.station || "") || row?.station || row?.name || "位置不明";
}

function getLocationQuality(row) {
  if (!row) return "unknown";
  const profileAddress = normalizeAddressValue(getStoreProfile(row)?.address || "");
  const hasCoordinates = Boolean(
    normalizeLatLng(MANUAL_LOCATION_OVERRIDES[row.listingUrl]) ||
    (row.latitude && row.longitude)
  );
  if (hasCoordinates || hasDetailedAddressLocation(profileAddress) || hasDetailedAddressLocation(row.location)) {
    return "precise";
  }
  return row.station ? "station" : "unknown";
}

function hasDetailedAddressLocation(value) {
  const location = String(value || "").trim();
  if (!hasUsableAddressLocation(location)) return false;
  return /[0-9０-９]/.test(location) && /[都道府県区市町村]/.test(location);
}

function calculateHistoryNetChange(history, days) {
  const counts = calculateHistoryChangeCounts(history, days);
  return counts.added - counts.removed;
}

function calculateHistoryChangeCounts(history, days) {
  const latestDayKey = getLatestHistoryDayKey(history);
  if (!latestDayKey) return { added: 0, removed: 0 };

  const latestDate = parseDayKeyDate(latestDayKey);
  if (!latestDate) return { added: 0, removed: 0 };

  const earliest = new Date(latestDate);
  earliest.setDate(latestDate.getDate() - (days - 1));

  return history.reduce((total, entry) => {
    const dayKey = getHistoryEntryDayKey(entry);
    const date = parseDayKeyDate(dayKey);
    if (!date || date < earliest || date > latestDate) return total;
    total.added += Array.isArray(entry.added) ? entry.added.length : 0;
    total.removed += Array.isArray(entry.removed) ? entry.removed.length : 0;
    return total;
  }, { added: 0, removed: 0 });
}

function buildDailyHistoryEntries(history, days) {
  const latestDayKey = getLatestHistoryDayKey(history);
  const latestDate = parseDayKeyDate(latestDayKey);
  if (!latestDate) return history.slice(0, days);

  const byDay = new Map();
  for (const entry of history) {
    const dayKey = getHistoryEntryDayKey(entry);
    if (dayKey && !byDay.has(dayKey)) {
      byDay.set(dayKey, entry);
    }
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(latestDate);
    date.setDate(latestDate.getDate() - index);
    const dayKey = formatDayKey(date);
    return byDay.get(dayKey) || {
      dayKey,
      fetchedAt: `${dayKey}T00:00:00`,
      added: [],
      removed: [],
      suppressedAdded: [],
      suppressedSourceUrls: [],
    };
  });
}

function renderStoreTrendBars(entries) {
  if (!storeTrendBars) return;
  if (!entries.length) {
    storeTrendBars.innerHTML = `<div class="empty-state compact">更新履歴が入るとここに表示されます。</div>`;
    return;
  }

  const values = entries.map((entry) => {
    const added = Array.isArray(entry.added) ? entry.added.length : 0;
    const removed = Array.isArray(entry.removed) ? entry.removed.length : 0;
    return { entry, added, removed, net: added - removed };
  });
  const maxValue = Math.max(...values.map((item) => Math.max(item.added, item.removed, Math.abs(item.net))), 1);

  storeTrendBars.innerHTML = values
    .map(({ entry, added, removed, net }) => {
      const addedWidth = added ? Math.max(8, Math.round((added / maxValue) * 100)) : 0;
      const removedWidth = removed ? Math.max(8, Math.round((removed / maxValue) * 100)) : 0;
      return `
        <div class="store-trend-row">
          <span class="store-trend-date">${escapeHtml(formatHistoryDateWithWeekday(getHistoryEntryDayKey(entry)))}</span>
          <div class="store-trend-track" aria-label="開店 ${added}件 閉店 ${removed}件">
            <span class="store-trend-bar is-added" style="width:${addedWidth}%"></span>
            <span class="store-trend-bar is-removed" style="width:${removedWidth}%"></span>
          </div>
          <span class="store-trend-net ${net >= 0 ? "is-plus" : "is-minus"}">${escapeHtml(formatSignedCount(net))}</span>
        </div>
      `;
    })
    .join("");
}

function getLatestHistoryDayKey(history) {
  return getHistoryEntryDayKey(history[0] || null);
}

function getHistoryEntryDayKey(entry) {
  return String(entry?.dayKey || entry?.fetchedAt || "").slice(0, 10);
}

function parseDayKeyDate(dayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dayKey || ""))) return null;
  const date = new Date(`${dayKey}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatSignedCount(value) {
  const number = Number(value) || 0;
  if (number > 0) return `+${number}`;
  if (number < 0) return String(number);
  return "±0";
}

function renderUpdateHistory() {
  if (!dailyUpdateHistory) return;

  const history = getNormalizedUpdateHistoryEntries();

  const stationLookup = buildHistoryStationLookup();

  if (!history.length) {
    dailyUpdateHistory.innerHTML = `<div class="empty-state compact">更新履歴はまだありません。</div>`;
    return;
  }

  const visibleHistory = history.slice(0, 14);
  if (!state.updateHistoryInitialized && visibleHistory.length) {
    state.expandedUpdateHistory[getHistoryEntryKey(visibleHistory[0], 0)] = true;
    state.updateHistoryInitialized = true;
  }

  dailyUpdateHistory.innerHTML = visibleHistory
    .map((entry, index) => {
      const added = Array.isArray(entry.added) ? entry.added : [];
      const removed = Array.isArray(entry.removed) ? entry.removed : [];
      const historyKey = getHistoryEntryKey(entry, index);
      const isExpanded = Boolean(state.expandedUpdateHistory[historyKey]);

      return `
        <article class="update-history-item${isExpanded ? " is-expanded" : ""}">
          <button class="update-history-head" type="button" data-history-toggle="${escapeHtml(historyKey)}" aria-expanded="${isExpanded ? "true" : "false"}">
            <span class="update-history-caret" aria-hidden="true">${isExpanded ? "▼" : "▶"}</span>
            <span class="update-history-date">${escapeHtml(formatHistoryDateWithWeekday(entry.dayKey || entry.fetchedAt))}</span>
            <span class="update-history-summary">開店 ${added.length}件 / 閉店 ${removed.length}件</span>
          </button>
          <div class="update-history-body" ${isExpanded ? "" : "hidden"}>
            ${renderHistoryGroup("開店", added, "added", stationLookup)}
            ${renderHistoryGroup("閉店", removed, "removed", stationLookup)}
          </div>
        </article>
      `;
    })
    .join("");
}

function getHistoryEntryKey(entry, index) {
  return String(entry?.dayKey || entry?.fetchedAt || `history-${index}`);
}

function normalizeHistoryEntry(entry) {
  const dayKey = entry?.dayKey || "";
  const fallbackRemoved = RECOVERED_REMOVED_HISTORY[dayKey] || [];
  const added = uniqueStrings(Array.isArray(entry?.added) ? entry.added : []);
  let removed = uniqueStrings(Array.isArray(entry?.removed) ? entry.removed : []);

  if (fallbackRemoved.length) {
    const looksBroken = removed.some((item) => /[?？]{2,}/.test(String(item || "")));
    removed = looksBroken ? fallbackRemoved : uniqueStrings([...removed, ...fallbackRemoved]);
  }

  return {
    ...entry,
    added,
    removed,
  };
}

function uniqueStrings(values) {
  const seen = new Set();
  const results = [];

  for (const value of values || []) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    results.push(text);
  }

  return results;
}

function buildHistoryStationLookup() {
  const lookup = new Map();

  for (const row of state.rows) {
    if (!row?.name || !row?.station) continue;
    if (!lookup.has(row.name)) {
      lookup.set(row.name, new Set());
    }
    lookup.get(row.name).add(formatStationDisplay(row) || row.station);
  }

  return lookup;
}

function formatHistoryStoreLabel(item, stationLookup) {
  const label = String(item || "").trim();
  if (!label) return "";
  if (label.includes("/")) return formatHistoryLabelStation(label);

  const stations = stationLookup.get(label);
  if (!stations || !stations.size) return label;

  return `${label}/${[...stations][0]}`;
}

function formatHistoryLabelStation(label) {
  const [rawName, ...stationParts] = String(label || "").split("/");
  const station = stationParts.join("/");
  if (!rawName || !station) return label;

  const stationGroup = normalizeStationGroupLabel(station);
  const displayStation = stationGroup || station;

  return `${rawName}/${displayStation}`;
}

const NEW_STORE_HIGHLIGHT_DAYS = 7;
const addedDayKeyCache = new Map();
let addedDayKeyCacheSource = null;

function findAddedDayKey(row) {
  if (!row?.name) return "";

  const history = Array.isArray(window.storeMeta?.updateHistory) ? window.storeMeta.updateHistory : [];
  if (addedDayKeyCacheSource !== history) {
    addedDayKeyCache.clear();
    addedDayKeyCacheSource = history;
  }

  const cacheKey = row.id || `${row.name}|${row.station || ""}`;
  if (addedDayKeyCache.has(cacheKey)) {
    return addedDayKeyCache.get(cacheKey);
  }

  const normalizedName = normalizeHistoryComparableText(row.name);
  const normalizedStation = normalizeHistoryComparableText(row.station || "");
  let bestMatch = "";
  let nameOnlyFallback = "";

  for (const entry of history) {
    const added = Array.isArray(entry?.added) ? entry.added : [];
    const dayKey = entry?.dayKey || String(entry?.fetchedAt || "").slice(0, 10);
    if (!dayKey) continue;

    for (const item of added) {
      const [rawName, ...stationParts] = String(item || "").split("/");
      const rawStation = stationParts.join("/");
      const itemName = normalizeHistoryComparableText(rawName);
      const itemStation = normalizeHistoryComparableText(rawStation);
      if (!itemName || itemName !== normalizedName) continue;

      if (!nameOnlyFallback || dayKey < nameOnlyFallback) {
        nameOnlyFallback = dayKey;
      }

      if (
        !normalizedStation ||
        !itemStation ||
        itemStation.includes(normalizedStation) ||
        normalizedStation.includes(itemStation) ||
        stationTokensOverlap(rawStation, row.station || "")
      ) {
        if (!bestMatch || dayKey < bestMatch) {
          bestMatch = dayKey;
        }
      }
    }
  }

  const result = bestMatch || nameOnlyFallback;
  addedDayKeyCache.set(cacheKey, result);
  return result;
}

function isRecentlyAddedRow(row) {
  const dayKey = findAddedDayKey(row);
  if (!dayKey) return false;

  const addedDate = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(addedDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliest = new Date(today);
  earliest.setDate(today.getDate() - (NEW_STORE_HIGHLIGHT_DAYS - 1));

  return addedDate >= earliest && addedDate <= today;
}

function normalizeHistoryComparableText(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[()（）]/g, "")
    .trim();
}

function splitStationTokens(value) {
  return String(value || "")
    .split(/[・/／,，]/)
    .map((part) => normalizeHistoryComparableText(part))
    .filter(Boolean);
}

function stationTokensOverlap(left, right) {
  const leftTokens = splitStationTokens(left);
  const rightTokens = splitStationTokens(right);

  if (!leftTokens.length || !rightTokens.length) return false;

  return leftTokens.some((leftToken) =>
    rightTokens.some((rightToken) => leftToken === rightToken || leftToken.includes(rightToken) || rightToken.includes(leftToken))
  );
}

function hasPreciseRoomLocation(row) {
  if (!row) return false;
  if (row.hasCoordinates) return true;
  const location = String(row.location || "").trim();
  if (!location) return false;
  const normalizedLocation = normalizeHistoryComparableText(location);
  const normalizedStation = normalizeHistoryComparableText(row.station || "");
  if (!normalizedLocation) return false;
  if (!normalizedStation) return true;
  return !stationTokensOverlap(location, row.station || "") && normalizedLocation !== normalizedStation;
}

function getExplicitRoomLocations(row) {
  if (!row?.listingUrl) return [];
  const manualOverride = MANUAL_ROOM_LOCATION_OVERRIDES[row.listingUrl];
  if (Array.isArray(manualOverride) && manualOverride.length) {
    return manualOverride;
  }
  const locations = window.storeMeta?.roomLocationsByListingUrl?.[row.listingUrl];
  if (!Array.isArray(locations)) return [];
  return normalizeExplicitRoomLocations(row, locations);
}

function normalizeExplicitRoomLocations(row, locations) {
  const stationTokens = splitStationTokens(row?.station || "");
  if (locations.length <= 1 || stationTokens.length <= 1) {
    return locations;
  }

  const remainingTokens = [...stationTokens];
  return locations.map((location) => {
    const haystack = normalizeHistoryComparableText(
      [location?.label, location?.address, location?.note].filter(Boolean).join(" ")
    );
    let matchedIndex = remainingTokens.findIndex((token) => {
      const normalizedToken = normalizeRoomToken(token);
      return normalizedToken && haystack.includes(normalizedToken);
    });

    if (matchedIndex < 0) {
      const normalizedLabel = normalizeRoomToken(location?.label || "");
      matchedIndex = remainingTokens.findIndex((token) => normalizeRoomToken(token) === normalizedLabel);
    }

    if (matchedIndex < 0) {
      matchedIndex = 0;
    }

    const resolvedLabel = remainingTokens.splice(matchedIndex, 1)[0] || location?.label || row?.station || "";
    return {
      ...location,
      label: resolvedLabel,
    };
  });
}

function normalizeRoomToken(value) {
  return normalizeHistoryComparableText(String(value || "").replace(/駅|ルーム/g, ""));
}

function buildRoomProfileKey(row, stationLabel) {
  const baseKey = row?.reviewKey || row?.listingUrl || row?.name || "";
  const roomLabel = String(stationLabel || row?.roomStation || row?.station || "").trim();
  if (!baseKey || !roomLabel) return baseKey;
  return `${baseKey}__room__${roomLabel}`;
}

function getStoreProfileStorageKey(row) {
  if (!row) return "";
  if (row.profileKey) return row.profileKey;
  if (row.isRoomVariant) {
    return buildRoomProfileKey(row, row.roomStation || row.station || "");
  }
  return row.reviewKey || row.listingUrl || "";
}

function getBaseStoreProfileKey(row) {
  if (!row) return "";
  return row.reviewKey || row.listingUrl || "";
}

function looksBrokenText(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return /[?？]{2,}|�/.test(text);
}

function choosePrimaryStationToken(row, tokens) {
  if (!Array.isArray(tokens) || !tokens.length) return "";
  if (!row) return tokens[0] || "";
  const haystack = normalizeHistoryComparableText([row.location, row.notes].filter(Boolean).join(" "));
  if (!haystack) return tokens[0] || "";

  const matched = tokens.find((token) => {
    const normalizedToken = normalizeRoomToken(token);
    if (!normalizedToken) return false;
    return haystack.includes(normalizedToken);
  });

  return matched || tokens[0] || "";
}

function buildRoomLocationQuery(row, stationToken) {
  return buildLocationQuery(row.name, stationToken, stationToken, row.notes);
}

function createRoomVariantRow(row, stationToken, index, primaryStationToken) {
  const baseId = `${row.id}__room-${index}`;
  const variant = {
    ...row,
    id: baseId,
    profileKey: buildRoomProfileKey(row, stationToken),
    station: stationToken,
    stationGroup: normalizeStationGroupLabel(stationToken),
    stationAccess: getStationAccessLabel(stationToken),
    roomStation: stationToken,
    roomIndex: index,
    isRoomVariant: true,
  };

  const shouldUsePrimaryLocation = hasPreciseRoomLocation(row) && stationToken === primaryStationToken;
  if (shouldUsePrimaryLocation) {
    return variant;
  }

  const roomLocationQuery = buildRoomLocationQuery(row, stationToken);
  const cachedRoomLatLng = state.geocodeCache[roomLocationQuery] || null;
  variant.location = stationToken;
  variant.latitude = "";
  variant.longitude = "";
  variant.hasCoordinates = false;
  variant.baseLatLng = cachedRoomLatLng;
  variant.latLng = cachedRoomLatLng;
  variant.baseLocationQuery = roomLocationQuery;
  variant.locationQuery = roomLocationQuery;
  variant.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(roomLocationQuery)}`;
  return variant;
}

function createExplicitRoomVariantRow(row, room, index) {
  const label = looksBrokenText(room?.label) ? (row.station || "") : (room?.label || row.station || "");
  const latitude = room?.latitude || "";
  const longitude = room?.longitude || "";
  const hasCoordinates = Boolean(latitude && longitude);
  const roomAddress = looksBrokenText(room?.address) ? "" : String(room?.address || "").trim();
  const roomHasOwnNote = room && Object.prototype.hasOwnProperty.call(room, "note");
  const effectiveNote = roomHasOwnNote
    ? (looksBrokenText(room?.note) ? row.notes : String(room?.note || "").trim())
    : row.notes;
  const location = roomAddress || label || row.location;
  const locationQuery = hasCoordinates
    ? `${latitude},${longitude}`
    : (roomAddress || buildLocationQuery(row.name, label, location, effectiveNote));
  const stationFallbackQuery = buildRoomLocationQuery(row, label);
  const shouldUseStationFallback = !hasCoordinates && (!roomAddress || normalizeRoomToken(roomAddress) === normalizeRoomToken(label));
  const cachedLatLng = hasCoordinates
    ? { lat: Number(latitude), lng: Number(longitude) }
    : state.geocodeCache[locationQuery] || (shouldUseStationFallback ? state.geocodeCache[stationFallbackQuery] || null : null);

  return {
    ...row,
    id: `${row.id}__explicit-room-${index}`,
    profileKey: buildRoomProfileKey(row, label),
    station: label,
    stationGroup: normalizeStationGroupLabel(label),
    stationAccess: getStationAccessLabel(label),
    roomStation: label,
    roomIndex: index,
    isRoomVariant: true,
    location,
    latitude,
    longitude,
    hasCoordinates,
    baseLatLng: cachedLatLng,
    latLng: cachedLatLng,
    baseLocationQuery: locationQuery,
    locationQuery,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`,
    notes: effectiveNote,
  };
}

function expandRowsForMap(rows) {
  const expanded = [];
  for (const row of rows || []) {
    const explicitRoomLocations = getExplicitRoomLocations(row);
    if (explicitRoomLocations.length > 1) {
      explicitRoomLocations.forEach((room, index) => {
        expanded.push(createExplicitRoomVariantRow(row, room, index));
      });
      continue;
    }

    expanded.push(row);
  }
  return expanded;
}

function getRoomVariantByStation(row, stationLabel) {
  const target = normalizeRoomToken(stationLabel || "");
  if (!target) return null;
  return expandRowsForMap([row]).find((candidate) => normalizeRoomToken(candidate?.station || "") === target) || null;
}

function findClosedDayKey(storeName, station) {
  const history = Array.isArray(window.storeMeta?.updateHistory) ? window.storeMeta.updateHistory : [];
  const normalizedName = normalizeHistoryComparableText(storeName);
  const normalizedStation = normalizeHistoryComparableText(station);
  let nameOnlyFallback = "";

  for (const entry of history) {
    const removed = Array.isArray(entry?.removed) ? entry.removed : [];
    for (const item of removed) {
      const [rawName, rawStation = ""] = String(item || "").split("/");
      const itemName = normalizeHistoryComparableText(rawName);
      const itemStation = normalizeHistoryComparableText(rawStation);
      if (!itemName || itemName !== normalizedName) continue;
      if (!nameOnlyFallback) {
        nameOnlyFallback = entry.dayKey || "";
      }
      if (!normalizedStation) return entry.dayKey || "";
      if (
        !itemStation ||
        itemStation.includes(normalizedStation) ||
        normalizedStation.includes(itemStation) ||
        stationTokensOverlap(itemStation, normalizedStation)
      ) {
        return entry.dayKey || "";
      }
    }
  }

  return nameOnlyFallback;
}

function formatClosedPrefix(dayKey) {
  if (!dayKey) return "【閉店】";
  return `【閉店${formatHistoryDate(dayKey)}】`;
}

function getDisplayStoreName(row) {
  if (!row) return "";
  if (row.isRoomVariant) {
    return row.station ? `${row.name} / ${row.station}` : row.name;
  }
  if (row.isArchivedStore) {
    return `${formatClosedPrefix(row.closedDayKey)}${row.name}`;
  }
  return row.name;
}

function renderDisplayStoreNameHtml(row) {
  const displayName = getDisplayStoreName(row);
  if (!displayName) return "";
  if (row?.isArchivedStore) {
    const match = displayName.match(/^(【閉店[^】]*】)(.*)$/);
    if (match) {
      return `${escapeHtml(match[1])}<br>${escapeHtml(match[2])}`;
    }
  }
  return escapeHtml(displayName);
}

function findStoredProfileByHistoryLabel(label) {
  const text = String(label || "").trim();
  if (!text) return null;

  const [rawName, rawStation = ""] = text.split("/");
  const normalizedName = normalizeHistoryComparableText(rawName);
  const normalizedStation = normalizeHistoryComparableText(rawStation);
  let nameOnlyMatch = null;

  for (const [reviewKey, profile] of Object.entries(state.storeProfilesByKey || {})) {
    if (!hasStoreProfileContent(profile)) continue;
    const profileName = normalizeHistoryComparableText(profile.storeName || "");
    const profileStation = normalizeHistoryComparableText(profile.storeStation || "");
    if (!profileName || profileName !== normalizedName) continue;
    if (!nameOnlyMatch) {
      nameOnlyMatch = { reviewKey, profile };
    }
    if (
      !normalizedStation ||
      !profileStation ||
      profileStation.includes(normalizedStation) ||
      normalizedStation.includes(profileStation) ||
      stationTokensOverlap(profile.storeStation || "", rawStation)
    ) {
      return { reviewKey, profile };
    }
  }

  return nameOnlyMatch;
}

function getHistoryTagAccentClass(label, row) {
  if (row) {
    if (isExcludedRow(row)) return "is-state-excluded";
    if (isFavoriteRow(row)) return "is-state-favorite";

    const profile = getStoreProfile(row);
    const latestReview = getLatestReview(row);
    const guideClarity = profile?.guideClarity || latestReview?.guideClarity || "";
    if (guideClarity === "あり") return "is-profile-pink";
    if (guideClarity === "なし") return "is-profile-yellow";
  }

  const profileMatch = findStoredProfileByHistoryLabel(label);
  const guideClarity = profileMatch?.profile?.guideClarity || "";
  if (guideClarity === "あり") return "is-profile-pink";
  if (guideClarity === "なし") return "is-profile-yellow";
  return "";
}

function renderHistoryGroup(label, items, modifier, stationLookup) {
  if (!items.length) return "";
  const historyItems = items
    .map((item) => {
      const rawLabel = String(item || "").trim();
      const displayLabel = formatHistoryStoreLabel(rawLabel, stationLookup);
      const row = findRowByHistoryLabel(rawLabel) || findRowByHistoryLabel(displayLabel);
      return { rawLabel, displayLabel, row };
    })
    .filter((item) => item.displayLabel)
    .sort(compareHistoryItems);

  return `
    <section class="update-history-group">
      <div class="update-history-label ${modifier === "removed" ? "is-removed" : "is-added"}">${escapeHtml(label)}</div>
      <div class="update-history-tags">
        ${historyItems
          .map(({ rawLabel, displayLabel, row }) => {
            const accentClass = getHistoryTagAccentClass(rawLabel, row);
            if (row) {
              return `<button type="button" class="update-history-tag is-link ${accentClass}" data-history-store="${escapeHtml(rawLabel)}">${escapeHtml(displayLabel)}</button>`;
            }
            return `<span class="update-history-tag ${accentClass}">${escapeHtml(displayLabel)}</span>`;
          })
          .join("")}
      </div>
    </section>
  `;
}

function compareHistoryItems(a, b) {
  const leftRegion = getRegionOrderForRow(a.row);
  const rightRegion = getRegionOrderForRow(b.row);
  if (leftRegion !== rightRegion) return leftRegion - rightRegion;

  const leftStation = getHistorySortStation(a);
  const rightStation = getHistorySortStation(b);
  const stationCompare = leftStation.localeCompare(rightStation, "ja");
  if (stationCompare) return stationCompare;

  return a.displayLabel.localeCompare(b.displayLabel, "ja");
}

function getRegionOrderForRow(row) {
  const regionKey = getRegionKeyFromRow(row);
  const index = REGION_DISPLAY_ORDER.indexOf(regionKey);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function getHistorySortStation(item) {
  return item.row?.stationGroup || parseHistoryLabelStation(item.displayLabel) || item.displayLabel;
}

function parseHistoryLabelStation(label) {
  const parts = String(label || "").split("/");
  return parts.length > 1 ? parts.slice(1).join("/").trim() : "";
}

function findRowByHistoryLabel(label) {
  const text = String(label || "").trim();
  if (!text) return null;

  const [rawName, ...stationParts] = text.split("/");
  const storeName = rawName?.trim() || text;
  const station = stationParts.join("/").trim();
  if (!storeName) return null;

  const candidates = state.rows.filter((row) => row.name === storeName);
  if (!station || candidates.length <= 1) return candidates[0] || null;

  const normalizedStation = normalizeHistoryComparableText(station);
  return candidates.find((row) => {
    const rowStation = row.station || "";
    const rowStationGroup = row.stationGroup || "";
    return (
      normalizeHistoryComparableText(rowStation) === normalizedStation ||
      normalizeHistoryComparableText(rowStationGroup) === normalizedStation ||
      stationTokensOverlap(rowStation, station) ||
      stationTokensOverlap(rowStationGroup, station)
    );
  }) || candidates[0] || null;
}

function handleHistoryClick(event) {
  const toggle = event.target.closest("[data-history-toggle]");
  if (toggle) {
    const historyKey = toggle.dataset.historyToggle;
    if (!historyKey) return;
    state.expandedUpdateHistory[historyKey] = !state.expandedUpdateHistory[historyKey];
    renderUpdateHistory();
    return;
  }

  const trigger = event.target.closest("[data-history-store]");
  if (!trigger) return;

  const row = findRowByHistoryLabel(trigger.dataset.historyStore);
  if (!row) return;

  focusRow(row);
}

function handleSidebarTabClick(event) {
  const button = event.currentTarget;
  const tab = button?.dataset?.sidebarTab || "search";
  state.activeSidebarTab = tab;
  renderSidebarTabs();
}

function renderSidebarTabs() {
  if (!sidebarTabs.length || !sidebarPanels.length) return;

  sidebarTabs.forEach((button) => {
    const isActive = button.dataset.sidebarTab === state.activeSidebarTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  sidebarPanels.forEach((panel) => {
    const isActive = panel.dataset.sidebarPanel === state.activeSidebarTab;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function formatHistoryDate(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split("-");
    return `${Number(year)}/${String(Number(month)).padStart(2, "0")}/${String(Number(day)).padStart(2, "0")}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatHistoryDateWithWeekday(value) {
  if (!value) return "";

  const raw = String(value);
  const dayKey = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : raw.slice(0, 10);
  const date = parseDayKeyDate(dayKey);
  if (!date) return formatHistoryDate(value);

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${formatHistoryDate(dayKey)}(${weekdays[date.getDay()]})`;
}

function formatDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function bindEvents() {
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyKeywordSearch();
    }
  });
  searchButton.addEventListener("click", applyKeywordSearch);

  cardsView?.addEventListener("click", handleListActionClick);
  tableBody?.addEventListener("click", handleListActionClick);
  mapList?.addEventListener("click", handleListActionClick);
  locationAuditList?.addEventListener("click", handleLocationAuditClick);
  sidebarTabs.forEach((button) => button.addEventListener("click", handleSidebarTabClick));
  reviewList.addEventListener("click", handleReviewDelete);
  archivedReviewList?.addEventListener("click", handleReviewDelete);
  dailyUpdateHistory?.addEventListener("click", handleHistoryClick);
  syncAuthButton?.addEventListener("click", handleSyncAuthClick);
  syncBackupButton?.addEventListener("click", handleBackupExport);
  storeProfileSaveButton?.addEventListener("click", handleStoreProfileSave);
  storeProfileEditButton?.addEventListener("click", handleStoreProfileEdit);
  favoriteToggleButton?.addEventListener("click", handleFavoriteToggle);
  excludeToggleButton?.addEventListener("click", handleExcludeToggle);
  reviewToggleButton?.addEventListener("click", handleReviewToggle);
  reviewForm.addEventListener("submit", handleReviewSubmit);
  regionSummary?.addEventListener("click", handleRegionToggle);
}

function handleListActionClick(event) {
  const trigger = event.target.closest("[data-focus-id]");
  if (!trigger) return;
  const row = state.filteredRows.find((item) => item.id === trigger.dataset.focusId);
  if (!row) return;
  focusRow(row);
}

function handleLocationAuditClick(event) {
  const trigger = event.target.closest("[data-location-group]");
  if (!trigger) return;
  const previousGroup = getLocationQuality(state.selectedRow) === "station"
    ? getLocationAuditGroupKey(state.selectedRow)
    : "";
  const rows = state.rows.filter((item) =>
    getLocationQuality(item) === "station" && getLocationAuditGroupKey(item) === trigger.dataset.locationGroup
  );
  const selectedIndex = CURRENT_REGION_ID === "tokyo"
    ? rows.findIndex((item) => item.id === state.selectedRow?.id)
    : -1;
  const row = rows[selectedIndex >= 0 ? (selectedIndex + 1) % rows.length : 0];
  if (!row) return;
  if (!state.filteredRows.some((item) => item.id === row.id)) {
    state.appliedKeyword = "";
    if (searchInput) searchInput.value = "";
    applyFilters();
  }
  focusRow(row);
  if (CURRENT_REGION_ID === "tokyo") {
    for (const button of locationAuditList.querySelectorAll("[data-location-group]")) {
      const progress = button.querySelector("strong");
      if (!progress) continue;
      if (button === trigger) {
        progress.textContent = `${rows.findIndex((item) => item.id === row.id) + 1}/${rows.length}`;
      } else if (button.dataset.locationGroup === previousGroup) {
        const previousCount = state.rows.filter((item) =>
          getLocationQuality(item) === "station" && getLocationAuditGroupKey(item) === previousGroup
        ).length;
        progress.textContent = `${previousCount}件`;
      }
    }
  }
}

function toggleView() {
  if (!cardsView || !tableView) return;
  state.view = state.view === "cards" ? "table" : "cards";
  const cardsMode = state.view === "cards";
  cardsView.classList.toggle("is-hidden", !cardsMode);
  tableView.classList.toggle("is-hidden", cardsMode);
}

function applyKeywordSearch() {
  state.appliedKeyword = searchInput.value.trim().toLowerCase();
  applyFilters();
}

function applyFilters() {
  const keyword = state.appliedKeyword;

  state.filteredRows = state.rows.filter((row) => {
    if (!keyword) return true;

    const haystack = [
      row.name,
      row.station,
      row.stationGroup,
      row.stationAccess,
      row.location,
      row.notes,
      row.phone,
      row.hours,
      row.locationQuery,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });

  if (!state.filteredRows.some((row) => row.id === state.selectedRow?.id)) {
    state.selectedRow = null;
  }

  renderSummary();
  renderRegionSummary();
  renderCards();
  renderTable();
  renderSelectedStore();
  syncMapWithFilters();
  syncProfileMap();
}

function handleRegionToggle(event) {
  const municipalityTrigger = event.target.closest("[data-municipality-label]");
  if (municipalityTrigger) {
    const regionKey = municipalityTrigger.dataset.regionKey || "";
    const municipalityLabel = municipalityTrigger.dataset.municipalityLabel || "";
    focusMunicipality(regionKey, municipalityLabel);
    return;
  }

  const regionTrigger = event.target.closest("[data-region-key]");
  if (regionTrigger) {
    const regionKey = regionTrigger.dataset.regionKey;
    state.expandedRegions[regionKey] = !state.expandedRegions[regionKey];
    renderRegionSummary();
    return;
  }

  const toggle = event.target.closest("[data-region-toggle]");
  if (!toggle) return;
  state.regionExpanded = !state.regionExpanded;
  renderRegionSummary();
}

function renderRegionSummary() {
  if (!regionSummary) return;

  const stats = buildRegionStats(state.filteredRows);
  const rootLabel = `${REGION_ROOT_LABEL}(${stats.total})`;

  regionSummary.innerHTML = `
    <button class="region-toggle" type="button" data-region-toggle="${escapeHtml(CURRENT_REGION_ID)}" aria-expanded="${state.regionExpanded ? "true" : "false"}">
      <span class="region-toggle-label">${escapeHtml(rootLabel)}</span>
      <span class="region-toggle-icon">${state.regionExpanded ? "−" : "+"}</span>
    </button>
    ${
      state.regionExpanded
        ? `
          <div class="region-children">
            ${stats.children
              .map((item) => {
                const isExpanded = Boolean(state.expandedRegions[item.key]);
                return `
                  <div class="region-group">
                    <button class="region-child region-child-button" type="button" data-region-key="${item.key}" aria-expanded="${isExpanded ? "true" : "false"}">
                      <span class="region-child-name">${escapeHtml(item.label)}</span>
                      <span class="region-child-count">(${item.count}) ${isExpanded ? "−" : "+"}</span>
                    </button>
                    ${
                      isExpanded && item.municipalities.length
                        ? `
                          <div class="municipality-list">
                            ${item.municipalities
                              .map(
                                (municipality) => `
                                  <button
                                    type="button"
                                    class="municipality-item municipality-button"
                                    data-region-key="${item.key}"
                                    data-municipality-label="${escapeHtml(municipality.label)}"
                                  >
                                    <span class="municipality-name">${escapeHtml(municipality.label)}</span>
                                    <span class="municipality-count">(${municipality.count})</span>
                                  </button>
                                `
                              )
                              .join("")}
                          </div>
                        `
                        : ""
                    }
                  </div>
                `;
              })
              .join("")}
          </div>
        `
        : ""
    }
  `;
}

function buildRegionStats(rows) {
  const regionBuckets = new Map();
  const uniqueStoreKeys = new Set();

  for (const row of rows) {
    const uniqueKey = row.listingUrl || row.reviewKey || row.name;
    if (uniqueKey) uniqueStoreKeys.add(uniqueKey);

    const regionKey = getRegionKeyFromRow(row);
    if (!regionKey) continue;

    if (!regionBuckets.has(regionKey)) {
      regionBuckets.set(regionKey, {
        stores: new Set(),
        municipalities: new Map(),
      });
    }

    const bucket = regionBuckets.get(regionKey);
    bucket.stores.add(uniqueKey);

    const municipalityLabels = getMunicipalityLabelsForSummary(row, regionKey);
    for (const municipality of municipalityLabels) {
      if (!bucket.municipalities.has(municipality)) {
        bucket.municipalities.set(municipality, new Set());
      }
      bucket.municipalities.get(municipality).add(uniqueKey);
    }
  }

  const children = [...regionBuckets.entries()]
    .map(([regionKey, bucket]) => ({
      key: regionKey,
      label: REGION_LABELS[regionKey] || regionKey,
      count: bucket.stores.size,
      municipalities: [...bucket.municipalities.entries()]
        .map(([label, items]) => ({ label, count: items.size }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja")),
    }))
    .sort(compareRegionChildren);

  return {
    total: uniqueStoreKeys.size,
    children,
  };
}

function compareRegionChildren(a, b) {
  const leftIndex = REGION_DISPLAY_ORDER.indexOf(a.key);
  const rightIndex = REGION_DISPLAY_ORDER.indexOf(b.key);
  const leftOrder = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const rightOrder = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
  return leftOrder - rightOrder || a.label.localeCompare(b.label, "ja");
}

function getMunicipalityLabelsForSummary(row, regionKey) {
  if (Array.isArray(row?.municipalityLabels) && row.municipalityLabels.length) {
    const labels = row.municipalityLabels.filter(Boolean);
    if (STATION_GROUP_REGIONS.has(regionKey)) {
      return [...new Set(labels.map((label) => normalizeStationGroupLabel(label)).filter(Boolean))];
    }
    return [...new Set(labels)];
  }

  return [getMunicipalityFromRow(row, regionKey)];
}

function focusMunicipality(regionKey, municipalityLabel) {
  const matches = state.filteredRows.filter((row) => {
    if (getRegionKeyFromRow(row) !== regionKey) return false;
    const labels = getMunicipalityLabelsForSummary(row, regionKey);
    return labels.includes(municipalityLabel);
  });

  if (!matches.length) return;

  if (!ensureMapReady()) {
    focusRow(matches[0]);
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  let placedCount = 0;

  for (const row of matches) {
    const cached = row.latLng || state.geocodeCache[row.locationQuery];
    if (cached) {
      row.latLng = cached;
      bounds.extend(cached);
      placedCount += 1;
    } else if (row.locationQuery) {
      queueGeocode(row);
    }
  }

  if (placedCount > 1) {
    state.map.fitBounds(bounds, 80);
  } else if (placedCount === 1) {
    state.map.setCenter(bounds.getCenter());
    state.map.setZoom(Math.max(state.map.getZoom(), 14));
  }

  focusRow(matches[0]);
}

function getRegionKeyFromRow(row) {
  if (!row?.listingUrl) return "";
  try {
    const url = new URL(row.listingUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] || "";
  } catch (error) {
    return "";
  }
}

function getMunicipalityFromRow(row, regionKey) {
  if (row?.municipality) {
    return row.municipality;
  }

  if (STATION_GROUP_REGIONS.has(regionKey)) {
    const stationLabel = row?.stationGroup || normalizeStationGroupLabel(row?.station || "");
    if (stationLabel) {
      return stationLabel;
    }
  }

  const candidates = REGION_MUNICIPALITIES[regionKey] || [];
  const haystack = [row.location, row.notes].filter(Boolean).join(" ");

  for (const candidate of candidates) {
    if (haystack.includes(candidate)) {
      return candidate;
    }
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  return "その他";
}

function normalizeStationGroupLabel(value) {
  return window.stationNormalizer?.normalizeStationGroupLabel(value) || String(value || "").trim();
}

function isStationAccessSuffix(value) {
  return Boolean(window.stationNormalizer?.isStationAccessSuffix(value));
}

function getStationAccessLabel(value) {
  const text = String(value || "")
    .replace(/[／/]/g, "・")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.includes("・")) return "";

  const match = text.match(/^(.+?駅)(.+)$/u);
  if (!match) return "";

  const suffix = match[2].trim();
  return isStationAccessSuffix(suffix) ? suffix : "";
}

function getPreferredExternalUrl(row) {
  if (!row) return "";
  return row.officialUrl || row.listingUrl || "";
}

function formatStationDisplay(row) {
  if (!row) return "";
  return row.stationGroup || row.station || "";
}

function getDomainGroupFromUrl(url) {
  if (!url) return "";

  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length <= 2) return host;

    const tail2 = parts.slice(-2).join(".");
    const jpSecondLevelSet = new Set([
      "co.jp",
      "ne.jp",
      "or.jp",
      "ac.jp",
      "ad.jp",
      "ed.jp",
      "go.jp",
      "gr.jp",
      "lg.jp",
    ]);

    if (jpSecondLevelSet.has(tail2) && parts.length >= 3) {
      return parts.slice(-3).join(".");
    }

    return tail2;
  } catch (error) {
    return "";
  }
}

function renderSummary() {
  const uniqueStoreNames = new Set(state.filteredRows.map((row) => row.name));
  const allDayStores = state.filteredRows.filter((row) => row.hours.includes("24時間")).length;
  const mappableStores = state.filteredRows.filter((row) => Boolean(row.latLng || row.locationQuery)).length;

  if (visibleCount) visibleCount.textContent = String(state.filteredRows.length);
  if (uniqueCount) uniqueCount.textContent = String(uniqueStoreNames.size);
  if (mapReadyCount) mapReadyCount.textContent = String(mappableStores);
  if (allDayCount) allDayCount.textContent = String(allDayStores);
  if (statusText) statusText.textContent = `${state.filteredRows.length}件を表示中`;
}

function renderMapList() {
  if (!mapList || !mapListCount) return;
  mapListCount.textContent = `${state.filteredRows.length}件`;

  if (!state.filteredRows.length) {
    mapList.innerHTML = `<div class="empty-state compact">表示できる店舗がありません。</div>`;
    return;
  }

  mapList.innerHTML = state.filteredRows
    .map(
      (row) => `
        <button class="map-list-item${state.selectedRow?.id === row.id ? " is-active" : ""}" type="button" data-focus-id="${row.id}">
          <span class="map-list-title">${escapeHtml(row.name)}</span>
          <span class="map-list-meta">${escapeHtml(formatStationDisplay(row) || row.location || "-")}</span>
        </button>
      `
    )
    .join("");
}

function renderCards() {
  if (!cardsView) return;
  if (!state.filteredRows.length) {
    cardsView.innerHTML = `<div class="empty-state">条件に合う店舗がありません。</div>`;
    return;
  }

  cardsView.innerHTML = state.filteredRows
    .map(
      (row) => `
        <article class="store-card">
          <div class="store-head">
            <div>
              <h2 class="store-title">${escapeHtml(row.name)}</h2>
              <p class="store-station">${escapeHtml(formatStationDisplay(row))}</p>
            </div>
            <div class="store-badges">
              ${row.hasCoordinates ? `<span class="badge">座標あり</span>` : `<span class="badge subtle">駅名/住所検索</span>`}
              ${row.hours.includes("24時間") ? `<span class="badge">24時間</span>` : ""}
            </div>
          </div>

          <div class="store-grid">
            <div class="field">
              <span class="field-label">営業時間</span>
              <span class="field-value">${escapeHtml(row.hours || "-")}</span>
            </div>
            <div class="field">
              <span class="field-label">電話番号</span>
              <span class="field-value">${row.phone ? `<a href="tel:${row.phone}">${escapeHtml(row.phone)}</a>` : "-"}</span>
            </div>
            <div class="field">
              <span class="field-label">位置情報</span>
              <span class="field-value">${escapeHtml(row.location || "-")}</span>
            </div>
            <div class="field">
              <span class="field-label">備考</span>
              <span class="field-value">${escapeHtml(row.notes || "-")}</span>
            </div>
            <div class="field">
              <span class="field-label">レビュー</span>
              <span class="field-value">${renderReviewSummaryText(row)}</span>
            </div>
          </div>

          <div class="store-actions">
            <button class="focus-button" type="button" data-focus-id="${row.id}">地図で見る</button>
            <a class="action-link primary" href="${row.mapUrl}" target="_blank" rel="noreferrer">Googleマップで開く</a>
            ${getPreferredExternalUrl(row) ? `<a class="action-link" href="${getPreferredExternalUrl(row)}" target="_blank" rel="noreferrer">オフィシャルHP</a>` : ""}
          </div>
        </article>
      `
    )
    .join("");
}

function renderTable() {
  if (!tableBody) return;
  if (!state.filteredRows.length) {
    tableBody.innerHTML = `<tr><td colspan="6">条件に合う店舗がありません。</td></tr>`;
    return;
  }

  tableBody.innerHTML = state.filteredRows
    .map(
      (row) => `
        <tr>
          <td>
            <div>${escapeHtml(row.name)}</div>
            <button class="focus-button" type="button" data-focus-id="${row.id}">地図で見る</button>
          </td>
          <td>${escapeHtml(formatStationDisplay(row))}</td>
          <td>${escapeHtml(row.hours || "-")}</td>
          <td>${row.phone ? `<a href="tel:${row.phone}">${escapeHtml(row.phone)}</a>` : "-"}</td>
          <td><a href="${row.mapUrl}" target="_blank" rel="noreferrer">${escapeHtml(row.location || "地図で開く")}</a></td>
          <td>${getPreferredExternalUrl(row) ? `<a href="${getPreferredExternalUrl(row)}" target="_blank" rel="noreferrer">オフィシャルHP</a>` : "-"}</td>
        </tr>
      `
    )
    .join("");
}

function renderSelectedStore() {
  if (!state.selectedRow) {
    selectedStoreName.textContent = "店舗を選択してください";
    selectedStoreMeta.textContent = "";
    if (selectedStoreProfileMeta) selectedStoreProfileMeta.textContent = "";
    selectedReviewSummary.textContent = "レビューはまだありません。";
    renderFavoriteToggle(null);
    renderExcludeToggle(null);
    setStreetViewState({
      mode: "empty",
      status: "店舗を選ぶと周辺ビューを表示できます。",
      emptyMessage: "店舗を選ぶと周辺ビューを表示できます。",
    });
    disableLink(selectedPhoneLink);
    disableLink(selectedPhoneSearchLink);
    disableLink(selectedMapLink);
    disableLink(selectedListingLink);
    clearStoreProfileInputs();
    setStoreProfileEditing(false, false);
    setReviewEditing(false, false);
    renderEditingAccess();
    reviewSubmitButton.disabled = true;
    reviewList.innerHTML = `<div class="empty-state compact">店舗を選ぶとレビューを表示できます。</div>`;
    return;
  }

  selectedStoreName.innerHTML = renderDisplayStoreNameHtml(state.selectedRow);
  const addedDayKey = findAddedDayKey(state.selectedRow);
  selectedStoreMeta.innerHTML = addedDayKey ? `追加日: ${escapeHtml(formatHistoryDate(addedDayKey))}` : "";
  selectedReviewSummary.textContent = renderReviewSummaryText(state.selectedRow);
  renderFavoriteToggle(state.selectedRow);
  renderExcludeToggle(state.selectedRow);
  reviewSubmitButton.disabled = false;
  setReviewEditing(false, true);

  if (state.selectedRow.phone) {
    selectedPhoneLink.href = `tel:${state.selectedRow.phone}`;
    selectedPhoneLink.classList.remove("disabled-link");
    selectedPhoneSearchLink.href = `https://www.google.com/search?q=${encodeURIComponent(state.selectedRow.phone)}`;
    selectedPhoneSearchLink.classList.remove("disabled-link");
  } else {
    disableLink(selectedPhoneLink);
    disableLink(selectedPhoneSearchLink);
  }

  selectedMapLink.href = state.selectedRow.mapUrl;
  selectedMapLink.classList.remove("disabled-link");

  const preferredExternalUrl = getPreferredExternalUrl(state.selectedRow);
  if (preferredExternalUrl) {
    selectedListingLink.href = preferredExternalUrl;
    selectedListingLink.classList.remove("disabled-link");
  } else {
    disableLink(selectedListingLink);
  }

  renderStoreProfileInputs(state.selectedRow);
  renderStoreProfileSummary(state.selectedRow);
  renderReviewList();
  renderStreetViewForRow(state.selectedRow);
  renderEditingAccess();
}

function focusRow(row) {
  state.selectedRow = row;
  renderSelectedStore();
  focusMarker(row);
}

function clearSelectedRow() {
  state.selectedRow = null;
  state.infoWindow?.close();
  state.profileInfoWindow?.close();
  renderSelectedStore();
  renderMapList();
}

function toggleMarkerSelection(row, map, infoWindow, marker) {
  if (!row) return;

  if (state.selectedRow?.id === row.id) {
    clearSelectedRow();
    return;
  }

  focusRow(row);
  if (map && infoWindow && marker) {
    openMarkerInfoWindow(map, infoWindow, marker, row);
  }
}

function isFavoriteRow(row) {
  return Boolean(row?.reviewKey && state.favoritesByStore[row.reviewKey]);
}

function isExcludedRow(row) {
  return Boolean(row?.reviewKey && state.excludedByStore[row.reviewKey]);
}

function renderFavoriteToggle(row) {
  if (!favoriteToggleButton) return;
  const active = isFavoriteRow(row);
  favoriteToggleButton.disabled = !row || !canCurrentUserEdit();
  favoriteToggleButton.textContent = active ? "♥" : "♡";
  favoriteToggleButton.classList.toggle("is-active", active);
  favoriteToggleButton.setAttribute("aria-pressed", active ? "true" : "false");
  favoriteToggleButton.setAttribute("title", active ? "確認済み解除" : "確認済み");
  favoriteToggleButton.setAttribute("aria-label", active ? "確認済み解除" : "確認済み");
}

function handleFavoriteToggle() {
  if (!canCurrentUserEdit()) return;
  const row = state.selectedRow;
  if (!row?.reviewKey) return;
  const key = row.reviewKey;

  if (state.favoritesByStore[key]) {
    delete state.favoritesByStore[key];
  } else {
    state.favoritesByStore[key] = {
      storeName: row.name,
      storeStation: row.station,
      listingUrl: row.listingUrl,
      updatedAt: new Date().toISOString(),
    };
  }

  writeFavorites();
  renderFavoriteToggle(row);
  refreshRowMarkerIcons(row);
  refreshOpenInfoWindows(row);
  renderUpdateHistory();
}

function renderExcludeToggle(row) {
  if (!excludeToggleButton) return;
  const active = isExcludedRow(row);
  excludeToggleButton.disabled = !row || !canCurrentUserEdit();
  excludeToggleButton.textContent = active ? "♥" : "♡";
  excludeToggleButton.classList.toggle("is-excluded", active);
  excludeToggleButton.setAttribute("aria-pressed", active ? "true" : "false");
  excludeToggleButton.setAttribute("title", active ? "除外解除" : "除外");
  excludeToggleButton.setAttribute("aria-label", active ? "除外解除" : "除外");
}

function handleExcludeToggle() {
  if (!canCurrentUserEdit()) return;
  const row = state.selectedRow;
  if (!row?.reviewKey) return;
  const key = row.reviewKey;

  if (state.excludedByStore[key]) {
    delete state.excludedByStore[key];
  } else {
    state.excludedByStore[key] = {
      storeName: row.name,
      storeStation: row.station,
      listingUrl: row.listingUrl,
      updatedAt: new Date().toISOString(),
    };
  }

  writeExcluded();
  renderExcludeToggle(row);
  refreshRowMarkerIcons(row);
  refreshOpenInfoWindows(row);
  renderUpdateHistory();
}

function refreshRowMarkerIcons(row) {
  if (!row) return;

  const marker = state.markers.get(row.id);
  if (marker) {
    marker.setIcon(buildMarkerIcon(row));
  }

  const profileMarker = state.profileMarkers.get(row.id);
  if (profileMarker) {
    profileMarker.setIcon(buildProfileMarkerIcon(row));
  }
}

function refreshOpenInfoWindows(row) {
  if (!row || !row.latLng) return;

  const marker = state.markers.get(row.id);
  if (marker && state.infoWindow) {
    openMarkerInfoWindow(state.map, state.infoWindow, marker, row);
  }

  const profileMarker = state.profileMarkers.get(row.id);
  if (profileMarker && state.profileInfoWindow) {
    openMarkerInfoWindow(state.profileMap, state.profileInfoWindow, profileMarker, row);
  }
}

function normalizeRow(row, index) {
  const name = row["店舗名"] || "";
  const listingUrl = row["掲載URL"] || "";
  const station = MANUAL_STATION_OVERRIDES[listingUrl] || row["最寄駅"] || "";
  const stationGroup = normalizeStationGroupLabel(station);
  const stationAccess = getStationAccessLabel(station);
  const location = row["住所または座標"] || "";
  const latitude = row["緯度"] || "";
  const longitude = row["経度"] || "";
  const officialUrl = row["オフィシャルHP"] || row["公式HP"] || window.storeMeta?.officialUrlByListingUrl?.[listingUrl] || "";
  const notes = row["備考"] || "";
  const phone = row["電話番号"] || row["電話"] || "";
  const hours = row["営業時間"] || row["営業"] || "";
  const municipality = window.storeMeta?.municipalityByListingUrl?.[listingUrl] || "";
  const municipalityLabels = window.storeMeta?.municipalityLabelsByListingUrl?.[listingUrl] || [];
  const hasCoordinates = Boolean(latitude && longitude);
  const useCoordinates = hasCoordinates && !hasUsableAddressLocation(location);
  const manualLatLng = normalizeLatLng(MANUAL_LOCATION_OVERRIDES[listingUrl]);
  const baseLatLng = manualLatLng || (useCoordinates ? { lat: Number(latitude), lng: Number(longitude) } : null);
  const baseLocationQuery = baseLatLng ? `${baseLatLng.lat},${baseLatLng.lng}` : buildLocationQuery(name, station, location, notes);

  const normalizedRow = {
    id: `${name}-${station}-${index}`,
    reviewKey: listingUrl || `${name}__${station || location || index}`,
    name,
    station,
    stationGroup,
    stationAccess,
    location,
    latitude,
    longitude,
    listingUrl,
    officialUrl,
    notes,
    phone,
    hours,
    municipality,
    municipalityLabels,
    hasCoordinates,
    baseLatLng,
    latLng: baseLatLng,
    baseLocationQuery,
    locationQuery: baseLocationQuery,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(baseLocationQuery)}`,
  };

  applyProfileLocationToRow(normalizedRow);
  return normalizedRow;
}

function readLocalObject(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeLocalObject(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`save failed: ${key}`, error);
  }
}

function getLocalStorageKey(name) {
  return `${LOCAL_STORAGE_PREFIX}-${LOCAL_STORAGE_SUFFIXES[name] || name}`;
}

function getLegacyLocalStorageKey(name) {
  if (!LEGACY_LOCAL_STORAGE_PREFIX) return "";
  return LEGACY_LOCAL_STORAGE_KEYS[name] || `${LEGACY_LOCAL_STORAGE_PREFIX}-${name}`;
}

function readRegionalLocalObject(name) {
  const key = getLocalStorageKey(name);
  const value = readLocalObject(key);
  if (value && typeof value === "object" && Object.keys(value).length) {
    return value;
  }

  const legacyKey = getLegacyLocalStorageKey(name);
  if (!legacyKey) return {};

  const legacyValue = readLocalObject(legacyKey);
  if (legacyValue && typeof legacyValue === "object" && Object.keys(legacyValue).length) {
    writeLocalObject(key, legacyValue);
  }
  return legacyValue;
}

function writeRegionalLocalObject(name, value) {
  writeLocalObject(getLocalStorageKey(name), value);
}

function readBackupMeta() {
  return readRegionalLocalObject("backupMeta");
}

function getSyncUserLabel(user = state.sharedSync.user) {
  if (!user) return "";
  return user.displayName || user.email || "Google";
}

function getConfiguredEditorEmails() {
  const values = Array.isArray(window.firebaseAppConfig?.editorEmails) ? window.firebaseAppConfig.editorEmails : [];
  return values.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
}

function getConfiguredEditorUids() {
  const values = Array.isArray(window.firebaseAppConfig?.editorUids) ? window.firebaseAppConfig.editorUids : [];
  return values.map((value) => String(value || "").trim()).filter(Boolean);
}

function canCurrentUserEdit() {
  if (!state.sharedSync.enabled) return true;
  if (!state.sharedSync.user) return false;

  const emailRules = getConfiguredEditorEmails();
  const uidRules = getConfiguredEditorUids();
  if (!emailRules.length && !uidRules.length) return true;

  const email = String(state.sharedSync.user.email || "").trim().toLowerCase();
  const uid = String(state.sharedSync.user.uid || "").trim();
  return emailRules.includes(email) || uidRules.includes(uid);
}

function formatSharedTimestamp(value) {
  let date = null;
  if (!value) return "";
  if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else {
    date = new Date(value);
  }
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getLatestSharedMeta() {
  const metas = Object.values(state.sharedSync.documentsMeta || {}).filter(Boolean);
  if (!metas.length) return null;

  return metas.reduce((latest, current) => {
    const latestTime = latest?.updatedAt && typeof latest.updatedAt?.toDate === "function"
      ? latest.updatedAt.toDate().getTime()
      : new Date(latest?.updatedAt || 0).getTime();
    const currentTime = current?.updatedAt && typeof current.updatedAt?.toDate === "function"
      ? current.updatedAt.toDate().getTime()
      : new Date(current?.updatedAt || 0).getTime();
    return currentTime > latestTime ? current : latest;
  }, null);
}

function renderSyncMeta() {
  if (!syncMetaText) return;

  const latest = getLatestSharedMeta();
  const sharedText = latest
    ? `最後の共有更新: ${latest.updatedByName || latest.updatedByEmail || "不明"} / ${formatSharedTimestamp(latest.updatedAt) || "時刻不明"}`
    : (state.sharedSync.enabled ? "まだ共有更新はありません。" : "共有設定後に、更新した人と時刻をここに表示します。");

  const backupText = state.sharedSync.lastBackupAt
    ? `バックアップ: ${formatSharedTimestamp(state.sharedSync.lastBackupAt)}`
    : "バックアップ: まだありません";
  const legacyWarningText = state.sharedSync.legacyWriteFailedAt
    ? `旧データ保存警告: ${state.sharedSync.legacyWriteFailedDocId || "不明"} / ${formatSharedTimestamp(state.sharedSync.legacyWriteFailedAt)}`
    : "";

  syncMetaText.textContent = [sharedText, backupText, legacyWarningText].filter(Boolean).join(" / ");
}

function renderEditingAccess() {
  const canEdit = canCurrentUserEdit();
  const sharedEnabled = state.sharedSync.enabled;
  const loggedIn = Boolean(state.sharedSync.user);

  if (reviewStorageNote) {
    if (!sharedEnabled) {
      reviewStorageNote.textContent = "このブラウザ内に保存";
    } else if (!loggedIn) {
      reviewStorageNote.textContent = "ログインすると共有・編集できます";
    } else if (canEdit) {
      reviewStorageNote.textContent = "Google共有で保存";
    } else {
      reviewStorageNote.textContent = "共有中 / 閲覧のみ";
    }
  }

  if (editAccessText) {
    editAccessText.textContent = "";
    editAccessText.classList.remove("is-readonly");
  }
}

function buildBackupSnapshot() {
  return {
    savedAt: new Date().toISOString(),
    savedBy: getSyncUserLabel() || "local",
    rowsUpdatedAt: window.storeMeta?.lastUpdatedAt || "",
    reviewsByStore: clonePlainObject(state.reviewsByStore),
    storeProfilesByKey: clonePlainObject(state.storeProfilesByKey),
    favoritesByStore: clonePlainObject(state.favoritesByStore),
    excludedByStore: clonePlainObject(state.excludedByStore),
  };
}

function persistSafetyBackup(reason = "auto") {
  const snapshot = buildBackupSnapshot();
  writeRegionalLocalObject("safetyBackup", snapshot);
  writeRegionalLocalObject("backupMeta", {
    savedAt: snapshot.savedAt,
    savedBy: snapshot.savedBy,
    reason,
  });
  state.sharedSync.lastBackupAt = snapshot.savedAt;
  renderSyncMeta();
  return snapshot;
}

function handleBackupExport() {
  const snapshot = persistSafetyBackup("manual");
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `esthe-backup-${snapshot.savedAt.replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function clonePlainObject(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function initSharedSync() {
  const config = window.firebaseAppConfig || {};
  const firebaseAvailable = typeof window.firebase !== "undefined";
  const hasRequiredConfig = Boolean(config.enabled && config.apiKey && config.authDomain && config.projectId && config.appId);

  if (!hasRequiredConfig || !firebaseAvailable) {
    state.sharedSync.statusMode = config.enabled ? "unavailable" : "local";
    state.sharedSync.errorMessage = !config.enabled
      ? ""
      : (!firebaseAvailable ? "Firebaseの読み込み待ちです" : "Firebase設定が不足しています");
    renderSyncStatus();
    return;
  }

  try {
    const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });

    state.sharedSync.enabled = true;
    state.sharedSync.auth = app.auth();
    state.sharedSync.db = app.firestore();
    state.sharedSync.authReady = true;
    state.sharedSync.statusMode = "ready";
    state.sharedSync.errorMessage = "";

    state.sharedSync.auth.onAuthStateChanged((user) => {
      state.sharedSync.user = user || null;
      resetSharedListeners();
      renderSyncStatus();
      renderEditingAccess();
      renderSelectedStore();
      if (user) {
        startSharedListeners();
      }
    });
  } catch (error) {
    console.error(error);
    state.sharedSync.statusMode = "error";
    state.sharedSync.errorMessage = error?.message || "Firebase初期化に失敗しました";
  }

  renderSyncStatus();
  renderEditingAccess();
  renderSyncMeta();
}

function renderSyncStatus() {
  if (!syncStatusText || !syncAuthButton) return;

  if (!state.sharedSync.enabled) {
    if (state.sharedSync.statusMode === "unavailable") {
      syncStatusText.textContent = state.sharedSync.errorMessage || "Firebaseの準備待ちです";
      syncAuthButton.textContent = "再読み込み後に共有";
      syncAuthButton.disabled = true;
      return;
    }

    if (state.sharedSync.statusMode === "error") {
      syncStatusText.textContent = "共有の準備で止まっています";
      syncAuthButton.textContent = "設定を確認";
      syncAuthButton.disabled = true;
      return;
    }

    syncStatusText.textContent = "この端末内に保存";
    syncAuthButton.textContent = "共有を設定";
    syncAuthButton.disabled = true;
    return;
  }

  if (state.sharedSync.user) {
    const label = state.sharedSync.user.displayName || state.sharedSync.user.email || "Google";
    syncStatusText.textContent = `${label} と共有中`;
    syncAuthButton.textContent = "ログアウト";
    syncAuthButton.disabled = false;
    renderSyncMeta();
    return;
  }

  syncStatusText.textContent = "Googleで共有できます";
  syncAuthButton.textContent = state.sharedSync.signingIn ? "接続中..." : "Googleでログイン";
  syncAuthButton.disabled = state.sharedSync.signingIn;
  renderSyncMeta();
}

async function handleSyncAuthClick() {
  if (!state.sharedSync.enabled || !state.sharedSync.auth) return;

  if (state.sharedSync.user) {
    await state.sharedSync.auth.signOut();
    return;
  }

  state.sharedSync.signingIn = true;
  renderSyncStatus();

  try {
    const provider = new window.firebase.auth.GoogleAuthProvider();
    await state.sharedSync.auth.signInWithPopup(provider);
  } catch (error) {
    console.error(error);
  } finally {
    state.sharedSync.signingIn = false;
    renderSyncStatus();
  }
}

function resetSharedListeners() {
  for (const unsubscribe of state.sharedSync.unsubscribers) {
    try {
      unsubscribe();
    } catch (error) {
      console.warn(error);
    }
  }
  state.sharedSync.unsubscribers = [];
}

function startSharedListeners() {
  if (!state.sharedSync.db) return;

  attachSharedDocument("reviews", state.reviewsByStore, (payload) => {
    state.reviewsByStore = payload;
    writeRegionalLocalObject("reviews", state.reviewsByStore);
    renderSelectedStore();
    renderReviewAnalytics();
  });

  attachSharedDocument("storeProfiles", state.storeProfilesByKey, (payload) => {
    state.storeProfilesByKey = payload;
    writeRegionalLocalObject("storeProfiles", state.storeProfilesByKey);
    state.rows.forEach(applyProfileLocationToRow);
    primeArchivedProfileDetails();
    renderLocationAudit();
    renderSelectedStore();
    renderUpdateHistory();
    syncMapWithFilters();
    syncProfileMap();
  });

  attachSharedDocument("favorites", state.favoritesByStore, (payload) => {
    state.favoritesByStore = payload;
    writeRegionalLocalObject("favorites", state.favoritesByStore);
    renderSelectedStore();
    renderUpdateHistory();
    syncMapWithFilters();
    syncProfileMap();
  });

  attachSharedDocument("excluded", state.excludedByStore, (payload) => {
    state.excludedByStore = payload;
    writeRegionalLocalObject("excluded", state.excludedByStore);
    renderSelectedStore();
    renderUpdateHistory();
    syncMapWithFilters();
    syncProfileMap();
  });
}

function attachSharedDocument(docId, localData, applyRemote) {
  const docRef = getSharedDocumentRef(docId);
  const unsubscribe = docRef.onSnapshot(async (snapshot) => {
    if (!snapshot.exists) {
      const seed = clonePlainObject(localData);
      if (Object.keys(seed).length) {
        try {
          await writeSharedDocumentRefs(docId, seed);
        } catch (error) {
          console.error("shared document seed failed", docId, error);
        }
      }
      return;
    }

    const snapshotData = snapshot.data() || {};
    state.sharedSync.documentsMeta[docId] = {
      updatedAt: snapshotData.updatedAt || null,
      updatedByName: snapshotData.updatedByName || "",
      updatedByEmail: snapshotData.updatedByEmail || "",
    };
    renderSyncMeta();
    const payload = snapshotData.payload;
    applyRemote(payload && typeof payload === "object" ? payload : {});
    persistSafetyBackup("shared-sync");
  });

  state.sharedSync.unsubscribers.push(unsubscribe);
}

function saveSharedDocument(docId, data) {
  if (!state.sharedSync.enabled || !state.sharedSync.user || !state.sharedSync.db) return;
  writeSharedDocumentRefs(docId, data).catch((error) => {
    console.error("shared document save failed", docId, error);
  });
}

function getSharedDocumentRef(docId) {
  return getRegionalSharedDocumentRef(docId);
}

function getLegacySharedDocumentRef(docId) {
  return state.sharedSync.db.collection("sharedState").doc(docId);
}

function getRegionalSharedDocumentRef(docId) {
  return state.sharedSync.db.collection("regions").doc(CURRENT_REGION_ID).collection("sharedState").doc(docId);
}

async function writeSharedDocumentRefs(docId, data) {
  const payload = {
    payload: clonePlainObject(data),
    updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: state.sharedSync.user?.uid || "",
    updatedByName: getSyncUserLabel(),
    updatedByEmail: state.sharedSync.user?.email || "",
  };

  await getSharedDocumentRef(docId).set(payload);

  try {
    await getLegacySharedDocumentRef(docId).set(payload);
    clearLegacyWriteFailure();
  } catch (error) {
    markLegacyWriteFailure(docId, error);
    console.warn("legacy shared document save failed", docId, error);
  }
}

function markLegacyWriteFailure(docId, error) {
  state.sharedSync.legacyWriteFailedAt = new Date().toISOString();
  state.sharedSync.legacyWriteFailedDocId = docId;
  state.sharedSync.legacyWriteErrorMessage = error?.message || String(error || "");
  renderSyncMeta();
}

function clearLegacyWriteFailure() {
  if (!state.sharedSync.legacyWriteFailedAt) return;
  state.sharedSync.legacyWriteFailedAt = "";
  state.sharedSync.legacyWriteFailedDocId = "";
  state.sharedSync.legacyWriteErrorMessage = "";
  renderSyncMeta();
}

function readReviews() {
  return readRegionalLocalObject("reviews");
}

function writeReviews() {
  writeRegionalLocalObject("reviews", state.reviewsByStore);
  saveSharedDocument("reviews", state.reviewsByStore);
  persistSafetyBackup("reviews");
}

function readStoreProfiles() {
  return readRegionalLocalObject("storeProfiles");
}

function writeStoreProfiles() {
  writeRegionalLocalObject("storeProfiles", state.storeProfilesByKey);
  saveSharedDocument("storeProfiles", state.storeProfilesByKey);
  persistSafetyBackup("storeProfiles");
}

function readFavorites() {
  return readRegionalLocalObject("favorites");
}

function writeFavorites() {
  writeRegionalLocalObject("favorites", state.favoritesByStore);
  saveSharedDocument("favorites", state.favoritesByStore);
  persistSafetyBackup("favorites");
}

function readExcluded() {
  return readRegionalLocalObject("excluded");
}

function writeExcluded() {
  writeRegionalLocalObject("excluded", state.excludedByStore);
  saveSharedDocument("excluded", state.excludedByStore);
  persistSafetyBackup("excluded");
}

function getStoreProfile(row) {
  if (!row) return null;
  const profileKey = getStoreProfileStorageKey(row);
  if (row.isRoomVariant) {
    return state.storeProfilesByKey[profileKey] || null;
  }
  const baseKey = getBaseStoreProfileKey(row);
  return state.storeProfilesByKey[profileKey] || state.storeProfilesByKey[baseKey] || null;
}

function getInheritedStoreProfile(row) {
  if (!row) return null;
  const directProfile = getStoreProfile(row);
  if (directProfile) return directProfile;
  if (!row.isRoomVariant) return null;
  const baseKey = getBaseStoreProfileKey(row);
  return state.storeProfilesByKey[baseKey] || null;
}

function getActiveRowByReviewKey(reviewKey) {
  return state.rows.find((row) => row.reviewKey === reviewKey) || null;
}

function getActiveRowByProfileKey(profileKey) {
  if (!profileKey) return null;
  return expandRowsForMap(state.rows).find((row) => getStoreProfileStorageKey(row) === profileKey) || null;
}

function buildLocalDetailHtmlPath(listingUrl) {
  if (!listingUrl) return "";
  const match = String(listingUrl).match(/shop-detail\/([^/]+)\//);
  if (!match) return "";
  return `./esthe_ranking_detail_pages/${match[1]}.html`;
}

function extractArchivedDetailSnapshot(htmlText) {
  if (!htmlText) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");
  const phoneText = (
    doc.querySelector(".coupon_phone")?.textContent ||
    doc.querySelector(".phone-detail-side")?.textContent ||
    doc.querySelector(".phone-detail")?.textContent ||
    ""
  ).trim();
  const hoursText = Array.from(doc.querySelectorAll("table td"))
    .find((cell) => (cell.textContent || "").trim() === "営業時間")
    ?.nextElementSibling?.textContent?.trim() || "";
  const officialUrl = doc.querySelector('a[href][rel*="nofollow"][target="_blank"]')?.getAttribute("href") || "";

  return {
    phone: phoneText,
    hours: hoursText,
    officialUrl,
  };
}

async function ensureArchivedProfileDetails(reviewKey, profile) {
  if (!reviewKey || !profile?.listingUrl) return;
  if (state.archivedDetailCache[reviewKey] || state.archivedDetailLoading[reviewKey]) return;
  if (getActiveRowByReviewKey(reviewKey)) return;

  const detailPath = buildLocalDetailHtmlPath(profile.listingUrl);
  if (!detailPath) return;

  state.archivedDetailLoading[reviewKey] = true;
  try {
    const response = await fetch(detailPath, { cache: "no-store" });
    if (!response.ok) return;
    const htmlText = await response.text();
    const snapshot = extractArchivedDetailSnapshot(htmlText);
    if (!snapshot) return;

    state.archivedDetailCache[reviewKey] = snapshot;
    const existingProfile = state.storeProfilesByKey[reviewKey];
    if (!existingProfile) return;

    const nextProfile = {
      ...existingProfile,
      phone: existingProfile.phone || snapshot.phone || "",
      hours: existingProfile.hours || snapshot.hours || "",
      officialUrl: existingProfile.officialUrl || snapshot.officialUrl || "",
    };

    if (
      nextProfile.phone !== existingProfile.phone ||
      nextProfile.hours !== existingProfile.hours ||
      nextProfile.officialUrl !== existingProfile.officialUrl
    ) {
      state.storeProfilesByKey[reviewKey] = nextProfile;
      writeStoreProfiles();
    }

    if (state.selectedRow?.reviewKey === reviewKey) {
      renderSelectedStore();
    }
    syncMapWithFilters();
    syncProfileMap();
  } catch (error) {
    console.warn(error);
  } finally {
    delete state.archivedDetailLoading[reviewKey];
  }
}

function primeArchivedProfileDetails() {
  for (const [reviewKey, profile] of Object.entries(state.storeProfilesByKey || {})) {
    ensureArchivedProfileDetails(reviewKey, profile);
  }
}

function buildArchivedProfileRow(reviewKey, profile) {
  const baseReviewKey = profile.baseReviewKey || profile.listingUrl || reviewKey;
  const latestReview = getReviewsForKey(baseReviewKey)[0] || null;
  const listingUrl = profile.listingUrl || latestReview?.listingUrl || "";
  const cachedDetail = state.archivedDetailCache[reviewKey] || null;
  const officialUrl = profile.officialUrl || cachedDetail?.officialUrl || window.storeMeta?.officialUrlByListingUrl?.[listingUrl] || "";
  const name = profile.storeName || latestReview?.storeName || "掲載終了した店舗";
  const station = profile.storeStation || latestReview?.storeStation || "";
  const stationGroup = normalizeStationGroupLabel(station);
  const stationAccess = getStationAccessLabel(station);
  const closedDayKey = profile.closedDayKey || findClosedDayKey(name, station);
  const fallbackLocation = latestReview?.storeLocation || station || name;
  const baseLocationQuery = buildLocationQuery(name, station, profile.address || fallbackLocation, profile.note || "");

  const row = {
    id: `archived-profile-${reviewKey}`,
    reviewKey: baseReviewKey,
    profileKey: reviewKey,
    name,
    station,
    stationGroup,
    stationAccess,
    location: profile.address || fallbackLocation,
    latitude: "",
    longitude: "",
    listingUrl,
    officialUrl,
    notes: "",
    phone: profile.phone || cachedDetail?.phone || "",
    hours: profile.hours || cachedDetail?.hours || "",
    municipality: "",
    municipalityLabels: [],
    hasCoordinates: false,
    baseLatLng: null,
    latLng: null,
    baseLocationQuery,
    locationQuery: baseLocationQuery,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(baseLocationQuery)}`,
    isArchivedStore: true,
    closedDayKey,
  };

  applyProfileLocationToRow(row);
  return row;
}

function applyProfileLocationToRow(row) {
  if (!row) return;

  const profile = getStoreProfile(row);
  const profileAddress = normalizeAddressValue(profile?.address || "");

  if (profileAddress) {
    const profileQuery = buildLocationQuery(row.name, row.station, profileAddress, row.notes);
    row.locationQuery = profileQuery;
    row.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profileQuery)}`;
    row.latLng = state.geocodeCache[profileQuery] || null;
    return;
  }

  row.locationQuery = row.baseLocationQuery;
  row.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.baseLocationQuery)}`;
  row.latLng = row.baseLatLng || state.geocodeCache[row.baseLocationQuery] || null;
}

function renderStoreProfileInputs(row) {
  const profile = getInheritedStoreProfile(row) || {};
  if (storeAddressInput) storeAddressInput.value = profile.address || "";
  if (storeNoteInput) storeNoteInput.value = profile.note || "";
  if (storeSmsInput) storeSmsInput.value = profile.sms || "";
  if (storeMenuInput) storeMenuInput.value = profile.menu || "";
  if (storeDisclosureInput) storeDisclosureInput.value = profile.disclosure || "";
  if (storeGuideClarityInput) storeGuideClarityInput.value = profile.guideClarity || "";
  setStoreProfileEditing(false, true);
}

function clearStoreProfileInputs() {
  if (storeAddressInput) storeAddressInput.value = "";
  if (storeNoteInput) storeNoteInput.value = "";
  if (storeSmsInput) storeSmsInput.value = "";
  if (storeMenuInput) storeMenuInput.value = "";
  if (storeDisclosureInput) storeDisclosureInput.value = "";
  if (storeGuideClarityInput) storeGuideClarityInput.value = "";
}

function renderStoreProfileSummary(row) {
  if (!selectedStoreProfileMeta) return;
  const profile = getStoreProfile(row) || {};
  const parts = [
    profile.address ? `<span>${escapeHtml(profile.address)}</span>` : "",
    profile.note ? `<span>備考: ${escapeHtml(profile.note)}</span>` : "",
    profile.sms ? `<span>SMS: ${escapeHtml(profile.sms)}</span>` : "",
    profile.menu ? `<span>メニュー: ${escapeHtml(profile.menu)}</span>` : "",
    profile.disclosure ? `<span>明示: ${escapeHtml(profile.disclosure)}</span>` : "",
    profile.guideClarity ? `<span class="${profile.guideClarity === "あり" ? "profile-positive" : ""}">真心: ${escapeHtml(profile.guideClarity)}</span>`
      : "",
  ].filter(Boolean);
  selectedStoreProfileMeta.innerHTML = parts.join(" / ");
}

function hasStoreProfileContent(profile) {
  return Boolean(profile && (profile.address || profile.note || profile.sms || profile.menu || profile.disclosure || profile.guideClarity));
}

function setStoreProfileEditing(isEditing, hasRow = Boolean(state.selectedRow)) {
  const canEdit = canCurrentUserEdit();
  storeProfileToolbar?.classList.toggle("is-hidden", !hasRow);
  storeProfilePanel?.classList.toggle("is-hidden", !hasRow || !isEditing || !canEdit);
  storeProfileActions?.classList.toggle("is-hidden", !hasRow || !isEditing || !canEdit);

  [storeAddressInput, storeNoteInput, storeSmsInput, storeMenuInput, storeDisclosureInput, storeGuideClarityInput].forEach((element) => {
    if (!element) return;
    element.disabled = !hasRow || !isEditing || !canEdit;
  });

  if (storeProfileSaveButton) {
    storeProfileSaveButton.disabled = !hasRow || !isEditing || !canEdit;
  }

  if (storeProfileEditButton) {
    storeProfileEditButton.disabled = !hasRow || !canEdit;
    storeProfileEditButton.textContent = !canEdit ? "閲覧専用" : (isEditing ? "閉じる" : "店舗情報を編集");
    storeProfileEditButton.setAttribute("aria-expanded", hasRow && isEditing ? "true" : "false");
  }
}

function handleStoreProfileSave() {
  if (!state.selectedRow || !canCurrentUserEdit()) return;

  const profileKey = getStoreProfileStorageKey(state.selectedRow);

  const profile = {
    address: normalizeAddressValue(storeAddressInput?.value || ""),
    note: String(storeNoteInput?.value || "").trim(),
    sms: storeSmsInput?.value || "",
    menu: storeMenuInput?.value || "",
    disclosure: storeDisclosureInput?.value || "",
    guideClarity: storeGuideClarityInput?.value || "",
    storeName: state.selectedRow.name,
    storeStation: state.selectedRow.station,
    listingUrl: state.selectedRow.listingUrl,
    baseReviewKey: getBaseStoreProfileKey(state.selectedRow),
    phone: state.selectedRow.phone || "",
    hours: state.selectedRow.hours || "",
    officialUrl: state.selectedRow.officialUrl || "",
    updatedAt: new Date().toISOString(),
  };

  if (hasStoreProfileContent(profile)) {
    state.storeProfilesByKey[profileKey] = profile;
  } else {
    delete state.storeProfilesByKey[profileKey];
  }

  writeStoreProfiles();
  applyProfileLocationToRow(state.selectedRow);
  renderLocationAudit();
  renderStoreProfileSummary(state.selectedRow);
  renderSelectedStore();
  setStoreProfileEditing(false, true);
  renderUpdateHistory();
  syncMapWithFilters();
  syncProfileMap();

  if (state.selectedRow?.locationQuery && !state.selectedRow.latLng) {
    queueGeocode(state.selectedRow, true);
  }
}

function handleStoreProfileEdit() {
  if (!state.selectedRow || !canCurrentUserEdit()) return;
  const isCurrentlyEditing = !storeProfilePanel?.classList.contains("is-hidden");
  if (isCurrentlyEditing) {
    setStoreProfileEditing(false, true);
    return;
  }
  setStoreProfileEditing(true, true);
  storeAddressInput?.focus();
}

function setReviewEditing(isEditing, hasRow = Boolean(state.selectedRow)) {
  const canEdit = canCurrentUserEdit();
  reviewForm?.classList.toggle("is-hidden", !hasRow || !isEditing || !canEdit);
  if (reviewToggleButton) {
    reviewToggleButton.disabled = !hasRow || !canEdit;
    reviewToggleButton.textContent = !canEdit ? "閲覧専用" : "レビューを書く";
  }
}

function handleReviewToggle() {
  if (!state.selectedRow || !canCurrentUserEdit()) return;
  setReviewEditing(true, true);
  reviewVisitDateInput?.focus();
}

function normalizeAddressValue(value) {
  return String(value)
    .trim()
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[ー－―‐]/g, "-");
}

function getReviewsForRow(row) {
  if (!row) return [];
  return [...(state.reviewsByStore[row.reviewKey] || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getReviewsForKey(reviewKey) {
  if (!reviewKey) return [];
  return [...(state.reviewsByStore[reviewKey] || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function hasReviews(row) {
  return getReviewsForRow(row).length > 0;
}

function getLatestReview(row) {
  return getReviewsForRow(row)[0] || null;
}

function renderReviewSummaryText(row) {
  const reviews = getReviewsForRow(row);
  if (!reviews.length) {
    return "";
  }

  const average = reviews.reduce((sum, review) => sum + (review.overallRating || 0), 0) / reviews.length;
  return `${reviews.length}件 / 平均 ${average.toFixed(1)} / 5.0`;
}

function renderReviewList() {
  const row = state.selectedRow;
  if (!row) {
    reviewList.innerHTML = `<div class="empty-state compact">店舗を選ぶとレビューを表示できます。</div>`;
    return;
  }

  const reviews = getReviewsForRow(row);
  if (!reviews.length) {
    reviewList.innerHTML = `<div class="empty-state compact">まだレビューはありません。最初の1件を書けます。</div>`;
    return;
  }

  reviewList.innerHTML = reviews.map((review) => renderReviewItem(review, row.reviewKey)).join("");
}

function renderArchivedReviews() {
  if (!archivedReviewList) return;

  const activeKeys = new Set(state.rows.map((row) => row.reviewKey));
  const groups = Object.entries(state.reviewsByStore)
    .filter(([reviewKey, reviews]) => !activeKeys.has(reviewKey) && Array.isArray(reviews) && reviews.length)
    .map(([reviewKey, reviews]) => {
      const sorted = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const latest = sorted[0];
      return {
        reviewKey,
        reviews: sorted,
        latest,
        label: getArchivedStoreLabel(reviewKey, latest),
      };
    })
    .sort((a, b) => (b.latest?.createdAt || "").localeCompare(a.latest?.createdAt || ""));

  if (!groups.length) {
    archivedReviewList.innerHTML = `<div class="empty-state compact">掲載終了したレビューはまだありません。</div>`;
    return;
  }

  archivedReviewList.innerHTML = groups
    .map(
      (group) => `
        <section class="archived-review-group">
          <div class="archived-review-head">
            <strong class="archived-review-title">${escapeHtml(group.label)}</strong>
            <span class="archived-review-meta">掲載終了 / ${group.reviews.length}件</span>
          </div>
          <div class="review-list archived-review-items">
            ${group.reviews.map((review) => renderReviewItem(review, group.reviewKey)).join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function renderReviewItem(review, reviewKey) {
  return `
    <article class="review-item">
      <div class="review-item-head">
        <div>
          <strong class="review-author">${escapeHtml(getReviewAuthorLabel(review))}</strong>
          <div class="review-meta">${renderStars(review.overallRating || 0)} / ${escapeHtml(formatReviewDate(review.createdAt))}</div>
        </div>
        <button class="review-delete-button" type="button" data-review-id="${review.id}" data-review-key="${escapeHtml(reviewKey)}">削除</button>
      </div>
      <div class="review-detail-grid">
        ${renderReviewDetail("訪問日", formatVisitDate(review.visitDate))}
        ${renderReviewDetail("国", formatNationality(review.nationality))}
        ${renderReviewDetail("時間", formatDuration(review.duration))}
        ${renderReviewDetail("料金", formatPrice(review.price))}
        ${renderReviewDetail("シャワー", review.shower)}
        ${renderReviewDetail("マッサージ", review.massage)}
        ${renderReviewDetail("顔", formatScore(review.faceRating))}
        ${renderReviewDetail("体", formatScore(review.bodyRating))}
        ${renderReviewDetail("性格", formatScore(review.personalityRating))}
        ${renderReviewDetail("サービス", formatScore(review.serviceRating))}
        ${renderReviewDetail("総合", formatScore(review.overallRating))}
      </div>
      ${review.comment ? `<p class="review-comment">${escapeHtml(review.comment)}</p>` : ""}
    </article>
  `;
}

function handleReviewSubmit(event) {
  event.preventDefault();
  if (!state.selectedRow || !canCurrentUserEdit()) return;

  const author = reviewAuthorInput.value.trim();
  const comment = reviewCommentInput.value.trim();
  const visitDate = reviewVisitDateInput.value || "";
  const nationality = reviewNationalityInput.value.trim();
  const duration = reviewDurationInput.value ? Number(reviewDurationInput.value) : null;
  const price = reviewPriceInput.value ? Number(reviewPriceInput.value) : null;
  const shower = reviewShowerInput.value;
  const massage = reviewMassageInput.value;
  const faceRating = Number(reviewFaceRatingInput.value || 5);
  const bodyRating = Number(reviewBodyRatingInput.value || 5);
  const personalityRating = Number(reviewPersonalityRatingInput.value || 5);
  const serviceRating = Number(reviewServiceRatingInput.value || 5);
  const overallRating = Number(reviewOverallRatingInput.value || 5);

  const hasReviewContent =
    author ||
    nationality ||
    duration ||
    price ||
    shower ||
    massage ||
    comment ||
    faceRating !== 5 ||
    bodyRating !== 5 ||
    personalityRating !== 5 ||
    serviceRating !== 5 ||
    overallRating !== 5;

  if (!hasReviewContent) {
    reviewCommentInput.focus();
    return;
  }

  const review = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reviewKey: state.selectedRow.reviewKey,
    storeName: state.selectedRow.name,
    storeStation: state.selectedRow.station,
    storeLocation: state.selectedRow.location,
    listingUrl: state.selectedRow.listingUrl,
    visitDate,
    author,
    nationality,
    duration,
    price,
    shower,
    massage,
    faceRating,
    bodyRating,
    personalityRating,
    serviceRating,
    overallRating,
    comment,
    createdAt: new Date().toISOString(),
  };

  if (!state.reviewsByStore[state.selectedRow.reviewKey]) {
    state.reviewsByStore[state.selectedRow.reviewKey] = [];
  }
  state.reviewsByStore[state.selectedRow.reviewKey].push(review);
  writeReviews();

  reviewForm.reset();
  setDefaultReviewValues();
  setReviewEditing(false, true);
  renderReviewAnalytics();
  renderCards();
  renderSelectedStore();
  syncMapWithFilters();
}

function handleReviewDelete(event) {
  if (!canCurrentUserEdit()) return;
  const button = event.target.closest("[data-review-id]");
  if (!button) return;

  const reviewKey = button.dataset.reviewKey || state.selectedRow?.reviewKey;
  if (!reviewKey) return;

  const current = getReviewsForKey(reviewKey);
  state.reviewsByStore[reviewKey] = current.filter((review) => review.id !== button.dataset.reviewId);
  if (!state.reviewsByStore[reviewKey].length) {
    delete state.reviewsByStore[reviewKey];
  }
  writeReviews();
  renderReviewAnalytics();
  renderCards();
  renderSelectedStore();
  syncMapWithFilters();
}

function formatReviewDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatVisitDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDuration(value) {
  return value ? `${value}分` : "";
}

function formatScore(value) {
  return value ? `${value} / 5` : "";
}

function formatPrice(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${new Intl.NumberFormat("ja-JP").format(value)}円`
    : "";
}

function renderReviewDetail(label, value) {
  if (!value) return "";
  const renderedValue = label === "国" ? renderNationalityValue(value) : escapeHtml(value);
  return `
    <div class="review-detail-item">
      <span class="review-detail-label">${escapeHtml(label)}</span>
      <span class="review-detail-value">${renderedValue}</span>
    </div>
  `;
}

function getReviewAuthorLabel(review) {
  return review.author || "不明";
}

function renderStars(value) {
  const score = Number(value) || 0;
  return `${"★".repeat(score)}${"☆".repeat(Math.max(0, 5 - score))}`;
}

function formatNationality(value) {
  const normalized = (value || "").trim();
  if (!normalized) {
    return "不明";
  }

  const flag = getFlagEmoji(normalized);
  return flag ? `${flag} ${normalized}` : normalized;
}

function renderNationalityValue(value) {
  const normalized = (value || "").trim();
  if (!normalized || normalized === "不明") {
    return "不明";
  }

  const match = normalized.match(/^([\p{Regional_Indicator}]{2})\s*(.*)$/u);
  if (!match) {
    return escapeHtml(normalized);
  }

  const flag = match[1];
  const label = match[2] || "";
  return `<span class="emoji-flag" aria-hidden="true">${escapeHtml(flag)}</span>${label ? ` <span>${escapeHtml(label)}</span>` : ""}`;
}

function getFlagEmoji(value) {
  const key = value.trim().toLowerCase();
  const compactKey = key.replace(/\s+/g, "").replace(/人$/g, "");
  const flags = [
    { aliases: ["日本", "にほん", "jp", "japan", "japanese"], flag: "🇯🇵" },
    { aliases: ["タイ", "たい", "th", "thailand", "thai"], flag: "🇹🇭" },
    { aliases: ["中国", "ちゅうごく", "cn", "china", "chinese"], flag: "🇨🇳" },
    { aliases: ["韓国", "かんこく", "kr", "korea", "southkorea", "korean"], flag: "🇰🇷" },
    { aliases: ["台湾", "たいわん", "tw", "taiwan"], flag: "🇹🇼" },
    { aliases: ["ベトナム", "vn", "vietnam", "vietnamese"], flag: "🇻🇳" },
    { aliases: ["フィリピン", "ph", "philippines", "filipino"], flag: "🇵🇭" },
    { aliases: ["インドネシア", "id", "indonesia", "indonesian"], flag: "🇮🇩" },
    { aliases: ["マレーシア", "my", "malaysia", "malaysian"], flag: "🇲🇾" },
    { aliases: ["モンゴル", "mn", "mongolia", "mongolian"], flag: "🇲🇳" },
    { aliases: ["ネパール", "np", "nepal", "nepali"], flag: "🇳🇵" },
    { aliases: ["インド", "in", "india", "indian"], flag: "🇮🇳" },
    { aliases: ["スリランカ", "lk", "srilanka", "srilankan"], flag: "🇱🇰" },
    { aliases: ["ミャンマー", "mm", "myanmar", "burma", "burmese"], flag: "🇲🇲" },
    { aliases: ["カンボジア", "kh", "cambodia", "cambodian"], flag: "🇰🇭" },
    { aliases: ["ラオス", "la", "laos", "laotian"], flag: "🇱🇦" },
    { aliases: ["シンガポール", "sg", "singapore", "singaporean"], flag: "🇸🇬" },
  ];

  for (const item of flags) {
    if (item.aliases.some((alias) => compactKey === alias || compactKey.includes(alias))) {
      return item.flag;
    }
  }

  return "";
}

function setDefaultReviewValues() {
  reviewVisitDateInput.value = getTodayString();
  reviewFaceRatingInput.value = "5";
  reviewBodyRatingInput.value = "5";
  reviewPersonalityRatingInput.value = "5";
  reviewServiceRatingInput.value = "5";
  reviewOverallRatingInput.value = "5";
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderReviewAnalytics() {
  const reviews = Object.values(state.reviewsByStore).flat();
  reviewTotalCount.textContent = `${reviews.length}件`;
  renderArchivedReviews();

  if (!reviews.length) {
    monthlyRevenueChart.innerHTML = `<div class="empty-state compact">レビューが入るとここに月別料金合計が表示されます。</div>`;
    return;
  }

  const monthlyRevenueMap = new Map();
  const monthlyCountMap = new Map();
  for (const review of reviews) {
    const monthKey = getMonthKey(review.visitDate || review.createdAt);
    if (!monthKey) continue;
    monthlyRevenueMap.set(monthKey, (monthlyRevenueMap.get(monthKey) || 0) + (Number(review.price) || 0));
    monthlyCountMap.set(monthKey, (monthlyCountMap.get(monthKey) || 0) + 1);
  }

  const rows = [...new Set([...monthlyRevenueMap.keys(), ...monthlyCountMap.keys()])]
    .map((monthKey) => ({
      monthKey,
      total: monthlyRevenueMap.get(monthKey) || 0,
      count: monthlyCountMap.get(monthKey) || 0,
      label: formatMonthLabel(monthKey),
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey, "ja"));

  const maxTotal = Math.max(...rows.map((row) => row.total), 1);

  monthlyRevenueChart.innerHTML = rows
    .map((row) => {
      const width = Math.max(8, Math.round((row.total / maxTotal) * 100));
      return `
        <div class="revenue-row">
          <div class="revenue-row-head">
            <span class="revenue-month">${escapeHtml(row.label)}</span>
            <span class="revenue-count">${row.count}件</span>
            <span class="revenue-total">${escapeHtml(formatPrice(row.total))}</span>
          </div>
          <div class="revenue-bar-track">
            <div class="revenue-bar-fill" style="width: ${width}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function getMonthKey(value) {
  if (!value) return "";
  const source = String(value);
  if (/^\d{4}-\d{2}/.test(source)) {
    return source.slice(0, 7);
  }
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${Number(year)}年${Number(month)}月`;
}

function getArchivedStoreLabel(reviewKey, latestReview) {
  if (latestReview?.storeName) {
    return latestReview.storeStation ? `${latestReview.storeName} / ${latestReview.storeStation}` : latestReview.storeName;
  }

  if (reviewKey && !reviewKey.startsWith("http") && reviewKey.includes("__")) {
    const [name, place] = reviewKey.split("__");
    return place ? `${name} / ${place}` : name;
  }

  return "掲載終了した店舗";
}

function buildLocationQuery(name, station, location, notes) {
  const source = hasUsableAddressLocation(location) ? location : station || name;
  const scoped = REGION_GEOCODE_SUFFIX && !REGION_GEOCODE_SCOPE_PATTERN.test(`${source} ${notes}`) ? `${source} ${REGION_GEOCODE_SUFFIX}` : source;
  return scoped.trim();
}

function isCoordinateLocation(value) {
  return /^\s*[0-9]{2}\.[0-9]+\s*,\s*[0-9]{3}\.[0-9]+\s*$/.test(String(value || ""));
}

function hasUsableAddressLocation(value) {
  const location = String(value || "").trim();
  if (!location || isCoordinateLocation(location)) return false;
  return !REGION_INVALID_LOCATION_PATTERN.test(location);
}

function disableLink(link) {
  link.href = "#";
  link.classList.add("disabled-link");
}

function readGeocodeCache() {
  const cache = readRegionalLocalObject("geocodeCache");
  return Object.fromEntries(
    Object.entries(cache).filter(([, latLng]) => isLatLngWithinRegion(latLng))
  );
}

function normalizeLatLng(value) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function isLatLngWithinRegion(value) {
  const latLng = normalizeLatLng(value);
  if (!latLng) return false;
  if (!REGION_GEOCODE_BOUNDS) return true;
  return latLng.lat >= REGION_GEOCODE_BOUNDS.south
    && latLng.lat <= REGION_GEOCODE_BOUNDS.north
    && latLng.lng >= REGION_GEOCODE_BOUNDS.west
    && latLng.lng <= REGION_GEOCODE_BOUNDS.east;
}

function writeGeocodeCache() {
  try {
    writeRegionalLocalObject("geocodeCache", state.geocodeCache);
  } catch (error) {
    console.warn("geocode cache save failed", error);
  }
}

function ensureMapReady() {
  return state.mapReady && state.map && state.geocoder;
}

function ensureProfileMapReady() {
  return state.mapReady && state.profileMap && state.geocoder;
}

window.initGoogleMapApp = function initGoogleMapApp() {
  state.map = new google.maps.Map(document.getElementById("googleMapCanvas"), {
    center: REGION_MAP_CENTER,
    zoom: REGION_MAP_ZOOM,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });
  state.profileMap = new google.maps.Map(document.getElementById("profileGoogleMapCanvas"), {
    center: REGION_MAP_CENTER,
    zoom: REGION_PROFILE_MAP_ZOOM,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });
  state.infoWindow = new google.maps.InfoWindow({
    headerDisabled: true,
  });
  state.profileInfoWindow = new google.maps.InfoWindow({
    headerDisabled: true,
  });
  state.geocoder = new google.maps.Geocoder();
  state.streetViewService = new google.maps.StreetViewService();
  ensureStreetViewPanorama();
  state.mapReady = true;
  syncMapWithFilters();
  syncProfileMap();
  renderStreetViewForRow(state.selectedRow);
};

function syncMapWithFilters() {
  if (state.mapSyncQueued) return;
  state.mapSyncQueued = true;
  requestAnimationFrame(() => {
    state.mapSyncQueued = false;
    runSyncMapWithFilters();
  });
}

function runSyncMapWithFilters() {
  if (!ensureMapReady()) return;

  clearMarkers();
  const bounds = new google.maps.LatLngBounds();
  let placedCount = 0;
  let pendingCount = 0;
  const mapRows = expandRowsForMap(state.filteredRows);

  for (const row of mapRows) {
    const cached = row.latLng || state.geocodeCache[row.locationQuery];
    if (cached) {
      row.latLng = cached;
      addMarkerForRow(row, bounds);
      placedCount += 1;
    } else if (row.locationQuery) {
      queueGeocode(row);
      pendingCount += 1;
    }
  }

  createMainMapClusterer();

  if (placedCount > 0) {
    if (placedCount === 1 && state.selectedRow?.latLng) {
      state.map.setCenter(state.selectedRow.latLng);
      state.map.setZoom(15);
    } else {
      state.map.fitBounds(bounds, 80);
    }
  }

  if (pendingCount > 0 && statusText) {
    statusText.textContent = `${mapRows.length}件を表示中`;
  }

  focusMarker(state.selectedRow);
}

function getProfiledRows() {
  const activeRows = expandRowsForMap(state.rows).filter((row) => hasStoreProfileContent(getStoreProfile(row)));
  const archivedRows = Object.entries(state.storeProfilesByKey)
    .filter(([profileKey, profile]) => hasStoreProfileContent(profile) && !getActiveRowByProfileKey(profileKey))
    .map(([reviewKey, profile]) => buildArchivedProfileRow(reviewKey, profile));

  return [...activeRows, ...archivedRows];
}

function syncProfileMap() {
  if (state.profileMapSyncQueued) return;
  state.profileMapSyncQueued = true;
  requestAnimationFrame(() => {
    state.profileMapSyncQueued = false;
    runSyncProfileMap();
  });
}

function runSyncProfileMap() {
  if (!ensureProfileMapReady()) return;

  clearProfileMarkers();
  const profiledRows = getProfiledRows();
  const profileMapRows = expandRowsForMap(profiledRows);
  if (profileMapCount) profileMapCount.textContent = `${profileMapRows.length}件`;

  if (!profileMapRows.length) {
    if (profileMapStatusText) {
      profileMapStatusText.textContent = "店舗情報を保存するとここに表示されます。";
    }
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  let placedCount = 0;
  let pendingCount = 0;

  for (const row of profileMapRows) {
    const cached = row.latLng || state.geocodeCache[row.locationQuery];
    if (cached) {
      row.latLng = cached;
      addProfileMarkerForRow(row, bounds);
      placedCount += 1;
    } else if (row.locationQuery) {
      queueGeocode(row);
      pendingCount += 1;
    }
  }

  if (placedCount > 0) {
    if (placedCount === 1 && profileMapRows[0].latLng) {
      state.profileMap.setCenter(profileMapRows[0].latLng);
      state.profileMap.setZoom(15);
    } else {
      state.profileMap.fitBounds(bounds, 80);
    }
  }

  if (profileMapStatusText) {
    profileMapStatusText.textContent = pendingCount > 0
      ? `${profileMapRows.length}件を表示中 / ${pendingCount}件の位置を補完中`
      : `${profileMapRows.length}件を表示中`;
  }
}

function clearMarkers() {
  if (state.markerClusterer) {
    state.markerClusterer.clearMarkers();
    state.markerClusterer.setMap(null);
    state.markerClusterer = null;
  }
  for (const marker of state.markers.values()) {
    marker.setMap(null);
  }
  state.markers.clear();
}

function clearProfileMarkers() {
  for (const marker of state.profileMarkers.values()) {
    marker.setMap(null);
  }
  state.profileMarkers.clear();
}

function addMarkerForRow(row, bounds) {
  if (!row.latLng || state.markers.has(row.id)) return;

  const marker = new google.maps.Marker({
    map: shouldClusterMainMap() ? null : state.map,
    position: row.latLng,
    title: row.name,
    icon: buildMarkerIcon(row),
  });

  marker.addListener("click", () => toggleMarkerSelection(row));
  state.markers.set(row.id, marker);
  bounds.extend(row.latLng);
}

function shouldClusterMainMap() {
  return MAIN_MAP_CLUSTERING_ENABLED && Boolean(window.markerClusterer?.MarkerClusterer);
}

function createMainMapClusterer() {
  if (!shouldClusterMainMap() || !state.markers.size) return;

  const options = {
    map: state.map,
    markers: [...state.markers.values()],
    renderer: {
      render: ({ count, position }) => new google.maps.Marker({
        position,
        label: {
          text: String(count),
          color: "#ffffff",
          fontSize: "13px",
          fontWeight: "700",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: count >= 100 ? "#c9346b" : "#e34f83",
          fillOpacity: 0.96,
          strokeColor: "#ffd6e5",
          strokeOpacity: 1,
          strokeWeight: 3,
          scale: count >= 100 ? 26 : count >= 30 ? 23 : 20,
        },
        title: `${count}店舗`,
        zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
      }),
    },
  };

  if (window.markerClusterer.SuperClusterAlgorithm) {
    options.algorithm = new window.markerClusterer.SuperClusterAlgorithm({
      maxZoom: 14,
      radius: 72,
    });
  }

  state.markerClusterer = new window.markerClusterer.MarkerClusterer(options);
}

function addProfileMarkerForRow(row, bounds) {
  if (!row.latLng || state.profileMarkers.has(row.id)) return;

  const marker = new google.maps.Marker({
    map: state.profileMap,
    position: row.latLng,
    title: row.name,
    icon: buildProfileMarkerIcon(row),
  });

  marker.addListener("click", () => toggleMarkerSelection(row, state.profileMap, state.profileInfoWindow, marker));

  state.profileMarkers.set(row.id, marker);
  bounds.extend(row.latLng);
}

function buildMarkerIcon(row) {
  const latestReview = getLatestReview(row);
  const profile = getStoreProfile(row);
  let fillColor = "#9b95a4";
  let strokeColor = "#efe8f6";
  const isArchived = Boolean(row?.isArchivedStore);

  if (isExcludedRow(row)) {
    fillColor = isArchived ? "#6c6c72" : "#1d1d1f";
    strokeColor = isArchived ? "#c8c8ce" : "#a7a7ad";
  } else if (isFavoriteRow(row)) {
    fillColor = isArchived ? "#8fdefa" : "#4ecbff";
    strokeColor = isArchived ? "#eefbff" : "#d7f4ff";
  } else if (profile?.guideClarity === "あり") {
    fillColor = isArchived ? "#ff9bbc" : "#ff5d96";
    strokeColor = isArchived ? "#fff0f5" : "#ffe3ee";
  } else if (profile?.guideClarity === "なし") {
    fillColor = isArchived ? "#ffd26a" : "#ffb000";
    strokeColor = isArchived ? "#fff7dc" : "#fff1c7";
  } else if (latestReview?.guideClarity === "あり") {
    fillColor = isArchived ? "#ff9bbc" : "#ff5d96";
    strokeColor = isArchived ? "#fff0f5" : "#ffe3ee";
  } else if (latestReview?.guideClarity === "なし") {
    fillColor = isArchived ? "#ffd26a" : "#ffb000";
    strokeColor = isArchived ? "#fff7dc" : "#fff1c7";
  }

  return createHeartMarkerIcon(fillColor, strokeColor, { isNew: isRecentlyAddedRow(row) });
}

function buildProfileMarkerIcon(row) {
  const profile = getStoreProfile(row);
  const isArchived = Boolean(row?.isArchivedStore);
  const markerOptions = { isNew: isRecentlyAddedRow(row) };
  if (isExcludedRow(row)) {
    return createHeartMarkerIcon(isArchived ? "#6c6c72" : "#1d1d1f", isArchived ? "#c8c8ce" : "#a7a7ad", markerOptions);
  }
  if (isFavoriteRow(row)) {
    return createHeartMarkerIcon(isArchived ? "#8fdefa" : "#4ecbff", isArchived ? "#eefbff" : "#d7f4ff", markerOptions);
  }
  if (profile?.guideClarity === "あり") {
    return createHeartMarkerIcon(isArchived ? "#ff9bbc" : "#ff5d96", isArchived ? "#fff0f5" : "#ffe3ee", markerOptions);
  }
  if (profile?.guideClarity === "なし") {
    return createHeartMarkerIcon(isArchived ? "#ffd26a" : "#ffb000", isArchived ? "#fff7dc" : "#fff1c7", markerOptions);
  }
  return createHeartMarkerIcon(isArchived ? "#ff9bbc" : "#ff5d96", isArchived ? "#fff0f5" : "#ffe3ee", markerOptions);
}

function createHeartMarkerIcon(fillColor, strokeColor, options = {}) {
  const hasNewGlow = Boolean(options.isNew);
  const width = hasNewGlow ? 52 : 34;
  const height = hasNewGlow ? 48 : 30;
  const viewBox = hasNewGlow ? "-9 -9 52 48" : "0 0 34 30";
  const glowHtml = hasNewGlow
    ? `
      <ellipse cx="17" cy="15" rx="25" ry="21" fill="#ffb000" opacity="0.42" />
      <ellipse cx="17" cy="15" rx="18" ry="15.5" fill="#ffe08a" opacity="0.55" />
      <ellipse cx="17" cy="15" rx="12" ry="10.5" fill="#fff2bd" opacity="0.36" />
    `
    : "";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">
      ${glowHtml}
      <path
        d="M17 28C15.9 28 14.9 27.62 14.02 26.86C10.2 23.57 7.32 20.95 5.38 19C3.44 17.05 2.04 15.43 1.18 14.14C0.39 12.98 0 11.72 0 10.36C0 7.61 0.94 5.3 2.82 3.43C4.71 1.55 7.01 0.61 9.74 0.61C11.31 0.61 12.8 0.95 14.21 1.64C15.62 2.33 16.55 3.02 17 3.71C17.45 3.02 18.38 2.33 19.79 1.64C21.2 0.95 22.69 0.61 24.26 0.61C26.99 0.61 29.29 1.55 31.18 3.43C33.06 5.3 34 7.61 34 10.36C34 11.72 33.61 12.98 32.82 14.14C31.96 15.43 30.56 17.05 28.62 19C26.68 20.95 23.8 23.57 19.98 26.86C19.1 27.62 18.1 28 17 28Z"
        fill="${fillColor}"
        stroke="${strokeColor}"
        stroke-width="1.8"
      />
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(width, height),
    anchor: hasNewGlow ? new google.maps.Point(26, 36) : new google.maps.Point(17, 27),
  };
}

function focusMarker(row) {
  if (!row) return;

  if (row.isArchivedStore) {
    if (!ensureProfileMapReady()) return;
    const archivedMarker = state.profileMarkers.get(row.id);
    if (archivedMarker) {
      state.profileMap.panTo(archivedMarker.getPosition());
      state.profileMap.setZoom(Math.max(state.profileMap.getZoom(), 15));
      openMarkerInfoWindow(state.profileMap, state.profileInfoWindow, archivedMarker, row);
      return;
    }

    if (row.locationQuery) {
      queueGeocode(row, false);
    }
    return;
  }

  if (!ensureMapReady()) return;

  const marker = state.markers.get(row.id);
  if (marker) {
    state.map.panTo(marker.getPosition());
    state.map.setZoom(Math.max(state.map.getZoom(), 15));
    openMarkerInfoWindow(state.map, state.infoWindow, marker, row);
    return;
  }

  if (row.locationQuery) {
    queueGeocode(row, true);
  }
}

function openMarkerInfoWindow(map, infoWindow, marker, row) {
  if (!map || !infoWindow || !marker || !row) return;

  const content = document.createElement("div");
  content.innerHTML = renderMarkerInfoContent(row);
  infoWindow.setContent(content);
  infoWindow.open({ map, anchor: marker });

  google.maps.event.addListenerOnce(infoWindow, "domready", () => {
    bindInfoWindowActions(content, row, infoWindow);
  });
}

function sanitizePopupNote(note) {
  const text = String(note || "").trim();
  if (!text) return "";

  const meaninglessPatterns = [
    /全国メンズエステランキング/i,
    /のアクセス/i,
    /エリアのアジアンエステ/i,
    /^六本木・麻布十番$/,
  ];

  if (meaninglessPatterns.some((pattern) => pattern.test(text))) {
    return "";
  }

  return text;
}

function renderMarkerInfoContent(row) {
  const profile = getStoreProfile(row);
  const canEdit = canCurrentUserEdit();
  const phoneHtml = row.phone
    ? `<a href="tel:${escapeHtml(row.phone)}" style="color:#c2185b;text-decoration:none;font-weight:700;">${escapeHtml(row.phone)}</a>`
    : "—";
  const popupNote = sanitizePopupNote(
    hasStoreProfileContent(profile)
      ? String(profile?.note || "").trim()
      : (row.notes || "")
  );
  const notesHtml = popupNote ? `<div style="margin-top:4px;">備考: ${escapeHtml(popupNote)}</div>` : "";
  const addedDayKey = findAddedDayKey(row);
  const addedDateHtml = addedDayKey ? `<div style="margin-top:2px;color:#8d5268;">追加日: ${escapeHtml(formatHistoryDate(addedDayKey))}</div>` : "";
  const phoneSearchUrl = row.phone ? `https://www.google.com/search?q=${encodeURIComponent(row.phone)}` : "";
  const preferredExternalUrl = getPreferredExternalUrl(row);
  const mapLinkHtml = row.mapUrl
    ? `<a href="${escapeHtml(row.mapUrl)}" target="_blank" rel="noreferrer" style="margin-left:8px;color:#c2185b;text-decoration:none;font-weight:700;">MAP</a>`
    : "";
  const officialHtml = preferredExternalUrl
    ? `<a href="${escapeHtml(preferredExternalUrl)}" target="_blank" rel="noreferrer" style="margin-left:8px;color:#c2185b;text-decoration:none;font-weight:700;">HP</a>`
    : "";
  const phoneSearchHtml = row.phone
    ? `<a href="${escapeHtml(phoneSearchUrl)}" target="_blank" rel="noreferrer" style="margin-left:8px;color:#c2185b;text-decoration:none;font-weight:700;">番号検索</a>`
    : "";
  const sharedButtonState = canEdit ? "" : "disabled";
  const sharedCursor = canEdit ? "pointer" : "default";
  const sharedOpacity = canEdit ? "1" : "0.5";
  const favoriteButtonHtml = `<button type="button" ${sharedButtonState} data-marker-action="favorite" data-review-key="${escapeHtml(row.reviewKey || "")}" aria-pressed="${isFavoriteRow(row) ? "true" : "false"}" title="${canEdit ? (isFavoriteRow(row) ? "確認済み解除" : "確認済み") : "閲覧専用"}" style="display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:999px;border:1px solid ${isFavoriteRow(row) ? "rgba(78, 203, 255, 0.55)" : "rgba(194,24,91,0.18)"};background:${isFavoriteRow(row) ? "rgba(78, 203, 255, 0.14)" : "#fff7fb"};color:${isFavoriteRow(row) ? "#26aee8" : "#c2185b"};text-decoration:none;font-weight:700;cursor:${sharedCursor};opacity:${sharedOpacity};">${isFavoriteRow(row) ? "♥" : "♡"}</button>`;
  const excludeButtonHtml = `<button type="button" ${sharedButtonState} data-marker-action="exclude" data-review-key="${escapeHtml(row.reviewKey || "")}" aria-pressed="${isExcludedRow(row) ? "true" : "false"}" title="${canEdit ? (isExcludedRow(row) ? "除外解除" : "除外") : "閲覧専用"}" style="display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:999px;border:1px solid ${isExcludedRow(row) ? "rgba(170,170,178,0.5)" : "rgba(194,24,91,0.18)"};background:${isExcludedRow(row) ? "rgba(255,255,255,0.06)" : "#fff7fb"};color:${isExcludedRow(row) ? "#1d1d1f" : "#c2185b"};text-decoration:none;font-weight:700;cursor:${sharedCursor};opacity:${sharedOpacity};">${isExcludedRow(row) ? "♥" : "♡"}</button>`;
  const actionsHtml = [favoriteButtonHtml, excludeButtonHtml].filter(Boolean).join("");

  return `
    <div style="position:relative;color:#28121c;min-width:190px;line-height:1.55;padding-right:26px;">
      <button type="button" data-marker-action="close" aria-label="吹き出しを閉じる" title="閉じる" style="position:absolute;top:-2px;right:-2px;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:0;border-radius:999px;background:rgba(255,247,251,0.94);color:#8d5268;font-size:18px;line-height:1;font-weight:700;cursor:pointer;">×</button>
      <div style="font-weight:700;font-size:14px;">${renderDisplayStoreNameHtml(row)}${officialHtml}${mapLinkHtml}</div>
      <div style="margin-top:4px;">営業時間: ${escapeHtml(row.hours || "—")}</div>
      ${addedDateHtml}
      <div style="margin-top:2px;">電話: ${phoneHtml}${phoneSearchHtml}</div>
      ${notesHtml}
      ${actionsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">${actionsHtml}</div>` : ""}
    </div>
  `;
}

function bindInfoWindowActions(container, row, infoWindow) {
  const root = container || document;
  const buttons = root.querySelectorAll("[data-marker-action]");
  for (const button of buttons) {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.dataset.markerAction === "close") {
        infoWindow?.close();
        return;
      }
      state.selectedRow = row;
      if (button.dataset.markerAction === "favorite") {
        handleFavoriteToggle();
      } else if (button.dataset.markerAction === "exclude") {
        handleExcludeToggle();
      }
    };
  }
}

function renderStreetViewForRow(row) {
  if (!streetViewStatusText || !streetViewEmptyState || !streetViewCanvas) return;

  ensureStreetViewPanorama();

  if (!row) {
    setStreetViewState({
      mode: "empty",
      status: "店舗を選ぶと周辺ビューを表示できます。",
      emptyMessage: "店舗を選ぶと周辺ビューを表示できます。",
    });
    return;
  }

  if (!state.mapReady || !state.streetViewPanorama || !state.streetViewService) {
    setStreetViewState({
      mode: "empty",
      status: "周辺ビューの準備中です。",
      emptyMessage: "周辺ビューの準備中です。",
    });
    return;
  }

  if (!row.latLng) {
    setStreetViewState({
      mode: "empty",
      status: "位置の確定を待っています。",
      emptyMessage: "位置がわかると周辺ビューを表示できます。",
    });
    return;
  }

  setStreetViewState({
    mode: "empty",
    status: "周辺ビューを確認中です。",
    emptyMessage: "周辺ビューを読み込んでいます。",
  });

  state.streetViewService.getPanorama(
    {
      location: row.latLng,
      preference: google.maps.StreetViewPreference.NEAREST,
      radius: 80,
      source: google.maps.StreetViewSource.OUTDOOR,
    },
    (data, status) => {
      if (state.selectedRow?.id !== row.id) return;

      if (status === "OK" && data?.location?.latLng) {
        state.streetViewPanorama.setPosition(data.location.latLng);
        state.streetViewPanorama.setPov({ heading: 0, pitch: 0 });
        setStreetViewState({
          mode: "ready",
          status: "店舗周辺ビューを表示中です。",
        });
        return;
      }

      setStreetViewState({
        mode: "empty",
        status: "この場所では周辺ビューを表示できません。",
        emptyMessage: "この場所では周辺ビューを表示できません。",
      });
    }
  );
}

function setStreetViewState({ mode, status, emptyMessage = "" }) {
  if (!streetViewStatusText || !streetViewEmptyState || !streetViewCanvas) return;

  streetViewStatusText.textContent = status || "";
  streetViewCanvas.classList.toggle("is-hidden", mode !== "ready");
  streetViewEmptyState.classList.toggle("is-hidden", mode === "ready");
  if (mode !== "ready") {
    streetViewEmptyState.textContent = emptyMessage || "";
  }
  if (state.streetViewPanorama) {
    state.streetViewPanorama.setVisible(mode === "ready");
  }
}

function ensureStreetViewPanorama() {
  if (!streetViewCanvas || state.streetViewPanorama) return;

  state.streetViewPanorama = new google.maps.StreetViewPanorama(streetViewCanvas, {
    addressControl: false,
    fullscreenControl: false,
    linksControl: true,
    panControl: true,
    enableCloseButton: false,
    motionTracking: false,
  });
}

function queueGeocode(row, shouldFocus = false) {
  if (!row.locationQuery) return;
  const existing = state.geocodeQueue.find((item) => item.row.id === row.id);
  if (existing) {
    existing.shouldFocus = existing.shouldFocus || shouldFocus;
    return;
  }
  state.geocodeQueue.push({ row, shouldFocus });
  runGeocodeQueue();
}

function runGeocodeQueue() {
  if (!ensureMapReady() || state.geocodeRunning || state.geocodeQueue.length === 0) return;

  const next = state.geocodeQueue.shift();
  state.geocodeRunning = true;

  state.geocoder.geocode({ address: next.row.locationQuery, region: "JP" }, (results, status) => {
    state.geocodeRunning = false;

    if (status === "OK" && results && results[0] && results[0].geometry && results[0].geometry.location) {
      const geocodedLatLng = {
        lat: results[0].geometry.location.lat(),
        lng: results[0].geometry.location.lng(),
      };

      if (isLatLngWithinRegion(geocodedLatLng)) {
        next.row.latLng = geocodedLatLng;
        state.geocodeCache[next.row.locationQuery] = geocodedLatLng;
        writeGeocodeCache();
        syncMapWithFilters();
        syncProfileMap();
        if (state.selectedRow?.id === next.row.id) {
          renderStreetViewForRow(next.row);
        }
        if (next.shouldFocus) {
          focusMarker(next.row);
        }
      } else {
        console.warn("Geocode result outside configured region", next.row.locationQuery, geocodedLatLng);
      }
    }

    window.setTimeout(runGeocodeQueue, status === "OVER_QUERY_LIMIT" ? 1200 : 180);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

