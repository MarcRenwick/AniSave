const express = require("express");
const {
  createProduct,
  getMyProducts,
  getAllProducts,
  updateProduct,
  restockProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Public - marketplace browsing works for guests too
router.get("/", getAllProducts);

// Everything else is farmer-only, unchanged from before
router.use(protect, authorize("farmer"));

router.post("/", upload.single("image"), createProduct);
router.get("/mine", getMyProducts);
router.put("/:id", upload.single("image"), updateProduct);
router.patch("/:id/restock", restockProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
