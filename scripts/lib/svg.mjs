// Convert the shared geometry point format into SVG path data, so
// assets/svg/*.svg is generated from the same numbers as the Rive scene.

const DEG = Math.PI / 180;
const n = (v) => Number(v.toFixed(2));

const polar = (angle, distance) => [Math.cos(angle * DEG) * distance, Math.sin(angle * DEG) * distance];

const outHandle = (p) => {
  if (!p.cubic) return [p.x, p.y];
  const d = p.cubic.outDistance ?? p.cubic.distance ?? 0;
  const [dx, dy] = polar(p.cubic.rotation ?? 0, d);
  return [p.x + dx, p.y + dy];
};

const inHandle = (p) => {
  if (!p.cubic) return [p.x, p.y];
  const d = p.cubic.inDistance ?? p.cubic.distance ?? 0;
  const rotation = p.cubic.inRotation ?? (p.cubic.rotation ?? 0) + 180;
  const [dx, dy] = polar(rotation, d);
  return [p.x + dx, p.y + dy];
};

/**
 * Path data for one contour. Cubic vertices use their handles directly;
 * straight vertices with a radius get a quadratic corner fillet.
 */
export function pathData(points, closed = true) {
  if (!points.length) return "";
  const count = points.length;
  const segments = closed ? count : count - 1;
  const straightOnly = points.every((p) => !p.cubic);

  if (straightOnly) {
    const parts = [];
    for (let i = 0; i < count; i += 1) {
      const prev = points[(i - 1 + count) % count];
      const curr = points[i];
      const next = points[(i + 1) % count];
      const toPrev = [prev.x - curr.x, prev.y - curr.y];
      const toNext = [next.x - curr.x, next.y - curr.y];
      const lenPrev = Math.hypot(...toPrev) || 1;
      const lenNext = Math.hypot(...toNext) || 1;
      const r = Math.min(curr.radius ?? 0, lenPrev / 2, lenNext / 2);
      const a = [curr.x + (toPrev[0] / lenPrev) * r, curr.y + (toPrev[1] / lenPrev) * r];
      const b = [curr.x + (toNext[0] / lenNext) * r, curr.y + (toNext[1] / lenNext) * r];
      parts.push(i === 0 ? `M ${n(a[0])} ${n(a[1])}` : `L ${n(a[0])} ${n(a[1])}`);
      if (r > 0) parts.push(`Q ${n(curr.x)} ${n(curr.y)} ${n(b[0])} ${n(b[1])}`);
      else parts.push(`L ${n(b[0])} ${n(b[1])}`);
    }
    return `${parts.join(" ")}${closed ? " Z" : ""}`;
  }

  const parts = [`M ${n(points[0].x)} ${n(points[0].y)}`];
  for (let i = 0; i < segments; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % count];
    const [c1x, c1y] = outHandle(a);
    const [c2x, c2y] = inHandle(b);
    parts.push(`C ${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(b.x)} ${n(b.y)}`);
  }
  return `${parts.join(" ")}${closed ? " Z" : ""}`;
}

export function compoundPathData(subpaths) {
  return subpaths.map((sp) => pathData(sp.points, sp.closed ?? true)).join(" ");
}

/** Rive stores #AARRGGBB; SVG wants #RRGGBB plus a separate opacity. */
export function splitColor(color) {
  if (color.length === 9) {
    const alpha = parseInt(color.slice(1, 3), 16) / 255;
    return { hex: `#${color.slice(3)}`, opacity: Number(alpha.toFixed(3)) };
  }
  return { hex: color, opacity: 1 };
}

export const round = n;
