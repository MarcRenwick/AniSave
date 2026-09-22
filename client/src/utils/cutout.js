// Buyers should see produce, not the white rectangle the photo came on.
// Farmers upload whatever picture they have - a phone photo, something saved
// off a search - and most of them are a product sitting on a plain backdrop.
// On a white card that backdrop shows up as a visible box, and the produce
// itself ends up small and adrift in it.
//
// So for display only, a photo is traced from its edges inwards: whatever
// touches the border and matches the backdrop colour is made transparent, and
// the result is cropped to what is left. The file on the server is never
// touched, nothing is saved, and a photo this doesn't suit is simply left
// alone - every failure here returns null and the card shows the original.

// Working size. Cards show the picture around 200px wide, so there is nothing
// to gain from tracing a 3000px photo - and plenty of time to lose.
const MAX_SIDE = 700;

// How far a pixel may sit from the sampled backdrop and still count as it.
// Squared, because the distances are compared squared.
const TOLERANCE = 62;
const TOLERANCE_SQ = TOLERANCE * TOLERANCE;

// Past the tolerance, up to this multiple of it, a pixel touching the backdrop
// is faded rather than kept solid. Photo edges are blurred and JPEG-smeared,
// and without this they leave a bright halo around the produce.
const FRINGE = 1.8;

// A backdrop is only a backdrop if the corners agree on what colour it is.
const CORNER_AGREEMENT = 40;

// Judgement on the result. Too little removed and the photo had no backdrop
// worth removing; too little left and the trace has eaten the produce - the
// photo of a white egg on a white cloth. Either way the original is better.
const MIN_REMOVED = 0.06;
const MIN_KEPT = 0.02;

// Already-transparent art (a PNG cut out before it was uploaded) needs no
// tracing, only trimming.
const ALREADY_CUT_OUT = 0.02;

// One result per photo for the life of the page: the marketplace re-renders
// constantly and the grid shows the same listings in several sections.
const done = new Map();
const running = new Map();

// Photos are traced one after another rather than all at once. A grid asks for
// twenty of them in the same breath, and reading twenty photos' pixels back to
// back would hold the page still for as long as it took. One at a time leaves
// a gap between each for anything else waiting to happen.
let queue = Promise.resolve();
const inTurn = (work) => {
  const mine = queue.then(work, work);
  // A failure in one photo must not stop the ones behind it.
  queue = mine.then(
    () => undefined,
    () => undefined
  );
  return mine;
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    // Without this the canvas is tainted and its pixels can't be read back.
    // The server allows it for /uploads; if that ever stops being true the
    // load fails here and the card keeps the original photo.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not load"));
    img.src = src;
  });

// The colour the photo's backdrop appears to be, or null when its corners
// can't agree - a busy photo, or produce that reaches the edges.
function backdropOf(data, width, height) {
  const patch = Math.max(2, Math.round(Math.min(width, height) * 0.03));
  const corners = [
    [0, 0],
    [width - patch, 0],
    [0, height - patch],
    [width - patch, height - patch],
  ].map(([x0, y0]) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = y0; y < y0 + patch; y += 1) {
      for (let x = x0; x < x0 + patch; x += 1) {
        const i = (y * width + x) * 4;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n += 1;
      }
    }
    return [r / n, g / n, b / n];
  });

  const mean = [0, 1, 2].map((c) => corners.reduce((sum, corner) => sum + corner[c], 0) / 4);
  const agreed = corners.every(
    (corner) => Math.hypot(corner[0] - mean[0], corner[1] - mean[1], corner[2] - mean[2]) <= CORNER_AGREEMENT
  );
  return agreed ? mean : null;
}

// Everything reachable from the border while still looking like the backdrop.
// Working inwards from the edges, rather than removing every matching pixel
// anywhere, is what keeps the white of a cauliflower or the shine on a tomato
// from being punched out of the middle of the produce.
function traceFromEdges(data, width, height, backdrop) {
  const [br, bg, bb] = backdrop;
  const size = width * height;
  const isBackdrop = new Uint8Array(size);
  const stack = new Int32Array(size);
  let top = 0;

  const near = (p, limitSq) => {
    const i = p * 4;
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    return dr * dr + dg * dg + db * db <= limitSq;
  };

  const push = (p) => {
    if (isBackdrop[p] || !near(p, TOLERANCE_SQ)) return;
    isBackdrop[p] = 1;
    stack[top] = p;
    top += 1;
  };

  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (top > 0) {
    top -= 1;
    const p = stack[top];
    const x = p % width;
    if (x > 0) push(p - 1);
    if (x < width - 1) push(p + 1);
    if (p >= width) push(p - width);
    if (p < size - width) push(p + width);
  }

  let removed = 0;
  const fringeSq = TOLERANCE_SQ * FRINGE * FRINGE;
  const span = fringeSq - TOLERANCE_SQ;

  for (let p = 0; p < size; p += 1) {
    if (isBackdrop[p]) {
      data[p * 4 + 3] = 0;
      removed += 1;
      continue;
    }
    // A kept pixel that touches the backdrop and is nearly its colour is the
    // blurred edge of the produce, not the produce: fade it out instead of
    // leaving a hard bright rim.
    const x = p % width;
    const touching =
      (x > 0 && isBackdrop[p - 1]) ||
      (x < width - 1 && isBackdrop[p + 1]) ||
      (p >= width && isBackdrop[p - width]) ||
      (p < size - width && isBackdrop[p + width]);
    if (!touching || !near(p, fringeSq)) continue;

    const i = p * 4;
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    const distSq = dr * dr + dg * dg + db * db;
    data[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (distSq - TOLERANCE_SQ) / span)));
  }

  return removed / size;
}

// The smallest rectangle holding everything still visible.
function boundsOf(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let kept = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      kept += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return maxX < 0 ? null : { minX, minY, maxX, maxY, kept: kept / (width * height) };
}

async function process(src) {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);

  // Throws on a tainted canvas, which is the one failure worth naming: it
  // means the photo came from somewhere that didn't allow reading it.
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;

  let transparent = 0;
  for (let p = 0; p < width * height; p += 1) if (data[p * 4 + 3] <= 8) transparent += 1;
  const alreadyCutOut = transparent / (width * height) > ALREADY_CUT_OUT;

  if (!alreadyCutOut) {
    const backdrop = backdropOf(data, width, height);
    if (!backdrop) return null;
    if (traceFromEdges(data, width, height, backdrop) < MIN_REMOVED) return null;
  }

  const bounds = boundsOf(data, width, height);
  if (!bounds || bounds.kept < MIN_KEPT) return null;

  ctx.putImageData(image, 0, 0);

  // Cropped to the produce, with a hair of breathing room so a card never
  // butts the picture against its own edge.
  const pad = Math.round(Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.02);
  const x = Math.max(0, bounds.minX - pad);
  const y = Math.max(0, bounds.minY - pad);
  const w = Math.min(width, bounds.maxX + 1 + pad) - x;
  const h = Math.min(height, bounds.maxY + 1 + pad) - y;

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return out.toDataURL("image/png");
}

// The photo with its backdrop taken out and the empty margins trimmed off, or
// null to say "show the one you already have". Never throws.
export function cutout(src) {
  if (!src) return Promise.resolve(null);
  if (done.has(src)) return Promise.resolve(done.get(src));
  if (running.has(src)) return running.get(src);

  const work = inTurn(() => process(src))
    .catch(() => null)
    .then((result) => {
      done.set(src, result);
      running.delete(src);
      return result;
    });

  running.set(src, work);
  return work;
}
