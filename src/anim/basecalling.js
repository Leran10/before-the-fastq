// Base calling: channel intensities per cycle -> base + Q; chastity filter;
// Q-score binning and what the FASTQ quality string ends up looking like.
import { prog, sp, win, pulse, lerp, hash, clamp, text, callout, line, dot, arrow, roundRect, baseRow, fakeSeq, withAlpha } from '../draw.js';

const BASES = 'ACGT';
const NCYC = 24;
const SEQ = fakeSeq(NCYC, 9);
const CYC_T0 = 0.6, CYC_DT = 0.26;      // cycle i is called at CYC_T0 + i*CYC_DT (phase 0-1 lasts ~7 s)

// Deterministic per-cycle intensities: the true base is bright, others dim,
// purity degrades with cycle (phasing).
function intensities(i) {
  const b = BASES.indexOf(SEQ[i]);
  const noise = 0.08 + 0.025 * i;            // grows with cycle
  const out = [];
  for (let k = 0; k < 4; k++) {
    const base = k === b ? 1 - 0.02 * i : 0;
    out.push(clamp(base + noise * (0.4 + hash(i * 4 + k, 31))));
  }
  return out;
}
function qOf(i) {
  const I = intensities(i).slice().sort((a, b) => b - a);
  const chastity = I[0] / (I[0] + I[1]);
  // map chastity 0.6..1 -> Q 10..40
  return Math.round(clamp((chastity - 0.6) / 0.4) * 30 + 10 - 4 * hash(i, 44));
}
// NovaSeq / NextSeq 2000 style bins as they appear in delivered FASTQs:
// '#' = Q2, ',' = Q11, ':' = Q25, 'F' = Q37
function binQ(q) { return q < 7 ? 2 : q < 20 ? 11 : q < 30 ? 25 : 37; }
const BINS = [2, 11, 25, 37];
const QCHAR = q => String.fromCharCode(33 + q);

export default {
  id: 'basecalling',
  duration: 14,
  thumbT: 4.6,
  phases: [
    { t: 0, label: 'Intensities → base', caption: 'Each cycle the software measures the signal of one cluster in each channel and calls the brightest channel as the base.' },
    { t: 3.4, label: 'Purity → Q score', caption: 'How much the winning channel dominates the runner-up sets the confidence: Phred Q = −10·log₁₀(error probability).' },
    { t: 7.2, label: 'Chastity filter', caption: 'Clusters whose first 25 cycles are not pure enough are flagged as not passing filter and never reach the FASTQ.' },
    { t: 10.0, label: 'Binned Q scores', caption: 'Modern instruments collapse ~40 possible Q values into a few bins, so the quality string uses only a handful of characters.' },
  ],
  draw(ctx, t, W, H, P) {
    const channelColors = [P.good, P.dna, P.ink, P.rna];     // A C G T: pedagogical, not vendor dyes
    const fade = 1 - prog(t, 9.6, 10.4);                      // phases 0-2 fade before binning

    if (fade > 0) {
      ctx.save(); ctx.globalAlpha = fade;
      // ----- left: the four-channel bar meter for the current cycle -----
      const cur = clamp(Math.floor((t - CYC_T0) / CYC_DT) + 1, 0, NCYC); // number of cycles called so far
      const curIdx = Math.max(0, cur - 1);
      const BX = 90, BY = 300, BWd = 36, BH = 150;
      text(ctx, `cycle ${Math.max(1, cur)}`, BX + 80, 96, { size: 14, color: P.ink, weight: 600, align: 'center' });
      text(ctx, 'one cluster, four channels', BX + 80, 116, { size: 11.5, color: P.inkDim, align: 'center' });
      const I = intensities(curIdx);
      const call = BASES.indexOf(SEQ[curIdx]);
      const phaseIn = sp(t, CYC_T0 + curIdx * CYC_DT - 0.2, CYC_T0 + curIdx * CYC_DT);
      for (let k = 0; k < 4; k++) {
        const x = BX + k * (BWd + 8);
        const h = BH * I[k] * phaseIn;
        ctx.fillStyle = withAlpha(channelColors[k], k === call ? 0.95 : 0.45);
        roundRect(ctx, x, BY - h, BWd, h, 3); ctx.fill();
        text(ctx, BASES[k], x + BWd / 2, BY + 14, { size: 13, color: channelColors[k], align: 'center', weight: 600 });
      }
      line(ctx, BX - 6, BY + 0.5, BX + 4 * (BWd + 8), BY + 0.5, P.inkFaint, 1);
      // winner highlight
      dot(ctx, BX + call * (BWd + 8) + BWd / 2, BY - BH * I[call] - 10, 4, P.gold, phaseIn);

      // ----- purity / Q readout (phase 1 on) -----
      const qa = win(t, 3.4, 10, 0.4);
      if (qa > 0) {
        const Is = I.slice().sort((a, b) => b - a);
        const ch = Is[0] / (Is[0] + Is[1]);
        const q = qOf(curIdx);
        text(ctx, `purity ${ch.toFixed(2)}  →  Q${q}`, BX + 80, 345, { size: 13, color: q >= 30 ? P.good : q >= 20 ? P.gold : P.alert, align: 'center', weight: 600, alpha: qa });
        text(ctx, 'Q30 = 1 error in 1000 · Q20 = 1 in 100', BX + 80, 366, { size: 11, color: P.inkDim, align: 'center', alpha: qa });
      }

      // ----- right: the read being assembled -----
      const RX = 330, RY0 = 110;
      text(ctx, 'read so far', RX, 96, { size: 12, color: P.inkDim });
      const step = 24;
      for (let i = 0; i < cur; i++) {
        const q = qOf(i);
        const col = channelColors[BASES.indexOf(SEQ[i])];
        const a = sp(t, CYC_T0 + i * CYC_DT, CYC_T0 + i * CYC_DT + 0.2);
        text(ctx, SEQ[i], RX + i * step, 124, { size: 16, color: col, align: 'center', mono: true, weight: 600, alpha: a });
        const qa2 = a * win(t, 3.4, 10, 0.4);
        // Q as a small bar under each base
        const hq = q * 1.3;
        ctx.save(); ctx.globalAlpha = qa2; ctx.fillStyle = withAlpha(q >= 30 ? P.good : q >= 20 ? P.gold : P.alert, 0.8);
        ctx.fillRect(RX + i * step - 6, 200 - hq, 12, hq); ctx.restore();
        text(ctx, String(q), RX + i * step, 212, { size: 9.5, color: P.inkDim, align: 'center', mono: true, alpha: qa2 });
      }
      line(ctx, RX - 14, 200.5, RX + NCYC * step, 200.5, P.inkFaint, 1, win(t, 3.4, 10, 0.4));
      text(ctx, 'Q', RX - 20, 180, { size: 10, color: P.inkDim, alpha: win(t, 3.4, 10, 0.4) });
      callout(ctx, 'signal purity falls with cycle (phasing) → Q declines toward the 3′ end', RX, 236, P, { size: 11.5, alpha: win(t, 5.6, 10, 0.4) });

      // ----- chastity filter (phase 2) -----
      const ca = win(t, 7.2, 10, 0.5);
      if (ca > 0) {
        const y0 = 300;
        text(ctx, 'chastity filter: first 25 cycles, no more than one cycle with purity < 0.6', RX, y0 - 22, { size: 12, color: P.ink, weight: 600, alpha: ca });
        const rows = [
          { label: 'cluster 1', pass: true, bad: [] },
          { label: 'cluster 2 (two molecules in one well)', pass: false, bad: [2, 5, 6, 9, 13, 14, 18] },
          { label: 'cluster 3', pass: true, bad: [11] },
        ];
        rows.forEach((r, ri) => {
          const y = y0 + ri * 40;
          const ra = ca * sp(t, 7.4 + ri * 0.4, 7.9 + ri * 0.4);
          for (let i = 0; i < 25; i++) {
            const bad = r.bad.includes(i);
            ctx.save(); ctx.globalAlpha = ra;
            ctx.fillStyle = bad ? P.alert : withAlpha(P.dna, 0.55);
            ctx.fillRect(RX + i * 15, y - 7, 12, 14); ctx.restore();
          }
          const verdict = sp(t, 8.6 + ri * 0.3, 9.0 + ri * 0.3) * ca;
          text(ctx, r.pass ? 'PF ✓' : 'not PF → dropped', RX + 25 * 15 + 10, y, { size: 12, color: r.pass ? P.good : P.alert, weight: 600, alpha: verdict });
          text(ctx, r.label, RX, y + 20, { size: 10.5, color: P.inkDim, alpha: ra });
        });
        text(ctx, 'the FASTQ you receive contains only PF clusters', RX, y0 + 3 * 40 + 6, { size: 11.5, color: P.inkDim, alpha: ca * sp(t, 9.2, 9.6) });
      }
      ctx.restore();
    }

    // ───────── phase 3: Q binning ─────────
    const ba = win(t, 10.0, 14.5, 0.5);
    if (ba > 0) {
      ctx.save(); ctx.globalAlpha = ba;
      const HX = 90, HY = 200, HW = 380, HH = 230;
      text(ctx, 'quality-score distribution of a run', HX, 96, { size: 14, color: P.ink, weight: 600 });
      const collapse = sp(t, 11.2, 12.6);
      // full-resolution histogram Q2..Q41: a lump near 36 with a tail
      const NB = 40;
      const full = [];
      for (let q = 2; q <= 41; q++) {
        const v = Math.exp(-0.5 * ((q - 35) / 5) ** 2) + 0.08 * Math.exp(-0.5 * ((q - 12) / 6) ** 2) + 0.03 * hash(q, 51);
        full.push(v);
      }
      const mx = Math.max(...full);
      const bw = HW / NB;
      // binned targets
      const binned = { 2: 0, 11: 0, 25: 0, 37: 0 };
      full.forEach((v, i) => { binned[binQ(i + 2)] += v; });
      const bmax = Math.max(...Object.values(binned));
      for (let i = 0; i < NB; i++) {
        const q = i + 2, bq = binQ(q);
        const x0 = HX + i * bw;
        const xT = HX + (bq - 2) * bw;              // bars slide to their bin's Q
        const x = lerp(x0, xT, collapse);
        const hFull = (full[i] / mx) * HH;
        const hBin = (binned[bq] / bmax) * HH;
        const h = lerp(hFull, hBin, collapse);
        const col = bq === 37 ? P.good : bq === 25 ? P.gold : P.alert;
        ctx.fillStyle = withAlpha(col, lerp(0.75, 0.35, collapse));
        ctx.fillRect(x, HY + HH - h, Math.max(1, bw - 1), h);
      }
      // bin overlays when collapsed
      if (collapse > 0.5) {
        BINS.forEach(bq => {
          const x = HX + (bq - 2) * bw; const h = (binned[bq] / bmax) * HH;
          const col = bq === 37 ? P.good : bq === 25 ? P.gold : P.alert;
          ctx.fillStyle = withAlpha(col, (collapse - 0.5) * 2);
          ctx.fillRect(x - bw, HY + HH - h, bw * 3, h);
          text(ctx, `Q${bq}`, x + bw / 2, HY + HH + 14, { size: 11, color: P.ink, align: 'center', weight: 600, alpha: (collapse - 0.5) * 2 });
        });
      }
      line(ctx, HX, HY + HH + 0.5, HX + HW, HY + HH + 0.5, P.inkFaint, 1);
      [2, 10, 20, 30, 40].forEach(q => text(ctx, String(q), HX + (q - 2) * bw + bw / 2, HY + HH + 28, { size: 10, color: P.inkDim, align: 'center', alpha: 1 - collapse }));
      text(ctx, collapse < 0.5 ? 'MiSeq / HiSeq 2500: ~40 distinct values' : 'NovaSeq / NextSeq 2000: 4 bins (2, 11, 25, 37)', HX, HY - 16, { size: 12, color: P.inkDim });

      // right: FASTQ record with quality string
      const FX = 520, FY = 130;
      text(ctx, 'what it looks like in the FASTQ', FX, 96, { size: 14, color: P.ink, weight: 600 });
      const seq = fakeSeq(34, 3);
      const qs = Array.from({ length: 34 }, (_, i) => Math.round(clamp(37 - i * 0.6 - 6 * hash(i, 61) * (i / 34), 2, 41)));
      text(ctx, '@A00123:45:HXYZ:1:1101:2345:1000 1:N:0:ACGT', FX, FY, { size: 11, color: P.inkDim, mono: true });
      baseRow(ctx, seq, FX + 4, FY + 22, { size: 11.5, step: 11.2, color: P.ink });
      text(ctx, '+', FX, FY + 44, { size: 11.5, color: P.inkDim, mono: true });
      const qfull = qs.map(QCHAR).join('');
      const qbin = qs.map(q => QCHAR(binQ(q))).join('');
      const showBin = collapse;
      // full-resolution string fades into binned string
      for (let i = 0; i < 34; i++) {
        const q = qs[i], qb = binQ(q);
        const colF = q >= 30 ? P.good : q >= 20 ? P.gold : P.alert;
        text(ctx, qfull[i], FX + 4 + i * 11.2, FY + 66, { size: 11.5, color: colF, align: 'center', mono: true, alpha: 1 - showBin });
        text(ctx, qbin[i], FX + 4 + i * 11.2, FY + 66, { size: 11.5, color: qb === 37 ? P.good : qb === 25 ? P.gold : P.alert, align: 'center', mono: true, alpha: showBin, weight: 700 });
      }
      text(ctx, 'Phred+33: character code = Q + 33', FX, FY + 92, { size: 11, color: P.inkDim });
      const legend = win(t, 12.4, 14.5, 0.4);
      text(ctx, 'F = Q37    : = Q25    , = Q11    # = Q2', FX, FY + 116, { size: 12, color: P.ink, mono: true, alpha: legend });
      text(ctx, 'only four characters in the whole file: binned, not corrupt', FX, FY + 140, { size: 12, color: P.inkDim, alpha: legend });
      text(ctx, 'Q is calibrated on average, not per read; Q-model tools and BQSR behave differently on binned data', FX, FY + 166, { size: 11, color: P.inkDim, alpha: legend, maxWidth: 400 });
      ctx.restore();
    }
  },
};
