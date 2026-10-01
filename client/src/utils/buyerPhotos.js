// The buyer pages' photographs, at the widths each place asks for
// (credits: assets/PHOTO_CREDITS.md).
import marketProduce640 from "../assets/buyer/banner-market-produce-640.webp";
import marketProduce1200 from "../assets/buyer/banner-market-produce-1200.webp";
import marketProduce1800 from "../assets/buyer/banner-market-produce-1800.webp";
import riceHarvest640 from "../assets/buyer/banner-rice-harvest-640.webp";
import riceHarvest1200 from "../assets/buyer/banner-rice-harvest-1200.webp";
import riceHarvest1800 from "../assets/buyer/banner-rice-harvest-1800.webp";
import marketPrices480 from "../assets/buyer/tile-market-prices-480.webp";
import marketPrices800 from "../assets/buyer/tile-market-prices-800.webp";
import carabaoRoad480 from "../assets/buyer/tile-farmer-carabao-road-480.webp";
import carabaoRoad800 from "../assets/buyer/tile-farmer-carabao-road-800.webp";
import terraces800 from "../assets/buyer/farm-shop-terraces-800.webp";
import terraces1600 from "../assets/buyer/farm-shop-terraces-1600.webp";
import baskets800 from "../assets/buyer/header-baskets-carrots-800.webp";
import baskets1600 from "../assets/buyer/header-baskets-carrots-1600.webp";
import crates800 from "../assets/buyer/header-market-crates-800.webp";
import crates1600 from "../assets/buyer/header-market-crates-1600.webp";
import tray400 from "../assets/buyer/empty-produce-tray-400.webp";
import tray720 from "../assets/buyer/empty-produce-tray-720.webp";
import sacks400 from "../assets/buyer/empty-grain-sacks-400.webp";
import sacks720 from "../assets/buyer/empty-grain-sacks-720.webp";
import lane400 from "../assets/buyer/empty-market-lane-400.webp";
import lane720 from "../assets/buyer/empty-market-lane-720.webp";

const set = (sizes, alt) => ({
  src: sizes[Math.min(1, sizes.length - 1)][1],
  srcSet: sizes.map(([w, url]) => `${url} ${w}w`).join(", "),
  alt,
});

export const BUYER_PHOTOS = {
  marketProduce: set([[640, marketProduce640], [1200, marketProduce1200], [1800, marketProduce1800]], "Fresh vegetables piled high at a market stall"),
  riceHarvest: set([[640, riceHarvest640], [1200, riceHarvest1200], [1800, riceHarvest1800]], "Farmers harvesting rice in the field"),
  marketPrices: set([[480, marketPrices480], [800, marketPrices800]], "Calamansi and mangoes under a market price sign"),
  carabaoRoad: set([[480, carabaoRoad480], [800, carabaoRoad800]], "A farmer walking a carabao along a country road"),
  farmTerraces: set([[800, terraces800], [1600, terraces1600]], "Rice terraces and coconut palms"),
  baskets: set([[800, baskets800], [1600, baskets1600]], "Carrots in woven baskets at the market"),
  crates: set([[800, crates800], [1600, crates1600]], "A vendor among crates and sacks at the market"),
  emptyTray: set([[400, tray400], [720, tray720]], "Vegetables in a wooden tray"),
  grainSacks: set([[400, sacks400], [720, sacks720]], "Rice and grains in sacks at the market"),
  marketLane: set([[400, lane400], [720, lane720]], "A lane of produce stalls at a public market"),
};
