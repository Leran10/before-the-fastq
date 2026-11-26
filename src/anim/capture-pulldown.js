// Streptavidin pulldown of bait–library hybrids, washes of rising stringency
// (a divergent target is lost, a loosely bound off-target survives), elution,
// and the post-capture PCR that gives capture libraries their duplicate rate.
import { prog, sp, win, pulse, lerp, hash, text, ssStrand, dsFragment, bead, dot, line, arrow, roundRect, panelTitle, footnote, withAlpha } from '../draw.js';

// the hybridisation volume (a box standing in for the tube)
const BOX = { x: 70, y: 78, w: 580, h: 400 };
const WALL = BOX.x + BOX.w;                    // right wall, where the magnet sits
const BEADS = [{ x: 470, y: 160 }, { x: 440, y: 290 }, { x: 490, y: 408 }];   // free-floating start positions
const BEAD_R = 22;

// hybrids: a library strand with a biotinylated bait annealed to it
//   kind: 'target' (perfect), 'divergent' (mismatched: lost at the stringent wash), 'offtarget' (few bases bound: kept)
const HYB = [
  { x: 160, y: 160, len: 96, kind: 'target', bead: 0 },
  { x: 310, y: 350, len: 96, kind: 'target', bead: 2 },
  { x: 150, y: 370, len: 96, kind: 'divergent', bead: 1 },
  { x: 340, y: 210, len: 84, kind: 'offtarget', bead: 0 },
];
// unbound library molecules: most of the mass
const FREE = Array.from({ length: 16 }, (_, i) => ({
  x: BOX.x + 30 + hash(i, 1) * (BOX.w - 230),
  y: BOX.y + 30 + hash(i, 2) * (BOX.h - 60),
  len: 36 + hash(i, 3) * 30,
  ang: (hash(i, 4) - 0.5) * 1.1,
}));

// draw one hybrid centred on (x,y); u = detachment of the library strand (divergent only)
function hybrid(ctx, h, x, y, P, alpha, o = {}) {
  if (alpha <= 0) return;
  const { detach = 0, labelA = 0 } = o;
  const x0 = x - h.len / 2, x1 = x + h.len / 2;
  const isOff = h.kind === 'offtarget';
  const strandCol = isOff ? P.dnaDim : P.dna;
  // library strand (top), possibly falling away
  const dy = detach * 90, da = 1 - detach;
  ssStrand(ctx, x0, y - 4 + dy, x1, y - 4 + dy, { color: strandCol, lw: 2.2, tickEvery: 8, tickLen: 3.5, side: 1, alpha: alpha * da });
  // bait (bottom, gold) with biotin at its right end
  const by = y + 5;
  if (h.kind === 'target') {
    ssStrand(ctx, x0 + 6, by, x1 - 6, by, { color: P.gold, lw: 2.4, tickEvery: 8, tickLen: 3.5, side: -1, alpha });
  } else if (h.kind === 'divergent') {
    // three bound stretches with gaps = mismatches
    const segs = [[0.06, 0.3], [0.42, 0.6], [0.72, 0.94]];
    segs.forEach(([a, b]) => ssStrand(ctx, x0 + h.len * a, by, x0 + h.len * b, by, { color: P.gold, lw: 2.4, tickEvery: 8, tickLen: 3.5, side: -1, alpha }));
    // mismatch marks
    [0.36, 0.66].forEach(f => dot(ctx, x0 + h.len * f, y, 2.6, P.alert, alpha));
  } else {
    // bait hangs off the right end, only ~18 px overlapping the strand
    ssStrand(ctx, x1 - 18, by, x1 + 40, by, { color: P.gold, lw: 2.4, tickEvery: 8, tickLen: 3.5, side: -1, alpha });
  }
  const bx = isOff ? x1 + 44 : x1 - 2;
  dot(ctx, bx, by, 4.2, P.gold, alpha);                 // biotin
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = P.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, 4.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

export default {
  id: 'capture-pulldown',
  duration: 15,
  thumbT: 7.2,
  phases: [
    { t: 0, label: 'Hybrids in the bulk', caption: 'After hybridisation, a few library molecules carry a biotinylated bait; most of the library is unbound. One bait is annealed across mismatches, one is held by a few bases of adapter.' },
    { t: 2.6, label: 'Streptavidin beads', caption: 'Magnetic streptavidin beads bind the biotin and everything annealed to it. A magnet pulls the beads to the wall; the supernatant, the bulk of the library, is discarded.' },
    { t: 5.2, label: 'Washes at 65 °C', caption: 'Buffers of decreasing salt at raised temperature strip weak hybrids. Too stringent, and the divergent target is lost; too lax, and the off-target molecule stays.' },
    { t: 8.4, label: 'Elute, then PCR again', caption: 'What is left is a few nanograms. 8–14 cycles of post-capture PCR copy those same molecules; the number of distinct molecules per target was fixed at the wash.' },
    { t: 11.6, label: 'On-target fraction', caption: 'Typically 60–80 % for an exome, far less for small panels and viral capture. A second round of capture raises it, at the cost of more PCR and fewer unique molecules.' },
  ],
  draw(ctx, t, W, H, P) {
    const bind = sp(t, 2.8, 3.9);        // hybrids move to beads
    const pull = sp(t, 3.9, 4.9);        // beads to the wall
    const washFree = sp(t, 5.4, 6.4);    // unbound library leaves
    const detach = sp(t, 7.0, 7.9);      // divergent strand lets go
    const sceneA = 1 - sp(t, 8.4, 9.0);
    const pcrA = sp(t, 9.0, 9.5);
    const cycles = sp(t, 9.6, 11.4);
    const barA = sp(t, 11.8, 12.4);

    // ───────────────────────── capture scene ─────────────────────────
    if (sceneA > 0) {
      ctx.save(); ctx.globalAlpha *= sceneA;
      panelTitle(ctx, 'Streptavidin pulldown and washes', W, P);
      // the volume
      ctx.save(); ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1.5; roundRect(ctx, BOX.x, BOX.y, BOX.w, BOX.h, 10); ctx.stroke(); ctx.restore();
      text(ctx, 'hybridisation reaction', BOX.x + 12, BOX.y + BOX.h - 14, { size: 11, color: P.inkFaint });

      // unbound library: wash away downward
      FREE.forEach((f, i) => {
        const a = 1 - washFree;
        if (a <= 0) return;
        const y = f.y + washFree * 60;
        const cx = Math.cos(f.ang) * f.len / 2, cy = Math.sin(f.ang) * f.len / 2;
        ssStrand(ctx, f.x - cx, y - cy, f.x + cx, y + cy, { color: P.dnaDim, lw: 1.8, tickEvery: 8, tickLen: 3, alpha: a * 0.9 });
      });
      text(ctx, 'unbound library: most of the mass', BOX.x + 16, BOX.y + 18, { size: 12, color: P.inkDim, alpha: win(t, 0.2, 5.6, 0.3) });

      // beads: float, then to the wall
      const beadPos = BEADS.map(b => ({ x: lerp(b.x, WALL - BEAD_R - 6, pull), y: b.y }));
      const beadA = sp(t, 2.6, 3.0);
      beadPos.forEach(b => bead(ctx, b.x, b.y, BEAD_R, P, beadA));
      // magnet
      {
        const a = sp(t, 3.7, 4.1);
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.enzyme; roundRect(ctx, WALL + 6, BOX.y + 40, 26, BOX.h - 80, 4); ctx.fill(); ctx.restore();
        text(ctx, 'magnet', WALL + 19, BOX.y + 24, { size: 11, color: P.inkDim, align: 'center', alpha: a });
      }

      // hybrids
      HYB.forEach((h, i) => {
        const b = beadPos[h.bead];
        // target position hanging to the left of the bead, staggered
        const slot = HYB.filter(k => k.bead === h.bead).indexOf(h);
        const tx = b.x - BEAD_R - h.len / 2 - (h.kind === 'offtarget' ? 46 : 4);
        const ty = b.y + (slot === 0 ? -8 : 14) + (h.bead === 0 && slot === 1 ? 10 : 0);
        const x = lerp(h.x, tx, bind), y = lerp(h.y, ty, bind);
        const det = h.kind === 'divergent' ? detach : 0;
        hybrid(ctx, h, x, y, P, 1, { detach: det });
      });
      // labels at rest
      {
        const a = win(t, 0.3, 2.6, 0.3);
        text(ctx, 'bait annealed, biotin', HYB[0].x - 48, HYB[0].y - 22, { size: 11.5, color: P.gold, alpha: a });
        text(ctx, 'mismatched bait: divergent target', HYB[2].x - 48, HYB[2].y + 28, { size: 11.5, color: P.inkDim, alpha: a });
        text(ctx, 'off-target held by a few bases', HYB[3].x - 20, HYB[3].y - 22, { size: 11.5, color: P.inkDim, alpha: a });
      }
      // wash narration (right column)
      {
        const a = win(t, 5.2, 8.6, 0.3);
        const stage = Math.min(2, Math.floor(prog(t, 5.4, 7.9) * 3));
        const temps = ['wash 1 · 65 °C · high salt', 'wash 2 · 65 °C · lower salt', 'wash 3 · 65 °C · low salt'];
        text(ctx, 'stringency rising', 790, 110, { size: 13, color: P.ink, weight: 600, align: 'center', alpha: a });
        temps.forEach((s, k) => text(ctx, s, 790, 136 + k * 20, { size: 12, color: k <= stage ? P.ink : P.inkFaint, align: 'center', mono: true, alpha: a }));
        const lostA = sp(t, 7.4, 7.9) * a;
        text(ctx, 'lost: too divergent', 790, 330, { size: 12.5, color: P.alert, align: 'center', alpha: lostA });
        arrow(ctx, 720, 330, 545, 385, P.alert, { lw: 1.5, alpha: lostA * 0.8 });
        const keptA = sp(t, 7.6, 8.1) * a;
        text(ctx, 'kept: off-target', 790, 220, { size: 12.5, color: P.alert, align: 'center', alpha: keptA });
        arrow(ctx, 720, 220, 560, 176, P.alert, { lw: 1.5, alpha: keptA * 0.8 });
        text(ctx, 'supernatant discarded', 790, 440, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 4.9, 6.6, 0.3) });
      }
      // bind narration
      { const a = win(t, 2.6, 5.0, 0.3); text(ctx, 'streptavidin binds biotin;', 790, 110, { size: 12.5, color: P.inkDim, align: 'center', alpha: a }); text(ctx, 'the magnet holds the beads', 790, 128, { size: 12.5, color: P.inkDim, align: 'center', alpha: a }); }
      ctx.restore();
    }

    // ───────────────────────── elution + PCR scene ─────────────────────────
    if (pcrA > 0 && barA < 1) {
      ctx.save(); ctx.globalAlpha *= pcrA * (1 - barA);
      panelTitle(ctx, 'Post-capture PCR: 8–14 cycles from a few nanograms', W, P);
      const rows = [
        { y: 120, col: P.dna, label: 'target' },
        { y: 230, col: P.dna, label: 'target' },
        { y: 340, col: P.dnaDim, label: 'off-target', alert: true },
      ];
      const x0 = 80, len = 110, colW = 140;
      text(ctx, 'eluted molecules', x0, 82, { size: 12, color: P.inkDim });
      const ncyc = 1 + Math.floor(cycles * 5.99);          // 1..6 visible doublings as columns
      text(ctx, `cycle ${Math.min(14, 8 + Math.round(cycles * 6))}`, 880, 82, { size: 12, color: P.inkDim, mono: true, align: 'right', alpha: sp(t, 9.6, 9.9) });
      rows.forEach((r, ri) => {
        // original molecule with adapters
        const drawMol = (x, y, a, dup) => {
          ctx.save(); ctx.globalAlpha *= a;
          if (dup) { ctx.strokeStyle = P.alert; ctx.lineWidth = 1; roundRect(ctx, x - 18, y - 9, len + 36, 18, 4); ctx.stroke(); }
          ctx.fillStyle = P.p5; ctx.fillRect(x - 14, y - 3.5, 12, 7);
          ctx.fillStyle = P.p7; ctx.fillRect(x + len + 2, y - 3.5, 12, 7);
          ctx.restore();
          dsFragment(ctx, x, x + len, y, { colorA: r.col, colorB: r.col, alpha: a, rungEvery: 8 });
        };
        drawMol(x0, r.y, 1, false);
        text(ctx, r.label, x0, r.y - 20, { size: 11, color: r.alert ? P.alert : P.inkDim });
        // copies: identical, stacked to the right in columns, red outline = will be marked duplicate
        for (let c = 1; c < 6; c++) {
          const a = prog(cycles, (c - 1) / 6, c / 6);
          if (a <= 0) break;
          const nIn = Math.min(3, c);               // copies per column
          for (let k = 0; k < nIn; k++) {
            const x = x0 + 160 + (c - 1) * colW;
            const y = r.y - 24 + k * 24;
            drawMol(x, y, a, true);
          }
        }
      });
      text(ctx, 'identical copies: the duplicate rate after marking is the honest count of captured molecules', 480, 440, { size: 12.5, color: P.alert, align: 'center', alpha: sp(t, 10.6, 11.2) });
      ctx.restore();
    }

    // ───────────────────────── on-target bar (final) ─────────────────────────
    if (barA > 0) {
      ctx.save(); ctx.globalAlpha *= barA;
      // dim the PCR scene underneath with a panel
      panelTitle(ctx, 'What reached the sequencer', W, P);
      const bx = 110, by = 130, bw = 720, bh = 44;
      const on = 0.72;
      text(ctx, 'single capture (exome)', bx, by - 18, { size: 13, color: P.ink, weight: 600 });
      ctx.fillStyle = P.good; ctx.fillRect(bx, by, bw * on * sp(t, 12.0, 12.8), bh);
      ctx.fillStyle = P.alertDim; ctx.fillRect(bx + bw * on, by, bw * (1 - on) * sp(t, 12.0, 12.8), bh);
      text(ctx, '72 % on target', bx + 12, by + bh / 2, { size: 13, color: P.bg, weight: 600, alpha: sp(t, 12.4, 12.8) });
      text(ctx, '28 % off-target', bx + bw * on + 10, by + bh / 2, { size: 12, color: P.alert, alpha: sp(t, 12.4, 12.8) });
      // double capture inset
      const by2 = by + 110;
      const a2 = sp(t, 12.8, 13.6);
      text(ctx, 'small panel or viral capture', bx, by2 - 18, { size: 13, color: P.ink, weight: 600, alpha: a2 });
      const on1 = 0.3, on2 = 0.85;
      ctx.save(); ctx.globalAlpha *= a2;
      ctx.fillStyle = P.good; ctx.fillRect(bx, by2, bw * on1, 26);
      ctx.fillStyle = P.alertDim; ctx.fillRect(bx + bw * on1, by2, bw * (1 - on1), 26);
      text(ctx, '30 % after one capture', bx + bw * on1 + 10, by2 + 13, { size: 12, color: P.alert });
      const a3 = sp(t, 13.4, 14.0);
      arrow(ctx, bx + bw * on1 / 2, by2 + 34, bx + bw * on1 / 2, by2 + 50, P.inkDim, { lw: 1.5, alpha: a3 });
      ctx.globalAlpha *= a3;
      ctx.fillStyle = P.good; ctx.fillRect(bx, by2 + 56, bw * on2, 26);
      ctx.fillStyle = P.alertDim; ctx.fillRect(bx + bw * on2, by2 + 56, bw * (1 - on2), 26);
      text(ctx, '85 % after double capture', bx + 12, by2 + 69, { size: 12, color: P.bg, weight: 600 });
      text(ctx, 'fewer unique molecules, more PCR cycles', bx + bw, by2 + 98, { size: 11.5, color: P.inkDim, align: 'right' });
      ctx.restore();
      // side note
      text(ctx, 'off-target reads are not junk: a 0.1–2× low-pass genome for sex checks, contamination and coarse CNV', bx, by2 + 132, { size: 12, color: P.inkDim, alpha: sp(t, 13.8, 14.4) });
      footnote(ctx, 'Post-capture PCR is where capture libraries earn their duplicate rate.', W, H, P, sp(t, 13.2, 13.8));
      ctx.restore();
    }
  },
};
