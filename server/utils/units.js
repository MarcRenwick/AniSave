// Eggs are sold by the tray; everything else by the kilo. A listing's unit
// follows from its category, and an order keeps the unit it was placed in.
const unitOf = (category) => (category === "egg" ? "tray" : "kg");

// "5kg", "1 tray", "4 trays" - for messages.
const amountOf = (n, unit) => (unit === "tray" ? `${n} tray${n === 1 ? "" : "s"}` : `${n}kg`);

module.exports = { unitOf, amountOf };
