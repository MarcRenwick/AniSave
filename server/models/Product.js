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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
