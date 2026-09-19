// The Philippine address list behind the Province > Municipality/City pickers,
// and the lookup that turns a selection into a saved address with coordinates.
//
// Data comes from data/locations.json, built by scripts/buildLocations.js -
// nothing here calls an outside service, so registering never depends on one.
const fs = require("fs");
const path = require("path");
const { normalizeName } = require("./placeNames");

const DATA_FILE = path.join(__dirname, "..", "data", "locations.json");

let index = null;

function load() {
  if (index) return index;

  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  const provinces = raw.provinces.map(([code, name]) => ({ code, name }));
  const provinceByCode = new Map(provinces.map((p) => [p.code, p]));

  const cities = raw.cities.map(([code, name, type, provinceCode, latitude, longitude]) => ({
    code,
    name,
    type,
    provinceCode,
    latitude,
    longitude,
  }));
  const cityByCode = new Map(cities.map((c) => [c.code, c]));
  const citiesByProvince = new Map();
  for (const city of cities) {
    if (!citiesByProvince.has(city.provinceCode)) citiesByProvince.set(city.provinceCode, []);
    citiesByProvince.get(city.provinceCode).push(city);
  }

  index = { provinces, provinceByCode, cities, cityByCode, citiesByProvince };
  return index;
}

const listProvinces = () => load().provinces.map(({ code, name }) => ({ code, name }));

// null when the code isn't one we know, so the route can answer 404.
function listCities(provinceCode) {
  const { provinceByCode, citiesByProvince } = load();
  if (!provinceByCode.has(provinceCode)) return null;
  return (citiesByProvince.get(provinceCode) || []).map(({ code, name, type }) => ({ code, name, type }));
}

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

// What gets saved for a place: the address, its coordinates, and a readable
// one-line label for it.
function addressOf(province, city) {
  return {
    address: {
      provinceCode: province.code,
      province: province.name,
      cityCode: city.code,
      city: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
    },
    label: `${city.name}, ${province.name}`,
  };
}

// Turns the province and municipality/city a person picked into the saved
// address.
//
// The coordinates are the picked city's own, looked up here from its code -
// never taken from the request - so nobody can save a location they didn't
// actually pick, and nobody has to type a latitude or longitude.
function resolveAddress({ provinceCode, cityCode }) {
  if (!provinceCode || !cityCode) {
    throw invalid("Choose your province and municipality/city");
  }

  const { provinceByCode, cityByCode } = load();

  const province = provinceByCode.get(provinceCode);
  if (!province) throw invalid("That province isn't in the list");

  const city = cityByCode.get(cityCode);
  if (!city || city.provinceCode !== province.code) {
    throw invalid("That municipality/city isn't in the selected province");
  }

  return addressOf(province, city);
}

// For accounts made before addresses were structured: find the one city or
// municipality a free-typed location ("Dagupan", "Lingayen, Pangasinan")
// names. Returns null when it's missing or could mean several places, so
// nobody is silently put in the wrong town.
function matchLegacyLocation(text) {
  const { provinces, cities, provinceByCode } = load();
  const parts = String(text || "")
    .split(",")
    .map(normalizeName)
    .filter(Boolean);
  if (parts.length === 0) return null;

  let matches = cities.filter((city) => parts.includes(normalizeName(city.name)));

  // "Santa Maria, Pangasinan" narrows itself down by the province it names.
  if (matches.length > 1) {
    const named = provinces.filter((p) => parts.includes(normalizeName(p.name))).map((p) => p.code);
    if (named.length) matches = matches.filter((city) => named.includes(city.provinceCode));
  }
  if (matches.length !== 1) return null;

  return addressOf(provinceByCode.get(matches[0].provinceCode), matches[0]);
}

module.exports = { listProvinces, listCities, resolveAddress, matchLegacyLocation };
