// Library QC & quantification: an electropherogram draws itself, qPCR vs
// Qubit, the molarity formula, and how mis-sizing becomes uneven depth.
import { prog, sp, win, pulse, lerp, hash, text, callout, libraryMolecule, yAdapter, dsFragment, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

const TX = 90, TY = 110, TW = 560, TH = 220;   // trace box
// x positions on a pseudo-log bp axis
const AX = [['25', 0.04], ['100', 0.22], ['200', 0.38], ['400', 0.56], ['700', 0.72], ['1500', 0.9]];
const bpU = bp => { // map bp to u in [0,1] using the anchors (piecewise)
  const pts = [[25, 0.04], [100, 0.22], [200, 0.38], [400, 0.56], [700, 0.72], [1500, 0.9]];
  for (let i = 0; i < pts.length - 1; i++) if (bp <= pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], (Math.log(bp) - Math.log(pts[i][0])) / (Math.log(pts[i + 1][0]) - Math.log(pts[i][0])));
  return 0.95;
};
const peak = (u, c, w, h) => h * Math.exp(-0.5 * ((u - c) / w) ** 2);
const trace = u => peak(u, bpU(25), 0.008, 0.6) + peak(u, bpU(125), 0.012, 0.42) + peak(u, bpU(450), 0.07, 0.95) + peak(u, bpU(950), 0.05, 0.22) + peak(u, bpU(1500), 0.008, 0.6);

export default {
  id: 'library-qc',
  duration: 13,
  thumbT: 3.4,
  phases: [
    { t: 0, label: 'Size trace', caption: 'A TapeStation or Bioanalyzer separates the library by size; one broad peak at insert + ~130 bp of adapter is what you want.' },
    { t: 4.6, label: 'Quantify', caption: 'qPCR with P5/P7 primers counts only molecules that can cluster; Qubit counts all double-stranded DNA.' },
    { t: 7.4, label: 'Molarity', caption: 'Loading is by molar concentration, computed from mass concentration and the average size read off the trace.' },
    { t: 9.8, label: 'In your data', caption: 'A library whose size or concentration was misjudged is simply over- or under-represented in the pool.' },
  ],
  draw(ctx, t, W, H, P) {
    const dim = 1 - 0.5 * sp(t, 9.8, 10.6);
    // ---- trace ----
    {
      const a = win(t, 0, 13.5, 0.4) * dim;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.grid; ctx.strokeRect(TX, TY, TW, TH); ctx.restore();
      AX.forEach(([l, u]) => { text(ctx, l, TX + TW * u, TY + TH + 14, { size: 10.5, color: P.inkDim, align: 'center', alpha: a }); line(ctx, TX + TW * u, TY + TH, TX + TW * u, TY + TH + 4, P.inkFaint, 1, a); });
      text(ctx, 'size (bp)', TX + TW / 2, TY + TH + 30, { size: 11, color: P.inkDim, align: 'center', alpha: a });
      text(ctx, 'fluorescence', TX - 6, TY + 10, { size: 10.5, color: P.inkDim, align: 'right', alpha: a });
      const reach = sp(t, 0.3, 4.2);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.dna; ctx.lineWidth = 2; ctx.beginPath();
      const n = 240;
      for (let i = 0; i <= n * reach; i++) { const u = i / n; const v = trace(u); const px = TX + TW * u, py = TY + TH - v * (TH - 20); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.restore();
      // callouts appear as the pen passes
      const cm = (bp, label, color, dy, alignRight) => {
        const u = bpU(bp); const ca = a * sp(reach, u - 0.02, u + 0.04);
        const px = TX + TW * u, py = TY + TH - trace(u) * (TH - 20);
        callout(ctx, label, px + (alignRight ? -8 : 8), py - dy, P, { alpha: ca, size: 11.5, color, to: [px, py - 4], align: alignRight ? 'right' : 'left' });
      };
      cm(25, 'lower marker', P.inkFaint, 30);
      cm(125, 'adapter dimer ≈ 125 bp', P.alert, 40);
      cm(450, 'library: insert + ~130 bp adapter', P.ink, 24);
      cm(950, 'bubble product (heteroduplex, harmless)', P.inkDim, 50, true);
      cm(1500, 'upper marker', P.inkFaint, 30, true);
      text(ctx, 'average size: 452 bp', TX + TW - 10, TY + TH - 16, { size: 12, color: P.ink, weight: 600, align: 'right', alpha: a * sp(t, 4.0, 4.5) });
    }
    // ---- quantify ----
    {
      const a = win(t, 4.6, 7.6, 0.5);
      if (a > 0) {
        const y = 400;
        // molecules: 3 with adapters, 1 dimer, 1 without adapters
        libraryMolecule(ctx, 170, y, 70, P, { alpha: a, adapterLen: 22 });
        libraryMolecule(ctx, 290, y, 50, P, { alpha: a, adapterLen: 22 });
        libraryMolecule(ctx, 400, y, 90, P, { alpha: a, adapterLen: 22 });
        dsFragment(ctx, 500, 560, y, { colorA: P.dna, colorB: P.dnaLight, alpha: a });     // no adapter
        libraryMolecule(ctx, 620, y, 0, P, { alpha: a, adapterLen: 22 });                     // dimer
        const g = sp(t, 5.2, 6.0);
        [170, 290, 400, 620].forEach(x => dot(ctx, x, y - 16, 4, P.good, a * g));
        text(ctx, 'qPCR (P5/P7 primers): counts clusterable molecules, including dimers', 90, y + 34, { size: 12, color: P.inkDim, alpha: a * g });
        const g2 = sp(t, 6.0, 6.8);
        [170, 290, 400, 530, 620].forEach(x => dot(ctx, x, y + 16, 4, P.gold, a * g2));
        text(ctx, 'Qubit: counts all dsDNA, adapters or not', 90, y + 54, { size: 12, color: P.inkDim, alpha: a * g2 });
        text(ctx, 'no adapters: never clusters', 530, y - 26, { size: 10.5, color: P.alert, align: 'center', alpha: a * g });
      }
    }
    // ---- molarity ----
    {
      const a = win(t, 7.4, 10.0, 0.5);
      if (a > 0) {
        const x = 700, y = 130;
        text(ctx, 'molarity', x, y, { size: 13, color: P.inkDim, alpha: a });
        text(ctx, 'nM =', x, y + 40, { size: 18, color: P.ink, alpha: a, mono: true });
        text(ctx, 'ng/µL × 10⁶', x + 60, y + 26, { size: 15, color: P.ink, alpha: a, mono: true });
        line(ctx, x + 58, y + 40, x + 230, y + 40, P.ink, 1.5, a);
        text(ctx, '660 × bp', x + 60, y + 56, { size: 15, color: P.ink, alpha: a, mono: true });
        const g = sp(t, 8.0, 8.8);
        text(ctx, '4.2 ng/µL,  452 bp', x, y + 100, { size: 13, color: P.inkDim, alpha: a * g, mono: true });
        text(ctx, '→ 14.1 nM', x, y + 124, { size: 16, color: P.ink, weight: 700, alpha: a * g, mono: true });
        text(ctx, 'dilute to 4 nM for pooling', x, y + 150, { size: 12, color: P.gold, alpha: a * sp(t, 8.8, 9.4), weight: 600 });
      }
    }
    // ---- uneven depth ----
    {
      const a = win(t, 9.9, 13.5, 0.6);
      if (a > 0) {
        const x0 = 110, y = 438;
        text(ctx, 'two libraries, same “4 nM” on paper', 480, 396, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        const rows = [
          { name: 'A: sized 450 bp (true 450)', w: 1.0, col: P.samples[0], note: 'on target' },
          { name: 'B: sized 700 bp (bubble product counted), true 450', w: 1.55, col: P.samples[1], note: '1.6× too many reads; its lane-mates got fewer' },
        ];
        rows.forEach((r, k) => {
          const g = sp(t, 10.4 + k * 0.5, 11.4 + k * 0.5);
          const yy = y + k * 46;
          text(ctx, r.name, x0, yy - 14, { size: 11.5, color: P.inkDim, alpha: a });
          ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = r.col; ctx.fillRect(x0, yy - 4, 300 * r.w * g, 14); ctx.restore();
          text(ctx, `${(28 * r.w * g).toFixed(0)} M reads`, x0 + 300 * r.w * g + 8, yy + 3, { size: 12, color: P.ink, alpha: a * g, mono: true });
          text(ctx, r.note, x0 + 300 * r.w * g + 100, yy + 3, { size: 11, color: k ? P.alert : P.good, alpha: a * sp(t, 11.6 + k * 0.4, 12.0 + k * 0.4) });
        });
        text(ctx, 'molarity underestimated → more volume pipetted → over-represented in the pool', 480, 524, { size: 11.5, color: P.inkDim, align: 'center', alpha: a * sp(t, 12.0, 12.5) });
      }
    }
  },
};
