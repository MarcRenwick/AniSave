const { emitToUser, emitToRole } = require("./realtime");

// What the controllers announce over the live connection once a change is
// saved, so the pages it affects catch up without a refresh. The API stays the
// source of truth: an event only says what changed, and a page that shows it
// asks the API again (client/src/hooks/useLiveRefresh.js). The few words in an
// event are what a toast needs - nothing that the person it goes to couldn't
// already see on the order or listing itself.

// A person or product, whether it has been populated or not.
const idOf = (value) => String(value?._id ?? value);

// An order was placed, moved on or back, cancelled or archived. The people on
// it (`to`: both, unless only one of them has anything to update) are told, in
// every tab they have open.
//   action: "placed" | "status" | "undone" | "cancelled" | "archived"
//   by:     "buyer" | "farmer" - who did it
function orderChanged(order, { action, by, previousStatus, buyerName, to = ["buyer", "farmer"] }) {
  const payload = {
    orderId: idOf(order._id),
    productId: idOf(order.product),
    productTitle: order.productTitle,
    quantity: order.quantity,
    unit: order.unit || "kg",
    status: order.status,
    previousStatus: previousStatus || null,
    action,
    by,
    ...(buyerName ? { buyerName } : {}),
  };
  to.forEach((side) => emitToUser(idOf(order[side]), "order:changed", payload));
}

// A listing was added, edited, restocked, sold from, rated or removed: every
// buyer's marketplace, and the farmer's own pages, fetch it again. Only ids go
// out - what a buyer may see of it (not a blocked shop's, say) is the API's to say.
function productChanged(product, action) {
  const payload = { productId: idOf(product._id), farmerId: idOf(product.farmer), action };
  emitToRole("buyer", "product:changed", payload);
  emitToUser(payload.farmerId, "product:changed", payload);
}

// A whole shop's listings came or went at once: the farmer was banned,
// unbanned, or approved to sell.
function shopChanged(farmerId) {
  emitToRole("buyer", "product:changed", { productId: null, farmerId: idOf(farmerId), action: "shop" });
}

// Something on an administrator's lists changed: "users" (a new account, a
// farmer's documents, a ban), "reports" or "review-reports". Every admin with
// the page open fetches it again - including the one who made the change, in
// their other tabs.
function adminChanged(kind) {
  emitToRole("admin", "admin:changed", { kind });
}

// The person's own account changed somewhere else - an admin decided on a
// farmer's documents - so the copy their browser keeps is brought up to date.
function accountChanged(userId, fields) {
  emitToUser(idOf(userId), "account:updated", fields);
}

module.exports = { orderChanged, productChanged, shopChanged, adminChanged, accountChanged };
