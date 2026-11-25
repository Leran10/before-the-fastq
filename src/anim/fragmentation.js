// Fragmentation: long genomic DNA -> a distribution of fragment lengths ->
// what that distribution means for read pairs.
import { prog, sp, win, pulse, hash, lerp, clamp, text, callout, dsPath, dsFragment, arrow, dot, line, curve, shake, roundRect, withAlpha, ease } from '../draw.js';

const X0 = 60, X1 = 900, YS = 215;           // strand span and resting y
const WAVE = { amp: 16, freq: 0.021, n: 420, seed: 3 };

// Fragments are a constant derived from a seed, not animation state.
const frags = [];
{
  let x = X0, i = 0;
  while (x < X1 - 16) {
    const gap = 20 + 42 * hash(i, 5) + 28 * hash(i, 9);       // 20..90 px
    const x1 = Math.min(X1, x + gap);
    frags.push({ i, x0: x, x1, len: x1 - x, bp: Math.round((x1 - x) * 7), cutT: 3.4 + 2.5 * hash(i, 21), dy: (hash(i, 33) - 0.5) * 30, dx: (hash(i, 41) - 0.5) * 6 });
    x = x1; i++;
  }
}
// Histogram geometry
const HX0 = 520, HX1 = 900, HY = 410, BIN_BP0 = 100, BIN_W = 50, NBINS = 14;
const BW = (HX1 - HX0) / NBINS;
const stack = new Array(NBINS).fill(0);
frags.forEach(f => { f.bin = clamp(Math.floor((f.bp - BIN_BP0) / BIN_W), 0, NBINS - 1); f.stack = stack[f.bin]++; });
const bpToX = bp => HX0 + ((bp - BIN_BP0) / (BIN_W * NBINS)) * (HX1 - HX0);

function wavyY(x, phase = 0) {
  return YS + Math.sin(x * WAVE.freq + phase) * WAVE.amp + Math.sin(x * WAVE.freq * 2.7 + WAVE.seed) * WAVE.amp * 0.35;
}

export default {
  id: 'fragmentation',
  duration: 13,
  thumbT: 7.6,
  phases: [
    { t: 0, label: 'Intact genomic DNA', caption: 'Extracted DNA is tens of kilobases long, far longer than a sequencer can read from one end.' },
    { t: 3, label: 'Shearing', caption: 'Ultrasound (or an enzyme cocktail) breaks the backbone at essentially random positions.' },
    { t: 6.5, label: 'A distribution, not a length', caption: 'Fragment lengths form a distribution. Its centre and spread are set here and only trimmed later.' },
    { t: 9.6, label: 'Your insert sizes', caption: 'That distribution is the insert-size distribution you will measure after alignment, and it decides how read pairs behave.' },
  ],
  draw(ctx, t, W, H, P) {
    // ---- phase 0/1: the strand ----
    const strandAlpha = 1 - prog(t, 6.3, 7.4);
    const straighten = sp(t, 6.0, 6.6);      // wave -> straight before flying off
    const shakeAmp = 4 * pulse(t, 3.0, 6.3) * (t > 3 && t < 6.3 ? 1 : 0);
    const [shx, shy] = shake(t, shakeAmp, 38);

    if (strandAlpha > 0 || t < 9.6) {
      frags.forEach(f => {
        const cut = sp(t, f.cutT, f.cutT + 0.9);
        const flyS = sp(t, 6.6 + f.i * 0.03, 7.6 + f.i * 0.03);
        // target block position in histogram
        const tx0 = HX0 + f.bin * BW + 2, tx1 = HX0 + (f.bin + 1) * BW - 2, ty = HY - 5 - f.stack * 9;
        const alphaHere = t < 6.6 ? 1 : 1; // blocks persist as the histogram
        const pts = [];
        const n = Math.max(2, Math.round(f.len / 6));
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          const x = lerp(f.x0, f.x1, u);
          const yw = lerp(wavyY(x), YS + (hash(f.i, 77) - 0.5) * 8, straighten);
          // after the cut, pieces drift apart a little
          let px = x + f.dx * cut + shx, py = yw + f.dy * cut + shy;
          // fly to histogram
          px = lerp(px, lerp(tx0, tx1, u), flyS);
          py = lerp(py, ty, flyS);
          pts.push([px, py]);
        }
        const gap = lerp(7, 5, flyS);
        dsPath(ctx, pts, { colorA: P.dna, colorB: P.dnaLight, gap, lw: lerp(2.2, 2.6, flyS), rungs: flyS < 0.5, alpha: alphaHere });
        // cut flash
        if (f.i < frags.length - 1) {
          const fl = pulse(t, f.cutT - 0.1, f.cutT + 0.5);
          if (fl > 0 && t < 6.6) dot(ctx, f.x1 + shx, wavyY(f.x1) + shy, 4 + 6 * fl, P.gold, fl * 0.9);
        }
      });
    }

    // labels for phase 0/1
    callout(ctx, 'genomic DNA, tens of kilobases', X0, 150, P, { alpha: win(t, 0.3, 3.2), size: 14, color: P.ink });
    text(ctx, '5′', X0 - 18, wavyY(X0) - 10, { size: 11, color: P.inkDim, alpha: win(t, 0.3, 3.2) });
    text(ctx, '3′', X1 + 10, wavyY(X1) - 10, { size: 11, color: P.inkDim, alpha: win(t, 0.3, 3.2) });
    // sonication waves
    {
      const a = win(t, 3.0, 6.3, 0.5);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a;
        for (let k = 0; k < 4; k++) {
          const ph = ((t * 0.9 + k * 0.25) % 1);
          const r = 30 + ph * 110;
          ctx.strokeStyle = withAlpha(P.enzyme, (1 - ph) * 0.6); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(W / 2, 60, r, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
        }
        ctx.fillStyle = P.enzyme; roundRect(ctx, W / 2 - 22, 30, 44, 26, 4); ctx.fill();
        text(ctx, 'acoustic shearing / enzyme mix', W / 2, 18, { size: 12, color: P.inkDim, align: 'center' });
        ctx.restore();
      }
    }

    // ---- phase 2: histogram furniture ----
    {
      const a = win(t, 6.8, 13.5, 0.6);
      if (a > 0) {
        line(ctx, HX0, HY + 0.5, HX1, HY + 0.5, P.inkFaint, 1, a);
        [100, 300, 500, 700].forEach(bp => {
          const x = bpToX(bp);
          line(ctx, x, HY, x, HY + 5, P.inkFaint, 1, a);
          text(ctx, String(bp), x, HY + 16, { size: 11, color: P.inkDim, align: 'center', alpha: a });
        });
        text(ctx, 'fragment length (bp)', (HX0 + HX1) / 2, HY + 34, { size: 12, color: P.inkDim, align: 'center', alpha: a });
        text(ctx, 'molecules', HX0 - 22, HY - 80, { size: 11, color: P.inkDim, align: 'right', alpha: a });
        arrow(ctx, HX0 - 22, HY - 2, HX0 - 22, HY - 68, P.inkFaint, { lw: 1, head: 5, alpha: a });
      }
      // the population curve: all molecules, not just the ones drawn
      const c = win(t, 8.2, 13.5, 0.7);
      if (c > 0) {
        const mu = 0.44, sd = 0.16;
        curve(ctx, HX0, HY - 150, HX1 - HX0, 150, u => Math.exp(-0.5 * ((u - mu) / sd) ** 2) * sp(t, 8.2, 9.2), P.dna, { alpha: c * 0.9, fill: true, lw: 1.5 });
        callout(ctx, 'the whole library: millions of fragments', HX0 + 10, HY - 170, P, { alpha: c, size: 12 });
        const tgt = bpToX(400);
        line(ctx, tgt, HY - 150, tgt, HY, P.gold, 1.5, c, [4, 3]);
        text(ctx, 'protocol target ≈ 350–450', tgt + 6, HY - 140, { size: 11, color: P.gold, alpha: c });
      }
    }

    // ---- phase 3: read pairs on three inserts ----
    {
      const a = win(t, 9.6, 13.5, 0.6);
      if (a > 0) {
        const LX = 70, scale = 0.5; // px per bp
        text(ctx, 'insert size decides how your read pairs behave  (2 × 150 bp)', LX, 120, { size: 14, color: P.ink, weight: 600, alpha: a });
        const rows = [
          { bp: 400, y: 190, label: '400 bp insert: R1 and R2 do not meet; the middle is unsequenced', ov: 0 },
          { bp: 220, y: 290, label: '220 bp: R1 and R2 overlap; the same bases are read twice', ov: 1 },
          { bp: 110, y: 390, label: '110 bp: a read is longer than the insert and runs into the adapter', ov: 2 },
        ];
        rows.forEach((r, k) => {
          const ra = a * win(t, 9.8 + k * 0.5, 13.5, 0.5);
          if (ra <= 0) return;
          const x0 = LX + 60, x1 = x0 + r.bp * scale, rl = 150 * scale;
          // adapters
          dsFragment(ctx, x0 - 36, x0, r.y, { colorA: P.p5, colorB: P.p5, alpha: ra, rungEvery: 7 });
          dsFragment(ctx, x1, x1 + 36, r.y, { colorA: P.p7, colorB: P.p7, alpha: ra, rungEvery: 7 });
          dsFragment(ctx, x0, x1, r.y, { colorA: P.dna, colorB: P.dnaLight, alpha: ra });
          // reads
          const grow = sp(t, 10.2 + k * 0.5, 11.2 + k * 0.5);
          const r1e = x0 + rl * grow, r2e = x1 - rl * grow;
          const r1in = Math.min(r1e, x1), r2in = Math.max(r2e, x0);
          arrow(ctx, x0, r.y - 14, r1in, r.y - 14, P.p5, { lw: 3, head: 7, alpha: ra });
          arrow(ctx, x1, r.y + 14, r2in, r.y + 14, P.p7, { lw: 3, head: 7, alpha: ra });
          if (r1e > x1) line(ctx, x1, r.y - 14, r1e, r.y - 14, P.alert, 3, ra);
          if (r2e < x0) line(ctx, x0, r.y + 14, r2e, r.y + 14, P.alert, 3, ra);
          if (r.ov === 1 && r1e > r2e) { ctx.save(); ctx.globalAlpha = ra * 0.25; ctx.fillStyle = P.gold; ctx.fillRect(r2e, r.y - 22, r1e - r2e, 44); ctx.restore(); }
          if (r.ov === 0 && grow > 0.95) { line(ctx, r1e + 2, r.y, r2e - 2, r.y, P.inkFaint, 1, ra, [2, 3]); text(ctx, 'unread', (r1e + r2e) / 2, r.y - 28, { size: 10, color: P.inkDim, align: 'center', alpha: ra }); }
          text(ctx, 'R1', x0 - 48, r.y - 14, { size: 11, color: P.p5, alpha: ra, weight: 600 });
          text(ctx, 'R2', x1 + 40, r.y + 14, { size: 11, color: P.p7, alpha: ra, weight: 600 });
          text(ctx, r.label, LX, r.y + 40, { size: 12, color: r.ov === 2 ? P.alert : P.inkDim, alpha: ra, maxWidth: 420 });
          // marker on the histogram
          const mx = bpToX(r.bp);
          dot(ctx, mx, HY + 1, 4, r.ov === 2 ? P.alert : P.gold, ra);
        });
      }
    }
  },
};
