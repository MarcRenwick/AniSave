const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // Snapshotted at order time so edits to the product later don't rewrite order history
    productTitle: {
      type: String,
      required: true,
    },
    pricePerKilo: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "ready", "done"],
      default: "new",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
