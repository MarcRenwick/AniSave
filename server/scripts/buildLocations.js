#!/usr/bin/env node
/*
 * Builds server/data/locations.json - the Province > City/Municipality >
 * Barangay list the address pickers use, with a latitude/longitude for every
 * place. Run it once (or again to refresh):
 *
 *   node scripts/buildLocations.js             full build, incl. barangay points
 *   node scripts/buildLocations.js --skip-osm  quick build, city/municipality
 *                                              points only
 *
 * Sources (all public; see server/data/README.md for licences):
 *   - PSGC (Philippine Statistics Authority) via psgc.gitlab.io - the official
 *     hierarchy and codes. No coordinates.
 *   - Wikidata - coordinates keyed by PSGC code. Covers almost every
 *     city/municipality and a few thousand barangays, exactly.
 *   - OpenStreetMap (Overpass) - place points for barangays Wikidata lacks,
 *     matched by name to the barangays of the nearest municipality.
 *
 * Nothing here runs at request time: the server only reads the JSON this
 * writes, so registering never depends on any of these services being up.
 * Downloads are cached in server/data/.cache so a re-run is cheap.
 */
const fs = require("fs");
const path = require("path");
const { displayName, normalizeName: normalize } = require("../utils/placeNames");

const DATA_DIR = path.join(__dirname, "..", "data");
const CACHE_DIR = path.join(DATA_DIR, ".cache");
const OUT_FILE = path.join(DATA_DIR, "locations.json");
const USER_AGENT = "AniSave-school-project/1.0 (one-off location data build)";
const SKIP_OSM = process.argv.includes("--skip-osm");

const NCR_REGION_CODE = "130000000";
const NCR_PROVINCE = { code: "1300000000", name: "Metro Manila (NCR)" };

const PSGC = "https://psgc.gitlab.io/api";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

// A barangay point further than this from its own municipality's centre is
// much more likely a wrong name match than a real, sprawling barangay.
const MAX_BARANGAY_KM = 60;

// PSGC lists these two cities outside any province, but each sits inside one,
// and that's where people look for them when picking an address.
const INDEPENDENT_CITY_PROVINCE = {
  "099701000": ["Basilan"], // City of Isabela
  "129804000": ["Maguindanao del Norte", "Maguindanao"], // City of Cotabato
};

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

// ---------- sources ----------

async function loadPsgc() {
  const get = (name) => cached(`psgc-${name}.json`, () => request(`${PSGC}/${name}.json`));
  const [provinces, cities, barangays] = await Promise.all([
    get("provinces"),
    get("cities-municipalities"),
    get("barangays"),
  ]);
  return { provinces, cities, barangays };
}

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

  // PSGC codes come as 9 or 10 digits; index both so either finds it.
  const byCode = new Map();
  for (const [code, lat, lon] of rows) {
    if (!byCode.has(code)) byCode.set(code, { lat, lon });
  }
  return byCode;
}

// Every place point OpenStreetMap has in the Philippines that could be a
// barangay: settlement nodes/areas plus the few barangay boundaries mapped.
async function loadOsmPlaces(municipalities) {
  const lats = municipalities.map((m) => m.lat);
  const lons = municipalities.map((m) => m.lon);
  const south = Math.floor(Math.min(...lats) - 0.2);
  const north = Math.ceil(Math.max(...lats) + 0.2);
  const west = Math.floor(Math.min(...lons) - 0.2);
  const east = Math.ceil(Math.max(...lons) + 0.2);
  const STEP = 2;

  const tiles = [];
  for (let s = south; s < north; s += STEP) {
    for (let w = west; w < east; w += STEP) {
      const box = { s, w, n: s + STEP, e: w + STEP };
      // Skip open sea: only tiles with a municipality nearby are worth asking for.
      const hasLand = municipalities.some(
        (m) => m.lat >= box.s - 0.1 && m.lat <= box.n + 0.1 && m.lon >= box.w - 0.1 && m.lon <= box.e + 0.1
      );
      if (hasLand) tiles.push(box);
    }
  }

  const seen = new Map();
  const fetchTile = async (box, depth = 0) => {
    const key = `osm-tile-${box.s}-${box.w}-${box.n}-${box.e}.json`;
    const query = `
      [out:json][timeout:300][bbox:${box.s},${box.w},${box.n},${box.e}];
      (
        nwr["place"~"^(village|hamlet|suburb|neighbourhood|quarter|locality|town|city|isolated_dwelling)$"]["name"];
        relation["boundary"="administrative"]["admin_level"="10"]["name"];
      );
      out center tags;`;
    try {
      return await cached(key, async () => {
        let lastError;
        for (const endpoint of OVERPASS) {
          try {
            const json = await request(
              endpoint,
              {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `data=${encodeURIComponent(query)}`,
              },
              3
            );
            return json.elements.map((el) => ({
              id: `${el.type}/${el.id}`,
              lat: el.lat ?? el.center?.lat,
              lon: el.lon ?? el.center?.lon,
              admin: el.tags.admin_level === "10",
              names: [el.tags.name, el.tags["name:en"], el.tags.official_name, el.tags.short_name]
                .concat((el.tags.alt_name || "").split(";"))
                .filter(Boolean),
            }));
          } catch (err) {
            lastError = err;
          }
        }
        throw lastError;
      });
    } catch (err) {
      // A tile too heavy for the public server: ask for its four quarters instead.
      if (depth >= 2) throw err;
      const midLat = (box.s + box.n) / 2;
      const midLon = (box.w + box.e) / 2;
      const quarters = [
        { s: box.s, w: box.w, n: midLat, e: midLon },
        { s: box.s, w: midLon, n: midLat, e: box.e },
        { s: midLat, w: box.w, n: box.n, e: midLon },
        { s: midLat, w: midLon, n: box.n, e: box.e },
      ];
      const parts = [];
      for (const quarter of quarters) parts.push(...(await fetchTile(quarter, depth + 1)));
      return parts;
    }
  };

  let done = 0;
  for (const box of tiles) {
    const elements = await fetchTile(box);
    for (const el of elements) if (el.lat != null && !seen.has(el.id)) seen.set(el.id, el);
    done += 1;
    console.log(`  OSM tile ${done}/${tiles.length} (${box.s},${box.w}) - ${seen.size} places so far`);
    await sleep(1500);
  }
  return [...seen.values()];
}

// ---------- spatial helper ----------

// Which municipality is a point in? The nearest municipality centre is a good
// stand-in without needing every boundary polygon.
function buildNearest(municipalities) {
  const CELL = 0.25;
  const key = (lat, lon) => `${Math.floor(lat / CELL)}:${Math.floor(lon / CELL)}`;
  const grid = new Map();
  for (const m of municipalities) {
    const k = key(m.lat, m.lon);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(m);
  }
  return (lat, lon) => {
    const cy = Math.floor(lat / CELL);
    const cx = Math.floor(lon / CELL);
    for (let ring = 1; ring <= 12; ring += 1) {
      let best = null;
      for (let dy = -ring; dy <= ring; dy += 1) {
        for (let dx = -ring; dx <= ring; dx += 1) {
          const list = grid.get(`${cy + dy}:${cx + dx}`);
          if (!list) continue;
          for (const m of list) {
            const d = haversineKm(lat, lon, m.lat, m.lon);
            if (!best || d < best.d) best = { m, d };
          }
        }
      }
      // Anything closer than this must have been inside the rings already searched.
      if (best && best.d <= ring * CELL * 100) return best;
    }
    return null;
  };
}

// ---------- build ----------

async function main() {
  console.log("Loading PSGC hierarchy...");
  const psgc = await loadPsgc();
  console.log("Loading Wikidata coordinates...");
  const wikidata = await loadWikidataCoordinates();
  const coordinateFor = (record) => wikidata.get(record.psgc10DigitCode) || wikidata.get(record.code);

  // Provinces (+ Metro Manila, which PSGC files under districts, not a province)
  const provinces = psgc.provinces
    .map((p) => ({ code: p.psgc10DigitCode, name: p.name, psgc9: p.code }))
    .concat([{ ...NCR_PROVINCE, psgc9: NCR_REGION_CODE }]);
  const provinceBy9 = new Map(provinces.map((p) => [p.psgc9, p]));

  const provinceNamed = (names) => provinces.find((p) => names.includes(p.name));

  // Cities and municipalities
  const cities = [];
  let skippedCities = 0;
  for (const c of psgc.cities) {
    let province = null;
    if (c.provinceCode) province = provinceBy9.get(c.provinceCode);
    else if (c.regionCode === NCR_REGION_CODE) province = provinceBy9.get(NCR_REGION_CODE);
    else if (INDEPENDENT_CITY_PROVINCE[c.code]) province = provinceNamed(INDEPENDENT_CITY_PROVINCE[c.code]);

    if (!province || !c.psgc10DigitCode) {
      skippedCities += 1;
      continue;
    }
    const point = coordinateFor(c);
    cities.push({
      code: c.psgc10DigitCode,
      psgc9: c.code,
      name: displayName(c.name),
      rawName: c.name,
      type: c.isCity ? "city" : "municipality",
      provinceCode: province.code,
      lat: point?.lat ?? null,
      lon: point?.lon ?? null,
    });
  }
  const cityBy9 = new Map(cities.map((c) => [c.psgc9, c]));

  // Barangays, grouped under their city/municipality
  const barangays = new Map();
  let orphanBarangays = 0;
  for (const b of psgc.barangays) {
    const city = cityBy9.get(b.cityCode || b.municipalityCode);
    if (!city || !b.psgc10DigitCode) {
      orphanBarangays += 1;
      continue;
    }
    if (!barangays.has(city.code)) barangays.set(city.code, []);
    const point = coordinateFor(b);
    barangays.get(city.code).push({
      code: b.psgc10DigitCode,
      name: b.name,
      lat: point ? round5(point.lat) : null,
      lon: point ? round5(point.lon) : null,
      source: point ? "wikidata" : null,
    });
  }

  // Cities Wikidata had no point for (a handful whose PSGC codes changed):
  // look each up once by name, and only as a last resort average their
  // province's other cities.
  const meanOf = (points) => ({
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lon: points.reduce((s, p) => s + p.lon, 0) / points.length,
  });
  const provinceName = new Map(provinces.map((p) => [p.code, p.name]));
  let geocodedCities = 0;
  let estimatedCities = 0;
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
      geocodedCities += 1;
      console.log(`  looked up ${city.name}: ${found.lat}, ${found.lon}`);
    } else if (province) {
      found = province;
      estimatedCities += 1;
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
  }

  // Barangays: fill gaps from OpenStreetMap
  let osmMatched = 0;
  if (!SKIP_OSM) {
    console.log("Loading OpenStreetMap places (this takes a while, and is cached)...");
    const places = await loadOsmPlaces(cities);
    console.log(`Matching ${places.length} OSM places to barangays...`);

    const nearest = buildNearest(cities);
    const namesByCity = new Map();
    for (const place of places) {
      const hit = nearest(place.lat, place.lon);
      if (!hit) continue;
      if (!namesByCity.has(hit.m.code)) namesByCity.set(hit.m.code, new Map());
      const index = namesByCity.get(hit.m.code);
      for (const name of new Set(place.names.map(normalize))) {
        if (!name) continue;
        if (!index.has(name)) index.set(name, []);
        index.get(name).push(place);
      }
    }

    for (const city of cities) {
      const index = namesByCity.get(city.code);
      if (!index) continue;
      for (const b of barangays.get(city.code) || []) {
        if (b.lat != null) continue;
        // A poblacion is usually mapped as the town itself.
        const wanted = new Set([normalize(b.name)]);
        if (/pob/i.test(b.name)) wanted.add(normalize(city.rawName));

        const found = [];
        for (const name of wanted) for (const p of index.get(name) || []) found.push(p);

        // Several entries for one barangay (a node and its boundary) sit almost
        // on top of each other - only genuinely different places are ambiguous.
        const distinct = [];
        for (const p of found) {
          if (!distinct.some((q) => haversineKm(p.lat, p.lon, q.lat, q.lon) < 2)) distinct.push(p);
        }
        if (distinct.length !== 1) continue;

        const pick = found.find((p) => p.admin) || found[0];
        if (haversineKm(pick.lat, pick.lon, city.lat, city.lon) > MAX_BARANGAY_KM) continue;
        b.lat = round5(pick.lat);
        b.lon = round5(pick.lon);
        b.source = "osm";
        osmMatched += 1;
      }
    }
  }

  // ---------- write ----------
  const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
  const usedProvinces = new Set(cities.map((c) => c.provinceCode));
  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      hierarchy: "Philippine Standard Geographic Code (PSA), via psgc.gitlab.io",
      coordinates: [
        "Wikidata (CC0), matched by PSGC code",
        SKIP_OSM ? null : "OpenStreetMap contributors (ODbL), matched by name",
      ].filter(Boolean),
    },
    provinces: provinces
      .filter((p) => usedProvinces.has(p.code))
      .sort((a, b) => collator.compare(a.name, b.name))
      .map((p) => [p.code, p.name]),
    cities: cities
      .sort((a, b) => collator.compare(a.name, b.name))
      .map((c) => [c.code, c.name, c.type, c.provinceCode, c.lat, c.lon]),
    barangays: Object.fromEntries(
      [...barangays.entries()].map(([cityCode, list]) => [
        cityCode,
        list
          .sort((a, b) => collator.compare(a.name, b.name))
          .map((b) => (b.lat == null ? [b.code, b.name] : [b.code, b.name, b.lat, b.lon])),
      ])
    ),
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));

  const total = [...barangays.values()].reduce((sum, list) => sum + list.length, 0);
  const withPoint = [...barangays.values()].flat().filter((b) => b.lat != null).length;
  const wikidataBarangays = [...barangays.values()].flat().filter((b) => b.source === "wikidata").length;
  console.log("\nDone.");
  console.log(`  provinces: ${out.provinces.length}`);
  console.log(`  cities/municipalities: ${cities.length} (${geocodedCities} looked up by name, ${estimatedCities} estimated, ${skippedCities} skipped)`);
  console.log(`  barangays: ${total} (${orphanBarangays} skipped for having no city)`);
  console.log(`  barangay points: ${withPoint} (${wikidataBarangays} Wikidata, ${osmMatched} OpenStreetMap) = ${((withPoint / total) * 100).toFixed(1)}%`);
  console.log(`  wrote ${OUT_FILE} (${(fs.statSync(OUT_FILE).size / 1048576).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
