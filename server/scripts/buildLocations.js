#!/usr/bin/env node
/*
 * Builds server/data/locations.json - the Province > Municipality/City list the
 * address pickers use, with a latitude/longitude for every municipality and
 * city. Run it once (or again to refresh):
 *
 *   node scripts/buildLocations.js
 *
 * Sources (all public; see server/data/README.md for licences):
 *   - PSGC (Philippine Statistics Authority) via psgc.gitlab.io - the official
 *     list of provinces, cities and municipalities, with their codes.
 *   - Wikidata - each city/municipality's coordinates, matched by PSGC code.
 *   - OpenStreetMap Nominatim - the few places Wikidata has no point for,
 *     looked up once by name.
 *
 * Nothing here runs at request time: the server only reads the JSON this
 * writes, so registering never depends on any of these services being up.
 */
const fs = require("fs");
const path = require("path");
const { displayName } = require("../utils/placeNames");

const DATA_DIR = path.join(__dirname, "..", "data");
const CACHE_DIR = path.join(DATA_DIR, ".cache");
const OUT_FILE = path.join(DATA_DIR, "locations.json");
const USER_AGENT = "AniSave-school-project/1.0 (one-off location data build)";

const PSGC = "https://psgc.gitlab.io/api";

// AniSave serves one province. Everywhere else is dropped when the file is
// written rather than filtered later, so the list the server reads holds
// nothing it could not legitimately offer - there is no second place where a
// province outside the service area could leak back in. Widening the service
// area later means adding a name here and rebuilding.
const SERVICE_PROVINCES = ["Pangasinan"];

// PSGC files Metro Manila under districts rather than a province, so it is
// listed here as one - people pick "Metro Manila" first, then Manila, Makati...
const NCR_REGION_CODE = "130000000";
const NCR_PROVINCE = { code: "1300000000", name: "Metro Manila (NCR)" };

// PSGC lists these two cities outside any province, but each sits inside one,
// and that's where people look for them when picking an address.
const INDEPENDENT_CITY_PROVINCE = {
  "099701000": ["Basilan"], // City of Isabela
  "129804000": ["Maguindanao del Norte", "Maguindanao"], // City of Cotabato
};

// Every place must land inside the Philippines, or Wikidata gave us the wrong
// one. (The west edge reaches out to Kalayaan, in the Spratly Islands.)
const PH_BOUNDS = { south: 4, north: 22, west: 113, east: 127 };

fs.mkdirSync(CACHE_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const round5 = (n) => Math.round(n * 1e5) / 1e5;

function haversineKm(aLat, aLon, bLat, bLon) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Downloads are kept in data/.cache (git-ignored) so a re-run is quick and
// doesn't hammer the public servers. Delete the folder to refresh from scratch.
async function cached(name, produce) {
  const file = path.join(CACHE_DIR, name);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const value = await produce();
  fs.writeFileSync(file, JSON.stringify(value));
  return value;
}

async function request(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: { "User-Agent": USER_AGENT, ...(options.headers || {}) },
      });
      if (res.ok) return await res.json();
      lastError = new Error(`HTTP ${res.status} from ${url}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(3000 * attempt * attempt);
  }
  throw lastError;
}

async function loadPsgc() {
  const get = (name) => cached(`psgc-${name}.json`, () => request(`${PSGC}/${name}.json`));
  const [provinces, cities] = await Promise.all([get("provinces"), get("cities-municipalities")]);
  return { provinces, cities };
}

// Wikidata's item for a place carries its PSGC code (P988) and coordinates
// (P625), so one query gives a point for almost every city and municipality.
async function loadWikidataCoordinates() {
  const query = `
    SELECT ?code ?lat ?lon WHERE {
      ?item wdt:P988 ?code .
      ?item p:P625/psv:P625 ?node .
      ?node wikibase:geoLatitude ?lat .
      ?node wikibase:geoLongitude ?lon .
    }`;
  const rows = await cached("wikidata-coordinates.json", async () => {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
    const json = await request(url, { headers: { Accept: "application/sparql-results+json" } });
    return json.results.bindings.map((r) => [r.code.value, Number(r.lat.value), Number(r.lon.value)]);
  });

  const byCode = new Map();
  for (const [code, lat, lon] of rows) {
    if (!byCode.has(code)) byCode.set(code, { lat, lon });
  }
  return byCode;
}

async function main() {
  console.log("Loading PSGC provinces, cities and municipalities...");
  const psgc = await loadPsgc();
  console.log("Loading Wikidata coordinates...");
  const wikidata = await loadWikidataCoordinates();

  const provinces = psgc.provinces
    .map((p) => ({ code: p.psgc10DigitCode, name: p.name, psgc9: p.code }))
    .concat([{ ...NCR_PROVINCE, psgc9: NCR_REGION_CODE }]);
  const provinceBy9 = new Map(provinces.map((p) => [p.psgc9, p]));
  const provinceNamed = (names) => provinces.find((p) => names.includes(p.name));

  const cities = [];
  let skipped = 0;
  for (const c of psgc.cities) {
    let province = null;
    if (c.provinceCode) province = provinceBy9.get(c.provinceCode);
    else if (c.regionCode === NCR_REGION_CODE) province = provinceBy9.get(NCR_REGION_CODE);
    else if (INDEPENDENT_CITY_PROVINCE[c.code]) province = provinceNamed(INDEPENDENT_CITY_PROVINCE[c.code]);

    if (!province || !c.psgc10DigitCode) {
      skipped += 1;
      continue;
    }
    // PSGC codes come as 9 or 10 digits; Wikidata has one or the other.
    const point = wikidata.get(c.psgc10DigitCode) || wikidata.get(c.code);
    cities.push({
      code: c.psgc10DigitCode,
      name: displayName(c.name),
      rawName: c.name,
      type: c.isCity ? "city" : "municipality",
      provinceCode: province.code,
      lat: point?.lat ?? null,
      lon: point?.lon ?? null,
    });
  }

  // A few cities have no Wikidata point (their PSGC codes changed): look each
  // up once by name, and only as a last resort take the average of their
  // province's other cities - so every city and municipality has coordinates
  // and none can fail to register for want of them.
  const meanOf = (points) => ({
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lon: points.reduce((s, p) => s + p.lon, 0) / points.length,
  });
  const provinceName = new Map(provinces.map((p) => [p.code, p.name]));
  let looked = 0;
  let estimated = 0;
  for (const city of cities.filter((c) => c.lat == null)) {
    const siblings = cities.filter((c) => c.provinceCode === city.provinceCode && c.lat != null);
    const province = siblings.length ? meanOf(siblings) : null;

    let found = null;
    const query = `${city.rawName.replace(/^City of /i, "")}, ${provinceName.get(city.provinceCode)}, Philippines`;
    try {
      const results = await cached(`nominatim-${city.code}.json`, async () => {
        await sleep(1200); // Nominatim allows one request a second
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(query)}`;
        return request(url);
      });
      if (results[0]) found = { lat: Number(results[0].lat), lon: Number(results[0].lon) };
    } catch {
      // fall through to the estimate
    }

    // A geocoder can pick a same-named place elsewhere - trust it only when
    // it lands near the rest of the province.
    if (found && province && haversineKm(found.lat, found.lon, province.lat, province.lon) > 150) found = null;

    if (found) {
      looked += 1;
      console.log(`  looked up ${city.name}: ${found.lat}, ${found.lon}`);
    } else if (province) {
      found = province;
      estimated += 1;
      console.log(`  estimated a point for ${city.name} (province average)`);
    } else {
      throw new Error(`No way to place ${city.name} (${city.code})`);
    }
    city.lat = found.lat;
    city.lon = found.lon;
  }

  for (const city of cities) {
    city.lat = round5(city.lat);
    city.lon = round5(city.lon);
    const { south, north, west, east } = PH_BOUNDS;
    if (!(city.lat >= south && city.lat <= north && city.lon >= west && city.lon <= east)) {
      throw new Error(`${city.name} (${city.code}) got a point outside the Philippines: ${city.lat}, ${city.lon}`);
    }
  }

  // ---------- write ----------
  const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
  const served = new Set(
    provinces.filter((p) => SERVICE_PROVINCES.includes(p.name)).map((p) => p.code)
  );
  if (served.size !== SERVICE_PROVINCES.length) {
    throw new Error(`Couldn't find every service province in PSGC: ${SERVICE_PROVINCES.join(", ")}`);
  }
  const servedCities = cities.filter((c) => served.has(c.provinceCode));
  const usedProvinces = new Set(servedCities.map((c) => c.provinceCode));
  const provinceRows = provinces
    .filter((p) => usedProvinces.has(p.code))
    .sort((a, b) => collator.compare(a.name, b.name))
    .map((p) => [p.code, p.name]);
  const cityRows = [...servedCities]
    .sort((a, b) => collator.compare(a.name, b.name))
    .map((c) => [c.code, c.name, c.type, c.provinceCode, c.lat, c.lon]);

  const sources = {
    hierarchy: "Philippine Standard Geographic Code (PSA), via psgc.gitlab.io",
    coordinates: [
      "Wikidata (CC0), matched by PSGC code",
      looked > 0 ? "OpenStreetMap Nominatim (ODbL), for places Wikidata has no point for" : null,
    ].filter(Boolean),
  };

  // One place per line, so a rebuilt file shows up as a readable diff.
  const lines = (rows) => `[\n${rows.map((row) => JSON.stringify(row)).join(",\n")}\n]`;
  const text = [
    "{",
    `"version": 3,`,
    `"serviceArea": ${JSON.stringify({ provinceCode: provinceRows[0][0], province: provinceRows[0][1], country: "Philippines" })},`,
    `"generatedAt": ${JSON.stringify(new Date().toISOString())},`,
    `"sources": ${JSON.stringify(sources)},`,
    `"provinces": ${lines(provinceRows)},`,
    `"cities": ${lines(cityRows)}`,
    "}",
    "",
  ].join("\n");

  // Written beside the real file and renamed into place, so a server reading
  // it never sees a half-written one.
  const temp = `${OUT_FILE}.tmp`;
  fs.writeFileSync(temp, text);
  fs.renameSync(temp, OUT_FILE);

  console.log("\nDone.");
  console.log(`  service area: ${SERVICE_PROVINCES.join(", ")} (everywhere else dropped)`);
  console.log(`  provinces: ${provinceRows.length}`);
  console.log(`  cities/municipalities: ${cityRows.length} (${looked} looked up by name, ${estimated} estimated, ${skipped} skipped)`);
  console.log(`  wrote ${OUT_FILE} (${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
