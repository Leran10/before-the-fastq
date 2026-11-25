// Tissue dissociation: packed tissue -> protease at 37 °C -> cells separate,
// fragile ones burst (ambient RNA) -> strainer removes clumps -> stress genes
// rise -> the suspension's composition is not the tissue's.
import { sp, win, pulse, lerp, hash, text, callout, cellShape, blob, dot, line, arrow, roundRect, curve, shake, withAlpha } from '../draw.js';

// cell types: index into P.samples; r = radius; fragile cells burst during digestion
const TYPES = [
  { name: 'immune (small, robust)', k: 0, r: 8 },
  { name: 'fibroblast', k: 1, r: 10 },
  { name: 'epithelial', k: 2, r: 12 },
  { name: 'large fragile (neuron, adipocyte)', k: 3, r: 17 },
];
const TYPE_OF = [0, 1, 3, 2, 0, 1, 0, 2, 1, 3, 2, 0, 1, 2, 3, 0, 2, 1, 0, 2, 0, 3, 1, 2];
const BURST = new Set([2, 9, 14]);       // fragile cells that lyse (21 survives)
const CLUMP = new Set([5, 6]);           // two cells that stay stuck together

const CELLS = [];
for (let i = 0; i < 24; i++) {
  const ty = TYPES[TYPE_OF[i]];
  const col = i % 6, row = Math.floor(i / 6);
  const gx = 150 + col * 56 + (row % 2) * 28, gy = 115 + row * 52;
  let dx = 110 + 400 * hash(i, 11), dy = 95 + 185 * hash(i, 12);
  if (i === 6) { dx = 110 + 400 * hash(5, 11) + 14; dy = 95 + 185 * hash(5, 12) + 10; }   // clump partner sits beside cell 5
  const fx = 130 + 370 * hash(i, 13), fy = 375 + 85 * hash(i, 14);
  CELLS.push({
    i, ty, gx, gy, dx, dy, fx, fy,
    sepT: 2.9 + 0.7 * hash(i, 21),
    burstT: 3.9 + 0.6 * hash(i, 22),
    fallT: 5.9 + 0.9 * hash(i, 23),
  });
}
const ENZ = [];
for (let i = 0; i < 7; i++) ENZ.push({ x: 110 + 410 * hash(i, 31), y: 90 + 200 * hash(i, 32), s: i });

const STRAIN_Y = 318;
const COMP = { tissue: [0.15, 0.20, 0.30, 0.35], susp: [0.35, 0.30, 0.27, 0.08] };   // per TYPES order

function rnaSquiggle(ctx, x, y, len, ph, color, alpha, lw = 1.8) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 0; k <= 10; k++) { const u = k / 10; const px = x + (u - 0.5) * len, py = y + Math.sin(u * 8 + ph) * 3; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke(); ctx.restore();
}

export default {
  id: 'single-cell-suspension',
  duration: 14,
  thumbT: 4.6,
  phases: [
    { t: 0, label: 'Tissue', caption: 'Fresh tissue is minced: several cell types packed together, large fragile ones and small robust ones.' },
    { t: 2.5, label: 'Digestion at 37 °C', caption: 'Proteases dissolve the matrix for 15–60 minutes. Cells separate; the fragile ones burst and leak their RNA into the buffer.' },
    { t: 5.5, label: 'Strainer', caption: 'A 30–70 µm strainer lets single cells through and holds back clumps and debris.' },
    { t: 8.0, label: 'Stressed cells', caption: 'An hour at 37 °C switches on immediate-early and heat-shock genes in every surviving cell.' },
    { t: 10.5, label: 'In your data', caption: 'Cell-type proportions reflect survival, not tissue; free RNA from burst cells becomes ambient background in every droplet.' },
  ],
  draw(ctx, t, W, H, P) {
    const fieldA = 1 - sp(t, 10.5, 11.3);
    const shakeAmp = 2.5 * pulse(t, 2.6, 5.6);
    const [shx, shy] = shake(t, shakeAmp, 30);

    ctx.save(); ctx.globalAlpha *= fieldA;
    if (fieldA > 0) {
    // tissue block background
    {
      const a = win(t, 0, 3.6, 0.5) * 0.45;
      if (a > 0) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.liquid; roundRect(ctx, 115, 85, 360, 215, 18); ctx.fill(); ctx.restore(); }
    }
    text(ctx, 'minced tissue: cells of several types, held by matrix', 295, 62, { size: 12.5, color: P.inkDim, align: 'center', alpha: win(t, 0.3, 2.6, 0.4) });
    text(ctx, 'protease (trypsin / collagenase / papain), 37 °C, 15–60 min', 295, 62, { size: 12.5, color: P.inkDim, align: 'center', alpha: win(t, 2.6, 5.6, 0.4) });
    text(ctx, '30–70 µm strainer: single cells pass, clumps are held back', 295, 62, { size: 12.5, color: P.inkDim, align: 'center', alpha: win(t, 5.6, 8.1, 0.4) });

    // enzymes
    ENZ.forEach(e => {
      const a = win(t, 2.6, 5.7, 0.5);
      if (a <= 0) return;
      const [ex, ey] = shake(t, 6, 10, e.s);
      blob(ctx, e.x + ex, e.y + ey, 7, P.enzyme, { seed: e.s + 2, alpha: a * 0.9 });
    });

    // strainer
    {
      const a = win(t, 5.5, 10.6, 0.4);
      if (a > 0) {
        for (let x = 95; x < 520; x += 22) line(ctx, x, STRAIN_Y, x + 13, STRAIN_Y, P.glass, 3, a);
        text(ctx, 'strainer', 532, STRAIN_Y, { size: 11, color: P.inkDim, alpha: a });
        arrow(ctx, 560, 250, 560, 390, P.inkFaint, { lw: 1.2, head: 6, alpha: a * win(t, 5.8, 8.2, 0.4) });
        text(ctx, 'single-cell suspension', 300, 495, { size: 12.5, color: P.ink, align: 'center', alpha: a * win(t, 7.0, 10.6, 0.4) });
      }
    }

    // cells
    CELLS.forEach(c => {
      const sep = sp(t, c.sepT, c.sepT + 1.4);
      const fall = CLUMP.has(c.i) ? sp(t, 6.0, 7.2) : sp(t, c.fallT, c.fallT + 1.3);
      let x = lerp(c.gx, c.dx, sep), y = lerp(c.gy, c.dy, sep);
      if (CLUMP.has(c.i)) { x = lerp(x, x, fall); y = lerp(y, STRAIN_Y - 14 - (c.i === 6 ? -6 : 0), fall); }
      else { x = lerp(x, c.fx, fall); y = lerp(y, c.fy, fall); }
      x += shx * (1 - fall); y += shy * (1 - fall) + Math.sin(t * 1.4 + c.i) * 1.5 * fall;
      const col = P.samples[c.ty.k];
      if (BURST.has(c.i)) {
        const b = sp(t, c.burstT + 0.15, c.burstT + 0.55);
        const fl = pulse(t, c.burstT, c.burstT + 0.6);
        if (b < 1) cellShape(ctx, x, y, c.ty.r * (1 + 0.3 * b), P, { fill: withAlpha(col, 0.35), stroke: col, alpha: 1 - b, seed: c.i });
        if (fl > 0) dot(ctx, x, y, c.ty.r + 10 * fl, P.gold, fl * 0.6);
        // released RNA drifts outward and stays (ambient)
        const d = sp(t, c.burstT + 0.2, c.burstT + 2.2);
        if (d > 0) for (let k = 0; k < 3; k++) {
          const ang = hash(c.i * 3 + k, 41) * 6.28, rad = 6 + 26 * d * (0.6 + 0.4 * hash(k, 42));
          rnaSquiggle(ctx, x + Math.cos(ang) * rad, y + Math.sin(ang) * rad + Math.sin(t * 2 + k) * 1.5, 16, k + c.i, P.rna, Math.min(1, d * 2) * 0.9);
        }
        return;
      }
      cellShape(ctx, x, y, c.ty.r, P, { fill: withAlpha(col, 0.35), stroke: col, seed: c.i });
      // stress glow on survivors after digestion
      const st = sp(t, 8.1, 9.6) * win(t, 8.0, 10.6, 0.5);
      if (st > 0) dot(ctx, x, y, c.ty.r * 0.45, P.gold, st * 0.9);
    });
    // clump label
    {
      const a = win(t, 6.8, 8.2, 0.4);
      const c5 = CELLS[5];
      callout(ctx, 'clump: held back', 96, STRAIN_Y + 28, P, { alpha: a, size: 11, color: P.inkDim, to: [c5.dx - 6, STRAIN_Y - 10] });
    }
    // labels on the tissue
    {
      const a = win(t, 0.4, 2.7, 0.4);
      const frag = CELLS[2], imm = CELLS[0];
      callout(ctx, 'large, fragile', frag.gx + 24, frag.gy - 30, P, { alpha: a, size: 11.5, color: P.samples[3], to: [frag.gx + 10, frag.gy - 12] });
      const imm18 = CELLS[18];
      callout(ctx, 'small, robust', 120, 324, P, { alpha: a, size: 11.5, color: P.samples[0], to: [imm18.gx - 2, imm18.gy + 10] });
    }
    // burst annotation
    {
      const a = win(t, 4.3, 5.8, 0.4);
      callout(ctx, 'fragile cells lyse → free RNA', 300, 318, P, { alpha: a, size: 12, color: P.rna, align: 'center' });
    }
    }
    ctx.restore();

    // ---- stress panel (right) ----
    {
      const a = win(t, 8.0, 14.5, 0.5);
      if (a > 0) {
        const X = 640, Y = 120, PW = 250, PH = 130;
        text(ctx, 'dissociation-stress genes', X + PW / 2, 92, { size: 13.5, color: P.ink, weight: 600, align: 'center', alpha: a });
        line(ctx, X, Y + PH + 0.5, X + PW, Y + PH + 0.5, P.inkFaint, 1, a);
        line(ctx, X + 0.5, Y, X + 0.5, Y + PH, P.inkFaint, 1, a);
        [0, 30, 60].forEach((m, k) => text(ctx, String(m), X + (k / 2) * PW, Y + PH + 14, { size: 10.5, color: P.inkDim, align: 'center', alpha: a }));
        text(ctx, 'minutes at 37 °C', X + PW / 2, Y + PH + 32, { size: 11, color: P.inkDim, align: 'center', alpha: a });
        const g = sp(t, 8.3, 10.0);
        if (g > 0) curve(ctx, X, Y, PW * g, PH, u => 0.08 + 0.85 * (1 - Math.exp(-4 * u * g)), P.gold, { alpha: a, lw: 2.2, n: 120 });
        text(ctx, 'FOS, JUN, EGR1, HSPA1A…', X + PW - 4, Y + PH - 14, { size: 11.5, color: P.gold, align: 'right', alpha: a * sp(t, 8.6, 9.2) });
        text(ctx, 'high in every surviving cell type', X + PW / 2, Y + PH + 56, { size: 11.5, color: P.inkDim, align: 'center', alpha: a * sp(t, 9.4, 10.0) });
        text(ctx, 'cold protease (6 °C) avoids most of it', X + PW / 2, Y + PH + 74, { size: 11, color: P.good, align: 'center', alpha: a * sp(t, 9.8, 10.4) });
      }
    }

    // ---- in your data (left, replaces the field) ----
    {
      const a = win(t, 10.7, 14.5, 0.5);
      if (a > 0) {
        const BY0 = 150, BH = 215, BW = 84;
        text(ctx, 'cell-type proportions', 262, 112, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        [['tissue', COMP.tissue, 130], ['suspension', COMP.susp, 300]].forEach(([lab, fr, x], j) => {
          const g = sp(t, 10.9 + j * 0.5, 11.9 + j * 0.5);
          let y = BY0 + BH;
          fr.forEach((f, k) => {
            const hh = BH * f * g; y -= hh;
            ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P.samples[TYPES[k].k]; ctx.fillRect(x, y, BW, hh); ctx.restore();
          });
          text(ctx, lab, x + BW / 2, BY0 + BH + 16, { size: 12, color: P.inkDim, align: 'center', alpha: a });
        });
        // legend
        const la = a * sp(t, 12.0, 12.6);
        TYPES.forEach((ty, k) => {
          const y = 175 + k * 26;
          ctx.save(); ctx.globalAlpha = la; ctx.fillStyle = P.samples[ty.k]; ctx.fillRect(410, y - 5, 10, 10); ctx.restore();
          text(ctx, ty.name, 426, y, { size: 11, color: P.inkDim, alpha: la, maxWidth: 170 });
        });
        text(ctx, 'proportions = survival through digestion, not tissue', 262, 410, { size: 12, color: P.gold, weight: 600, align: 'center', alpha: la });
        // ambient RNA note
        const ra = a * sp(t, 12.4, 13.0);
        text(ctx, 'free RNA from burst cells is captured in every droplet', 262, 455, { size: 12, color: P.rna, align: 'center', alpha: ra });
        for (let k = 0; k < 7; k++) rnaSquiggle(ctx, 120 + k * 48 + (hash(k, 51) - 0.5) * 14, 485 + (hash(k, 52) - 0.5) * 14 + Math.sin(t * 2 + k) * 1.5, 18, k, P.rna, ra * 0.9);
        text(ctx, '→ ambient background; haemoglobin in non-blood cells is the classic sign', 262, 515, { size: 11, color: P.inkDim, align: 'center', alpha: ra });
      }
    }
  },
};
