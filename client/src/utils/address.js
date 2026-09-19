// Helpers for the registered-address pickers and the distances shown beside
// farmers and products.

export const emptyAddress = { provinceCode: "", cityCode: "", barangayCode: "" };

// What the pickers need to show an account's saved address.
export const addressFromUser = (user) => ({
  provinceCode: user?.address?.provinceCode || "",
  cityCode: user?.address?.cityCode || "",
  barangayCode: user?.address?.barangayCode || "",
});

export const isAddressComplete = (a) => Boolean(a.provinceCode && a.cityCode && a.barangayCode);
export const sameAddress = (a, b) =>
  a.provinceCode === b.provinceCode && a.cityCode === b.cityCode && a.barangayCode === b.barangayCode;
export const isAddressEmpty = (a) => !a.provinceCode && !a.cityCode && !a.barangayCode;

// Whether the server has a registered point for this account - what "nearest"
// is measured from. Accounts made before addresses were structured don't.
export const hasAddressPoint = (user) =>
  Number.isFinite(user?.address?.latitude) && Number.isFinite(user?.address?.longitude);

// "Lingayen, Pangasinan" - the compact form for cards.
export const cityAndProvince = (place) => [place?.city, place?.province].filter(Boolean).join(", ");

// "12.4 km" for something the server measured against the viewer's address.
// Points this close together are only ever a place's centre, so "less than a
// kilometre" - or "same municipality" - is the honest thing to say, not "0 km".
export function formatDistance(place) {
  const km = place?.distanceKm;
  if (km == null) return "";
  if (km < 1) return place.sameCity ? "Same municipality/city" : "Less than 1 km";
  return `${km.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}
