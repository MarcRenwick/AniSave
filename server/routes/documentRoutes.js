const express = require("express");
const { getDocument } = require("../controllers/documentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:filename", protect, getDocument);

module.exports = router;
