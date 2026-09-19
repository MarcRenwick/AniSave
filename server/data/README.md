# Location data

`locations.json` is the Province → City/Municipality → Barangay list behind the
address dropdowns, with a latitude/longitude for every place. The server loads
it once (see `utils/locations.js`) - nothing looks anything up online while
someone is registering.

## Where it comes from

| Data | Source | Licence |
| --- | --- | --- |
| Provinces, cities/municipalities, barangays and their PSGC codes | Philippine Standard Geographic Code (Philippine Statistics Authority), via <https://psgc.gitlab.io/api> | Public government data |
| Coordinates for almost every city/municipality and some barangays | [Wikidata](https://www.wikidata.org), matched by PSGC code | CC0 |
| Coordinates for most other barangays | [OpenStreetMap](https://www.openstreetmap.org/copyright) place points, matched by name to the barangays of the nearest municipality | © OpenStreetMap contributors, ODbL |
| Six cities/municipalities Wikidata has no point for | Looked up once by name with Nominatim | © OpenStreetMap contributors, ODbL |

Metro Manila (NCR) has no province in PSGC, so it is listed as one
("Metro Manila (NCR)"). City of Isabela and City of Cotabato, which PSGC lists
outside any province, are filed under Basilan and Maguindanao where they
physically are. Cities are shown as "Baguio City" whichever way PSGC spells them.

## How precise are the coordinates?

Every address is saved with `address.precision`:

- `barangay` - the barangay's own point (from Wikidata, or an OpenStreetMap
  place matched to it by name).
- `city` - the barangay isn't in the data, so it falls back to its
  city/municipality's centre, which every place has.

So a distance is between two place centres, "as the crow flies" - not a driving
distance - and two people in the same barangay/municipality show as
"less than 1 km" / "same municipality". When both sides are `barangay`
precision it is accurate to about the size of a barangay.

The build only accepts an OpenStreetMap match when exactly one place in that
municipality has the barangay's name and it lies within 60 km of the
municipality's centre; ambiguous or missing names fall back to `city`.

## Rebuilding it

```bash
cd server
node scripts/buildLocations.js             # everything (slow: downloads OSM in tiles)
node scripts/buildLocations.js --skip-osm  # quick: city/municipality points only
```

Downloads are cached in `data/.cache/` (git-ignored), so a re-run is quick and
polite to the public servers. Delete the cache to refresh from scratch. The
PSGC snapshot behind `psgc.gitlab.io` predates a few 2023-24 changes (the
Negros Island Region, the split of Maguindanao), so those follow the older
hierarchy.

## File format

```jsonc
{
  "provinces": [["0105500000", "Pangasinan"]],
  "cities":    [["0105522000", "Lingayen", "municipality", "0105500000", 16.01667, 120.23333]],
  // barangays are grouped by city code; the last two numbers are optional
  "barangays": { "0105522000": [["0105522001", "Aliwekwek", 16.0141, 120.2327]] }
}
```
