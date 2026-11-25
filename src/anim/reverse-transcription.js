// First-strand cDNA: random hexamers anneal unevenly, reverse transcriptase
// extends them; the priming bias shows up at read starts and in coverage.
import { prog, sp, win, pulse, lerp, hash, text, callout, ssStrand, blob, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

const RX0 = 180, RX1 = 780, RY = 190;          // RNA strand
const HEX = 20;                                 // hexamer length in px
// annealing sites along the RNA (fraction), with the time each lands
const SITES = [
  { u: 0.09, t: 2.9 }, { u: 0.3, t: 3.2 }, { u: 0.34, t: 3.9 }, { u: 0.56, t: 3.0 }, { u: 0.6, t: 3.5 }, { u: 0.64, t: 4.4 }, { u: 0.83, t: 4.1 }, { u: 0.96, t: 4.8 },
];
// failed attempts: hexamers that bounce off
const MISS = [{ u: 0.2, t: 3.3 }, { u: 0.45, t: 3.8 }, { u: 0.74, t: 4.3 }];
const ux = u => lerp(RX0, RX1, u);

export default {
  id: 'reverse-transcription',
  duration: 13,
  thumbT: 7.2,
  phases: [
    { t: 0, label: 'RNA fragment', caption: 'Each fragmented RNA molecule is a single strand with a 5′ and a 3′ end.' },
    { t: 2.6, label: 'Random hexamers anneal', caption: 'Short random primers bind where they fit; some sequences are favoured, others rarely primed.' },
    { t: 5.6, label: 'Reverse transcriptase extends', caption: 'The enzyme copies RNA into DNA, building each cDNA strand 5′→3′ toward the RNA’s 5′ end until it hits the next primer.' },
    { t: 9, label: 'In your data', caption: 'The first ~12 bases of Read 1 have a skewed composition (expected, not an error) and coverage within a transcript is bumpy but reproducible.' },
  ],
  draw(ctx, t, W, H, P) {
    const dim = 1 - 0.45 * sp(t, 9.0, 9.8);
    // ---- RNA ----
    ssStrand(ctx, RX0, RY, RX1, RY, { color: P.rna, lw: 2.6, tickEvery: 9, tickLen: 5, side: -1, alpha: dim });
    text(ctx, '5′', RX0 - 16, RY, { size: 11, color: P.inkDim, alpha: dim });
    text(ctx, '3′', RX1 + 10, RY, { size: 11, color: P.inkDim, alpha: dim });
    text(ctx, 'RNA fragment', RX0, RY - 40, { size: 14, color: P.ink, weight: 600, alpha: dim * win(t, 0.2, 2.8, 0.3) });
    callout(ctx, 'RNA', RX0, RY - 24, P, { alpha: dim * win(t, 2.8, 14, 0.3), size: 11, color: P.rna });

    // ---- hexamers ----
    const sorted = SITES;
    sorted.forEach((s, i) => {
      const land = sp(t, s.t - 0.7, s.t);
      if (land <= 0) return;
      const x = ux(s.u), y = lerp(RY - 90, RY + 9, land);
      ssStrand(ctx, x, y, x + HEX, y, { color: P.dna, lw: 2.4, tickEvery: 6, tickLen: 3, side: -1, alpha: dim });
      if (land >= 1 && t < 6) { const f = pulse(t, s.t, s.t + 0.4); if (f > 0) dot(ctx, x + HEX / 2, RY + 4, 4 + 5 * f, P.gold, f * 0.8); }
    });
    MISS.forEach(m => {
      const a = win(t, m.t - 0.6, m.t + 0.6, 0.15);
      if (a <= 0) return;
      const p = prog(t, m.t - 0.6, m.t + 0.6);
      const y = RY - 90 + 95 * Math.sin(p * Math.PI);
      const x = ux(m.u) + (p > 0.5 ? (p - 0.5) * 40 : 0);
      ssStrand(ctx, x, y, x + HEX, y, { color: P.dnaDim, lw: 2.2, tickEvery: 6, tickLen: 3, side: -1, alpha: a * dim });
    });
    text(ctx, 'random hexamers (N₆)', 500, RY - 70, { size: 12, color: P.dna, align: 'center', alpha: dim * win(t, 2.8, 5.6, 0.4) });
    text(ctx, 'favoured sites get primed again and again; others almost never', 500, RY + 60, { size: 11.5, color: P.inkDim, align: 'center', alpha: dim * win(t, 3.8, 5.8, 0.4) });

    // ---- extension ----
    {
      // extension from each primer leftwards to the previous primer (or RNA start)
      sorted.forEach((s, i) => {
        const start = ux(s.u);
        const stop = i === 0 ? RX0 : ux(sorted[i - 1].u) + HEX + 1;
        const e = sp(t, 5.8 + i * 0.32, 6.9 + i * 0.32);
        if (e <= 0) return;
        const tip = lerp(start, stop, e);
        ssStrand(ctx, tip, RY + 9, start, RY + 9, { color: P.dna, lw: 2.4, tickEvery: 6, tickLen: 3, side: -1, alpha: dim });
        if (e > 0 && e < 1) {
          blob(ctx, tip - 4, RY + 22, 12, P.enzyme, { seed: i + 1, alpha: dim });
        }
      });
      const ra = dim * win(t, 5.8, 9.2, 0.4);
      text(ctx, 'reverse transcriptase', 500, RY + 86, { size: 12, color: P.inkDim, align: 'center', alpha: ra });
      arrow(ctx, 560, RY + 62, 500, RY + 62, P.dna, { lw: 1.5, head: 6, alpha: ra });
      text(ctx, 'cDNA grows 5′→3′, toward the RNA 5′ end', 568, RY + 62, { size: 11, color: P.dna, alpha: ra });
      text(ctx, 'each cDNA ends where it runs into the next primer: the read starts are where hexamers bound', 500, RY + 110, { size: 11.5, color: P.inkDim, align: 'center', alpha: dim * win(t, 7.4, 9.2, 0.4) });
    }

    // ---- phase 3: plots ----
    {
      const a = win(t, 9.0, 13.5, 0.6);
      if (a <= 0) return;
      // left: per-base composition
      const x = 90, y = 330, w = 340, h = 140;
      text(ctx, 'per-base sequence content (FastQC), Read 1', x, y - 16, { size: 12.5, color: P.ink, weight: 600, alpha: a });
      line(ctx, x, y + h + 0.5, x + w, y + h + 0.5, P.inkFaint, 1, a);
      line(ctx, x + 0.5, y, x + 0.5, y + h, P.inkFaint, 1, a);
      text(ctx, '1', x, y + h + 13, { size: 10.5, color: P.inkDim, alpha: a });
      text(ctx, '12', x + w * 12 / 50, y + h + 13, { size: 10.5, color: P.inkDim, align: 'center', alpha: a });
      text(ctx, '50  position', x + w, y + h + 13, { size: 10.5, color: P.inkDim, align: 'right', alpha: a });
      text(ctx, '%', x - 8, y, { size: 10.5, color: P.inkDim, align: 'right', alpha: a });
      const rev = sp(t, 9.3, 10.6);
      ctx.save(); ctx.globalAlpha = a * 0.25; ctx.fillStyle = P.gold; ctx.fillRect(x, y, w * 12 / 50, h); ctx.restore();
      ['A', 'C', 'G', 'T'].forEach((b, bi) => {
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.samples[bi]; ctx.lineWidth = 2; ctx.beginPath();
        for (let p = 0; p < 50; p++) {
          if (p / 49 > rev) break;
          const decay = Math.exp(-p / 4.5);
          const v = 25 + (hash(p, bi * 13 + 2) - 0.5) * 36 * decay + (hash(p, bi * 3 + 50) - 0.5) * 1.5;
          const px = x + (p / 49) * w, py = y + h - (v / 50) * h;
          p ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke(); ctx.restore();
        text(ctx, b, x + w + 8 + bi * 14, y + 10, { size: 11, color: P.samples[bi], weight: 700, alpha: a });
      });
      text(ctx, 'skew over the first ~12 bases: priming bias, expected; do not trim it away', x, y + h + 34, { size: 11, color: P.good, alpha: a * win(t, 10.4, 13.5, 0.4), maxWidth: 360 });

      // right: coverage within a transcript, two samples
      const x2 = 560, w2 = 330;
      text(ctx, 'coverage along one transcript', x2, y - 16, { size: 12.5, color: P.ink, weight: 600, alpha: a });
      line(ctx, x2, y + h + 0.5, x2 + w2, y + h + 0.5, P.inkFaint, 1, a);
      text(ctx, '5′', x2, y + h + 13, { size: 10.5, color: P.inkDim, alpha: a });
      text(ctx, '3′', x2 + w2, y + h + 13, { size: 10.5, color: P.inkDim, align: 'right', alpha: a });
      const rev2 = sp(t, 10.0, 11.4);
      const bump = u => { let v = 0.35; SITES.forEach(s => { v += 0.42 * Math.exp(-((u - s.u) ** 2) / 0.0025); }); return Math.min(1, v); };
      [[P.dna, 0, 'sample 1'], [P.dnaLight, 1, 'sample 2']].forEach(([c, k, lab]) => {
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.beginPath();
        for (let i = 0; i <= 160; i++) { const u = i / 160; if (u > rev2) break; const v = bump(u) * (1 - 0.06 * k) + (hash(i, 9 + k) - 0.5) * 0.04; i ? ctx.lineTo(x2 + u * w2, y + h - v * h) : ctx.moveTo(x2 + u * w2, y + h - v * h); }
        ctx.stroke(); ctx.restore();
        text(ctx, lab, x2 + w2 - 4, y + 12 + k * 15, { size: 11, color: c, align: 'right', alpha: a });
      });
      text(ctx, 'bumps at the priming sites, the same in every sample: bias, not splicing', x2, y + h + 34, { size: 11, color: P.inkDim, alpha: a * win(t, 11.2, 13.5, 0.4), maxWidth: 340 });
    }
  },
};
