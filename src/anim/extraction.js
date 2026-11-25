// Cell lysis & DNA extraction: chemical lysis opens Gram-negatives, bead
// beating opens Gram-positives too; DNA binds a column; reagent DNA comes along.
import { prog, sp, win, pulse, lerp, hash, text, callout, dsPath, cellShape, bead, blob, dot, line, arrow, roundRect, tube, withAlpha, shake } from '../draw.js';

// Field of cells: 5 Gram-negative (round, thin wall), 5 Gram-positive (rod, thick wall)
const CELLS = [];
for (let i = 0; i < 10; i++) {
  const gp = i >= 5;
  CELLS.push({ i, gp, x: 110 + hash(i, 1) * 300, y: 120 + hash(i, 2) * 190, r: gp ? 11 : 15, ang: hash(i, 3) * Math.PI });
}
const COL = { x: 640, y: 120, w: 60, h: 150 };   // spin column

function squiggle(ctx, x, y, len, phase, color, alpha, lw = 2) {
  if (alpha <= 0) return;
  const pts = [];
  for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push([x + (u - 0.5) * len, y + Math.sin(u * 9 + phase) * 4]); }
  dsPath(ctx, pts, { colorA: color, colorB: color, gap: 3, lw, rungs: false, alpha });
}

function stackBar(ctx, x, y, w, h, fr, cols, alpha) {
  let cy = y + h;
  fr.forEach((f, i) => { const hh = h * f; cy -= hh; ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = cols[i]; ctx.fillRect(x, cy, w, hh); ctx.restore(); });
}

export default {
  id: 'extraction',
  duration: 14,
  thumbT: 5.6,
  phases: [
    { t: 0, label: 'A mixed community', caption: 'Gram-negative cells have a thin wall; Gram-positives, spores and fungi have thick walls that resist chemical lysis.' },
    { t: 2.8, label: 'Chemical / enzymatic lysis', caption: 'Detergent, heat and enzymes open the easy cells and release their DNA; the tough ones stay shut.' },
    { t: 5.4, label: 'Bead beating', caption: 'Mechanical disruption opens the tough cells too, at the cost of shearing all the DNA into shorter pieces.' },
    { t: 8.0, label: 'Bind, wash, elute', caption: 'DNA binds silica or beads, is washed and eluted; reagent DNA (the kitome) binds right along with it.' },
    { t: 10.8, label: 'In your data', caption: 'Relative abundances reflect lysis efficiency as much as biology, and in low-biomass samples the contaminants can dominate.' },
  ],
  draw(ctx, t, W, H, P) {
    const fieldA = 1 - 0.55 * sp(t, 10.8, 11.6);
    // field background
    const boxA = fieldA * 0.5 * (1 - sp(t, 8.0, 8.9));   // the sample field fades once the DNA has left for the column
    if (boxA > 0) { ctx.save(); ctx.globalAlpha = boxA; ctx.fillStyle = P.liquid; roundRect(ctx, 80, 90, 360, 250, 12); ctx.fill(); ctx.restore(); }
    const chem = sp(t, 3.0, 4.6);     // Gram-negatives lyse
    const beat = sp(t, 5.8, 7.4);     // Gram-positives lyse
    const shakeAmp = 4 * pulse(t, 5.4, 7.8);
    const [shx, shy] = shake(t, shakeAmp, 45);

    // cells and released DNA
    CELLS.forEach(c => {
      const lys = c.gp ? beat : chem;
      const toColumn = sp(t, 8.2 + hash(c.i, 7) * 0.8, 9.4 + hash(c.i, 7) * 0.8);
      const cx = c.x + shx, cy = c.y + shy;
      if (lys < 1) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(c.gp ? c.ang : 0);
        cellShape(ctx, 0, 0, c.r * (1 + 0.25 * lys), P, { rod: c.gp, wall: c.gp ? 2.2 : 1, alpha: fieldA * (1 - lys), seed: c.i });
        ctx.restore();
      }
      // released DNA squiggle (shorter if bead-beaten)
      if (lys > 0) {
        const len = lerp(44, 26, beat);
        const px = lerp(cx, COL.x + COL.w / 2, toColumn), py = lerp(cy, COL.y + COL.h * 0.55 + (hash(c.i, 9) - 0.5) * 40, toColumn);
        squiggle(ctx, px, py + Math.sin(t * 2 + c.i) * 2 * (1 - toColumn), len * (1 - 0.5 * toColumn), c.i, P.dna, fieldA * Math.min(1, lys * 2) * (1 - 0.3 * toColumn));
      }
    });
    // burst flashes
    CELLS.forEach(c => { const f = pulse(t, c.gp ? 5.9 : 3.1, c.gp ? 6.6 : 3.8); if (f > 0) dot(ctx, c.x + shx, c.y + shy, 8 + 14 * f, P.gold, f * 0.6 * fieldA); });
    // beads during bead beating
    {
      const a = win(t, 5.4, 8.0, 0.4) * fieldA;
      for (let i = 0; i < 7; i++) {
        const [bx, by] = shake(t, 14, 30 + i * 3, i);
        bead(ctx, 110 + i * 50 + bx, 200 + (hash(i, 8) - 0.5) * 160 + by, 7, P, a);
      }
    }
    // labels
    callout(ctx, 'Gram-negative: thin wall', 100, 360, P, { alpha: win(t, 0.4, 2.8), size: 12, color: P.ink });
    callout(ctx, 'Gram-positive / spore / fungus: thick wall', 260, 360, P, { alpha: win(t, 0.4, 2.8), size: 12, color: P.ink });
    text(ctx, 'detergent + heat + lysozyme + proteinase K', 260, 72, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 2.8, 5.4, 0.4) });
    text(ctx, 'bead beating: thick walls break, DNA shears to < 10 kb', 260, 72, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 5.4, 8.0, 0.4) });
    text(ctx, 'still intact: not in your data', 260, 360, { size: 12, color: P.alert, align: 'center', alpha: win(t, 4.4, 5.6, 0.3) });

    // column
    {
      const a = win(t, 7.8, 11.4, 0.5);
      if (a > 0) {
        const { x, y, w, h } = COL;
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.glass; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h * 0.7); ctx.lineTo(x + w * 0.35, y + h); ctx.lineTo(x + w * 0.65, y + h); ctx.lineTo(x + w, y + h * 0.7); ctx.lineTo(x + w, y); ctx.stroke();
        ctx.fillStyle = P.enzymeDim; ctx.fillRect(x + 2, y + h * 0.5, w - 4, 12); // silica frit
        ctx.restore();
        text(ctx, 'silica column / beads', x + w / 2, y - 14, { size: 12, color: P.inkDim, align: 'center', alpha: a });
        const wa = win(t, 9.4, 10.6, 0.3) * a;
        text(ctx, 'wash  →  elute', x + w / 2, y + h + 16, { size: 12, color: P.ink, align: 'center', alpha: wa });
        // eluate tube
        tube(ctx, x + w + 60, y + 60, 40, 90, P, { level: 0.25 * sp(t, 9.8, 10.6), alpha: a, label: 'eluate' });
        // reagent bottle releasing contaminant DNA
        const ra = win(t, 8.6, 11.0, 0.3) * a;
        ctx.save(); ctx.globalAlpha = ra; ctx.strokeStyle = P.glass; ctx.lineWidth = 2; roundRect(ctx, 820, 150, 50, 70, 6); ctx.stroke(); ctx.fillStyle = P.glass; ctx.fillRect(835, 140, 20, 10); ctx.restore();
        text(ctx, 'buffer, columns, water', 845, 236, { size: 11, color: P.inkDim, align: 'center', alpha: ra });
        const cm = sp(t, 8.9, 10.0);
        squiggle(ctx, lerp(845, x + w / 2, cm), lerp(185, y + h * 0.6, cm), 26, 4, P.alert, ra);
        callout(ctx, 'reagent DNA: the "kitome"', 760, 110, P, { alpha: ra, size: 12, color: P.alert, to: [lerp(845, x + w / 2, cm), lerp(185, y + h * 0.6, cm)] });
      }
    }

    // data panel
    {
      const a = win(t, 10.9, 14.5, 0.6);
      if (a > 0) {
        const bx = 520, by = 90, bw = 80, bh = 240, gapX = 30;
        const cols = [P.samples[0], P.samples[3], P.alert];
        const bars = [
          { label: 'chemical lysis', fr: [0.80, 0.17, 0.03] },
          { label: 'bead beating', fr: [0.52, 0.45, 0.03] },
          { label: 'low biomass', fr: [0.25, 0.20, 0.55] },
          { label: 'blank', fr: [0.0, 0.0, 1.0] },
        ];
        text(ctx, 'same sample, different protocols', bx + (bw + gapX) * 2 - gapX / 2, by - 22, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        bars.forEach((b, k) => {
          const g = sp(t, 11.2 + k * 0.35, 12.0 + k * 0.35);
          const x = bx + k * (bw + gapX);
          stackBar(ctx, x, by, bw, bh * g, b.fr, cols, a);
          text(ctx, b.label, x + bw / 2, by + bh + 16, { size: 11.5, color: P.inkDim, align: 'center', alpha: a });
        });
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.inkFaint; ctx.beginPath(); ctx.moveTo(bx - 10, by + bh + 0.5); ctx.lineTo(bx + 4 * bw + 3 * gapX + 10, by + bh + 0.5); ctx.stroke(); ctx.restore();
        const la = a * sp(t, 12.3, 12.9);
        const ly = by + bh + 44;
        [['Gram-negative taxa', cols[0]], ['Gram-positive taxa', cols[1]], ['reagent contaminants', cols[2]]].forEach(([l, c], i) => {
          ctx.save(); ctx.globalAlpha = la; ctx.fillStyle = c; ctx.fillRect(bx + i * 130, ly - 5, 10, 10); ctx.restore();
          text(ctx, l, bx + i * 130 + 15, ly, { size: 11, color: P.inkDim, alpha: la });
        });
        text(ctx, 'compare within one kit; sequence the blanks', bx + 2 * bw + 1.5 * gapX, ly + 26, { size: 12, color: P.gold, align: 'center', alpha: la, weight: 600 });
      }
    }
  },
};
