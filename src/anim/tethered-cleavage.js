// CUT&RUN / CUT&Tag: a permeabilised cell on a concanavalin A bead, the
// antibody finds its target in situ, a tethered nuclease (or transposase)
// cuts only next to it, and the fragment diffuses out while the rest of the
// genome stays inside. End: near-zero background compared with ChIP.
import { prog, sp, win, pulse, lerp, hash, text, dsPath, dsFragment, blob, bead, dot, line, arrow, roundRect, cellShape, curve, footnote, withAlpha } from '../draw.js';

const CONA = { x: 132, y: 285, r: 70 };
const CELL = { x: 345, y: 285, r: 150 };
const NUC = { x: 358, y: 282, r: 105 };
const CHR_Y = 282, CHR_X0 = 262, CHR_X1 = 454;   // chromatin strand across the nucleus
const CUT_L = 312, CUT_R = 392;                   // cut sites either side of the target
const TGT = { x: 352, y: CHR_Y };
const OUT = { x: 640, y: 190 };                   // where the released fragment ends up
const ECOLI = [[740, 150], [790, 205], [705, 240], [830, 170]];
const NX = 600;                                   // right-hand notes

function wobble(x0, x1, y, amp, seed) {
  const pts = []; const n = Math.max(2, Math.round((x1 - x0) / 10));
  for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); pts.push([x, y + amp * Math.sin(x / 17 + seed)]); }
  return pts;
}
function antibody(ctx, x, y, ang, P, alpha = 1, s = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.strokeStyle = P.enzyme; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-13, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -7); ctx.moveTo(0, 0); ctx.lineTo(10, 7); ctx.stroke();
  ctx.fillStyle = P.gold; ctx.beginPath(); ctx.arc(10, -7, 2.4, 0, Math.PI * 2); ctx.arc(10, 7, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function target(ctx, x, y, P, alpha, seed = 4) {
  if (alpha <= 0) return;
  blob(ctx, x, y, 9, P.enzyme, { seed, alpha, stroke: P.gold });
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = P.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 10.5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function enzymeDisc(ctx, x, y, P, alpha, label, seed = 7) {
  if (alpha <= 0) return;
  blob(ctx, x, y, 12, P.enzyme, { seed, alpha, stroke: P.inkDim });
  text(ctx, label, x, y, { size: 8.5, color: P.panel, weight: 700, align: 'center', alpha, mono: true });
}

export default {
  id: 'tethered-cleavage',
  duration: 15,
  thumbT: 8.2,
  phases: [
    { t: 0, label: 'Cells on ConA beads', caption: 'Unfixed cells are bound to concanavalin A-coated magnetic beads and permeabilised with digitonin, so antibodies and enzymes can enter while the chromatin stays where it is.' },
    { t: 2.2, label: 'Antibody finds its target in situ', caption: 'The primary antibody diffuses into the nucleus and binds its epitope on intact chromatin. No shearing, no pulling anything out.' },
    { t: 4.6, label: 'Tethered nuclease, then Ca²⁺', caption: 'Protein A/G–MNase binds the antibody and waits. Calcium at 0 °C switches it on for a few minutes: it cuts the DNA on either side of the target and nowhere else.' },
    { t: 7.4, label: 'The fragment diffuses out', caption: 'Only the cut fragment is small enough to leave the nucleus; the supernatant is almost pure target-adjacent DNA. The rest of the genome never leaves the cell. E. coli DNA carried over with the enzyme comes along in a fixed amount.' },
    { t: 9.8, label: 'CUT&Tag: a transposase instead', caption: 'Protein A–Tn5 loaded with adapters is tethered the same way; magnesium activates it and the DNA leaves the cell already carrying adapters. The only library step left is PCR.' },
    { t: 12, label: 'Near-zero background', caption: 'Compared with ChIP, far fewer reads land outside peaks: FRiP of 30–80 % and 3–10 million reads are normal. The flip side: an IgG control looks almost empty, and ChIP-style peak callers need different settings.' },
  ],
  draw(ctx, t, W, H, P) {
    const abIn = sp(t, 2.5, 3.9);                 // antibody travels to the target
    const enzIn = sp(t, 4.9, 5.8);                // pA-MNase docks
    const ca = sp(t, 6.0, 6.5);                   // calcium
    const caOff = 1 - sp(t, 7.3, 7.8);            // calcium chelated, dots fade
    const cut = sp(t, 6.6, 7.2);                  // both cuts
    const out = sp(t, 7.7, 9.0);                  // fragment leaves
    const tagA = win(t, 9.8, 12.2, 0.4);          // CUT&Tag inset
    const sceneA = 1 - sp(t, 12.0, 12.6);

    ctx.save(); ctx.globalAlpha *= sceneA;

    // ── ConA bead and the cell ──
    bead(ctx, CONA.x, CONA.y, CONA.r, P, 1);
    text(ctx, 'ConA bead', CONA.x, CONA.y + CONA.r + 18, { size: 11.5, color: P.inkDim, align: 'center' });
    cellShape(ctx, CELL.x, CELL.y, CELL.r, P, { alpha: 1 });
    for (let i = 0; i < 16; i++) {                 // digitonin pores
      const a = (i / 16) * Math.PI * 2 + 0.2;
      dot(ctx, CELL.x + Math.cos(a) * CELL.r, CELL.y + Math.sin(a) * CELL.r, 3.4, P.bg, sp(t, 0.6, 1.4));
    }
    text(ctx, 'digitonin-permeabilised', CELL.x, CELL.y + CELL.r + 18, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 0.8, 4.6, 0.3) });
    ctx.save(); ctx.fillStyle = withAlpha(P.panel, 0.55); ctx.strokeStyle = P.membrane; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(NUC.x, NUC.y, NUC.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    text(ctx, 'nucleus', NUC.x, NUC.y - NUC.r - 10, { size: 11, color: P.inkDim, align: 'center' });

    // ── chromatin ──
    dsPath(ctx, wobble(280, 436, 222, 7, 1), { colorA: P.dnaDim, colorB: P.dnaDim, rungEvery: 9, lw: 2 });
    dsPath(ctx, wobble(284, 432, 344, 6, 5), { colorA: P.dnaDim, colorB: P.dnaDim, rungEvery: 9, lw: 2 });
    const gap = 6 * cut;
    dsPath(ctx, wobble(CHR_X0, CUT_L - gap, CHR_Y, 4, 2), { colorA: P.dna, colorB: P.dna, rungEvery: 8 });
    dsPath(ctx, wobble(CUT_R + gap, CHR_X1, CHR_Y, 4, 2), { colorA: P.dna, colorB: P.dna, rungEvery: 8 });
    // the piece between the cuts travels out with its complex
    const mx = lerp(TGT.x, OUT.x, out), my = lerp(TGT.y, OUT.y, out) - 30 * Math.sin(Math.PI * out);
    const half = (CUT_R - CUT_L) / 2;
    dsFragment(ctx, mx - half + gap, mx + half - gap, my, { colorA: P.dna, colorB: P.dna, rungEvery: 8 });
    target(ctx, mx, my - 11, P, 1);
    // antibody: travels in from outside, then sits on the target with arms down
    if (abIn > 0) {
      const sx = 640, sy = 80;
      if (abIn < 1) {
        const ax = lerp(sx, mx, abIn), ay = lerp(sy, my - 11, abIn);
        antibody(ctx, ax, ay, Math.PI / 2 + (1 - abIn) * 2.2, P, 1);
        text(ctx, 'primary antibody', ax + 16, ay - 8, { size: 11.5, color: P.inkDim, alpha: 1 - abIn });
      } else {
        antibody(ctx, mx, my - 36, Math.PI / 2, P, 1);
        if (enzIn >= 1) enzymeDisc(ctx, mx, my - 58, P, 1, 'MN');
      }
    }
    if (enzIn > 0 && enzIn < 1) {                  // pA-MNase approaching
      const ex = lerp(640, mx, enzIn), ey = lerp(110, my - 58, enzIn);
      enzymeDisc(ctx, ex, ey, P, 1, 'MN');
      text(ctx, 'pA/G–MNase', ex + 18, ey - 12, { size: 11.5, color: P.inkDim, alpha: 1 - enzIn });
    }
    if (ca > 0 && caOff > 0) {                     // calcium
      for (let i = 0; i < 10; i++) {
        const ang = hash(i, 21) * Math.PI * 2, r = 34 + 46 * hash(i, 22);
        dot(ctx, TGT.x + Math.cos(ang) * r, TGT.y - 20 + Math.sin(ang) * r * 0.7, 2.6, P.gold, ca * caOff * (0.6 + 0.4 * Math.sin(t * 6 + i)));
      }
    }
    [CUT_L, CUT_R].forEach((cx, i) => { const f = pulse(t, 6.55 + i * 0.15, 7.15 + i * 0.15); if (f > 0) dot(ctx, cx, CHR_Y, 5 + 9 * f, P.gold, f * 0.85); });

    // ── out into the supernatant ──
    if (out > 0) {
      arrow(ctx, CELL.x + CELL.r - 12, 212, 585, 178, P.inkDim, { alpha: out * 0.9, lw: 1.5, dash: [4, 4] });
      text(ctx, 'supernatant', OUT.x, 112, { size: 13, color: P.ink, weight: 600, align: 'center', alpha: out });
      text(ctx, 'rest of the genome stays inside', CELL.x, CELL.y + CELL.r + 18, { size: 11.5, color: P.inkDim, align: 'center', alpha: sp(t, 8.4, 9.0) });
      const ea = sp(t, 8.6, 9.3);
      ECOLI.forEach(([x, y]) => dsFragment(ctx, x - 14, x + 14, y, { colorA: P.samples[5], colorB: P.samples[5], alpha: ea, rungEvery: 6, lw: 2, gap: 4.5 }));
      text(ctx, 'E. coli DNA from the enzyme prep:', 760, 268, { size: 11.5, color: P.inkDim, align: 'center', alpha: ea });
      text(ctx, 'a spike-in by accident, same amount every time', 760, 284, { size: 11.5, color: P.inkDim, align: 'center', alpha: ea });
    }

    // ── right-hand notes for the early phases ──
    const note = (s0, s1, lines, hi) => {
      const a = win(t, s0, s1, 0.3);
      if (a <= 0) return;
      lines.forEach((l, k) => text(ctx, l, NX, 330 + k * 21, { size: 13, color: k === 0 ? P.ink : (hi === k ? P.gold : P.inkDim), weight: k === 0 ? 600 : 400, alpha: a }));
    };
    note(0.3, 2.2, ['Nothing is sheared, nothing is pulled out', '5 000 to 500 000 cells, unfixed', 'the bead just holds the cells for washes']);
    note(2.3, 4.6, ['The antibody works inside the cell', 'same antibody rules as ChIP:', 'specificity is the experiment']);
    note(4.7, 7.4, ['The nuclease is tethered, not free', 'inactive until Ca²⁺ is added at 0 °C', 'cuts on either side, nowhere else'], 2);
    note(7.5, 9.6, ['What is sequenced', 'almost only target-adjacent DNA', 'plus a constant dose of E. coli DNA']);

    // ── CUT&Tag inset ──
    if (tagA > 0) {
      const X = 545, Y = 305, Wd = 380, Hd = 170;
      ctx.save(); ctx.globalAlpha *= tagA; ctx.fillStyle = P.panel; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; roundRect(ctx, X, Y, Wd, Hd, 8); ctx.fill(); ctx.stroke(); ctx.restore();
      text(ctx, 'CUT&Tag: pA–Tn5 instead of MNase', X + 14, Y + 20, { size: 13, color: P.ink, weight: 600, alpha: tagA });
      const cy = Y + 120, cx = X + 190;
      const ins = sp(t, 10.6, 11.4);
      dsFragment(ctx, X + 40, cx - 36, cy, { colorA: P.dna, colorB: P.dna, alpha: tagA, rungEvery: 8 });
      dsFragment(ctx, cx - 36, cx + 36, cy, { colorA: P.dna, colorB: P.dna, alpha: tagA, rungEvery: 8 });
      dsFragment(ctx, cx + 36, X + Wd - 40, cy, { colorA: P.dna, colorB: P.dna, alpha: tagA, rungEvery: 8 });
      target(ctx, cx, cy - 11, P, tagA, 5);
      antibody(ctx, cx, cy - 46, Math.PI / 2, P, tagA);
      enzymeDisc(ctx, cx - 24, cy - 62, P, tagA, 'Tn5', 8);
      enzymeDisc(ctx, cx + 24, cy - 62, P, tagA, 'Tn5', 9);
      ctx.save(); ctx.globalAlpha *= tagA * ins;
      ctx.fillStyle = P.p5; ctx.fillRect(cx - 36 - 14, cy - 4, 14, 8);
      ctx.fillStyle = P.p7; ctx.fillRect(cx + 36, cy - 4, 14, 8);
      ctx.restore();
      [cx - 36, cx + 36].forEach((x, i) => { const f = pulse(t, 10.5 + i * 0.1, 11.0 + i * 0.1); if (f > 0) dot(ctx, x, cy, 4 + 6 * f, P.gold, f * 0.8 * tagA); });
      text(ctx, 'Mg²⁺: adapters inserted on both sides of the target', X + 14, Y + 142, { size: 11.5, color: P.inkDim, alpha: tagA * ins });
      text(ctx, 'already tagmented: only PCR is left', X + 14, Y + 158, { size: 11.5, color: P.gold, weight: 600, alpha: tagA * sp(t, 11.2, 11.7) });
      text(ctx, 'Nextera adapter in every read · 2×50 is enough', X + 14, Y + 36, { size: 11, color: P.inkDim, alpha: tagA * sp(t, 11.0, 11.5) });
    }
    ctx.restore();

    // ── final: background comparison ──
    {
      const a = win(t, 12.0, 15.6, 0.5);
      if (a > 0) {
        const X = 130, Wd = 720;
        text(ctx, 'Same antibody, same locus', 480, 88, { size: 15, color: P.ink, weight: 600, align: 'center', alpha: a });
        const peak = (u, c, w) => Math.exp(-((u - c) * (u - c)) / (2 * w * w));
        const noise = (u, s) => hash(Math.floor(u * 72), s);
        const peaks = u => peak(u, 0.18, 0.012) + 0.75 * peak(u, 0.47, 0.013) + 0.9 * peak(u, 0.76, 0.012);
        const g = sp(t, 12.3, 13.0);
        const y1 = 130, h1 = 95;
        curve(ctx, X, y1, Wd, h1, u => 0.22 + 0.14 * noise(u, 1) + 0.6 * peaks(u) * g, P.enzyme, { fill: true, alpha: a, n: 240 });
        text(ctx, 'ChIP-seq', X - 10, y1 + h1 - 10, { size: 13, color: P.ink, weight: 600, align: 'right', alpha: a });
        text(ctx, '20–50 M reads · FRiP 1–10 % · background everywhere', X + Wd, y1 - 8, { size: 11.5, color: P.inkDim, align: 'right', alpha: a });
        const y2 = 265, h2 = 95;
        curve(ctx, X, y2, Wd, h2, u => 0.015 + 0.02 * noise(u, 2) + 0.95 * peaks(u) * g, P.dna, { fill: true, alpha: a, n: 240 });
        text(ctx, 'CUT&RUN', X - 10, y2 + h2 - 10, { size: 13, color: P.ink, weight: 600, align: 'right', alpha: a });
        text(ctx, '3–10 M reads · FRiP 30–80 % · baseline near zero', X + Wd, y2 - 8, { size: 11.5, color: P.inkDim, align: 'right', alpha: a });
        line(ctx, X, y2 + h2 + 0.5, X + Wd, y2 + h2 + 0.5, P.inkFaint, 1, a);
        const y3 = 385, h3 = 30;
        const b = a * sp(t, 13.0, 13.6);
        curve(ctx, X, y3, Wd, h3, u => 0.08 + 0.12 * noise(u, 3) + 0.25 * peak(u, 0.47, 0.03), P.inkFaint, { fill: true, alpha: b, n: 240 });
        text(ctx, 'IgG CUT&RUN', X - 10, y3 + h3 - 6, { size: 12, color: P.inkDim, weight: 600, align: 'right', alpha: b });
        text(ctx, 'almost empty: E. coli reads and open-chromatin background', X + Wd, y3 - 6, { size: 11.5, color: P.alert, align: 'right', alpha: b });
        text(ctx, 'A CUT&RUN library with ChIP-like 1–5 % FRiP is a failed experiment, not a noisy one.', 480, 456, { size: 12.5, color: P.ink, align: 'center', alpha: a * sp(t, 13.6, 14.2) });
        footnote(ctx, 'low background: fewer reads needed, but IgG controls look empty', W, H, P, a * sp(t, 14.0, 14.6));
      }
    }
  },
};
