// Library amplification: copies, not new molecules. Duplicates, GC bias,
// inherited errors, chimeras.
import { prog, sp, win, pulse, lerp, clamp, hash, text, callout, libraryMolecule, dsFragment, ssStrand, blob, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

const COLS = [
  { x: 120, insert: 56, eff: 1.0, tag: '1' },
  { x: 240, insert: 48, eff: 1.0, tag: '2', error: true },
  { x: 360, insert: 62, eff: 1.0, tag: '3', dup: true },
  { x: 480, insert: 52, eff: 0.55, tag: '4', gc: true },
  { x: 600, insert: 44, eff: 1.0, tag: '5' },
];
const ROW0 = 150, ROWH = 17, MAXROWS = 15;
const CYCLES = 6;

export default {
  id: 'pcr-amplification',
  duration: 14,
  thumbT: 9.2,
  phases: [
    { t: 0, label: 'A few molecules', caption: 'After ligation there are only a few nanograms of library: a fixed number of unique molecules.' },
    { t: 2.5, label: 'Cycles copy, they do not add', caption: 'Each cycle doubles the copies of every molecule that amplifies well. The number of distinct molecules never increases.' },
    { t: 8, label: 'Duplicates, bias, inherited errors', caption: 'Copies that both reach the flow cell are PCR duplicates. Slow amplifiers fall behind. An early error is inherited by many copies.' },
    { t: 11, label: 'Chimeras', caption: 'When primers run low, an incomplete product can prime on a different template, joining two molecules that were never joined in the sample.' },
  ],
  draw(ctx, t, W, H, P) {
    const cycleF = prog(t, 2.5, 8) * CYCLES;        // continuous 0..6
    const cycle = Math.floor(cycleF);
    const dimMain = 1 - 0.55 * sp(t, 11, 11.8);

    // ---- columns of copies ----
    COLS.forEach((c, k) => {
      const count = Math.min(MAXROWS, Math.pow(2, cycleF * c.eff));
      const nFull = Math.floor(count), frac = count - nFull;
      for (let i = 0; i < Math.min(MAXROWS, nFull + 1); i++) {
        const isOriginal = i === 0;
        const a = isOriginal ? 1 : (i < nFull ? 1 : frac);
        if (a <= 0) continue;
        const y = ROW0 + i * ROWH;
        const highlightDup = c.dup && win(t, 8.2, 11, 0.4) > 0 && !isOriginal;
        libraryMolecule(ctx, c.x, y, c.insert, P, { alpha: a * dimMain, insertColor: c.gc ? P.dna : P.dnaLight, gap: 4.5, lw: 2, adapterLen: 12, highlight: highlightDup ? withAlpha(P.gold, win(t, 8.2, 11, 0.4)) : null });
        // inherited polymerase error: introduced in cycle 1 in one copy; half the descendants carry it
        if (c.error && i > 0 && i % 2 === 1 && cycleF >= 1) {
          dot(ctx, c.x - 6, y, 2.6, P.alert, a * dimMain * win(t, 3.4, 14, 0.5));
        }
      }
      if (nFull >= MAXROWS) text(ctx, `… ×${Math.round(Math.pow(2, cycleF * c.eff))}`, c.x, ROW0 + MAXROWS * ROWH + 4, { size: 11, color: P.inkDim, align: 'center', alpha: dimMain });
      // original tag
      ctx.save(); ctx.globalAlpha = dimMain;
      ctx.fillStyle = c.gc ? P.gold : P.inkFaint;
      ctx.beginPath(); ctx.arc(c.x - c.insert / 2 - 26, ROW0, 7, 0, Math.PI * 2); ctx.fill();
      text(ctx, c.tag, c.x - c.insert / 2 - 26, ROW0, { size: 9, color: '#fff', align: 'center', weight: 700 });
      ctx.restore();
      if (c.gc) text(ctx, 'GC-rich', c.x, ROW0 - 20, { size: 11, color: P.gold, align: 'center', alpha: dimMain * win(t, 0.5, 14) });
    });
    text(ctx, 'five unique molecules', 120, 110, { size: 13, color: P.ink, weight: 600, alpha: win(t, 0.3, 2.6) });
    text(ctx, 'input: a few ng', 120, 128, { size: 12, color: P.inkDim, alpha: win(t, 0.3, 2.6) });

    // polymerase roaming during cycling
    {
      const a = win(t, 2.5, 8, 0.4) * dimMain;
      if (a > 0) {
        const u = (t * 0.35) % 1;
        const px = lerp(90, 640, u), py = ROW0 + 6 + (Math.sin(t * 4) * 0.5 + 0.5) * Math.min(MAXROWS - 1, Math.pow(2, cycleF)) * ROWH;
        blob(ctx, px, py, 10, P.enzyme, { seed: 7, alpha: a });
      }
    }

    // ---- right panel: cycle counter and notes ----
    const RX = 700;
    {
      const a = win(t, 2.4, 11, 0.4);
      if (a > 0) {
        text(ctx, 'cycle', RX, 120, { size: 12, color: P.inkDim, alpha: a });
        text(ctx, String(Math.min(CYCLES, cycle)), RX + 46, 118, { size: 30, color: P.ink, weight: 700, alpha: a, mono: true });
        text(ctx, 'of 6–18', RX + 92, 124, { size: 12, color: P.inkDim, alpha: a });
        // thermal cycle icon
        const ph = (cycleF % 1);
        const stage = ph < 0.33 ? 'denature 98 °C' : ph < 0.66 ? 'anneal 60 °C' : 'extend 72 °C';
        text(ctx, cycleF < CYCLES ? stage : 'hold 4 °C', RX, 150, { size: 11.5, color: P.inkFaint, alpha: a, mono: true });
        // molecule counts
        const uniq = 5;
        const total = COLS.reduce((s, c) => s + Math.pow(2, cycleF * c.eff), 0);
        text(ctx, 'unique molecules', RX, 196, { size: 12, color: P.inkDim, alpha: a });
        text(ctx, String(uniq), RX + 150, 196, { size: 14, color: P.good, weight: 700, alpha: a, mono: true });
        text(ctx, 'total copies', RX, 220, { size: 12, color: P.inkDim, alpha: a });
        text(ctx, String(Math.round(total)), RX + 150, 220, { size: 14, color: P.ink, weight: 700, alpha: a, mono: true });
        line(ctx, RX, 240, RX + 220, 240, P.grid, 1, a);
      }
      // consequence notes (phase 2)
      const b = win(t, 8.2, 11.2, 0.5);
      if (b > 0) {
        const notes = [
          [P.gold, 'duplicates', 'copies of molecule 3: identical start and end coordinates in your BAM'],
          [P.gold, 'GC bias', 'molecule 4 amplified at 55 % efficiency: under-covered after sequencing'],
          [P.alert, 'inherited error', 'a cycle-1 error in molecule 2 is now in half its copies: looks like a real variant'],
        ];
        notes.forEach((n, i) => {
          const na = b * win(t, 8.4 + i * 0.5, 11.2, 0.4);
          const y = 262 + i * 66;
          dot(ctx, RX + 5, y + 2, 4, n[0], na);
          text(ctx, n[1], RX + 16, y, { size: 12.5, color: P.ink, weight: 600, alpha: na });
          wrap(ctx, n[2], RX + 16, y + 17, 230, 12, P.inkDim, na);
        });
      }
    }

    // ---- phase 3: chimera ----
    {
      const a = win(t, 11.2, 14.5, 0.5);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = withAlpha(P.panel, 0.85); ctx.fillRect(40, 380, 880, 140); ctx.restore();
        const y = 440;
        // template B (another genome) and the incomplete product from A annealing
        const mv = sp(t, 11.6, 12.6);
        const ext = sp(t, 12.7, 13.6);
        text(ctx, 'template from genome B', 700, y + 24, { size: 11.5, color: P.samples[4], alpha: a, align: 'right' });
        ssStrand(ctx, 440, y + 8, 700, y + 8, { color: P.samples[4], alpha: a, side: 1, ticks: true, tickEvery: 8 });
        // incomplete product: 5' half from genome A, anneals by a shared stretch
        const px0 = lerp(200, 480, mv), px1 = px0 + 120;
        const py = lerp(y - 44, y - 2, mv);
        ssStrand(ctx, px0, py, px1, py, { color: P.dna, alpha: a, side: -1, tickEvery: 8, lw: 3 });
        text(ctx, 'incomplete product from genome A', px0, py - 16, { size: 11.5, color: P.dna, alpha: a * (1 - prog(t, 12.4, 12.8)) });
        // extension on template B
        if (ext > 0) {
          ssStrand(ctx, px1, y - 2, px1 + 200 * ext, y - 2, { color: P.samples[4], alpha: a, side: -1, tickEvery: 8, lw: 3 });
          blob(ctx, px1 + 200 * ext + 8, y - 12, 9, P.enzyme, { seed: 3, alpha: a * (1 - prog(t, 13.5, 13.8)) });
        }
        const done = win(t, 13.6, 14.5, 0.3);
        if (done > 0) {
          ctx.save(); ctx.globalAlpha = done; ctx.strokeStyle = P.alert; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
          roundRect(ctx, px0 - 10, y - 14, 320 + 20, 22, 8); ctx.stroke(); ctx.restore();
          text(ctx, 'chimera: half A, half B. Mates map to two genomes; in amplicons it becomes a new “species”.', 480, y + 44, { size: 12, color: P.alert, align: 'center', alpha: done });
        }
        text(ctx, 'PCR-free protocols skip this step: no duplicates, flatter coverage, but need ≥ 1 µg input', 480, 508, { size: 11.5, color: P.inkDim, align: 'center', alpha: a * win(t, 12, 14.5, 0.4) });
      }
    }
  },
};

function wrap(ctx, str, x, y, maxW, size, color, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.font = `${size}px ui-sans-serif, system-ui, sans-serif`;
  const words = str.split(' '); let lineStr = '', ly = y;
  for (const w of words) {
    const test = lineStr ? lineStr + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && lineStr) { text(ctx, lineStr, x, ly, { size, color, alpha }); lineStr = w; ly += size + 3; }
    else lineStr = test;
  }
  if (lineStr) text(ctx, lineStr, x, ly, { size, color, alpha });
  ctx.restore();
}
