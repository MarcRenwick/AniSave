// Where to put the dots and their names on a scatter chart so no two names
// run into each other, or into a dot.
//
// Dots that land on (or almost on) the same spot are spread into a small
// ring around it, so each can still be seen and pointed at. Then each name
// takes the first free place around its dot - right, left, above, below -
// as long as no other dot is nearer to it than its own (so it can't be read
// as another's), or, when the dot is crowded in, a place further out with a
// thin line back to it that crosses no other dot or name. A name that has nowhere to go is left off rather than
// printed over another; the chart lists every product under it, and pointing
// at the dot still names it.

const DOT = 5;
const CLOSE = 9; // dots nearer than this (px) are spread apart
const GAP = 7; // from a dot's centre to its name
const PAD = 2; // kept clear around every name
export const LABEL_HEIGHT = 13;

const overlaps = (a, b) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const inside = (box, area) =>
  box.left >= area.left && box.right <= area.right && box.top >= area.top && box.bottom <= area.bottom;
const box = (left, top, width) => ({ left, top, right: left + width, bottom: top + LABEL_HEIGHT });
const grow = (b, by) => ({ left: b.left - by, top: b.top - by, right: b.right + by, bottom: b.bottom + by });
// From a point to the nearest edge of a box (0 inside it).
const distance = (x, y, b) => Math.hypot(Math.max(b.left - x, 0, x - b.right), Math.max(b.top - y, 0, y - b.bottom));
// Points every 2px along a line, for checking what it passes over.
const along = ([x1, y1, x2, y2]) => {
  const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2));
  return Array.from({ length: steps + 1 }, (_, k) => [x1 + ((x2 - x1) * k) / steps, y1 + ((y2 - y1) * k) / steps]);
};
const crosses = (line, b) => along(line).some(([x, y]) => x > b.left && x < b.right && y > b.top && y < b.bottom);

// Groups of dots within CLOSE of one another (chained), as index lists.
function clusters(points) {
  const parent = points.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  points.forEach((a, i) => {
    for (let j = i + 1; j < points.length; j++) {
      const b = points[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < CLOSE) parent[find(i)] = find(j);
    }
  });
  const groups = new Map();
  points.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) || []), i]));
  return [...groups.values()];
}

// The spots tried for a name, nearest first: hugging the dot, then further
// out along a line.
function candidates(x, y, width) {
  const half = LABEL_HEIGHT / 2;
  const near = [
    box(x + GAP, y - half, width), // right
    box(x - GAP - width, y - half, width), // left
    box(x + 3, y - GAP - LABEL_HEIGHT + 2, width), // above, to the right
    box(x + 3, y + GAP - 2, width), // below, to the right
    box(x - 3 - width, y - GAP - LABEL_HEIGHT + 2, width), // above, to the left
    box(x - 3 - width, y + GAP - 2, width), // below, to the left
    box(x - width / 2, y - GAP - LABEL_HEIGHT, width), // above
    box(x - width / 2, y + GAP, width), // below
  ].map((b) => ({ box: b }));
  const far = [];
  for (const reach of [20, 30, 42, 56, 72, 90]) {
    for (const degrees of [0, 180, -30, 30, -150, 150, -15, 15, -165, 165, -45, 45, -135, 135, -60, 60, -120, 120, -75, 75, -105, 105, -90, 90]) {
      const a = (degrees * Math.PI) / 180;
      const ex = x + Math.cos(a) * reach;
      const ey = y + Math.sin(a) * reach;
      // The end of the line touches the side of the name facing the dot -
      // or, on a line going (nearly) straight up or down, the name's middle,
      // its start or its end.
      const top = Math.sin(a) > 0.5 ? ey : Math.sin(a) < -0.5 ? ey - LABEL_HEIGHT : ey - LABEL_HEIGHT / 2;
      const lefts =
        Math.cos(a) > 0.2 ? [ex + 2] : Math.cos(a) < -0.2 ? [ex - 2 - width] : [ex - width / 2, ex - 2, ex + 2 - width];
      for (const left of lefts) far.push({ box: box(left, top, width), line: [ex, ey] });
    }
  }
  return [...near, ...far];
}

/**
 * points:  [{ id, x, y, label }] in pixels, most important first
 * area:    { left, top, right, bottom } the names must stay inside
 * blocked: boxes already taken (e.g. the quadrants' titles)
 * measure: (text) => width in px
 * returns  { dots: { id: [x, y] }, labels: [{ id, text, left, top, line?: [x1, y1, x2, y2] }] }
 */
export function layoutScatterLabels(points, { area, blocked = [], measure }) {
  // Spread dots that share a spot into a ring around where they were, turned
  // whichever way keeps it furthest from the dots around it.
  const at = points.map((p) => [p.x, p.y]);
  for (const group of clusters(points)) {
    if (group.length < 2) continue;
    const cx = group.reduce((s, i) => s + points[i].x, 0) / group.length;
    const cy = group.reduce((s, i) => s + points[i].y, 0) / group.length;
    const radius = group.length === 2 ? DOT + 1.5 : DOT + 2 + group.length * 1.2;
    const others = points.filter((_, j) => !group.includes(j));
    const ring = (turn) =>
      group.map((_, k) => {
        const a = turn + (2 * Math.PI * k) / group.length;
        return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
      });
    const room = (spots) => Math.min(...spots.flatMap(([x, y]) => others.map((o) => Math.hypot(o.x - x, o.y - y))), Infinity);
    let best = ring(Math.PI);
    for (let degrees = 0; degrees < 360; degrees += 15) {
      const spots = ring((degrees * Math.PI) / 180);
      if (room(spots) > room(best) + 0.5) best = spots;
    }
    group.forEach((i, k) => {
      at[i] = best[k];
    });
  }

  const dots = at.map(([x, y]) => ({ left: x - DOT - 1, top: y - DOT - 1, right: x + DOT + 1, bottom: y + DOT + 1 }));
  const taken = blocked.map((b) => grow(b, PAD));
  const lines = [];
  const labels = [];
  // First every dot tries for a place right beside it; only then do the ones
  // left over look further out - so a far-out name never takes the place a
  // neighbour needed beside its own dot.
  const place = (i, onLine) => {
    const p = points[i];
    const [x, y] = at[i];
    const width = Math.ceil(measure(p.label)) + 2;
    // From the edge of the dot to the near end of the name.
    const lineTo = ([ex, ey]) => {
      const a = Math.atan2(ey - y, ex - x);
      return [x + Math.cos(a) * (DOT + 1), y + Math.sin(a) * (DOT + 1), ex, ey];
    };
    const free = (b) =>
      inside(b, area) &&
      !taken.some((t) => overlaps(b, t)) &&
      !dots.some((d, j) => j !== i && overlaps(grow(b, 1), d)) &&
      !lines.some((l) => crosses(l, grow(b, 1)));
    // Beside its dot: nearer to it than to any other dot.
    const own = (b) => at.every(([ox, oy], j) => j === i || distance(ox, oy, b) > distance(x, y, b) + 1);
    // Out on a line: the line passes no other dot and no name, and the name
    // keeps clear of the other dots.
    const clear = (line, b) =>
      !dots.some((d, j) => j !== i && crosses(line, grow(d, 1))) &&
      !taken.some((t) => crosses(line, t)) &&
      at.every(([ox, oy], j) => j === i || distance(ox, oy, b) > 9);
    const spot = candidates(x, y, width)
      .filter((c) => !!c.line === onLine)
      .find((c) => free(c.box) && (c.line ? clear(lineTo(c.line), c.box) : own(c.box)));
    if (!spot) return false;
    const line = spot.line ? lineTo(spot.line) : undefined;
    taken.push(grow(spot.box, PAD));
    if (line) lines.push(line);
    labels.push({ id: p.id, text: p.label, left: spot.box.left, top: spot.box.top, line });
    return true;
  };
  const waiting = points.map((_, i) => i).filter((i) => !place(i, false));
  waiting.forEach((i) => place(i, true));
  return { dots: Object.fromEntries(points.map((p, i) => [p.id, at[i]])), labels };
}
