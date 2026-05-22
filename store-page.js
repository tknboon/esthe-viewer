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
const nativePageShareButton = document.querySelector("#nativePageShareButton");
const lineShareButton = document.querySelector("#lineShareButton");
const xShareButton = document.querySelector("#xShareButton");
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
  nativePageShareButton?.addEventListener("click", handleNativePageShare);
}

function findRequestedRow() {
  const params = new URLSearchParams(window.location.search);
  const requestedId = document.body?.dataset.storeId || params.get("id") || params.get("store") || "";
  if (!requestedId) return null;
  const normalizedRequestedId = decodeURIComponent(requestedId).trim();

  return state.rows.find((row) => {
    const ids = [getStorePageId(row), getStorePageSlug(row), row.reviewKey, row.listingUrl, row.id].filter(Boolean);
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
  setMeta("twitter:title", title);
  setMeta("twitter:description", description);
  updateShareLinks(title, window.location.href);

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

async function handleNativePageShare() {
  const title = state.row?.name ? `${state.row.name} | 愛知県のアジアンエステ` : document.title;
  const text = state.row ? buildDescription(state.row, getStoreProfile(state.row) || {}, getReviewsForRow(state.row)) : "愛知県のアジアンエステ店舗情報";

  if (!navigator.share) {
    await handleCopyPageUrl();
    return;
  }

  try {
    await navigator.share({ title, text, url: window.location.href });
    if (copyStatusText) copyStatusText.textContent = "共有を開きました。";
  } catch (error) {
    if (error?.name !== "AbortError" && copyStatusText) {
      copyStatusText.textContent = "共有を開けませんでした。";
    }
  }
}

function updateShareLinks(title, url) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  if (lineShareButton) {
    lineShareButton.href = `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`;
  }
  if (xShareButton) {
    xShareButton.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
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

const STORE_PAGE_STATION_SLUGS = {
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
};

function romanizeStorePageText(value) {
  const kanaMap = {
    ア: "a", イ: "i", ウ: "u", エ: "e", オ: "o",
    カ: "ka", キ: "ki", ク: "ku", ケ: "ke", コ: "ko",
    サ: "sa", シ: "shi", ス: "su", セ: "se", ソ: "so",
    タ: "ta", チ: "chi", ツ: "tsu", テ: "te", ト: "to",
    ナ: "na", ニ: "ni", ヌ: "nu", ネ: "ne", ノ: "no",
    ハ: "ha", ヒ: "hi", フ: "fu", ヘ: "he", ホ: "ho",
    マ: "ma", ミ: "mi", ム: "mu", メ: "me", モ: "mo",
    ヤ: "ya", ユ: "yu", ヨ: "yo",
    ラ: "ra", リ: "ri", ル: "ru", レ: "re", ロ: "ro",
    ワ: "wa", ヲ: "wo", ン: "n",
    ガ: "ga", ギ: "gi", グ: "gu", ゲ: "ge", ゴ: "go",
    ザ: "za", ジ: "ji", ズ: "zu", ゼ: "ze", ゾ: "zo",
    ダ: "da", ヂ: "ji", ヅ: "zu", デ: "de", ド: "do",
    バ: "ba", ビ: "bi", ブ: "bu", ベ: "be", ボ: "bo",
    パ: "pa", ピ: "pi", プ: "pu", ペ: "pe", ポ: "po",
    ァ: "a", ィ: "i", ゥ: "u", ェ: "e", ォ: "o",
    ャ: "ya", ュ: "yu", ョ: "yo", ッ: "", ー: "-",
  };
  const katakana = String(value || "").replace(/[\u3041-\u3096]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
  return Array.from(katakana).map((char) => kanaMap[char] || char).join("");
}

function slugStorePagePart(value) {
  return romanizeStorePageText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

function getStorePageSlug(row) {
  const stableId = getStorePageId(row);
  const shortId = stableId.replace(/-/g, "").slice(0, 8);
  const primaryStation = String(row?.station || "").split(/[・/／,、\s]+/).find(Boolean) || "";
  const stationSlug = STORE_PAGE_STATION_SLUGS[primaryStation] || slugStorePagePart(primaryStation.replace(/駅|ルーム/g, ""));
  const nameSlug = slugStorePagePart(row?.name || "");
  const readable = [stationSlug, nameSlug].filter((part) => part && part.length >= 2).join("-").slice(0, 72).replace(/-+$/g, "");
  return `${readable || "store"}-${shortId}`;
}

function getStorePageUrl(row) {
  return `${getRootPath()}/stores/${encodeURIComponent(getStorePageSlug(row))}.html`;
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
