// Bisulfite-aware alignment: the converted read does not match the genome,
// both are reduced to three letters, the read aligns, the original letters
// come back as methylation calls. Then M-bias and the metrics that only exist here.
import { prog, sp, win, pulse, lerp, hash, text, callout, dot, line, arrow, roundRect, curve, withAlpha } from '../draw.js';

const REF = 'TTACGGTCAGCTCGATTCCGGACTGCATCG';
const METH = new Set([3, 12, 19]);               // methylated C positions on the reference (CpG)
const READ = (() => { let s = ''; for (let i = 0; i < REF.length; i++) s += REF[i] === 'C' && !METH.has(i) ? 'T' : REF[i]; return s; })();
const CS = []; for (let i = 0; i < REF.length; i++) if (REF[i] === 'C') CS.push(i);
const STEP = 20, SIZE = 16, X0 = 180;

function ctxOf(i) { // context of C at i on REF
  const n1 = REF[i + 1], n2 = REF[i + 2];
  if (n1 === 'G') return 'CpG';
  if (n2 === 'G') return 'CHG';
  return 'CHH';
}

function row(ctx, seq, x, y, P, alpha, colorFn) {
  if (alpha <= 0) return;
  for (let i = 0; i < seq.length; i++) {
    const { color = P.ink, weight = 400, ch = seq[i] } = colorFn(i, seq[i]) || {};
    text(ctx, ch, x + i * STEP, y, { size: SIZE, color, align: 'center', mono: true, alpha, weight });
  }
}

export default {
  id: 'methyl-alignment',
  duration: 13.5,
  thumbT: 6.6,
  phases: [
    { t: 0, label: 'The read no longer matches', caption: 'After conversion the read is T where the genome has an unmethylated C. An ordinary aligner sees mismatches at every one of them and drops the read.' },
    { t: 2.5, label: 'Convert both in silico', caption: 'Bisulfite-aware aligners rewrite C→T in the read and in the reference (G→A for Read 2 and the bottom strand), align in three letters, and keep the best strand.' },
    { t: 5.5, label: 'Restore the letters', caption: 'At each reference cytosine the original read base is read back: C means methylated, T means unmethylated. The neighbouring bases give the context: CpG, CHG or CHH.' },
    { t: 8, label: 'M-bias', caption: 'Methylation as a function of position in the read. The first bases of Read 2 were filled in with unmethylated C during end repair and must be trimmed.' },
    { t: 10.5, label: 'Metrics only methylation data have', caption: 'Mapping efficiency, conversion rate and per-cytosine coverage decide what you can claim; a single CpG at 10× has a very wide interval.' },
  ],
  draw(ctx, t, W, H, P) {
    // ───── phases 0–2: the alignment rows (0 – 8.2) ─────
    const aA = win(t, 0, 8.2, 0.5);
    if (aA > 0) {
      const yR = 210, yQ = 290;
      const conv = sp(t, 2.8, 3.8);                     // in-silico conversion
      const restore = sp(t, 5.8, 6.6);                  // letters restored
      const slide = sp(t, 0.4, 1.2);                    // read slides under the reference
      const qx = X0 + lerp(-70, 0, slide);
      text(ctx, 'reference', X0 - 40, yR, { size: 13, color: P.inkDim, align: 'right', alpha: aA });
      text(ctx, 'read', X0 - 40, yQ, { size: 13, color: P.inkDim, align: 'right', alpha: aA });
      // reference row
      row(ctx, REF, X0, yR, P, aA, (i, ch) => {
        if (ch !== 'C') return { color: P.inkDim };
        if (conv > 0.5 && restore < 0.5) return { color: P.inkFaint, ch: 'T' };
        if (restore >= 0.5) return { color: METH.has(i) ? P.gold : P.dna, weight: 700 };
        return { color: P.dna, weight: 600 };
      });
      // read row
      row(ctx, READ, qx, yQ, P, aA, (i, ch) => {
        const refC = REF[i] === 'C';
        if (!refC) return { color: P.inkDim };
        if (conv > 0.5 && restore < 0.5) return { color: P.inkFaint, ch: 'T' };
        if (restore >= 0.5) return { color: METH.has(i) ? P.gold : P.alert, weight: 700 };
        return { color: ch === 'T' ? P.alert : P.dna, weight: 700 };
      });
      // mismatch marks (phase 0)
      const mm = aA * win(t, 1.2, 2.8, 0.3);
      CS.forEach(i => { if (!METH.has(i)) line(ctx, X0 + i * STEP, yR + 12, qx + i * STEP, yQ - 12, P.alert, 1.5, mm, [2, 2]); });
      text(ctx, '✕', X0 + REF.length * STEP + 36, (yR + yQ) / 2, { size: 30, color: P.alert, align: 'center', alpha: mm, weight: 700 });
      text(ctx, `${CS.length - METH.size} mismatches: an ordinary aligner drops the read`, X0, 380, { size: 14, color: P.alert, alpha: mm });
      // phase 1 labels
      const ca = aA * win(t, 2.8, 5.8, 0.3);
      text(ctx, 'C → T in read and reference', X0, 120, { size: 15, color: P.ink, weight: 600, alpha: ca });
      text(ctx, 'Read 2 / bottom strand: G → A instead', X0 + 360, 120, { size: 13, color: P.inkDim, alpha: ca });
      const ok = aA * win(t, 3.8, 5.8, 0.3);
      text(ctx, '✓', X0 + REF.length * STEP + 36, (yR + yQ) / 2, { size: 30, color: P.good, align: 'center', alpha: ok, weight: 700 });
      text(ctx, 'aligned in three letters; strand chosen by best score (OT / OB)', X0, 380, { size: 14, color: P.good, alpha: ok });
      // phase 2: restored letters, context labels
      const ra = aA * win(t, 5.8, 8.2, 0.3);
      text(ctx, 'read the original base back at every reference C', X0, 120, { size: 15, color: P.ink, weight: 600, alpha: ra });
      CS.forEach((i, k) => {
        const g = ra * sp(t, 6.2 + k * 0.12, 6.5 + k * 0.12);
        const m = METH.has(i);
        line(ctx, X0 + i * STEP, yR + 12, X0 + i * STEP, yQ - 12, m ? P.gold : P.alert, 1, g, [2, 2]);
        text(ctx, ctxOf(i), X0 + i * STEP, yQ + 28 + (k % 2) * 16, { size: 11, color: ctxOf(i) === 'CpG' ? P.ink : P.inkFaint, align: 'center', alpha: g });
      });
      text(ctx, 'C = methylated', X0, 390, { size: 14, color: P.gold, alpha: ra * sp(t, 7.0, 7.4), weight: 600 });
      text(ctx, 'T = unmethylated', X0 + 160, 390, { size: 14, color: P.alert, alpha: ra * sp(t, 7.0, 7.4), weight: 600 });
      text(ctx, 'CpG is what mammals methylate; CHG / CHH ≈ 0 % and double as a conversion check', X0, 420, { size: 13, color: P.inkDim, alpha: ra * sp(t, 7.2, 7.6) });
    }

    // ───── phase 3: M-bias plot (8 – 10.7) ─────
    const aB = win(t, 8, 10.7, 0.5);
    if (aB > 0) {
      const X = 170, Y = 110, Wp = 710, Hp = 320;
      text(ctx, 'M-bias: methylation vs position in the read', X, 76, { size: 15, color: P.ink, weight: 600, alpha: aB });
      line(ctx, X, Y + Hp + 0.5, X + Wp, Y + Hp + 0.5, P.inkFaint, 1, aB);
      line(ctx, X + 0.5, Y, X + 0.5, Y + Hp, P.inkFaint, 1, aB);
      [0, 25, 50, 75, 100].forEach(p => text(ctx, String(p), X + Wp * p / 100, Y + Hp + 16, { size: 12, color: P.inkDim, align: 'center', alpha: aB }));
      text(ctx, 'position in read (bp)', X + Wp / 2, Y + Hp + 38, { size: 13, color: P.inkDim, align: 'center', alpha: aB });
      [0, 50, 100].forEach(p => text(ctx, `${p} %`, X - 10, Y + Hp - Hp * p / 100, { size: 11, color: P.inkDim, align: 'right', alpha: aB }));
      text(ctx, 'CpG methylation', X - 10, Y - 16, { size: 11, color: P.inkDim, align: 'right', alpha: aB });
      const g = sp(t, 8.3, 9.3);
      // Read 1: flat ~ 75 % with mild noise
      curve(ctx, X, Y, Wp * g, Hp, u => 0.74 + 0.02 * Math.sin(u * 40) + 0.015 * Math.sin(u * 7), P.p5, { lw: 2.2, alpha: aB, n: 120 });
      // Read 2: dip in the first 8 bp, then flat
      curve(ctx, X, Y, Wp * g, Hp, u => { const p = u * 100; const dip = p < 8 ? 0.55 * (1 - p / 8) : 0; return 0.74 - dip + 0.02 * Math.sin(u * 37 + 1); }, P.p7, { lw: 2.2, alpha: aB, n: 120 });
      text(ctx, 'Read 1', X + Wp - 40, Y + Hp * 0.26 - 14, { size: 11.5, color: P.p5, align: 'right', alpha: aB * g, weight: 600 });
      text(ctx, 'Read 2', X + Wp - 40, Y + Hp * 0.26 + 14, { size: 11.5, color: P.p7, align: 'right', alpha: aB * g, weight: 600 });
      // trim region
      const ta = aB * sp(t, 9.3, 9.8);
      ctx.save(); ctx.globalAlpha *= ta * 0.18; ctx.fillStyle = P.alert; ctx.fillRect(X, Y, Wp * 0.08, Hp); ctx.restore();
      callout(ctx, 'first ~8 bp of Read 2: end-repair fill-in, unmethylated C → trim', X + Wp * 0.08 + 14, Y + Hp * 0.75, P, { alpha: ta, size: 13.5, color: P.alert, to: [X + Wp * 0.05, Y + Hp * 0.6] });
      text(ctx, 'and do not count a CpG twice where Read 1 and Read 2 overlap', X + Wp * 0.08 + 14, Y + Hp * 0.75 + 24, { size: 13, color: P.inkDim, alpha: aB * sp(t, 9.9, 10.3) });
    }

    // ───── phase 4: metrics (10.5 – end) ─────
    const aC = win(t, 10.5, 14, 0.5);
    if (aC > 0) {
      text(ctx, 'metrics only methylation data have', 110, 90, { size: 15, color: P.ink, weight: 600, alpha: aC });
      const rows = [
        { k: 'mapping efficiency', v: '60–80 % unique', note: 'three letters are less unique than four; repeats and GC-poor regions drop out', c: P.ink },
        { k: 'conversion rate', v: '≥ 99 % (lambda / CHH)', note: 'below that, every methylation level is inflated', c: P.good },
        { k: 'per-CpG methylation at 10×', v: '7 / 10 = 70 %  ± 30', note: 'a count ratio with a wide interval', c: P.gold },
      ];
      rows.forEach((r, k) => {
        const g = aC * sp(t, 10.8 + k * 0.35, 11.3 + k * 0.35);
        const y = 150 + k * 88;
        text(ctx, r.k, 110, y, { size: 14, color: P.inkDim, alpha: g });
        text(ctx, r.v, 340, y, { size: 15, color: r.c, alpha: g, weight: 600, mono: true });
        text(ctx, r.note, 110, y + 26, { size: 13, color: P.inkDim, alpha: g, maxWidth: 700 });
      });
      // interval sketch for the last row
      const ia = aC * sp(t, 11.8, 12.3);
      const ix = 620, iy = 326, iw = 260;
      line(ctx, ix, iy, ix + iw, iy, P.inkFaint, 1, ia);
      [0, 50, 100].forEach(p => { line(ctx, ix + iw * p / 100, iy - 4, ix + iw * p / 100, iy + 4, P.inkFaint, 1, ia); text(ctx, `${p}`, ix + iw * p / 100, iy + 16, { size: 10, color: P.inkDim, align: 'center', alpha: ia }); });
      line(ctx, ix + iw * 0.40, iy, ix + iw * 0.93, iy, P.gold, 4, ia);
      dot(ctx, ix + iw * 0.70, iy, 5, P.gold, ia);
      text(ctx, '95 % interval at 10×', ix + iw / 2, iy - 16, { size: 10.5, color: P.gold, align: 'center', alpha: ia });
      text(ctx, 'report regions (DMRs) and pooled CpGs, not single sites', 110, 430, { size: 14.5, color: P.gold, alpha: aC * sp(t, 12.3, 12.8), weight: 600 });
      text(ctx, 'and record aligner, trim positions, overlap handling and deduplication (never deduplicate RRBS)', 110, 460, { size: 13, color: P.inkDim, alpha: aC * sp(t, 12.6, 13.1), maxWidth: 780 });
    }
  },
};
