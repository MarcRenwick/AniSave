const mongoose = require("mongoose");

// What a crop is going for at a municipality's own market, as recorded on a
// given day. A farmer listing that crop is shown the latest record for THEIR
// municipality as a suggested price - never one from a neighbouring town, and
// never a figure the app worked out for itself. If there is no record, the
// farmer is told so plainly (see controllers/marketPriceController.js).
//
// `product` and `municipality` are the keys used for matching and are stored
// folded to lower case; the two label fields are what people are shown.
const marketPriceSchema = new mongoose.Schema(
  {
    product: {
      type: String,
      required: [true, "A product name is required"],
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: [true, "A product label is required"],
      trim: true,
    },
    // Other names the same crop goes by locally ("ampalaya" for bitter melon),
    // so a farmer's own wording still finds the right record. Stored folded to
    // lower case, like `product`.
    aliases: {
      type: [String],
      default: [],
    },
    municipality: {
      type: String,
      required: [true, "A municipality is required"],
      trim: true,
      lowercase: true,
    },
    municipalityLabel: {
      type: String,
      required: [true, "A municipality label is required"],
      trim: true,
    },
    province: {
      type: String,
      trim: true,
    },
    pricePerKilo: {
      type: Number,
      required: [true, "A price per kilo is required"],
      min: [0, "A price can't be negative"],
    },
    // When this price was taken at the market - the "latest available record"
    // is decided by this, not by when the row happened to be inserted.
    recordedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Where the figure came from, so nobody has to guess how authoritative it
    // is. Sample data says so in as many words.
    source: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// The one query this model exists to answer: the latest price for a crop in a
// municipality.
marketPriceSchema.index({ municipality: 1, product: 1, recordedAt: -1 });

module.exports = mongoose.model("MarketPrice", marketPriceSchema);
