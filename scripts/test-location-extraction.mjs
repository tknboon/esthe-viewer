import assert from "node:assert/strict";
import { applyDetailLocationToRow, extractDetailData } from "../monitor_esthe_ranking.mjs";

const uedaAccessHtml = `
  <div class="borderbox map-area">
    <a href="https://www.google.com/maps?q=%E6%A4%8D%E7%94%B0%E9%A7%85" class="map-btn">地図アプリで開く</a>
    <p class="w80">所在地：植田駅</p>
  </div>
  <div>東京エリア簡単検索 お探しのエリアをクリック 愛知県全域名古屋・名駅・納屋橋</div>
`;
const ueda = extractDetailData("", uedaAccessHtml);
assert.equal(ueda.address, "植田駅");
assert.equal(ueda.latitude, "");
assert.equal(ueda.longitude, "");

const kamimaezuAccessHtml = `
  <div class="borderbox map-area">
    <a href="https://www.google.com/maps?q=%E6%84%9B%E7%9F%A5%E7%9C%8C%E5%90%8D%E5%8F%A4%E5%B1%8B%E5%B8%82%E4%B8%AD%E5%8C%BA%E4%B8%8A%E5%89%8D%E6%B4%A51-14-11" class="map-btn">地図アプリで開く</a>
    <p class="w80">所在地：愛知県名古屋市中区上前津1-14-11</p>
  </div>
`;
const kamimaezu = extractDetailData("", kamimaezuAccessHtml);
assert.equal(kamimaezu.address, "愛知県名古屋市中区上前津1-14-11");

const staleCoordinateRow = {
  "緯度": "34.97838656177299",
  "経度": "137.13939701353192",
  "住所または座標": "34.97838656177299, 137.13939701353192",
};
applyDetailLocationToRow(staleCoordinateRow, { ...kamimaezu, note: "" });
assert.equal(staleCoordinateRow["緯度"], "");
assert.equal(staleCoordinateRow["経度"], "");
assert.equal(staleCoordinateRow["住所または座標"], "愛知県名古屋市中区上前津1-14-11");

console.log("location extraction regression checks passed");
