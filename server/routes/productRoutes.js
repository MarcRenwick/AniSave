const express = require("express");
const {
  createProduct,
  getMyProducts,
  getAllProducts,
  getProductById,
  updateProduct,
  restockProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Public - marketplace browsing works for guests too
router.get("/", getAllProducts);

// Farmer-only - "/mine" must be registered before the public "/:id" route
// below, since Express would otherwise match GET /products/mine against
// "/:id" first and try to look up a product literally named "mine".
router.get("/mine", protect, authorize("farmer"), getMyProducts);
router.post("/", protect, authorize("farmer"), upload.array("images", 5), createProduct);
router.put("/:id", protect, authorize("farmer"), upload.array("images", 5), updateProduct);
router.patch("/:id/restock", protect, authorize("farmer"), restockProduct);
router.delete("/:id", protect, authorize("farmer"), deleteProduct);

// Public - single product detail
router.get("/:id", getProductById);

module.exports = router;
