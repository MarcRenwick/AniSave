const express = require("express");
const { getFarmers, getFarmerProfile } = require("../controllers/farmerController");
const { optionalProtect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public, but a signed-in viewer also gets how far each farmer is from them.
router.get("/", optionalProtect, getFarmers);
router.get("/:id", optionalProtect, getFarmerProfile);

module.exports = router;
