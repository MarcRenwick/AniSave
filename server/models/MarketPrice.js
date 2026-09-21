const mongoose = require("mongoose");

// What a crop is going for at a municipality's own market, as recorded on a
// given day. A farmer listing that crop is shown the latest record for THEIR
// municipality as a suggested price - never one from a neighbouring town, and
// never a figure the app worked out for itself. If there is no record, the
// farmer is told so plainly (see controllers/marketPriceController.js).
//
// Records are kept by an administrator. Nothing in the app creates, adjusts or
// estimates one, and no price is written down anywhere in the code.
//
// Both keys a lookup uses are ids, not text: the catalogue crop and the
// municipality's own PSGC code. That is what makes "Mango in Dagupan City"
// mean exactly one thing, whatever a farmer typed to find it.
const marketPriceSchema = new mongoose.Schema(
  {
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Crop",
      required: [true, "A product is required"],
    },
    // The municipality/city this price was taken in, by its PSGC code - the
    // same code the farmer's own address carries, so the two match exactly.
    cityCode: {
      type: String,
      required: [true, "A municipality/city is required"],
      trim: true,
    },
    // Its readable name, stored so a record still reads properly on its own.
    municipality: {
      type: String,
      required: [true, "A municipality/city name is required"],
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
    // Outdated records are archived rather than deleted, so the history of
    // what a crop went for is not lost. An archived record is never
    // recommended.
    archived: {
      type: Boolean,
      default: false,
    },
    // Which administrator last wrote this record down.
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// The one query this model exists to answer: the latest live price for a crop
// in a municipality.
marketPriceSchema.index({ cityCode: 1, crop: 1, archived: 1, recordedAt: -1 });

module.exports = mongoose.model("MarketPrice", marketPriceSchema);
