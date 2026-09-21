const mongoose = require("mongoose");

// How much buyers are looking for a listing, as opposed to how much of it has
// been sold: one row per product, counted up as buyers search for it and open
// it. Nothing here comes from orders - that is what the sales leaderboards are
// for - so a crop everyone searches and nobody has bought yet still shows up
// as demand on the farmer's dashboard.
const productInterestSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The listing's title, kept alongside the counts so crops can be ranked by
    // name without loading every product behind them. It follows the listing
    // if the farmer renames it.
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // A search whose results included this listing.
    searches: {
      type: Number,
      default: 0,
    },
    // Someone opening the listing itself.
    views: {
      type: Number,
      default: 0,
    },
    lastAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductInterest", productInterestSchema);
