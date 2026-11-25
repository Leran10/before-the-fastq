// Sample collection & storage: a sample goes into a tube, waits, is frozen;
// composition drifts while it waits and collection batches become data structure.
import { prog, sp, win, pulse, lerp, hash, gauss, text, callout, tube, blob, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

const TA = { x: 120, y: 150, w: 70, h: 170 };   // with preservative
const TB = { x: 290, y: 150, w: 70, h: 170 };   // no preservative
// taxa fractions at t=0 and after drift (no preservative)
const TAXA0 = [0.22, 0.30, 0.28, 0.20];
const TAXA1 = [0.48, 0.20, 0.17, 0.15];

function compBar(ctx, x, y, w, fr, P, alpha, label) {
  if (alpha <= 0) return;
  let cx = x;
  fr.forEach((f, i) => {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = P.samples[i];
    ctx.fillRect(cx, y, w * f, 14); ctx.restore();
    cx += w * f;
  });
  text(ctx, label, x + w / 2, y + 26, { size: 11, color: P.inkDim, align: 'center', alpha });
}

function clock(ctx, x, y, r, frac, P, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.strokeStyle = P.enzyme; ctx.lineWidth = 2; ctx.fillStyle = P.panel;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(ctx, x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86, x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, P.enzyme, 1.5); }
  const a = -Math.PI / 2 + frac * Math.PI * 2 * 2; // two turns = 24 h
  line(ctx, x, y, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, P.gold, 3);
  dot(ctx, x, y, 3, P.gold);
  ctx.restore();
}

export default {
  id: 'collection',
  duration: 13,
  thumbT: 5.2,
  phases: [
    { t: 0, label: 'Collection', caption: 'The sample goes into a tube, with a preservative buffer or without one.' },
    { t: 3, label: 'Time at room temperature', caption: 'Without a preservative, facultative anaerobes keep growing, RNA degrades and the composition drifts for hours.' },
    { t: 6.8, label: 'Freezing', caption: 'At −80 °C the composition is locked; each later freeze–thaw cycle fragments nucleic acids a little more.' },
    { t: 9.6, label: 'In your data', caption: 'Samples collected or stored differently separate in ordination before any biology does; if cases and controls were collected apart, the two are confounded.' },
  ],
  draw(ctx, t, W, H, P) {
    const left = 1 - 0.4 * sp(t, 9.6, 10.4);
    // tubes
    const liq = (base) => base;
    tube(ctx, TA.x, TA.y, TA.w, TA.h, P, { level: 0.55, alpha: left, label: 'with preservative' });
    tube(ctx, TB.x, TB.y, TB.w, TB.h, P, { level: 0.55, alpha: left, label: 'no preservative' });
    // sample drop falling in
    [TA, TB].forEach((T, k) => {
      const d = sp(t, 0.5 + k * 0.3, 1.6 + k * 0.3);
      const y = lerp(90, T.y + T.h * 0.6, d);
      const r = lerp(12, 16, d);
      const a = win(t, 0.3 + k * 0.3, 13.5, 0.3) * left;
      blob(ctx, T.x + T.w / 2, y, r, P.membrane, { seed: 3 + k, alpha: a * (d < 1 ? 1 : 0.9), wobble: 0.25 });
      const spl = pulse(t, 1.5 + k * 0.3, 2.1 + k * 0.3);
      if (spl > 0) dot(ctx, T.x + T.w / 2, T.y + T.h * 0.45, 6 + 14 * spl, P.liquid, spl * 0.8);
    });
    text(ctx, 'stool, swab, tissue, water…', 240, 70, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 0.2, 3.0) });

    // composition bars under tubes
    const drift = sp(t, 3.2, 6.6);
    const frB = TAXA0.map((f, i) => lerp(f, TAXA1[i], drift));
    const ba = win(t, 2.4, 13.5, 0.5) * left;
    compBar(ctx, TA.x, 365, TA.w, TAXA0, P, ba, 'composition');
    compBar(ctx, TB.x, 365, TB.w, frB, P, ba, 'composition');
    // drift annotation
    {
      const a = win(t, 4.0, 6.8, 0.4);
      callout(ctx, 'facultative anaerobes grow', TB.x + TB.w + 14, 372, P, { alpha: a, size: 11, color: P.samples[0] });
      callout(ctx, 'strict anaerobes die, RNA degrades', TB.x + TB.w + 14, 390, P, { alpha: a, size: 11, color: P.inkDim });
    }

    // clock on the right during phase 2
    {
      const a = win(t, 3, 6.8, 0.5);
      clock(ctx, 700, 210, 70, sp(t, 3.3, 6.5), P, a);
      const hrs = Math.round(24 * sp(t, 3.3, 6.5));
      text(ctx, `${hrs} h at room temperature`, 700, 310, { size: 14, color: P.ink, align: 'center', alpha: a, weight: 600 });
      text(ctx, 'transport, bench, courier…', 700, 332, { size: 12, color: P.inkDim, align: 'center', alpha: a });
    }

    // freezer overlay
    {
      const a = win(t, 6.8, 9.8, 0.5);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a * 0.5; ctx.fillStyle = P.liquid;
        roundRect(ctx, 80, 110, 320, 230, 10); ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.glass; ctx.lineWidth = 2; roundRect(ctx, 80, 110, 320, 230, 10); ctx.stroke(); ctx.restore();
        text(ctx, '−80 °C', 240, 128, { size: 15, color: P.ink, weight: 700, align: 'center', alpha: a });
        for (let i = 0; i < 6; i++) text(ctx, '✱', 95 + hash(i, 2) * 290, 125 + hash(i, 4) * 200, { size: 12, color: withAlpha(P.dna, 0.6), alpha: a * (0.5 + 0.5 * Math.sin(t * 2 + i)) });
        const cyc = Math.min(3, Math.floor(prog(t, 7.6, 9.4) * 3.99));
        text(ctx, `freeze–thaw cycles: ${cyc}`, 700, 200, { size: 14, color: cyc > 1 ? P.alert : P.ink, align: 'center', alpha: a, weight: 600 });
        // fragment getting shorter with cycles
        const segs = 1 + cyc;
        const span = 200, gapPx = 8;
        const segLen = (span - gapPx * (segs - 1)) / segs;
        for (let s = 0; s < segs; s++) {
          const x0 = 600 + s * (segLen + gapPx);
          line(ctx, x0, 236, x0 + segLen, 236, P.dna, 3, a);
          line(ctx, x0, 243, x0 + segLen, 243, P.dnaLight, 3, a);
        }
        text(ctx, 'nucleic acids fragment a little each cycle', 700, 270, { size: 12, color: P.inkDim, align: 'center', alpha: a });
      }
    }

    // ordination panel (phase 4)
    {
      const a = win(t, 9.6, 13.5, 0.6);
      if (a > 0) {
        const bx = 540, by = 110, bw = 360, bh = 300;
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh); ctx.restore();
        text(ctx, 'PC1 (31 %)', bx + bw / 2, by + bh + 16, { size: 11, color: P.inkDim, align: 'center', alpha: a });
        ctx.save(); ctx.translate(bx - 12, by + bh / 2); ctx.rotate(-Math.PI / 2); text(ctx, 'PC2 (12 %)', 0, 0, { size: 11, color: P.inkDim, align: 'center', alpha: a }); ctx.restore();
        text(ctx, 'samples cluster by collection batch', bx + bw / 2, by - 16, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        const show = sp(t, 10.0, 11.4);
        for (let i = 0; i < 24; i++) {
          const b = i < 12 ? 0 : 1;
          const cx = b === 0 ? 0.3 : 0.7, cy = b === 0 ? 0.58 : 0.42;
          const px = bx + bw * (cx + gauss(i, 11) * 0.07), py = by + bh * (cy + gauss(i, 23) * 0.09);
          const ai = a * prog(show, i / 24 - 0.1, i / 24 + 0.1);
          // cases are hollow, controls filled: cases mostly in batch 2
          const isCase = b === 1 ? hash(i, 5) < 0.8 : hash(i, 5) < 0.2;
          ctx.save(); ctx.globalAlpha = ai; ctx.fillStyle = P.samples[b]; ctx.strokeStyle = P.samples[b]; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); if (isCase) ctx.stroke(); else ctx.fill(); ctx.restore();
        }
        const la = a * sp(t, 11.2, 11.8);
        dot(ctx, bx + 16, by + 20, 5, P.samples[0], la); text(ctx, 'batch 1: site A, 2022, no preservative', bx + 28, by + 20, { size: 11, color: P.inkDim, alpha: la });
        dot(ctx, bx + 16, by + 38, 5, P.samples[1], la); text(ctx, 'batch 2: site B, 2023, preservative', bx + 28, by + 38, { size: 11, color: P.inkDim, alpha: la });
        text(ctx, '● control   ○ case', bx + bw - 12, by + 20, { size: 11, color: P.inkDim, align: 'right', alpha: la });
        const ca = a * sp(t, 11.9, 12.5);
        text(ctx, 'most cases were collected in batch 2: batch and disease are confounded', bx + bw / 2, by + bh - 14, { size: 11.5, color: P.alert, align: 'center', alpha: ca, weight: 600 });
      }
    }
  },
};
