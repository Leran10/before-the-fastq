// Nanopore basecalling: squiggle -> neural network -> bases with per-base Q;
// model sizes; modified bases; duplex; re-basecalling and batch effects.
import { prog, sp, win, pulse, lerp, hash, clamp, text, baseRow, fakeSeq, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

const SEQ = 'ATGCCGTACGGATTCAGCTAGGCT';
const COMP = 'ATGCCGTACGGATTCAGCTAGGCT'.split('').map((b, i) => (i === 7 || i === 15) ? (b === 'A' ? 'G' : 'A') : b).join('');
const QS = SEQ.split('').map((_, i) => Math.round(8 + 22 * hash(i, 5)));
const BX = 560, BY = 150, STEP = 14;

function qColor(q, P) { return q < 10 ? P.alert : q < 20 ? P.gold : P.good; }

function squiggle(ctx, x, y, w, h, P, alpha, seed = 1, prog1 = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = P.enzyme; ctx.lineWidth = 1.6; ctx.beginPath();
  const n = Math.floor(48 * prog1);
  for (let k = 0; k < n; k++) { const lv = 0.2 + 0.6 * hash(k, seed); for (let j = 0; j < 3; j++) { const px = x + (k + j / 3) * w / 48; const py = y + h - (lv + (hash(k * 3 + j, 9) - 0.5) * 0.05) * h; (k === 0 && j === 0) ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } }
  ctx.stroke(); ctx.restore();
}

function network(ctx, x, y, P, alpha, pulseT) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.strokeStyle = P.grid; ctx.fillStyle = withAlpha(P.enzymeDim, 0.3); roundRect(ctx, x, y, 170, 120, 10); ctx.fill(); ctx.stroke();
  const cols = [4, 6, 6, 4];
  const pts = cols.map((n, c) => Array.from({ length: n }, (_, i) => [x + 25 + c * 40, y + 60 + (i - (n - 1) / 2) * 16]));
  ctx.lineWidth = 0.8;
  for (let c = 0; c < cols.length - 1; c++) pts[c].forEach(a => pts[c + 1].forEach(b => { ctx.strokeStyle = withAlpha(P.enzyme, 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(pulseT * 6 + a[1] * 0.1 + b[1] * 0.05))); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }));
  pts.flat().forEach(p => dot(ctx, p[0], p[1], 3.2, P.enzyme));
  ctx.restore();
  text(ctx, 'neural network (Dorado)', x + 85, y + 134, { size: 11, color: P.inkDim, align: 'center', alpha });
}

export default {
  id: 'nanopore-basecalling',
  duration: 13,
  thumbT: 2.4,
  phases: [
    { t: 0, label: 'Signal in, bases out', caption: 'A neural network reads the current trace and emits bases with an estimated quality for each.' },
    { t: 3, label: 'Model size', caption: 'Fast, high-accuracy and super-accurate models trade GPU time for several Q points.' },
    { t: 6, label: 'Modified bases', caption: 'Modification models add per-base 5mC / 6mA probabilities as MM/ML tags; a FASTQ cannot hold them.' },
    { t: 8.5, label: 'Duplex', caption: 'When the complementary strand follows through the pore, both reads are combined into one consensus above Q30.' },
    { t: 10.5, label: 'Re-basecalling', caption: 'The same raw signal called with a newer model gains several Q points; mixing models across samples is a batch effect.' },
  ],
  draw(ctx, t, W, H, P) {
    // ---- top band: squiggle -> network -> bases ----
    const topA = 1;
    squiggle(ctx, 60, 70, 240, 110, P, topA, 1, sp(t, 0.2, 1.6));
    text(ctx, 'raw current (POD5)', 60, 56, { size: 11, color: P.inkDim });
    arrow(ctx, 308, 125, 336, 125, P.inkFaint, { lw: 1.5, head: 6 });
    network(ctx, 345, 65, P, topA, t);
    arrow(ctx, 522, 125, 548, 125, P.inkFaint, { lw: 1.5, head: 6 });
    const nb = Math.floor(SEQ.length * sp(t, 1.2, 3.0));
    for (let i = 0; i < nb; i++) {
      const x = BX + i * STEP;
      text(ctx, SEQ[i], x, BY, { size: 13, color: P.dna, align: 'center', mono: true });
      ctx.save(); ctx.fillStyle = qColor(QS[i], P); ctx.fillRect(x - 4, BY - 16 - QS[i] * 1.6, 8, QS[i] * 1.6); ctx.restore();
    }
    text(ctx, 'per-base Q', BX - 4, 60, { size: 11, color: P.inkDim, alpha: win(t, 1.4, 14, 0.3) });
    text(ctx, 'FASTQ / unaligned BAM', BX - 4, BY + 22, { size: 11, color: P.inkDim, alpha: win(t, 2.6, 14, 0.3) });
    // 5mC flag (phase 2)
    const ma = win(t, 6.2, 14, 0.4);
    if (ma > 0) {
      const i = 4; const x = BX + i * STEP;
      ctx.save(); ctx.globalAlpha = ma; ctx.strokeStyle = P.gold; ctx.lineWidth = 2; roundRect(ctx, x - 7, BY - 10, 14, 20, 4); ctx.stroke(); ctx.restore();
      text(ctx, '5mC  p = 0.93', x, BY + 40, { size: 11, color: P.gold, align: 'center', weight: 600, alpha: ma });
      text(ctx, 'kept as MM/ML tags in BAM', x + 70, BY + 36, { size: 11, color: P.inkDim, alpha: ma * sp(t, 6.8, 7.3) });
      text(ctx, 'discarded in FASTQ', x + 70, BY + 52, { size: 11, color: P.alert, alpha: ma * sp(t, 6.8, 7.3) });
    }

    // ---- phase 1: model meters (also re-used for phase 4) ----
    const mA = win(t, 3.1, 10.3, 0.4);
    if (mA > 0) {
      const X = 90, Y = 250;
      text(ctx, 'basecalling model', X, Y - 20, { size: 12.5, color: P.ink, weight: 600, alpha: mA });
      text(ctx, 'modal read accuracy', X + 170, Y - 20, { size: 11, color: P.inkDim, alpha: mA });
      text(ctx, 'GPU time', X + 560, Y - 20, { size: 11, color: P.inkDim, alpha: mA });
      const rows = [['fast', 15, 1], ['HAC', 20, 4], ['SUP', 23, 15]];
      rows.forEach(([name, q, cost], k) => {
        const y = Y + 10 + k * 40; const g = sp(t, 3.3 + k * 0.3, 4.4 + k * 0.3);
        text(ctx, name, X, y, { size: 12, color: P.ink, alpha: mA, weight: 600 });
        ctx.save(); ctx.globalAlpha = mA; ctx.fillStyle = P.grid; ctx.fillRect(X + 170, y - 7, 340, 14);
        ctx.fillStyle = qColor(q, P); ctx.fillRect(X + 170, y - 7, 340 * (q / 30) * g, 14);
        ctx.fillStyle = P.enzyme; ctx.fillRect(X + 560, y - 7, 110 * (cost / 15) * g, 14); ctx.restore();
        text(ctx, `Q${q}`, X + 170 + 340 * (q / 30) * g + 8, y, { size: 11, color: P.inkDim, alpha: mA * g });
        text(ctx, `${cost}×`, X + 560 + 110 * (cost / 15) * g + 8, y, { size: 11, color: P.inkDim, alpha: mA * g });
      });
      text(ctx, 'live calling usually fast/HAC; SUP + duplex + modification models afterwards on a GPU', X, Y + 136, { size: 11, color: P.inkDim, alpha: mA * sp(t, 4.8, 5.4) });
    }

    // ---- phase 3: duplex ----
    const da = win(t, 8.6, 14, 0.4);
    if (da > 0) {
      const X = 90, Y = 410;
      const g = sp(t, 8.8, 9.6);
      text(ctx, 'template', X, Y, { size: 11, color: P.inkDim, alpha: da });
      text(ctx, 'complement', X, Y + 22, { size: 11, color: P.inkDim, alpha: da });
      text(ctx, 'duplex consensus', X, Y + 50, { size: 11, color: P.good, alpha: da * sp(t, 9.6, 10.1), weight: 600 });
      const upto = Math.floor(SEQ.length * g);
      baseRow(ctx, SEQ, X + 120, Y, { size: 12.5, step: 14, color: P.dna, upto, alpha: da });
      COMP.split('').forEach((b, i) => { if (i < upto) text(ctx, b, X + 120 + i * 14, Y + 22, { size: 12.5, color: b !== SEQ[i] ? P.alert : P.dnaLight, align: 'center', mono: true, alpha: da }); });
      const ca = da * sp(t, 9.6, 10.1);
      baseRow(ctx, SEQ, X + 120, Y + 50, { size: 12.5, step: 14, color: P.good, upto: Math.floor(SEQ.length * sp(t, 9.6, 10.3)), alpha: ca });
      text(ctx, 'Q15–25 each', X + 120 + SEQ.length * 14 + 14, Y + 11, { size: 11, color: P.inkDim, alpha: da });
      text(ctx, '> Q30', X + 120 + SEQ.length * 14 + 14, Y + 50, { size: 11, color: P.good, alpha: ca, weight: 600 });
      text(ctx, 'disagreements resolved', X + 120 + SEQ.length * 14 + 80, Y + 50, { size: 11, color: P.inkDim, alpha: ca });
    }

    // ---- phase 4: re-basecalling ----
    const ra = win(t, 10.6, 14, 0.4);
    if (ra > 0) {
      const X = 90, Y = 250;
      text(ctx, 'same POD5, different model', X, Y - 20, { size: 12.5, color: P.ink, weight: 600, alpha: ra });
      const rows = [['2021 model (Guppy, R9.4.1)', 15], ['2024 SUP model (Dorado, R10.4.1)', 23]];
      rows.forEach(([name, q], k) => {
        const y = Y + 10 + k * 40; const g = sp(t, 10.8 + k * 0.4, 11.8 + k * 0.4);
        squiggle(ctx, X, y - 10, 90, 20, P, ra, 1);
        text(ctx, name, X + 100, y, { size: 11.5, color: P.inkDim, alpha: ra });
        ctx.save(); ctx.globalAlpha = ra; ctx.fillStyle = P.grid; ctx.fillRect(X + 330, y - 7, 300, 14); ctx.fillStyle = qColor(q, P); ctx.fillRect(X + 330, y - 7, 300 * (q / 30) * g, 14); ctx.restore();
        text(ctx, `Q${q}`, X + 330 + 300 * (q / 30) * g + 8, y, { size: 11, color: P.inkDim, alpha: ra * g });
      });
      text(ctx, 'record the model in every analysis; mixing models across samples is a batch effect in error profile and homopolymer handling', X, Y + 100, { size: 11.5, color: P.alert, alpha: ra * sp(t, 12.0, 12.6), maxWidth: 780 });
    }
  },
};
