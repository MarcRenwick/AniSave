import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

const FRAME = 256; // the on-screen crop window
const OUTPUT = 400; // the saved image, in pixels square

// Drag to move, slide to zoom, then the visible circle is what gets saved.
export default function ImageCropperModal({ file, onCancel, onCropped }) {
  const [src, setSrc] = useState(null);
  const [size, setSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const imgRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // At zoom 1 the shorter side exactly fills the frame, so the photo always
  // covers it and there is never a blank corner.
  const baseScale = size ? FRAME / Math.min(size.w, size.h) : 1;
  const scale = baseScale * zoom;
  const shown = size ? { w: size.w * scale, h: size.h * scale } : { w: 0, h: 0 };
  const limit = {
    x: Math.max(0, (shown.w - FRAME) / 2),
    y: Math.max(0, (shown.h - FRAME) / 2),
  };
  const clamp = (value, max) => Math.min(max, Math.max(-max, value));

  const handleZoom = (value) => {
    setZoom(value);
    if (!size) return;
    const next = baseScale * value;
    const nextLimit = {
      x: Math.max(0, (size.w * next - FRAME) / 2),
      y: Math.max(0, (size.h * next - FRAME) / 2),
    };
    setOffset((o) => ({ x: clamp(o.x, nextLimit.x), y: clamp(o.y, nextLimit.y) }));
  };

  const startDrag = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onDrag = (e) => {
    const start = dragRef.current;
    if (!start) return;
    setOffset({
      x: clamp(start.ox + e.clientX - start.px, limit.x),
      y: clamp(start.oy + e.clientY - start.py, limit.y),
    });
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const handleConfirm = () => {
    if (!size || !imgRef.current) return;
    setBusy(true);

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");

    // Translate the frame's position back into the photo's own pixels.
    const sourceSize = FRAME / scale;
    const sx = (shown.w / 2 - offset.x - FRAME / 2) / scale;
    const sy = (shown.h / 2 - offset.y - FRAME / 2) / scale;
    ctx.drawImage(imgRef.current, sx, sy, sourceSize, sourceSize, 0, 0, OUTPUT, OUTPUT);

    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onCropped(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <Modal title="Crop your photo" onClose={onCancel}>
      <div
        className="mx-auto touch-none overflow-hidden rounded-full bg-gray-100"
        style={{ width: FRAME, height: FRAME, cursor: "grab" }}
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {src && (
          <img
            ref={imgRef}
            src={src}
            alt="Adjust the crop"
            draggable={false}
            onLoad={(e) =>
              setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
            }
            style={{
              width: shown.w,
              height: shown.h,
              marginLeft: FRAME / 2 - shown.w / 2 + offset.x,
              marginTop: FRAME / 2 - shown.h / 2 + offset.y,
              maxWidth: "none",
            }}
          />
        )}
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        Zoom
        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={zoom}
          onChange={(e) => handleZoom(Number(e.target.value))}
          className="mt-1 w-full accent-[#2f8f66]"
        />
      </label>
      <p className="text-center text-xs text-gray-500">Drag the photo to move it.</p>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy || !size}
          className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56] disabled:opacity-60"
        >
          {busy ? "Saving..." : "Use photo"}
        </button>
      </div>
    </Modal>
  );
}
