// Eggs are sold by the tray; everything else by the kilo. Whatever a figure
// is about - a listing, a cart item, an order, a catalogue crop, or just a
// category - says which: an order carries its own `unit`, the rest are told
// apart by category.
export function unitOf(thing) {
  if (!thing) return "kg";
  if (typeof thing === "string") return thing === "egg" || thing === "tray" ? "tray" : "kg";
  if (thing.unit === "tray" || thing.unit === "kg") return thing.unit;
  const category = thing.category || thing.listingCategory || thing.product?.category;
  return category === "egg" || thing.group === "egg" ? "tray" : "kg";
}

// "5 kg", "1 tray", "4 trays".
export const amountOf = (n, unit) => (unit === "tray" ? `${n} tray${Number(n) === 1 ? "" : "s"}` : `${n} kg`);

// The unit as a word: "kilo" or "tray" ("per kilo", "one tray more"), and its
// plural ("kilos", "trays").
export const unitWord = (unit) => (unit === "tray" ? "tray" : "kilo");
export const unitWords = (unit) => (unit === "tray" ? "trays" : "kilos");

// After a price: "/ kg" or "/ tray".
export const perUnit = (unit) => (unit === "tray" ? "/ tray" : "/ kg");

// Kilos and trays added up separately - they can't be added to each other -
// and written together: "12 kg · 2 trays", or just the one there is.
export function totalAmounts(things, quantityOf = (t) => t.quantity) {
  let kg = 0;
  let trays = 0;
  things.forEach((t) => {
    if (unitOf(t) === "tray") trays += Number(quantityOf(t)) || 0;
    else kg += Number(quantityOf(t)) || 0;
  });
  const parts = [];
  if (kg > 0 || trays === 0) parts.push(amountOf(Math.round(kg * 100) / 100, "kg"));
  if (trays > 0) parts.push(amountOf(trays, "tray"));
  return parts.join(" · ");
}
