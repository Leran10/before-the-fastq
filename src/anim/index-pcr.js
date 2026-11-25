// Index PCR (second stage of a two-step amplicon protocol): index primers
// anneal to the overhang tails, 8 cycles build the full amplicon, a stray
// primer causes cross-talk, and total cycle count sets the artefact load.
import { prog, sp, win, pulse, lerp, hash, clamp, text, callout, dsFragment, line, dot, arrow, roundRect, tube, withAlpha } from '../draw.js';

const WELLS = [{ x: 190, name: 'well A' }, { x: 480, name: 'well B' }, { x: 770, name: 'well C' }];
const AMP_Y = 230;
const REGION = 150, PRIM = 18, TAIL = 22, IDX = 14, PAD = 16;   // px

// Draw one first-round amplicon with grey overhang tails; `done` 0..1 adds the
// index/adapter outer parts; `idxCol` colours the index blocks.
function amplicon(ctx, cx, y, P, alpha, done, idxCol, regionCol) {
  if (alpha <= 0) return;
  const half = REGION / 2;
  dsFragment(ctx, cx - half, cx + half, y, { colorA: regionCol, colorB: regionCol, lw: 2.6, alpha });
  dsFragment(ctx, cx - half - PRIM, cx - half, y, { colorA: P.p5, colorB: P.p5, lw: 2.6, alpha, rungEvery: 6 });
  dsFragment(ctx, cx + half, cx + half + PRIM, y, { colorA: P.p7, colorB: P.p7, lw: 2.6, alpha, rungEvery: 6 });
  // overhang tails (grey)
  dsFragment(ctx, cx - half - PRIM - TAIL, cx - half - PRIM, y, { colorA: P.enzyme, colorB: P.enzyme, lw: 2.6, alpha, rungEvery: 6 });
  dsFragment(ctx, cx + half + PRIM, cx + half + PRIM + TAIL, y, { colorA: P.enzyme, colorB: P.enzyme, lw: 2.6, alpha, rungEvery: 6 });
  if (done > 0) {
    const L = cx - half - PRIM - TAIL, R = cx + half + PRIM + TAIL;
    const w = (IDX + PAD) * done;
    dsFragment(ctx, L - w, L, y, { colorA: P.p5, colorB: P.p5, lw: 2.6, alpha: alpha * done, rungEvery: 6 });
    dsFragment(ctx, R, R + w, y, { colorA: P.p7, colorB: P.p7, lw: 2.6, alpha: alpha * done, rungEvery: 6 });
    ctx.save(); ctx.globalAlpha = alpha * done; ctx.fillStyle = idxCol;
    roundRect(ctx, L - IDX - 2, y - 3.5, IDX, 7, 2); ctx.fill();
    roundRect(ctx, R + 2, y - 3.5, IDX, 7, 2); ctx.fill();
    ctx.restore();
  }
}

// An index primer: P5/P7 + index block + tail-complement, as a short bent line
function indexPrimer(ctx, x, y, dir, P, idxCol, alpha) {
  if (alpha <= 0) return;
  const col = dir > 0 ? P.p5 : P.p7;
  line(ctx, x, y, x + dir * 22, y, P.enzyme, 3, alpha);          // tail complement (anneals)
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = idxCol; roundRect(ctx, x - (dir > 0 ? 16 : 0), y - 11, 16, 7, 2); ctx.fill(); ctx.restore();
  line(ctx, x - dir * 16, y - 8, x - dir * 36, y - 16, col, 3, alpha);  // P5/P7
}

export default {
  id: 'index-pcr',
  duration: 12.5,
  thumbT: 5.4,
  phases: [
    { t: 0, label: 'Amplicons with tails', caption: 'After a bead cleanup, each well holds its first-round amplicons, all carrying the same overhang tails from the region primers.' },
    { t: 2.6, label: 'Index primers anneal', caption: 'Every well gets its own pair of index primers; their 3′ ends match the tails and their 5′ ends carry i5/P5 and i7/P7.' },
    { t: 6.6, label: 'Eight cycles', caption: 'Eight cycles are enough to convert most molecules into full-length, sequencer-ready amplicons; a second cleanup removes primer dimers.' },
    { t: 8.6, label: 'Cross-talk and cycle count', caption: 'A trace of primer or product moving between wells gives reads with the wrong index, and the summed cycle count of both PCRs sets the chimera and duplicate load.' },
  ],
  draw(ctx, t, W, H, P) {
    const sceneA = 1 - prog(t, 8.4, 9.1);
    if (sceneA > 0) {
      ctx.save(); ctx.globalAlpha = sceneA;
      const cyc = Math.floor(clamp((t - 6.6) / 1.8) * 8);
      const done = sp(t, 6.7, 8.2);
      WELLS.forEach((w, k) => {
        const col = P.samples[k];
        // well outline
        ctx.strokeStyle = P.grid; ctx.lineWidth = 1; roundRect(ctx, w.x - 135, 70, 270, 260, 10); ctx.stroke();
        text(ctx, w.name, w.x, 90, { size: 13, color: col, align: 'center', weight: 600 });
        text(ctx, `index pair ${k + 1}`, w.x, 108, { size: 11, color: P.inkDim, align: 'center', alpha: win(t, 2.6, 8.4, 0.3) });
        // three amplicons per well (different taxa share the same tails)
        for (let j = 0; j < 3; j++) {
          const y = AMP_Y - 40 + j * 40;
          const regionCol = [P.dna, P.dnaLight, P.dna][j];
          amplicon(ctx, w.x, y, P, 1, done, col, regionCol);
          // primers approaching (phase 1)
          const ap = sp(t, 2.8 + k * 0.2 + j * 0.15, 4.6 + k * 0.2 + j * 0.15);
          const vis = (1 - prog(t, 6.6, 7.0)) * prog(t, 2.6, 2.9);
          const L = w.x - REGION / 2 - PRIM - TAIL, R = w.x + REGION / 2 + PRIM + TAIL;
          indexPrimer(ctx, lerp(L - 30, L, ap), lerp(y - 80, y - 9, ap), +1, P, col, vis);
          indexPrimer(ctx, lerp(R + 30, R, ap), lerp(y + 80, y + 9, ap), -1, P, col, vis);
        }
      });
      text(ctx, 'grey = overhang tails added by the first-round primers; identical in every well', W / 2, 352, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 0.4, 2.8, 0.4) });
      text(ctx, 'tail-complement · index (i5 / i7) · P5 / P7', W / 2, 352, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 3.0, 6.6, 0.4) });
      const ca = win(t, 6.6, 8.4, 0.3);
      text(ctx, `cycle ${cyc} / 8`, W / 2, 352, { size: 14, color: P.ink, align: 'center', weight: 700, alpha: ca });
      text(ctx, 'final length = region + primers + tails + indexes/adapters ≈ 380–600 bp (V4: ~390 bp)', W / 2, 392, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 7.4, 8.4, 0.3) });
      text(ctx, 'bead cleanup between PCRs removes region primers; a second one removes primer dimers', W / 2, 414, { size: 11.5, color: P.inkFaint, align: 'center', alpha: win(t, 0.8, 8.4, 0.4) });
      ctx.restore();
    }

    // ───────── phase 3 ─────────
    const ra = win(t, 8.7, 13, 0.5);
    if (ra > 0) {
      ctx.save(); ctx.globalAlpha = ra;
      // left: cross-talk
      text(ctx, 'index cross-talk', 60, 80, { size: 13, color: P.ink, weight: 600 });
      ctx.strokeStyle = P.grid; roundRect(ctx, 60, 100, 400, 190, 10); ctx.stroke();
      text(ctx, 'well A', 100, 120, { size: 12, color: P.samples[0], weight: 600 });
      for (let j = 0; j < 3; j++) amplicon(ctx, 260, 160 + j * 40, P, 1, 1, P.samples[0], j === 1 ? P.dnaLight : P.dna);
      // stray primer from B flies in and the last amplicon gets B's index
      const fly = sp(t, 9.0, 10.0);
      const L = 260 - REGION / 2 - PRIM - TAIL;
      indexPrimer(ctx, lerp(520, L, fly), lerp(60, 240 - 9, fly), +1, P, P.samples[1], 1 - prog(t, 10.0, 10.3));
      const swap = sp(t, 10.0, 10.5);
      if (swap > 0) {
        ctx.save(); ctx.globalAlpha = swap; ctx.fillStyle = P.samples[1]; roundRect(ctx, L - IDX - 2, 240 - 3.5, IDX, 7, 2); ctx.fill(); ctx.restore();
        const fl = pulse(t, 10.3, 11.0); if (fl > 0) dot(ctx, L - IDX / 2, 240, 6 + 8 * fl, P.alert, fl * 0.7);
      }
      const xa = win(t, 10.4, 13, 0.3);
      text(ctx, 'A’s amplicon, B’s index → counted in sample B', 100, 270, { size: 11.5, color: P.alert, alpha: xa });
      text(ctx, 'from primer carry-over, aerosols, or index hopping on the flow cell', 60, 310, { size: 11.5, color: P.inkDim, alpha: xa, maxWidth: 400 });
      text(ctx, '0.01–0.1 % of reads: enough to create spurious low-abundance ASVs in blanks', 60, 330, { size: 11.5, color: P.inkDim, alpha: xa, maxWidth: 400 });
      text(ctx, '→ sequence blanks; set a per-sample abundance floor from them', 60, 350, { size: 11.5, color: P.good, alpha: win(t, 11.0, 13, 0.3), maxWidth: 400 });

      // right: total cycles bar
      const RX = 520;
      text(ctx, 'total PCR cycles seen by every molecule', RX, 80, { size: 13, color: P.ink, weight: 600 });
      const grow = sp(t, 9.2, 11.0);
      const unit = 7.5; // px per cycle
      const c1 = 32, c2 = 8;
      const y = 140;
      ctx.fillStyle = withAlpha(P.dna, 0.8); ctx.fillRect(RX, y - 14, c1 * unit * grow, 28);
      ctx.fillStyle = withAlpha(P.p7, 0.8); ctx.fillRect(RX + c1 * unit * grow, y - 14, c2 * unit * grow, 28);
      text(ctx, 'region PCR: 25–35 cycles', RX + 6, y, { size: 11.5, color: P.panel, weight: 600, alpha: grow });
      text(ctx, '+ 8', RX + c1 * unit + 10, y, { size: 11.5, color: P.panel, weight: 600, alpha: grow > 0.9 ? 1 : 0 });
      text(ctx, `≈ ${Math.round((c1 + c2) * grow)} cycles`, RX + (c1 + c2) * unit + 12, y, { size: 13, color: P.ink, weight: 700, alpha: grow });
      const ya = win(t, 10.8, 13, 0.3);
      text(ctx, 'vs 6–12 for a shotgun library', RX, y + 32, { size: 11.5, color: P.inkDim, alpha: ya });
      const items = [
        ['chimeras', 'form late in each PCR; 5–30 % of unique sequences before filtering'],
        ['duplicates', 'every read is a PCR copy; amplicon data are never deduplicated'],
        ['polymerase errors', 'propagate into many copies; denoisers (DADA2, UNOISE) model them'],
      ];
      items.forEach(([h, d], i) => {
        const a = ya * sp(t, 11.0 + i * 0.3, 11.5 + i * 0.3);
        text(ctx, h, RX, y + 70 + i * 44, { size: 12.5, color: P.alert, weight: 600, alpha: a });
        text(ctx, d, RX, y + 88 + i * 44, { size: 11.5, color: P.inkDim, alpha: a, maxWidth: 380 });
      });
      ctx.restore();
    }
  },
};
