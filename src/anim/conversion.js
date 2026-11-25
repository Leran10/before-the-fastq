// Cytosine conversion: unmethylated C -> U (read as T), 5mC stays C.
// Bisulfite (harsh, degrades) vs enzymatic (TET2 + BGT protect, APOBEC deaminates).
// End: the converted read, and the lambda / pUC19 controls.
import { prog, sp, win, pulse, lerp, hash, text, callout, blob, dot, line, arrow, roundRect, baseRow, withAlpha } from '../draw.js';

const SEQ = 'ATCGGACTTCGATGCCATTCGGAACTCG';
const COMP = 'TAGCCTGAAGCTACGGTAAGCCTTGAGC';
const METH = new Set([2, 19]);                       // 5mC positions (CpG)
const CS = [];
for (let i = 0; i < SEQ.length; i++) if (SEQ[i] === 'C') CS.push(i);
const STEP = 14, SIZE = 13;
const X0 = 260;                                      // left edge of the base rows
const BREAKS = [8, 18];                              // bisulfite breaks the strand before these indices

function convertedSeq(conv, extra = {}) {
  // conv in [0,1]: fraction of unmethylated C already converted (ordered by position hash)
  let s = '';
  for (let i = 0; i < SEQ.length; i++) {
    if (SEQ[i] === 'C' && !METH.has(i) && !extra.keep?.has(i)) s += (sp(conv, hash(i, 3) * 0.6, hash(i, 3) * 0.6 + 0.4) >= 0.5 ? (extra.asT ? 'T' : 'U') : 'C');
    else s += SEQ[i];
  }
  return s;
}

// draw one strand as a base row; colours: U red, methylated C gold, others ink
function strandRow(ctx, seq, x, y, P, alpha, o = {}) {
  if (alpha <= 0) return;
  const { offsets = null, size = SIZE, dim = false, step = STEP } = o;
  for (let i = 0; i < seq.length; i++) {
    const ch = seq[i];
    let color = dim ? P.inkDim : P.ink;
    if (ch === 'U' || (o.asT && ch === 'T' && SEQ[i] === 'C')) color = P.alert;
    else if (ch === 'C' && METH.has(i)) color = P.gold;
    else if (ch === 'C') color = P.dna;
    const dx = offsets ? offsets(i) : 0;
    text(ctx, ch, x + i * step + dx, y, { size, color, align: 'center', mono: true, alpha, weight: ch === 'U' || (ch === 'C' && METH.has(i)) ? 700 : 400 });
  }
}

function methylFlags(ctx, x, y, P, alpha, offsets, step = STEP) {
  METH.forEach(i => { const dx = offsets ? offsets(i) : 0; dot(ctx, x + i * step + dx, y - 12 - (step - STEP) * 0.3, 3.5 + (step - STEP) * 0.1, P.gold, alpha); });
}

export default {
  id: 'conversion',
  duration: 14,
  thumbT: 9.6,
  phases: [
    { t: 0, label: 'Methylated and unmethylated C', caption: 'A few cytosines, mostly in CpG context, carry a methyl group. The sequence alone does not show which; conversion makes it visible by rewriting the others.' },
    { t: 3, label: 'Bisulfite', caption: 'Sodium bisulfite deaminates unmethylated C to U; 5mC reacts far more slowly and stays C. The hours at low pH and 65 °C also break most of the DNA.' },
    { t: 6, label: 'Enzymatic (EM-seq)', caption: 'TET2 and T4-BGT chemically protect 5mC and 5hmC, then APOBEC deaminates every unprotected C to U. Same result, intact long fragments, less bias.' },
    { t: 8.6, label: 'After PCR, U reads as T', caption: 'The polymerase copies U as T. In the read, every T at a reference C was an unmethylated cytosine; every surviving C was methylated. The sequence now encodes methylation.' },
    { t: 11, label: 'Controls', caption: 'Unmethylated lambda DNA should read ~100 % converted; methylated pUC19 should stay C. Unconverted C on lambda means every methylation level in the sample is inflated.' },
  ],
  draw(ctx, t, W, H, P) {
    // ───── phase 0: duplex, then denature (0 – 3.2) ─────
    const aA = win(t, 0, 3.2, 0.5);
    if (aA > 0) {
      const y = 250;
      const sep = sp(t, 1.8, 2.8);                         // strands separate
      strandRow(ctx, SEQ, X0, y - 10 - 30 * sep, P, aA);
      methylFlags(ctx, X0, y - 10 - 30 * sep, P, aA);
      strandRow(ctx, COMP, X0, y + 10 + 30 * sep, P, aA * (1 - sep * 0.7), { dim: true });
      // rungs
      ctx.save(); ctx.globalAlpha *= aA * (1 - sep); ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1;
      ctx.beginPath(); for (let i = 0; i < SEQ.length; i++) { ctx.moveTo(X0 + i * STEP, y - 2); ctx.lineTo(X0 + i * STEP, y + 2); } ctx.stroke();
      ctx.restore();
      text(ctx, '5′', X0 - 24, y - 10 - 30 * sep, { size: 11, color: P.inkDim, alpha: aA });
      text(ctx, '3′', X0 + SEQ.length * STEP + 6, y - 10 - 30 * sep, { size: 11, color: P.inkDim, alpha: aA });
      callout(ctx, '5-methylcytosine (5mC), CpG context', X0, 150, P, { alpha: aA * win(t, 0.4, 3.2, 0.3), size: 12.5, color: P.gold, to: [X0 + 2 * STEP, y - 24] });
      callout(ctx, 'unmethylated C', X0 + 200, 330 + 30 * sep, P, { alpha: aA * win(t, 0.8, 3.2, 0.3), size: 12.5, color: P.dna, to: [X0 + 14 * STEP, y + 2 - 30 * sep] });
      text(ctx, 'denature: single strands', W / 2, 400, { size: 12.5, color: P.inkDim, align: 'center', alpha: aA * win(t, 1.8, 3.2, 0.3) });
    }

    // ───── phases 1–2: bisulfite (top) and enzymatic (bottom) (3 – 8.8) ─────
    const aB = win(t, 3.0, 8.8, 0.5);
    if (aB > 0) {
      const yT = 150, yB = 360;
      // top: bisulfite
      const conv = sp(t, 3.6, 5.2);
      const brk = sp(t, 4.4, 5.6);
      const offT = i => (i >= BREAKS[1] ? 2 : i >= BREAKS[0] ? 1 : 0) * 16 * brk + (brk > 0 ? Math.sin(i * 1.7) * 2 * brk : 0);
      text(ctx, 'bisulfite · pH 5 · 65 °C · hours', 60, yT - 50, { size: 13, color: P.ink, weight: 600, alpha: aB });
      strandRow(ctx, convertedSeq(conv), X0, yT, P, aB, { offsets: offT });
      methylFlags(ctx, X0, yT, P, aB, offT);
      BREAKS.forEach((b, k) => { const f = pulse(t, 4.4 + k * 0.3, 5.0 + k * 0.3); if (f > 0) dot(ctx, X0 + (b - 0.5) * STEP + offT(b - 1) + 8, yT, 5 + 9 * f, P.alert, f * 0.8 * aB); });
      text(ctx, 'C → U  (unmethylated)', 60, yT - 10, { size: 12, color: P.alert, alpha: aB * sp(t, 3.8, 4.3) });
      text(ctx, '5mC stays C', 60, yT + 12, { size: 12, color: P.gold, alpha: aB * sp(t, 3.8, 4.3) });
      text(ctx, 'strand breaks: ~90 % of the DNA is lost, inserts become short', X0, yT + 36, { size: 11.5, color: P.alert, alpha: aB * sp(t, 5.0, 5.6) });
      // bottom: enzymatic
      const prot = sp(t, 6.2, 7.0);                        // TET2/BGT protection ring on 5mC
      const conv2 = sp(t, 7.0, 8.2);
      text(ctx, 'enzymatic (EM-seq) · 37 °C', 60, yB - 50, { size: 13, color: P.ink, weight: 600, alpha: aB * sp(t, 5.9, 6.3) });
      const aE = aB * sp(t, 5.9, 6.4);
      strandRow(ctx, convertedSeq(conv2), X0, yB, P, aE);
      methylFlags(ctx, X0, yB, P, aE);
      METH.forEach(i => { if (prot > 0) { ctx.save(); ctx.globalAlpha *= aE * prot; ctx.strokeStyle = P.gold; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X0 + i * STEP, yB - 4, 11, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } });
      // enzymes moving along
      const ex = lerp(X0 - 20, X0 + SEQ.length * STEP + 10, prog(t, 6.2, 7.0));
      blob(ctx, ex, yB - 30, 10, P.enzyme, { seed: 4, alpha: aE * win(t, 6.1, 7.1, 0.2) });
      text(ctx, 'TET2 + BGT', ex, yB - 50, { size: 10.5, color: P.enzyme, align: 'center', alpha: aE * win(t, 6.1, 7.1, 0.2) });
      const ax = lerp(X0 - 20, X0 + SEQ.length * STEP + 10, prog(t, 7.0, 8.2));
      blob(ctx, ax, yB - 30, 10, P.enzyme, { seed: 9, alpha: aE * win(t, 6.9, 8.3, 0.2) });
      text(ctx, 'APOBEC', ax, yB - 50, { size: 10.5, color: P.enzyme, align: 'center', alpha: aE * win(t, 6.9, 8.3, 0.2) });
      text(ctx, '5mC / 5hmC protected', 60, yB - 10, { size: 12, color: P.gold, alpha: aE * sp(t, 6.4, 6.9) });
      text(ctx, 'then C → U', 60, yB + 12, { size: 12, color: P.alert, alpha: aE * sp(t, 7.2, 7.7) });
      text(ctx, 'strand intact: long inserts, even GC coverage, less input', X0, yB + 36, { size: 11.5, color: P.good, alpha: aE * sp(t, 8.0, 8.5) });
    }

    // ───── phase 3: after PCR (8.6 – 11.2) ─────
    const aC = win(t, 8.6, 11.2, 0.5);
    if (aC > 0) {
      const y1 = 200, y2 = 280, XB = 200, SB = 22, FB = 16;
      text(ctx, 'after PCR: U is copied as T', 60, 110, { size: 15, color: P.ink, weight: 600, alpha: aC });
      text(ctx, 'genome', XB - 40, y1, { size: 13, color: P.inkDim, align: 'right', alpha: aC });
      text(ctx, 'read', XB - 40, y2, { size: 13, color: P.inkDim, align: 'right', alpha: aC });
      strandRow(ctx, SEQ, XB, y1, P, aC, { dim: true, step: SB, size: FB });
      methylFlags(ctx, XB, y1, P, aC, null, SB);
      strandRow(ctx, convertedSeq(1, { asT: true }), XB, y2, P, aC * sp(t, 8.9, 9.4), { asT: true, step: SB, size: FB });
      // tie lines at C positions
      CS.forEach(i => line(ctx, XB + i * SB, y1 + 11, XB + i * SB, y2 - 11, METH.has(i) ? P.gold : P.alert, 1, aC * sp(t, 9.2, 9.8), [2, 2]));
      const la = aC * sp(t, 9.6, 10.1);
      text(ctx, 'T at a reference C  =  unmethylated', XB, 345, { size: 14, color: P.alert, alpha: la });
      text(ctx, 'C at a reference C  =  methylated', XB + 360, 345, { size: 14, color: P.gold, alpha: la });
      text(ctx, 'the sequence now encodes methylation; the genome is three letters to the aligner', W / 2, 420, { size: 14, color: P.ink, align: 'center', alpha: aC * sp(t, 10.2, 10.7), weight: 600 });
    }

    // ───── phase 4: controls (11 – end) ─────
    const aD = win(t, 11, 14.5, 0.5);
    if (aD > 0) {
      const LAM = 'ACGTCCGATCGACTCGATCCGTACGCTA', PUC = 'GCCGTACGCGATCCGTCGACGGCTAGCC';
      const yL = 200, yP = 320, XB = 200, SB = 20, FB = 15;
      text(ctx, 'spike-in controls', 60, 110, { size: 15, color: P.ink, weight: 600, alpha: aD });
      text(ctx, 'lambda, unmethylated', XB - 10, yL - 32, { size: 13, color: P.inkDim, alpha: aD });
      text(ctx, 'pUC19, fully methylated', XB - 10, yP - 32, { size: 13, color: P.inkDim, alpha: aD });
      const g = sp(t, 11.3, 12.0);
      for (let i = 0; i < LAM.length; i++) {
        const c = LAM[i] === 'C';
        const conv = c && i !== 19 ? g : 0;               // position 19 stays unconverted: the error
        const ch = conv >= 0.5 ? 'T' : LAM[i];
        const col = c ? (conv >= 0.5 ? P.alert : (i === 19 && g > 0.9 ? P.alert : P.dna)) : P.inkDim;
        text(ctx, ch, XB + i * SB, yL, { size: FB, color: col, align: 'center', mono: true, alpha: aD, weight: c ? 700 : 400 });
      }
      for (let i = 0; i < PUC.length; i++) {
        const c = PUC[i] === 'C';
        text(ctx, PUC[i], XB + i * SB, yP, { size: FB, color: c ? P.gold : P.inkDim, align: 'center', mono: true, alpha: aD * sp(t, 11.6, 12.2), weight: c ? 700 : 400 });
        if (c) dot(ctx, XB + i * SB, yP - 14, 3.5, P.gold, aD * sp(t, 11.6, 12.2));
      }
      text(ctx, 'should read ≥ 99 % converted: conversion efficiency', XB + LAM.length * SB - 10, yL - 32, { size: 12.5, color: P.good, align: 'right', alpha: aD * sp(t, 12.0, 12.4) });
      text(ctx, 'should stay C: no over-conversion of 5mC', XB + PUC.length * SB - 10, yP - 32, { size: 12.5, color: P.good, align: 'right', alpha: aD * sp(t, 12.2, 12.6) });
      const ea = aD * sp(t, 12.4, 12.9);
      ctx.save(); ctx.globalAlpha *= ea; ctx.strokeStyle = P.alert; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(XB + 19 * SB, yL, 11, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      callout(ctx, 'unconverted C on lambda', XB + 19 * SB + 40, yL + 46, P, { alpha: ea, size: 13, color: P.alert, to: [XB + 19 * SB + 8, yL + 9] });
      text(ctx, 'incomplete conversion inflates every methylation level in the sample;', W / 2, 410, { size: 14, color: P.gold, align: 'center', alpha: aD * sp(t, 12.8, 13.3) });
      text(ctx, 'non-CpG (CHH) methylation in mammals is the same check without a spike-in', W / 2, 434, { size: 14, color: P.gold, align: 'center', alpha: aD * sp(t, 12.8, 13.3) });
    }
  },
};
