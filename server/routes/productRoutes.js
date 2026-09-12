const express = require("express");
const {
  createProduct,
  getMyProducts,
  updateProduct,
  restockProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect, authorize("farmer"));

router.post("/", upload.single("image"), createProduct);
router.get("/mine", getMyProducts);
router.put("/:id", upload.single("image"), updateProduct);
router.patch("/:id/restock", restockProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
