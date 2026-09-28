/*
 * The catalogue of agricultural products a farmer can list, seeded into the
 * `crops` collection by scripts/seedCrops.js.
 *
 * Every product here is covered by the Recommended Price feature: an
 * administrator can record market prices for any of them, and a farmer
 * listing one is shown the latest price for their own municipality (or told
 * plainly that there isn't one yet). The lists below are kept apart only as a
 * record of where each product came from - SUPPORTED is the requirement's
 * initial list plus common produce added later; ALSO_GROWN and
 * EGGS_MEAT_SEAFOOD were first catalogued without prices, and were opened to
 * pricing once administrators needed to price pork, fish and the rest.
 *
 * `group` is the catalogue's own grouping. `listingCategory` is which of the
 * marketplace's buyer-facing categories a listing lands in - Vegetables,
 * Fruits, Eggs, Meat or Seafood. Root crops and grains sit with the
 * vegetables.
 *
 * Aliases are the other names a crop goes by locally. They are what lets a
 * farmer type "ampalaya" and still be shown the price recorded for it.
 */

// Varieties a farmer may well want to list by name. Each is priced as the crop
// it is a variety of - the market records a price for bananas, not for each
// variety - and the recommendation says whose price it is showing rather than
// passing it off as the variety's own.
const VARIETIES = [
  ["fruit", "Lakatan Banana", ["lakatan"], "Banana"],
  ["fruit", "Latundan Banana", ["latundan", "tundan"], "Banana"],
  ["fruit", "Saba Banana", ["saba", "cardaba"], "Banana"],
  ["fruit", "Carabao Mango", ["carabao mango", "manggang kalabaw"], "Mango"],
  // "Señorita" folds to "se orita", so the plain spelling is an alias too -
  // most people type it without the tilde.
  ["fruit", "Señorita Banana", ["senorita", "senorita banana", "sinoritas"], "Banana"],
  ["fruit", "Pico Mango", ["pico", "piko", "manggang piko"], "Mango"],
];

// Requirement: the products the Recommended Price feature supports initially -
// the start of each section below. The rest of each section (Apple onwards in
// the fruits, Chinese Cabbage onwards in the vegetables, and so on), and the
// meat and seafood at the end, is common produce that first list missed. It
// can all be priced as well.
const SUPPORTED = [
  // ---- Fruits ----
  ["fruit", "Mango", ["mangga", "manga"]],
  ["fruit", "Banana", ["saging"]],
  ["fruit", "Calamansi", ["kalamansi", "calamondin"]],
  ["fruit", "Papaya", ["papaia"]],
  ["fruit", "Watermelon", ["pakwan"]],
  ["fruit", "Melon", ["cantaloupe", "muskmelon"]],
  ["fruit", "Coconut", ["niyog", "buko"]],
  ["fruit", "Guava", ["bayabas"]],
  ["fruit", "Jackfruit", ["langka", "nangka"]],
  ["fruit", "Avocado", ["abukado"]],
  ["fruit", "Pomelo", ["suha", "lukban"]],
  ["fruit", "Guyabano", ["soursop"]],
  ["fruit", "Chico", ["sapodilla"]],
  ["fruit", "Dragon Fruit", ["dragonfruit", "pitaya"]],
  ["fruit", "Pineapple", ["pinya"]],
  ["fruit", "Passion Fruit", ["passionfruit", "maracuya"]],
  ["fruit", "Santol", ["cotton fruit"]],
  ["fruit", "Tamarind", ["sampaloc", "sampalok"]],
  ["fruit", "Caimito", ["star apple", "kaimito"]],
  ["fruit", "Orange", ["dalandan"]],
  ["fruit", "Apple", ["mansanas"]],
  ["fruit", "Grapes (Ubas)", ["ubas", "grapes"]],
  ["fruit", "Lemon", ["limon"]],
  ["fruit", "Lime (Dayap)", ["dayap", "lime", "key lime"]],
  ["fruit", "Ponkan", ["mandarin", "mandarin orange"]],
  ["fruit", "Marang", ["terap"]],
  ["fruit", "Longan", []],
  ["fruit", "Macopa", ["makopa", "wax apple", "java apple", "tambis"]],
  ["fruit", "Kamias", ["camias", "bilimbi"]],
  ["fruit", "Siniguelas", ["sineguelas", "seriguelas", "spanish plum"]],
  ["fruit", "Chesa", ["tiesa", "canistel"]],
  ["fruit", "Bignay", ["bugnay", "currant tree"]],
  ["fruit", "Aratiles", ["aratilis", "datiles", "jamaican cherry"]],
  ["fruit", "Pili Nut", ["pili"]],
  ["fruit", "Honeydew Melon", ["honeydew"]],

  // ---- Vegetables ----
  ["vegetable", "Eggplant", ["talong", "egg plant"]],
  ["vegetable", "Squash", ["kalabasa"]],
  ["vegetable", "Onion", ["sibuyas"]],
  ["vegetable", "Tomato", ["kamatis", "tomatoes"]],
  ["vegetable", "String Beans", ["sitaw", "yardlong beans", "string bean"]],
  // The requirement names this one in Filipino; "bitter melon" is the same
  // crop and is what some listings already call it.
  ["vegetable", "Ampalaya", ["bitter melon", "bitter gourd", "amargoso", "ampalaya"]],
  ["vegetable", "Okra", ["lady finger", "ladys finger"]],
  ["vegetable", "Pechay", ["petsay", "bok choy", "pak choi"]],
  ["vegetable", "Kangkong", ["water spinach", "swamp cabbage"]],
  ["vegetable", "Cabbage", ["repolyo"]],
  ["vegetable", "Carrot", ["karot", "carrots"]],
  ["vegetable", "Cucumber", ["pipino"]],
  ["vegetable", "Bell Pepper", ["atsal", "sweet pepper", "capsicum"]],
  ["vegetable", "Radish", ["labanos"]],
  ["vegetable", "Garlic", ["bawang"]],
  ["vegetable", "Ginger", ["luya"]],
  ["vegetable", "Lettuce", ["litsugas"]],
  ["vegetable", "Mustard Greens", ["mustasa", "mustard"]],
  ["vegetable", "Malunggay", ["moringa", "horseradish tree"]],
  // The requirement lists Sayote and Chayote separately; they are one crop, so
  // they are one row with both names on it.
  ["vegetable", "Sayote", ["chayote", "sayote squash"]],
  ["vegetable", "Mongo", ["monggo", "mung bean", "mungbean"]],
  // Listed in the requirement as "Corn for fresh vegetable use" - sweet corn
  // sold as a vegetable, as opposed to the grain further down.
  ["vegetable", "Sweet Corn", ["corn for fresh vegetable use", "green corn", "sweetcorn"]],
  ["vegetable", "Green Beans", ["baguio beans", "green bean", "snap beans"]],
  ["vegetable", "Chinese Cabbage (Pechay Baguio)", ["pechay baguio", "chinese cabbage", "napa cabbage", "wombok"]],
  ["vegetable", "Saluyot", ["jute mallow", "jute leaves"]],
  ["vegetable", "Sweet Potato Tops (Talbos ng Kamote)", ["talbos ng kamote", "camote tops", "kamote tops", "sweet potato leaves"]],
  ["vegetable", "Hyacinth Bean (Bataw)", ["bataw", "hyacinth bean", "lablab"]],
  ["vegetable", "Lima Bean (Patani)", ["patani", "lima bean", "butter bean"]],
  ["vegetable", "Pigeon Pea (Kadyos)", ["kadyos", "pigeon pea", "kardis"]],
  ["vegetable", "Snow Peas (Sitsaro)", ["sitsaro", "chicharo", "snow peas"]],
  ["vegetable", "Bamboo Shoots (Labong)", ["labong", "rabong", "bamboo shoots"]],
  ["vegetable", "Banana Heart (Puso ng Saging)", ["puso ng saging", "banana blossom", "banana heart"]],
  ["vegetable", "Oyster Mushroom", ["kabute"]],
  ["vegetable", "Finger Chili (Siling Haba)", ["siling haba", "siling pansigang", "long chili", "green chili"]],
  ["vegetable", "Lemongrass (Tanglad)", ["tanglad", "lemongrass", "lemon grass"]],
  ["vegetable", "Coriander (Wansoy)", ["wansoy", "cilantro", "coriander"]],
  ["vegetable", "Leeks", []],
  ["vegetable", "Asparagus", []],
  ["vegetable", "Zucchini", ["courgette"]],

  // ---- Root crops ----
  ["root crop", "Sweet Potato (Camote)", ["camote", "kamote", "sweet potato"]],
  ["root crop", "Cassava", ["kamoteng kahoy", "balinghoy", "manioc"]],
  ["root crop", "Potato", ["patatas"]],
  ["root crop", "Taro (Gabi)", ["gabi", "taro"]],
  ["root crop", "Purple Yam (Ube)", ["ube", "purple yam", "ubi"]],
  ["root crop", "Arrowroot (Uraro)", ["uraro", "araro", "arrowroot"]],
  ["root crop", "Yam", ["tugui", "greater yam"]],
  // The requirement lists this under both vegetables and root crops; it is one
  // crop, catalogued as the root crop it is.
  ["root crop", "Jicama (Singkamas)", ["singkamas", "jicama", "turnip"]],
  ["root crop", "Turmeric (Luyang Dilaw)", ["luyang dilaw", "turmeric", "dilaw"]],

  // ---- Grains ----
  ["grain", "Rice", ["bigas", "palay"]],
  ["grain", "Corn", ["mais", "field corn", "yellow corn"]],
  ["grain", "Glutinous Rice (Malagkit)", ["malagkit", "glutinous rice", "sticky rice"]],
  ["grain", "Brown Rice", ["pinawa", "unpolished rice"]],
  ["grain", "Sorghum", ["batad"]],
  ["grain", "Millet", ["dawa"]],
  ["grain", "Barley", []],
  ["grain", "Oats", ["oat"]],
  ["grain", "Wheat", ["trigo"]],
  ["grain", "Adlai", ["adlay", "job's tears", "jobs tears"]],
  ["grain", "Black Rice", ["pirurutong", "purple rice"]],
  ["grain", "Red Rice", ["pulang bigas"]],
  ["grain", "White Corn", ["puting mais", "white maize"]],

  // ---- Meat ----
  ["meat", "Duck (Itik)", ["itik", "pato", "duck", "duck meat"]],
  ["meat", "Quail (Pugo)", ["pugo", "quail", "quail meat"]],
  ["meat", "Turkey (Pabo)", ["pabo", "turkey"]],
  ["meat", "Rabbit", ["kuneho", "rabbit meat"]],
  ["meat", "Mutton (Tupa)", ["tupa", "mutton", "lamb", "karne ng tupa"]],

  // ---- Seafood ----
  // Fish included - Seafood is the buyers' category for both.
  ["seafood", "Tuna (Tambakol)", ["tambakol", "tuna", "yellowfin tuna", "bariles"]],
  ["seafood", "Frigate Tuna (Tulingan)", ["tulingan", "frigate tuna", "bullet tuna"]],
  ["seafood", "Indian Mackerel (Alumahan)", ["alumahan", "indian mackerel"]],
  ["seafood", "Short Mackerel (Hasa-hasa)", ["hasa-hasa", "short mackerel"]],
  ["seafood", "Spanish Mackerel (Tanigue)", ["tanigue", "tangigue", "spanish mackerel"]],
  ["seafood", "Sardines (Tamban)", ["tamban", "sardines", "sardinas"]],
  ["seafood", "Anchovy (Dilis)", ["dilis", "anchovy", "anchovies"]],
  ["seafood", "Fusilier (Dalagang Bukid)", ["dalagang bukid", "fusilier"]],
  ["seafood", "Grouper (Lapu-lapu)", ["lapu-lapu", "grouper"]],
  ["seafood", "Red Snapper (Maya-maya)", ["maya-maya", "red snapper", "snapper"]],
  ["seafood", "Threadfin Bream (Bisugo)", ["bisugo", "threadfin bream"]],
  ["seafood", "Trevally (Talakitok)", ["talakitok", "trevally", "mamsa"]],
  ["seafood", "Pompano", ["pampano"]],
  ["seafood", "Mudfish (Dalag)", ["dalag", "mudfish", "snakehead"]],
  ["seafood", "Carp (Karpa)", ["karpa", "carp"]],
  ["seafood", "Gourami", ["gurami", "gouramy"]],
  ["seafood", "Freshwater Prawn (Ulang)", ["ulang", "freshwater prawn"]],
  ["seafood", "Clams (Halaan)", ["halaan", "clams", "tulya"]],
  ["seafood", "Seaweed (Lato)", ["lato", "seaweed", "sea grapes", "guso"]],
];

// Other produce a farmer may legitimately sell.
const ALSO_GROWN = [
  ["vegetable", "Broccoli", ["brocoli", "brokoli"]],
  ["vegetable", "Cauliflower", ["koliplor"]],
  ["vegetable", "Bottle Gourd (Upo)", ["upo", "bottle gourd"]],
  ["vegetable", "Sponge Gourd (Patola)", ["patola", "sponge gourd", "luffa"]],
  ["vegetable", "Winged Bean (Sigarilyas)", ["sigarilyas", "winged bean"]],
  ["vegetable", "Spinach", ["alugbati"]],
  ["vegetable", "Celery", ["kintsay", "kinchay"]],
  ["vegetable", "Chili Pepper", ["sili", "siling labuyo", "chili"]],
  ["vegetable", "Spring Onion", ["sibuyas na mura", "scallion", "green onion"]],
  ["vegetable", "Peanut", ["mani", "groundnut"]],
  ["vegetable", "Soybean", ["utaw", "soya"]],
  ["fruit", "Strawberry", ["strawberries"]],
  ["fruit", "Lanzones", ["langsat"]],
  ["fruit", "Rambutan", []],
  ["fruit", "Durian", []],
  ["fruit", "Atis (Sugar Apple)", ["atis", "sugar apple", "sweetsop"]],
  ["fruit", "Duhat (Java Plum)", ["duhat", "java plum", "black plum"]],
  ["fruit", "Starfruit (Balimbing)", ["balimbing", "starfruit", "carambola"]],
  ["fruit", "Mangosteen", []],
  ["fruit", "Pomegranate", ["granada"]],
];

// Eggs, meat and seafood - what poultry and livestock raisers and fisherfolk
// sell. Each kind is a buyer-facing category of its own rather than being
// filed under vegetables.
const EGGS_MEAT_SEAFOOD = [
  // ---- Eggs ----
  ["egg", "Chicken Egg", ["egg", "itlog", "itlog ng manok", "fresh egg"]],
  ["egg", "Duck Egg", ["itlog ng pato", "pato egg"]],
  ["egg", "Quail Egg", ["itlog ng pugo", "pugo egg"]],

  // ---- Meat ----
  ["meat", "Pork", ["baboy", "karne ng baboy", "pig"]],
  ["meat", "Beef", ["baka", "karne ng baka"]],
  ["meat", "Chicken", ["manok", "karne ng manok", "native chicken"]],
  ["meat", "Carabeef", ["kalabaw", "carabao meat", "karne ng kalabaw"]],
  ["meat", "Goat Meat", ["kambing", "karne ng kambing", "chevon"]],

  // ---- Seafood ----
  ["seafood", "Milkfish (Bangus)", ["bangus", "milkfish"]],
  ["seafood", "Tilapia", ["tilapya"]],
  ["seafood", "Round Scad (Galunggong)", ["galunggong", "round scad"]],
  ["seafood", "Catfish (Hito)", ["hito", "catfish"]],
  ["seafood", "Shrimp", ["hipon", "sugpo", "prawn"]],
  ["seafood", "Crab", ["alimango", "alimasag", "mud crab"]],
  ["seafood", "Squid", ["pusit"]],
  ["seafood", "Mussels (Tahong)", ["tahong", "mussels"]],
  ["seafood", "Oysters (Talaba)", ["talaba", "oysters"]],
];

// Root crops and grains are sold alongside the vegetables; fruit, eggs, meat
// and seafood are each a category buyers can filter by.
const OWN_CATEGORIES = ["fruit", "egg", "meat", "seafood"];
const listingCategoryFor = (group) => (OWN_CATEGORIES.includes(group) ? group : "vegetable");

const rowsOf = (list, priceSupported) =>
  list.map(([group, name, aliases, pricesFrom = null]) => ({
    name,
    group,
    listingCategory: listingCategoryFor(group),
    aliases,
    priceSupported,
    // The name of the crop this one is priced as, if it is a variety. The seed
    // turns it into that crop's id.
    pricesFrom,
  }));

// Everything the catalogue holds, in one list. A variety counts as supported:
// there is a price to recommend for it, just one recorded against the crop it
// is a variety of.
const CROPS = [
  ...rowsOf(SUPPORTED, true),
  ...rowsOf(VARIETIES, true),
  ...rowsOf(ALSO_GROWN, true),
  ...rowsOf(EGGS_MEAT_SEAFOOD, true),
];

module.exports = { CROPS, SUPPORTED, VARIETIES, ALSO_GROWN, EGGS_MEAT_SEAFOOD, listingCategoryFor };
