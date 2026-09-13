const express = require("express");
const { getAllUsers, banUser, unbanUser } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/users", getAllUsers);
router.patch("/users/:id/ban", banUser);
router.patch("/users/:id/unban", unbanUser);

module.exports = router;
