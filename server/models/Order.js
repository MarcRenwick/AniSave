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
    // "preorder" is where an order on a For Pre-Order listing starts; accepting
    // it moves it into the same flow as any other order.
    status: {
      type: String,
      enum: ["new", "preorder", "processing", "ready", "done", "cancelled"],
      default: "new",
    },
    // The status the order opened in, kept so undoing an accepted order knows
    // whether to put it back to "new" or to "preorder" - the two look the same
    // once accepted. Set when the order is placed and never changed again.
    // Orders placed before this existed have none and are treated as "new".
    openedAs: {
      type: String,
      enum: ["new", "preorder"],
    },

    // Real per-stage timestamps, set as the order progresses - "new" is
    // already covered by createdAt.
    acceptedAt: { type: Date },
    readyAt: { type: Date },
    doneAt: { type: Date },
    cancelledAt: { type: Date },

    // Buyer-only housekeeping: tucks a completed order out of the normal
    // My Orders view without deleting it.
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
