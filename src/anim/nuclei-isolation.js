// Nuclei isolation for ATAC: cells are counted, gently lysed so cytoplasm and
// mitochondria float away, washed, and the intact nuclei are counted into the
// transposition. One dead cell shows where background comes from, and the last
// frame shows why the chrM read fraction is decided here.
import { prog, sp, win, pulse, lerp, hash, text, cellShape, dot, line, arrow, roundRect, withAlpha, footnote } from '../draw.js';

const R = 50;
const CELLS = [
  { x: 150, y: 160, ci: 0 },
  { x: 330, y: 130, ci: 3 },
  { x: 500, y: 175, ci: 1 },
  { x: 190, y: 350, ci: 2 },
  { x: 375, y: 320, ci: 0 },
  { x: 545, y: 375, ci: 4, dead: true },
];
// mitochondria per cell: polar offsets outside the nucleus
const MITO = CELLS.map((c, k) => Array.from({ length: 6 }, (_, i) => ({
  a: (i / 6) * Math.PI * 2 + hash(i + k * 7, 1) * 0.7,
  d: R * (0.55 + 0.3 * hash(i + k * 7, 2)),
  rot: hash(i + k * 7, 3) * Math.PI,
})));
// nucleus offset per cell
const NUC = CELLS.map((c, k) => ({ dx: (hash(k, 5) - 0.5) * 14, dy: (hash(k, 6) - 0.5) * 14 }));
// leaked chromatin pieces of the dead cell
const LEAK = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2 + hash(i, 9) * 0.5, d: 40 + 90 * hash(i, 10), r: 2 + 2 * hash(i, 11) }));

const PX = 650, PW = 250;  // right-hand panel

function panelBox(ctx, y, h, P, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = P.panel; ctx.strokeStyle = P.grid; ctx.lineWidth = 1;
  roundRect(ctx, PX, y, PW, h, 10); ctx.fill(); ctx.stroke();
  ctx.restore();
}

export default {
  id: 'nuclei-isolation',
  duration: 14,
  thumbT: 4.6,
  phases: [
    { t: 0, label: 'Count and check viability', caption: 'Cells are counted with trypan blue or an automated counter and a fixed number, typically 50,000 viable cells, goes into the prep. One of these cells is already dying.' },
    { t: 2.5, label: 'Gentle lysis on ice', caption: 'NP-40, Tween-20 and digitonin open the plasma membrane and permeabilise mitochondria for about three minutes. Nuclear membranes stay intact; the dead cell’s fragmented chromatin spills out.' },
    { t: 5.5, label: 'Wash away cytoplasm', caption: 'A Tween-only wash and a spin strip cytoplasm and mitochondria from the nuclei. Without this wash (the 2013 protocol) the mitochondria stay and become reads.' },
    { t: 8, label: 'Count the nuclei', caption: 'Intact nuclei are counted again and 50,000 go into transposition; this number is also the enzyme-to-substrate ratio of the next step. Debris counted as cells under-loads Tn5.' },
    { t: 10.5, label: 'Where chrM reads come from', caption: 'chrM has no nucleosomes, so every mitochondrion left behind yields reads. Dead cells add a flat genome-wide background instead: same read count, no ladder, low TSS enrichment.' },
  ],
  draw(ctx, t, W, H, P) {
    const lyse = sp(t, 2.8, 4.3);          // membranes dissolve
    const drift = sp(t, 3.2, 5.6);         // mitochondria drift outward
    const wash = sp(t, 5.9, 7.6);          // debris falls away
    const leak = sp(t, 3.4, 5.0);          // dead cell chromatin leaks
    const count = sp(t, 8.3, 9.2);
    const scene = 1 - 0.55 * sp(t, 10.6, 11.4);

    text(ctx, t < 2.5 ? 'cell suspension, on ice' : t < 5.5 ? 'lysis buffer: NP-40 + Tween-20 + digitonin, 3 min' : t < 8 ? 'wash buffer, spin 500 g' : t < 10.5 ? 'nuclei on ice, counted' : 'what the suspension becomes in the data', 345, 48, { size: 13, color: P.inkDim, align: 'center' });

    ctx.save(); ctx.globalAlpha *= scene;
    CELLS.forEach((c, k) => {
      const nx = c.x + NUC[k].dx, ny = c.y + NUC[k].dy;
      const memA = c.dead ? (1 - lyse) * 0.8 : 1 - lyse;
      // cytoplasm + membrane
      cellShape(ctx, c.x, c.y, R, P, { alpha: memA, stroke: c.dead ? P.alert : P.membrane, fill: withAlpha(P.cell, 0.9) });
      if (c.dead && lyse < 1) {
        // ragged membrane: a few breaks
        ctx.save(); ctx.globalAlpha *= (1 - lyse);
        ctx.strokeStyle = P.bg; ctx.lineWidth = 4;
        for (let i = 0; i < 3; i++) { const a = 0.7 + i * 2.1; ctx.beginPath(); ctx.arc(c.x, c.y, R, a, a + 0.25); ctx.stroke(); }
        ctx.restore();
      }
      // mitochondria
      MITO[k].forEach((m, i) => {
        const d = m.d * (1 + 1.5 * drift * (0.7 + 0.6 * hash(i + k, 20)));
        const mx = c.x + Math.cos(m.a) * d, my = c.y + Math.sin(m.a) * d + 170 * wash * (0.6 + 0.8 * hash(i + k, 21));
        const a = (1 - wash) * (c.dead ? 0.7 : 1);
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha *= a; ctx.translate(mx, my); ctx.rotate(m.rot);
        ctx.fillStyle = P.enzymeDim; ctx.strokeStyle = P.enzyme; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
      // nucleus
      if (!c.dead) {
        const ring = count > 0 ? 0.35 + 0.35 * pulse(t % 1.2, 0, 1.2) : 0;
        if (ring > 0) dot(ctx, nx, ny, 25, P.gold, ring * count * 0.5);
        ctx.save(); ctx.fillStyle = P.samples[c.ci]; ctx.strokeStyle = P.ink; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(nx, ny, 18, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha *= 0.5; ctx.stroke(); ctx.restore();
        // chromatin texture
        for (let i = 0; i < 5; i++) dot(ctx, nx + (hash(i, k + 30) - 0.5) * 20, ny + (hash(i, k + 40) - 0.5) * 20, 2.2, withAlpha(P.ink, 0.35), 1);
      } else {
        // dead cell: nucleus bursts, chromatin fragments leak out and stay as background
        const core = 1 - leak;
        if (core > 0) { ctx.save(); ctx.globalAlpha *= core; ctx.fillStyle = withAlpha(P.alert, 0.7); ctx.beginPath(); ctx.arc(nx, ny, 18 * (1 + 0.6 * leak), 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        LEAK.forEach((p, i) => {
          const d = p.d * leak;
          const lx = nx + Math.cos(p.a) * d, ly = ny + Math.sin(p.a) * d + 40 * wash * hash(i, 12);
          dot(ctx, lx, ly, p.r, P.alert, leak * (1 - 0.45 * wash));
        });
      }
    });
    ctx.restore();

    // labels in the scene
    text(ctx, 'dying cell', CELLS[5].x, CELLS[5].y + R + 18, { size: 11.5, color: P.alert, align: 'center', alpha: win(t, 0.6, 2.6, 0.3) * scene });
    text(ctx, 'mitochondria', CELLS[1].x + 62, CELLS[1].y - 44, { size: 11.5, color: P.inkDim, alpha: win(t, 0.9, 2.6, 0.3) * scene });
    text(ctx, 'nuclei stay intact', 340, 240, { size: 12.5, color: P.ink, align: 'center', alpha: win(t, 4.2, 5.6, 0.3) * scene });
    text(ctx, 'fragmented chromatin leaks out', CELLS[5].x - 20, CELLS[5].y + R + 40, { size: 11.5, color: P.alert, align: 'center', alpha: win(t, 4.0, 7.8, 0.3) * scene });
    text(ctx, 'cytoplasm + mitochondria washed away', 300, 490, { size: 12.5, color: P.inkDim, align: 'center', alpha: win(t, 6.3, 8.0, 0.3) * scene });
    text(ctx, 'background, not signal', CELLS[5].x - 20, CELLS[5].y + R + 40, { size: 11.5, color: P.alert, align: 'center', alpha: win(t, 8.0, 10.6, 0.3) * scene });

    // ── right panel: counter → nuclei count → chrM bars ──
    {
      const a1 = win(t, 0.3, 8.0, 0.3);
      panelBox(ctx, 90, 150, P, a1);
      text(ctx, 'cell count', PX + 16, 116, { size: 12, color: P.inkDim, alpha: a1 });
      text(ctx, '50,000 viable cells', PX + 16, 146, { size: 17, color: P.ink, weight: 600, alpha: a1 });
      text(ctx, 'viability 92 %  (≥ 90 % wanted)', PX + 16, 176, { size: 12.5, color: P.good, alpha: a1 });
      text(ctx, 'trypan blue · automated counter', PX + 16, 206, { size: 11, color: P.inkFaint, alpha: a1 });
    }
    {
      const a2 = win(t, 8.0, 10.6, 0.3);
      panelBox(ctx, 90, 150, P, a2);
      text(ctx, 'nuclei count after lysis', PX + 16, 116, { size: 12, color: P.inkDim, alpha: a2 });
      const n = Math.round(50000 * count);
      text(ctx, n.toLocaleString('en-US') + ' nuclei', PX + 16, 146, { size: 17, color: P.gold, weight: 600, alpha: a2 });
      text(ctx, '→ into transposition', PX + 16, 176, { size: 12.5, color: P.ink, alpha: a2 * sp(t, 9.0, 9.5) });
      text(ctx, 'this number is the Tn5 : substrate ratio', PX + 16, 206, { size: 11, color: P.inkFaint, alpha: a2 * sp(t, 9.2, 9.7) });
    }
    {
      const a3 = win(t, 10.6, 14, 0.4);
      if (a3 > 0) {
        const grow = sp(t, 11.0, 12.4);
        const bx = PX + 16, bw = PW - 32, by = 92;
        panelBox(ctx, 80, 300, P, a3);
        text(ctx, 'reads on chrM', bx, by + 14, { size: 13, color: P.ink, weight: 600, alpha: a3 });
        const bars = [
          { label: 'Omni-ATAC, digitonin wash', v: 0.05, col: P.good, txt: '< 5 %' },
          { label: 'no wash (2013 protocol)', v: 0.4, col: P.alert, txt: '20–50 %' },
        ];
        bars.forEach((b, i) => {
          const y = by + 44 + i * 64;
          text(ctx, b.label, bx, y, { size: 11.5, color: P.inkDim, alpha: a3 });
          ctx.save(); ctx.globalAlpha *= a3;
          ctx.fillStyle = P.grid; ctx.fillRect(bx, y + 10, bw, 14);
          ctx.fillStyle = b.col; ctx.fillRect(bx, y + 10, bw * b.v * grow, 14);
          ctx.restore();
          text(ctx, b.txt, bx + bw, y + 40 - 6, { size: 12, color: b.col, align: 'right', weight: 600, alpha: a3 * grow });
        });
        const y3 = by + 44 + 2 * 64;
        text(ctx, 'dead cells', bx, y3, { size: 11.5, color: P.inkDim, alpha: a3 });
        // flat noise strip instead of a bar
        ctx.save(); ctx.globalAlpha *= a3 * grow; ctx.fillStyle = withAlpha(P.alert, 0.55);
        for (let i = 0; i < 40; i++) ctx.fillRect(bx + i * (bw / 40), y3 + 10 + 4 - 6 * hash(i, 50), bw / 40 - 1, 6 + 6 * hash(i, 50));
        ctx.restore();
        text(ctx, 'flat background: no ladder, low FRiP', bx, y3 + 40, { size: 11.5, color: P.alert, alpha: a3 * grow });
      }
    }

    footnote(ctx, 'the chrM fraction and the signal-to-noise are set here, before any enzyme touches the DNA', W, H, P, win(t, 11.2, 14, 0.4));
  },
};
