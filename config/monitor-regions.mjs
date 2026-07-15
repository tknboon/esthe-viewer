export const MONITOR_REGIONS = {
  aichi: {
    regionId: "aichi",
    reportLabel: "esthe-ranking toyota monitor",
    targetUrls: [
      "https://www.esthe-ranking.jp/nagoya/asian/",
      "https://www.esthe-ranking.jp/sakae/asian/",
      "https://www.esthe-ranking.jp/shinsakae/asian/",
      "https://www.esthe-ranking.jp/kanayama/asian/",
      "https://www.esthe-ranking.jp/kurokawa/asian/",
      "https://www.esthe-ranking.jp/hoshigaoka/asian/",
      "https://www.esthe-ranking.jp/moriyama/asian/",
      "https://www.esthe-ranking.jp/otai/asian/",
      "https://www.esthe-ranking.jp/tokaidori/asian/",
      "https://www.esthe-ranking.jp/kasadera/asian/",
      "https://www.esthe-ranking.jp/toyota/asian/",
      "https://www.esthe-ranking.jp/horita/asian/",
      "https://www.esthe-ranking.jp/tsurumai/asian/",
      "https://www.esthe-ranking.jp/showa/asian/",
      "https://www.esthe-ranking.jp/komaki/asian/",
      "https://www.esthe-ranking.jp/owari/asian/",
      "https://www.esthe-ranking.jp/chita/asian/",
      "https://www.esthe-ranking.jp/toyohashi/asian/",
    ],
    outputFiles: {
      snapshot: "esthe_ranking_snapshot.json",
      report: "esthe_ranking_report.md",
      csv: "toyota_esthe_map_points_ja.csv",
      data: "data.js",
      legacyCsv: "toyota_esthe_legacy_rows.csv",
      status: "esthe_ranking_status.json",
      failureLog: "esthe_ranking_failure.log",
      history: "esthe_update_history.json",
    },
    invalidAddressPattern: /愛知県全域|東京エリア簡単検索|お探しのエリアをクリック/,
    addressScopePattern: /(愛知県|豊田市|岡崎市|刈谷市|安城市|知立市|高浜市|碧南市|みよし市|西尾市|幸田町)/,
  },
  tokyo: {
    regionId: "tokyo",
    reportLabel: "esthe-ranking tokyo monitor",
    targetUrls: [
      "https://www.esthe-ranking.jp/haijima/asian/",
      "https://www.esthe-ranking.jp/kumegawa/asian/",
      "https://www.esthe-ranking.jp/nishitokyo/asian/",
      "https://www.esthe-ranking.jp/nerima/asian/",
      "https://www.esthe-ranking.jp/ooyama/asian/",
      "https://www.esthe-ranking.jp/akabane/asian/",
      "https://www.esthe-ranking.jp/kameari/asian/",
      "https://www.esthe-ranking.jp/kokubunji/asian/",
      "https://www.esthe-ranking.jp/shakujii/asian/",
      "https://www.esthe-ranking.jp/otsuka/asian/",
      "https://www.esthe-ranking.jp/nippori/asian/",
      "https://www.esthe-ranking.jp/kichijoji/asian/",
      "https://www.esthe-ranking.jp/ogikubo/asian/",
      "https://www.esthe-ranking.jp/nakano/asian/",
      "https://www.esthe-ranking.jp/okubo/asian/",
      "https://www.esthe-ranking.jp/iidabashi/asian/",
      "https://www.esthe-ranking.jp/suidobashi/asian/",
      "https://www.esthe-ranking.jp/hachioji/asian/",
      "https://www.esthe-ranking.jp/hatsudai/asian/",
      "https://www.esthe-ranking.jp/kanda/asian/",
      "https://www.esthe-ranking.jp/kameido/asian/",
      "https://www.esthe-ranking.jp/fuchu/asian/",
      "https://www.esthe-ranking.jp/chofu/asian/",
      "https://www.esthe-ranking.jp/shimokitazawa/asian/",
      "https://www.esthe-ranking.jp/roppongi/asian/",
      "https://www.esthe-ranking.jp/akasaka/asian/",
      "https://www.esthe-ranking.jp/tokyo/asian/",
      "https://www.esthe-ranking.jp/nihonbashi/asian/",
      "https://www.esthe-ranking.jp/monnaka/asian/",
      "https://www.esthe-ranking.jp/machida/asian/",
      "https://www.esthe-ranking.jp/sangenjaya/asian/",
      "https://www.esthe-ranking.jp/ebisu/asian/",
      "https://www.esthe-ranking.jp/meguro/asian/",
      "https://www.esthe-ranking.jp/gotanda/asian/",
      "https://www.esthe-ranking.jp/shinagawa/asian/",
      "https://www.esthe-ranking.jp/shinbashi/asian/",
      "https://www.esthe-ranking.jp/ginza/asian/",
      "https://www.esthe-ranking.jp/jiyugaoka/asian/",
      "https://www.esthe-ranking.jp/kasai/asian/",
      "https://www.esthe-ranking.jp/shinjuku/asian/",
      "https://www.esthe-ranking.jp/ikebukuro/asian/",
      "https://www.esthe-ranking.jp/ueno/asian/",
      "https://www.esthe-ranking.jp/kinshicho/asian/",
      "https://www.esthe-ranking.jp/shibuya/asian/",
      "https://www.esthe-ranking.jp/akihabara/asian/",
      "https://www.esthe-ranking.jp/kamata/asian/",
      "https://www.esthe-ranking.jp/tachikawa/asian/",
    ],
    outputFiles: {
      snapshot: "region-data/tokyo/esthe_ranking_snapshot.json",
      report: "region-data/tokyo/esthe_ranking_report.md",
      csv: "region-data/tokyo/esthe_map_points_ja.csv",
      data: "region-data/tokyo/data.js",
      legacyCsv: "region-data/tokyo/esthe_legacy_rows.csv",
      status: "region-data/tokyo/esthe_ranking_status.json",
      failureLog: "region-data/tokyo/esthe_ranking_failure.log",
      history: "region-data/tokyo/esthe_update_history.json",
    },
    invalidAddressPattern: /東京都全域|東京エリア簡単検索|お探しのエリアをクリック/,
    addressScopePattern: /(東京都|千代田区|中央区|港区|新宿区|文京区|台東区|墨田区|江東区|品川区|目黒区|大田区|世田谷区|渋谷区|中野区|杉並区|豊島区|北区|荒川区|板橋区|練馬区|足立区|葛飾区|江戸川区|八王子市|立川市|武蔵野市|三鷹市|府中市|昭島市|調布市|町田市|小金井市|小平市|日野市|東村山市|国分寺市|国立市|福生市|狛江市|東大和市|清瀬市|東久留米市|武蔵村山市|多摩市|稲城市|羽村市|あきる野市|西東京市)/,
  },
};

export function getMonitorRegion(regionId = "aichi") {
  const region = MONITOR_REGIONS[regionId];
  if (!region) {
    throw new Error(`Unknown monitor region: ${regionId}`);
  }

  const requiredOutputFiles = ["snapshot", "report", "csv", "data", "legacyCsv", "status", "failureLog", "history"];
  const hasValidUrls = Array.isArray(region.targetUrls) && region.targetUrls.length > 0 && region.targetUrls.every(Boolean);
  const hasValidOutputs = requiredOutputFiles.every((key) => typeof region.outputFiles?.[key] === "string" && region.outputFiles[key]);
  const patterns = [region.invalidAddressPattern, region.addressScopePattern];
  const hasValidPatterns = patterns.every((pattern) => pattern instanceof RegExp && !pattern.global && !pattern.sticky);

  if (!region.regionId || !region.reportLabel || !hasValidUrls || !hasValidOutputs || !hasValidPatterns) {
    throw new Error(`Invalid monitor region config: ${regionId}`);
  }
  return region;
}
