const path = require("path");
const fs = require("fs");

const imagePath = (file) => (file ? `/uploads/${file.filename}` : undefined);

const deleteImageFile = (imageUrl) => {
  if (!imageUrl) return;
  const filePath = path.join(__dirname, "..", imageUrl);
  fs.unlink(filePath, () => {});
};

module.exports = { imagePath, deleteImageFile };
