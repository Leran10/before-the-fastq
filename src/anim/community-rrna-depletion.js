// rRNA depletion in a mixed community: probes hybridise to the rRNA of the
// taxa they were designed for, RNase H digests the hybrids, divergent rRNA
// survives and an rRNA-like mRNA is lost. End: what remains and what to do.
import { prog, sp, win, pulse, lerp, hash, text, callout, blob, dot, line, roundRect, ssStrand, withAlpha } from '../draw.js';

const BX0 = 70, BX1 = 660, BY0 = 80, BY1 = 420;
const PARTS = P => [['residual rRNA', 0.28, P.rrna], ['host RNA', 0.18, P.enzyme], ['tRNA / small RNA', 0.09, P.inkFaint], ['microbial mRNA', 0.45, P.rna]];
const TAXA = [0, 1, 3, 4];           // P.samples indices; taxon index 3 (samples[4]) is the divergent one
// strands: rRNA long, mRNA short, laid out on a loose grid
const STRANDS = [];
{
  let i = 0;
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
    const rrna = (r + c) % 3 !== 1;               // ~2/3 rRNA
    const taxon = (r * 3 + c) % 4;
    const len = rrna ? 120 + 40 * hash(i, 2) : 42 + 18 * hash(i, 3);
    STRANDS.push({ i, rrna, taxon, x: BX0 + 30 + c * 200 + hash(i, 4) * 20, y: BY0 + 35 + r * 55 + (hash(i, 5) - 0.5) * 14, len, ang: (hash(i, 6) - 0.5) * 0.25, lookalike: i === 7 });
    i++;
  }
}

function strand(ctx, s, P, alpha, o = {}) {
  if (alpha <= 0) return;
  const { shrink = 0, outline } = o;
  const len = s.len * (1 - shrink);
  const x0 = s.x, y0 = s.y, x1 = s.x + Math.cos(s.ang) * len, y1 = s.y + Math.sin(s.ang) * len;
  if (outline) { ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); roundRect(ctx, x0 - 8, Math.min(y0, y1) - 9, len + 16, Math.abs(y1 - y0) + 18, 8); ctx.stroke(); ctx.restore(); }
  ssStrand(ctx, x0, y0, x1, y1, { color: s.rrna ? P.rrna : P.rna, lw: s.rrna ? 2.6 : 2, tickEvery: 8, tickLen: 3, alpha });
  dot(ctx, x0, y0, 4, P.samples[TAXA[s.taxon]], alpha);   // taxon tag
}

function probes(ctx, s, P, alpha, bound) {
  if (alpha <= 0 || bound <= 0) return;
  const n = Math.max(2, Math.floor(s.len / 26));
  for (let k = 0; k < n; k++) {
    const u0 = (k + 0.15) / n, u1 = (k + 0.85) / n;
    const b = sp(bound, k / n * 0.6, k / n * 0.6 + 0.4);
    if (b <= 0) continue;
    const ox = Math.cos(s.ang), oy = Math.sin(s.ang);
    const px0 = s.x + ox * s.len * u0, py0 = s.y + oy * s.len * u0 + 8 * (1.5 - b);
    const px1 = s.x + ox * s.len * u1, py1 = s.y + oy * s.len * u1 + 8 * (1.5 - b);
    line(ctx, px0, py0, px1, py1, P.enzyme, 2, alpha * b, [4, 2]);
  }
}

export default {
  id: 'community-rrna-depletion',
  duration: 13.5,
  thumbT: 4.8,
  phases: [
    { t: 0, label: 'Total RNA from a community', caption: 'Most of the RNA is ribosomal, from many taxa. Bacterial mRNA has no poly(A) tail, so it cannot be selected; the rRNA has to be removed instead.' },
    { t: 3, label: 'Probes hybridise', caption: 'DNA oligos complementary to 16S, 23S and 5S (and host rRNA) bind the ribosomal RNA of the taxa they were designed for.' },
    { t: 6, label: 'RNase H digests the hybrids', caption: 'RNA in RNA:DNA hybrids is destroyed. rRNA from a divergent taxon that the probes did not match survives; an mRNA that resembled rRNA is lost with it.' },
    { t: 8.6, label: 'What remains', caption: 'After depletion, 5–50 % of reads are still rRNA, plus tRNA, small RNAs and host RNA. The usable microbial mRNA is what is left.' },
    { t: 11, label: 'In your data', caption: 'Remove rRNA computationally, compare taxa only within one kit, and compute effective depth from the mRNA fraction rather than the read count.' },
  ],
  draw(ctx, t, W, H, P) {
    const sceneA = 1 - sp(t, 8.4, 9.0);
    ctx.save(); ctx.globalAlpha *= sceneA;
    // pool box
    ctx.fillStyle = withAlpha(P.liquid, 0.3); ctx.strokeStyle = P.grid; ctx.lineWidth = 1.5;
    roundRect(ctx, BX0, BY0, BX1 - BX0, BY1 - BY0, 12); ctx.fill(); ctx.stroke();

    const bindStart = 3.2, digestStart = 6.2;
    STRANDS.forEach(s => {
      const divergent = s.rrna && s.taxon === 3;
      const target = (s.rrna && !divergent) || s.lookalike;        // what the probes bind
      const bound = target ? sp(t, bindStart + hash(s.i, 7) * 0.8, bindStart + 1.2 + hash(s.i, 7) * 0.8) : 0;
      const digest = target ? sp(t, digestStart + hash(s.i, 8) * 0.9, digestStart + 1.3 + hash(s.i, 8) * 0.9) : 0;
      const jitY = Math.sin(t * 1.3 + s.i) * 1.5;
      const sj = { ...s, y: s.y + jitY };
      const outline = divergent && t > bindStart + 1.2 && t < 8.6 ? P.gold : (s.lookalike && t > bindStart + 1.2 && t < 8.6 ? P.alert : null);
      strand(ctx, sj, P, 1 - digest, { shrink: digest * 0.85, outline });
      probes(ctx, sj, P, (1 - digest), bound);
      if (digest > 0 && digest < 1) blob(ctx, sj.x + Math.cos(s.ang) * s.len * (1 - digest * 0.85) + 8, sj.y - 5, 8, P.enzyme, { seed: s.i + 20, alpha: 1 });
    });

    // legend / labels per phase
    const la0 = win(t, 0.3, 3.2, 0.3);
    text(ctx, 'rRNA (16S / 23S / 5S)', BX0 + 10, BY1 + 18, { size: 11.5, color: P.rrna, alpha: la0 });
    text(ctx, 'mRNA, no poly(A) tail', BX0 + 190, BY1 + 18, { size: 11.5, color: P.rna, alpha: la0 });
    text(ctx, '●  colour = taxon', BX0 + 370, BY1 + 18, { size: 11.5, color: P.inkDim, alpha: la0 });
    text(ctx, 'probes: DNA oligos against common 16S / 23S sequences', (BX0 + BX1) / 2, BY1 + 18, { size: 11.5, color: P.enzyme, align: 'center', alpha: win(t, 3.2, 6.2, 0.3) });
    text(ctx, 'RNase H cuts the RNA strand of every RNA:DNA hybrid', (BX0 + BX1) / 2, BY1 + 18, { size: 11.5, color: P.enzyme, align: 'center', alpha: win(t, 6.2, 8.6, 0.3) });
    ctx.restore();

    // side callouts (not dimmed with the scene until the end)
    const divergent = STRANDS.find(s => s.rrna && s.taxon === 3);
    const look = STRANDS.find(s => s.lookalike);
    const ca = win(t, 4.4, 8.6, 0.3) * sceneA;
    const DY = 140, LY = 330;
    callout(ctx, 'divergent rRNA: no probe matches', 700, DY, P, { alpha: ca, size: 12, color: P.gold, to: [divergent.x + divergent.len + 10, divergent.y] });
    text(ctx, 'archaea, unusual Firmicutes, protists…', 700, DY + 18, { size: 11, color: P.inkDim, alpha: ca });
    const cb = win(t, 7.0, 8.6, 0.3) * sceneA;
    text(ctx, 'survives → still rRNA in your reads', 700, DY + 40, { size: 12, color: P.alert, alpha: cb });
    callout(ctx, 'an mRNA that looked like rRNA', 700, LY, P, { alpha: win(t, 4.8, 8.6, 0.3) * sceneA, size: 12, color: P.alert, to: [look.x + look.len + 10, look.y] });
    text(ctx, 'lost with the hybrids', 700, LY + 18, { size: 11, color: P.alert, alpha: cb });

    // ───── what remains (8.6 – 11.2) ─────
    const aR = win(t, 8.6, 11.2, 0.5);
    if (aR > 0) {
      const bx = 120, by = 180, bw = 700, bh = 40;
      text(ctx, 'reads from the depleted library', bx, 130, { size: 14, color: P.ink, weight: 600, alpha: aR });
      const parts = PARTS(P);
      let cx = bx; const g = sp(t, 8.9, 9.9);
      parts.forEach(([l, f, c], k) => {
        const w = bw * f * g;
        ctx.save(); ctx.globalAlpha *= aR; ctx.fillStyle = c; ctx.fillRect(cx, by, w, bh); ctx.restore();
        text(ctx, l, cx + w / 2, by + bh + 18, { size: 11.5, color: k === 3 ? P.rna : P.inkDim, align: 'center', alpha: aR * g, weight: k === 3 ? 600 : 400 });
        cx += w;
      });
      text(ctx, '5–50 %, depends on kit and community', bx + bw * 0.14, by - 14, { size: 11, color: P.rrna, align: 'center', alpha: aR * sp(t, 9.8, 10.2) });
      text(ctx, 'the usable fraction', bx + bw * 0.775, by - 14, { size: 11, color: P.rna, align: 'center', alpha: aR * sp(t, 9.8, 10.2) });
      text(ctx, 'a 20 M-read library with 28 % rRNA and 18 % host has ~9 M microbial mRNA reads', W / 2, by + bh + 60, { size: 12.5, color: P.gold, align: 'center', alpha: aR * sp(t, 10.2, 10.7) });
    }

    // ───── in your data (11 – end) ─────
    const aE = win(t, 11, 14, 0.5);
    if (aE > 0) {
      const notes = [
        ['filter rRNA computationally (SortMeRNA, RiboDetector) and report the residual fraction per sample', P.ink],
        ['taxa the probes miss look more abundant in raw counts: compare within one kit, after rRNA removal', P.alert],
        ['effective depth = mRNA fraction × reads, not the read count on the invoice', P.gold],
        ['strandedness (dUTP) separates sense expression from antisense and gDNA: verify it first', P.inkDim],
      ];
      // the composition bar again, small, as a reminder
      { const bx = 160, by = 96, bw = 640, bh = 22; let cx = bx;
        PARTS(P).forEach(([l, f, c], k) => { const w = bw * f; ctx.save(); ctx.globalAlpha *= aE; ctx.fillStyle = c; ctx.fillRect(cx, by, w, bh); ctx.restore(); text(ctx, l, cx + w / 2, by + bh + 14, { size: 11, color: k === 3 ? P.rna : P.inkDim, align: 'center', alpha: aE }); cx += w; }); }
      text(ctx, 'in your data', 100, 196, { size: 15, color: P.ink, weight: 600, alpha: aE });
      notes.forEach(([s, c], k) => text(ctx, s, 100, 240 + k * 55, { size: 14, color: c, alpha: aE * sp(t, 11.3 + k * 0.3, 11.8 + k * 0.3), maxWidth: 780 }));
    }
  },
};
