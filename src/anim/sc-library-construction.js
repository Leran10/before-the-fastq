// 10x 3' library construction: full-length barcoded cDNA is fragmented, a Read 2
// adapter goes on every piece, and the sample-index PCR amplifies only the piece
// that still carries the Read 1 / barcode end. End: anatomy of the final molecule
// and why reads pile up at the 3' end.
import { sp, win, pulse, lerp, hash, text, dsFragment, arrow, dot, line, roundRect, withAlpha } from '../draw.js';

const Y = 170;                                  // molecule baseline
const X0 = 80, BODY0 = 250, BODY1 = 830, TSO1 = 862;
const BLK = [                                   // left-end tag blocks (x0, x1, key)
  { x0: X0, x1: X0 + 42, key: 'r1', label: 'Read 1' },
  { x0: X0 + 42, x1: X0 + 42 + 34, key: 'cb', label: 'CB' },
  { x0: X0 + 76, x1: X0 + 76 + 24, key: 'umi', label: 'UMI' },
  { x0: X0 + 100, x1: BODY0, key: 'dt', label: 'TTTT' },
];
// cut positions along the body (deterministic)
const CUTS = [0.21, 0.42, 0.62, 0.82].map((f, i) => BODY0 + (BODY1 - BODY0) * (f + (hash(i, 7) - 0.5) * 0.04));
const PIECES = [];
{
  let x = X0;
  const ends = [...CUTS, TSO1];
  ends.forEach((e, k) => { PIECES.push({ k, x0: x, x1: e }); x = e; });
}
const SCALE = 0.8, SPREAD = 40, AD = 14;        // shrink + spread after cutting; adapter width

function blockColor(P, key) {
  return key === 'r1' ? P.p5 : key === 'cb' ? P.samples[2] : key === 'umi' ? P.gold : key === 'dt' ? P.inkFaint : P.enzyme;
}

export default {
  id: 'sc-library-construction',
  duration: 14,
  thumbT: 9.4,
  phases: [
    { t: 0, label: 'Full-length barcoded cDNA', caption: 'After cDNA amplification each molecule is 1–2 kb: barcode and UMI at the poly(A) end, a TSO handle at the transcript’s 5′ end.' },
    { t: 2.5, label: 'Fragmentation', caption: 'Enzymatic fragmentation, end repair and A-tailing in one tube cut every cDNA into several pieces.' },
    { t: 5, label: 'Read 2 adapter on every piece', caption: 'One adapter carrying the Read 2 primer site is ligated to both ends of every fragment, barcode end or not.' },
    { t: 7.5, label: 'Sample-index PCR', caption: 'One primer anneals to Read 1 and adds P5; the other anneals to the adapter and adds i7 + P7. Only the barcode-end piece has both sites.' },
    { t: 10.6, label: 'The final molecule', caption: 'Read 1 reads 28 bp of tags; Read 2 reads the cDNA toward the poly(A) site. One fragment per transcript, always its 3′ end.' },
  ],
  draw(ctx, t, W, H, P) {
    const cut = sp(t, 2.8, 4.2);
    const lig = sp(t, 5.2, 6.4);
    const pcr = sp(t, 7.8, 9.0);
    const fadeAll = 1 - sp(t, 10.6, 11.3);
    // transform original x -> displayed x for piece k
    const tx = (x, k) => 480 + (x - 480) * lerp(1, SCALE, cut) + (k - 2) * SPREAD * cut;
    const dy = k => (hash(k, 3) - 0.5) * 14 * cut;

    ctx.save(); ctx.globalAlpha *= fadeAll;
    if (fadeAll > 0.02) {
      // ---- scene title ----
      text(ctx, 'one amplified cDNA molecule, 1–2 kb', 480, 60, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: win(t, 0.2, 2.6, 0.4) });
      text(ctx, 'enzymatic fragmentation + end repair + A-tailing', 480, 60, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: win(t, 2.6, 5.0, 0.4) });
      text(ctx, 'ligate the Read 2 adapter to every end', 480, 60, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: win(t, 5.0, 7.5, 0.4) });
      text(ctx, 'sample-index PCR: P5 from Read 1, i7 + P7 from the adapter', 480, 60, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: win(t, 7.5, 11.0, 0.4) });

      // ---- pieces ----
      PIECES.forEach(p => {
        const k = p.k;
        const isTag = k === 0;
        const internal = k > 0;
        const dim = internal ? 1 - 0.75 * pcr : 1;
        const y = Y + dy(k);
        const px0 = tx(p.x0, k), px1 = tx(p.x1, k);
        ctx.save(); ctx.globalAlpha *= dim;
        // gold highlight behind the barcode piece during PCR
        if (isTag && pcr > 0) {
          ctx.save(); ctx.globalAlpha *= 0.18 + 0.1 * Math.sin(t * 4); ctx.fillStyle = P.gold;
          roundRect(ctx, px0 - 22, y - 16, px1 - px0 + 44, 32, 8); ctx.fill(); ctx.restore();
        }
        // body (blue dsDNA)
        const b0 = Math.max(p.x0, BODY0), b1 = Math.min(p.x1, BODY1);
        if (b1 > b0) dsFragment(ctx, tx(b0, k), tx(b1, k), y, { colorA: P.dna, colorB: P.dnaLight, gap: 6, lw: 2.2, rungEvery: 8 });
        // tag blocks on piece 0
        if (isTag) {
          BLK.forEach(b => {
            const bx0 = tx(b.x0, k), bx1 = tx(b.x1, k);
            ctx.fillStyle = blockColor(P, b.key); roundRect(ctx, bx0, y - 7, bx1 - bx0 - 1, 14, 3); ctx.fill();
            if (b.key === 'dt') text(ctx, 'TTTT', (bx0 + bx1) / 2, y, { size: 9, color: P.inkDim, align: 'center', mono: true, weight: 600 });
          });
        }
        // TSO block on the last piece
        if (k === PIECES.length - 1) { ctx.fillStyle = P.enzyme; roundRect(ctx, tx(BODY1, k), y - 7, tx(TSO1, k) - tx(BODY1, k), 14, 3); ctx.fill(); }
        // Read 2 adapters (violet) at both ends, growing in
        if (lig > 0) {
          const w = AD * lig;
          const leftA = isTag ? 1 - pcr : 1;   // the outer adapter on the barcode end is lost in PCR
          ctx.save(); ctx.globalAlpha *= leftA; ctx.fillStyle = P.p7; roundRect(ctx, px0 - w, y - 6, w, 12, 3); ctx.fill(); ctx.restore();
          ctx.fillStyle = P.p7; roundRect(ctx, px1, y - 6, w, 12, 3); ctx.fill();
        }
        ctx.restore();
        // cut flash at the right end of each piece except the last
        if (k < PIECES.length - 1) {
          const f = pulse(t, 2.6 + k * 0.12, 3.3 + k * 0.12);
          if (f > 0) dot(ctx, tx(p.x1, k) + 2, y, 4 + 7 * f, P.gold, f * 0.9);
        }
      });

      // ---- phase 0 labels ----
      {
        const a = win(t, 0.3, 2.7, 0.4);
        text(ctx, 'Read 1', tx(X0 + 21, 0), Y - 22, { size: 10.5, color: P.p5, align: 'center', alpha: a, weight: 600 });
        text(ctx, 'cell barcode', tx(X0 + 59, 0), Y + 24, { size: 10.5, color: P.samples[2], align: 'center', alpha: a, weight: 600 });
        text(ctx, 'UMI', tx(X0 + 88, 0), Y - 22, { size: 10.5, color: P.gold, align: 'center', alpha: a, weight: 600 });
        text(ctx, 'poly(dT) at the poly(A) tail', tx(BODY0 + 10, 0), Y + 24, { size: 10.5, color: P.inkDim, alpha: a });
        text(ctx, 'cDNA (blue): the whole transcript, 3′ end here', 540, Y - 24, { size: 11, color: P.dna, align: 'center', alpha: a });
        text(ctx, 'TSO', TSO1 + 10, Y, { size: 10.5, color: P.enzyme, alpha: a });
        text(ctx, '← 3′ of transcript', X0 + 10, Y + 46, { size: 11, color: P.inkDim, alpha: a });
        text(ctx, '5′ of transcript →', TSO1, Y + 46, { size: 11, color: P.inkDim, align: 'right', alpha: a });
      }
      // ---- phase 1 labels ----
      text(ctx, '5 pieces, only one carries the barcode', 480, Y + 60, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 4.0, 5.2, 0.3) });
      // ---- phase 2 label ----
      {
        const a = win(t, 5.4, 7.6, 0.3);
        const p3 = PIECES[2];
        const x = tx(p3.x1, 2) + AD + 4;
        text(ctx, 'Read 2 adapter', 480, Y + 60, { size: 12, color: P.p7, align: 'center', alpha: a, weight: 600 });
        text(ctx, 'on both ends of every fragment', 480, Y + 78, { size: 11.5, color: P.inkDim, align: 'center', alpha: a });
      }
      // ---- phase 3: primers, copies, dropped pieces ----
      if (t > 7.5) {
        const a = win(t, 7.6, 11.2, 0.3);
        const p0 = PIECES[0];
        const y0 = Y + dy(0);
        const r1x = tx(X0 + 21, 0);              // Read 1 block centre
        const adx = tx(p0.x1, 0) + AD * lig / 2;  // right adapter centre
        const come = sp(t, 7.7, 8.5);
        const ext = sp(t, 8.6, 9.3);
        // teal primer flies in from upper left and anneals to Read 1
        const tpx = lerp(40, r1x, come), tpy = lerp(90, y0 - 12, come);
        line(ctx, tpx - 16, tpy, tpx + 16, tpy, P.p5, 3, a);
        text(ctx, 'primer on Read 1 → adds P5', tpx + 24, tpy - (come > 0.95 ? 10 : 0), { size: 10.5, color: P.p5, alpha: a * (1 - ext), weight: 600 });
        // P5 extension block grows leftward from Read 1
        if (ext > 0) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.p5Dim; roundRect(ctx, tx(X0, 0) - 30 * ext, y0 - 7, 30 * ext, 14, 3); ctx.fill(); ctx.restore(); text(ctx, 'P5', tx(X0, 0) - 15, y0 - 18, { size: 10, color: P.p5, align: 'center', alpha: a * ext, weight: 600 }); }
        // violet primer flies in from lower right and anneals to the adapter
        const vpx = lerp(560, adx, come), vpy = lerp(300, y0 + 12, come);
        line(ctx, vpx - 16, vpy, vpx + 16, vpy, P.p7, 3, a);
        text(ctx, 'primer on Read 2 adapter → adds i7 + P7', vpx + 24, vpy + (come > 0.95 ? 12 : 0), { size: 10.5, color: P.p7, alpha: a * (1 - ext), weight: 600 });
        if (ext > 0) {
          ctx.save(); ctx.globalAlpha *= a;
          const ax = tx(p0.x1, 0) + AD;
          ctx.fillStyle = P.p7Dim; roundRect(ctx, ax, y0 - 7, 44 * ext, 14, 3); ctx.fill();
          ctx.restore();
          text(ctx, 'i7 · P7', ax + 22, y0 + 18, { size: 10, color: P.p7, align: 'center', alpha: a * ext, weight: 600 });
        }
        // copies stacking below
        for (let c = 1; c <= 3; c++) {
          const ca = a * sp(t, 8.9 + c * 0.25, 9.4 + c * 0.25);
          if (ca <= 0) continue;
          const yy = y0 + 24 * c;
          ctx.save(); ctx.globalAlpha *= ca * 0.85;
          ctx.fillStyle = P.p5Dim; roundRect(ctx, tx(X0, 0) - 30, yy - 5, 30, 10, 2); ctx.fill();
          BLK.forEach(b => { ctx.fillStyle = blockColor(P, b.key); roundRect(ctx, tx(b.x0, 0), yy - 5, tx(b.x1, 0) - tx(b.x0, 0) - 1, 10, 2); ctx.fill(); });
          dsFragment(ctx, tx(BODY0, 0), tx(p0.x1, 0), yy, { colorA: P.dna, colorB: P.dnaLight, gap: 4, lw: 1.6, rungs: false });
          ctx.fillStyle = P.p7; roundRect(ctx, tx(p0.x1, 0), yy - 5, AD, 10, 2); ctx.fill();
          ctx.fillStyle = P.p7Dim; roundRect(ctx, tx(p0.x1, 0) + AD, yy - 5, 44, 10, 2); ctx.fill();
          ctx.restore();
        }
        text(ctx, 'amplified: the only piece with both primer sites', tx(X0, 0) - 30, y0 + 108, { size: 11.5, color: P.gold, alpha: a * sp(t, 9.2, 9.7), weight: 600 });
        // internal pieces label
        const mid = (tx(PIECES[1].x0, 1) + tx(PIECES[4].x1, 4)) / 2;
        text(ctx, 'not amplifiable: no Read 1 site', mid, Y + 60, { size: 12, color: P.inkDim, align: 'center', alpha: a * pcr });
        text(ctx, 'made, but never become clusters', mid, Y + 78, { size: 11, color: P.inkFaint, align: 'center', alpha: a * pcr });
      }
    }
    ctx.restore();

    // ---- phase 4: anatomy ----
    const fa = win(t, 10.7, 14.6, 0.6);
    if (fa > 0) {
      const AY = 150, AX = 110;
      const segs = [
        { w: 46, c: P.p5Dim, label: 'P5', up: true, lc: P.p5 },
        { w: 60, c: P.p5, label: 'Read 1 site', up: false, lc: P.p5 },
        { w: 58, c: P.samples[2], label: 'cell barcode · 16', up: true, lc: P.samples[2] },
        { w: 44, c: P.gold, label: 'UMI · 12', up: false, lc: P.gold },
        { w: 40, c: P.inkFaint, label: 'poly(dT)', up: true, lc: P.inkDim },
        { w: 290, c: P.dna, label: 'cDNA: the last few hundred bases of the transcript (3′ end)', up: false, lc: P.dna },
        { w: 60, c: P.p7, label: 'Read 2 site', up: true, lc: P.p7 },
        { w: 46, c: P.p7Dim, label: 'i7 · 10', up: false, lc: P.p7 },
        { w: 46, c: P.p7Dim, label: 'P7', up: true, lc: P.p7 },
      ];
      text(ctx, 'what one library molecule looks like', 480, 70, { size: 15, color: P.ink, weight: 600, align: 'center', alpha: fa });
      let x = AX;
      segs.forEach((s, i) => {
        const g = fa * sp(t, 10.8 + i * 0.12, 11.3 + i * 0.12);
        ctx.save(); ctx.globalAlpha *= g; ctx.fillStyle = s.c; roundRect(ctx, x, AY - 9, s.w - 2, 18, 3); ctx.fill(); ctx.restore();
        if (i === 5) { ctx.save(); ctx.globalAlpha *= g * 0.5; ctx.strokeStyle = P.dnaLight; ctx.lineWidth = 1; ctx.beginPath(); for (let k = x + 8; k < x + s.w - 8; k += 9) { ctx.moveTo(k, AY - 6); ctx.lineTo(k, AY + 6); } ctx.stroke(); ctx.restore(); }
        const ly = s.up ? AY - 24 : AY + 24;
        text(ctx, s.label, x + (s.w - 2) / 2, ly, { size: 10.5, color: s.lc, align: 'center', alpha: g, weight: 600, maxWidth: i === 5 ? 300 : 90 });
        x += s.w;
      });
      // reads
      const ra = fa * sp(t, 12.0, 12.6);
      const r1x0 = AX + 46, r1x1 = r1x0 + 60 + 58 + 44;        // Read 1 covers CB + UMI (28 bp)
      const r2x1 = AX + 46 + 60 + 58 + 44 + 40 + 290, r2x0 = r2x1 - 190;
      arrow(ctx, r1x0, AY + 52, r1x0 + (r1x1 - r1x0) * sp(t, 12.0, 12.8), AY + 52, P.p5, { lw: 3, head: 7, alpha: ra });
      text(ctx, 'Read 1: 28 cycles, barcode + UMI', r1x0, AY + 70, { size: 11, color: P.p5, alpha: ra, weight: 600 });
      text(ctx, 'no biology in it; never align it', r1x0, AY + 86, { size: 10.5, color: P.inkDim, alpha: ra });
      arrow(ctx, r2x1, AY + 52, r2x1 - (r2x1 - r2x0) * sp(t, 12.0, 12.8), AY + 52, P.p7, { lw: 3, head: 7, alpha: ra });
      text(ctx, 'Read 2: 90+ cycles of cDNA', r2x1, AY + 70, { size: 11, color: P.p7, align: 'right', alpha: ra, weight: 600 });
      text(ctx, 'sense strand, toward the poly(A) site', r2x1, AY + 86, { size: 10.5, color: P.inkDim, align: 'right', alpha: ra });

      // gene model with reads piled at the 3' end
      const ga = fa * sp(t, 12.7, 13.3);
      if (ga > 0) {
        const GY = 400, GX0 = 150, GX1 = 810;
        line(ctx, GX0, GY, GX1, GY, P.inkFaint, 1.5, ga);
        [[GX0, 70], [GX0 + 150, 60], [GX0 + 300, 50], [GX0 + 440, 220]].forEach(([ex, ew], i) => {
          ctx.save(); ctx.globalAlpha *= ga; ctx.fillStyle = i === 3 ? P.dna : P.dnaDim; roundRect(ctx, ex, GY - 7, ew, 14, 2); ctx.fill(); ctx.restore();
        });
        text(ctx, '5′', GX0 - 18, GY, { size: 11, color: P.inkDim, alpha: ga });
        text(ctx, 'AAAA 3′', GX1 + 6, GY, { size: 11, color: P.inkDim, alpha: ga, mono: true });
        text(ctx, 'exons', GX0 + 35, GY + 20, { size: 10.5, color: P.inkDim, align: 'center', alpha: ga });
        text(ctx, '3′ UTR', GX0 + 440 + 110, GY + 20, { size: 10.5, color: P.dna, align: 'center', alpha: ga });
        // piled reads
        for (let i = 0; i < 14; i++) {
          const g = ga * sp(t, 12.9 + i * 0.04, 13.2 + i * 0.04);
          const rx = GX1 - 40 - hash(i, 11) * 170, ry = GY - 16 - (i % 5) * 7;
          line(ctx, rx, ry, rx + 40, ry, P.p7, 3, g * 0.9);
        }
        text(ctx, '3′ bias is designed in: every read is within a few hundred bases of the poly(A) site', 480, GY + 46, { size: 12, color: P.gold, align: 'center', alpha: ga, weight: 600 });
        text(ctx, 'genes are quantified, isoforms mostly are not', 480, GY + 64, { size: 11, color: P.inkDim, align: 'center', alpha: ga });
      }
    }
  },
};
