// Blocking, from the server's side.
//
// A buyer can block a farmer's shop (User.blockedUsers on the buyer's own
// account). Blocking is not a display setting: the shop's listings stop being
// sent to that buyer at all, and the farmer can no longer sell to them. Every
// check that enforces it goes through the two helpers here, so a client can
// never decide the answer for itself.

// Whose shops this viewer has blocked. Guests, farmers and admins block
// nobody, so the marketplace stays whole for them.
const blockedIdsFor = (user) => (user?.role === "buyer" ? user.blockedUsers || [] : []);

// Has this viewer blocked that farmer? The id can be an ObjectId, a populated
// document's _id or a plain string - whatever the caller happens to hold.
const hasBlocked = (user, farmerId) =>
  Boolean(farmerId) && blockedIdsFor(user).some((id) => id.toString() === farmerId.toString());

module.exports = { blockedIdsFor, hasBlocked };
