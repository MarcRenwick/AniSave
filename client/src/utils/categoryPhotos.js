// A real market photo for each product category (utils/categories.js), at
// three widths - for the landing page's category cards and the buyer pages'
// category banners, and to stand in for a listing that has no photo of its own.
// Credits: assets/PHOTO_CREDITS.md.
import veg480 from "../assets/categories/vegetables-ampalaya-chili-eggplant-480.webp";
import veg800 from "../assets/categories/vegetables-ampalaya-chili-eggplant-800.webp";
import veg1200 from "../assets/categories/vegetables-ampalaya-chili-eggplant-1200.webp";
import fruit480 from "../assets/categories/fruits-carabao-mangoes-480.webp";
import fruit800 from "../assets/categories/fruits-carabao-mangoes-800.webp";
import fruit1200 from "../assets/categories/fruits-carabao-mangoes-1200.webp";
import egg480 from "../assets/categories/eggs-market-trays-480.webp";
import egg800 from "../assets/categories/eggs-market-trays-800.webp";
import egg1200 from "../assets/categories/eggs-market-trays-1200.webp";
import meat480 from "../assets/categories/meat-pork-cuts-480.webp";
import meat800 from "../assets/categories/meat-pork-cuts-800.webp";
import meat1200 from "../assets/categories/meat-pork-cuts-1200.webp";
import seafood480 from "../assets/categories/seafood-fresh-fish-banana-leaves-480.webp";
import seafood800 from "../assets/categories/seafood-fresh-fish-banana-leaves-800.webp";
import seafood1200 from "../assets/categories/seafood-fresh-fish-banana-leaves-1200.webp";

const photo = (small, medium, large, alt) => ({
  src: medium,
  small,
  srcSet: `${small} 480w, ${medium} 800w, ${large} 1200w`,
  alt,
});

export const CATEGORY_PHOTOS = {
  vegetable: photo(veg480, veg800, veg1200, "Ampalaya, chillies and eggplant at the market"),
  fruit: photo(fruit480, fruit800, fruit1200, "Ripe carabao mangoes at the market"),
  egg: photo(egg480, egg800, egg1200, "Fresh eggs stacked on trays"),
  meat: photo(meat480, meat800, meat1200, "Fresh pork cuts on a wooden board"),
  seafood: photo(seafood480, seafood800, seafood1200, "Fresh fish on banana leaves at the market"),
};

export const categoryPhoto = (category) => CATEGORY_PHOTOS[category] || CATEGORY_PHOTOS.vegetable;
