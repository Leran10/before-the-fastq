// Tagmentation: Tn5 transposomes cut DNA and insert adapters in one step;
// gap fill + PCR completes the library; read-start bias and the Nextera
// adapter sequence are what you see in the data.
import { prog, sp, win, pulse, lerp, hash, clamp, text, callout, dsFragment, dsPath, blob, line, dot, arrow, roundRect, baseRow, libraryMolecule, withAlpha } from '../draw.js';

const DX0 = 80, DX1 = 880, DY = 190;
const SITES = [230, 420, 560, 760];          // insertion sites along the DNA
const FRAG_Y = 330;                           // row where fragments settle in phase 2

// Fragments between sites (and the ends)
const bounds = [DX0, ...SITES, DX1];
const frags = [];
for (let i = 0; i < bounds.length - 1; i++) frags.push({ i, x0: bounds[i], x1: bounds[i + 1] });

function transposome(ctx, x, y, P, alpha, open = 0) {
  // two Tn5 monomers each holding one adapter oligo (teal on left, violet on right)
  if (alpha <= 0) return;
  const sep = 11 + 10 * open;
  blob(ctx, x - sep, y, 12, P.enzyme, { seed: 4, alpha });
  blob(ctx, x + sep, y, 12, P.enzyme, { seed: 9, alpha });
  line(ctx, x - sep - 4, y + 10, x - sep - 4, y + 22, P.p5, 2.4, alpha);
  line(ctx, x + sep + 4, y + 10, x + sep + 4, y + 22, P.p7, 2.4, alpha);
}

export default {
  id: 'tagmentation',
  duration: 13.5,
  thumbT: 5.0,
  phases: [
    { t: 0, label: 'Transposomes bind', caption: 'Tn5 transposase loaded with adapter oligos binds DNA at sites it mildly prefers; more enzyme per nanogram means more cuts and shorter fragments.' },
    { t: 3, label: 'Cut and tag', caption: 'Each transposome cuts both strands 9 bp apart and attaches an adapter to each 5′ end, leaving a 9-nt gap on the other strand.' },
    { t: 6.4, label: 'Gap fill and PCR', caption: 'The gap is filled in the first PCR cycle and index primers add i5/i7 and P5/P7, so a tagmentation library is never PCR-free.' },
    { t: 9.6, label: 'In your reads', caption: 'Every read starts at a Tn5 cut site, so the first ~9 bases are skewed, and the adapter to trim is the Nextera sequence, not TruSeq.' },
  ],
  draw(ctx, t, W, H, P) {
    const sceneA = 1 - prog(t, 9.3, 10.0);
    if (sceneA > 0) {
      ctx.save(); ctx.globalAlpha = sceneA;
      const cut = sp(t, 3.2, 4.4);                 // fragments separate
      const settle = sp(t, 6.4, 7.6);              // fragments move to the row
      const fill = sp(t, 7.4, 8.2);                // gap fill
      const pcr = sp(t, 8.2, 9.2);                 // indexes appear

      // DNA / fragments
      frags.forEach(f => {
        const sepL = f.i > 0 ? 9 * cut : 0, sepR = f.i < frags.length - 1 ? 9 * cut : 0;
        let x0 = f.x0 + sepL, x1 = f.x1 - sepR;
        let y = DY;
        if (settle > 0) {
          // move down into a row, shrink to a common scale
          const rowX0 = 110 + f.i * 150, len = Math.min(120, (x1 - x0) * 0.6);
          x0 = lerp(x0, rowX0, settle); x1 = lerp(x1, rowX0 + len, settle); y = lerp(DY, FRAG_Y, settle);
        }
        const hasL = f.i > 0, hasR = f.i < frags.length - 1;
        // insert
        dsFragment(ctx, x0, x1, y, { colorA: P.dna, colorB: P.dnaLight, lw: 2.4 });
        // adapters attached by the transposase (only after the cut)
        if (cut > 0) {
          const al = 18 * cut;
          if (hasL) {
            // left end: top-strand adapter (teal) attached, bottom strand has the gap (dotted) until filled
            line(ctx, x0 - al, y - 3.5, x0, y - 3.5, P.p5, 2.4);
            line(ctx, x0 - al, y + 3.5, x0, y + 3.5, P.p5, 2.4, fill, fill < 1 ? [2, 3] : undefined);
          }
          if (hasR) {
            line(ctx, x1, y + 3.5, x1 + al, y + 3.5, P.p7, 2.4);
            line(ctx, x1, y - 3.5, x1 + al, y - 3.5, P.p7, 2.4, fill, fill < 1 ? [2, 3] : undefined);
          }
          // PCR-added outer parts: indexes + P5/P7 (only for fragments with both ends)
          if (pcr > 0 && hasL && hasR) {
            const ext = 16 * pcr;
            dsFragment(ctx, x0 - al - ext, x0 - al, y, { colorA: P.p5, colorB: P.p5, lw: 2.4, rungEvery: 6, alpha: pcr });
            dsFragment(ctx, x1 + al, x1 + al + ext, y, { colorA: P.p7, colorB: P.p7, lw: 2.4, rungEvery: 6, alpha: pcr });
            ctx.save(); ctx.globalAlpha = pcr; ctx.fillStyle = P.samples[0];
            roundRect(ctx, x0 - al - ext * 0.6 - 4, y - 3, 8, 6, 2); ctx.fill();
            roundRect(ctx, x1 + al + ext * 0.6 - 4, y - 3, 8, 6, 2); ctx.fill();
            ctx.restore();
          } else if (pcr > 0) {
            // end fragments carry only one adapter: they cannot be amplified or sequenced
            text(ctx, 'one adapter only → lost', (x0 + x1) / 2, y + 22, { size: 10.5, color: P.inkFaint, align: 'center', alpha: pcr });
          }
        }
      });

      // transposomes landing (phase 0) and leaving (after cut)
      SITES.forEach((sx, k) => {
        const land = sp(t, 0.4 + k * 0.45, 1.6 + k * 0.45);
        const leave = sp(t, 4.6 + k * 0.2, 5.6 + k * 0.2);
        const y = lerp(60, DY - 26, land) - 60 * leave;
        const a = (land > 0 ? 1 : 0) * (1 - leave);
        transposome(ctx, sx, y, P, a, cut);
      });
      text(ctx, 'Tn5 transposome: two Tn5 molecules, each loaded with one adapter oligo', W / 2, 36, { size: 12.5, color: P.inkDim, align: 'center', alpha: win(t, 0.3, 3.2, 0.4) });
      text(ctx, 'enzyme : DNA ratio sets the fragment size (more enzyme → shorter)', W / 2, 56, { size: 11.5, color: P.inkFaint, align: 'center', alpha: win(t, 1.2, 3.2, 0.4) });

      // zoom on one junction (phase 1)
      const za = win(t, 3.6, 6.4, 0.4);
      if (za > 0) {
        const zx = 300, zy = 300;
        ctx.save(); ctx.globalAlpha = za;
        ctx.strokeStyle = P.grid; roundRect(ctx, zx - 40, zy - 66, 480, 126, 8); ctx.stroke();
        text(ctx, 'one cut site, zoomed', zx - 28, zy - 50, { size: 11.5, color: P.inkDim });
        // top strand: adapter (teal) covalently joined to 5' end of insert
        line(ctx, zx, zy - 8, zx + 90, zy - 8, P.p5, 3);
        line(ctx, zx + 90, zy - 8, zx + 400, zy - 8, P.dna, 3);
        // bottom strand: insert, then 9-nt gap, then nothing (adapter is only on top)
        line(ctx, zx + 150, zy + 8, zx + 400, zy + 8, P.dnaLight, 3);
        line(ctx, zx + 90, zy + 8, zx + 150, zy + 8, P.alert, 2, 1, [3, 3]);
        text(ctx, '9-nt gap, filled during the first PCR cycle', zx + 120, zy + 30, { size: 11, color: P.alert, align: 'center' });
        text(ctx, 'adapter (19 nt mosaic end)', zx + 45, zy - 24, { size: 10.5, color: P.p5, align: 'center' });
        text(ctx, 'both cuts are 9 bp apart on the two strands', zx + 275, zy - 24, { size: 10.5, color: P.inkDim, align: 'center' });
        ctx.restore();
      }

      // phase 2 labels
      const pa = win(t, 6.6, 9.3, 0.4);
      text(ctx, 'tagmented fragments', 110, FRAG_Y - 40, { size: 12.5, color: P.ink, weight: 600, alpha: pa });
      text(ctx, 'gap fill (72 °C, 3 min) → then 5–12 cycles of PCR with i5/i7 index primers', 110, FRAG_Y + 60, { size: 12, color: P.inkDim, alpha: win(t, 7.2, 9.3, 0.4) });
      text(ctx, 'the PCR adds the indexes and P5/P7: tagmentation libraries are never PCR-free', 110, FRAG_Y + 82, { size: 12, color: P.inkDim, alpha: win(t, 8.2, 9.3, 0.4) });
      ctx.restore();
    }

    // ───────── phase 3: what you see in the reads ─────────
    const ra = win(t, 9.6, 14, 0.5);
    if (ra > 0) {
      ctx.save(); ctx.globalAlpha = ra;
      // left: per-position base composition
      const CX = 70, CY = 110, CW = 380, CH = 200, NP = 20;
      text(ctx, 'base composition by read position', CX, 90, { size: 13, color: P.ink, weight: 600 });
      const cols = { A: P.good, C: P.dna, G: P.ink, T: P.rna };
      const bw = CW / NP;
      for (let p = 0; p < NP; p++) {
        // skewed shares in the first 9 positions, flat after
        const skew = p < 9 ? 1 : 0;
        let a = 0.25 + skew * (0.18 * Math.sin(p * 1.7) + 0.08 * hash(p, 2));
        let c = 0.25 + skew * (0.14 * Math.cos(p * 1.3) - 0.05 * hash(p, 3));
        let g = 0.25 + skew * (-0.12 * Math.sin(p * 0.9) + 0.06 * hash(p, 4));
        let tt = 0.25 + skew * (0.1 * Math.cos(p * 2.1));
        const raw = [a, c, g, tt].map(v => Math.max(0.05, v));
        const sum = raw.reduce((s, v) => s + v, 0);
        const shares = [['A', raw[0] / sum], ['C', raw[1] / sum], ['G', raw[2] / sum], ['T', raw[3] / sum]];
        let y = CY + CH;
        const grow = sp(t, 9.9 + p * 0.06, 10.4 + p * 0.06);
        shares.forEach(([b, s]) => {
          const h = s * CH * grow;
          ctx.fillStyle = withAlpha(cols[b], 0.8);
          ctx.fillRect(CX + p * bw + 1, y - h, bw - 2, h);
          y -= h;
        });
        if ((p + 1) % 5 === 0 || p === 0) text(ctx, String(p + 1), CX + p * bw + bw / 2, CY + CH + 14, { size: 10, color: P.inkDim, align: 'center' });
      }
      ctx.save(); ctx.globalAlpha = ra * win(t, 10.8, 14, 0.3); ctx.strokeStyle = P.gold; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      roundRect(ctx, CX - 2, CY - 6, bw * 9 + 4, CH + 12, 6); ctx.stroke(); ctx.restore();
      text(ctx, 'Tn5 insertion preference: the same skew in every sample', CX, CY + CH + 36, { size: 11.5, color: P.gold, alpha: win(t, 10.8, 14, 0.3) });
      text(ctx, 'FastQC “Per base sequence content” fails; it is not a sample problem', CX, CY + CH + 54, { size: 11.5, color: P.inkDim, alpha: win(t, 11.2, 14, 0.3) });
      ['A', 'C', 'G', 'T'].forEach((b, i) => { ctx.fillStyle = cols[b]; ctx.fillRect(CX + CW - 90 + i * 22, CY - 16, 10, 10); text(ctx, b, CX + CW - 76 + i * 22, CY - 11, { size: 10, color: P.inkDim }); });

      // right: which adapter to trim
      const RX = 520;
      text(ctx, 'the adapter at the 3′ end of short-insert reads', RX, 90, { size: 13, color: P.ink, weight: 600 });
      const ins = 'TTGCAGTACCGTAGGCTTAG';
      const nex = 'CTGTCTCTTATACACATCT';
      const step = 8.8;
      text(ctx, 'read:', RX, 130, { size: 11, color: P.inkDim });
      baseRow(ctx, ins, RX + 44, 130, { size: 11.5, step, color: P.dna });
      baseRow(ctx, nex, RX + 44 + ins.length * step, 130, { size: 11.5, step, color: P.p7 });
      ctx.save(); ctx.globalAlpha = ra * win(t, 10.6, 14, 0.3); ctx.strokeStyle = P.p7; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      roundRect(ctx, RX + 44 + ins.length * step - 6, 118, nex.length * step + 4, 24, 4); ctx.stroke(); ctx.restore();
      text(ctx, 'Nextera / Illumina DNA Prep:', RX, 176, { size: 12, color: P.ink, weight: 600, alpha: win(t, 10.6, 14, 0.3) });
      text(ctx, 'CTGTCTCTTATACACATCT', RX, 196, { size: 13, color: P.p7, mono: true, weight: 600, alpha: win(t, 10.6, 14, 0.3) });
      text(ctx, 'TruSeq / ligation kits:', RX, 232, { size: 12, color: P.ink, weight: 600, alpha: win(t, 11.2, 14, 0.3) });
      text(ctx, 'AGATCGGAAGAGC', RX, 252, { size: 13, color: P.inkDim, mono: true, weight: 600, alpha: win(t, 11.2, 14, 0.3) });
      const wa = win(t, 11.8, 14, 0.3);
      text(ctx, 'a trimmer hard-coded for TruSeq leaves Nextera adapter in the reads', RX, 290, { size: 11.5, color: P.alert, alpha: wa, maxWidth: 400 });
      text(ctx, 'fastp / Trim Galore auto-detect; check the trimmer log', RX, 310, { size: 11.5, color: P.inkDim, alpha: wa });
      const ga = win(t, 12.4, 14, 0.3);
      text(ctx, 'also: stronger GC bias than ligation preps, insert size tracks input mass (XT)', RX, 350, { size: 11.5, color: P.inkDim, alpha: ga, maxWidth: 400 });
      ctx.restore();
    }
  },
};
