// End repair & A-tailing: ragged ends -> blunt -> 5' phosphate -> 3' A; and
// what happens without the A-tail (insert-insert chimeras).
import { prog, sp, win, pulse, lerp, text, callout, line, dot, blob, arrow, roundRect, dsFragment, withAlpha } from '../draw.js';

const X0 = 300, X1 = 660, Y = 220, G = 4;   // insert body (shared part), half gap
const TOP = Y - G, BOT = Y + G;

function rungs(ctx, x0, x1, y0, y1, color, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha * 0.5; ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.beginPath();
  for (let x = x0 + 4; x < x1; x += 9) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  ctx.stroke(); ctx.restore();
}

function pMark(ctx, x, y, P, alpha) {
  if (alpha <= 0) return;
  dot(ctx, x, y, 6, P.gold, alpha);
  text(ctx, 'P', x, y + 0.5, { size: 9, color: P.panel, weight: 700, align: 'center', alpha });
}

export default {
  id: 'end-repair',
  duration: 13,
  thumbT: 8.6,
  phases: [
    { t: 0, label: 'Ragged ends', caption: 'Shearing leaves 5′ and 3′ overhangs, nicks and missing phosphates: nothing a ligase can work with.' },
    { t: 2.4, label: 'Blunting', caption: 'T4 DNA polymerase fills in 5′ overhangs and chews back 3′ overhangs until both ends are flush.' },
    { t: 5.2, label: '5′ phosphates', caption: 'T4 polynucleotide kinase adds the 5′ phosphate that ligation needs.' },
    { t: 7.2, label: 'A-tailing', caption: 'Klenow (exo−) or Taq adds one untemplated A to each 3′ end; the adapter carries the matching T.' },
    { t: 9.6, label: 'Why the A matters', caption: 'Blunt inserts can ligate to each other; the A/T overhang makes insert–insert chimeras rare and orients the adapters.' },
  ],
  draw(ctx, t, W, H, P) {
    const up = sp(t, 9.6, 10.4);          // main molecule shifts up in last phase
    ctx.save(); ctx.translate(0, -60 * up);

    // --- geometry over time ---
    // left end: bottom strand (3'->5' direction, drawn left-to-right as the lower line) extends 28 px further left than top (5' overhang on bottom); top is filled in.
    // right end: top strand extends 24 px beyond bottom (3' overhang on top); it is chewed back.
    const fill = sp(t, 2.8, 4.0), chew = sp(t, 3.4, 4.6);
    const topL = lerp(X0 + 28, X0, fill), topR = lerp(X1 + 24, X1, chew);
    const botL = X0, botR = X1;
    // nick in the top strand that gets sealed
    const nickX = 480, nickW = lerp(10, 0, sp(t, 4.0, 4.6));

    // strands
    line(ctx, topL, TOP, nickX - nickW / 2, TOP, P.dna, 2.6);
    line(ctx, nickX + nickW / 2, TOP, topR, TOP, P.dna, 2.6);
    // newly synthesised fill-in shown gold while it grows
    if (fill > 0 && fill < 1) line(ctx, topL, TOP, X0 + 28, TOP, P.gold, 2.6, 1);
    line(ctx, botL, BOT, botR, BOT, P.dnaLight, 2.6);
    rungs(ctx, Math.max(topL, botL), Math.min(topR, botR), TOP, BOT, P.dna, 1);
    // direction labels
    text(ctx, "5′", topL - 12, TOP - 10, { size: 10, color: P.inkDim });
    text(ctx, "3′", topR + 12, TOP - 10, { size: 10, color: P.inkDim });
    text(ctx, "3′", botL - 12, BOT + 12, { size: 10, color: P.inkDim });
    text(ctx, "5′", botR + 12, BOT + 12, { size: 10, color: P.inkDim });

    // phase 1 callouts
    callout(ctx, '5′ overhang', X0 - 10, 160, P, { alpha: win(t, 0.3, 2.6), to: [X0 + 10, BOT + 2], size: 12, color: P.alert });
    callout(ctx, '3′ overhang', X1 + 40, 160, P, { alpha: win(t, 0.3, 2.6), to: [X1 + 14, TOP - 2], size: 12, color: P.alert, align: 'right' });
    callout(ctx, 'nick', nickX, 290, P, { alpha: win(t, 0.3, 2.6), to: [nickX, TOP + 2], size: 12, color: P.alert, align: 'center' });
    text(ctx, 'no 5′ phosphates', 480, 120, { size: 12, color: P.alert, align: 'center', alpha: win(t, 0.6, 2.6) });

    // phase 2 enzymes
    {
      const a = win(t, 2.4, 5.2, 0.4);
      const bx = lerp(X0 + 40, X0 - 4, sp(t, 2.6, 4.0)), rx = lerp(X1 + 50, X1 + 4, sp(t, 3.2, 4.6));
      blob(ctx, bx, TOP - 24, 14, P.enzyme, { seed: 4, alpha: a });
      blob(ctx, rx, TOP - 24, 14, P.enzyme, { seed: 9, alpha: a });
      text(ctx, 'T4 DNA polymerase', bx, TOP - 50, { size: 11, color: P.inkDim, align: 'center', alpha: a });
      text(ctx, 'fills in', bx, 290, { size: 11.5, color: P.good, align: 'center', alpha: a * sp(t, 2.8, 3.2) });
      text(ctx, 'chews back', rx, 290, { size: 11.5, color: P.good, align: 'center', alpha: a * sp(t, 3.4, 3.8) });
      const bl = pulse(t, 4.6, 5.3);
      text(ctx, 'blunt', 480, 120, { size: 14, color: P.good, weight: 700, align: 'center', alpha: win(t, 4.6, 7.2, 0.3) });
      if (bl > 0) { dot(ctx, X0, Y, 6 + 10 * bl, P.gold, bl * 0.7); dot(ctx, X1, Y, 6 + 10 * bl, P.gold, bl * 0.7); }
    }
    // phase 3 PNK + phosphates
    {
      const a = win(t, 5.2, 7.4, 0.4);
      const pa = sp(t, 5.8, 6.4);
      blob(ctx, 480, TOP - 30 + Math.sin(t * 4) * 3, 13, P.enzyme, { seed: 6, alpha: a });
      text(ctx, 'T4 PNK', 480, TOP - 56, { size: 11, color: P.inkDim, align: 'center', alpha: a });
      pMark(ctx, X0 - 9, TOP, P, pa);
      pMark(ctx, X1 + 9, BOT, P, pa);
      text(ctx, '5′ phosphate on both strands', 480, 290, { size: 12, color: P.inkDim, align: 'center', alpha: a * pa });
    }
    // phase 4 A-tailing (A persists afterwards)
    {
      const a = win(t, 7.2, 9.8, 0.4);
      const g = sp(t, 7.8, 8.4);
      blob(ctx, 480, BOT + 30 - Math.sin(t * 4) * 3, 13, P.enzyme, { seed: 8, alpha: a });
      text(ctx, 'Klenow exo− (or Taq)', 480, BOT + 56, { size: 11, color: P.inkDim, align: 'center', alpha: a });
      if (g > 0) {
        line(ctx, X1, TOP, X1 + 8 * g, TOP, P.dna, 2.6);
        text(ctx, 'A', X1 + 14, TOP - 1, { size: 11, color: P.dna, weight: 700, alpha: g });
        line(ctx, X0, BOT, X0 - 8 * g, BOT, P.dnaLight, 2.6);
        text(ctx, 'A', X0 - 14, BOT + 1, { size: 11, color: P.dnaLight, weight: 700, alpha: g });
        text(ctx, 'single 3′ A overhang, ready for a T-tailed adapter', 480, 330, { size: 12, color: P.inkDim, align: 'center', alpha: a * g });
      }
      // keep the phosphates visible
      pMark(ctx, X0 - 9 - 8 * g * 0, TOP, P, win(t, 7.2, 13.5, 0.01));
      pMark(ctx, X1 + 9, BOT, P, win(t, 7.2, 13.5, 0.01));
    }
    ctx.restore();

    // phase 5: with vs without the A
    {
      const a = win(t, 9.8, 13.5, 0.5);
      if (a > 0) {
        const y1 = 330, y2 = 440;
        // blunt inserts join -> chimera
        const m = sp(t, 10.2, 11.4);
        const ax1 = lerp(240, 400, m), bx0 = lerp(560, 400, m);
        dsFragment(ctx, ax1 - 150, ax1, y1, { colorA: P.dna, colorB: P.dnaLight, alpha: a });
        dsFragment(ctx, bx0, bx0 + 150, y1, { colorA: P.samples[3], colorB: P.samples[3], alpha: a });
        const fl = pulse(t, 11.3, 11.9); if (fl > 0) dot(ctx, 400, y1, 6 + 12 * fl, P.alert, fl * 0.8);
        text(ctx, 'blunt, no A-tail:', 120, y1 - 24, { size: 12, color: P.inkDim, alpha: a });
        text(ctx, 'two inserts ligate → chimera; mates map to two loci', 400, y1 + 26, { size: 12.5, color: P.alert, align: 'center', weight: 600, alpha: a * sp(t, 11.4, 11.9) });
        // A-tailed inserts repel
        const m2 = sp(t, 10.2, 11.4) * (1 - 0.3 * sp(t, 11.4, 12.0));
        const cx1 = lerp(240, 392, m2), dx0 = lerp(560, 408, m2);
        dsFragment(ctx, cx1 - 150, cx1, y2, { colorA: P.dna, colorB: P.dnaLight, alpha: a });
        text(ctx, 'A', cx1 + 6, y2 - 5, { size: 10, color: P.dna, weight: 700, alpha: a });
        dsFragment(ctx, dx0, dx0 + 150, y2, { colorA: P.samples[3], colorB: P.samples[3], alpha: a });
        text(ctx, 'A', dx0 - 6, y2 + 6, { size: 10, color: P.samples[3], weight: 700, alpha: a });
        text(ctx, 'A-tailed:', 120, y2 - 24, { size: 12, color: P.inkDim, alpha: a });
        text(ctx, 'A cannot pair with A: inserts stay apart, adapters (T) are the only partner', 400, y2 + 26, { size: 12.5, color: P.good, align: 'center', weight: 600, alpha: a * sp(t, 11.6, 12.1) });
      }
    }
  },
};
