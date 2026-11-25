// dUTP second strand: the strand that matches the RNA is marked with uracil
// and destroyed before PCR, which is why Read 1 is antisense to the transcript.
import { prog, sp, win, pulse, lerp, hash, text, callout, ssStrand, yAdapter, blob, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

const X0 = 250, X1 = 710, YR = 120, YC = 131;     // RNA (top) and first-strand cDNA (bottom)
const NICKS = [0.18, 0.37, 0.55, 0.74, 0.9];
const ux = u => lerp(X0, X1, u);

function uTicks(ctx, xa, xb, y, P, alpha) {
  if (alpha <= 0 || xb <= xa) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = P.gold; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = Math.ceil(xa / 14) * 14 + 4; x < xb; x += 14) { ctx.moveTo(x, y - 1); ctx.lineTo(x, y - 7); }
  ctx.stroke(); ctx.restore();
}

export default {
  id: 'second-strand',
  duration: 14,
  thumbT: 9.6,
  phases: [
    { t: 0, label: 'RNA:cDNA hybrid', caption: 'After first-strand synthesis each fragment is a hybrid: the original RNA paired with its antisense cDNA.' },
    { t: 2.4, label: 'Second strand with dUTP', caption: 'RNase H nicks the RNA; DNA polymerase I replaces it with DNA built from dUTP instead of dTTP, so this strand is marked with uracil.' },
    { t: 5.4, label: 'Adapters, then USER', caption: 'Adapters are ligated to the duplex; before PCR, USER enzyme destroys the uracil-marked strand, so only the first-strand cDNA is amplified.' },
    { t: 8.6, label: 'Which read is which', caption: 'The surviving strand is antisense to the transcript: Read 1 points against the gene, Read 2 with it. That is featureCounts -s 2, HTSeq reverse, Salmon ISR.' },
    { t: 11.4, label: 'The wrong flag', caption: 'Set the strand flag wrong and reads of overlapping or antisense genes are assigned to the other gene, or silently dropped as ambiguous.' },
  ],
  draw(ctx, t, W, H, P) {
    const top = 1 - 0.5 * sp(t, 8.6, 9.4);
    // ---- first strand cDNA (always present) ----
    const cDNAalpha = top;
    const endLab = top * (1 - sp(t, 5.6, 6.2));
    ssStrand(ctx, X0, YC, X1, YC, { color: P.dna, lw: 2.6, tickEvery: 9, tickLen: 5, side: -1, alpha: cDNAalpha });
    text(ctx, '3′', X0 - 16, YC + 2, { size: 11, color: P.inkDim, alpha: endLab });
    text(ctx, '5′', X1 + 10, YC + 2, { size: 11, color: P.inkDim, alpha: endLab });
    callout(ctx, 'first-strand cDNA (antisense)', X1 + 10, YC + 22, P, { alpha: top * win(t, 0.3, 8.6, 0.3), size: 11, color: P.dna, align: 'right' });

    // ---- RNA strand with nicks, replaced by dU second strand ----
    {
      const bounds = [0, ...NICKS, 1];
      for (let p = 0; p < bounds.length - 1; p++) {
        const u0 = bounds[p], u1 = bounds[p + 1];
        const xa = ux(u0) + (p ? 2 : 0), xb = ux(u1) - (p < bounds.length - 2 ? 2 : 0);
        // replacement progresses left to right within each segment, staggered
        const rep = sp(t, 3.4 + p * 0.35, 4.3 + p * 0.35);
        const nick = p ? sp(t, 2.6 + p * 0.1, 2.9 + p * 0.1) : 1;
        const gapL = p ? 2 * nick : 0;
        const xr = lerp(xa, xb, rep);
        // RNA remainder
        if (xr < xb) ssStrand(ctx, xr, YR, xb, YR, { color: P.rna, lw: 2.6, tickEvery: 9, tickLen: 5, side: 1, alpha: top });
        // new DNA strand (uracil marked), destroyed by USER later
        const user = sp(t, 7.2 + p * 0.2, 8.0 + p * 0.2);
        const da = top * (1 - user);
        if (xr > xa + 1) {
          ssStrand(ctx, xa + gapL, YR, xr, YR, { color: P.dna, lw: 2.6, tickEvery: 9, tickLen: 5, side: 1, alpha: da, dash: user > 0 ? [4, 3] : undefined });
          uTicks(ctx, xa + gapL, xr, YR, P, da);
        }
        // nick flash
        if (p) { const f = pulse(t, 2.6 + p * 0.1, 3.1 + p * 0.1); if (f > 0) dot(ctx, ux(u0), YR, 3 + 5 * f, P.gold, f * 0.9); }
        // polymerase at the replacement tip
        if (rep > 0 && rep < 1) blob(ctx, xr + 4, YR - 16, 11, P.enzyme, { seed: p + 2, alpha: top });
      }
      text(ctx, '5′', X0 - 16, YR - 2, { size: 11, color: P.inkDim, alpha: endLab });
      text(ctx, '3′', X1 + 10, YR - 2, { size: 11, color: P.inkDim, alpha: endLab });
      callout(ctx, 'RNA', X0, YR - 22, P, { alpha: top * win(t, 0.3, 3.6, 0.3), size: 11, color: P.rna });
      text(ctx, 'RNase H nicks the RNA', 480, 60, { size: 12, color: P.inkDim, align: 'center', alpha: top * win(t, 2.5, 3.6, 0.3) });
      text(ctx, 'DNA pol I: second strand = same sequence as the RNA, every T is a U', 480, 60, { size: 12, color: P.inkDim, align: 'center', alpha: top * win(t, 3.6, 5.4, 0.3) });
      // U legend
      const ul = top * win(t, 3.8, 7.2, 0.3);
      uTicks(ctx, 790, 815, YR - 2, P, ul);
      text(ctx, '= U (dUTP)', 821, YR - 6, { size: 10.5, color: P.gold, alpha: ul });
    }

    // ---- adapters + USER ----
    {
      const aa = top * win(t, 5.5, 14.5, 0.4);
      if (aa > 0) {
        const m = sp(t, 5.6, 6.5);
        yAdapter(ctx, lerp(X0 - 120, X0, m), 125.5, -1, P, { alpha: aa, scale: 0.95, arm: 26, lw: 2.2 });
        yAdapter(ctx, lerp(X1 + 120, X1, m), 125.5, +1, P, { alpha: aa, scale: 0.95, arm: 26, lw: 2.2 });
      }
      const ua = top * win(t, 6.9, 8.8, 0.4);
      if (ua > 0) {
        const m = sp(t, 7.0, 8.4);
        const bx = lerp(X0, X1, m);
        blob(ctx, bx, YR - 24, 12, P.enzyme, { seed: 11, alpha: ua, stroke: P.alert });
        text(ctx, 'USER enzyme (UDG + endonuclease)', bx + 18, YR - 28, { size: 11, color: P.inkDim, alpha: ua });
      }
      text(ctx, 'adapters ligate to the duplex', 480, 60, { size: 12, color: P.inkDim, align: 'center', alpha: top * win(t, 5.5, 6.9, 0.3) });
      text(ctx, 'the U-marked strand is destroyed before PCR: only the antisense strand is amplified', 480, 60, { size: 12, color: P.inkDim, align: 'center', alpha: top * win(t, 6.9, 8.8, 0.3) });
      text(ctx, 'half the strands are gone → a bit less complexity, a few more PCR cycles', 480, 186, { size: 11, color: P.inkDim, align: 'center', alpha: top * win(t, 7.9, 8.8, 0.3) });
    }

    // ---- phase 3: orientation ----
    {
      const a = win(t, 8.6, 14.5, 0.6);
      if (a > 0) {
        const y = 290, gx0 = 230, gx1 = 730;
        text(ctx, 'which read matches the transcript?', 90, 236, { size: 14, color: P.ink, weight: 600, alpha: a });
        // transcript arrow
        arrow(ctx, gx0, y, gx1, y, P.rna, { lw: 5, head: 12, alpha: a });
        text(ctx, 'transcript 5′→3′', gx0 - 10, y, { size: 11.5, color: P.rna, align: 'right', alpha: a });
        const r = sp(t, 9.0, 9.9);
        if (r > 0) {
          const r1x = 620, r2x = 330, L = 130 * r;
          arrow(ctx, r1x, y - 26, r1x - L, y - 26, P.p5, { lw: 3.5, head: 9, alpha: a });
          text(ctx, 'Read 1', r1x + 8, y - 26, { size: 11.5, color: P.p5, weight: 700, alpha: a });
          arrow(ctx, r2x, y + 26, r2x + L, y + 26, P.p7, { lw: 3.5, head: 9, alpha: a });
          text(ctx, 'Read 2', r2x - 8, y + 26, { size: 11.5, color: P.p7, weight: 700, align: 'right', alpha: a });
        }
        const la = a * win(t, 9.8, 14.5, 0.3);
        text(ctx, 'Read 1 antisense · Read 2 sense', 480, y + 58, { size: 12.5, color: P.ink, weight: 600, align: 'center', alpha: la });
        text(ctx, 'featureCounts -s 2  ·  HTSeq --stranded=reverse  ·  Salmon ISR / SR  ·  “fr-firststrand”', 480, y + 80, { size: 11.5, color: P.inkDim, align: 'center', alpha: la, mono: true });
        text(ctx, 'verify on a subsample: RSeQC infer_experiment.py or Salmon -l A', 480, y + 100, { size: 11, color: P.good, align: 'center', alpha: a * win(t, 10.6, 14.5, 0.3) });
      }
    }

    // ---- phase 4: wrong flag ----
    {
      const a = win(t, 11.4, 14.5, 0.6);
      if (a > 0) {
        const y = 450, x0 = 90;
        text(ctx, 'two genes overlapping on opposite strands', x0, 412, { size: 12.5, color: P.ink, weight: 600, alpha: a });
        arrow(ctx, 110, y, 330, y, P.dna, { lw: 4, head: 9, alpha: a });
        text(ctx, 'gene A', 114, y - 14, { size: 10.5, color: P.dna, alpha: a });
        arrow(ctx, 420, y + 18, 240, y + 18, P.dnaLight, { lw: 4, head: 9, alpha: a });
        text(ctx, 'gene B', 416, y + 32, { size: 10.5, color: P.dnaLight, align: 'right', alpha: a });
        ctx.save(); ctx.globalAlpha = a * 0.2; ctx.fillStyle = P.gold; ctx.fillRect(240, y - 10, 90, 36); ctx.restore();
        // mini table
        const tx = 520, rows = [
          ['-s 2  (correct)', 'A 1 200', 'B 340', P.good],
          ['-s 1  (flipped)', 'A 340', 'B 1 200', P.alert],
          ['-s 0  (unstranded)', 'overlap → ambiguous, dropped', '', P.alert],
        ];
        rows.forEach((r, k) => {
          const ra = a * win(t, 11.8 + k * 0.5, 14.5, 0.3);
          const yy = y - 10 + k * 22;
          text(ctx, r[0], tx, yy, { size: 11, color: P.inkDim, alpha: ra, mono: true });
          text(ctx, r[1], tx + 170, yy, { size: 11, color: r[3], alpha: ra, mono: true, weight: 600 });
          text(ctx, r[2], tx + 260, yy, { size: 11, color: r[3], alpha: ra, mono: true, weight: 600 });
        });
        text(ctx, 'symptom: a large “no feature / ambiguous” fraction, antisense genes swapped', tx, y + 62, { size: 10.5, color: P.inkDim, alpha: a * win(t, 13.0, 14.5, 0.3), maxWidth: 360 });
      }
    }
  },
};
