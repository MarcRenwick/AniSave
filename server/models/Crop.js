const mongoose = require("mongoose");
const { fold, matchKey } = require("../utils/fold");

// The catalogue of agricultural products a farmer can list, and the thing a
// market price is recorded against. It exists so that "Mango" means one
// particular row everywhere in the app: a listing stores this document's id
// rather than whatever the farmer typed, so a price recorded for Mango in
// Dagupan City can be matched to a Mango listing without comparing free text.
//
// Seeded by scripts/seedCrops.js from data/crops.js.
const cropSchema = new mongoose.Schema(
  {
    // What people are shown, e.g. "Sweet Potato (Camote)".
    name: {
      type: String,
      required: [true, "A crop name is required"],
      trim: true,
    },
    // The name folded for matching, and the one thing that may not repeat:
    // two catalogue rows for the same crop would split its market prices.
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Other names the same crop goes by, folded. "ampalaya" and "bitter melon"
    // both have to find the same row, or a farmer's own wording loses them
    // their price recommendation.
    aliases: {
      type: [String],
      default: [],
    },
    // What kind of produce it is. This is the catalogue's own grouping, used
    // for searching and for the admin price list; it is deliberately richer
    // than a listing's own vegetable/fruit category.
    group: {
      type: String,
      enum: ["fruit", "vegetable", "root crop", "grain"],
      required: true,
    },
    // Which of the marketplace's two categories a listing of this crop belongs
    // in, since that is what buyers filter by. Root crops and grains sit with
    // the vegetables there.
    listingCategory: {
      type: String,
      enum: ["vegetable", "fruit"],
      required: true,
    },
    // Every name this crop can be found by - its own and its other names -
    // written the one way a search is matched on: folded, and each word
    // singularised. This is what lets "tomatoes" find Tomato and "green bean"
    // find Green Beans, without a plural having to be listed as an alias.
    // Built from `name` and `aliases`; never set by hand.
    terms: {
      type: [String],
      default: [],
    },
    // A variety priced as the crop it is a variety of: Lakatan Banana is a
    // banana, and the market records a price for bananas, not for each
    // variety. The recommendation follows this and says whose price it is
    // showing, so nothing is passed off as a price for the variety itself.
    // Null means this crop is priced in its own right.
    pricesFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Crop",
      default: null,
    },
    // Whether the Recommended Price feature covers this crop. The catalogue is
    // deliberately wider than this: a farmer can list something nobody records
    // a market price for, and is simply told no recommendation is available.
    priceSupported: {
      type: Boolean,
      default: false,
    },
    // Lets a crop be retired without deleting it, so listings and market
    // prices that already point at it keep making sense.
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Typeahead: "man" has to reach Mango quickly while the farmer is still
// typing, by name or by any of its other names. (`slug` is already indexed by
// being unique.)
cropSchema.index({ aliases: 1 });
cropSchema.index({ terms: 1 });
cropSchema.index({ group: 1, name: 1 });

// The slug is never set by hand - it is always the name, folded - so a crop
// added through the admin page matches the same way a seeded one does.
cropSchema.pre("validate", function setSlug(next) {
  if (this.name) this.slug = fold(this.name);
  if (Array.isArray(this.aliases)) {
    this.aliases = [...new Set(this.aliases.map(fold).filter(Boolean))];
  }
  // The searchable forms are derived, never given: a crop added through the
  // admin page is findable the same way a seeded one is.
  this.terms = [
    ...new Set([this.name, ...(this.aliases || [])].map(matchKey).filter(Boolean)),
  ];
  next();
});

module.exports = mongoose.model("Crop", cropSchema);
