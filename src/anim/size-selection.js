// Bead cleanup & size selection: SPRI bead ratio decides which lengths bind,
// the magnet separates, the supernatant is discarded, and the insert-size
// histogram gets its hard left edge.
import { prog, sp, win, pulse, lerp, hash, text, callout, dsFragment, bead, tube, dot, line, arrow, roundRect, curve, withAlpha } from '../draw.js';

const TUBES = [
  { x: 110, y: 110, w: 120, h: 260, ratio: '1.8×', cut: 0 },      // everything binds
  { x: 330, y: 110, w: 120, h: 260, ratio: '0.8×', cut: 34 },     // only fragments longer than `cut` px bind
];
// fragments per tube: identical set
const FR = [];
for (let i = 0; i < 12; i++) FR.push({ i, len: 16 + hash(i, 3) * 56, fx: 0.12 + hash(i, 5) * 0.6, fy: 0.5 + hash(i, 7) * 0.42, bead: Math.floor(hash(i, 11) * 5) });
const BEADS = [];
for (let b = 0; b < 5; b++) BEADS.push({ b, fx: 0.2 + hash(b, 13) * 0.6, fy: 0.55 + hash(b, 17) * 0.35 });

export default {
  id: 'size-selection',
  duration: 13,
  thumbT: 6.8,
  phases: [
    { t: 0, label: 'Beads in PEG and salt', caption: 'Carboxyl-coated magnetic beads are added in a PEG/salt buffer; the volume ratio of bead solution to sample is the size dial.' },
    { t: 2.6, label: 'Binding depends on length', caption: 'Long molecules precipitate onto the beads at lower PEG concentration; at 1.8× nearly everything binds, at 0.8× short fragments stay in solution.' },
    { t: 5.8, label: 'Magnet, wash, discard', caption: 'A magnet pulls the beads to the wall; the supernatant, with whatever did not bind, is thrown away.' },
    { t: 9.2, label: 'Your insert sizes', caption: 'The lower edge of your insert-size distribution is this ratio, not the shearing; short molecules of interest are lost here too.' },
  ],
  draw(ctx, t, W, H, P) {
    const dim = 1 - 0.45 * sp(t, 9.2, 10.0);
    const beadsIn = sp(t, 0.6, 2.0);
    const bind = sp(t, 2.9, 4.6);
    const mag = sp(t, 6.0, 7.2);
    const drain = sp(t, 7.4, 8.6);
    const elute = sp(t, 8.8, 9.6);

    TUBES.forEach((T, k) => {
      const level = lerp(0.62, 0.08, drain) * (1 - elute) + 0.3 * elute;
      tube(ctx, T.x, T.y, T.w, T.h, P, { level, alpha: dim, label: `${T.ratio} beads : sample` });
      const inner = (fx, fy) => [T.x + T.w * fx, T.y + T.h * fy];
      // magnet
      if (mag > 0) {
        ctx.save(); ctx.globalAlpha = dim * Math.min(1, mag * 2); ctx.fillStyle = P.enzyme;
        roundRect(ctx, T.x + T.w + 6, T.y + T.h * 0.45, 16, 90, 3); ctx.fill();
        ctx.fillStyle = P.alert; ctx.fillRect(T.x + T.w + 6, T.y + T.h * 0.45, 16, 12);
        ctx.restore();
        text(ctx, 'magnet', T.x + T.w + 14, T.y + T.h * 0.45 + 104, { size: 10.5, color: P.inkDim, align: 'center', alpha: dim * mag });
      }
      // bead positions: pour in from top, float, then pull to the right wall
      const beadPos = BEADS.map(b => {
        const [fx0, fy0] = inner(b.fx, b.fy);
        const x0 = lerp(T.x + T.w / 2, fx0, beadsIn), y0 = lerp(T.y - 30, fy0, beadsIn);
        const wx = T.x + T.w - 24, wy = T.y + T.h * 0.5 + (b.b - 2) * 17;
        return [lerp(x0, wx, mag), lerp(y0, wy, mag)];
      });
      // fragments
      FR.forEach(f => {
        const bound = f.len > T.cut;                       // binds in this tube?
        const [px, py] = inner(f.fx, f.fy);
        const bob = Math.sin(t * 1.5 + f.i) * 3 * (1 - bind * (bound ? 1 : 0));
        let x = px, y = py + bob;
        if (bound) {
          const [bx, by] = beadPos[f.bead];
          const ang = hash(f.i, 19) * Math.PI * 2;
          const tx = bx + Math.cos(ang) * 11, ty = by + Math.sin(ang) * 11;
          x = lerp(px, tx, bind); y = lerp(py + bob, ty, bind);
          // after elution the fragments float free again near the beads
          x = lerp(x, T.x + 20 + hash(f.i, 23) * (T.w - 40), elute); y = lerp(y, T.y + T.h * 0.75 + (hash(f.i, 29) - 0.5) * 50, elute);
        } else {
          // unbound: sinks with the draining liquid and is discarded
          y = lerp(py + bob, T.y + T.h * 0.95, drain);
        }
        const a = dim * (bound ? 1 : 1 - prog(drain, 0.6, 1));
        const col = (!bound && drain > 0.2) ? P.alert : P.dna;
        dsFragment(ctx, x - f.len / 2, x + f.len / 2, y, { colorA: col, colorB: bound ? P.dnaLight : col, alpha: a, lw: 2, gap: 5, rungEvery: 7 });
      });
      beadPos.forEach(([x, y]) => bead(ctx, x, y, 8, P, dim * Math.min(1, beadsIn * 3)));
    });

    // phase labels
    text(ctx, 'PEG + salt crowd DNA onto the bead surface', 280, 70, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 0.4, 2.8, 0.3) });
    callout(ctx, 'all lengths bind', 170, 400, P, { alpha: win(t, 3.6, 5.8, 0.3), size: 12, color: P.good, align: 'center' });
    callout(ctx, 'short fragments stay in solution', 390, 400, P, { alpha: win(t, 3.6, 5.8, 0.3), size: 12, color: P.alert, align: 'center' });
    text(ctx, 'supernatant discarded: primers, enzymes, dimers…', 170, 420, { size: 11, color: P.inkDim, align: 'center', alpha: win(t, 7.4, 9.2, 0.3) });
    text(ctx, '…and every short fragment', 390, 420, { size: 11, color: P.alert, align: 'center', alpha: win(t, 7.6, 9.2, 0.3) });
    text(ctx, 'wash 80 % ethanol → elute', 280, 450, { size: 12, color: P.ink, align: 'center', alpha: win(t, 8.6, 9.6, 0.3) });

    // right side: ratio dial always visible as reference
    {
      const a = win(t, 0.3, 13.5, 0.5) * (t > 9.2 ? 0.5 : 1);
      const x = 600, y = 120;
      text(ctx, 'bead ratio → smallest fragment kept', x, y - 20, { size: 12.5, color: P.ink, weight: 600, alpha: a });
      [['1.8×', '~100 bp', 0], ['1.0×', '~200 bp', 1], ['0.8×', '~250 bp', 2], ['0.6×', '~400 bp', 3], ['0.5×', 'large only', 4]].forEach(([r, b, i]) => {
        text(ctx, r, x, y + 10 + i * 22, { size: 12, color: P.inkDim, alpha: a, mono: true });
        text(ctx, b, x + 60, y + 10 + i * 22, { size: 12, color: P.ink, alpha: a, mono: true });
      });
      text(ctx, 'double-sided (e.g. 0.55× then 0.8×) keeps a window', x, y + 10 + 5 * 22 + 6, { size: 11, color: P.inkDim, alpha: a });
    }

    // histogram (phase 4)
    {
      const a = win(t, 9.3, 13.5, 0.6);
      if (a > 0) {
        const hx = 580, hy = 430, hw = 320, hh = 130;
        const edge = 0.22; // position of hard left edge (~250 bp)
        const g = sp(t, 9.6, 10.8);
        const f = u => { const base = Math.exp(-0.5 * ((u - 0.45) / 0.17) ** 2); const tail = Math.exp(-0.5 * ((u - 0.15) / 0.08) ** 2) * 0.5; return (base + tail) * g; };
        // what shearing produced (dashed, including the short tail)
        curve(ctx, hx, hy - hh, hw, hh, f, P.inkFaint, { alpha: a, dash: [4, 3], lw: 1.5 });
        // what survived: cut at edge
        curve(ctx, hx, hy - hh, hw, hh, u => (u < edge ? 0 : f(u)), P.dna, { alpha: a, fill: true, lw: 2 });
        line(ctx, hx + hw * edge, hy - hh, hx + hw * edge, hy, P.gold, 2, a, [5, 3]);
        line(ctx, hx, hy + 0.5, hx + hw, hy + 0.5, P.inkFaint, 1, a);
        [['100', 0.0], ['300', 0.29], ['500', 0.57], ['700', 0.86]].forEach(([l, u]) => text(ctx, l, hx + hw * u, hy + 14, { size: 10.5, color: P.inkDim, align: 'center', alpha: a }));
        text(ctx, 'insert size (bp)', hx + hw / 2, hy + 30, { size: 11, color: P.inkDim, align: 'center', alpha: a });
        callout(ctx, 'hard left edge = bead ratio', hx, hy - hh - 16, P, { alpha: a * sp(t, 10.6, 11.2), size: 12, color: P.gold, to: [hx + hw * edge, hy - hh] });
        text(ctx, 'lost: dimers, but also cfDNA, miRNA, degraded samples', hx + hw / 2, hy + 48, { size: 10.5, color: P.alert, align: 'center', alpha: a * sp(t, 11.2, 11.8) });
        text(ctx, 'dashed: what shearing produced', hx + hw, hy - hh - 16, { size: 10.5, color: P.inkDim, align: 'right', alpha: a * sp(t, 10.2, 10.8) });
      }
    }
  },
};
