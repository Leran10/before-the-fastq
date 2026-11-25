// SMRT sequencing: a SMRT Cell with ZMW wells lit from below, one polymerase
// per well, phospholinked nucleotides flashing on incorporation, laps around
// the circle = subreads, pulse timing = methylation, loading P0/P1/P2.
import { prog, sp, win, pulse, lerp, hash, clamp, text, callout, dsPath, blob, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

const FILM = { x0: 80, x1: 880, y0: 230, y1: 330 };
const WELLS = [];
for (let i = 0; i < 9; i++) WELLS.push({ i, x: 125 + i * 90, state: i === 2 ? 0 : i === 6 ? 2 : 1 });

const Z = { x0: 300, x1: 480, y0: 100, y1: 420 };      // zoomed ZMW
const POLY = { x: 390, y: 372 };
const BASES = ['A', 'C', 'G', 'T'];

function wellSlot(ctx, x, y0, y1, w, P, alpha, lit) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = P.panel; ctx.fillRect(x - w / 2, y0, w, y1 - y0);
  if (lit > 0) { const g = ctx.createLinearGradient(0, y1, 0, y1 - (y1 - y0) * 0.35); g.addColorStop(0, withAlpha(P.gold, 0.45 * lit)); g.addColorStop(1, withAlpha(P.gold, 0)); ctx.fillStyle = g; ctx.fillRect(x - w / 2, y0, w, y1 - y0); }
  ctx.restore();
}

function polymerase(ctx, x, y, r, P, alpha, seed = 1, stroke) {
  blob(ctx, x, y, r, P.enzyme, { seed, alpha, stroke: stroke || P.inkDim });
}

// circular SMRTbell path: an ellipse made of two insert arcs (blue) and two adapter arcs (grey)
function bellPath(ctx, cx, cy, rx, ry, P, alpha, o = {}) {
  if (alpha <= 0) return;
  const { lw = 2.4 } = o;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineWidth = lw; ctx.lineCap = 'round';
  const seg = (a0, a1, color) => { ctx.strokeStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, a0, a1); ctx.stroke(); };
  const ad = 0.22;   // adapter arc half-width
  seg(-Math.PI / 2 + ad, Math.PI / 2 - ad, P.dna);          // right insert strand
  seg(Math.PI / 2 + ad, Math.PI * 1.5 - ad, P.dnaLight);    // left insert strand (the other strand)
  seg(-Math.PI / 2 - ad, -Math.PI / 2 + ad, P.enzyme);      // top adapter
  seg(Math.PI / 2 - ad, Math.PI / 2 + ad, P.enzyme);        // bottom adapter
  ctx.restore();
}

export default {
  id: 'smrt-sequencing',
  duration: 14,
  thumbT: 4.8,
  phases: [
    { t: 0, label: 'The SMRT Cell', caption: 'Millions of zero-mode waveguides, holes ~70 nm wide in a metal film. Light from below cannot pass through, so only the bottom few zeptolitres of each well are lit.' },
    { t: 3, label: 'One ZMW', caption: 'A polymerase fixed at the bottom incorporates nucleotides carrying a dye on the phosphate chain: a flash of the base’s colour, then the dye leaves with the pyrophosphate.' },
    { t: 6, label: 'Around the circle', caption: 'The polymerase goes around the SMRTbell again and again: insert, adapter, the other strand, adapter. Each lap is one subread.' },
    { t: 9, label: 'Pulse timing', caption: 'The time between flashes is recorded too. The polymerase slows at 5-methylcytosine, which is how methylation is read without any chemical conversion.' },
    { t: 11.5, label: 'Loading', caption: 'Loading is diffusion: some wells stay empty (P0), some get one polymerase (P1, the productive ones), some get two (P2, discarded). Yield follows P1.' },
  ],
  draw(ctx, t, W, H, P) {
    // ───── scene A: the cell (0 – 3.4) ─────
    const aA = win(t, 0, 3.4, 0.5);
    if (aA > 0) {
      ctx.save(); ctx.globalAlpha *= aA;
      // light from below
      const g = ctx.createLinearGradient(0, 430, 0, FILM.y1); g.addColorStop(0, withAlpha(P.gold, 0.28)); g.addColorStop(1, withAlpha(P.gold, 0.05));
      ctx.fillStyle = g; ctx.fillRect(FILM.x0, FILM.y1, FILM.x1 - FILM.x0, 100);
      // glass + film
      ctx.fillStyle = withAlpha(P.glass, 0.25); ctx.fillRect(FILM.x0, FILM.y1, FILM.x1 - FILM.x0, 10);
      ctx.fillStyle = P.enzymeDim; ctx.fillRect(FILM.x0, FILM.y0, FILM.x1 - FILM.x0, FILM.y1 - FILM.y0);
      ctx.restore();
      WELLS.forEach(w => {
        wellSlot(ctx, w.x, FILM.y0, FILM.y1, 20, P, aA, 1);
        if (w.state >= 1) polymerase(ctx, w.x, FILM.y1 - 9, 7, P, aA, w.i);
        if (w.state === 2) polymerase(ctx, w.x + 6, FILM.y1 - 20, 6, P, aA, w.i + 20, P.alert);
      });
      // labels
      const la = aA * win(t, 0.6, 3.4, 0.3);
      text(ctx, 'metal film', FILM.x1, FILM.y0 - 12, { size: 11.5, color: P.inkDim, align: 'right', alpha: la });
      text(ctx, 'light from below: only the bottom zeptolitres are lit', (FILM.x0 + FILM.x1) / 2, 462, { size: 11.5, color: P.inkDim, align: 'center', alpha: la });
      callout(ctx, 'one ZMW ≈ 70 nm wide, one polymerase at the bottom', 125, 180, P, { alpha: la, size: 12, color: P.ink, to: [125, FILM.y0 - 2] });
      callout(ctx, 'empty (P0)', WELLS[2].x, 200, P, { alpha: la, size: 11, color: P.inkDim, align: 'center', to: [WELLS[2].x, FILM.y0 - 2] });
      callout(ctx, 'two polymerases (P2)', WELLS[6].x, 200, P, { alpha: la, size: 11, color: P.alert, align: 'center', to: [WELLS[6].x, FILM.y0 - 2] });
      text(ctx, '8 M (Sequel II) to 25 M (Revio) wells per cell', (FILM.x0 + FILM.x1) / 2, 60, { size: 13, color: P.ink, align: 'center', alpha: la });
      // many wells hint
      text(ctx, '…', FILM.x1 - 20, (FILM.y0 + FILM.y1) / 2, { size: 16, color: P.inkDim, align: 'center', alpha: la });
    }

    // ───── scene B: zoomed ZMW (3 – 6.4) ─────
    const aB = win(t, 3.0, 6.4, 0.5);
    if (aB > 0) {
      ctx.save(); ctx.globalAlpha *= aB;
      ctx.fillStyle = P.enzymeDim; ctx.fillRect(Z.x0 - 70, Z.y0, 70, Z.y1 - Z.y0); ctx.fillRect(Z.x1, Z.y0, 70, Z.y1 - Z.y0);
      const g = ctx.createLinearGradient(0, Z.y1, 0, Z.y1 - 110); g.addColorStop(0, withAlpha(P.gold, 0.4)); g.addColorStop(1, withAlpha(P.gold, 0));
      ctx.fillStyle = g; ctx.fillRect(Z.x0, Z.y0, Z.x1 - Z.x0, Z.y1 - Z.y0);
      ctx.fillStyle = withAlpha(P.glass, 0.3); ctx.fillRect(Z.x0 - 70, Z.y1, Z.x1 - Z.x0 + 140, 8);
      ctx.restore();
      // SMRTbell as an ellipse through the polymerase
      bellPath(ctx, POLY.x, 300, 55, 95, P, aB);
      polymerase(ctx, POLY.x, POLY.y, 22, P, aB, 3);
      // nucleotides diffusing
      for (let i = 0; i < 14; i++) {
        const x = Z.x0 + 15 + (Z.x1 - Z.x0 - 30) * hash(i, 3) + Math.sin(t * 1.6 + i * 1.3) * 8;
        const y = Z.y0 + 20 + (Z.y1 - Z.y0 - 90) * hash(i, 4) + Math.cos(t * 1.1 + i) * 8;
        const b = BASES[i % 4];
        dot(ctx, x, y, 3, P.inkDim, aB * 0.7);
        dot(ctx, x + 5, y - 4, 2, P.gold, aB * 0.7);   // the dye on the phosphate
      }
      // incorporation flashes
      [[4.0, 'A'], [4.8, 'C'], [5.6, 'G']].forEach(([t0, b]) => {
        const f = pulse(t, t0, t0 + 0.6);
        if (f > 0) { dot(ctx, POLY.x, POLY.y - 2, 14 + 26 * f, P.gold, f * 0.55 * aB); text(ctx, b, POLY.x, POLY.y - 44, { size: 18, color: P.gold, weight: 700, align: 'center', mono: true, alpha: f * aB }); }
      });
      const la = aB * win(t, 3.4, 6.4, 0.3);
      text(ctx, 'phospholinked nucleotide: dye on the phosphate chain', 590, 150, { size: 12, color: P.ink, alpha: la, maxWidth: 330 });
      text(ctx, 'incorporation → a flash of that base’s colour', 590, 176, { size: 11.5, color: P.inkDim, alpha: la });
      text(ctx, 'dye leaves with the pyrophosphate: natural DNA stays', 590, 198, { size: 11.5, color: P.inkDim, alpha: la });
      text(ctx, 'only the lit bottom is imaged, so free dyes above are invisible', 590, 232, { size: 11.5, color: P.inkDim, alpha: la * sp(t, 4.4, 5.0), maxWidth: 330 });
      text(ctx, 'immobilised polymerase', POLY.x, Z.y1 + 24, { size: 11, color: P.inkDim, align: 'center', alpha: la });
      text(ctx, 'SMRTbell', POLY.x, 190, { size: 11, color: P.dna, align: 'center', alpha: la });
    }

    // ───── scene C: laps (6 – 9.4) ─────
    const aC = win(t, 6.0, 9.4, 0.5);
    if (aC > 0) {
      const cx = 230, cy = 290, rx = 115, ry = 150;
      bellPath(ctx, cx, cy, rx, ry, P, aC, { lw: 3 });
      // polymerase runs around: angle grows with time
      const laps = clamp((t - 6.2) / 0.9, 0, 3.4);
      const ang = Math.PI / 2 + laps * Math.PI * 2;        // start at bottom adapter
      polymerase(ctx, cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry, 15, P, aC, 3);
      text(ctx, `pass ${Math.min(4, Math.floor(laps) + 1)}`, cx, cy, { size: 16, color: P.ink, weight: 600, align: 'center', alpha: aC });
      text(ctx, 'adapter', cx, cy - ry - 14, { size: 10.5, color: P.enzyme, align: 'center', alpha: aC });
      text(ctx, 'adapter', cx, cy + ry + 14, { size: 10.5, color: P.enzyme, align: 'center', alpha: aC });
      text(ctx, 'insert', cx + rx + 10, cy, { size: 10.5, color: P.dna, alpha: aC });
      text(ctx, 'other strand', cx - rx - 10, cy, { size: 10.5, color: P.dnaLight, align: 'right', alpha: aC });
      // strip chart of the emerging trace
      const SX = 400, SY = 250, segIns = 100, segAd = 12;
      text(ctx, 'the trace, as it comes off the polymerase', SX, 150, { size: 13, color: P.ink, weight: 600, alpha: aC });
      const total = laps * 2 * (segIns + segAd);          // two halves per lap
      let x = SX, k = 0, drawn = 0;
      while (drawn < total && x < 900) {
        const isAd = k % 2 === 1;
        const w = Math.min(isAd ? segAd : segIns, total - drawn);
        ctx.save(); ctx.globalAlpha *= aC;
        ctx.fillStyle = isAd ? P.enzyme : (Math.floor(k / 2) % 2 === 0 ? P.dna : P.dnaLight);
        ctx.fillRect(x, SY - 7, w, 14);
        ctx.restore();
        if (!isAd && w > 30) arrow(ctx, Math.floor(k / 2) % 2 === 0 ? x + 6 : x + w - 6, SY, Math.floor(k / 2) % 2 === 0 ? x + w - 8 : x + 8, SY, P.panel, { lw: 1.5, head: 6, alpha: aC * 0.9 });
        x += w; drawn += w; k++;
      }
      text(ctx, 'subread 1', SX + segIns / 2, SY + 22, { size: 10.5, color: P.inkDim, align: 'center', alpha: aC * sp(t, 6.6, 7.0) });
      text(ctx, 'subread 2', SX + segIns * 1.5 + segAd, SY + 22, { size: 10.5, color: P.inkDim, align: 'center', alpha: aC * sp(t, 7.1, 7.5) });
      text(ctx, 'subread 3', SX + segIns * 2.5 + segAd * 2, SY + 22, { size: 10.5, color: P.inkDim, align: 'center', alpha: aC * sp(t, 7.6, 8.0) });
      text(ctx, '…', SX + segIns * 3.5 + segAd * 3, SY + 22, { size: 12, color: P.inkDim, align: 'center', alpha: aC * sp(t, 8.1, 8.5) });
      const la = aC * win(t, 7.4, 9.4, 0.3);
      text(ctx, 'each lap = one subread; the adapters split the trace', SX, 300, { size: 12, color: P.ink, alpha: la });
      text(ctx, 'a 15 kb insert in a 24–30 h movie gives ~10–20 passes', SX, 324, { size: 11.5, color: P.inkDim, alpha: la });
      text(ctx, 'shorter inserts: more passes; longer: fewer', SX, 346, { size: 11.5, color: P.inkDim, alpha: la });
    }

    // ───── scene D: pulse timing (9 – 11.9) ─────
    const aD = win(t, 9.0, 11.9, 0.5);
    if (aD > 0) {
      const X = 100, Y = 310, step = 56;
      text(ctx, 'pulse trace: height = base, timing = kinetics', X, 100, { size: 13, color: P.ink, weight: 600, alpha: aD });
      line(ctx, X - 10, Y + 0.5, X + 14 * step, Y + 0.5, P.inkFaint, 1, aD);
      const seq = 'TGACGTCAGCTAG';
      let x = X;
      const grow = sp(t, 9.1, 9.9);
      for (let i = 0; i < seq.length; i++) {
        const gap = i === 3 ? step * 2.4 : step;         // the slow step: the polymerase pauses before the 5mC
        const show = clamp((grow * 14 - i), 0, 1);
        const h = 60 + 50 * hash(i, 8);
        line(ctx, x, Y, x, Y - h * show, i === 4 ? P.gold : P.dna, 3, aD);
        text(ctx, seq[i], x, Y + 16, { size: 13, color: i === 4 ? P.gold : P.inkDim, align: 'center', mono: true, alpha: aD * show });
        const ka = aD * sp(t, 9.8, 10.2);
        if (i === 4) text(ctx, '5mC', x, Y - h - 14, { size: 12, color: P.gold, align: 'center', weight: 600, alpha: ka });
        if (i === 3) {
          // bracket over the long inter-pulse gap that precedes the 5mC
          line(ctx, x + 6, Y - 140, x + gap - 6, Y - 140, P.gold, 1.5, ka);
          line(ctx, x + 6, Y - 140, x + 6, Y - 132, P.gold, 1.5, ka); line(ctx, x + gap - 6, Y - 140, x + gap - 6, Y - 132, P.gold, 1.5, ka);
          text(ctx, 'longer inter-pulse duration', x + gap / 2, Y - 154, { size: 12, color: P.gold, align: 'center', alpha: ka });
        }
        x += gap;
      }
      text(ctx, 'time →', X + 14 * step, Y + 36, { size: 11, color: P.inkDim, align: 'right', alpha: aD });
      const la = aD * win(t, 10.0, 11.9, 0.3);
      text(ctx, 'longer gap before 5mC → methylation read from timing, on native DNA, no conversion', X, 420, { size: 13, color: P.ink, alpha: la, maxWidth: 780 });
      text(ctx, 'written as MM / ML tags in the HiFi BAM (CpG context; Revio on-board, primrose / jasmine on older runs)', X, 448, { size: 12, color: P.inkDim, alpha: la, maxWidth: 780 });
    }

    // ───── scene E: loading (11.5 – 14) ─────
    const aE = win(t, 11.5, 14.5, 0.5);
    if (aE > 0) {
      const wells = [
        { x: 200, label: 'P0: empty', color: P.inkDim, n: 0 },
        { x: 480, label: 'P1: one polymerase', color: P.good, n: 1 },
        { x: 760, label: 'P2: two, discarded', color: P.alert, n: 2 },
      ];
      wells.forEach((w, k) => {
        const a = aE * sp(t, 11.7 + k * 0.3, 12.2 + k * 0.3);
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.enzymeDim; ctx.fillRect(w.x - 60, 150, 44, 120); ctx.fillRect(w.x + 16, 150, 44, 120); ctx.restore();
        wellSlot(ctx, w.x, 150, 270, 32, P, a, 1);
        if (w.n >= 1) polymerase(ctx, w.x, 258, 10, P, a, k + 9);
        if (w.n === 2) polymerase(ctx, w.x + 8, 236, 9, P, a, k + 19, P.alert);
        text(ctx, w.label, w.x, 296, { size: 12.5, color: w.color, align: 'center', weight: 600, alpha: a });
      });
      // bar
      const BX = 160, BY = 360, BW = 640, g = sp(t, 12.6, 13.4) * aE;
      const parts = [[0.2, P.inkFaint, 'P0 ~20 %'], [0.7, P.good, 'P1 60–80 %'], [0.1, P.alert, 'P2']];
      let x = BX;
      parts.forEach(([f, c, l]) => {
        ctx.save(); ctx.globalAlpha *= g; ctx.fillStyle = c; ctx.fillRect(x, BY, BW * f, 18); ctx.restore();
        text(ctx, l, x + BW * f / 2, BY + 34, { size: 11, color: c === P.inkFaint ? P.inkDim : c, align: 'center', alpha: g });
        x += BW * f;
      });
      text(ctx, 'loading is diffusion (Poisson); the P1 fraction sets the yield of the cell', W / 2, 430, { size: 12, color: P.ink, align: 'center', alpha: g });
      text(ctx, 'one molecule per well: no clusters, no optical duplicates, no index hopping', W / 2, 456, { size: 11.5, color: P.good, align: 'center', alpha: g * sp(t, 13.2, 13.8) });
    }
  },
};
