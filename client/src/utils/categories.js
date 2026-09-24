// The marketplace's product categories, as a listing's `category` holds them.
// A listing never picks one itself: it follows from the catalogue product it
// names, so a mango can't be filed under vegetables or a bangus under meat.
// Root crops and grains sit with the vegetables.
export const CATEGORIES = [
  { key: "vegetable", label: "Vegetables" },
  { key: "fruit", label: "Fruits" },
  { key: "egg", label: "Eggs" },
  { key: "meat", label: "Meat" },
  { key: "seafood", label: "Seafood" },
];

const LABELS = Object.fromEntries(CATEGORIES.map(({ key, label }) => [key, label]));

export const categoryLabel = (category) => LABELS[category] || "Vegetables";

// Vegetables and Fruits are always offered as filters, as they always were.
// The newer categories only appear once there is something in them, so a shop
// that sells neither eggs, meat nor seafood looks exactly as before.
export const categoryFilters = (products) => [
  ...CATEGORIES.slice(0, 2),
  ...CATEGORIES.slice(2).filter(({ key }) => products.some((p) => p.category === key)),
];

// "Vegetables", "Vegetables and Fruits", "Vegetables, Fruits and Eggs".
export const listCategories = (keys) => {
  const labels = keys.map(categoryLabel);
  return labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
};
