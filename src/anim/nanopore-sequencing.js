// Nanopore sequencing: strands pulled through pores in a membrane; ionic
// current trace; homopolymers; pore death over the run; adaptive sampling.
import { prog, sp, win, pulse, lerp, hash, clamp, text, ssStrand, blob, dot, line, roundRect, arrow, withAlpha } from '../draw.js';

const MX0 = 60, MX1 = 660, MY0 = 150, MY1 = 178;
const PORES = [150, 270, 390, 510, 630];
const SQX0 = 60, SQX1 = 660, SQY = 300, SQH = 120;
const NSEG = 100, SEGW = (SQX1 - SQX0) / NSEG;
const HP0 = 46, HP1 = 58; // homopolymer segments
const RUN0 = 2.8, RUN1 = 11.2;

function level(k) {
  if (k >= HP0 && k < HP1) return 0.62;
  return 0.2 + 0.6 * hash(k, 3);
}

export default {
  id: 'nanopore-sequencing',
  duration: 14,
  thumbT: 7.2,
  phases: [
    { t: 0, label: 'Pores in a membrane', caption: 'A voltage drives an ionic current through each protein pore; a MinION has 512 channels, a PromethION flow cell ~10,000 pores.' },
    { t: 2.5, label: 'The motor ratchets the strand', caption: 'The motor protein feeds one strand through at ~400 bases per second; bases in the constriction modulate the current.' },
    { t: 6, label: 'Homopolymers', caption: 'Identical bases passing in a row barely change the signal, so homopolymer length must be inferred from dwell time.' },
    { t: 9, label: 'Pores die over the run', caption: 'Pores clog and degrade over 24–72 h; yield per hour falls and late reads come from fewer, older pores.' },
    { t: 11.5, label: 'Adaptive sampling', caption: 'The device can map the first ~500 bases and eject non-target molecules; the rejected stubs are still in your FASTQ.' },
  ],
  draw(ctx, t, W, H, P) {
    const run = prog(t, RUN0, 13.6);
    // ---- membrane ----
    ctx.save();
    ctx.fillStyle = P.enzymeDim; ctx.fillRect(MX0, MY0, MX1 - MX0, MY1 - MY0);
    ctx.strokeStyle = P.enzyme; ctx.lineWidth = 1.5; ctx.strokeRect(MX0, MY0, MX1 - MX0, MY1 - MY0);
    PORES.forEach((px, k) => {
      ctx.fillStyle = P.panel; ctx.fillRect(px - 9, MY0 - 1, 18, MY1 - MY0 + 2);
      ctx.strokeStyle = P.enzyme; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(px, (MY0 + MY1) / 2, 13, 17, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = P.enzymeDim; ctx.beginPath(); ctx.ellipse(px, (MY0 + MY1) / 2, 13, 17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.panel; ctx.fillRect(px - 4, MY0 - 2, 8, MY1 - MY0 + 4);
    });
    ctx.restore();
    text(ctx, 'membrane', MX0, MY1 + 16, { size: 11, color: P.inkDim, alpha: win(t, 0.2, 2.6, 0.3) });
    text(ctx, 'voltage across the membrane → ionic current through each pore', MX0, MY1 + 36, { size: 11, color: P.inkDim, alpha: win(t, 0.2, 2.6, 0.3) });
    text(ctx, 'protein pore (R10.4.1: two reading heads, 5–9 bases in the constriction)', MX0, MY1 + 56, { size: 11, color: P.inkDim, alpha: win(t, 0.4, 2.6, 0.3) });
    // dead pore marks (phase 3)
    const dead = [[0, 9.3], [3, 10.1], [1, 10.9]];
    dead.forEach(([k, at]) => { const a = win(t, at, 14, 0.3); const px = PORES[k]; if (a > 0) { line(ctx, px - 8, MY0 - 6 - 8, px + 8, MY1 + 6 - 14, P.alert, 2.5, a); line(ctx, px + 8, MY0 - 6 - 8, px - 8, MY1 + 6 - 14, P.alert, 2.5, a); } });
    text(ctx, 'blocked / inactive', PORES[0], MY0 - 30, { size: 10.5, color: P.alert, align: 'center', alpha: win(t, 9.6, 14, 0.3) });

    // ---- strand through the focus pore ----
    const fx = PORES[2];
    const dock = sp(t, 2.6, 3.2);
    if (t < 2.6) {
      // strand waiting above with motor
      ssStrand(ctx, fx - 80, 60, fx - 10, 118, { color: P.dna, lw: 2, tickEvery: 7, alpha: win(t, 0.5, 2.6, 0.3) });
      blob(ctx, fx - 10, 122, 10, P.enzyme, { seed: 9, alpha: win(t, 0.5, 2.6, 0.3) });
    } else {
      const total = 10 + 290 * prog(t, RUN0, RUN1 + 2.0);        // length passed (px)
      const above = Math.max(0, 96 - total * 0.3);
      ssStrand(ctx, fx, MY0 - 12 - above, fx, MY0 - 12, { color: P.dna, lw: 2, tickEvery: 7, alpha: dock });
      blob(ctx, fx, MY0 - 10, 10, P.enzyme, { seed: 9, alpha: dock });
      const below = Math.min(total, 100);
      ssStrand(ctx, fx, MY1 + 2, fx, MY1 + 2 + below, { color: P.dna, lw: 2, tickEvery: 7, alpha: dock, side: -1 });
      // read bases counter
      const bases = Math.floor(400 * Math.max(0, t - RUN0));
      text(ctx, `${bases.toLocaleString()} bases read`, fx + 18, MY1 + 40, { size: 11, color: P.inkDim, alpha: dock * win(t, 2.8, 14, 0.2) });
      text(ctx, '≈ 400 b/s', fx + 18, MY1 + 56, { size: 10.5, color: P.inkFaint, alpha: dock * win(t, 2.8, 14, 0.2) });
    }
    // two other pores busy (static-ish), one empty
    [[PORES[1], 1.0], [PORES[4], 0.4]].forEach(([px, ph], k) => {
      const a = 1;
      const wob = Math.sin(t * 3 + ph) * 2;
      ssStrand(ctx, px, MY0 - 60 + wob, px, MY0 - 12, { color: P.dna, lw: 1.8, tickEvery: 7, alpha: 0.8 * (k === 0 ? 1 - prog(t, 10.6, 10.9) : 1) });
      blob(ctx, px, MY0 - 10, 9, P.enzyme, { seed: 20 + k, alpha: 0.9 * (k === 0 ? 1 - prog(t, 10.6, 10.9) : 1) });
      ssStrand(ctx, px, MY1 + 2, px, MY1 + 40 - wob, { color: P.dna, lw: 1.8, tickEvery: 7, alpha: 0.8 * (k === 0 ? 1 - prog(t, 10.6, 10.9) : 1), side: -1 });
    });

    // ---- squiggle ----
    const sa = win(t, 2.6, 14, 0.4);
    if (sa > 0) {
      ctx.save(); ctx.globalAlpha = sa;
      ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.strokeRect(SQX0, SQY, SQX1 - SQX0, SQH);
      ctx.restore();
      text(ctx, 'current (pA)', SQX0, SQY - 12, { size: 11, color: P.inkDim, alpha: sa });
      text(ctx, 'time →', SQX1, SQY + SQH + 14, { size: 10.5, color: P.inkDim, align: 'right', alpha: sa });
      const nSeg = Math.floor(NSEG * prog(t, RUN0, RUN1));
      // homopolymer band
      const hpA = win(t, 6.0, 14, 0.4);
      if (hpA > 0 && nSeg > HP0) {
        ctx.save(); ctx.globalAlpha = hpA * 0.18; ctx.fillStyle = P.alert; ctx.fillRect(SQX0 + HP0 * SEGW, SQY, (Math.min(nSeg, HP1) - HP0) * SEGW, SQH); ctx.restore();
        text(ctx, 'homopolymer: flat signal, length from dwell time only', SQX0 + HP0 * SEGW + 6, SQY + SQH - 12, { size: 11, color: P.alert, alpha: hpA * win(t, 6.2, 14, 0.3) });
      }
      ctx.save(); ctx.globalAlpha = sa; ctx.strokeStyle = P.dna; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let k = 0; k < nSeg; k++) {
        const lv = level(k);
        for (let j = 0; j < 3; j++) {
          const x = SQX0 + k * SEGW + j * SEGW / 3;
          const y = SQY + SQH - (lv + (hash(k * 3 + j, 7) - 0.5) * 0.04) * SQH;
          (k === 0 && j === 0) ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
      }
      ctx.stroke(); ctx.restore();
      // k-mer callout early on
      const ka = win(t, 3.2, 6.0, 0.4);
      text(ctx, 'each level = one k-mer in the pore', SQX0 + 10, SQY + 14, { size: 11, color: P.inkDim, alpha: ka });
    }

    // ---- right panel: active pores over the run ----
    const RX = 720, RY = 60, RW = 180, RH = 120;
    const ra = win(t, 0.6, 14, 0.4);
    text(ctx, 'active pores over the run', RX, RY - 14, { size: 11.5, color: P.ink, weight: 600, alpha: ra });
    ctx.save(); ctx.globalAlpha = ra; ctx.strokeStyle = P.grid; ctx.strokeRect(RX, RY, RW, RH); ctx.restore();
    const f = u => 1 - 0.65 * Math.pow(u, 1.3) - 0.06 * Math.sin(u * 9);
    ctx.save(); ctx.globalAlpha = ra; ctx.strokeStyle = P.enzyme; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const u = i / 60; const x = RX + u * RW, y = RY + RH - f(u) * RH * 0.92; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    dot(ctx, RX + run * RW, RY + RH - f(run) * RH * 0.92, 5, P.gold, ra);
    text(ctx, `${Math.round(1800 * f(run))} pores · ${Math.round(run * 72)} h`, RX, RY + RH + 16, { size: 11, color: P.inkDim, alpha: ra });
    text(ctx, 'wash + reload recovers some', RX, RY + RH + 34, { size: 10.5, color: P.inkFaint, alpha: ra * win(t, 9, 14, 0.3) });
    // right panel: what it means
    const ia = win(t, 9.2, 14, 0.4);
    text(ctx, 'late reads: fewer, older pores', RX, 250, { size: 11.5, color: P.inkDim, alpha: ia });
    text(ctx, 'errors are indels, mostly at', RX, 300, { size: 11.5, color: P.inkDim, alpha: win(t, 6.3, 14, 0.4) });
    text(ctx, 'homopolymers and some k-mers', RX, 318, { size: 11.5, color: P.inkDim, alpha: win(t, 6.3, 14, 0.4) });
    text(ctx, 'raw signal kept as POD5 →', RX, 360, { size: 11.5, color: P.inkDim, alpha: win(t, 4.0, 14, 0.4) });
    text(ctx, 'can be re-basecalled later', RX, 378, { size: 11.5, color: P.inkDim, alpha: win(t, 4.0, 14, 0.4) });

    // ---- adaptive sampling at pore 3 ----
    const ax = PORES[3];
    const asIn = sp(t, 11.7, 12.3), asOut = sp(t, 12.8, 13.5);
    const asA = win(t, 11.6, 14, 0.3);
    if (asA > 0) {
      const len = 50 * asIn * (1 - asOut);
      ssStrand(ctx, ax, MY0 - 12 - 70 + 70 * asOut, ax, MY0 - 12, { color: asOut > 0 ? P.alert : P.dna, lw: 2, tickEvery: 7, alpha: asA });
      blob(ctx, ax, MY0 - 10, 10, P.enzyme, { seed: 31, alpha: asA });
      ssStrand(ctx, ax, MY1 + 2, ax, MY1 + 2 + len, { color: asOut > 0 ? P.alert : P.dna, lw: 2, tickEvery: 7, alpha: asA, side: -1 });
      const la = win(t, 12.2, 14, 0.3);
      text(ctx, 'map ~500 b → not a target → eject', ax + 16, MY0 - 44, { size: 11, color: P.alert, alpha: la });
      text(ctx, 'rejected stub still in the FASTQ', ax + 16, MY1 + 72, { size: 11, color: P.alert, alpha: la * sp(t, 12.9, 13.3) });
      if (asOut > 0 && asOut < 1) arrow(ctx, ax + 8, MY0 - 20, ax + 8, MY0 - 60, P.alert, { lw: 1.5, head: 6, alpha: asA });
    }
  },
};
