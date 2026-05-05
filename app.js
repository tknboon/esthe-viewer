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
  profileMap: null,
  profileInfoWindow: null,
  profileMarkers: new Map(),
  geocoder: null,
  geocodeQueue: [],
  geocodeRunning: false,
  geocodeCache: {},
  mapReady: false,
  regionExpanded: false,
  expandedRegions: {},
  streetViewPanorama: null,
  streetViewService: null,
};

const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const lastUpdatedText = document.querySelector("#lastUpdatedText");
const regionSummary = document.querySelector("#regionSummary");
const reviewTotalCount = document.querySelector("#reviewTotalCount");
const monthlyRevenueChart = document.querySelector("#monthlyRevenueChart");
const dailyUpdateHistory = document.querySelector("#dailyUpdateHistory");
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

const REGION_LABELS = {
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
};

const REGION_MUNICIPALITIES = {
  nagoya: ["名古屋市"],
  sakae: ["名古屋市"],
  shinsakae: ["名古屋市"],
  kanayama: ["名古屋市"],
  kurokawa: ["名古屋市"],
  hoshigaoka: ["名古屋市"],
  moriyama: ["名古屋市"],
  otai: ["名古屋市"],
  tokaidori: ["名古屋市"],
  kasadera: ["名古屋市"],
  horita: ["名古屋市"],
  tsurumai: ["名古屋市"],
  showa: ["名古屋市"],
  komaki: ["小牧市", "春日井市", "瀬戸市", "豊明市", "日進市", "犬山市", "長久手市"],
  owari: ["一宮市", "稲沢市", "江南市", "北名古屋市", "清須市", "岩倉市", "愛西市", "尾張旭市", "弥富市", "津島市", "あま市", "蟹江町", "大治町", "扶桑町"],
  chita: ["知多市", "大府市", "半田市", "東海市", "常滑市", "武豊町", "阿久比町", "東浦町"],
  toyota: ["豊田市", "岡崎市", "刈谷市", "知立市", "安城市", "高浜市", "碧南市", "みよし市", "西尾市", "幸田町"],
  toyohashi: ["豊橋市", "豊川市", "新城市", "蒲郡市", "田原市"],
};

const STATION_GROUP_REGIONS = new Set([
  "nagoya",
  "sakae",
  "shinsakae",
  "kanayama",
  "kurokawa",
  "hoshigaoka",
  "moriyama",
  "otai",
  "tokaidori",
  "kasadera",
  "horita",
  "tsurumai",
  "showa",
]);

init();

function init() {
  try {
    state.rows = (window.storeData || []).map(normalizeRow);
    if (!state.rows.length) {
      throw new Error("No embedded data");
    }
    state.geocodeCache = readGeocodeCache();
    state.reviewsByStore = readReviews();
    state.storeProfilesByKey = readStoreProfiles();
    state.favoritesByStore = readFavorites();
    state.excludedByStore = readExcluded();
    renderLastUpdated();
    renderUpdateHistory();
    setDefaultReviewValues();
    bindEvents();
    applyFilters();
    renderReviewAnalytics();
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

function renderUpdateHistory() {
  if (!dailyUpdateHistory) return;

  const history = (Array.isArray(window.storeMeta?.updateHistory) ? window.storeMeta.updateHistory : []).filter((entry) => {
    const added = Array.isArray(entry?.added) ? entry.added : [];
    const removed = Array.isArray(entry?.removed) ? entry.removed : [];
    return added.length || removed.length;
  });
  const stationLookup = buildHistoryStationLookup();

  if (!history.length) {
    dailyUpdateHistory.innerHTML = `<div class="empty-state compact">更新履歴はまだありません。</div>`;
    return;
  }

  dailyUpdateHistory.innerHTML = history
    .slice(0, 14)
    .map((entry) => {
      const added = Array.isArray(entry.added) ? entry.added : [];
      const removed = Array.isArray(entry.removed) ? entry.removed : [];

      return `
        <article class="update-history-item">
          <div class="update-history-head">
            <span class="update-history-date">${escapeHtml(formatHistoryDate(entry.dayKey || entry.fetchedAt))}</span>
            <span class="update-history-summary">開店 ${added.length}件 / 閉店 ${removed.length}件</span>
          </div>
          ${renderHistoryGroup("開店", added, "added", stationLookup)}
          ${renderHistoryGroup("閉店", removed, "removed", stationLookup)}
        </article>
      `;
    })
    .join("");
}

function buildHistoryStationLookup() {
  const lookup = new Map();

  for (const row of state.rows) {
    if (!row?.name || !row?.station) continue;
    if (!lookup.has(row.name)) {
      lookup.set(row.name, new Set());
    }
    lookup.get(row.name).add(row.station);
  }

  return lookup;
}

function formatHistoryStoreLabel(item, stationLookup) {
  const label = String(item || "").trim();
  if (!label) return "";
  if (label.includes("/")) return label;

  const stations = stationLookup.get(label);
  if (!stations || !stations.size) return label;

  return `${label}/${[...stations][0]}`;
}

function renderHistoryGroup(label, items, modifier, stationLookup) {
  if (!items.length) return "";
  return `
    <section class="update-history-group">
      <div class="update-history-label ${modifier === "removed" ? "is-removed" : "is-added"}">${escapeHtml(label)}</div>
      <div class="update-history-tags">
        ${items
          .map((item) => formatHistoryStoreLabel(item, stationLookup))
          .filter(Boolean)
          .map((item) => `<span class="update-history-tag">${escapeHtml(item)}</span>`)
          .join("")}
      </div>
    </section>
  `;
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
  reviewList.addEventListener("click", handleReviewDelete);
  archivedReviewList?.addEventListener("click", handleReviewDelete);
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
    state.selectedRow = state.filteredRows[0] || null;
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
  const rootLabel = `愛知県(${stats.total})`;

  regionSummary.innerHTML = `
    <button class="region-toggle" type="button" data-region-toggle="aichi" aria-expanded="${state.regionExpanded ? "true" : "false"}">
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
                                  <div class="municipality-item">
                                    <span class="municipality-name">${escapeHtml(municipality.label)}</span>
                                    <span class="municipality-count">(${municipality.count})</span>
                                  </div>
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
    .sort((a, b) => a.label.localeCompare(b.label, "ja"));

  return {
    total: uniqueStoreKeys.size,
    children,
  };
}

function getMunicipalityLabelsForSummary(row, regionKey) {
  if (Array.isArray(row?.municipalityLabels) && row.municipalityLabels.length) {
    return [...new Set(row.municipalityLabels.filter(Boolean))];
  }

  return [getMunicipalityFromRow(row, regionKey)];
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
    const stationLabel = normalizeStationGroupLabel(row?.station || "");
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
  const text = String(value || "")
    .replace(/[／/]/g, "・")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  return text
    .replace(/徒歩.*$/u, "")
    .replace(/車で.*$/u, "")
    .replace(/から.*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
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
          <span class="map-list-meta">${escapeHtml(row.station || row.location || "-")}</span>
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
              <p class="store-station">${escapeHtml(row.station)}</p>
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
            ${row.listingUrl ? `<a class="action-link" href="${row.listingUrl}" target="_blank" rel="noreferrer">掲載ページ</a>` : ""}
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
          <td>${escapeHtml(row.station)}</td>
          <td>${escapeHtml(row.hours || "-")}</td>
          <td>${row.phone ? `<a href="tel:${row.phone}">${escapeHtml(row.phone)}</a>` : "-"}</td>
          <td><a href="${row.mapUrl}" target="_blank" rel="noreferrer">${escapeHtml(row.location || "地図で開く")}</a></td>
          <td>${row.listingUrl ? `<a href="${row.listingUrl}" target="_blank" rel="noreferrer">掲載ページ</a>` : "-"}</td>
        </tr>
      `
    )
    .join("");
}

function renderSelectedStore() {
  if (!state.selectedRow) {
    selectedStoreName.textContent = "店舗を選択してください";
    selectedStoreMeta.textContent = "地図上のピンから店舗を選んでください。";
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
    reviewSubmitButton.disabled = true;
    reviewList.innerHTML = `<div class="empty-state compact">店舗を選ぶとレビューを表示できます。</div>`;
    return;
  }

  selectedStoreName.textContent = state.selectedRow.name;
  selectedStoreMeta.textContent = [state.selectedRow.station, state.selectedRow.hours, state.selectedRow.phone, state.selectedRow.notes]
    .filter(Boolean)
    .join(" / ");
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

  if (state.selectedRow.listingUrl) {
    selectedListingLink.href = state.selectedRow.listingUrl;
    selectedListingLink.classList.remove("disabled-link");
  } else {
    disableLink(selectedListingLink);
  }

  renderStoreProfileInputs(state.selectedRow);
  renderStoreProfileSummary(state.selectedRow);
  renderReviewList();
  renderStreetViewForRow(state.selectedRow);
}

function focusRow(row) {
  state.selectedRow = row;
  renderSelectedStore();
  focusMarker(row);
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
  favoriteToggleButton.disabled = !row;
  favoriteToggleButton.textContent = active ? "♥" : "♡";
  favoriteToggleButton.classList.toggle("is-active", active);
  favoriteToggleButton.setAttribute("aria-pressed", active ? "true" : "false");
  favoriteToggleButton.setAttribute("title", active ? "お気に入り解除" : "お気に入り");
  favoriteToggleButton.setAttribute("aria-label", active ? "お気に入り解除" : "お気に入り");
}

function handleFavoriteToggle() {
  if (!state.selectedRow?.reviewKey) return;
  const key = state.selectedRow.reviewKey;

  if (state.favoritesByStore[key]) {
    delete state.favoritesByStore[key];
  } else {
    state.favoritesByStore[key] = {
      storeName: state.selectedRow.name,
      storeStation: state.selectedRow.station,
      listingUrl: state.selectedRow.listingUrl,
      updatedAt: new Date().toISOString(),
    };
  }

  writeFavorites();
  renderFavoriteToggle(state.selectedRow);
  syncMapWithFilters();
  syncProfileMap();
}

function renderExcludeToggle(row) {
  if (!excludeToggleButton) return;
  const active = isExcludedRow(row);
  excludeToggleButton.disabled = !row;
  excludeToggleButton.textContent = active ? "♥" : "🖤";
  excludeToggleButton.classList.toggle("is-excluded", active);
  excludeToggleButton.setAttribute("aria-pressed", active ? "true" : "false");
  excludeToggleButton.setAttribute("title", active ? "除外解除" : "除外");
  excludeToggleButton.setAttribute("aria-label", active ? "除外解除" : "除外");
}

function handleExcludeToggle() {
  if (!state.selectedRow?.reviewKey) return;
  const key = state.selectedRow.reviewKey;

  if (state.excludedByStore[key]) {
    delete state.excludedByStore[key];
  } else {
    state.excludedByStore[key] = {
      storeName: state.selectedRow.name,
      storeStation: state.selectedRow.station,
      listingUrl: state.selectedRow.listingUrl,
      updatedAt: new Date().toISOString(),
    };
  }

  writeExcluded();
  renderExcludeToggle(state.selectedRow);
  syncMapWithFilters();
  syncProfileMap();
}

function normalizeRow(row, index) {
  const name = row["店舗名"] || "";
  const station = row["最寄駅"] || "";
  const location = row["住所または座標"] || "";
  const latitude = row["緯度"] || "";
  const longitude = row["経度"] || "";
  const listingUrl = row["掲載URL"] || "";
  const notes = row["備考"] || "";
  const phone = row["電話番号"] || row["電話"] || "";
  const hours = row["営業時間"] || row["営業"] || "";
  const municipality = window.storeMeta?.municipalityByListingUrl?.[listingUrl] || "";
  const municipalityLabels = window.storeMeta?.municipalityLabelsByListingUrl?.[listingUrl] || [];
  const hasCoordinates = Boolean(latitude && longitude);
  const latLng = hasCoordinates ? { lat: Number(latitude), lng: Number(longitude) } : null;
  const mapQuery = hasCoordinates ? `${latitude},${longitude}` : buildLocationQuery(name, station, location, notes);

  return {
    id: `${name}-${station}-${index}`,
    reviewKey: listingUrl || `${name}__${station || location || index}`,
    name,
    station,
    location,
    latitude,
    longitude,
    listingUrl,
    notes,
    phone,
    hours,
    municipality,
    municipalityLabels,
    hasCoordinates,
    latLng,
    locationQuery: mapQuery,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`,
  };
}

function readReviews() {
  try {
    const raw = localStorage.getItem("toyota-esthe-reviews");
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeReviews() {
  try {
    localStorage.setItem("toyota-esthe-reviews", JSON.stringify(state.reviewsByStore));
  } catch (error) {
    console.warn("review save failed", error);
  }
}

function readStoreProfiles() {
  try {
    const raw = localStorage.getItem("toyota-esthe-store-profiles");
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeStoreProfiles() {
  try {
    localStorage.setItem("toyota-esthe-store-profiles", JSON.stringify(state.storeProfilesByKey));
  } catch (error) {
    console.warn("store profile save failed", error);
  }
}

function readFavorites() {
  try {
    const raw = localStorage.getItem("toyota-esthe-favorites");
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeFavorites() {
  try {
    localStorage.setItem("toyota-esthe-favorites", JSON.stringify(state.favoritesByStore));
  } catch (error) {
    console.warn("favorite save failed", error);
  }
}

function readExcluded() {
  try {
    const raw = localStorage.getItem("toyota-esthe-excluded");
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeExcluded() {
  try {
    localStorage.setItem("toyota-esthe-excluded", JSON.stringify(state.excludedByStore));
  } catch (error) {
    console.warn("exclude save failed", error);
  }
}

function getStoreProfile(row) {
  if (!row) return null;
  return state.storeProfilesByKey[row.reviewKey] || null;
}

function renderStoreProfileInputs(row) {
  const profile = getStoreProfile(row) || {};
  if (storeAddressInput) storeAddressInput.value = profile.address || "";
  if (storeSmsInput) storeSmsInput.value = profile.sms || "";
  if (storeMenuInput) storeMenuInput.value = profile.menu || "";
  if (storeDisclosureInput) storeDisclosureInput.value = profile.disclosure || "";
  if (storeGuideClarityInput) storeGuideClarityInput.value = profile.guideClarity || "";
  setStoreProfileEditing(false, true);
}

function clearStoreProfileInputs() {
  if (storeAddressInput) storeAddressInput.value = "";
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
    profile.sms ? `<span>SMS: ${escapeHtml(profile.sms)}</span>` : "",
    profile.menu ? `<span>メニュー: ${escapeHtml(profile.menu)}</span>` : "",
    profile.disclosure ? `<span>明示: ${escapeHtml(profile.disclosure)}</span>` : "",
    profile.guideClarity ? `<span class="${profile.guideClarity === "あり" ? "profile-positive" : ""}">真心: ${escapeHtml(profile.guideClarity)}</span>`
      : "",
  ].filter(Boolean);
  selectedStoreProfileMeta.innerHTML = parts.join(" / ");
}

function hasStoreProfileContent(profile) {
  return Boolean(profile && (profile.address || profile.sms || profile.menu || profile.disclosure || profile.guideClarity));
}

function setStoreProfileEditing(isEditing, hasRow = Boolean(state.selectedRow)) {
  storeProfileToolbar?.classList.toggle("is-hidden", !hasRow);
  storeProfilePanel?.classList.toggle("is-hidden", !hasRow || !isEditing);
  storeProfileActions?.classList.toggle("is-hidden", !hasRow || !isEditing);

  [storeAddressInput, storeSmsInput, storeMenuInput, storeDisclosureInput, storeGuideClarityInput].forEach((element) => {
    if (!element) return;
    element.disabled = !hasRow || !isEditing;
  });

  if (storeProfileSaveButton) {
    storeProfileSaveButton.disabled = !hasRow || !isEditing;
  }

  if (storeProfileEditButton) {
    storeProfileEditButton.disabled = !hasRow;
    storeProfileEditButton.textContent = isEditing ? "編集中" : "店舗情報を編集";
    storeProfileEditButton.setAttribute("aria-expanded", hasRow && isEditing ? "true" : "false");
  }
}

function handleStoreProfileSave() {
  if (!state.selectedRow) return;

  const profile = {
    address: normalizeAddressValue(storeAddressInput?.value || ""),
    sms: storeSmsInput?.value || "",
    menu: storeMenuInput?.value || "",
    disclosure: storeDisclosureInput?.value || "",
    guideClarity: storeGuideClarityInput?.value || "",
    storeName: state.selectedRow.name,
    storeStation: state.selectedRow.station,
    listingUrl: state.selectedRow.listingUrl,
    updatedAt: new Date().toISOString(),
  };

  if (hasStoreProfileContent(profile)) {
    state.storeProfilesByKey[state.selectedRow.reviewKey] = profile;
  } else {
    delete state.storeProfilesByKey[state.selectedRow.reviewKey];
  }

  writeStoreProfiles();
  renderStoreProfileSummary(state.selectedRow);
  setStoreProfileEditing(false, true);
  syncProfileMap();
}

function handleStoreProfileEdit() {
  if (!state.selectedRow) return;
  setStoreProfileEditing(true, true);
  storeAddressInput?.focus();
}

function setReviewEditing(isEditing, hasRow = Boolean(state.selectedRow)) {
  reviewForm?.classList.toggle("is-hidden", !hasRow || !isEditing);
  if (reviewToggleButton) {
    reviewToggleButton.disabled = !hasRow;
  }
}

function handleReviewToggle() {
  if (!state.selectedRow) return;
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
    return "レビューはまだありません。";
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
  if (!state.selectedRow) return;

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
  const source = location || station || name;
  const scoped = /愛知県|豊田市|岡崎市|安城市|刈谷市|西尾市/.test(`${source} ${notes}`) ? source : `${source} 愛知県`;
  return scoped.trim();
}

function disableLink(link) {
  link.href = "#";
  link.classList.add("disabled-link");
}

function readGeocodeCache() {
  try {
    const raw = localStorage.getItem("toyota-esthe-geocode-cache");
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeGeocodeCache() {
  try {
    localStorage.setItem("toyota-esthe-geocode-cache", JSON.stringify(state.geocodeCache));
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
    center: { lat: 35.083, lng: 137.156 },
    zoom: 12,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });
  state.profileMap = new google.maps.Map(document.getElementById("profileGoogleMapCanvas"), {
    center: { lat: 35.083, lng: 137.156 },
    zoom: 11,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });
  state.infoWindow = new google.maps.InfoWindow();
  state.profileInfoWindow = new google.maps.InfoWindow();
  state.geocoder = new google.maps.Geocoder();
  state.streetViewService = new google.maps.StreetViewService();
  state.mapReady = true;
  syncMapWithFilters();
  syncProfileMap();
  renderStreetViewForRow(state.selectedRow);
};

function syncMapWithFilters() {
  if (!ensureMapReady()) return;

  clearMarkers();
  const bounds = new google.maps.LatLngBounds();
  let placedCount = 0;
  let pendingCount = 0;

  for (const row of state.filteredRows) {
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

  if (placedCount > 0) {
    if (placedCount === 1 && state.selectedRow?.latLng) {
      state.map.setCenter(state.selectedRow.latLng);
      state.map.setZoom(15);
    } else {
      state.map.fitBounds(bounds, 80);
    }
  }

  if (pendingCount > 0 && statusText) {
    statusText.textContent = `${state.filteredRows.length}件を表示中`;
  }

  focusMarker(state.selectedRow);
}

function getProfiledRows() {
  return state.rows.filter((row) => hasStoreProfileContent(getStoreProfile(row)));
}

function syncProfileMap() {
  if (!ensureProfileMapReady()) return;

  clearProfileMarkers();
  const profiledRows = getProfiledRows();
  if (profileMapCount) profileMapCount.textContent = `${profiledRows.length}件`;

  if (!profiledRows.length) {
    if (profileMapStatusText) {
      profileMapStatusText.textContent = "店舗情報を保存するとここに表示されます。";
    }
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  let placedCount = 0;
  let pendingCount = 0;

  for (const row of profiledRows) {
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
    if (placedCount === 1 && profiledRows[0].latLng) {
      state.profileMap.setCenter(profiledRows[0].latLng);
      state.profileMap.setZoom(15);
    } else {
      state.profileMap.fitBounds(bounds, 80);
    }
  }

  if (profileMapStatusText) {
    profileMapStatusText.textContent = pendingCount > 0
      ? `${profiledRows.length}件を表示中 / ${pendingCount}件の位置を補完中`
      : `${profiledRows.length}件を表示中`;
  }
}

function clearMarkers() {
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
    map: state.map,
    position: row.latLng,
    title: row.name,
    animation: google.maps.Animation.DROP,
    icon: buildMarkerIcon(row),
  });

  marker.addListener("click", () => focusRow(row));
  state.markers.set(row.id, marker);
  bounds.extend(row.latLng);
}

function addProfileMarkerForRow(row, bounds) {
  if (!row.latLng || state.profileMarkers.has(row.id)) return;

  const marker = new google.maps.Marker({
    map: state.profileMap,
    position: row.latLng,
    title: row.name,
    animation: google.maps.Animation.DROP,
    icon: buildProfileMarkerIcon(row),
  });

  marker.addListener("click", () => {
    focusRow(row);
    state.profileInfoWindow.setContent(renderMarkerInfoContent(row));
    state.profileInfoWindow.open({ map: state.profileMap, anchor: marker });
  });

  state.profileMarkers.set(row.id, marker);
  bounds.extend(row.latLng);
}

function buildMarkerIcon(row) {
  const latestReview = getLatestReview(row);
  let fillColor = "#9b95a4";
  let strokeColor = "#efe8f6";

  if (isExcludedRow(row)) {
    fillColor = "#1d1d1f";
    strokeColor = "#a7a7ad";
  } else if (isFavoriteRow(row)) {
    fillColor = "#ff2f74";
    strokeColor = "#ffd4e3";
  } else if (latestReview?.guideClarity === "あり") {
    fillColor = "#ff5d96";
    strokeColor = "#ffe3ee";
  } else if (latestReview?.guideClarity === "なし") {
    fillColor = "#ffb000";
    strokeColor = "#fff1c7";
  }

  return createHeartMarkerIcon(fillColor, strokeColor);
}

function buildProfileMarkerIcon(row) {
  if (isExcludedRow(row)) {
    return createHeartMarkerIcon("#1d1d1f", "#a7a7ad");
  }
  if (isFavoriteRow(row)) {
    return createHeartMarkerIcon("#ff2f74", "#ffd4e3");
  }
  return createHeartMarkerIcon("#ff5d96", "#ffe3ee");
}

function createHeartMarkerIcon(fillColor, strokeColor) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="30" viewBox="0 0 34 30">
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
    scaledSize: new google.maps.Size(34, 30),
    anchor: new google.maps.Point(17, 27),
  };
}

function focusMarker(row) {
  if (!ensureMapReady() || !row) return;

  const marker = state.markers.get(row.id);
  if (marker) {
    state.map.panTo(marker.getPosition());
    state.map.setZoom(Math.max(state.map.getZoom(), 15));
    state.infoWindow.setContent(renderMarkerInfoContent(row));
    state.infoWindow.open({ map: state.map, anchor: marker });
    return;
  }

  if (row.locationQuery) {
    queueGeocode(row, true);
  }
}

function renderMarkerInfoContent(row) {
  const phoneHtml = row.phone
    ? `<a href="tel:${escapeHtml(row.phone)}" style="color:#c2185b;text-decoration:none;font-weight:700;">${escapeHtml(row.phone)}</a>`
    : "—";

  return `
    <div style="color:#28121c;min-width:190px;line-height:1.55;">
      <div style="font-weight:700;font-size:14px;">${escapeHtml(row.name)}</div>
      <div style="margin-top:4px;">営業時間: ${escapeHtml(row.hours || "—")}</div>
      <div style="margin-top:2px;">電話: ${phoneHtml}</div>
    </div>
  `;
}

function renderStreetViewForRow(row) {
  if (!streetViewStatusText || !streetViewEmptyState || !streetViewCanvas) return;

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
  const exists = state.geocodeQueue.some((item) => item.row.id === row.id);
  if (exists) return;
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
      next.row.latLng = {
        lat: results[0].geometry.location.lat(),
        lng: results[0].geometry.location.lng(),
      };
      state.geocodeCache[next.row.locationQuery] = next.row.latLng;
      writeGeocodeCache();
      syncMapWithFilters();
      syncProfileMap();
      if (state.selectedRow?.id === next.row.id) {
        renderStreetViewForRow(next.row);
      }
      if (next.shouldFocus) {
        focusMarker(next.row);
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

