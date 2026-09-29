const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Which catalogue crop this listing is of. The farmer picks it from the
    // product selector, and the title below is then that crop's own name -
    // so "Mango" always means the one catalogue row, and a market price
    // recorded against it can be matched without comparing free text.
    //
    // Not required by the schema, because listings made before the catalogue
    // existed have none and must go on working (restocking one, for instance,
    // saves the whole document). New listings are required to have one by the
    // controller, and scripts/backfillProductCrops.js fills in the old ones.
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Crop",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    // Always mirrors images[0], so everything that shows a single cover photo
    // (cards, cart lines, orders) keeps working without knowing about images.
    image: {
      type: String,
      default: null,
    },
    // Up to five photos, in the order the farmer arranged them.
    images: {
      type: [String],
      default: [],
    },
    // "preorder" listings are ordered ahead of the stock being there.
    productType: {
      type: String,
      enum: ["sale", "preorder"],
      default: "sale",
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      enum: ["vegetable", "fruit", "egg", "meat", "seafood"],
      required: [true, "Category is required"],
    },
    // A discounted price the farmer sets to move old stock - null means no
    // Flash Sale is running. There's no expiry: it stays discounted until the
    // farmer clears this or raises it back above the regular price.
    salePrice: {
      type: Number,
      min: [0, "Sale price cannot be negative"],
      default: null,
      validate: {
        validator: function (value) {
          return value == null || value < this.price;
        },
        message: "Sale price must be less than the regular price",
      },
    },
    location: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // What the whole batch cost the farmer to produce - seeds, fertilizer,
    // labor, transport - for all the kilos (or trays) listed, as they reckon
    // it. The expense, income and profit figures are all worked out from this
    // and the listing's other fields (see utils/profit.js), so nothing else
    // about them is stored.
    //
    // It is the farmer's own business, so it is left out of every query
    // unless one asks for it by name ("+totalExpense"), and the marketplace's
    // aggregations drop it explicitly. Every new listing must have one; a
    // listing from before expenses were recorded may have none, and is asked
    // for it when next edited (the controller checks).
    totalExpense: {
      type: Number,
      min: [0, "Total expense cannot be negative"],
      default: null,
      required: [
        function requiredWhenNew() {
          return this.isNew;
        },
        "Total expense is required",
      ],
      select: false,
    },
    // How many kilos (or trays) the batch the expense is for held - the stock
    // when the listing was made. The cost of one is totalExpense divided by
    // this, never by the stock left, which falls as it sells.
    initialQuantity: {
      type: Number,
      min: [0, "Initial quantity cannot be negative"],
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
