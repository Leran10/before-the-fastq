// Computational step: the target BED and its padding decide which reads count;
// HsMetrics summarise on-target fraction, evenness (FOLD_80), dropouts and
// deduplicated depth; off-target reads are an accidental low-pass genome.
import { prog, sp, win, lerp, hash, text, dot, line, arrow, roundRect, panelTitle, footnote, curve, withAlpha } from '../draw.js';

const GX0 = 80, GX1 = 880, GY = 165;            // genome line
const PAD = 14;                                 // padding width in px either side
// targets along the genome (x0, x1 in px); index 2 is the GC-rich first exon that drops out
const TG = [[140, 200], [262, 330], [400, 438], [520, 600], [660, 720], [770, 840]];
const GC_IDX = 2;

// reads: deterministic placement. kind: 0 on-target, 1 padding, 2 off-target
const READS = [];
(() => {
  let i = 0;
  TG.forEach((tg, k) => {
    const n = k === GC_IDX ? 0 : 9 + Math.floor(hash(k, 5) * 4);
    for (let j = 0; j < n; j++, i++) {
      const w = 26; const x = tg[0] - 6 + hash(i, 6) * (tg[1] - tg[0] - w + 12);
      READS.push({ x, w, row: j % 5, kind: 0, i });
    }
    // padding reads
    if (k !== GC_IDX) for (let j = 0; j < 2; j++, i++) {
      const side = j ? 1 : -1; const w = 24;
      const x = side < 0 ? tg[0] - PAD - w + 10 : tg[1] + PAD - 10;
      READS.push({ x, w, row: 5 + j, kind: 1, i });
    }
  });
  // off-target reads scattered between targets
  for (let j = 0; j < 16; j++, i++) {
    const w = 24; let x;
    do { x = GX0 + 10 + hash(i, 7) * (GX1 - GX0 - 40); i += 97; } while (TG.some(tg => x + w > tg[0] - PAD - 4 && x < tg[1] + PAD + 4));
    READS.push({ x, w, row: j % 3, kind: 2, i: j });
  }
})();

// per-target coverage (relative to mean=1), one zero
const COV = [1.15, 0.9, 0, 1.3, 0.7, 1.05];

export default {
  id: 'on-target-metrics',
  duration: 16,
  thumbT: 6.6,
  phases: [
    { t: 0, label: 'Targets and padding', caption: 'An interval file defines the experiment: target regions plus the padding applied around them. Two pipelines with different padding report different coverage and different variants from the same BAM.' },
    { t: 2.6, label: 'Which reads count', caption: 'Reads are classified against the intervals: on target, in the padding, or off target. PCT_SELECTED_BASES is the on-plus-near fraction; the rest is still in the file, just not in the metrics.' },
    { t: 5.4, label: 'Evenness and dropout', caption: 'Per-target coverage follows probe efficiency. FOLD_80_BASE_PENALTY is mean over the 20th percentile; a GC-rich first exon with zero coverage is a design or capture gap, not a deletion.' },
    { t: 8.2, label: 'Duplicates first', caption: 'Depth is computed after duplicate marking. Raw depth counts PCR copies; deduplicated depth counts molecules, and that is the number that sets allele-fraction noise.' },
    { t: 10.6, label: 'Off-target = low-pass genome', caption: 'The off-target reads form a sparse 0.1–2× genome-wide layer: good for sex checks, contamination estimates and coarse CNV, not for genotypes.' },
    { t: 13, label: 'HsMetrics, and viral capture', caption: 'The summary table decides what the data can support. In viral capture, breadth mixes titre with divergence from the probes; absence means only that nothing hybridised.' },
  ],
  draw(ctx, t, W, H, P) {
    const padA = sp(t, 0.8, 1.6);
    const readsIn = sp(t, 2.8, 4.2);
    const classA = sp(t, 4.2, 4.9);
    const covA = sp(t, 5.6, 6.4);
    const dedup = sp(t, 8.6, 9.6);
    const lowA = sp(t, 10.8, 11.6);
    const sceneA = 1 - sp(t, 12.8, 13.4);
    const tabA = sp(t, 13.4, 14.0);

    if (sceneA > 0) {
      ctx.save(); ctx.globalAlpha *= sceneA;
      panelTitle(ctx, 'What the interval file does to a BAM', W, P);

      // genome line + targets + padding
      line(ctx, GX0, GY, GX1, GY, P.inkFaint, 2);
      TG.forEach((tg, k) => {
        ctx.save(); ctx.globalAlpha *= padA; ctx.fillStyle = P.goodDim;
        ctx.fillRect(tg[0] - PAD, GY - 7, PAD, 14); ctx.fillRect(tg[1], GY - 7, PAD, 14); ctx.restore();
        ctx.fillStyle = P.good; ctx.fillRect(tg[0], GY - 9, tg[1] - tg[0], 18);
      });
      text(ctx, 'target BED', GX0, GY - 26, { size: 12, color: P.good, weight: 600 });
      text(ctx, 'padding ±100 bp', TG[0][1] + PAD + 6, GY - 26, { size: 11.5, color: P.inkDim, alpha: padA });
      text(ctx, 'GC-rich exon 1', (TG[GC_IDX][0] + TG[GC_IDX][1]) / 2, GY - 26, { size: 11, color: P.inkDim, align: 'center', alpha: win(t, 0.6, 12.8, 0.3) });

      // reads landing below the line
      const colFor = k => k === 0 ? P.dna : k === 1 ? P.dna : P.dnaDim;
      READS.forEach((r, n) => {
        const d = hash(r.i, 9) * 0.5;
        const u = prog(readsIn, d * 0.6, d * 0.6 + 0.4);
        if (u <= 0) return;
        // off-target reads move down to the low-pass track in the last scene
        const yRest = GY + 22 + r.row * 10;
        const y = lerp(-20, yRest, u) + (r.kind === 2 ? lowA * (400 - yRest) : 0);
        const dupFade = (r.kind === 0 && r.row >= 3) ? 1 - dedup : 1;   // top rows vanish at dedup
        const a = u * (r.kind === 1 ? 0.75 : 1) * dupFade * (r.kind === 2 && covA > 0 && lowA === 0 ? 0.5 : 1);
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = colFor(r.kind);
        if (r.kind === 1) ctx.globalAlpha *= 0.8;
        roundRect(ctx, r.x, y - 3, r.w, 6, 2); ctx.fill();
        if (r.kind === 0 && r.row >= 3 && dedup > 0 && dedup < 1) { ctx.strokeStyle = P.alert; ctx.lineWidth = 1; roundRect(ctx, r.x - 1, y - 4, r.w + 2, 8, 3); ctx.stroke(); }
        ctx.restore();
      });

      // classification counts
      {
        const a = classA * (1 - lowA);
        const y0 = 262;
        const items = [['on target', '66 %', P.dna], ['padding (near)', '6 %', P.dna], ['off target', '28 %', P.dnaDim]];
        items.forEach(([lab, v, c], k) => {
          const x = 100 + k * 190;
          ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = c; roundRect(ctx, x, y0 - 4, 20, 8, 2); ctx.fill(); ctx.restore();
          text(ctx, `${lab}  ${v}`, x + 28, y0, { size: 12.5, color: P.ink, alpha: a, mono: false });
        });
        text(ctx, 'PCT_SELECTED_BASES = 0.72', 690, y0, { size: 12.5, color: P.ink, mono: true, alpha: a });
      }

      // coverage per target
      {
        const a = covA * (1 - lowA);
        const cy = 440, ch = 120;
        const meanY = cy - ch * 0.5, p20Y = cy - ch * 0.5 * 0.7;
        text(ctx, 'coverage per target (after duplicates are marked)', GX0, cy - ch - 22, { size: 12, color: P.inkDim, alpha: a });
        TG.forEach((tg, k) => {
          const v = COV[k] * 0.5 * (1 - 0.47 * dedup);     // dedup halves depth
          const hgt = ch * v * sp(covA, 0.1 + k * 0.1, 0.5 + k * 0.1);
          ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = k === GC_IDX ? P.alert : P.dna;
          if (k === GC_IDX) { ctx.fillRect(tg[0], cy - 3, tg[1] - tg[0], 3); }
          else ctx.fillRect(tg[0], cy - hgt, tg[1] - tg[0], hgt);
          ctx.restore();
        });
        line(ctx, GX0, cy, GX1, cy, P.inkFaint, 1, a);
        const shrink = 1 - 0.47 * dedup;
        const my = cy - ch * 0.5 * shrink, py = cy - ch * 0.5 * 0.7 * shrink;
        line(ctx, GX0, my, GX1, my, P.inkDim, 1, a * 0.9, [4, 4]);
        line(ctx, GX0, py, GX1, py, P.gold, 1.2, a * 0.9, [4, 4]);
        text(ctx, dedup > 0.5 ? 'mean 95×' : 'mean 180×', GX1 + 4, my, { size: 11, color: P.inkDim, alpha: a });
        text(ctx, '20th pct', GX1 + 4, py + 10, { size: 11, color: P.gold, alpha: a });
        text(ctx, 'zero coverage', (TG[GC_IDX][0] + TG[GC_IDX][1]) / 2, cy - 16, { size: 11.5, color: P.alert, align: 'center', alpha: a });
        text(ctx, 'FOLD_80_BASE_PENALTY = mean / p20 ≈ 2.1', GX0, cy + 22, { size: 12.5, color: P.ink, mono: true, alpha: a });
        // dedup narration
        const da = sp(t, 8.4, 8.9) * (1 - lowA);
        text(ctx, dedup < 1 ? 'MarkDuplicates: raw 180× → ' : 'MarkDuplicates: raw 180× → 95× unique molecules', 540, cy + 22, { size: 12.5, color: P.alert, mono: true, alpha: da });
        if (dedup >= 1) {/* text above covers */} else if (dedup > 0) text(ctx, `${Math.round(lerp(180, 95, dedup))}×`, 540 + 236, cy + 22, { size: 12.5, color: P.alert, mono: true, alpha: da });
      }

      // low-pass genome layer
      {
        const a = lowA;
        if (a > 0) {
          const ly = 430;
          line(ctx, GX0, ly + 12, GX1, ly + 12, P.inkFaint, 2, a);
          // sparse dots along a whole-genome bar
          for (let i = 0; i < 60; i++) { const x = GX0 + 8 + hash(i, 21) * (GX1 - GX0 - 16); dot(ctx, x, ly + 12, 2.6, P.dna, a * (0.4 + 0.6 * hash(i, 22))); }
          text(ctx, 'off-target reads, re-read as a genome-wide 0.1–2× layer', GX0, ly - 14, { size: 12.5, color: P.ink, alpha: a });
          text(ctx, 'sex check · contamination (VerifyBamID) · coarse CNV  — not genotypes', GX0, ly + 36, { size: 12, color: P.inkDim, alpha: a });
          // dim the targets
        }
      }
      ctx.restore();
    }

    // ───────────────────────── HsMetrics table + viral inset ─────────────────────────
    if (tabA > 0) {
      ctx.save(); ctx.globalAlpha *= tabA;
      ctx.fillStyle = withAlpha(P.bg, 0.94); ctx.fillRect(0, 0, W, H);
      panelTitle(ctx, 'CollectHsMetrics decides what the data can support', W, P);
      const rows = [
        ['PCT_SELECTED_BASES', '0.72', P.good],
        ['MEAN_TARGET_COVERAGE', '95 (dedup)', P.ink],
        ['PCT_TARGET_BASES_30X', '0.91', P.good],
        ['FOLD_80_BASE_PENALTY', '2.1', P.ink],
        ['ZERO_CVG_TARGETS_PCT', '1.8 %', P.alert],
        ['GC_DROPOUT', '3.4', P.alert],
      ];
      const tx = 70, ty = 100;
      ctx.save(); ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; roundRect(ctx, tx - 10, ty - 12, 400, rows.length * 40 + 30, 8); ctx.stroke(); ctx.restore();
      rows.forEach(([k, v, c], i) => {
        const a = sp(t, 13.6 + i * 0.15, 13.9 + i * 0.15);
        text(ctx, k, tx, ty + 10 + i * 40, { size: 13, color: P.inkDim, mono: true, alpha: a });
        text(ctx, v, tx + 370, ty + 10 + i * 40, { size: 14, color: c, mono: true, align: 'right', weight: 600, alpha: a });
      });
      text(ctx, 'per sample, per batch; keep the BED under version control', tx, ty + rows.length * 40 + 44, { size: 11.5, color: P.inkDim, alpha: sp(t, 14.4, 14.8) });

      // viral capture inset
      const vx = 520, vy = 110, vw = 360;
      const va = sp(t, 14.2, 14.9);
      text(ctx, 'viral capture', vx, vy - 10, { size: 13, color: P.ink, weight: 600, alpha: va });
      // host reads: a tall grey block
      ctx.save(); ctx.globalAlpha *= va;
      ctx.fillStyle = P.enzymeDim; ctx.fillRect(vx, vy + 10, 70, 230);
      text(ctx, 'host', vx + 35, vy + 256, { size: 11.5, color: P.inkDim, align: 'center' });
      text(ctx, '97 %', vx + 35, vy + 125, { size: 12, color: P.inkDim, align: 'center', mono: true });
      // viral genome with coverage that fades in a divergent region
      const gx = vx + 100, gw = vw - 100, gy = vy + 240;
      line(ctx, gx, gy, gx + gw, gy, P.inkFaint, 2);
      text(ctx, 'viral genome', gx, gy + 16, { size: 11.5, color: P.inkDim });
      curve(ctx, gx, gy - 170, gw, 170, u => {
        const base = 0.75 + 0.1 * Math.sin(u * 12);
        const div = Math.exp(-Math.pow((u - 0.62) / 0.11, 2));   // divergent region
        return base * (1 - 0.97 * div);
      }, P.dna, { lw: 2, fill: true });
      ctx.restore();
      const dxp = gx + gw * 0.62;
      text(ctx, 'divergent from the probes', dxp, gy - 182, { size: 11.5, color: P.alert, align: 'center', alpha: va });
      arrow(ctx, dxp, gy - 172, dxp, gy - 20, P.alert, { lw: 1.2, alpha: va * 0.8 });
      text(ctx, 'high depth on the covered part: divergence, not low titre', vx, vy + 282, { size: 11.5, color: P.inkDim, alpha: va, maxWidth: 360 });
      footnote(ctx, 'Absence means “not captured”, unless the probe set covers it.', W, H, P, sp(t, 14.8, 15.4));
      ctx.restore();
    }
  },
};
