// Photos sent in a chat. The kinds the server accepts, and its size limit.
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// A phone photo is often 3-5 MB and far bigger than a chat bubble needs, and
// every one is kept in the database. So a photo is scaled down to at most
// 1600 pixels on its longest side and saved as a JPEG before it is sent -
// usually a few hundred KB. A GIF is sent as it is (it may move), and so is
// anything this can't read or wouldn't make smaller.
const LONGEST_SIDE = 1600;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });

export async function shrinkPhoto(file) {
  if (file.type === "image/gif") return file;
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, LONGEST_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const context = canvas.getContext("2d");
    // A see-through PNG goes onto white, not the black a JPEG would give it.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]*$/, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
