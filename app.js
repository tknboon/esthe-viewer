const state = {
  rows: [],
  filteredRows: [],
  view: "cards",
  appliedKeyword: "",
  selectedRow: null,
  reviewsByStore: {},
  map: null,
  infoWindow: null,
  markers: new Map(),
  geocoder: null,
  geocodeQueue: [],
  geocodeRunning: false,
  geocodeCache: {},
  mapReady: false,
};

const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const lastUpdatedText = document.querySelector("#lastUpdatedText");
const reviewTotalCount = document.querySelector("#reviewTotalCount");
const monthlyRevenueChart = document.querySelector("#monthlyRevenueChart");
const cardsView = document.querySelector("#cardsView");
const tableView = document.querySelector("#tableView");
const tableBody = document.querySelector("#tableBody");
const visibleCount = document.querySelector("#visibleCount");
const uniqueCount = document.querySelector("#uniqueCount");
const mapReadyCount = document.querySelector("#mapReadyCount");
const allDayCount = document.querySelector("#allDayCount");
const statusText = document.querySelector("#statusText");
const toggleViewButton = document.querySelector("#toggleViewButton");
const selectedStoreName = document.querySelector("#selectedStoreName");
const selectedStoreMeta = document.querySelector("#selectedStoreMeta");
const selectedReviewSummary = document.querySelector("#selectedReviewSummary");
const selectedPhoneLink = document.querySelector("#selectedPhoneLink");
const selectedPhoneSearchLink = document.querySelector("#selectedPhoneSearchLink");
const selectedMapLink = document.querySelector("#selectedMapLink");
const selectedListingLink = document.querySelector("#selectedListingLink");
const mapList = document.querySelector("#mapList");
const mapListCount = document.querySelector("#mapListCount");
const reviewForm = document.querySelector("#reviewForm");
const reviewVisitDateInput = document.querySelector("#reviewVisitDateInput");
const reviewAuthorInput = document.querySelector("#reviewAuthorInput");
const reviewNationalityInput = document.querySelector("#reviewNationalityInput");
const reviewDurationInput = document.querySelector("#reviewDurationInput");
const reviewPriceInput = document.querySelector("#reviewPriceInput");
const reviewSmsInput = document.querySelector("#reviewSmsInput");
const reviewMenuInput = document.querySelector("#reviewMenuInput");
const reviewDisclosureInput = document.querySelector("#reviewDisclosureInput");
const reviewShowerInput = document.querySelector("#reviewShowerInput");
const reviewMassageInput = document.querySelector("#reviewMassageInput");
const reviewGuideClarityInput = document.querySelector("#reviewGuideClarityInput");
const reviewFaceRatingInput = document.querySelector("#reviewFaceRatingInput");
const reviewBodyRatingInput = document.querySelector("#reviewBodyRatingInput");
const reviewPersonalityRatingInput = document.querySelector("#reviewPersonalityRatingInput");
const reviewServiceRatingInput = document.querySelector("#reviewServiceRatingInput");
const reviewOverallRatingInput = document.querySelector("#reviewOverallRatingInput");
const reviewCommentInput = document.querySelector("#reviewCommentInput");
const reviewSubmitButton = document.querySelector("#reviewSubmitButton");
const reviewList = document.querySelector("#reviewList");

init();

function init() {
  try {
    state.rows = (window.storeData || []).map(normalizeRow);
    if (!state.rows.length) {
      throw new Error("No embedded data");
    }
    state.geocodeCache = readGeocodeCache();
    state.reviewsByStore = readReviews();
    renderLastUpdated();
    setDefaultReviewValues();
    bindEvents();
    applyFilters();
    renderReviewAnalytics();
  } catch (error) {
    statusText.textContent = "データを読み込めませんでした。";
    cardsView.innerHTML = `<div class="empty-state">埋め込みデータの読み込みに失敗しました。</div>`;
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

function bindEvents() {
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyKeywordSearch();
    }
  });
  searchButton.addEventListener("click", applyKeywordSearch);
  toggleViewButton.addEventListener("click", toggleView);

  cardsView.addEventListener("click", handleListActionClick);
  tableBody.addEventListener("click", handleListActionClick);
  mapList.addEventListener("click", handleListActionClick);
  reviewList.addEventListener("click", handleReviewDelete);
  reviewForm.addEventListener("submit", handleReviewSubmit);
}

function handleListActionClick(event) {
  const trigger = event.target.closest("[data-focus-id]");
  if (!trigger) return;
  const row = state.filteredRows.find((item) => item.id === trigger.dataset.focusId);
  if (!row) return;
  focusRow(row);
}

function toggleView() {
  state.view = state.view === "cards" ? "table" : "cards";
  const cardsMode = state.view === "cards";
  cardsView.classList.toggle("is-hidden", !cardsMode);
  tableView.classList.toggle("is-hidden", cardsMode);
  toggleViewButton.textContent = cardsMode ? "カード表示" : "表表示";
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
  renderMapList();
  renderCards();
  renderTable();
  renderSelectedStore();
  syncMapWithFilters();
}

function renderSummary() {
  const uniqueStoreNames = new Set(state.filteredRows.map((row) => row.name));
  const allDayStores = state.filteredRows.filter((row) => row.hours.includes("24時間")).length;
  const mappableStores = state.filteredRows.filter((row) => Boolean(row.latLng || row.locationQuery)).length;

  visibleCount.textContent = String(state.filteredRows.length);
  uniqueCount.textContent = String(uniqueStoreNames.size);
  mapReadyCount.textContent = String(mappableStores);
  allDayCount.textContent = String(allDayStores);
  statusText.textContent = `${state.filteredRows.length}件を表示中`;
}

function renderMapList() {
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
    selectedStoreName.textContent = "店舗が選択されていません";
    selectedStoreMeta.textContent = "地図候補リストか一覧のボタンから店舗を選んでください。";
    selectedReviewSummary.textContent = "レビューはまだありません。";
    disableLink(selectedPhoneLink);
    disableLink(selectedPhoneSearchLink);
    disableLink(selectedMapLink);
    disableLink(selectedListingLink);
    reviewSubmitButton.disabled = true;
    reviewList.innerHTML = `<div class="empty-state compact">店舗を選ぶとレビューを表示できます。</div>`;
    return;
  }

  selectedStoreName.textContent = state.selectedRow.name;
  selectedStoreMeta.textContent = [state.selectedRow.station, state.selectedRow.hours, state.selectedRow.phone]
    .filter(Boolean)
    .join(" / ");
  selectedReviewSummary.textContent = renderReviewSummaryText(state.selectedRow);
  reviewSubmitButton.disabled = false;

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

  renderReviewList();
}

function focusRow(row) {
  state.selectedRow = row;
  renderMapList();
  renderSelectedStore();
  focusMarker(row);
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

function getReviewsForRow(row) {
  if (!row) return [];
  return [...(state.reviewsByStore[row.reviewKey] || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

  reviewList.innerHTML = reviews
    .map(
      (review) => `
        <article class="review-item">
          <div class="review-item-head">
            <div>
              <strong class="review-author">${escapeHtml(getReviewAuthorLabel(review))}</strong>
              <div class="review-meta">${renderStars(review.overallRating || 0)} / ${escapeHtml(formatReviewDate(review.createdAt))}</div>
            </div>
            <button class="review-delete-button" type="button" data-review-id="${review.id}">削除</button>
          </div>
          <div class="review-detail-grid">
            ${renderReviewDetail("訪問日", formatVisitDate(review.visitDate))}
            ${renderReviewDetail("国", formatNationality(review.nationality))}
            ${renderReviewDetail("時間", formatDuration(review.duration))}
            ${renderReviewDetail("料金", formatPrice(review.price))}
            ${renderReviewDetail("SMS", review.sms)}
            ${renderReviewDetail("メニュー", review.menu)}
            ${renderReviewDetail("明示", review.disclosure)}
            ${renderReviewDetail("シャワー", review.shower)}
            ${renderReviewDetail("マッサージ", review.massage)}
            ${renderReviewDetail("案内のわかりやすさ", review.guideClarity)}
            ${renderReviewDetail("顔", formatScore(review.faceRating))}
            ${renderReviewDetail("体", formatScore(review.bodyRating))}
            ${renderReviewDetail("性格", formatScore(review.personalityRating))}
            ${renderReviewDetail("サービス", formatScore(review.serviceRating))}
            ${renderReviewDetail("総合", formatScore(review.overallRating))}
          </div>
          ${review.comment ? `<p class="review-comment">${escapeHtml(review.comment)}</p>` : ""}
        </article>
      `
    )
    .join("");
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
  const sms = reviewSmsInput.value;
  const menu = reviewMenuInput.value;
  const disclosure = reviewDisclosureInput.value;
  const shower = reviewShowerInput.value;
  const massage = reviewMassageInput.value;
  const guideClarity = reviewGuideClarityInput.value;
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
    sms ||
    guideClarity ||
    menu ||
    disclosure ||
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
    visitDate,
    author,
    nationality,
    duration,
    price,
    sms,
    guideClarity,
    menu,
    disclosure,
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
  renderReviewAnalytics();
  renderCards();
  renderSelectedStore();
  syncMapWithFilters();
}

function handleReviewDelete(event) {
  const button = event.target.closest("[data-review-id]");
  if (!button || !state.selectedRow) return;

  const current = state.reviewsByStore[state.selectedRow.reviewKey] || [];
  state.reviewsByStore[state.selectedRow.reviewKey] = current.filter((review) => review.id !== button.dataset.reviewId);
  if (!state.reviewsByStore[state.selectedRow.reviewKey].length) {
    delete state.reviewsByStore[state.selectedRow.reviewKey];
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

window.initGoogleMapApp = function initGoogleMapApp() {
  state.map = new google.maps.Map(document.getElementById("googleMapCanvas"), {
    center: { lat: 35.083, lng: 137.156 },
    zoom: 12,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });
  state.infoWindow = new google.maps.InfoWindow();
  state.geocoder = new google.maps.Geocoder();
  state.mapReady = true;
  syncMapWithFilters();
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

  if (pendingCount > 0) {
    statusText.textContent = `${state.filteredRows.length}件を表示中 / ${pendingCount}件の位置を補完中`;
  }

  focusMarker(state.selectedRow);
}

function clearMarkers() {
  for (const marker of state.markers.values()) {
    marker.setMap(null);
  }
  state.markers.clear();
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

function buildMarkerIcon(row) {
  const latestReview = getLatestReview(row);
  let fillColor = "#9b95a4";
  let strokeColor = "#efe8f6";

  if (latestReview?.guideClarity === "あり") {
    fillColor = "#ff5d96";
    strokeColor = "#ffe3ee";
  } else if (latestReview?.guideClarity === "なし") {
    fillColor = "#ffb000";
    strokeColor = "#fff1c7";
  }

  return createHeartMarkerIcon(fillColor, strokeColor);
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
    state.infoWindow.setContent(`
      <div style="color:#28121c;min-width:180px">
        <strong>${escapeHtml(row.name)}</strong><br />
        ${escapeHtml(row.station || "-")}<br />
        ${escapeHtml(row.hours || "-")}
      </div>
    `);
    state.infoWindow.open({ map: state.map, anchor: marker });
    return;
  }

  if (row.locationQuery) {
    queueGeocode(row, true);
  }
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
