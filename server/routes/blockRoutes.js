const express = require("express");
const { getBlockedUsers, blockUser, unblockUser } = require("../controllers/blockController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// A buyer's own block list - nobody else can read it or add to it.
router.use(protect, authorize("buyer"));

router.get("/", getBlockedUsers);
router.post("/:id", blockUser);
router.delete("/:id", unblockUser);

module.exports = router;
