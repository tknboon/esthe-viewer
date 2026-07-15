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
    addressScopePattern: /(東京都|新宿区|豊島区|台東区|墨田区|渋谷区|千代田区|大田区|立川市)/,
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
