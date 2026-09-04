// Kettlebell Bot — vector film grain.
//
// The project bans embedded raster, so the grain is not a texture: it is a few
// hundred individually placed vector specks. That also answers the "no repeating
// pattern" requirement in the strongest possible way — there is no tile to
// repeat, every speck has its own position, size, shape and opacity.
//
// Placement is a jittered grid rather than pure random. Uniform random sampling
// clumps, and clumps read as blotches or dirt; stratifying then jittering inside
// each cell gives even coverage with no visible structure, which is what grain
// actually looks like. The PRNG is seeded, so the build stays byte-deterministic.

const DEG = Math.PI / 180;

/** mulberry32 — small, fast, and identical on every machine. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const polar = (angle, distance) => [Math.cos(angle * DEG) * distance, Math.sin(angle * DEG) * distance];

function outHandle(p) {
  if (!p.cubic) return [p.x, p.y];
  const d = p.cubic.outDistance ?? p.cubic.distance ?? 0;
  const [dx, dy] = polar(p.cubic.rotation ?? 0, d);
  return [p.x + dx, p.y + dy];
}

function inHandle(p) {
  if (!p.cubic) return [p.x, p.y];
  const d = p.cubic.inDistance ?? p.cubic.distance ?? 0;
  const [dx, dy] = polar(p.cubic.inRotation ?? (p.cubic.rotation ?? 0) + 180, d);
  return [p.x + dx, p.y + dy];
}

/** Flatten a contour to a polygon so specks can be tested against it exactly. */
export function flattenContour(points, steps = 18) {
  const out = [];
  const count = points.length;
  for (let i = 0; i < count; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % count];
    const [c1x, c1y] = outHandle(a);
    const [c2x, c2y] = inHandle(b);
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      const u = 1 - t;
      out.push([
        u * u * u * a.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * b.x,
        u * u * u * a.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * b.y,
      ]);
    }
  }
  return out;
}

function pointInPolygon([px, py], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function bounds(polygon) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function polygonArea(polygon) {
  let sum = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    sum += (polygon[j][0] + polygon[i][0]) * (polygon[j][1] - polygon[i][1]);
  }
  return Math.abs(sum / 2);
}

const round = (v, p = 2) => Number(v.toFixed(p));

/**
 * Scatter grain specks across a region.
 *
 * Each speck is a very short stroked dash rather than a dot: real grain is
 * irregular and slightly directional, and a dash costs one object less than an
 * ellipse (a PointsPath plus two vertices, versus a Shape/Ellipse/Fill/SolidColor
 * set). A zero-length path draws nothing in this runtime, so every dash has a
 * real length.
 *
 * @param {object}   options
 * @param {Array}    options.include  contours the speck must fall inside
 * @param {Array}    options.exclude  contours the speck must fall outside (the handle opening)
 * @param {number}   options.seed
 * @param {number}   options.density  specks per 1000 square px
 * @param {[number,number]} options.length     dash length range
 * @param {[number,number]} options.thickness  dash thickness range
 * @param {[number,number]} options.opacityLight alpha range for lifting specks
 * @param {[number,number]} options.opacityDark  alpha range for darkening specks
 * @param {number}   options.lightRatio     share of specks that lift rather than darken
 *
 * The two alpha ranges differ on purpose. The body sits at roughly 13% luminance,
 * so a black speck at 8% alpha moves it by about 1% and is invisible, while a
 * white speck at the same alpha reads clearly. Grain on a near-black character
 * has to be mostly light specks, with the dark ones carrying more alpha to
 * register at all.
 */
export function scatterGrain({
  include,
  exclude = [],
  seed = 1,
  density = 20,
  length = [0.7, 2.2],
  thickness = [0.9, 1.7],
  opacityLight = [0.03, 0.075],
  opacityDark = [0.10, 0.22],
  lightRatio = 0.72,
}) {
  const shells = include.map((c) => flattenContour(c));
  const holes = exclude.map((c) => flattenContour(c));
  const area = shells.reduce((sum, s) => sum + polygonArea(s), 0) -
    holes.reduce((sum, h) => sum + polygonArea(h), 0);
  const target = Math.round((area / 1000) * density);

  // A jittered grid sized so one speck lands per cell on average.
  const box = bounds(shells.flat());
  const boxArea = (box.maxX - box.minX) * (box.maxY - box.minY);
  const cells = Math.max(1, Math.round(target * (boxArea / area)));
  const aspect = (box.maxX - box.minX) / (box.maxY - box.minY);
  const cols = Math.max(1, Math.round(Math.sqrt(cells * aspect)));
  const rows = Math.max(1, Math.round(cells / cols));
  const cellW = (box.maxX - box.minX) / cols;
  const cellH = (box.maxY - box.minY) / rows;

  const random = mulberry32(seed);
  const specks = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = box.minX + (col + random()) * cellW;
      const y = box.minY + (row + random()) * cellH;
      const light = random() < lightRatio;
      const angle = random() * Math.PI;
      const len = length[0] + random() * (length[1] - length[0]);
      const thick = thickness[0] + random() * (thickness[1] - thickness[0]);
      const range = light ? opacityLight : opacityDark;
      const alpha = range[0] + random() * (range[1] - range[0]);
      const point = [x, y];
      if (!shells.some((s) => pointInPolygon(point, s))) continue;
      if (holes.some((h) => pointInPolygon(point, h))) continue;
      specks.push({
        x1: round(x - (Math.cos(angle) * len) / 2),
        y1: round(y - (Math.sin(angle) * len) / 2),
        x2: round(x + (Math.cos(angle) * len) / 2),
        y2: round(y + (Math.sin(angle) * len) / 2),
        thickness: thick,
        opacity: alpha,
        light,
      });
    }
  }
  return specks;
}

const quantize = (value, steps, [min, max]) =>
  min + Math.round(((value - min) / (max - min)) * (steps - 1)) * ((max - min) / (steps - 1));

/**
 * Group specks into as few shapes as possible.
 *
 * Stroke colour, thickness and opacity are per-shape, so those three are
 * quantised into buckets; position and length stay per-speck and carry the
 * variation the eye actually notices.
 */
export function bucketSpecks(specks, { thicknessSteps = 3, opacitySteps = 4 } = {}) {
  const buckets = new Map();
  for (const speck of specks) {
    const t = round(quantize(speck.thickness, thicknessSteps, [0.6, 2.0]), 2);
    const range = speck.light ? [0.02, 0.09] : [0.08, 0.24];
    const o = round(quantize(speck.opacity, opacitySteps, range), 3);
    const key = `${speck.light ? "l" : "d"}-${t}-${o}`;
    if (!buckets.has(key)) buckets.set(key, { light: speck.light, thickness: t, opacity: o, subpaths: [] });
    buckets.get(key).subpaths.push({
      closed: false,
      points: [
        { x: speck.x1, y: speck.y1 },
        { x: speck.x2, y: speck.y2 },
      ],
    });
  }
  return [...buckets.values()].filter((b) => b.subpaths.length > 0);
}
