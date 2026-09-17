// The server refuses anything larger (see server/middleware/uploadMiddleware.js).
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Photos at or under this size are sent untouched.
const SHRINK_ABOVE_BYTES = 1024 * 1024;

// Long edge after resizing - still plenty to read the text on an ID.
const MAX_DIMENSION = 2000;

// A photo straight off a phone camera is often over the upload limit, so
// large ones are resized and re-encoded as JPEG first. Returns the original
// file when it is already small, when the browser can't decode it, or when
// re-encoding wouldn't actually make it smaller.
export async function shrinkImage(file) {
  if (!file.type.startsWith("image/") || file.size <= SHRINK_ABOVE_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    // JPEG has no transparency - without this a transparent PNG turns black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]*$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
