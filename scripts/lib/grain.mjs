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
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Scatter grain specks across a region.
 *
 * Each speck is a very short stroked dash rather than a dot: real grain is
 * irregular and slightly directional, and a dash costs one object less than an
 * ellipse (a PointsPath plus two vertices, versus a Shape/Ellipse/Fill/SolidColor
 * set). A zero-length path draws nothing in this runtime, so every dash has a
 * real length.
 *
 * Specks are specified as a target LUMINANCE DEVIATION, not as an alpha. That is
 * the whole trick. On a surface at luminance L, a white speck at alpha a shifts
 * the pixel by a*(1-L) and a near-black speck by a*(L-0.027); on this character
 * L is around 0.13, so the same alpha buys eleven times more from a light speck
 * than a dark one. Asking for a deviation and solving for the alpha it needs
 * makes both directions land equally hard, at every brightness:
 *
 *   light speck   a = delta / (lightLuma - L)
 *   dark speck    a = delta / (L - darkLuma)
 *
 * The direction is then chosen so the grain is MEAN-PRESERVING. Each side can
 * only deliver so much before it hits its alpha cap; calling those headLight and
 * headDark, picking light with probability headDark / (headLight + headDark)
 * makes the expected shift exactly zero at every brightness and every strength:
 *
 *   p*headLight - (1-p)*headDark = 0   for   p = headDark / (headLight + headDark)
 *
 * That matters more than it sounds. The substrate is nearly black, so light
 * specks outrun dark ones badly, and a fixed light/dark ratio turns the grain
 * into a brightness dial -- turning it up washed the character out by 13%, which
 * means the strength knob was quietly also a design knob. Deriving the ratio
 * instead of tuning it keeps the character the colour it was drawn.
 *
 * The deviation itself is scaled by local brightness, so the grain follows the
 * shading instead of flattening it: the lit shoulder and the rim get the
 * coarsest grain, the contact shadow the finest. That is what makes the
 * highlights and shadows read as grainy rather than as smooth fields with dust
 * scattered over them.
 *
 * @param {object}   options
 * @param {Array}    options.include   contours the speck must fall inside
 * @param {Array}    options.exclude   contours the speck must fall outside
 * @param {Function} options.luma      (x, y) => surface luminance at that point
 * @param {number}   options.seed
 * @param {number}   options.density   specks per 1000 square px
 * @param {[number,number]} options.lumaRange  surface luminance range to normalise over
 * @param {number}   options.delta     target luminance deviation at mid brightness
 * @param {[number,number]} options.deltaGain  deviation scale at the dark and light ends
 * @param {[number,number]} options.deltaJitter per-speck random scale on the deviation
 * @param {[number,number]} options.length     dash length range
 * @param {[number,number]} options.thickness  dash thickness range
 * @param {number}   options.maxAlphaLight  alpha ceiling for a lifting speck
 * @param {number}   options.maxAlphaDark   alpha ceiling for a darkening speck
 */
export function scatterGrain({
  include,
  exclude = [],
  luma,
  seed = 1,
  density = 20,
  lumaRange = [0.06, 0.26],
  delta = 0.02,
  deltaGain = [0.62, 1.5],
  deltaJitter = [0.55, 1.45],
  length = [0.7, 2.2],
  thickness = [0.9, 1.7],
  maxAlphaLight = 0.3,
  maxAlphaDark = 0.55,
  lightLuma = 1,
  darkLuma = 0.027,
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
      const roll = random();
      const angle = random() * Math.PI;
      const len = length[0] + random() * (length[1] - length[0]);
      const thick = thickness[0] + random() * (thickness[1] - thickness[0]);
      const jitter = deltaJitter[0] + random() * (deltaJitter[1] - deltaJitter[0]);
      const point = [x, y];
      if (!shells.some((s) => pointInPolygon(point, s))) continue;
      if (holes.some((h) => pointInPolygon(point, h))) continue;

      const surface = luma(x, y);
      const t = clamp01((surface - lumaRange[0]) / (lumaRange[1] - lumaRange[0]));
      const want = delta * (deltaGain[0] + (deltaGain[1] - deltaGain[0]) * t) * jitter;

      // How much deviation each direction can actually deliver here before it
      // runs into its alpha cap.
      const roomLight = Math.max(0.05, lightLuma - surface);
      const roomDark = Math.max(0.02, surface - darkLuma);
      const headLight = Math.min(want, maxAlphaLight * roomLight);
      const headDark = Math.min(want, maxAlphaDark * roomDark);

      const light = roll < headDark / (headLight + headDark);
      const alpha = light ? headLight / roomLight : headDark / roomDark;
      if (alpha < 0.01) continue;

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

const quantizeIn = (value, steps, min, max) =>
  max - min < 1e-6 ? min : min + Math.round(((value - min) / (max - min)) * (steps - 1)) * ((max - min) / (steps - 1));

/**
 * Group specks into as few shapes as possible.
 *
 * Stroke colour, thickness and opacity are per-shape in Rive, so those three are
 * quantised into buckets; position and length stay per-speck and carry the
 * variation the eye actually notices. Opacity is quantised against the range the
 * scatter actually produced rather than a fixed one, because the brightness
 * response means that range depends on the artwork; a fixed range would band the
 * modulation into a handful of visible steps.
 */
export function bucketSpecks(specks, { thicknessSteps = 3, opacitySteps = 10 } = {}) {
  const span = (list) => {
    if (!list.length) return [0, 1];
    let min = Infinity;
    let max = -Infinity;
    for (const s of list) {
      if (s.opacity < min) min = s.opacity;
      if (s.opacity > max) max = s.opacity;
    }
    return [min, max];
  };
  const ranges = {
    l: span(specks.filter((s) => s.light)),
    d: span(specks.filter((s) => !s.light)),
  };

  const buckets = new Map();
  for (const speck of specks) {
    const t = round(quantizeIn(speck.thickness, thicknessSteps, 0.6, 2.0), 2);
    const [min, max] = ranges[speck.light ? "l" : "d"];
    const o = round(quantizeIn(speck.opacity, opacitySteps, min, max), 3);
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
