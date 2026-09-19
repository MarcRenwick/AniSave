// Shared by the location data build script and the server, so both compare
// Philippine place names the same way.

// PSGC names most cities "City of Baguio" but some "Batangas City". People
// look for either under B, so show them all the second way.
const displayName = (name) => String(name).replace(/^City of (.+)$/i, "$1 City");

// Puts a place name in a form two spellings of the same place will share:
// no accents, no "(Pob.)" or "(Capital)", no "City of" / "Barangay", and the
// usual abbreviations spelled out.
function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(city of|municipality of|city)\b/g, " ")
    .replace(/\b(barangay|brgy|bgy)\b\.?/g, " ")
    .replace(/\bsta\b\.?/g, "santa")
    .replace(/\bsto\b\.?/g, "santo")
    .replace(/\bgen\b\.?/g, "general")
    .replace(/\bpres\b\.?/g, "president")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

module.exports = { displayName, normalizeName };
