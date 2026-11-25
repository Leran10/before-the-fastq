// Drawing vocabulary shared by every animation.
//
// The one invariant: an animation's draw(ctx, t, W, H, P) must be a pure
// function of t. Nothing in here keeps state between frames. Randomness is
// hashed from integers so that seeking to the same t always draws the same
// picture.
//
// Coordinates: every animation draws into a W x H box (normally 960 x 540
// logical units; the player scales for device pixels). Use fractions of W
// and H rather than hard pixel values where possible.

import { withAlpha } from './palette.js';

// ---------- time helpers ----------
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  back: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
// smooth progress from a to b
export const sp = (t, a, b) => ease.inOut(prog(t, a, b));
// alpha window: fades in over f seconds after a, fades out over f seconds before b
export const win = (t, a, b, f = 0.4) => Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b));
// a pulse 0->1->0 over [a,b]
export const pulse = (t, a, b) => Math.sin(Math.PI * prog(t, a, b));

// ---------- deterministic randomness ----------
export function hash(i, salt = 0) {
  const x = Math.sin(i * 127.1 + salt * 311.7 + 0.5) * 43758.5453;
  return x - Math.floor(x);
}
export function rng(seed) {
  // mulberry32; returns a function producing [0,1)
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Box-Muller normal from two hashes
export function gauss(i, salt = 0) {
  const u = Math.max(1e-6, hash(i, salt)), v = hash(i, salt + 17);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------- text ----------
export function text(ctx, str, x, y, o = {}) {
  const { size = 14, color = '#000', align = 'left', baseline = 'middle', mono = false, weight = 400, alpha = 1, maxWidth } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif'}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (maxWidth) ctx.fillText(str, x, y, maxWidth); else ctx.fillText(str, x, y);
  ctx.restore();
}

// A small caption-style label with an optional leader line to a point.
export function callout(ctx, str, x, y, P, o = {}) {
  const { to, size = 13, color = P.inkDim, alpha = 1, align = 'left' } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (to) {
    ctx.strokeStyle = withAlpha(color, 0.6);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(to[0], to[1]); ctx.stroke();
    ctx.setLineDash([]);
  }
  text(ctx, str, x, y, { size, color, align });
  ctx.restore();
}

// ---------- shapes ----------
export function roundRect(ctx, x, y, w, h, r = 6) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function dot(ctx, x, y, r, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function line(ctx, x1, y1, x2, y2, color, lw = 2, alpha = 1, dash) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}

export function arrow(ctx, x1, y1, x2, y2, color, o = {}) {
  const { lw = 2, head = 8, alpha = 1, dash } = o;
  if (alpha <= 0) return;
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
  ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// Irregular blob: enzymes, proteins, polymerases. Seed gives a stable shape.
export function blob(ctx, x, y, r, color, o = {}) {
  const { seed = 1, alpha = 1, wobble = 0.18, stroke } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wobble * (hash(i % n, seed) - 0.5) * 2;
    const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.restore();
}

// Magnetic / SPRI bead
export function bead(ctx, x, y, r, P, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, P.beadDim); g.addColorStop(1, P.bead);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// A microcentrifuge-style tube with a liquid level (0..1)
export function tube(ctx, x, y, w, h, P, o = {}) {
  const { level = 0.6, liquid = P.liquid, alpha = 1, label } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  // body
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h * 0.72);
    ctx.quadraticCurveTo(x, y + h, x + w / 2, y + h);
    ctx.quadraticCurveTo(x + w, y + h, x + w, y + h * 0.72);
    ctx.lineTo(x + w, y);
    ctx.closePath();
  };
  // liquid
  ctx.save(); path(); ctx.clip();
  ctx.fillStyle = liquid;
  ctx.fillRect(x, y + h * (1 - level), w, h * level);
  ctx.restore();
  path(); ctx.strokeStyle = P.glass; ctx.lineWidth = 2; ctx.stroke();
  // cap
  ctx.fillStyle = P.glass; roundRect(ctx, x - w * 0.08, y - h * 0.06, w * 1.16, h * 0.08, 2); ctx.fill();
  if (label) text(ctx, label, x + w / 2, y + h + 14, { size: 12, color: P.inkDim, align: 'center' });
  ctx.restore();
}

// ---------- nucleic acids ----------
// Double-stranded segment along a polyline. pts = [[x,y],...].
// The two strands are drawn offset by +-gap/2 along the normal, with rungs.
export function dsPath(ctx, pts, o = {}) {
  const { colorA = '#3f6ea6', colorB = colorA, gap = 7, lw = 2.2, rungs = true, rungEvery = 9, rungColor, alpha = 1, rungAlpha = 0.5 } = o;
  if (alpha <= 0 || pts.length < 2) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // compute normals
  const A = [], B = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L * gap / 2, ny = dx / L * gap / 2;
    A.push([pts[i][0] + nx, pts[i][1] + ny]);
    B.push([pts[i][0] - nx, pts[i][1] - ny]);
  }
  if (rungs) {
    ctx.strokeStyle = rungColor || colorA; ctx.lineWidth = Math.max(1, lw * 0.6); ctx.globalAlpha *= rungAlpha;
    // walk along length placing rungs every rungEvery units
    let acc = 0;
    ctx.beginPath();
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      let s = rungEvery - acc;
      while (s <= seg) {
        const f = s / seg;
        const ax = lerp(A[i - 1][0], A[i][0], f), ay = lerp(A[i - 1][1], A[i][1], f);
        const bx = lerp(B[i - 1][0], B[i][0], f), by = lerp(B[i - 1][1], B[i][1], f);
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        s += rungEvery;
      }
      acc = (acc + seg) % rungEvery;
    }
    ctx.stroke();
    ctx.globalAlpha /= rungAlpha;
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = colorA; ctx.beginPath(); A.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  ctx.strokeStyle = colorB; ctx.beginPath(); B.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  ctx.restore();
}

// Straight horizontal dsDNA fragment from x1 to x2 at y.
export function dsFragment(ctx, x1, x2, y, o = {}) {
  dsPath(ctx, [[x1, y], [x2, y]], o);
}

// Single strand with little base ticks on one side. side = +1 (ticks below) or -1.
export function ssStrand(ctx, x1, y1, x2, y2, o = {}) {
  const { color = '#3f6ea6', lw = 2.2, ticks = true, tickEvery = 9, tickLen = 4, side = 1, alpha = 1, dash } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  if (ticks) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    const nx = -(y2 - y1) / L * side, ny = (x2 - x1) / L * side;
    ctx.lineWidth = Math.max(1, lw * 0.6); ctx.globalAlpha *= 0.7;
    ctx.beginPath();
    for (let s = tickEvery / 2; s < L; s += tickEvery) {
      const f = s / L; const px = lerp(x1, x2, f), py = lerp(y1, y2, f);
      ctx.moveTo(px, py); ctx.lineTo(px + nx * tickLen, py + ny * tickLen);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Wavy / coiled long DNA across a region (genomic DNA at rest).
// Returns the point list so callers can cut it.
export function wavyPoints(x1, x2, y, o = {}) {
  const { amp = 18, freq = 0.02, n = 160, seed = 3, phase = 0 } = o;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n; const x = lerp(x1, x2, f);
    const yy = y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.7 + seed) * amp * 0.35;
    pts.push([x, yy]);
  }
  return pts;
}

// Y-shaped Illumina adapter. The double-stranded stem points toward the
// insert (stem end at (x,y)); the two single-stranded arms fork away from it.
// dir = +1: arms open to the right, stem end on the left. dir = -1: mirrored.
// On the left end of a library molecule the P5 arm is on top; on the right
// end the P7 arm is on top (so a finished molecule reads P5 ... insert ... P7
// along its top strand).
export function yAdapter(ctx, x, y, dir, P, o = {}) {
  const { scale = 1, alpha = 1, stem = 22, arm = 30, gap = 7, index = null, lw = 2.2, topColor, bottomColor, tOverhang = false } = o;
  if (alpha <= 0) return;
  const top = topColor || (dir > 0 ? P.p7 : P.p5);
  const bottom = bottomColor || (dir > 0 ? P.p5 : P.p7);
  const s = scale;
  ctx.save(); ctx.globalAlpha *= alpha;
  const xs = x + dir * stem * s;
  // stem (double-stranded), top strand = top color, bottom = bottom color
  dsPath(ctx, [[x, y], [xs, y]], { colorA: top, colorB: bottom, gap: gap * s, lw, rungEvery: 7 });
  // arms
  const ax = xs + dir * arm * s;
  ssStrand(ctx, xs, y - gap * s / 2, ax, y - gap * s / 2 - arm * 0.55 * s, { color: top, lw, side: -1, tickEvery: 8 });
  ssStrand(ctx, xs, y + gap * s / 2, ax, y + gap * s / 2 + arm * 0.55 * s, { color: bottom, lw, side: 1, tickEvery: 8 });
  // index blocks on both arms (i5 on the P5 arm, i7 on the P7 arm)
  if (index) {
    const mx = lerp(xs, ax, 0.6);
    const myB = y + gap * s / 2 + arm * 0.55 * s * 0.6;
    const myT = y - gap * s / 2 - arm * 0.55 * s * 0.6;
    ctx.fillStyle = index;
    roundRect(ctx, mx - 6, myB - 3, 12, 6, 2); ctx.fill();
    roundRect(ctx, mx - 6, myT - 3, 12, 6, 2); ctx.fill();
  }
  // 'T' overhang on the stem end (pairs with insert's A-tail)
  if (tOverhang) {
    const ox = x - dir * 4;
    line(ctx, x, y - gap * s / 2, ox, y - gap * s / 2, top, lw);
    text(ctx, 'T', ox - dir * 5, y - gap * s / 2 - 1, { size: 9 * s, color: top, align: 'center', weight: 700 });
  }
  ctx.restore();
}

// A finished library molecule: P5 adapter | insert | P7 adapter, drawn as a
// straight horizontal bar. x,y is the center. insertLen in px.
export function libraryMolecule(ctx, x, y, insertLen, P, o = {}) {
  const { alpha = 1, insertColor = P.dna, i5 = null, i7 = null, lw = 2.6, gap = 7, adapterLen = 34, highlight = null } = o;
  if (alpha <= 0) return;
  const half = insertLen / 2;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (highlight) {
    ctx.strokeStyle = highlight; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    roundRect(ctx, x - half - adapterLen - 6, y - gap - 4, insertLen + adapterLen * 2 + 12, gap * 2 + 8, 6); ctx.stroke();
    ctx.setLineDash([]);
  }
  dsPath(ctx, [[x - half - adapterLen, y], [x - half, y]], { colorA: P.p5, colorB: P.p5, gap, lw, rungEvery: 7 });
  dsPath(ctx, [[x - half, y], [x + half, y]], { colorA: insertColor, colorB: insertColor, gap, lw, rungEvery: 8 });
  dsPath(ctx, [[x + half, y], [x + half + adapterLen, y]], { colorA: P.p7, colorB: P.p7, gap, lw, rungEvery: 7 });
  if (i5) { ctx.fillStyle = i5; roundRect(ctx, x - half - adapterLen * 0.7 - 5, y - 3, 10, 6, 2); ctx.fill(); }
  if (i7) { ctx.fillStyle = i7; roundRect(ctx, x + half + adapterLen * 0.7 - 5, y - 3, 10, 6, 2); ctx.fill(); }
  ctx.restore();
}

// Base letters along a horizontal span: for showing sequence as text.
export function baseRow(ctx, seq, x, y, o = {}) {
  const { size = 13, step = 12, color = '#000', alpha = 1, colors = null, upto = seq.length } = o;
  if (alpha <= 0) return;
  for (let i = 0; i < Math.min(upto, seq.length); i++) {
    text(ctx, seq[i], x + i * step, y, { size, color: colors ? (colors[seq[i]] || color) : color, align: 'center', mono: true, alpha });
  }
}

// Deterministic pseudo-sequence
export function fakeSeq(n, seed = 1) {
  let s = '';
  for (let i = 0; i < n; i++) s += 'ACGT'[Math.floor(hash(i, seed) * 4)];
  return s;
}

// ---------- scene furniture ----------
export function panelTitle(ctx, str, W, P, alpha = 1) {
  text(ctx, str, 28, 30, { size: 16, color: P.ink, weight: 600, alpha });
}

export function footnote(ctx, str, W, H, P, alpha = 1) {
  text(ctx, str, W / 2, H - 22, { size: 13, color: P.inkDim, align: 'center', alpha });
}

// Simple axis + bars histogram for size distributions etc. values in [0,1]
export function histogram(ctx, x, y, w, h, values, P, o = {}) {
  const { color = P.dna, alpha = 1, baseline = true, labelL, labelR, title } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const n = values.length; const bw = w / n;
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const v = clamp(values[i]); if (v <= 0) continue;
    ctx.fillRect(x + i * bw + 0.5, y + h - v * h, Math.max(1, bw - 1), v * h);
  }
  if (baseline) { ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + h + 0.5); ctx.lineTo(x + w, y + h + 0.5); ctx.stroke(); }
  if (labelL) text(ctx, labelL, x, y + h + 14, { size: 11, color: P.inkDim });
  if (labelR) text(ctx, labelR, x + w, y + h + 14, { size: 11, color: P.inkDim, align: 'right' });
  if (title) text(ctx, title, x, y - 10, { size: 12, color: P.inkDim });
  ctx.restore();
}

// A smooth curve y=f(x) on [0,1] drawn in a box
export function curve(ctx, x, y, w, h, f, color, o = {}) {
  const { lw = 2, alpha = 1, n = 80, fill = false, dash } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.fillStyle = withAlpha(color, 0.18); ctx.lineWidth = lw;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const u = i / n; const v = clamp(f(u)); const px = x + u * w, py = y + h - v * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  if (fill) { ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill(); }
  else ctx.stroke();
  ctx.restore();
}

// Shaking offset for "vortex / sonication" effects
export function shake(t, amp = 3, speed = 40, seed = 0) {
  return [Math.sin(t * speed + seed) * amp, Math.cos(t * speed * 1.3 + seed * 2) * amp];
}

// A simple cell (circle with membrane) optionally Gram-positive (thick wall)
export function cellShape(ctx, x, y, r, P, o = {}) {
  const { alpha = 1, wall = 1, seed = 1, fill = P.cell, stroke = P.membrane, rod = false } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2 * wall;
  if (rod) { roundRect(ctx, x - r * 1.6, y - r * 0.7, r * 3.2, r * 1.4, r * 0.7); }
  else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  ctx.fill(); ctx.stroke(); ctx.restore();
}

// Phage: icosahedral-ish head + tail
export function phage(ctx, x, y, s, P, o = {}) {
  const { alpha = 1, color = P.enzyme, angle = 0 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = Math.cos(a) * s, py = Math.sin(a) * s - s * 0.6; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.lineTo(0, s * 1.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, s * 1.6); ctx.lineTo(-s * 0.6, s * 2.1); ctx.moveTo(0, s * 1.6); ctx.lineTo(s * 0.6, s * 2.1); ctx.stroke();
  ctx.restore();
}

export { withAlpha };
