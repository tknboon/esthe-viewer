const state = {
  rows: [],
  row: null,
  reviewsByStore: {},
  storeProfilesByKey: {},
  favoritesByStore: {},
  excludedByStore: {},
};

const storePageTitle = document.querySelector("#storePageTitle");
const storeName = document.querySelector("#storeName");
const storeStation = document.querySelector("#storeStation");
const storeBadges = document.querySelector("#storeBadges");
const storeInfoGrid = document.querySelector("#storeInfoGrid");
const storeActions = document.querySelector("#storeActions");
const reviewSummary = document.querySelector("#reviewSummary");
const reviewList = document.querySelector("#reviewList");
const nearbyStoreList = document.querySelector("#nearbyStoreList");
const copyPageUrlButton = document.querySelector("#copyPageUrlButton");
const copyStatusText = document.querySelector("#copyStatusText");

const MANUAL_STATION_OVERRIDES = {
  "https://www.esthe-ranking.jp/sakae/shop-detail/f2e48aef-65d9-4065-8b47-e367232c1384/": "丸の内駅・伏見駅",
};

initStorePage();

function initStorePage() {
  state.rows = (window.storeData || []).map(normalizeRow);
  state.reviewsByStore = readLocalObject("toyota-esthe-reviews");
  state.storeProfilesByKey = readLocalObject("toyota-esthe-store-profiles");
  state.favoritesByStore = readLocalObject("toyota-esthe-favorites");
  state.excludedByStore = readLocalObject("toyota-esthe-excluded");
  state.row = findRequestedRow();

  bindEvents();
  renderPage();
  startSharedRead();
}

function bindEvents() {
  copyPageUrlButton?.addEventListener("click", handleCopyPageUrl);
}

function findRequestedRow() {
  const params = new URLSearchParams(window.location.search);
  const requestedId = document.body?.dataset.storeId || params.get("id") || params.get("store") || "";
  if (!requestedId) return null;
  const normalizedRequestedId = decodeURIComponent(requestedId).trim();

  return state.rows.find((row) => {
    const ids = [getStorePageId(row), row.reviewKey, row.listingUrl, row.id].filter(Boolean);
    return ids.includes(normalizedRequestedId);
  }) || null;
}

function normalizeRow(row, index) {
  const name = row["店舗名"] || "";
  const listingUrl = row["掲載URL"] || "";
  const station = MANUAL_STATION_OVERRIDES[listingUrl] || row["最寄駅"] || "";
  const location = row["住所または座標"] || "";
  const latitude = row["緯度"] || "";
  const longitude = row["経度"] || "";
  const officialUrl = row["オフィシャルHP"] || row["公式HP"] || window.storeMeta?.officialUrlByListingUrl?.[listingUrl] || "";
  const notes = row["備考"] || "";
  const phone = row["電話番号"] || row["電話"] || "";
  const hours = row["営業時間"] || row["営業"] || "";
  const municipality = window.storeMeta?.municipalityByListingUrl?.[listingUrl] || "";
  const municipalityLabels = window.storeMeta?.municipalityLabelsByListingUrl?.[listingUrl] || [];
  const locationQuery = latitude && longitude ? `${latitude},${longitude}` : buildLocationQuery(name, station, location, notes);

  return {
    id: `${name}-${station}-${index}`,
    reviewKey: listingUrl || `${name}__${station || location || index}`,
    name,
    station,
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
    locationQuery,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`,
    hasCoordinates: Boolean(latitude && longitude),
  };
}

function buildLocationQuery(name, station, location, notes) {
  return [location, station, name, notes].filter(Boolean).join(" ");
}

function renderPage() {
  if (!state.row) {
    document.title = "店舗が見つかりません | 愛知県のアジアンエステ";
    if (storePageTitle) storePageTitle.textContent = "店舗が見つかりません";
    if (storeName) storeName.textContent = "店舗が見つかりません";
    if (storeStation) storeStation.textContent = "URLを確認してください。";
    if (storeInfoGrid) storeInfoGrid.innerHTML = `<div class="empty-state">指定された店舗情報を表示できませんでした。</div>`;
    if (reviewList) reviewList.innerHTML = `<div class="empty-state compact">レビューは表示できません。</div>`;
    if (nearbyStoreList) nearbyStoreList.innerHTML = `<div class="empty-state compact">候補はありません。</div>`;
    return;
  }

  const row = state.row;
  const profile = getStoreProfile(row) || {};
  const reviews = getReviewsForRow(row);
  const title = `${row.name} | 愛知県のアジアンエステ`;
  const description = buildDescription(row, profile, reviews);

  document.title = title;
  setMeta("description", description);
  setMeta("og:title", title, "property");
  setMeta("og:description", description, "property");
  setMeta("og:url", window.location.href, "property");

  if (storePageTitle) storePageTitle.textContent = row.name || "店舗情報";
  if (storeName) storeName.textContent = row.name || "店舗情報";
  if (storeStation) storeStation.textContent = [row.station, row.municipality].filter(Boolean).join(" / ");
  renderBadges(row, profile);
  renderInfo(row, profile, reviews);
  renderActions(row);
  renderReviews(reviews);
  renderNearby(row);
}

function buildDescription(row, profile, reviews) {
  const parts = [
    row.station,
    profile.address || row.location,
    row.hours ? `営業時間 ${row.hours}` : "",
    reviews.length ? `レビュー ${reviews.length}件` : "",
  ].filter(Boolean);
  return `${row.name}の店舗情報。${parts.join("、")}。`;
}

function setMeta(name, content, attr = "name") {
  const selector = `meta[${attr}="${name}"]`;
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function renderBadges(row, profile) {
  if (!storeBadges) return;
  const badges = [
    row.hasCoordinates ? "座標あり" : "駅名/住所検索",
    row.hours.includes("24時間") ? "24時間" : "",
    profile.guideClarity === "あり" ? "真心あり" : "",
    state.favoritesByStore[row.reviewKey] ? "確認済み" : "",
    state.excludedByStore[row.reviewKey] ? "除外" : "",
  ].filter(Boolean);
  storeBadges.innerHTML = badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("");
}

function renderInfo(row, profile, reviews) {
  if (!storeInfoGrid) return;
  const fields = [
    ["営業時間", escapeHtml(row.hours)],
    ["電話番号", row.phone ? `<a href="tel:${escapeAttribute(row.phone)}">${escapeHtml(row.phone)}</a>` : ""],
    ["最寄り", escapeHtml(row.station)],
    ["住所・場所", escapeHtml(profile.address || row.location)],
    ["備考", escapeHtml(profile.note || row.notes)],
    ["SMS", escapeHtml(profile.sms)],
    ["メニュー", escapeHtml(profile.menu)],
    ["明示", escapeHtml(profile.disclosure)],
    ["真心", escapeHtml(profile.guideClarity)],
    ["レビュー", reviews.length ? escapeHtml(renderReviewSummaryText(reviews)) : ""],
  ];

  storeInfoGrid.innerHTML = fields
    .filter(([, value]) => value)
    .map(([label, value]) => `
      <div class="field">
        <span class="field-label">${escapeHtml(label)}</span>
        <span class="field-value">${value}</span>
      </div>
    `)
    .join("") || `<div class="empty-state">表示できる店舗情報がありません。</div>`;
}

function renderActions(row) {
  if (!storeActions) return;
  const links = [
    row.phone ? `<a class="action-link" href="tel:${escapeAttribute(row.phone)}">電話</a>` : "",
    row.mapUrl ? `<a class="action-link primary" href="${escapeAttribute(row.mapUrl)}" target="_blank" rel="noreferrer">Googleマップ</a>` : "",
    row.officialUrl ? `<a class="action-link" href="${escapeAttribute(row.officialUrl)}" target="_blank" rel="noreferrer">オフィシャルHP</a>` : "",
    row.listingUrl ? `<a class="action-link" href="${escapeAttribute(row.listingUrl)}" target="_blank" rel="noreferrer">掲載ページ</a>` : "",
    `<a class="action-link" href="${escapeAttribute(getRootPath())}/index.html?store=${encodeURIComponent(getStorePageId(row))}">地図で見る</a>`,
  ].filter(Boolean);
  storeActions.innerHTML = links.join("");
}

function renderReviews(reviews) {
  if (reviewSummary) reviewSummary.textContent = reviews.length ? renderReviewSummaryText(reviews) : "0件";
  if (!reviewList) return;
  if (!reviews.length) {
    reviewList.innerHTML = `<div class="empty-state compact">レビューはまだありません。</div>`;
    return;
  }
  reviewList.innerHTML = reviews.map(renderReviewItem).join("");
}

function renderReviewItem(review) {
  return `
    <article class="review-item">
      <div class="review-item-head">
        <div>
          <strong>${escapeHtml(review.author || "不明")}</strong>
          <div class="review-meta">${renderStars(review.overallRating || 0)} / ${escapeHtml(formatReviewDate(review.createdAt))}</div>
        </div>
      </div>
      <div class="review-detail-grid">
        ${renderReviewDetail("訪問日", formatVisitDate(review.visitDate))}
        ${renderReviewDetail("国", formatNationality(review.nationality))}
        ${renderReviewDetail("時間", review.duration ? `${review.duration}分` : "")}
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

function renderReviewDetail(label, value) {
  if (!value) return "";
  return `
    <div class="review-detail-item">
      <span class="review-detail-label">${escapeHtml(label)}</span>
      <span class="review-detail-value">${escapeHtml(value)}</span>
    </div>
  `;
}

function renderNearby(row) {
  if (!nearbyStoreList) return;
  const targetStation = normalizeComparable(row.station);
  const targetMunicipality = normalizeComparable(row.municipality);
  const candidates = state.rows
    .filter((candidate) => candidate.reviewKey !== row.reviewKey)
    .filter((candidate) => {
      if (targetStation && normalizeComparable(candidate.station) === targetStation) return true;
      if (targetMunicipality && normalizeComparable(candidate.municipality) === targetMunicipality) return true;
      return false;
    })
    .slice(0, 8);

  if (!candidates.length) {
    nearbyStoreList.innerHTML = `<div class="empty-state compact">近くの候補はありません。</div>`;
    return;
  }

  nearbyStoreList.innerHTML = candidates.map((candidate) => `
    <a class="nearby-store-item" href="${escapeAttribute(getStorePageUrl(candidate))}">
      <span>${escapeHtml(candidate.name)}</span>
      <small>${escapeHtml(candidate.station || candidate.municipality || "")}</small>
    </a>
  `).join("");
}

function startSharedRead() {
  const config = window.firebaseConfig || {};
  if (!config.enabled || !window.firebase?.initializeApp || !window.firebase?.firestore) return;

  try {
    const app = window.firebase.apps?.length ? window.firebase.app() : window.firebase.initializeApp(config);
    const db = app.firestore();
    ["reviews", "storeProfiles", "favorites", "excluded"].forEach((docId) => {
      db.collection("sharedState").doc(docId).onSnapshot((snapshot) => {
        if (!snapshot.exists) return;
        const payload = snapshot.data()?.payload;
        if (!payload || typeof payload !== "object") return;
        if (docId === "reviews") state.reviewsByStore = payload;
        if (docId === "storeProfiles") state.storeProfilesByKey = payload;
        if (docId === "favorites") state.favoritesByStore = payload;
        if (docId === "excluded") state.excludedByStore = payload;
        renderPage();
      });
    });
  } catch (error) {
    console.warn("Shared data could not be loaded.", error);
  }
}

async function handleCopyPageUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    if (copyStatusText) copyStatusText.textContent = "URLをコピーしました。";
  } catch (error) {
    if (copyStatusText) copyStatusText.textContent = "コピーできませんでした。";
  }
}

function getStoreProfile(row) {
  if (!row) return null;
  return state.storeProfilesByKey[row.reviewKey] || null;
}

function getReviewsForRow(row) {
  if (!row) return [];
  return [...(state.reviewsByStore[row.reviewKey] || [])].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function renderReviewSummaryText(reviews) {
  if (!reviews.length) return "";
  const average = reviews.reduce((sum, review) => sum + (review.overallRating || 0), 0) / reviews.length;
  return `${reviews.length}件 / 平均 ${average.toFixed(1)} / 5.0`;
}

function getStorePageId(row) {
  const match = String(row?.listingUrl || "").match(/shop-detail\/([^/]+)\//);
  return match?.[1] || encodeURIComponent(row?.reviewKey || row?.id || "");
}

function getStorePageUrl(row) {
  return `${getRootPath()}/stores/${encodeURIComponent(getStorePageId(row))}.html`;
}

function getRootPath() {
  return document.body?.dataset.rootPath || ".";
}

function readLocalObject(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
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

function formatPrice(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${new Intl.NumberFormat("ja-JP").format(value)}円`
    : "";
}

function formatScore(value) {
  return value ? `${value} / 5` : "";
}

function renderStars(value) {
  const score = Number(value) || 0;
  return `${"★".repeat(score)}${"☆".repeat(Math.max(0, 5 - score))}`;
}

function formatNationality(value) {
  const normalized = String(value || "").trim();
  return normalized || "不明";
}

function normalizeComparable(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
