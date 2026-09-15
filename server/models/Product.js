const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      enum: ["vegetable", "fruit"],
      required: [true, "Category is required"],
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
