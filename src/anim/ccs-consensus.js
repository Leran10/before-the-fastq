// Circular consensus: subreads from one ZMW are aligned and voted into one
// HiFi read; quality vs passes; the residual homopolymer indel; the BAM record.
import { prog, sp, win, pulse, lerp, hash, clamp, text, callout, dot, line, arrow, roundRect, curve, baseRow, withAlpha } from '../draw.js';

const NSUB = 8;
const SUBS = [];
for (let k = 0; k < NSUB; k++) {
  const errs = [];
  for (let e = 0; e < 3; e++) errs.push(0.05 + 0.9 * hash(k * 7 + e, 13));
  SUBS.push({ k, fwd: k % 2 === 0, len: k === 0 ? 0.55 : k === NSUB - 1 ? 0.7 : 1, start: k === 0 ? 0.45 : 0, errs, jit: (hash(k, 5) - 0.5) * 24 });
}
const SX = 120, SW = 720;                   // subread bar span
const PY0 = 96, PGAP = 42;                 // stacked positions
const AY0 = 150, AGAP = 26;                 // aligned pile

export default {
  id: 'ccs-consensus',
  duration: 13,
  thumbT: 4.6,
  phases: [
    { t: 0, label: 'Subreads from one ZMW', caption: 'One well, one molecule, many passes: each subread is the same insert read again, alternating strands, with its own random errors.' },
    { t: 3, label: 'Align and vote', caption: 'The passes are aligned to each other. Errors fall at different places in each pass, so the majority is right at almost every position: that majority is the HiFi read.' },
    { t: 6, label: 'Quality vs passes', caption: 'Predicted accuracy rises with the number of passes and plateaus around Q30–Q40. A read with at least three passes and rq ≥ 0.99 (Q20) is a HiFi read.' },
    { t: 9, label: 'What is left', caption: 'Residual errors are mostly single-base indels in homopolymer runs, because every pass tends to miscount the same run the same way.' },
    { t: 11.5, label: 'The record', caption: 'HiFi reads are delivered in an unaligned BAM with per-read quality, pass count and, optionally, CpG methylation tags. There was no PCR, so there are no duplicates to mark.' },
  ],
  draw(ctx, t, W, H, P) {
    // ───── scenes A/B: subreads → pile (0 – 9.2) ─────
    const aAB = win(t, 0, 6.6, 0.5);
    const al = sp(t, 3.2, 4.6);        // align
    if (aAB > 0) {
      SUBS.forEach(s => {
        const show = aAB * sp(t, 0.2 + s.k * 0.18, 0.6 + s.k * 0.18);
        if (show <= 0) return;
        const y = lerp(PY0 + s.k * PGAP, AY0 + s.k * AGAP, al);
        const xoff = lerp(s.jit, 0, al);
        const x0 = SX + xoff + s.start * SW, x1 = x0 + s.len * SW;
        // adapter stub at the start of each pass
        ctx.save(); ctx.globalAlpha *= show;
        ctx.fillStyle = P.enzyme; ctx.fillRect(s.fwd ? x0 - 12 : x1 + 2, y - 5, 10, 10);
        ctx.fillStyle = s.fwd ? P.dna : P.dnaLight; ctx.fillRect(x0, y - 5, x1 - x0, 10);
        ctx.restore();
        arrow(ctx, s.fwd ? x0 + 6 : x1 - 6, y, s.fwd ? x1 - 8 : x0 + 8, y, P.panel, { lw: 1.5, head: 6, alpha: show * 0.9 });
        s.errs.forEach((e, j) => { const ex = x0 + (x1 - x0) * e; line(ctx, ex, y - 7, ex, y + 7, P.alert, 2, show); });
        text(ctx, `pass ${s.k + 1}`, SX - 20, y, { size: 10.5, color: P.inkDim, align: 'right', alpha: show * (1 - al) });
      });
      // consensus row
      const ca = aAB * sp(t, 4.1, 4.7);
      if (ca > 0) {
        const y = AY0 + NSUB * AGAP + 10;
        ctx.save(); ctx.globalAlpha *= ca; ctx.fillStyle = P.gold; ctx.fillRect(SX, y - 6, SW, 12); ctx.restore();
        text(ctx, 'consensus (HiFi read)', SX, y + 20, { size: 12, color: P.gold, weight: 600, alpha: ca });
        text(ctx, 'errors land at different positions in each pass → they do not vote together', SX, y + 42, { size: 12, color: P.inkDim, alpha: ca * sp(t, 4.6, 5.2) });
      }
      text(ctx, 'one ZMW, eight passes over one 15 kb molecule', SX, 60, { size: 13, color: P.ink, weight: 600, alpha: aAB * win(t, 0.3, 3.2, 0.3) });
      text(ctx, 'blue = insert strand, light = other strand, grey = adapter, red = raw error (~10 %)', SX, 84, { size: 11.5, color: P.inkDim, alpha: aAB * win(t, 1.4, 3.2, 0.3), maxWidth: 460 });
      text(ctx, 'align the passes to each other and vote', SX, 60, { size: 13, color: P.ink, weight: 600, alpha: aAB * win(t, 3.2, 6.0, 0.3) });
    }

    // ───── scene C: quality vs passes (6 – 9.4) ─────
    const aC = win(t, 6.0, 9.4, 0.5);
    if (aC > 0) {
      const X = 200, Y = 110, Wp = 560, Hp = 300;
      text(ctx, 'predicted read quality vs passes', X, 80, { size: 13, color: P.ink, weight: 600, alpha: aC });
      line(ctx, X, Y + Hp + 0.5, X + Wp, Y + Hp + 0.5, P.inkFaint, 1, aC);
      line(ctx, X + 0.5, Y, X + 0.5, Y + Hp, P.inkFaint, 1, aC);
      [0, 5, 10, 15, 20].forEach(p => { const x = X + Wp * p / 20; text(ctx, String(p), x, Y + Hp + 14, { size: 10.5, color: P.inkDim, align: 'center', alpha: aC }); });
      text(ctx, 'passes (np)', X + Wp / 2, Y + Hp + 32, { size: 11.5, color: P.inkDim, align: 'center', alpha: aC });
      [10, 20, 30, 40].forEach(q => { const y = Y + Hp - Hp * q / 45; text(ctx, `Q${q}`, X - 8, y, { size: 10.5, color: P.inkDim, align: 'right', alpha: aC }); });
      const g = sp(t, 6.3, 7.4);
      const qOf = p => 42 * (1 - Math.exp(-p / 4.5));
      curve(ctx, X, Y, Wp, Hp, u => (u <= g ? qOf(u * 20) / 45 : qOf(g * 20) / 45), P.dna, { lw: 2.5, alpha: aC });
      // Q20 threshold
      const yq = Y + Hp - Hp * 20 / 45;
      line(ctx, X, yq, X + Wp, yq, P.gold, 1.5, aC * sp(t, 7.0, 7.5), [5, 4]);
      text(ctx, 'HiFi: ≥ 3 passes and rq ≥ 0.99 (Q20)', X + Wp, yq + 14, { size: 11, color: P.gold, align: 'right', alpha: aC * sp(t, 7.0, 7.5) });
      // two example reads
      const ex = [[12, '15 kb insert, 12 passes', P.good, 0], [4, '30 kb insert, 4 passes: less polished', P.alert, 1]];
      ex.forEach(([p, l, c, k]) => {
        const a = aC * sp(t, 7.6 + k * 0.5, 8.0 + k * 0.5);
        const x = X + Wp * p / 20, y = Y + Hp - Hp * qOf(p) / 45;
        dot(ctx, x, y, 5, c, a);
        text(ctx, l, x + 12, y + 18, { size: 10.5, color: c, alpha: a });
      });
      text(ctx, 'quality is a prediction from the consensus model, not a measurement', X + Wp / 2, Y + Hp + 60, { size: 12, color: P.inkDim, align: 'center', alpha: aC * sp(t, 8.4, 8.9) });
    }

    // ───── scene D: homopolymer (9 – 11.9) ─────
    const aD = win(t, 9.0, 11.9, 0.5);
    if (aD > 0) {
      const X = 220, Y = 130;
      text(ctx, 'what the consensus still gets wrong', X, 70, { size: 13, color: P.ink, weight: 600, alpha: aD });
      const ref = 'CTGAAAAAAACGT', con = 'CTGAAAAAA-CGT';
      const step = 39;
      text(ctx, 'truth', X - 20, Y, { size: 11, color: P.inkDim, align: 'right', alpha: aD });
      baseRow(ctx, ref, X + 10, Y, { size: 27, step, color: P.ink, alpha: aD });
      // bracket over the homopolymer run
      line(ctx, X + 10 + 3 * step - 14, Y - 26, X + 10 + 9 * step + 14, Y - 26, P.gold, 1.5, aD);
      text(ctx, 'homopolymer run of 7', X + 10 + 6 * step, Y - 40, { size: 12, color: P.gold, align: 'center', alpha: aD });
      // passes miscount it
      for (let k = 0; k < 4; k++) {
        const a = aD * sp(t, 9.25 + k * 0.15, 9.6 + k * 0.15);
        const y = Y + 58 + k * 39;
        const cnt = k === 2 ? 7 : 6;                                  // most passes read 6
        const s = 'CTG' + 'A'.repeat(cnt) + (cnt < 7 ? '-' : '') + 'CGT';
        text(ctx, `pass ${k + 1}`, X - 20, y, { size: 12, color: P.inkDim, align: 'right', alpha: a });
        baseRow(ctx, s, X + 10, y, { size: 21, step, color: P.inkDim, alpha: a, colors: { '-': P.alert } });
      }
      const ca = aD * sp(t, 9.9, 10.3);
      const yC = Y + 58 + 4 * 39 + 12;
      text(ctx, 'HiFi', X - 20, yC, { size: 12, color: P.gold, align: 'right', weight: 600, alpha: ca });
      baseRow(ctx, con, X + 10, yC, { size: 27, step, color: P.gold, alpha: ca, colors: { '-': P.alert } });
      text(ctx, '1-bp deletion: the passes agree with each other, not with the truth', X + 10, yC + 36, { size: 12.5, color: P.alert, alpha: ca });
      text(ctx, '1-bp indel in a homopolymer: the typical residual HiFi error → use HiFi-aware variant callers', W / 2, 500, { size: 12.5, color: P.inkDim, align: 'center', alpha: ca * sp(t, 10.3, 10.7), maxWidth: 820 });
    }

    // ───── scene E: the BAM record (11.5 – 13) ─────
    const aE = win(t, 11.5, 13.5, 0.5);
    if (aE > 0) {
      const X = 120, Y = 110;
      text(ctx, 'hifi_reads.bam, one record', X, 70, { size: 13, color: P.ink, weight: 600, alpha: aE });
      ctx.save(); ctx.globalAlpha *= aE * 0.5; ctx.fillStyle = P.grid; roundRect(ctx, X - 16, Y - 22, 740, 150, 8); ctx.fill(); ctx.restore();
      const rows = [
        ['m84011_240101_120000/1234567/ccs', P.ink],
        ['seq: ACGT… (15,812 bp)      qual: ~~~~~~~…', P.inkDim],
        ['rq:f:0.9994    np:i:14    ec:f:13.6', P.gold],
        ['MM:Z:C+m,3,12,0,7;    ML:B:C,250,8,244,230', P.dna],
      ];
      rows.forEach(([s, c], k) => text(ctx, s, X, Y + k * 32, { size: 13, color: c, mono: true, alpha: aE * sp(t, 11.6 + k * 0.2, 12.0 + k * 0.2) }));
      const notes = [
        ['rq = predicted accuracy (0.99 = Q20); np = passes. Filter reads by rq, not by per-base Q.', P.gold],
        ['MM / ML = CpG methylation per read, from pulse kinetics. Only in the BAM, lost in FASTQ.', P.dna],
        ['No PCR → no duplicates to mark. Chimeras and barcode errors are the remaining per-read artefacts.', P.good],
      ];
      notes.forEach(([s, c], k) => text(ctx, s, X, 290 + k * 38, { size: 12, color: c, alpha: aE * sp(t, 12.2 + k * 0.25, 12.6 + k * 0.25), maxWidth: 740 }));
    }
  },
};
