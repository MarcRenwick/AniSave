// Distances between two people's registered addresses.
//
// Only registered-address coordinates are ever compared - never a live
// location - and each is the centre point of the person's municipality or city,
// so these are "as the crow flies" distances between those points, not driving
// distances.

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

const hasCoordinates = (address) =>
  Number.isFinite(address?.latitude) && Number.isFinite(address?.longitude);

// Great-circle distance in kilometres (haversine formula).
function distanceKm(from, to) {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// What to add to a farmer/product in a response so a buyer can see how far
// away it is. Empty when either side has no coordinates, so an unknown
// distance is never shown as 0.
//
// `sameCity` lets the client say "same municipality" for the case where both
// addresses resolve to one city's centre and the distance between them is
// meaninglessly close to 0.
function distanceFields(origin, target) {
  if (!hasCoordinates(origin) || !hasCoordinates(target)) return {};
  return {
    // One decimal is plenty for points that are place centres.
    distanceKm: Math.round(distanceKm(origin, target) * 10) / 10,
    sameCity: Boolean(origin.cityCode) && origin.cityCode === target.cityCode,
  };
}

// Nearest first; anything without a known distance goes last, in the order it
// arrived (Array.sort is stable, so the caller's own ordering is kept).
const byNearest = (getDistance) => (a, b) => {
  const da = getDistance(a);
  const db = getDistance(b);
  if (da == null && db == null) return 0;
  if (da == null) return 1;
  if (db == null) return -1;
  return da - db;
};

module.exports = { hasCoordinates, distanceKm, distanceFields, byNearest };
