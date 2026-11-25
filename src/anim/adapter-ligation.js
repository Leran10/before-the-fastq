// Adapter ligation: an A-tailed insert receives a Y-adapter at each end;
// anatomy of the adapter; and the adapter-dimer failure mode.
import { prog, sp, win, pulse, lerp, text, callout, dsFragment, yAdapter, blob, dot, line, roundRect, baseRow, withAlpha } from '../draw.js';

const CX = 480, CY = 250, INS = 230;          // insert centre and length
const IX0 = CX - INS / 2, IX1 = CX + INS / 2;

export default {
  id: 'adapter-ligation',
  duration: 13,
  thumbT: 6.4,
  phases: [
    { t: 0, label: 'A-tailed insert', caption: 'After end repair every fragment is blunt, phosphorylated and carries a single 3′ A overhang on each strand.' },
    { t: 2.5, label: 'Y-adapters ligate', caption: 'Adapters have a short double-stranded stem with a 3′ T overhang. T4 ligase joins the stem to the insert at both ends.' },
    { t: 5.8, label: 'What the arms carry', caption: 'The two single-stranded arms are different: one carries the P5 side (Read 1 primer, i5, P5), the other the P7 side (Read 2 primer, i7, P7).' },
    { t: 9.3, label: 'Adapter dimer', caption: 'Adapters are in excess; two can ligate to each other with no insert. The result clusters very well and reads as pure adapter.' },
  ],
  draw(ctx, t, W, H, P) {
    // Whole main scene slides up and dims a little in the dimer phase
    const shift = sp(t, 9.3, 10.2);
    const mainAlpha = 1 - 0.45 * shift;
    ctx.save();
    ctx.translate(0, -70 * shift);

    // ---- insert ----
    const a0 = win(t, 0, 14, 0.5);
    dsFragment(ctx, IX0, IX1, CY, { colorA: P.dna, colorB: P.dnaLight, alpha: a0 * mainAlpha, lw: 2.6 });
    // A overhangs: top strand extends to the right (3′), bottom strand to the left
    const showA = 1 - prog(t, 4.9, 5.3);
    if (showA > 0) {
      line(ctx, IX1, CY - 3.5, IX1 + 7, CY - 3.5, P.dna, 2.6, showA * mainAlpha);
      text(ctx, 'A', IX1 + 12, CY - 5, { size: 11, color: P.dna, weight: 700, alpha: showA * mainAlpha });
      line(ctx, IX0, CY + 3.5, IX0 - 7, CY + 3.5, P.dnaLight, 2.6, showA * mainAlpha);
      text(ctx, 'A', IX0 - 12, CY + 6, { size: 11, color: P.dnaLight, weight: 700, alpha: showA * mainAlpha });
    }
    callout(ctx, 'insert (your sample DNA)', CX, CY - 30, P, { alpha: win(t, 0.3, 9.3) * mainAlpha, align: 'center', size: 13, color: P.ink });
    text(ctx, '5′', IX0 - 2, CY - 16, { size: 10, color: P.inkDim, alpha: win(t, 0.3, 2.6), align: 'right' });
    text(ctx, '3′', IX1 + 26, CY - 16, { size: 10, color: P.inkDim, alpha: win(t, 0.3, 2.6) });
    text(ctx, 'blunt ends, 5′ phosphates, 3′ A overhang', CX, CY + 40, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 0.6, 2.6) });

    // ---- adapters approach ----
    const ap = sp(t, 2.6, 5.0);
    const lx = lerp(120, IX0, ap), rx = lerp(840, IX1, ap);
    const adA = win(t, 2.4, 14, 0.4) * mainAlpha;
    const showT = t < 5.0;
    const idxOn = sp(t, 7.0, 7.6);
    yAdapter(ctx, lx, CY, -1, P, { alpha: adA, tOverhang: showT, scale: 1.15, arm: 34, index: idxOn > 0.5 ? P.samples[4] : null });
    yAdapter(ctx, rx, CY, +1, P, { alpha: adA, tOverhang: showT, scale: 1.15, arm: 34, index: idxOn > 0.5 ? P.samples[4] : null });
    // ligase blobs and flashes at the junctions
    {
      const la = win(t, 3.0, 5.8, 0.4) * mainAlpha;
      if (la > 0) {
        const wob = Math.sin(t * 6) * 4;
        blob(ctx, lx - 6, CY - 26 + wob, 13, P.enzyme, { seed: 2, alpha: la });
        blob(ctx, rx + 6, CY + 26 - wob, 13, P.enzyme, { seed: 5, alpha: la });
        text(ctx, 'T4 DNA ligase', lx - 6, CY - 50 + wob, { size: 11, color: P.inkDim, align: 'center', alpha: la });
      }
      const fl = pulse(t, 4.9, 5.7);
      if (fl > 0) { dot(ctx, IX0, CY, 6 + 10 * fl, P.gold, fl * 0.8 * mainAlpha); dot(ctx, IX1, CY, 6 + 10 * fl, P.gold, fl * 0.8 * mainAlpha); }
      text(ctx, 'A pairs with T: adapters cannot ligate in the wrong orientation, inserts cannot ligate to each other', CX, CY + 40, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 3.2, 5.8) * mainAlpha });
    }

    // ---- anatomy callouts ----
    {
      const an = win(t, 5.9, 9.3, 0.5) * mainAlpha;
      if (an > 0) {
        // left adapter: top arm = P5 (teal), bottom = P7 (violet)
        const armTop = [IX0 - 25 - 39, CY - 4 - 21.5];
        const armBot = [IX0 - 25 - 39, CY + 4 + 21.5];
        callout(ctx, 'P5 arm: Read 1 primer site · i5 index · P5 (binds flow cell)', 60, 120, P, { to: armTop, alpha: an, size: 12, color: P.p5 });
        callout(ctx, 'P7 arm: Read 2 primer site · i7 index · P7 (binds flow cell)', 60, 380, P, { to: armBot, alpha: an, size: 12, color: P.p7 });
        // index blocks label
        const ia = win(t, 7.2, 9.3, 0.4) * mainAlpha;
        callout(ctx, 'sample index (i5 / i7), 8–10 nt, read in separate index reads', CX, 410, P, { alpha: ia, align: 'center', size: 12, color: P.ink });
        ctx.save(); ctx.globalAlpha = ia;
        ctx.fillStyle = P.samples[4]; roundRect(ctx, CX - 196, 410 - 3, 12, 6, 2); ctx.fill();
        ctx.restore();
        // the one-cycle-later linear molecule
        const lm = win(t, 6.6, 9.3, 0.5) * mainAlpha;
        if (lm > 0) {
          const y2 = 470;
          text(ctx, 'after the first PCR cycle each strand is linear:', 120, y2 - 26, { size: 12, color: P.inkDim, alpha: lm });
          dsFragment(ctx, 160, 220, y2, { colorA: P.p5, colorB: P.p5, alpha: lm, rungEvery: 7 });
          dsFragment(ctx, 220, 740, y2, { colorA: P.dna, colorB: P.dnaLight, alpha: lm });
          dsFragment(ctx, 740, 800, y2, { colorA: P.p7, colorB: P.p7, alpha: lm, rungEvery: 7 });
          text(ctx, 'P5 · i5 · Rd1 primer', 190, y2 + 18, { size: 10.5, color: P.p5, align: 'center', alpha: lm });
          text(ctx, 'Rd2 primer · i7 · P7', 770, y2 + 18, { size: 10.5, color: P.p7, align: 'center', alpha: lm });
          text(ctx, 'insert', 480, y2 + 18, { size: 10.5, color: P.inkDim, align: 'center', alpha: lm });
          text(ctx, 'both orientations exist in the library (P5 on either end of the original fragment)', 480, y2 + 36, { size: 10.5, color: P.inkFaint, align: 'center', alpha: lm });
        }
      }
    }
    ctx.restore();

    // ---- adapter dimer (phase 3) ----
    {
      const da = win(t, 9.4, 14, 0.5);
      if (da > 0) {
        const y = 380;
        const ap2 = sp(t, 9.8, 11.2);
        const lx2 = lerp(300, 478, ap2), rx2 = lerp(660, 482, ap2);
        yAdapter(ctx, lx2, y, -1, P, { alpha: da, tOverhang: ap2 < 0.98, scale: 1.1, arm: 30 });
        yAdapter(ctx, rx2, y, +1, P, { alpha: da, tOverhang: ap2 < 0.98, scale: 1.1, arm: 30 });
        const fl = pulse(t, 11.1, 11.8);
        if (fl > 0) dot(ctx, 480, y, 6 + 10 * fl, P.alert, fl * 0.8);
        const post = win(t, 11.3, 14, 0.4);
        if (post > 0) {
          ctx.save(); ctx.globalAlpha = post; ctx.strokeStyle = P.alert; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
          roundRect(ctx, 480 - 95, y - 36, 190, 72, 10); ctx.stroke(); ctx.restore();
          text(ctx, 'adapter dimer: no insert, ≈ 120–130 bp', 480, y + 56, { size: 13, color: P.alert, align: 'center', weight: 600, alpha: post });
          text(ctx, 'clusters efficiently, so it steals reads from the whole lane', 480, y + 76, { size: 12, color: P.inkDim, align: 'center', alpha: post });
          // the read it produces
          const seq = 'AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC';
          const upto = Math.floor(seq.length * sp(t, 11.8, 12.9));
          text(ctx, 'R1:', 200, y + 104, { size: 12, color: P.inkDim, mono: true, alpha: post });
          baseRow(ctx, seq, 236, y + 104, { size: 12, step: 11, color: P.alert, upto, alpha: post });
          text(ctx, '← adapter from base 1; trimmers discard it as length 0', 236 + 11 * seq.length + 8, y + 104, { size: 11, color: P.inkDim, alpha: post * sp(t, 12.6, 13) });
        }
        text(ctx, 'adapters are added in molar excess…', 480, y - 70, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 9.5, 11.3, 0.4) });
      }
    }
  },
};
