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
    // "preorder" is where an order starts when the farmer doesn't have the
    // stock yet; accepting it moves it into the same flow as any other order.
    status: {
      type: String,
      enum: ["new", "preorder", "processing", "ready", "done", "cancelled"],
      default: "new",
    },

    // Real per-stage timestamps, set as the order progresses - "new" is
    // already covered by createdAt.
    acceptedAt: { type: Date },
    readyAt: { type: Date },
    doneAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
