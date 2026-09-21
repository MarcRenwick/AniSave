const express = require("express");
const {
  createProduct,
  getMyProducts,
  getAllProducts,
  getProductById,
  getTopSearched,
  updateProduct,
  restockProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, authorize, optionalProtect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Public - marketplace browsing works for guests too. A signed-in viewer with a
// registered address can also sort by nearest (see getAllProducts).
router.get("/", optionalProtect, getAllProducts);

// Farmer-only - "/mine" must be registered before the public "/:id" route
// below, since Express would otherwise match GET /products/mine against
// "/:id" first and try to look up a product literally named "mine".
router.get("/mine", protect, authorize("farmer"), getMyProducts);
// What buyers are searching for and opening, for the farmer's dashboard -
// registered before "/:id" for the same reason as "/mine" above.
router.get("/top-searched", protect, authorize("farmer"), getTopSearched);
router.post("/", protect, authorize("farmer"), upload.array("images", 5), createProduct);
router.put("/:id", protect, authorize("farmer"), upload.array("images", 5), updateProduct);
router.patch("/:id/restock", protect, authorize("farmer"), restockProduct);
router.delete("/:id", protect, authorize("farmer"), deleteProduct);

// Public - single product detail. The viewer is read where there is one, so a
// listing from a shop they blocked can't be reached by its link either.
router.get("/:id", optionalProtect, getProductById);

module.exports = router;
