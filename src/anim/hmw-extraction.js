// HMW DNA extraction: gentle lysis keeps DNA long (left) vs bead beating
// shears it (right); short fragments removed; Gram-positives stay intact.
// End: read-length histograms and the missing taxon.
import { prog, sp, win, pulse, lerp, hash, text, cellShape, bead, dsPath, dsFragment, shake, line, roundRect, withAlpha, clamp } from '../draw.js';

const LX0 = 60, LX1 = 460, RX0 = 500, RX1 = 900, Y0 = 70, Y1 = 380;
const CELLS = [];
for (let i = 0; i < 5; i++) CELLS.push({ i, x: 90 + 70 * i + 20 * hash(i, 1), y: 130 + 40 * hash(i, 2), gram: i === 3, rod: i % 2 === 1 });

function wave(x0, x1, y, amp, ph, n = 60) { const pts = []; for (let k = 0; k <= n; k++) { const u = k / n; const x = lerp(x0, x1, u); pts.push([x, y + Math.sin(x * 0.045 + ph) * amp + Math.sin(x * 0.11 + ph * 2) * amp * 0.4]); } return pts; }

export default {
  id: 'hmw-extraction',
  duration: 12,
  thumbT: 4.6,
  phases: [
    { t: 0, label: 'Two ways to lyse', caption: 'Left: gentle lysis with proteinase K and SDS. Right: bead beating. Same cells, different DNA.' },
    { t: 2, label: 'Lysis', caption: 'Gentle lysis releases DNA at tens to hundreds of kilobases; beads break every cell but shear DNA to a few kilobases.' },
    { t: 5.5, label: 'Remove short fragments', caption: 'A 0.4× bead ratio or the Short Read Eliminator discards fragments under ~25 kb to raise N50, at the cost of yield.' },
    { t: 8, label: 'What you receive', caption: 'Read length is set here, not by the sequencer, and the taxa that resisted gentle lysis are simply missing.' },
  ],
  draw(ctx, t, W, H, P) {
    const sceneA = 1 - 0.88 * sp(t, 8, 8.7);
    ctx.save(); ctx.globalAlpha = sceneA;
    [[LX0, LX1, 'gentle lysis: proteinase K + SDS, wide-bore tips, no vortex'], [RX0, RX1, 'bead beating']].forEach(([x0, x1, label]) => {
      ctx.fillStyle = withAlpha(P.liquid, 0.3); ctx.strokeStyle = P.grid; ctx.lineWidth = 1.5;
      roundRect(ctx, x0, Y0, x1 - x0, Y1 - Y0, 12); ctx.fill(); ctx.stroke();
      text(ctx, label, x0, Y0 - 14, { size: 12, color: P.inkDim, maxWidth: x1 - x0 });
    });
    const lys = sp(t, 2.2, 4.6);
    const [shx, shy] = shake(t, 5 * pulse(t, 2.0, 5.2), 45);
    // left: cells dissolve (except Gram-positive) and long DNA appears
    CELLS.forEach(c => {
      const a = c.gram ? 1 : 1 - lys;
      cellShape(ctx, c.x, c.y, 15, P, { rod: c.rod, alpha: a, wall: c.gram ? 2.2 : 1, seed: c.i });
      if (c.gram) {
        const ga = win(t, 4.6, 8, 0.4);
        ctx.save(); ctx.globalAlpha *= ga; ctx.strokeStyle = P.alert; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x, c.y, 24, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        text(ctx, 'Gram-positive: still intact', c.x, c.y - 34, { size: 10.5, color: P.alert, align: 'center', alpha: ga });
      }
    });
    // long strands (left)
    for (let s = 0; s < 3; s++) {
      const a = lys * (s === 2 ? 1 : 1);
      if (a <= 0) continue;
      const y = 230 + s * 42;
      const x1 = LX0 + 20 + (LX1 - LX0 - 40) * (0.6 + 0.4 * hash(s, 9)) * lys;
      // the shortest one gets removed in phase 2
      const isShort = s === 1;
      const rem = isShort ? 1 - sp(t, 5.8, 6.8) : 1;
      const len = isShort ? 110 : x1 - LX0 - 20;
      dsPath(ctx, wave(LX0 + 20, LX0 + 20 + len * lys, y, 6, s), { colorA: isShort && rem < 1 ? P.alert : P.dna, colorB: isShort && rem < 1 ? P.alert : P.dnaLight, alpha: a * rem, lw: 2.2 });
    }
    text(ctx, '50–200 kb', LX1 - 20, 206, { size: 10.5, color: P.dna, align: 'right', alpha: lys });
    text(ctx, '< 25 kb: removed', LX0 + 150, 288, { size: 10.5, color: P.alert, alpha: win(t, 5.8, 8, 0.3) });
    // right: cells + beads shaking, DNA fragments short
    for (let i = 0; i < 5; i++) {
      const cx = RX0 + 50 + 75 * i + shx * (i % 2 ? 1 : -1), cy = 130 + 40 * hash(i, 2) + shy;
      cellShape(ctx, cx, cy, 15, P, { rod: i % 2 === 1, alpha: 1 - lys, wall: i === 3 ? 2.2 : 1, seed: i + 5 });
    }
    for (let b = 0; b < 9; b++) {
      const bx = RX0 + 30 + (RX1 - RX0 - 60) * hash(b, 31) + shx * (b % 2 ? 1.5 : -1.5), by = Y0 + 30 + 120 * hash(b, 32) + shy * (b % 3 ? 1 : -1);
      bead(ctx, bx, by, 7, P);
    }
    for (let f = 0; f < 22; f++) {
      const a = lys;
      const fx = RX0 + 20 + (RX1 - RX0 - 70) * hash(f, 41), fy = 215 + 150 * hash(f, 42);
      const len = 12 + 30 * hash(f, 43);
      dsFragment(ctx, fx, fx + len * lys, fy, { colorA: P.dna, colorB: P.dnaLight, alpha: a, lw: 2, gap: 5, rungEvery: 6 });
    }
    text(ctx, '2–10 kb', RX1 - 20, 230, { size: 10.5, color: P.dna, align: 'right', alpha: lys });
    text(ctx, 'every cell broken, DNA sheared', (RX0 + RX1) / 2, Y1 + 16, { size: 11, color: P.inkDim, align: 'center', alpha: win(t, 3.2, 8, 0.4) });
    text(ctx, 'long DNA, but tough cells survive', (LX0 + LX1) / 2, Y1 + 16, { size: 11, color: P.inkDim, align: 'center', alpha: win(t, 3.2, 8, 0.4) });
    ctx.restore();

    // ---- histograms ----
    const ha = win(t, 8.2, 14, 0.5);
    if (ha > 0) {
      const g = sp(t, 8.5, 10);
      const panels = [
        { x: 90, title: 'gentle + size selection', mu: 0.72, sd: 0.11, n50: 'N50 ≈ 50 kb', c: P.dna },
        { x: 530, title: 'bead beating', mu: 0.28, sd: 0.12, n50: 'N50 ≈ 5 kb', c: P.dna },
      ];
      panels.forEach(p => {
        const X = p.x, Y = 120, Wd = 340, Hd = 200;
        text(ctx, p.title, X, Y - 22, { size: 13, color: P.ink, weight: 600, alpha: ha });
        line(ctx, X, Y + Hd + 0.5, X + Wd, Y + Hd + 0.5, P.inkFaint, 1, ha);
        ['1 kb', '10 kb', '100 kb'].forEach((lab, k) => { const x = X + (0.1 + k * 0.4) * Wd; line(ctx, x, Y + Hd, x, Y + Hd + 5, P.inkFaint, 1, ha); text(ctx, lab, x, Y + Hd + 16, { size: 10.5, color: P.inkDim, align: 'center', alpha: ha }); });
        text(ctx, 'read length (log)', X + Wd, Y + Hd + 34, { size: 10.5, color: P.inkDim, align: 'right', alpha: ha });
        ctx.save(); ctx.globalAlpha = ha; ctx.fillStyle = withAlpha(p.c, 0.25); ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.beginPath();
        const N = 60;
        for (let i = 0; i <= N; i++) { const u = i / N; const v = Math.exp(-0.5 * ((u - p.mu) / p.sd) ** 2) * g; const px = X + u * Wd, py = Y + Hd - v * Hd * 0.9; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke(); ctx.lineTo(X + Wd, Y + Hd); ctx.lineTo(X, Y + Hd); ctx.closePath(); ctx.fill(); ctx.restore();
        text(ctx, p.n50, X + p.mu * Wd, Y + 10, { size: 12, color: P.gold, align: 'center', weight: 600, alpha: ha * g });
      });
      text(ctx, 'and in the gentle prep, the Gram-positive taxa are under-represented or absent: compare with a bead-beaten short-read profile', 480, 420, { size: 11.5, color: P.alert, align: 'center', alpha: ha * sp(t, 10, 10.8), maxWidth: 820 });
    }
  },
};
