const STORAGE_KEY = "wildcard-yaml-builder-state-v1";
const KEY_LIBRARY_STORAGE_KEY = "wildcard-yaml-builder-key-library-v1";

const templates = {
  character: {
    delivery_cast_character: [
      "__delivery_cast_age__, __delivery_cast_body__, __delivery_cast_face__, __delivery_cast_hair__",
    ],
    delivery_cast_age: ["young adult woman", "mature adult woman", "elegant adult woman"],
    delivery_cast_body: ["slender body", "soft curvy body", "balanced figure", "natural medium bust"],
    delivery_cast_face: ["gentle facial features", "cool mature facial features", "seductive facial features"],
    delivery_cast_hair: [
      "long brown hair, side swept bangs",
      "short black bob hair, neat bangs",
      "wavy blonde hair, parted bangs",
      "two-tone hair, pale pink inner color, long hair",
    ],
  },
  outfitScene: {
    outfit_scene: ["__swimsuit_beach__", "__lingerie_bedroom__", "__dress_lounge__", "__casual_cafe__"],
    swimsuit_beach: ["__swimsuit_outfit__, __beach_background__"],
    lingerie_bedroom: ["__lingerie_outfit__, __bedroom_background__"],
    dress_lounge: ["__dress_outfit__, __lounge_background__"],
    casual_cafe: ["__casual_outfit__, __cafe_background__"],
    swimsuit_outfit: ["pale blue bikini, matching hair ribbon", "white one-piece swimsuit, sheer cover-up"],
    lingerie_outfit: ["ivory lace lingerie, matching lingerie set", "rose pink satin lingerie, delicate lace trim"],
    dress_outfit: ["wine red cocktail dress, gold necklace", "lavender satin slip dress, pearl earrings"],
    casual_outfit: ["cream cardigan, simple blouse, long pleated skirt", "mint green knit cardigan, hair ribbon, midi skirt"],
    beach_background: ["beach, ocean, summer sunlight", "resort poolside, sparkling water"],
    bedroom_background: ["hotel bedroom, warm bedside light", "luxury bedroom, soft shadows"],
    lounge_background: ["hotel lounge, city lights, warm night lighting", "bar lounge, elegant interior"],
    cafe_background: ["sunny cafe terrace, flowers, bright natural light", "book cafe, warm daylight"],
  },
  colorMatch: {
    lingerie_color: ["ivory", "champagne", "rose pink", "pale blue", "lavender", "mint green", "wine red"],
    lingerie_color_matched: [
      "${accent_color=!__lingerie_color__} ${accent_color} lace bra, ${accent_color} panties, ${accent_color} hair ribbon, matching lingerie set, hotel bedroom, warm bedside light",
    ],
  },
  hairCycle: {
    hair_cycle_style: [
      "very short hair",
      "short bob hair",
      "medium hair",
      "long hair",
      "ponytail",
      "side ponytail",
      "twin braids",
      "single braid",
      "wavy hair",
      "curly hair",
    ],
  },
};

let state = loadState();
let keyLibrary = loadKeyLibrary();
let selectedKey = Object.keys(state.data)[0] || "";
let draggedKey = "";
let pointerDraggedYamlKey = "";
let keyNameSuggestionIndex = -1;
let keyNameSuggestionCache = { key: "", items: [] };
const HISTORY_LIMIT = 50;
let undoStack = [];
let redoStack = [];

const keyList = document.getElementById("keyList");
const keyNameField = document.getElementById("keyNameField");
const keyNameInput = document.getElementById("keyNameInput");
const keyNameSuggestions = document.getElementById("keyNameSuggestions");
const keyLabelInput = document.getElementById("keyLabelInput");
const selectedKeyDepthBadge = document.getElementById("selectedKeyDepthBadge");
const itemTextarea = document.getElementById("itemTextarea");
const candidateDropZone = document.getElementById("candidateDropZone");
const candidatePreview = document.getElementById("candidatePreview");
const yamlOutput = document.getElementById("yamlOutput");
const promptOutput = document.getElementById("promptOutput");
const coloredYamlOutput = document.getElementById("coloredYamlOutput");
const coloredPromptOutput = document.getElementById("coloredPromptOutput");
const checkOutput = document.getElementById("checkOutput");
const graphOutput = document.getElementById("graphOutput");
const statusText = document.getElementById("statusText");
const templateSelect = document.getElementById("templateSelect");
const fileInput = document.getElementById("fileInput");
const keyLibraryList = document.getElementById("keyLibraryList");
const libraryFileInput = document.getElementById("libraryFileInput");
const chooseYamlFolderButton = document.getElementById("chooseYamlFolderButton");
const yamlFolderStatus = document.getElementById("yamlFolderStatus");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");

let yamlDirectoryHandle = null;

function defaultState() {
  return {
    data: {
      new_wildcard: ["sample tag"],
    },
    labels: {
      new_wildcard: "新規Wildcard",
    },
    disabledKeys: {},
    sequentialKeys: {},
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const loaded = raw ? JSON.parse(raw) : defaultState();
    return normalizeState(loaded);
  } catch {
    return defaultState();
  }
}

function normalizeState(value) {
  const fallback = defaultState();
  const data = value && value.data && typeof value.data === "object" ? value.data : fallback.data;
  const labels = value && value.labels && typeof value.labels === "object" ? value.labels : {};
  const disabledKeys = value && value.disabledKeys && typeof value.disabledKeys === "object" ? value.disabledKeys : {};
  const sequentialKeys = value && value.sequentialKeys && typeof value.sequentialKeys === "object" ? value.sequentialKeys : {};
  return { data, labels, disabledKeys, sequentialKeys };
}

function ensureStateMetaMaps() {
  if (!state.labels || typeof state.labels !== "object") state.labels = {};
  if (!state.disabledKeys || typeof state.disabledKeys !== "object") state.disabledKeys = {};
  if (!state.sequentialKeys || typeof state.sequentialKeys !== "object") state.sequentialKeys = {};
}

function resetStateMeta() {
  state.labels = {};
  state.disabledKeys = {};
  state.sequentialKeys = {};
}

function moveKeyMeta(fromKey, toKey, fallbackLabel = "") {
  ensureStateMetaMaps();
  const wasDisabled = !!state.disabledKeys[fromKey];
  const wasSequential = !!state.sequentialKeys[fromKey];
  const nextLabel = fallbackLabel || state.labels[fromKey] || "";

  delete state.labels[fromKey];
  delete state.disabledKeys[fromKey];
  delete state.sequentialKeys[fromKey];

  if (nextLabel) state.labels[toKey] = nextLabel;
  if (wasDisabled) state.disabledKeys[toKey] = true;
  if (wasSequential) state.sequentialKeys[toKey] = true;
}

function copyKeyMeta(fromKey, toKey, labelSuffix = "") {
  ensureStateMetaMaps();
  if (state.labels[fromKey]) state.labels[toKey] = `${state.labels[fromKey]}${labelSuffix}`;
  if (state.disabledKeys[fromKey]) state.disabledKeys[toKey] = true;
  if (state.sequentialKeys[fromKey]) state.sequentialKeys[toKey] = true;
}

function deleteKeyMeta(key) {
  ensureStateMetaMaps();
  delete state.labels[key];
  delete state.disabledKeys[key];
  delete state.sequentialKeys[key];
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  statusText.textContent = "自動保存済み";
}

function snapshotState() {
  return JSON.stringify({ state, selectedKey });
}

function restoreSnapshot(snapshot) {
  const parsed = JSON.parse(snapshot);
  state = normalizeState(parsed.state);
  selectedKey = parsed.selectedKey && state.data[parsed.selectedKey] ? parsed.selectedKey : Object.keys(state.data)[0] || "";
}

function updateHistoryButtons() {
  if (undoButton) undoButton.disabled = !undoStack.length;
  if (redoButton) redoButton.disabled = !redoStack.length;
}

function pushUndoSnapshot() {
  const snapshot = snapshotState();
  if (undoStack[undoStack.length - 1] === snapshot) return;
  undoStack.push(snapshot);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  updateHistoryButtons();
}

function undoState() {
  if (!undoStack.length) return;
  redoStack.push(snapshotState());
  restoreSnapshot(undoStack.pop());
  render();
  statusText.textContent = "元に戻しました";
}

function redoState() {
  if (!redoStack.length) return;
  undoStack.push(snapshotState());
  restoreSnapshot(redoStack.pop());
  render();
  statusText.textContent = "やり直しました";
}

function loadKeyLibrary() {
  try {
    const raw = localStorage.getItem(KEY_LIBRARY_STORAGE_KEY);
    return normalizeKeyLibrary(raw ? JSON.parse(raw) : {});
  } catch {
    return {};
  }
}

function normalizeKeyLibrary(value) {
  const source = value && value.savedKeys && typeof value.savedKeys === "object" ? value.savedKeys : value;
  if (!source || typeof source !== "object") return {};
  return Object.fromEntries(
    Object.entries(source)
      .filter(([, entry]) => entry && Array.isArray(entry.items))
      .map(([key, entry]) => [
        normalizeKeyName(key),
        {
          label: typeof entry.label === "string" ? entry.label : "",
          items: entry.items.map((item) => String(item)),
          savedAt: typeof entry.savedAt === "string" ? entry.savedAt : "",
        },
      ])
      .filter(([key]) => key)
  );
}

function saveKeyLibrary() {
  localStorage.setItem(KEY_LIBRARY_STORAGE_KEY, JSON.stringify({ savedKeys: keyLibrary }));
}

function normalizeKeyName(value) {
  // NAI Smart Studio wildcard名として扱いやすいように、空白とハイフンは "_" に寄せる。
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_/-]/g, "")
    .replace(/-+/g, "_")
    .toLowerCase();
}

// 上から順に評価されるため、具体的なルールを先に置く。
const labelRules = [
  [/outfit.*scene|scene.*outfit/, "服装×背景"],
  [/swimsuit.*beach|beach.*swimsuit/, "水着×ビーチ"],
  [/lingerie.*bedroom|bedroom.*lingerie/, "下着×寝室"],
  [/dress.*lounge|lounge.*dress/, "ドレス×ラウンジ"],
  [/casual.*cafe|cafe.*casual/, "カジュアル×カフェ"],
  [/service.*cast|delivery.*health|soapland|mens.*esthe|escort|call.*girl/, "サービスキャスト"],
  [/condom.*missionary|missionary.*condom|protected.*missionary|missionary.*protected/, "ゴムあり正常位"],
  [/raw.*missionary|missionary.*raw|bareback.*missionary|missionary.*bareback|unprotected.*missionary|missionary.*unprotected/, "ゴムなし正常位"],
  [/missionary.*creampie|creampie.*missionary|missionary.*inside.*finish|inside.*finish.*missionary/, "正常位中出し後"],
  [/reverse.*cowgirl|cowgirl.*reverse/, "逆騎乗位"],
  [/ekiben|carry.*sex|standing.*carry|carried.*sex/, "駅弁"],
  [/prone.*bone|prone.*sex|lying.*stomach/, "寝バック"],
  [/sitting.*sex|seated.*sex|zai|lap.*sex/, "座位"],
  [/standing.*doggy|doggy.*standing|stand.*back|back.*standing|standing.*back/, "立ちバック"],
  [/doggy.*style|doggystyle|doggy|from.*behind|rear.*entry/, "後背位"],
  [/cowgirl|woman.*on.*top|riding/, "騎乗位"],
  [/missionary/, "正常位"],
  [/fellatio|blowjob|oral.*sex|oral/, "口・フェラ"],
  [/cunnilingus|male.*mouth.*pussy|lick.*vagina|lick.*clitoris/, "クンニ"],
  [/paizuri|breast.*job|tit.*job/, "パイズリ"],
  [/handjob|fingering|foreplay|fondling|caress/, "前戯"],
  [/creampie|inside.*finish|internal.*ejaculation|cum.*inside/, "中出し"],
  [/cumdrip|cum.*drip|after.*ejaculation|after.*sex|afterglow/, "余韻"],
  [/ejaculation|cumshot|outside.*finish|cum.*on|facial/, "射精"],
  [/condom|protected/, "ゴムあり"],
  [/bareback|raw|unprotected/, "ゴムなし"],
  [/sex|intercourse|penetration|intimate.*scene/, "親密行為"],
  [/body.*surface|surface.*body|skin.*detail|detail.*skin|skin.*texture|texture.*skin/, "肌質感"],
  [/skin.*color|color.*skin|skin.*tone|tone.*skin/, "肌色"],
  [/pubic.*hair|hair.*pubic|pubes|shaved|hairy/, "陰毛"],
  [/labia.*shape|shape.*labia|labia/, "ラビア"],
  [/clitoris|clit/, "クリトリス"],
  [/vulva|vagina|pussy|crotch|groin|cameltoe/, "陰部"],
  [/nipple|areola/, "乳首"],
  [/anus|anal/, "アナル"],
  [/wetness|wet.*body|body.*fluid|fluid|semen|cum/, "体液"],
  [/genital|intimate.*detail/, "性器詳細"],
  [/nude|naked|topless|bottomless|undressed/, "ヌード"],
  [/breast.*size|bust.*size|chest.*size/, "胸サイズ"],
  [/breast|bust|chest/, "胸"],
  [/waist/, "ウエスト"],
  [/hip|hips/, "腰・尻"],
  [/thigh|leg/, "脚"],
  [/height/, "身長"],
  [/body|figure|physique|shape/, "体型"],
  [/age/, "年齢"],
  [/hair.*length|length.*hair/, "髪の長さ"],
  [/hair.*volume|volume.*hair/, "髪の量"],
  [/hair.*color|color.*hair/, "髪色"],
  [/two.*tone|two_tone|inner.*color|color.*inner|highlight.*hair|hair.*highlight/, "髪アクセント"],
  [/bangs|fringe/, "前髪"],
  [/side.*lock|sidelock/, "横髪"],
  [/braid/, "三つ編み"],
  [/ponytail|twin.*tail|twintail|bun|updo/, "まとめ髪"],
  [/ahoge|cowlick/, "アホ毛"],
  [/hair.*style|style.*hair|hairstyle|hair/, "髪型"],
  [/eye.*color|color.*eye|iris.*color|color.*iris/, "目の色"],
  [/eye.*shape|shape.*eye|eyes/, "目の形"],
  [/iris|catchlight|multi.*layered/, "瞳ディテール"],
  [/eyelash|eyebrow/, "目元"],
  [/mouth|smile|lip/, "口元"],
  [/makeup|cosmetic/, "メイク"],
  [/blush/, "赤面"],
  [/face|facial/, "顔"],
  [/expression|emotion/, "表情"],
  [/outfit.*pattern|clothing.*pattern|pattern|print/, "服の柄"],
  [/fabric|material|texture/, "素材"],
  [/lingerie.*color|color.*lingerie/, "下着色"],
  [/swimsuit.*color|color.*swimsuit|bikini.*color|color.*bikini/, "水着色"],
  [/dress.*color|color.*dress/, "ドレス色"],
  [/accessory.*color|color.*accessory|ribbon.*color|color.*ribbon/, "小物色"],
  [/underwear|panties|bra|lingerie/, "下着"],
  [/swimsuit|bikini/, "水着"],
  [/dress|gown/, "ドレス"],
  [/blouse|shirt|cardigan|knit|skirt|pants|jacket|coat/, "服"],
  [/outfit|clothes|fashion|costume|apparel/, "衣装"],
  [/ribbon/, "リボン"],
  [/jewelry|jewellery|earring|necklace|bracelet|ring/, "アクセサリー"],
  [/glasses|hat|bag|shoes|stocking|socks|garter/, "小物"],
  [/accessory|prop|item/, "小物"],
  [/bedroom|hotel.*room|room.*hotel/, "寝室"],
  [/beach|ocean|sea|pool/, "ビーチ"],
  [/cafe|terrace/, "カフェ"],
  [/lounge|bar/, "ラウンジ"],
  [/garden|park|flower/, "庭・公園"],
  [/street|city|night.*view|view.*night/, "街"],
  [/office|workplace/, "オフィス"],
  [/bathroom|bath|onsen|shower/, "浴室"],
  [/studio/, "スタジオ"],
  [/kitchen|living.*room|room/, "室内"],
  [/background|scene|location|place/, "背景"],
  [/backlight|rim.*light|light.*rim/, "リムライト"],
  [/catchlight/, "キャッチライト"],
  [/chiaroscuro/, "明暗法"],
  [/depth.*field|dof/, "被写界深度"],
  [/lighting|light|illumination/, "光"],
  [/camera|angle|view|shot/, "カメラ"],
  [/composition|framing/, "構図"],
  [/hand.*pose|pose.*hand/, "手のポーズ"],
  [/spread.*legs|legs.*spread|open.*legs/, "脚のポーズ"],
  [/pose|standing|sitting|kneeling/, "ポーズ"],
  [/style|render|rendering|aesthetic|quality/, "画風"],
  [/negative|bad|avoid/, "ネガティブ"],
  [/prompt|seq|cycle|random|variant/, "プロンプト制御"],
  [/color|colour|palette/, "色"],
  [/character|cast|person/, "キャラクター"],
];

const fallbackTokenLabels = {
  age: "年齢",
  body: "体型",
  bust: "胸",
  breast: "胸",
  chest: "胸",
  figure: "体型",
  face: "顔",
  facial: "顔",
  hair: "髪",
  color: "色",
  colour: "色",
  style: "画風",
  length: "長さ",
  volume: "量",
  eye: "目",
  eyes: "目",
  iris: "瞳",
  shape: "形",
  outfit: "衣装",
  clothes: "服",
  clothing: "服",
  fashion: "ファッション",
  scene: "背景",
  background: "背景",
  room: "室内",
  bedroom: "寝室",
  beach: "ビーチ",
  cafe: "カフェ",
  lounge: "ラウンジ",
  hotel: "ホテル",
  garden: "庭",
  lighting: "光",
  light: "光",
  pose: "ポーズ",
  hand: "手",
  accessory: "小物",
  ribbon: "リボン",
  lingerie: "下着",
  swimsuit: "水着",
  dress: "ドレス",
  casual: "カジュアル",
  resort: "リゾート",
  pattern: "柄",
  print: "プリント",
  material: "素材",
  fabric: "生地",
  skin: "肌",
  detail: "詳細",
  texture: "質感",
  expression: "表情",
  nsfw: "成人向け",
  adult: "成人向け",
  intimate: "親密",
  sex: "親密行為",
  position: "体位",
  missionary: "正常位",
  cowgirl: "騎乗位",
  reverse: "逆",
  ekiben: "駅弁",
  carry: "抱え",
  doggy: "後背位",
  oral: "口・フェラ",
  fellatio: "口・フェラ",
  blowjob: "口・フェラ",
  creampie: "中出し",
  condom: "ゴムあり",
  raw: "ゴムなし",
  nude: "ヌード",
  naked: "ヌード",
  bra: "ブラ",
  panties: "ショーツ",
  bikini: "ビキニ",
  pubic: "陰毛",
  labia: "ラビア",
  clitoris: "クリトリス",
  quality: "品質",
};

function inferLabelFromKey(key) {
  const normalized = key.toLowerCase();
  const match = labelRules.find(([pattern]) => pattern.test(normalized));
  if (match) return match[1];
  const cleaned = normalized
    .replace(/^(delivery_cast|test|sample|nai|wildcard)_/, "")
    .replace(/_wildcard$/, "");
  const tokens = cleaned.split(/[_/-]+/).filter(Boolean);
  if (!tokens.length) return key;
  return tokens.map((token) => fallbackTokenLabels[token] || token).join(" / ");
}

function labelForKey(key) {
  const label = state.labels?.[key]?.trim();
  return label || inferLabelFromKey(key);
}

const keyNameSuggestionSeeds = [
  ["delivery_cast_character", "キャラクター一式", "キャラクター"],
  ["delivery_cast_age", "年齢", "キャラクター"],
  ["delivery_cast_body", "体型", "キャラクター"],
  ["delivery_cast_height", "身長", "キャラクター"],
  ["delivery_cast_bust_size", "胸サイズ", "キャラクター"],
  ["delivery_cast_skin_tone", "肌色", "キャラクター"],
  ["delivery_cast_skin_texture", "肌質感", "キャラクター"],
  ["delivery_cast_hair_style", "髪型", "髪・顔"],
  ["delivery_cast_hair_length", "髪の長さ", "髪・顔"],
  ["delivery_cast_hair_color", "髪色", "髪・顔"],
  ["delivery_cast_hair_volume", "髪の量", "髪・顔"],
  ["delivery_cast_bangs", "前髪", "髪・顔"],
  ["delivery_cast_eye_shape", "目の形", "髪・顔"],
  ["delivery_cast_eye_color", "目の色", "髪・顔"],
  ["delivery_cast_face", "顔", "髪・顔"],
  ["delivery_cast_outfit_scene", "服装＋背景", "服装・背景"],
  ["delivery_cast_lingerie_bedroom", "下着＋寝室", "服装・背景"],
  ["delivery_cast_swimsuit_beach", "水着＋ビーチ", "服装・背景"],
  ["delivery_cast_dress_lounge", "ドレス＋ラウンジ", "服装・背景"],
  ["delivery_cast_casual_cafe", "カジュアル＋カフェ", "服装・背景"],
  ["delivery_cast_outfit", "衣装", "服装・背景"],
  ["delivery_cast_lingerie_outfit", "下着衣装", "服装・背景"],
  ["delivery_cast_swimsuit_outfit", "水着衣装", "服装・背景"],
  ["delivery_cast_dress_outfit", "ドレス衣装", "服装・背景"],
  ["delivery_cast_background", "背景", "服装・背景"],
  ["delivery_cast_bedroom_background", "寝室背景", "服装・背景"],
  ["delivery_cast_beach_background", "ビーチ背景", "服装・背景"],
  ["delivery_cast_accent_color", "差し色", "色・小物"],
  ["delivery_cast_lingerie_color", "下着色", "色・小物"],
  ["delivery_cast_swimsuit_color", "水着色", "色・小物"],
  ["delivery_cast_dress_color", "ドレス色", "色・小物"],
  ["delivery_cast_pattern", "柄", "色・小物"],
  ["delivery_cast_material", "素材", "色・小物"],
  ["delivery_cast_accessory", "小物", "色・小物"],
  ["delivery_cast_ribbon", "リボン", "色・小物"],
  ["delivery_cast_lighting", "光", "画風・演出"],
  ["delivery_cast_camera", "カメラ", "画風・演出"],
  ["delivery_cast_pose", "ポーズ", "画風・演出"],
  ["delivery_cast_style", "画風", "画風・演出"],
  ["delivery_cast_quality", "品質タグ", "画風・演出"],
  ["missionary_condom", "ゴムあり正常位", "成人向け"],
  ["missionary_raw", "ゴムなし正常位", "成人向け"],
  ["missionary_creampie", "中出し後", "成人向け"],
  ["missionary_afterglow", "正常位余韻", "成人向け"],
  ["cowgirl_raw", "騎乗位", "成人向け"],
  ["doggystyle_raw", "後背位", "成人向け"],
  ["standing_doggy_raw", "立ちバック", "成人向け"],
  ["ekiben_raw", "駅弁", "成人向け"],
  ["fellatio_scene", "フェラ場面", "成人向け"],
  ["paizuri_scene", "パイズリ場面", "成人向け"],
  ["handjob_scene", "手コキ場面", "成人向け"],
  ["cunnilingus_scene", "クンニ場面", "成人向け"],
  ["creampie_afterglow", "中出し後余韻", "成人向け"],
  ["condom_variant", "ゴムあり差分", "成人向け"],
  ["nude_state", "裸状態", "成人向け"],
  ["undressing_state", "脱衣状態", "成人向け"],
  ["lingerie_state", "下着状態", "成人向け"],
  ["pubic_hair", "陰毛", "成人向け"],
  ["labia_detail", "陰部詳細", "成人向け"],
  ["nipple_detail", "乳首詳細", "成人向け"],
];

function keyNameSuggestionLabel(seedLabel, key) {
  return seedLabel || labelForKey(key);
}

function getKeyNameSuggestions(query) {
  const cacheKey = JSON.stringify({
    query,
    keys: Object.keys(state.data),
    labels: state.labels,
  });
  if (keyNameSuggestionCache.key === cacheKey) return keyNameSuggestionCache.items;

  const rawQuery = query.trim().toLowerCase();
  const normalizedQuery = normalizeKeyName(query);
  const shorthandQuery = normalizedQuery.replace(/^(delivery_cast|test|sample|nai|wildcard)_?/, "");
  const merged = new Map();

  Object.keys(state.data).forEach((key) => {
    merged.set(key, { key, label: labelForKey(key), group: "既存", existing: true });
  });

  keyNameSuggestionSeeds.forEach(([key, label, group]) => {
    if (!merged.has(key)) {
      merged.set(key, { key, label: keyNameSuggestionLabel(label, key), group, existing: false });
    }
  });

  let items = Array.from(merged.values());
  if (normalizedQuery) {
    items = items.filter((item) => {
      const haystack = `${item.key} ${item.label} ${item.group}`.toLowerCase();
      return haystack.includes(rawQuery) || haystack.includes(normalizedQuery) || (shorthandQuery && haystack.includes(shorthandQuery));
    });
  }

  items.sort((a, b) => {
    const aExact = a.key === normalizedQuery ? 0 : 1;
    const bExact = b.key === normalizedQuery ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aPrefix = normalizedQuery && a.key.startsWith(normalizedQuery) ? 0 : 1;
    const bPrefix = normalizedQuery && b.key.startsWith(normalizedQuery) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    if (a.existing !== b.existing) return a.existing ? -1 : 1;
    return a.key.localeCompare(b.key);
  });

  keyNameSuggestionCache = { key: cacheKey, items: items.slice(0, 14) };
  return keyNameSuggestionCache.items;
}

function renderKeyNameSuggestions() {
  if (document.activeElement !== keyNameInput) {
    hideKeyNameSuggestions();
    return;
  }

  const suggestions = getKeyNameSuggestions(keyNameInput.value);
  keyNameSuggestions.innerHTML = "";
  keyNameSuggestionIndex = Math.min(keyNameSuggestionIndex, suggestions.length - 1);

  if (!suggestions.length) {
    hideKeyNameSuggestions();
    return;
  }

  suggestions.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `key-name-suggestion${index === keyNameSuggestionIndex ? " is-active" : ""}`;
    button.dataset.suggestKey = item.key;
    button.innerHTML = `
      <span class="suggestion-main">
        <span class="suggestion-key">${escapeHtml(item.key)}</span>
        <span class="suggestion-label">${escapeHtml(item.label)}</span>
      </span>
      <span class="suggestion-tag">${escapeHtml(item.existing ? "既存" : item.group)}</span>
    `;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      applyKeyNameSuggestion(item.key);
    });
    keyNameSuggestions.appendChild(button);
  });

  keyNameSuggestions.hidden = false;
}

function hideKeyNameSuggestions() {
  keyNameSuggestions.hidden = true;
  keyNameSuggestionIndex = -1;
}

function applyKeyNameSuggestion(key) {
  keyNameInput.value = key;
  if (!keyLabelInput.value.trim() || keyLabelInput.placeholder.startsWith("Auto:")) {
    keyLabelInput.value = state.labels[key] || inferLabelFromKey(key);
  }
  hideKeyNameSuggestions();
  keyNameInput.focus();
}

function moveKeyNameSuggestion(delta) {
  const suggestions = getKeyNameSuggestions(keyNameInput.value);
  if (!suggestions.length) return;
  keyNameSuggestionIndex = (keyNameSuggestionIndex + delta + suggestions.length) % suggestions.length;
  renderKeyNameSuggestions();
}

function splitItems(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function yamlQuote(value) {
  return JSON.stringify(value);
}

function isKeyPaused(key) {
  return !!(state.disabledKeys && state.disabledKeys[key]);
}

function isKeySequential(key) {
  return !!(state.sequentialKeys && state.sequentialKeys[key]);
}

function itemReferencesPausedKey(item, disabledKeys = state.disabledKeys || {}) {
  const pausedRefs = [];
  findWildcardCalls(item).forEach((call) => {
    if (disabledKeys[call]) pausedRefs.push(call);
  });
  return pausedRefs;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanGeneratedItem(item) {
  return item
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/^[\s,]+/g, "")
    .replace(/[\s,]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function removePausedReferencesFromItem(item, disabledKeys = state.disabledKeys || {}) {
  let next = item;
  const removed = [];
  const removedVariables = new Set();

  Object.keys(disabledKeys)
    .filter((key) => disabledKeys[key])
    .forEach((key) => {
      const escapedKey = escapeRegExp(key);
      const fixedVariable = new RegExp(`\\$\\{([A-Za-z_][A-Za-z0-9_-]*)=!([^}]*)__${escapedKey}__([^}]*)\\}`, "g");
      next = next.replace(fixedVariable, (_match, variableName) => {
        removedVariables.add(variableName);
        removed.push(key);
        return "";
      });

      const seqCall = new RegExp(`\\[SEQ:__${escapedKey}__(?::\\d+)?\\]`, "g");
      next = next.replace(seqCall, () => {
        removed.push(key);
        return "";
      });

      const wildcardCall = new RegExp(`__${escapedKey}__`, "g");
      next = next.replace(wildcardCall, () => {
        removed.push(key);
        return "";
      });
    });

  removedVariables.forEach((variableName) => {
    const variableUse = new RegExp(`\\$\\{${escapeRegExp(variableName)}\\}`, "g");
    next = next.replace(variableUse, "");
  });

  return { item: cleanGeneratedItem(next), removed: Array.from(new Set(removed)) };
}

function buildGeneratedData(data, disabledKeys = state.disabledKeys || {}) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !disabledKeys[key])
      .map(([key, items]) => [
        key,
        items
          .map((item) => removePausedReferencesFromItem(item, disabledKeys).item)
          .filter(Boolean),
      ])
      .filter(([, items]) => items.length)
  );
}

function protectVariableBlocks(text) {
  const blocks = [];
  const protectedText = text.replace(/\$\{[^}]+\}/g, (match) => {
    const token = `@@VAR_BLOCK_${blocks.length}@@`;
    blocks.push([token, match]);
    return token;
  });
  return { protectedText, blocks };
}

function restoreBlocks(text, blocks) {
  return blocks.reduce((next, [token, value]) => next.replace(token, value), text);
}

function applySequentialReferencesToItem(item, sequentialKeys = state.sequentialKeys || {}) {
  let next = item;
  Object.keys(sequentialKeys)
    .filter((key) => sequentialKeys[key])
    .forEach((key) => {
      const escapedKey = escapeRegExp(key);
      const { protectedText, blocks } = protectVariableBlocks(next);
      const existingSeq = [];
      let working = protectedText.replace(new RegExp(`\\[SEQ:__${escapedKey}__(?::\\d+)?\\]`, "g"), (match) => {
        const token = `@@SEQ_BLOCK_${existingSeq.length}@@`;
        existingSeq.push([token, match]);
        return token;
      });
      working = working.replace(new RegExp(`__${escapedKey}__`, "g"), `[SEQ:__${key}__]`);
      next = restoreBlocks(restoreBlocks(working, existingSeq), blocks);
    });
  return next;
}

function countKeyReferencesInData(key, data = buildGeneratedData(state.data, state.disabledKeys)) {
  const escapedKey = escapeRegExp(key);
  const callPattern = new RegExp(`(?:\\[SEQ:__${escapedKey}__(?::\\d+)?\\]|__${escapedKey}__)`, "g");
  return Object.values(data).reduce(
    (total, items) =>
      total +
      items.reduce((itemTotal, item) => {
        const matches = String(item).match(callPattern);
        return itemTotal + (matches ? matches.length : 0);
      }, 0),
    0
  );
}

function buildOutputData(data = state.data) {
  const generatedData = buildGeneratedData(data, state.disabledKeys);
  return Object.fromEntries(
    Object.entries(generatedData).map(([key, items]) => [
      key,
      items.map((item) => applySequentialReferencesToItem(item, state.sequentialKeys)),
    ])
  );
}

function stripUtf8Bom(text) {
  return String(text).replace(/^\uFEFF/, "");
}

function toYaml(data) {
  return Object.entries(data)
    .map(([key, items]) => {
      const lines = [`${key}:`];
      if (!items.length) {
        lines.push("  - \"\"");
      } else {
        items.forEach((item) => lines.push(`  - ${yamlQuote(item)}`));
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function parseSimpleYaml(text) {
  const data = {};
  const warnings = [];
  let current = null;
  const lines = stripUtf8Bom(text).split(/\r?\n/);
  lines.forEach((rawLine, index) => {
    const line = rawLine.replace(/\t/g, "  ");
    const trimmed = line.trim();
    if (!trimmed) return;
    // 行頭のコメントは無視。行末コメントはスカラー内の # を巻き込むと壊れるので今回は非対応。
    if (trimmed.startsWith("#")) return;

    // 未対応の高度構文を検出して警告 (処理は継続)。
    if (/^[^\s-].+:\s*[|>]/.test(trimmed)) {
      warnings.push(`${index + 1}行目: ブロックスカラー(| / >)は未対応。テキストが欠落する可能性があります。`);
      return;
    }
    if (/^[^\s-].+:\s*\[/.test(trimmed) || /^[^\s-].+:\s*\{/.test(trimmed)) {
      warnings.push(`${index + 1}行目: フロー記法([...] / {...})は未対応。手動で候補行に展開してください。`);
      return;
    }
    if (/^\s*&\S+/.test(trimmed) || /^\s*\*\S+/.test(trimmed)) {
      warnings.push(`${index + 1}行目: アンカー/エイリアス(& / *)は未対応。`);
      return;
    }

    // キー行 (末尾スペース/コメントを許容、値付きの単一スカラーは items:[value] として扱う)。
    const keyMatch = line.match(/^([A-Za-z0-9_/-]+):\s*(.*?)\s*$/);
    if (keyMatch && !line.match(/^\s+/)) {
      current = keyMatch[1];
      data[current] = data[current] || [];
      const inlineValue = keyMatch[2].trim();
      if (inlineValue && !inlineValue.startsWith("#")) {
        // key: value 形式 (単一スカラー) をリストの1要素として受け入れる。
        data[current].push(unquoteYamlScalar(inlineValue.replace(/\s+#.*$/, "").trim()));
      }
      return;
    }

    const itemMatch = line.match(/^\s*-\s*(.*)$/);
    if (itemMatch && current) {
      data[current].push(unquoteYamlScalar(itemMatch[1].trim()));
      return;
    }

    // ここまで来たら未認識行。行番号を警告に足す (トップレベル注釈などは頻繁に来るのでノイズ抑制)。
    if (!trimmed.startsWith("---") && !trimmed.startsWith("...")) {
      warnings.push(`${index + 1}行目: 認識できない構文: ${trimmed.slice(0, 40)}${trimmed.length > 40 ? "..." : ""}`);
    }
  });
  if (warnings.length) {
    // 警告をユーザーに知らせる (最大5件までに要約)。
    const shown = warnings.slice(0, 5).join("\n");
    const more = warnings.length > 5 ? `\n... 他 ${warnings.length - 5} 件` : "";
    alert(`YAML読込: 一部の構文を無視しました。\n\n${shown}${more}`);
  }
  return data;
}

function unquoteYamlScalar(value) {
  if (!value) return "";
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    try {
      return value.startsWith("\"") ? JSON.parse(value) : value.slice(1, -1).replace(/''/g, "'");
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

function findWildcardCalls(text) {
  const calls = new Set();
  const re = /__([A-Za-z0-9_/-]+)__/g;
  let match;
  while ((match = re.exec(text))) {
    calls.add(match[1]);
  }
  return calls;
}

function getReferencedKeys(data, disabledKeys = {}) {
  const refs = new Set();
  Object.entries(data).forEach(([key, items]) => {
    if (disabledKeys[key]) return;
    items.forEach((item) => {
      if (itemReferencesPausedKey(item, disabledKeys).length) return;
      findWildcardCalls(item).forEach((call) => refs.add(call));
    });
  });
  return refs;
}

function getRootKeys(data, disabledKeys = state.disabledKeys || {}) {
  const refs = getReferencedKeys(data, disabledKeys);
  const keys = Object.keys(data).filter((key) => !disabledKeys[key]);
  const roots = keys.filter((key) => !refs.has(key));
  return roots.length ? roots : keys.slice(0, 1);
}

function cleanDownloadNameBase(value) {
  return String(value || "")
    .trim()
    .replace(/\.ya?ml$/i, "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function yamlDownloadFilename(data) {
  const roots = getRootKeys(data);
  const rootPart = roots.length ? roots.slice(0, 3).join("__") : "wildcards";
  const suffix = roots.length > 3 ? "__etc" : "";
  const base = cleanDownloadNameBase(`${rootPart}${suffix}`) || "wildcards";
  return `${base}.yaml`;
}

function findWildcardCallList(text) {
  const calls = [];
  const re = /__([A-Za-z0-9_/-]+)__/g;
  let match;
  while ((match = re.exec(text))) {
    calls.push(match[1]);
  }
  return calls;
}

function countFixedVariableChoices(text) {
  const re = /\$\{[A-Za-z_][A-Za-z0-9_-]*=!\{([^{}]+)\}\}/g;
  let match;
  let total = 1n;
  while ((match = re.exec(text))) {
    const choices = match[1]
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
    if (choices.length > 1) total *= BigInt(choices.length);
  }
  return total;
}

function countItemPatterns(item, data, memo, stack, issues) {
  let total = countFixedVariableChoices(item);
  findWildcardCallList(item).forEach((ref) => {
    total *= countKeyPatterns(ref, data, memo, stack, issues);
  });
  return total;
}

function countKeyPatterns(key, data, memo = new Map(), stack = [], issues = new Set()) {
  if (memo.has(key)) return memo.get(key);
  if (!data[key]) {
    issues.add(`undefined:${key}`);
    return 1n;
  }
  if (stack.includes(key)) {
    issues.add(`cycle:${[...stack, key].join(" -> ")}`);
    return 1n;
  }

  const items = data[key] || [];
  let total = 0n;
  items.forEach((item) => {
    total += countItemPatterns(item, data, memo, [...stack, key], issues);
  });
  memo.set(key, total);
  return total;
}

function formatPatternCount(value) {
  const text = value.toString();
  if (text.length <= 6) return Number(value).toLocaleString("ja-JP");
  if (text.length <= 15) return text.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `約${text.slice(0, 4)}e+${text.length - 1}`;
}

function patternCountSummary(data) {
  const memo = new Map();
  const issues = new Set();
  const roots = getRootKeys(data);
  const selected = selectedKey && data[selectedKey] ? countKeyPatterns(selectedKey, data, memo, [], issues) : 0n;
  const rootsTotal = roots.reduce((total, key) => total * countKeyPatterns(key, data, memo, [], issues), roots.length ? 1n : 0n);
  const keyCounts = Object.keys(data)
    .map((key) => ({ key, label: labelForKey(key), count: countKeyPatterns(key, data, memo, [], issues) }))
    .sort((a, b) => {
      if (a.key === selectedKey) return -1;
      if (b.key === selectedKey) return 1;
      return a.key.localeCompare(b.key);
    });

  return { roots, selected, rootsTotal, keyCounts, issues: Array.from(issues) };
}

function buildPrompt(data) {
  return getRootKeys(data)
    .map((key) => `__${key}__`)
    .join(",\n");
}

function setPromptOutput() {
  const outputData = buildOutputData(state.data);
  promptOutput.value = buildPrompt(outputData);
  coloredPromptOutput.innerHTML = highlightPrompt(promptOutput.value, outputData);
}

function validate(data, generatedData = buildGeneratedData(data, state.disabledKeys)) {
  const messages = [];
  const keys = Object.keys(data);
  const generatedKeys = Object.keys(generatedData);
  const keySet = new Set(generatedKeys);
  const refs = getReferencedKeys(generatedData);
  const snake = /^[a-z][a-z0-9_]*(\/[a-z0-9_]+)?$/;
  const disabledKeys = state.disabledKeys || {};
  const disabledList = keys.filter((key) => disabledKeys[key]);

  keys.forEach((key) => {
    if (!snake.test(key)) {
      messages.push({ type: "error", title: `キー名が不正です: ${key}`, body: "小文字英数字、アンダースコア、スラッシュ1つだけを使ってください。例: delivery_cast_hair_color" });
    }
    if (!data[key].length || data[key].some((item) => !item.trim())) {
      messages.push({ type: "warn", title: `空の候補があります: ${key}`, body: "空行があると、空のプロンプト断片が生成されることがあります。" });
    }
  });

  if (!keys.length) {
    messages.push({ type: "error", title: "キーがありません", body: "Wildcardキーを1件以上追加するか、テンプレートを読み込んでください。" });
  }

  refs.forEach((ref) => {
    if (!keySet.has(ref)) {
      messages.push({ type: "error", title: `未定義参照: __${ref}__`, body: "同じ名前のWildcardキーを追加してください。" });
    }
  });

  if (disabledList.length) {
    messages.push({
      type: "warn",
      title: `停止中のキー: ${disabledList.length}件`,
      body: disabledList.map((key) => `__${key}__`).join(", "),
    });
  }

  keys.forEach((key) => {
    if (disabledKeys[key]) return;
    data[key].forEach((item) => {
      const pausedRefs = itemReferencesPausedKey(item, disabledKeys);
      if (pausedRefs.length) {
        messages.push({
          type: "warn",
          title: `${key} が停止中キーを参照しています`,
          body: pausedRefs.map((ref) => `__${ref}__`).join(", "),
        });
      }
    });
  });

  const roots = getRootKeys(generatedData);
  if (roots.length > 4) {
    messages.push({ type: "warn", title: "rootキーが複数あります", body: `rootキー: ${roots.join(", ")}。Prompt出力にすべて含めてよいか確認してください。` });
  }

  if (!messages.length) {
    messages.push({ type: "ok", title: "基本チェックOK", body: "rootキーと __name__ 参照は整合しています。" });
  }
  return messages;
}

const depthStyles = [
  { name: "root", label: "root", bg: "rgba(192,132,252,0.26)", border: "rgba(192,132,252,0.75)", color: "#e9d5ff" },
  { name: "depth-1", label: "Lv1", bg: "rgba(96,165,250,0.22)", border: "rgba(96,165,250,0.68)", color: "#bfdbfe" },
  { name: "depth-2", label: "Lv2", bg: "rgba(52,211,153,0.20)", border: "rgba(52,211,153,0.62)", color: "#bbf7d0" },
  { name: "depth-3", label: "Lv3", bg: "rgba(251,191,36,0.20)", border: "rgba(251,191,36,0.62)", color: "#fde68a" },
  { name: "depth-4", label: "Lv4+", bg: "rgba(251,146,60,0.18)", border: "rgba(251,146,60,0.58)", color: "#fed7aa" },
];

const unusedStyle = { name: "unused", label: "未使用", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.45)", color: "#cbd5e1" };
const undefinedStyle = { name: "undefined", label: "未定義", bg: "rgba(251,113,133,0.14)", border: "rgba(251,113,133,0.65)", color: "#fecdd3" };

function analyzeHierarchy(data, disabledKeys = {}) {
  const keys = Object.keys(data);
  const keySet = new Set(keys);
  const roots = getRootKeys(data, disabledKeys);
  const depthByKey = new Map();
  const queue = [];

  roots.forEach((key) => {
    if (keySet.has(key) && !depthByKey.has(key)) {
      depthByKey.set(key, 0);
      queue.push(key);
    }
  });

  while (queue.length) {
    const key = queue.shift();
    const nextDepth = depthByKey.get(key) + 1;
    (data[key] || []).forEach((item) => {
      findWildcardCalls(item).forEach((ref) => {
        if (!keySet.has(ref)) return;
        if (!depthByKey.has(ref) || nextDepth < depthByKey.get(ref)) {
          depthByKey.set(ref, nextDepth);
          queue.push(ref);
        }
      });
    });
  }

  return { keySet, roots, depthByKey };
}

function styleForKey(key, analysis) {
  if (!analysis.keySet.has(key)) return undefinedStyle;
  const depth = analysis.depthByKey.get(key);
  if (depth === undefined) return unusedStyle;
  return depthStyles[Math.min(depth, depthStyles.length - 1)];
}

function styleAttribute(style) {
  return `background:${style.bg};border:1px solid ${style.border};color:${style.color}`;
}

function applyKeyStyleToElement(element, style) {
  if (!element) return;
  element.style.setProperty("--key-bg", style.bg);
  element.style.setProperty("--key-border", style.border);
  element.style.setProperty("--key-color", style.color);
}

function getDraggedKey(event) {
  return (
    draggedKey ||
    event.dataTransfer.getData("application/x-wildcard-key") ||
    event.dataTransfer.getData("text/plain")
  );
}

function hasWildcardDrag(event) {
  const types = Array.from(event.dataTransfer?.types || []);
  return Boolean(draggedKey || types.includes("application/x-wildcard-key") || types.includes("text/plain"));
}

function clearCandidateDropState() {
  itemTextarea.classList.remove("is-drop-target", "is-drop-duplicate");
  candidateDropZone.classList.remove("is-drop-target", "is-drop-duplicate");
}

function flashCandidateDuplicate() {
  clearCandidateDropState();
  itemTextarea.classList.add("is-drop-duplicate");
  candidateDropZone.classList.add("is-drop-duplicate");
  window.setTimeout(clearCandidateDropState, 700);
}

function wildcardMarkup(key, label, options = {}) {
  const analysis = options.analysis || analyzeHierarchy(state.data);
  const style = styleForKey(key, analysis);
  const classes = ["wildcard-ref"];
  if (options.definition) classes.push("wildcard-definition");
  if (!options.definition && isKeySequential(key)) classes.push("is-seq");
  if (style.name === "undefined") classes.push("is-undefined");
  if (style.name === "unused") classes.push("is-unused");
  const attrs = options.definition
    ? ""
    : ` data-wildcard-key="${escapeHtml(key)}" role="button" tabindex="0" title="SEQ切替: ${escapeHtml(key)}"`;
  const badge = !options.definition && isKeySequential(key) ? `<span class="wildcard-seq-badge">SEQ</span>` : "";
  return `<span class="${classes.join(" ")}"${attrs} style="${styleAttribute(style)}">${escapeHtml(label)}${badge}</span>`;
}

function highlightWildcardRefs(text, analysis) {
  const re = /__([A-Za-z0-9_/-]+)__/g;
  let result = "";
  let lastIndex = 0;
  let match;
  while ((match = re.exec(text))) {
    result += escapeHtml(text.slice(lastIndex, match.index));
    result += wildcardMarkup(match[1], match[0], { analysis });
    lastIndex = re.lastIndex;
  }
  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function selectedLineStyleAttribute(style) {
  return [
    `--selected-key-bg:${style.bg}`,
    `--selected-key-border:${style.border}`,
    `--selected-key-color:${style.color}`,
  ].join(";");
}

function yamlLineMarkup(content, options = {}) {
  const classes = ["yaml-line"];
  if (options.selectedBlock) classes.push("is-selected-block");
  if (options.selectedDefinition) classes.push("is-selected-definition");
  const style = options.selectedBlock ? ` style="${selectedLineStyleAttribute(options.selectedStyle)}"` : "";
  const badge = options.selectedDefinition ? `<span class="yaml-current-badge">編集中</span>` : "";
  return `<span class="${classes.join(" ")}"${style}>${content || "&nbsp;"}${badge}</span>`;
}

function highlightYaml(text, data) {
  const analysis = analyzeHierarchy(data);
  const selectedStyle = selectedKey ? styleForKey(selectedKey, analysis) : unusedStyle;
  const entries = Object.entries(data);
  if (!entries.length) return yamlLineMarkup("");

  return entries
    .map(([key, items]) => {
      const selectedBlock = key === selectedKey;
      const style = styleForKey(key, analysis);
      const blockClasses = ["yaml-block", `depth-${style.name}`];
      if (selectedBlock) blockClasses.push("is-selected-block");
      const blockStyle = selectedLineStyleAttribute(selectedBlock ? selectedStyle : style);
      const headerContent = `<span class="yaml-drag-handle" draggable="true" data-yaml-block-key="${escapeHtml(
        key
      )}" title="ドラッグして定義ブロックを並べ替え">⋮⋮</span>${wildcardMarkup(key, key, {
        analysis,
        definition: true,
      })}:`;
      const itemLines = (items.length ? items : [""]).map((item) => {
        const quoted = yamlQuote(item);
        return yamlLineMarkup(`  - ${highlightWildcardRefs(quoted, analysis)}`, {
          selectedBlock,
          selectedStyle,
        });
      });
      return `<div class="${blockClasses.join(" ")}" data-yaml-block-key="${escapeHtml(
        key
      )}" style="${blockStyle}">${yamlLineMarkup(headerContent, {
        selectedBlock,
        selectedDefinition: selectedBlock,
        selectedStyle,
      })}${itemLines.join("")}</div>`;
    })
    .join(yamlLineMarkup(""));
}

function highlightPrompt(text, data) {
  return highlightWildcardRefs(text, analyzeHierarchy(data));
}

function expandWildcardSample(text, data, stack = []) {
  const expandKey = (key) => {
    if (!data[key] || !data[key].length) return `__${key}__`;
    if (stack.includes(key)) return `__${key}__`;
    return expandWildcardSample(data[key][0], data, [...stack, key]);
  };
  return String(text)
    .replace(/\[SEQ:__([A-Za-z0-9_/-]+)__(?::\d+)?\]/g, (_match, key) => expandKey(key))
    .replace(/__([A-Za-z0-9_/-]+)__/g, (_match, key) => expandKey(key));
}

function renderCandidatePreview() {
  if (!candidatePreview) return;
  if (!selectedKey || !state.data[selectedKey]) {
    candidatePreview.innerHTML = `<div class="candidate-preview-empty">キーを選択すると、候補の展開例を表示します。</div>`;
    return;
  }
  const draftData = { ...state.data, [selectedKey]: splitItems(itemTextarea.value) };
  const generatedData = buildGeneratedData(draftData, state.disabledKeys);
  const analysis = analyzeHierarchy(generatedData);
  const items = splitItems(itemTextarea.value);
  if (!items.length) {
    candidatePreview.innerHTML = `<div class="candidate-preview-empty">候補が空です。</div>`;
    return;
  }
  candidatePreview.innerHTML = `
    <div class="candidate-preview-head">
      <strong>候補プレビュー</strong>
      <span>各行の __key__ を先頭候補で仮展開</span>
    </div>
    <div class="candidate-preview-list">
      ${items
        .map((item, index) => {
          const expanded = expandWildcardSample(item, generatedData);
          const same = expanded === item;
          return `
            <div class="candidate-preview-row">
              <span class="candidate-preview-index">${index + 1}</span>
              <div>
                <code>${highlightWildcardRefs(yamlQuote(item), analysis)}</code>
                <p>${same ? "参照なし" : escapeHtml(expanded)}</p>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function referencesForKey(key, data) {
  const refs = new Set();
  (data[key] || []).forEach((item) => {
    findWildcardCalls(item).forEach((ref) => refs.add(ref));
  });
  return Array.from(refs);
}

function renderGraphTree(key, data, analysis, stack = []) {
  const refs = referencesForKey(key, data);
  const style = styleForKey(key, analysis);
  const cycle = stack.includes(key);
  const children = refs
    .map((ref) => {
      const childStyle = styleForKey(ref, analysis);
      const missing = !data[ref];
      const repeated = stack.includes(ref);
      const note = missing ? "未定義" : repeated ? "循環" : "";
      return `
        <li>
          <span class="graph-edge">→</span>
          ${wildcardMarkup(ref, ref, { analysis, definition: true })}
          ${note ? `<span class="graph-note">${escapeHtml(note)}</span>` : ""}
          ${!missing && !repeated ? renderGraphTree(ref, data, analysis, [...stack, key]) : ""}
        </li>
      `;
    })
    .join("");
  return `
    <div class="graph-node" style="${styleAttribute(style)}">
      <strong>${escapeHtml(labelForKey(key))}</strong>
      <code>${escapeHtml(key)}</code>
      <span>${cycle ? "循環参照" : refs.length ? `${refs.length}件参照` : "子参照なし"}</span>
    </div>
    ${children ? `<ul class="graph-children">${children}</ul>` : ""}
  `;
}

function renderDependencyGraph() {
  if (!graphOutput) return;
  const data = buildGeneratedData(state.data, state.disabledKeys);
  const keys = Object.keys(data);
  if (!keys.length) {
    graphOutput.innerHTML = `<div class="graph-empty">有効なキーがありません。</div>`;
    return;
  }
  const analysis = analyzeHierarchy(data);
  const roots = getRootKeys(data);
  const undefinedRefs = Array.from(getReferencedKeys(data)).filter((key) => !data[key]);
  const rootHtml = roots.length
    ? roots.map((key) => `<div class="graph-root">${renderGraphTree(key, data, analysis)}</div>`).join("")
    : `<div class="graph-empty">rootキーが見つかりません。循環参照または全キーが参照済みの可能性があります。</div>`;
  graphOutput.innerHTML = `
    <div class="graph-summary">
      <div><span>有効キー</span><b>${keys.length}</b></div>
      <div><span>root</span><b>${roots.length}</b></div>
      <div><span>未定義参照</span><b>${undefinedRefs.length}</b></div>
    </div>
    ${undefinedRefs.length ? `<div class="graph-warnings">未定義: ${undefinedRefs.map((key) => `__${escapeHtml(key)}__`).join(", ")}</div>` : ""}
    <div class="graph-roots">${rootHtml}</div>
  `;
}

function reorderKey(fromKey, toKey) {
  if (!fromKey || !toKey || fromKey === toKey) return;
  const entries = Object.entries(state.data);
  const fromIndex = entries.findIndex(([key]) => key === fromKey);
  const toIndex = entries.findIndex(([key]) => key === toKey);
  if (fromIndex < 0 || toIndex < 0) return;
  pushUndoSnapshot();
  const [moved] = entries.splice(fromIndex, 1);
  entries.splice(toIndex, 0, moved);
  state.data = Object.fromEntries(entries);
  selectedKey = fromKey;
  render();
}

function addReferenceToSelectedKey(key, allowDuplicate = false) {
  if (!selectedKey || !state.data[selectedKey] || !state.data[key]) return;
  const ref = `__${key}__`;
  const items = splitItems(itemTextarea.value);
  if (!allowDuplicate && items.includes(ref)) {
    statusText.textContent = `${ref} is already in the candidates`;
    flashCandidateDuplicate();
    return;
  }
  pushUndoSnapshot();
  items.push(ref);
  state.data[selectedKey] = items;
  itemTextarea.value = items.join("\n");
  statusText.textContent = `Added ${ref} to ${selectedKey}`;
  render();
}

function render() {
  const keys = Object.keys(state.data);
  const generatedData = buildGeneratedData(state.data, state.disabledKeys);
  const outputData = buildOutputData(state.data);
  const analysis = analyzeHierarchy(generatedData);
  const rawAnalysis = analyzeHierarchy(state.data, {});
  if (!selectedKey || !state.data[selectedKey]) selectedKey = keys[0] || "";

  keyList.innerHTML = "";
  keys.forEach((key) => {
    const paused = isKeyPaused(key);
    const sequential = isKeySequential(key);
    const style = paused ? styleForKey(key, rawAnalysis) : styleForKey(key, analysis);
    const button = document.createElement("button");
    button.type = "button";
    button.draggable = true;
    button.dataset.key = key;
    button.className = `key-button${key === selectedKey ? " is-active" : ""}${paused ? " is-paused" : ""}${sequential ? " is-sequential" : ""} depth-${style.name}`;
    applyKeyStyleToElement(button, style);
    button.innerHTML = `
      <span class="key-main">
        <span class="key-color-bar" aria-hidden="true"></span>
        <span class="key-text">
          <span class="key-label">${escapeHtml(labelForKey(key))}</span>
          <span class="key-name">${escapeHtml(key)}</span>
        </span>
      </span>
      <span class="key-meta">
        ${paused ? `<span class="key-paused">停止中</span>` : ""}
        ${sequential ? `<span class="key-seq">SEQ</span>` : ""}
        <span class="key-depth">${style.label}</span>
        <span class="key-count">${state.data[key].length}件</span>
        <span class="key-actions" aria-label="${escapeHtml(key)} の操作">
          <span class="key-mini-button seq" role="button" tabindex="0" data-key-action="toggle-seq">${sequential ? "SEQ解除" : "SEQ"}</span>
          <span class="key-mini-button" role="button" tabindex="0" data-key-action="toggle-pause">${paused ? "再開" : "停止"}</span>
          <span class="key-mini-button" role="button" tabindex="0" data-key-action="duplicate">複製</span>
          <span class="key-mini-button danger" role="button" tabindex="0" data-key-action="delete">削除</span>
        </span>
      </span>
    `;
    button.addEventListener("click", () => {
      selectedKey = key;
      render();
    });
    button.querySelectorAll("[data-key-action]").forEach((actionButton) => {
      actionButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleKeyRowAction(key, actionButton.dataset.keyAction);
      });
      actionButton.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        handleKeyRowAction(key, actionButton.dataset.keyAction);
      });
    });
    button.addEventListener("dragstart", (event) => {
      draggedKey = key;
      event.dataTransfer.setData("application/x-wildcard-key", key);
      event.dataTransfer.setData("text/plain", key);
      event.dataTransfer.effectAllowed = "copyMove";
      button.classList.add("is-dragging");
    });
    button.addEventListener("dragend", () => {
      draggedKey = "";
      button.classList.remove("is-dragging");
      document.querySelectorAll(".key-button.is-drag-over").forEach((item) => item.classList.remove("is-drag-over"));
      clearCandidateDropState();
    });
    button.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      button.classList.add("is-drag-over");
    });
    button.addEventListener("dragleave", () => {
      button.classList.remove("is-drag-over");
    });
    button.addEventListener("drop", (event) => {
      event.preventDefault();
      button.classList.remove("is-drag-over");
      reorderKey(getDraggedKey(event), key);
    });
    keyList.appendChild(button);
  });

  // 編集中のフィールドは値を上書きしない (カーソル位置と入力途中の内容を保護)。
  // 他のフィールドはこれまで通り最新値に同期する。
  const activeElement = document.activeElement;
  if (activeElement !== keyNameInput) {
    keyNameInput.value = selectedKey;
  }
  if (activeElement !== keyLabelInput) {
    keyLabelInput.value = selectedKey ? state.labels[selectedKey] || "" : "";
  }
  keyLabelInput.placeholder = selectedKey ? `Auto: ${inferLabelFromKey(selectedKey)}` : "Example: Hair Color / Outfit Scene / Background";
  const selectedStyle = selectedKey
    ? styleForKey(selectedKey, isKeyPaused(selectedKey) ? rawAnalysis : analysis)
    : unusedStyle;
  applyKeyStyleToElement(keyNameField, selectedStyle);
  selectedKeyDepthBadge.textContent = selectedStyle.label;
  // itemTextarea: 編集中なら上書きしない。編集中でなくても、値が同じならセレクション破壊を避けるため代入をスキップ。
  if (activeElement !== itemTextarea) {
    const nextItemsText = selectedKey ? state.data[selectedKey].join("\n") : "";
    if (itemTextarea.value !== nextItemsText) {
      itemTextarea.value = nextItemsText;
    }
  }
  yamlOutput.value = toYaml(outputData);
  coloredYamlOutput.innerHTML = highlightYaml(yamlOutput.value, generatedData);
  setPromptOutput();
  renderKeyNameSuggestions();
  renderCandidatePreview();
  renderLibrary();
  renderChecks();
  renderDependencyGraph();
  updateHistoryButtons();
  saveState();
}

function renderChecks() {
  const generatedData = buildGeneratedData(state.data, state.disabledKeys);
  const messages = validate(state.data, generatedData);
  checkOutput.innerHTML = `${renderPatternCounts(generatedData)}${messages
    .map((msg) => `<div class="check-item ${msg.type}"><strong>${escapeHtml(msg.title)}</strong><span>${escapeHtml(msg.body)}</span></div>`)
    .join("")}`;
}

function renderPatternCounts(data = buildGeneratedData(state.data, state.disabledKeys)) {
  const summary = patternCountSummary(data);
  const selectedLabel = selectedKey ? `${labelForKey(selectedKey)} / ${selectedKey}` : "なし";
  const issueText = summary.issues.length
    ? summary.issues
        .slice(0, 3)
        .map((issue) => (issue.startsWith("cycle:") ? `循環参照: ${issue.slice(6)}` : `未定義参照: __${issue.slice(10)}__`))
        .join(" / ")
    : "なし";
  const rows = summary.keyCounts
    .slice(0, 14)
    .map(
      (item) => `
        <div class="pattern-row${item.key === selectedKey ? " is-selected" : ""}">
          <span>
            <strong>${escapeHtml(item.label)}</strong>
            <code>${escapeHtml(item.key)}</code>
          </span>
          <b>${escapeHtml(formatPatternCount(item.count))} 通り</b>
        </div>
      `
    )
    .join("");

  return `
    <div class="pattern-summary">
      <div class="pattern-summary-head">
        <strong>組み合わせ数</strong>
        <span>現在のWildcard参照から概算しています</span>
      </div>
      <div class="pattern-metrics">
        <div>
          <span>選択中キー</span>
          <b>${escapeHtml(formatPatternCount(summary.selected))} 通り</b>
          <small>${escapeHtml(selectedLabel)}</small>
        </div>
        <div>
          <span>Prompt合計</span>
          <b>${escapeHtml(formatPatternCount(summary.rootsTotal))} 通り</b>
          <small>${escapeHtml(summary.roots.join(", ") || "なし")}</small>
        </div>
        <div>
          <span>注意</span>
          <b>${escapeHtml(issueText)}</b>
          <small>未定義参照や循環参照がある場合、通り数は概算になります。</small>
        </div>
      </div>
      <div class="pattern-table">
        ${rows}
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function download(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(filename, value) {
  download(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function directFolderSaveSupported() {
  return typeof window.showDirectoryPicker === "function";
}

function updateYamlFolderStatus() {
  if (!yamlFolderStatus) return;
  if (!directFolderSaveSupported()) {
    yamlFolderStatus.textContent = "保存先: ダウンロード";
    yamlFolderStatus.title = "このブラウザでは直接フォルダ保存を利用できません。";
    return;
  }
  if (!yamlDirectoryHandle) {
    yamlFolderStatus.textContent = "保存先: ダウンロード";
    yamlFolderStatus.title = "保存先フォルダ未選択です。YAML保存時はブラウザのダウンロードを使います。";
    return;
  }
  yamlFolderStatus.textContent = `保存先: ${yamlDirectoryHandle.name}`;
  yamlFolderStatus.title = `選択中の保存先フォルダ: ${yamlDirectoryHandle.name}`;
}

async function verifyDirectoryPermission(handle) {
  const options = { mode: "readwrite" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  return (await handle.requestPermission(options)) === "granted";
}

async function chooseYamlFolder() {
  if (!directFolderSaveSupported()) {
    statusText.textContent = "このブラウザでは保存先フォルダを選択できません。";
    updateYamlFolderStatus();
    return;
  }
  try {
    yamlDirectoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    const allowed = await verifyDirectoryPermission(yamlDirectoryHandle);
    if (!allowed) {
      yamlDirectoryHandle = null;
      statusText.textContent = "保存先フォルダの権限が許可されませんでした。";
    } else {
      statusText.textContent = `YAML保存先を ${yamlDirectoryHandle.name} に設定しました`;
    }
  } catch (error) {
    if (error && error.name !== "AbortError") {
      statusText.textContent = "保存先フォルダを選択できませんでした。";
    }
  }
  updateYamlFolderStatus();
}

async function saveYamlFile() {
  const filename = yamlDownloadFilename(buildGeneratedData(state.data, state.disabledKeys));
  if (yamlDirectoryHandle) {
    try {
      const allowed = await verifyDirectoryPermission(yamlDirectoryHandle);
      if (!allowed) throw new Error("permission-denied");
      const fileHandle = await yamlDirectoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(yamlOutput.value);
      await writable.close();
      statusText.textContent = `${filename} を ${yamlDirectoryHandle.name} に保存しました`;
      updateYamlFolderStatus();
      return;
    } catch {
      yamlDirectoryHandle = null;
      updateYamlFolderStatus();
      statusText.textContent = "フォルダ保存に失敗しました。ダウンロード保存に切り替えます。";
    }
  }
  download(filename, yamlOutput.value);
  statusText.textContent = `YAMLを ${filename} として保存しました`;
}

function initializeFolderSaveUi() {
  if (!chooseYamlFolderButton) return;
  if (!directFolderSaveSupported()) {
    chooseYamlFolderButton.disabled = true;
    chooseYamlFolderButton.title = "このブラウザでは直接フォルダ保存を利用できません。";
  }
  updateYamlFolderStatus();
}

function uniqueKeyName(base, data) {
  let name = normalizeKeyName(base) || "imported_wildcard";
  if (!data[name]) return name;
  let n = 2;
  while (data[`${name}_import_${n}`]) n += 1;
  return `${name}_import_${n}`;
}

function saveSelectedKeyToLibrary() {
  if (!selectedKey || !state.data[selectedKey]) return;
  keyLibrary[selectedKey] = {
    label: state.labels[selectedKey] || inferLabelFromKey(selectedKey),
    items: [...state.data[selectedKey]],
    savedAt: new Date().toISOString(),
  };
  saveKeyLibrary();
  statusText.textContent = `${selectedKey} を部品棚に保存しました`;
  renderLibrary();
}

function addLibraryKeyToCurrent(key, overwrite = false) {
  const entry = keyLibrary[key];
  if (!entry) return;
  const targetKey = overwrite ? key : uniqueKeyName(key, state.data);
  pushUndoSnapshot();
  state.data[targetKey] = [...entry.items];
  if (entry.label) state.labels[targetKey] = entry.label;
  selectedKey = targetKey;
  statusText.textContent = overwrite
    ? `部品棚から ${key} を上書きしました`
    : `部品棚から ${key} を ${targetKey} として追加しました`;
  render();
}

function deleteLibraryKey(key) {
  if (!keyLibrary[key]) return;
  if (!confirm(`部品棚から ${key} を削除しますか？`)) return;
  delete keyLibrary[key];
  saveKeyLibrary();
  statusText.textContent = `部品棚から ${key} を削除しました`;
  renderLibrary();
}

function renderLibrary() {
  const entries = Object.entries(keyLibrary);
  if (!entries.length) {
    keyLibraryList.innerHTML = `<div class="empty-library">保存済みキーはまだありません。キーを選択して保存すると、再利用できる部品としてここに追加されます。</div>`;
    return;
  }

  keyLibraryList.innerHTML = entries
    .map(([key, entry]) => {
      const label = entry.label || inferLabelFromKey(key);
      const exists = Boolean(state.data[key]);
      return `
        <div class="library-card">
          <div class="library-card-main">
            <strong>${escapeHtml(label)}</strong>
            <code>${escapeHtml(key)}</code>
            <span>${entry.items.length}件${exists ? " / 同名キーあり" : ""}</span>
          </div>
          <div class="library-card-actions">
            <button type="button" data-library-add="${escapeHtml(key)}">追加</button>
            <button type="button" data-library-overwrite="${escapeHtml(key)}"${exists ? "" : " disabled"}>上書き</button>
            <button type="button" class="danger" data-library-delete="${escapeHtml(key)}">削除</button>
          </div>
        </div>
      `;
    })
    .join("");

  keyLibraryList.querySelectorAll("[data-library-add]").forEach((button) => {
    button.addEventListener("click", () => addLibraryKeyToCurrent(button.dataset.libraryAdd, false));
  });
  keyLibraryList.querySelectorAll("[data-library-overwrite]").forEach((button) => {
    button.addEventListener("click", () => addLibraryKeyToCurrent(button.dataset.libraryOverwrite, true));
  });
  keyLibraryList.querySelectorAll("[data-library-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteLibraryKey(button.dataset.libraryDelete));
  });
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  statusText.textContent = "コピーしました";
}

function addNewKey() {
  let base = "new_wildcard";
  let name = base;
  let n = 2;
  while (state.data[name]) name = `${base}_${n++}`;
  pushUndoSnapshot();
  state.data[name] = ["sample tag"];
  deleteKeyMeta(name);
  state.labels[name] = inferLabelFromKey(name);
  selectedKey = name;
  render();
}

function duplicateKey(key = selectedKey) {
  if (!key || !state.data[key]) return;
  let name = `${key}_copy`;
  let n = 2;
  while (state.data[name]) name = `${key}_copy_${n++}`;
  pushUndoSnapshot();
  state.data[name] = [...state.data[key]];
  copyKeyMeta(key, name, " コピー");
  selectedKey = name;
  render();
}

function deleteKey(key = selectedKey) {
  if (!key || !state.data[key]) return;
  if (!confirm(`${key} を削除しますか？`)) return;
  pushUndoSnapshot();
  delete state.data[key];
  deleteKeyMeta(key);
  selectedKey = Object.keys(state.data)[0] || "";
  render();
}

function togglePauseKey(key = selectedKey) {
  if (!key || !state.data[key]) return;
  ensureStateMetaMaps();
  pushUndoSnapshot();
  let message;
  if (state.disabledKeys[key]) {
    delete state.disabledKeys[key];
    message = `${key} を再開しました`;
  } else {
    state.disabledKeys[key] = true;
    message = `${key} を停止しました`;
  }
  selectedKey = key;
  render();
  statusText.textContent = message;
}

function toggleSeqKey(key = selectedKey) {
  if (!key || !state.data[key]) return;
  ensureStateMetaMaps();
  const affectedCount = countKeyReferencesInData(key);
  pushUndoSnapshot();
  const suffix = affectedCount ? `（参照 ${affectedCount} 件に反映）` : "（現在の生成結果には参照なし）";
  let message;
  if (state.sequentialKeys[key]) {
    delete state.sequentialKeys[key];
    message = `${key} のSEQを解除しました${suffix}`;
  } else {
    state.sequentialKeys[key] = true;
    message = `${key} をSEQ形式にしました${suffix}`;
  }
  selectedKey = key;
  render();
  statusText.textContent = message;
}

function handleKeyRowAction(key, action) {
  if (action === "toggle-pause") {
    togglePauseKey(key);
  } else if (action === "toggle-seq") {
    toggleSeqKey(key);
  } else if (action === "duplicate") {
    duplicateKey(key);
  } else if (action === "delete") {
    deleteKey(key);
  }
}

document.getElementById("addKeyButton").addEventListener("click", () => {
  addNewKey();
});

undoButton?.addEventListener("click", undoState);
redoButton?.addEventListener("click", redoState);

keyNameInput.addEventListener("input", () => {
  keyNameSuggestionIndex = -1;
  renderKeyNameSuggestions();
});

itemTextarea.addEventListener("input", renderCandidatePreview);

keyNameInput.addEventListener("focus", () => {
  renderKeyNameSuggestions();
});

keyNameInput.addEventListener("keydown", (event) => {
  if (keyNameSuggestions.hidden) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveKeyNameSuggestion(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    moveKeyNameSuggestion(-1);
  } else if (event.key === "Enter" && keyNameSuggestionIndex >= 0) {
    event.preventDefault();
    const suggestions = getKeyNameSuggestions(keyNameInput.value);
    if (suggestions[keyNameSuggestionIndex]) applyKeyNameSuggestion(suggestions[keyNameSuggestionIndex].key);
  } else if (event.key === "Escape") {
    hideKeyNameSuggestions();
  }
});

document.addEventListener("mousedown", (event) => {
  if (!keyNameField.contains(event.target)) hideKeyNameSuggestions();
});

document.getElementById("newProjectButton").addEventListener("click", () => {
  if (!confirm("現在のYAMLをクリアして新規作成しますか？")) return;
  pushUndoSnapshot();
  state = defaultState();
  selectedKey = Object.keys(state.data)[0] || "";
  render();
});

document.getElementById("saveKeyButton").addEventListener("click", () => {
  const nextName = normalizeKeyName(keyNameInput.value);
  if (!nextName) return;
  const items = splitItems(itemTextarea.value);
  const label = keyLabelInput.value.trim();
  ensureStateMetaMaps();
  const previousKey = selectedKey;
  const wasDisabled = !!state.disabledKeys[previousKey];
  const wasSequential = !!state.sequentialKeys[previousKey];
  pushUndoSnapshot();
  if (nextName !== selectedKey) {
    delete state.data[previousKey];
    deleteKeyMeta(previousKey);
  }
  state.data[nextName] = items;
  deleteKeyMeta(nextName);
  if (wasDisabled) {
    state.disabledKeys[nextName] = true;
  }
  if (wasSequential) {
    state.sequentialKeys[nextName] = true;
  }
  if (label) {
    state.labels[nextName] = label;
  } else {
    delete state.labels[nextName];
  }
  selectedKey = nextName;
  render();
});

const duplicateKeyButton = document.getElementById("duplicateKeyButton");
if (duplicateKeyButton) {
  duplicateKeyButton.addEventListener("click", () => {
    duplicateKey();
  });
}

const deleteKeyButton = document.getElementById("deleteKeyButton");
if (deleteKeyButton) {
  deleteKeyButton.addEventListener("click", () => {
    deleteKey();
  });
}

document.getElementById("loadTemplateButton").addEventListener("click", () => {
  const name = templateSelect.value;
  if (!name || !templates[name]) return;
  if (!confirm("現在のYAMLをこのテンプレートで置き換えますか？")) return;
  pushUndoSnapshot();
  state.data = JSON.parse(JSON.stringify(templates[name]));
  resetStateMeta();
  selectedKey = Object.keys(state.data)[0] || "";
  render();
});

document.getElementById("importYamlButton").addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const text = await file.text();
  const parsed = parseSimpleYaml(text);
  if (!Object.keys(parsed).length) {
    alert("このYAMLファイルにはトップレベルキーが見つかりませんでした。");
    return;
  }
  pushUndoSnapshot();
  state.data = parsed;
  resetStateMeta();
  selectedKey = Object.keys(parsed)[0];
  render();
});

libraryFileInput.addEventListener("change", async () => {
  const file = libraryFileInput.files[0];
  if (!file) return;
  try {
    const imported = normalizeKeyLibrary(JSON.parse(stripUtf8Bom(await file.text())));
    const count = Object.keys(imported).length;
    if (!count) {
      alert("保存済み部品が見つかりませんでした。wildcard-key-library.json を選択してください。");
      return;
    }
    const overwriteCount = Object.keys(imported).filter((key) => keyLibrary[key]).length;
    if (overwriteCount && !confirm(`同名の部品 ${overwriteCount} 件を上書きします。続けますか？`)) return;
    keyLibrary = { ...keyLibrary, ...imported };
    saveKeyLibrary();
    statusText.textContent = overwriteCount
      ? `部品棚に ${count} 件を読み込みました（${overwriteCount} 件を上書き）`
      : `部品棚に ${count} 件を読み込みました`;
    renderLibrary();
  } catch {
    alert("部品棚JSONを読み込めませんでした。通常のYAMLではなく wildcard-key-library.json を選択してください。");
  } finally {
    libraryFileInput.value = "";
  }
});

chooseYamlFolderButton?.addEventListener("click", chooseYamlFolder);
document.getElementById("downloadYamlButton").addEventListener("click", saveYamlFile);
document.getElementById("downloadPromptButton").addEventListener("click", () => download("prompt.txt", promptOutput.value));
document.getElementById("copyYamlButton").addEventListener("click", () => copyText(yamlOutput.value));
document.getElementById("copyPromptButton").addEventListener("click", () => copyText(promptOutput.value));
document.getElementById("saveSelectedLibraryButton").addEventListener("click", saveSelectedKeyToLibrary);
document.getElementById("downloadLibraryButton").addEventListener("click", () => {
  downloadJson("wildcard-key-library.json", { savedKeys: keyLibrary });
  statusText.textContent = "部品棚JSONをブラウザのダウンロードに保存しました";
});
document.getElementById("importLibraryButton").addEventListener("click", () => libraryFileInput.click());
document.getElementById("copyPromptTopButton").addEventListener("click", () => copyText(promptOutput.value));

function bindSeqToggleOutput(container) {
  container.addEventListener("click", (event) => {
    const token = event.target.closest("[data-wildcard-key]");
    if (!token || !container.contains(token)) return;
    toggleSeqKey(token.dataset.wildcardKey);
  });
  container.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const token = event.target.closest("[data-wildcard-key]");
    if (!token || !container.contains(token)) return;
    event.preventDefault();
    toggleSeqKey(token.dataset.wildcardKey);
  });
}

bindSeqToggleOutput(coloredYamlOutput);
bindSeqToggleOutput(coloredPromptOutput);

function clearYamlBlockDragState() {
  document
    .querySelectorAll(".yaml-block.is-drag-over, .yaml-block.is-dragging")
    .forEach((item) => item.classList.remove("is-drag-over", "is-dragging"));
}

function yamlBlockAtPoint(clientX, clientY) {
  const element = document.elementFromPoint(clientX, clientY);
  const block = element?.closest(".yaml-block");
  return block && coloredYamlOutput.contains(block) ? block : null;
}

function updateYamlPointerDropTarget(event) {
  const block = yamlBlockAtPoint(event.clientX, event.clientY);
  document
    .querySelectorAll(".yaml-block.is-drag-over")
    .forEach((item) => {
      if (item !== block) item.classList.remove("is-drag-over");
    });
  if (block && block.dataset.yamlBlockKey !== pointerDraggedYamlKey) {
    block.classList.add("is-drag-over");
  }
}

function endYamlPointerDrag(event) {
  const fromKey = pointerDraggedYamlKey;
  // ネイティブ drag が既に drop を処理済みなら、mouse fallback は何もしない (二重発火防止)。
  pointerDraggedYamlKey = "";
  draggedKey = "";
  document.body.classList.remove("is-yaml-dragging");
  document.removeEventListener("mousemove", updateYamlPointerDropTarget);
  clearYamlBlockDragState();
  if (!fromKey) return;
  const block = yamlBlockAtPoint(event.clientX, event.clientY);
  const toKey = block?.dataset.yamlBlockKey;
  if (fromKey && toKey && fromKey !== toKey) reorderKey(fromKey, toKey);
}

function bindYamlBlockReorder(container) {
  container.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const handle = event.target.closest(".yaml-drag-handle");
    if (!handle || !container.contains(handle)) return;
    const key = handle.dataset.yamlBlockKey;
    if (!key || !state.data[key]) return;
    // Pointer fallback を仕込む。ネイティブ dragstart が発火すればそこで pointer 状態は
    // クリアされ、mouseup 時の fallback は何もしない。dragstart が発火しない環境では
    // pointer 状態が保持され、mouseup 時に endYamlPointerDrag が並べ替えを実行する。
    pointerDraggedYamlKey = key;
    draggedKey = key;
    document.body.classList.add("is-yaml-dragging");
    handle.closest(".yaml-block")?.classList.add("is-dragging");
    document.addEventListener("mousemove", updateYamlPointerDropTarget);
    document.addEventListener("mouseup", endYamlPointerDrag, { once: true });
  });

  container.addEventListener("dragstart", (event) => {
    const handle = event.target.closest(".yaml-drag-handle");
    if (!handle || !container.contains(handle)) return;
    const key = handle.dataset.yamlBlockKey;
    if (!key || !state.data[key]) return;
    // ネイティブ drag が正常に始まったので、pointer fallback は必ず無効化する。
    // これで drop/dragend 完了後の mouseup で二重に reorderKey が呼ばれない。
    pointerDraggedYamlKey = "";
    document.body.classList.remove("is-yaml-dragging");
    document.removeEventListener("mousemove", updateYamlPointerDropTarget);
    draggedKey = key;
    event.dataTransfer.setData("application/x-wildcard-key", key);
    event.dataTransfer.setData("application/x-yaml-block-key", key);
    event.dataTransfer.setData("text/plain", key);
    event.dataTransfer.effectAllowed = "move";
    handle.closest(".yaml-block")?.classList.add("is-dragging");
  });

  container.addEventListener("dragend", () => {
    draggedKey = "";
    // ネイティブ drag 終了。pointer fallback 側も念のためクリア。
    pointerDraggedYamlKey = "";
    document.body.classList.remove("is-yaml-dragging");
    document.removeEventListener("mousemove", updateYamlPointerDropTarget);
    clearYamlBlockDragState();
    document.querySelectorAll(".key-button.is-drag-over").forEach((item) => item.classList.remove("is-drag-over"));
    clearCandidateDropState();
  });

  container.addEventListener("dragover", (event) => {
    const block = event.target.closest(".yaml-block");
    const key = getDraggedKey(event);
    if (!block || !container.contains(block) || !key || !state.data[key]) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    document
      .querySelectorAll(".yaml-block.is-drag-over")
      .forEach((item) => {
        if (item !== block) item.classList.remove("is-drag-over");
      });
    block.classList.add("is-drag-over");
  });

  container.addEventListener("dragleave", (event) => {
    const block = event.target.closest(".yaml-block");
    if (!block || block.contains(event.relatedTarget)) return;
    block.classList.remove("is-drag-over");
  });

  container.addEventListener("drop", (event) => {
    const block = event.target.closest(".yaml-block");
    const fromKey = getDraggedKey(event);
    const toKey = block?.dataset.yamlBlockKey;
    if (!block || !container.contains(block) || !fromKey || !toKey) return;
    event.preventDefault();
    // 二重発火防止: ネイティブ drop で処理したので pointer fallback を無効化する。
    pointerDraggedYamlKey = "";
    document.body.classList.remove("is-yaml-dragging");
    document.removeEventListener("mousemove", updateYamlPointerDropTarget);
    clearYamlBlockDragState();
    reorderKey(fromKey, toKey);
  });
}

bindYamlBlockReorder(coloredYamlOutput);

function bindCandidateDrop(target) {
  target.addEventListener("dragenter", (event) => {
    if (!hasWildcardDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    itemTextarea.classList.add("is-drop-target");
    candidateDropZone.classList.add("is-drop-target");
  });

  target.addEventListener("dragover", (event) => {
    if (!hasWildcardDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    itemTextarea.classList.add("is-drop-target");
    candidateDropZone.classList.add("is-drop-target");
  });

  target.addEventListener("dragleave", (event) => {
    if (candidateDropZone.contains(event.relatedTarget)) return;
    clearCandidateDropState();
  });

  target.addEventListener("drop", (event) => {
    if (!hasWildcardDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const key = getDraggedKey(event);
    clearCandidateDropState();
    addReferenceToSelectedKey(key, event.shiftKey);
  });
}

bindCandidateDrop(candidateDropZone);
bindCandidateDrop(itemTextarea);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("is-active"));
    document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add("is-active");
  });
});

initializeFolderSaveUi();
render();
