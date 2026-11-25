// Pooling & normalization: six indexed libraries are diluted to one molarity
// and mixed; unique vs combinatorial dual indexes; PhiX; and the uneven,
// slightly cross-contaminated reads-per-sample you receive.
import { prog, sp, win, pulse, lerp, hash, text, callout, libraryMolecule, tube, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

const N = 6;
const TUBE_W = 46, TUBE_H = 110, TUBE_Y = 90;
const tubeX = i => 70 + i * 68;
const POOL = { x: 560, y: 90, w: 70, h: 150 };
const I7 = ['A', 'B', 'C', 'D', 'E', 'F'];

function grid(ctx, x, y, cell, used, hop, P, alpha, title, hopOk) {
  if (alpha <= 0) return;
  text(ctx, title, x + cell * 3, y - 34, { size: 12.5, color: P.ink, weight: 600, align: 'center', alpha });
  text(ctx, 'i7 →', x - 6, y - 14, { size: 10, color: P.inkDim, align: 'right', alpha });
  for (let c = 0; c < 6; c++) text(ctx, I7[c], x + c * cell + cell / 2, y - 14, { size: 10, color: P.p7, align: 'center', alpha, mono: true });
  for (let r = 0; r < 6; r++) text(ctx, String(r + 1), x - 10, y + r * cell + cell / 2, { size: 10, color: P.p5, align: 'right', alpha, mono: true });
  text(ctx, 'i5 ↓', x - 6, y + 6 * cell + 8, { size: 10, color: P.inkDim, align: 'right', alpha });
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
    const s = used(r, c);
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.strokeRect(x + c * cell, y + r * cell, cell, cell);
    if (s >= 0) { ctx.fillStyle = P.samples[s]; ctx.fillRect(x + c * cell + 2, y + r * cell + 2, cell - 4, cell - 4); }
    ctx.restore();
  }
  if (hop > 0) {
    const [r, c] = hopOk ? [1, 0] : [1, 0];
    const cx = x + c * cell + cell / 2, cy = y + r * cell + cell / 2;
    dot(ctx, cx, cy, 5 + 3 * Math.sin(hop * Math.PI), hopOk ? P.good : P.alert, alpha * hop);
  }
}

export default {
  id: 'pooling',
  duration: 14,
  thumbT: 8.2,
  phases: [
    { t: 0, label: 'Six indexed libraries', caption: 'Each sample’s library carries its own i7 and i5 index pair; that pair is the only thing that will tell the reads apart.' },
    { t: 2.6, label: 'Normalize and mix', caption: 'Each library is diluted to the same molarity and combined into one pool; pipetting and quantification error make the mix uneven.' },
    { t: 6.0, label: 'Index design', caption: 'With unique dual indexes a hopped read lands on an unused pair and is discarded; with combinatorial indexes it lands on a real sample.' },
    { t: 9.4, label: 'PhiX spike-in', caption: 'Low-diversity pools get 1–20 % PhiX so the instrument can calibrate; its reads end up in Undetermined.' },
    { t: 11.0, label: 'In your data', caption: 'Reads per sample vary several-fold, a trickle of reads sits in the wrong sample, and the sample sheet is the only key.' },
  ],
  draw(ctx, t, W, H, P) {
    const dimTop = 1 - 0.55 * sp(t, 6.0, 6.8) + 0.55 * sp(t, 9.4, 10.0) - 1.0 * sp(t, 11.0, 11.6);
    if (dimTop > 0) {
    // ---- tubes with molecules ----
    const dil = sp(t, 2.8, 3.8);
    for (let i = 0; i < N; i++) {
      const x = tubeX(i);
      // pipetting error on sample 3: too little volume
      const errF = i === 3 ? 0.6 : 1;
      tube(ctx, x, TUBE_Y, TUBE_W, TUBE_H, P, { level: lerp(0.4, 0.7, dil), alpha: dimTop, label: `S${i + 1}` });
      const fly = sp(t, 4.0 + i * 0.25, 4.9 + i * 0.25);
      // one molecule per tube that flies into the pool
      const mx = lerp(x + TUBE_W / 2, POOL.x + POOL.w / 2 + (hash(i, 3) - 0.5) * 36, fly);
      const my = lerp(TUBE_Y + TUBE_H * 0.7, POOL.y + POOL.h * 0.55 + (hash(i, 5) - 0.5) * 60, fly);
      libraryMolecule(ctx, mx, my, 18, P, { alpha: dimTop, insertColor: P.samples[i], i5: P.samples[i], i7: P.samples[i], adapterLen: 12, gap: 5, lw: 2 });
      // index labels
      text(ctx, `${I7[i]}·${i + 1}`, x + TUBE_W / 2, TUBE_Y - 12, { size: 10.5, color: P.inkDim, align: 'center', alpha: dimTop * win(t, 0.3, 14.5, 0.3), mono: true });
      text(ctx, `${lerp(9 + hash(i, 9) * 8, 4, dil).toFixed(1)} nM`, x + TUBE_W / 2, TUBE_Y + TUBE_H + 26, { size: 10, color: dil > 0.9 ? P.good : P.inkDim, align: 'center', alpha: dimTop * win(t, 1.0, 6.0, 0.3), mono: true });
      if (i === 3) text(ctx, 'pipetting error', x + TUBE_W / 2, TUBE_Y + TUBE_H + 40, { size: 10, color: P.gold, align: 'center', alpha: dimTop * win(t, 3.6, 6.0, 0.3) });
      void errF;
    }
    text(ctx, 'i7 letter · i5 number', 70, 50, { size: 11, color: P.inkDim, alpha: dimTop * win(t, 0.3, 2.8, 0.3) });
    text(ctx, 'dilute every library to 4 nM', 230, 50, { size: 12, color: P.ink, align: 'center', alpha: dimTop * win(t, 2.6, 6.0, 0.3), weight: 600 });
    // pool tube
    tube(ctx, POOL.x, POOL.y, POOL.w, POOL.h, P, { level: 0.1 + 0.5 * sp(t, 4.0, 6.0), alpha: dimTop, label: 'pool' });
    }
    // PhiX
    {
      const a = win(t, 9.4, 11.2, 0.4);
      const g = sp(t, 9.7, 10.5);
      tube(ctx, 760, 100, 40, 90, P, { level: 0.5 * (1 - g * 0.6), alpha: a, label: 'PhiX' });
      for (let k = 0; k < 4; k++) libraryMolecule(ctx, lerp(780, POOL.x + POOL.w / 2 + (hash(k, 7) - 0.5) * 30, g), lerp(160, POOL.y + POOL.h * 0.6 + (hash(k, 11) - 0.5) * 50, g), 12, P, { alpha: a, insertColor: P.enzyme, adapterLen: 10, gap: 4, lw: 2 });
      text(ctx, 'no index: lands in Undetermined', 780, 220, { size: 10.5, color: P.inkDim, align: 'center', alpha: a * g });
      text(ctx, '1–20 % for amplicons, bisulfite…', 780, 236, { size: 10.5, color: P.inkDim, align: 'center', alpha: a * g });
    }
    // ---- index grids ----
    {
      const a = win(t, 6.0, 9.6, 0.5);
      if (a > 0) {
        const cell = 26;
        const hop = pulse(t, 7.4, 9.2);
        grid(ctx, 120, 300, cell, (r, c) => (r === c ? r : -1), hop, P, a, 'unique dual indexes', true);
        grid(ctx, 420, 300, cell, (r, c) => (r < 2 && c < 3 ? r * 3 + c : -1), hop, P, a, 'combinatorial dual indexes', false);
        // hopping explanation
        const ha = a * sp(t, 7.2, 7.8);
        text(ctx, 'read with S1’s i7 and S2’s i5 (hopped)', 700, 320, { size: 12, color: P.ink, alpha: ha });
        text(ctx, 'UDI: unused pair → discarded', 700, 346, { size: 12, color: P.good, alpha: ha });
        text(ctx, 'CDI: pair belongs to S4 → misassigned', 700, 368, { size: 12, color: P.alert, alpha: ha });
        text(ctx, '0.1–2 % of reads on patterned flow cells', 700, 394, { size: 11, color: P.inkDim, alpha: ha });
      }
    }
    // ---- data panel ----
    {
      const a = win(t, 11.0, 14.5, 0.6);
      if (a > 0) {
        const x0 = 110, y0 = 150, bw = 70, gap = 30, bh = 170;
        text(ctx, 'reads per sample after demultiplexing', x0 + (bw + gap) * 3, 48, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        const vals = [1.0, 0.8, 1.3, 0.45, 1.1, 0.9];
        vals.forEach((v, i) => {
          const g = sp(t, 11.3 + i * 0.15, 12.0 + i * 0.15);
          const x = x0 + i * (bw + gap), h = bh * v * g;
          ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P.samples[i]; ctx.fillRect(x, y0 + bh - h, bw, h); ctx.restore();
          text(ctx, `S${i + 1}`, x + bw / 2, y0 + bh + 14, { size: 11, color: P.inkDim, align: 'center', alpha: a });
          text(ctx, `${Math.round(20 * v * g)} M`, x + bw / 2, y0 + bh - h - 10, { size: 11, color: P.ink, align: 'center', alpha: a * g, mono: true });
        });
        line(ctx, x0 - 10, y0 + bh + 0.5, x0 + 6 * (bw + gap), y0 + bh + 0.5, P.inkFaint, 1, a);
        // hopped sliver in S4 from S1
        const hs = a * sp(t, 12.4, 12.9);
        ctx.save(); ctx.globalAlpha = hs; ctx.fillStyle = P.samples[0]; ctx.fillRect(x0 + 3 * (bw + gap), y0 + bh - bh * 0.45, bw, 4); ctx.restore();
        callout(ctx, 'S1 reads inside S4: hopping / cross-talk', x0 + 3 * (bw + gap) + bw / 2, y0 + bh + 32, P, { alpha: hs, size: 11, color: P.alert, align: 'center', to: [x0 + 3 * (bw + gap) + bw / 2, y0 + bh - bh * 0.45 + 4] });
        text(ctx, 'S4: under-pipetted → 2× less depth', x0 + 3 * (bw + gap) + bw / 2, y0 + bh + 48, { size: 10.5, color: P.gold, align: 'center', alpha: hs });
        text(ctx, 'Undetermined: PhiX + reads with unexpected index pairs', 480, y0 + bh + 66, { size: 11.5, color: P.inkDim, align: 'center', alpha: a * sp(t, 12.9, 13.4) });
        text(ctx, 'ask for the sample sheet and the demux report', 480, y0 + bh + 90, { size: 12, color: P.gold, weight: 600, align: 'center', alpha: a * sp(t, 13.2, 13.7) });
      }
    }
  },
};
