// The "Premium Harvest" tokens for code that animates or draws in JavaScript
// (Motion, GSAP, Recharts) - the same values as theme/harvest.css, which is
// where the CSS side reads them from.

export const COLORS = {
  night: "#0f2418",
  night800: "#132d1f",
  night700: "#1a3a29",
  forest50: "#eef6ee",
  forest100: "#d9ebd9",
  forest200: "#b6d9b8",
  forest300: "#88bf8d",
  forest400: "#58a061",
  forest600: "#2e7d32",
  forest700: "#256a2b",
  forest800: "#1f5130",
  gold200: "#f7db8f",
  gold400: "#f2c14e",
  gold500: "#e8a33d",
  gold600: "#c98521",
  tomato400: "#ec7a55",
  tomato500: "#e4572e",
  tomato600: "#c4421a",
  soil500: "#8a5a3c",
  soil700: "#5c3d2e",
  clay500: "#a0522d",
  cream: "#fbf7ee",
  paper: "#fffdf8",
  sand: "#f3ebdc",
  ink: "#1a1d16",
  muted: "#62594a",
  hairline: "#e7dfcf",
};

// One colour per marketplace category (utils/categories.js).
export const CATEGORY_COLORS = {
  vegetable: "#2e7d32",
  fruit: "#e4572e",
  egg: "#e8a33d",
  meat: "#9b2226",
  seafood: "#0e7c86",
};

// Easing curves as Motion and GSAP take them.
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_SOFT = [0.33, 1, 0.68, 1];
export const GSAP_EASE = "power3.out";

// Springs for anything that follows the pointer or answers a tap.
export const SPRING = { type: "spring", stiffness: 380, damping: 30, mass: 0.8 };
export const SPRING_SOFT = { type: "spring", stiffness: 140, damping: 18, mass: 0.9 };

// How long things take. The landing page takes its time; the farmer pages
// are a place of work, so theirs are short.
export const DURATION = {
  hover: 0.2,
  quick: 0.28,
  page: 0.36,
  reveal: 0.7,
  hero: 0.9,
};
