// From read pairs to contact matrix: mates aligned independently, pairs
// classified, duplicates removed, valid pairs binned and balanced.
import { prog, sp, win, pulse, lerp, hash, text, callout, dsFragment, dot, line, arrow, roundRect, curve, withAlpha } from '../draw.js';

const GY = 290, GX0 = 80, GX1 = 880, LA = 230, LB = 700;   // genome line, loci
const INS = { x0: 330, x1: 630, y: 130, j: 480 };            // the insert
const NB = 12;                                                // contact map bins

// deterministic contact matrix: diagonal decay + two loops + one biased row
function contact(i, j) {
  const d = Math.abs(i - j);
  let v = Math.exp(-d / 2.2) * 0.95 + 0.04 + 0.06 * hash(i * NB + j, 5);
  if ((i === 2 && j === 7) || (i === 7 && j === 2)) v += 0.45;
  if ((i === 5 && j === 10) || (i === 10 && j === 5)) v += 0.4;
  return Math.min(1, v);
}

export default {
  id: 'hic-pairs',
  duration: 14,
  thumbT: 9.6,
  phases: [
    { t: 0, label: 'One pair, two loci', caption: 'Read 1 and Read 2 come from the two ends of one insert, but that insert is a junction: its halves belong to two loci far apart on the genome.' },
    { t: 2.5, label: 'Align each mate alone', caption: 'Mates are aligned independently (bwa mem -5SP, chromap, HiC-Pro). A read that runs through the junction splits into a primary and a supplementary alignment.' },
    { t: 5, label: 'Classify the pairs', caption: 'Using the restriction map, pairs are sorted into valid contacts and the ligation artefacts; duplicates and low-MAPQ pairs are dropped.' },
    { t: 8, label: 'Bin and balance', caption: 'Valid pairs are counted into bins to make a contact matrix; balancing removes coverage bias from site density, GC and mappability.' },
    { t: 11, label: 'Resolution', caption: 'A bin size is only usable with enough pairs in it, and the distance decay should be a smooth power law before any feature is called.' },
  ],
  draw(ctx, t, W, H, P) {
    const colA = P.samples[1], colB = P.samples[3];
    const fly = sp(t, 2.8, 3.8);
    const dimA = 1 - sp(t, 5.0, 5.6);

    // ── scene A: insert, reads, genome line ──
    if (dimA > 0.05) {
      ctx.save(); ctx.globalAlpha *= dimA;
      dsFragment(ctx, INS.x0, INS.j, INS.y, { colorA: colA, colorB: colA, rungEvery: 8, lw: 2.6, gap: 7 });
      dsFragment(ctx, INS.j, INS.x1, INS.y, { colorA: colB, colorB: colB, rungEvery: 8, lw: 2.6, gap: 7 });
      dot(ctx, INS.j, INS.y, 5, P.gold, 1);
      ctx.save(); ctx.fillStyle = P.p5; ctx.fillRect(INS.x0 - 22, INS.y - 5, 20, 10); ctx.fillStyle = P.p7; ctx.fillRect(INS.x1 + 2, INS.y - 5, 20, 10); ctx.restore();
      text(ctx, 'one library insert', 480, INS.y - 40, { size: 13, color: P.ink, weight: 600, align: 'center', alpha: win(t, 0, 2.6, 0.3) });
      text(ctx, 'junction', INS.j, INS.y - 20, { size: 10.5, color: P.gold, align: 'center' });
      // genome line
      line(ctx, GX0, GY, GX1, GY, P.inkFaint, 1.5, 1);
      [[LA, colA, 'locus A'], [LB, colB, 'locus B']].forEach(([x, c, l]) => { ctx.save(); ctx.fillStyle = c; ctx.fillRect(x - 16, GY - 5, 32, 10); ctx.restore(); text(ctx, l, x, GY + 18, { size: 11.5, color: c, align: 'center' }); });
      text(ctx, 'genome', GX0, GY - 14, { size: 11, color: P.inkDim });
      text(ctx, '10 Mb', (LA + LB) / 2, GY + 18, { size: 11, color: P.inkDim, align: 'center' });
      // reads: R1 from the left end rightwards, R2 from the right end leftwards; fly to loci
      const rl = 110;
      const r1x0 = lerp(INS.x0, LA - 16, fly), r1y = lerp(INS.y - 16, GY - 16, fly);
      const r2x1 = lerp(INS.x1, LB + 16, fly), r2y = lerp(INS.y + 16, GY - 16, fly);
      arrow(ctx, r1x0, r1y, r1x0 + rl * lerp(1, 0.3, fly), r1y, P.p5, { lw: 3, head: 7 });
      arrow(ctx, r2x1, r2y, r2x1 - rl * lerp(1, 0.3, fly), r2y, P.p7, { lw: 3, head: 7 });
      text(ctx, 'R1', r1x0 - 10, r1y, { size: 11, color: P.p5, align: 'right', weight: 600 });
      text(ctx, 'R2', r2x1 + 10, r2y, { size: 11, color: P.p7, weight: 600 });
      if (fly > 0 && fly < 1) { line(ctx, INS.x0, INS.y - 16, r1x0, r1y, P.p5, 1, 0.6, [3, 3]); line(ctx, INS.x1, INS.y + 16, r2x1, r2y, P.p7, 1, 0.6, [3, 3]); }
      // chimeric read: a longer R1 that reads through the junction
      const ch = win(t, 3.6, 5.2, 0.3);
      if (ch > 0) {
        const cy = INS.y + 50;
        const split = sp(t, 4.0, 4.8);
        const p1x = lerp(INS.x0, LA - 70, split), p1y = lerp(cy, GY - 40, split);
        const p2x = lerp(INS.j + 4, LB - 40, split), p2y = lerp(cy, GY - 40, split);
        arrow(ctx, p1x, p1y, p1x + (INS.j - INS.x0 - 4), p1y, P.p5, { lw: 3, head: 6, alpha: ch });
        arrow(ctx, p2x, p2y, p2x + 60, p2y, P.p5, { lw: 3, head: 6, alpha: ch * 0.7 });
        dot(ctx, lerp(INS.j, LA + 70, split), lerp(cy, GY - 40, split), 3.5, P.gold, ch * (1 - split));
        text(ctx, 'read through the junction', INS.x0, cy + 16, { size: 10.5, color: P.inkDim, alpha: ch * (1 - split) });
        text(ctx, 'primary', p1x, p1y - 12, { size: 10, color: P.p5, alpha: ch * split });
        text(ctx, 'supplementary (SA tag): split at GATCGATC', p2x, p2y - 12, { size: 10, color: P.p5, alpha: ch * split });
      }
      text(ctx, 'mates aligned independently: no insert-size assumption', 480, GY + 60, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 2.6, 5.2, 0.3) });
      ctx.restore();
    }

    // ── scene B: classification (5 – 8) ──
    {
      const a = win(t, 5.0, 8.2, 0.5);
      if (a > 0) {
        text(ctx, 'every pair gets a class', 480, 60, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        const rows = [
          { name: 'valid pair', sub: 'mates on two different fragments', frac: 0.65, col: P.good, icon: 'valid' },
          { name: 'dangling end', sub: 'same fragment, mates point inward', frac: 0.10, col: P.alert, icon: 'in' },
          { name: 'self-circle', sub: 'same fragment, mates point outward', frac: 0.03, col: P.alert, icon: 'out' },
          { name: 're-ligation', sub: 'adjacent fragments; looks uncut', frac: 0.07, col: P.inkDim, icon: 'adj' },
          { name: 'duplicate', sub: 'identical coordinates of both mates', frac: 0.10, col: P.alert, icon: 'dup' },
          { name: 'low MAPQ', sub: 'one mate ambiguous (< 30)', frac: 0.05, col: P.inkDim, icon: 'mapq' },
        ];
        const X = 90, Y0 = 100, RH = 62, BX = 620, BW = 250;
        rows.forEach((r, k) => {
          const y = Y0 + k * RH; const g = a * sp(t, 5.3 + k * 0.25, 5.8 + k * 0.25);
          // icon: fragments as short bars with arrows
          const ix = X;
          if (r.icon === 'valid') { dsFragment(ctx, ix, ix + 36, y, { colorA: colA, colorB: colA, alpha: g, rungs: false, gap: 4 }); dsFragment(ctx, ix + 40, ix + 76, y, { colorA: colB, colorB: colB, alpha: g, rungs: false, gap: 4 }); dot(ctx, ix + 38, y, 3, P.gold, g); arrow(ctx, ix + 4, y - 9, ix + 28, y - 9, P.p5, { lw: 2, head: 4, alpha: g }); arrow(ctx, ix + 72, y + 9, ix + 48, y + 9, P.p7, { lw: 2, head: 4, alpha: g }); }
          if (r.icon === 'in' || r.icon === 'out') { dsFragment(ctx, ix, ix + 76, y, { colorA: P.dna, colorB: P.dna, alpha: g, rungs: false, gap: 4 }); if (r.icon === 'in') { arrow(ctx, ix + 4, y - 9, ix + 30, y - 9, P.p5, { lw: 2, head: 4, alpha: g }); arrow(ctx, ix + 72, y + 9, ix + 46, y + 9, P.p7, { lw: 2, head: 4, alpha: g }); } else { arrow(ctx, ix + 30, y - 9, ix + 4, y - 9, P.p5, { lw: 2, head: 4, alpha: g }); arrow(ctx, ix + 46, y + 9, ix + 72, y + 9, P.p7, { lw: 2, head: 4, alpha: g }); } }
          if (r.icon === 'adj') { dsFragment(ctx, ix, ix + 37, y, { colorA: P.dna, colorB: P.dna, alpha: g, rungs: false, gap: 4 }); dsFragment(ctx, ix + 39, ix + 76, y, { colorA: P.dna, colorB: P.dna, alpha: g, rungs: false, gap: 4 }); dot(ctx, ix + 38, y, 3, P.gold, g); arrow(ctx, ix + 4, y - 9, ix + 28, y - 9, P.p5, { lw: 2, head: 4, alpha: g }); arrow(ctx, ix + 72, y + 9, ix + 48, y + 9, P.p7, { lw: 2, head: 4, alpha: g }); }
          if (r.icon === 'dup') { [0, 1].forEach(d => { arrow(ctx, ix + 4, y - 9 + d * 12, ix + 28, y - 9 + d * 12, P.p5, { lw: 2, head: 4, alpha: g * (d ? 0.5 : 1) }); arrow(ctx, ix + 72, y - 9 + d * 12, ix + 48, y - 9 + d * 12, P.p7, { lw: 2, head: 4, alpha: g * (d ? 0.5 : 1) }); }); line(ctx, ix + 30, y + 12, ix + 46, y - 6, P.alert, 2, g); }
          if (r.icon === 'mapq') { arrow(ctx, ix + 4, y - 9, ix + 28, y - 9, P.p5, { lw: 2, head: 4, alpha: g }); arrow(ctx, ix + 72, y + 9, ix + 48, y + 9, P.p7, { lw: 2, head: 4, alpha: g * 0.35 }); text(ctx, '?', ix + 60, y + 9, { size: 12, color: P.alert, align: 'center', alpha: g, weight: 700 }); }
          text(ctx, r.name, X + 100, y - 8, { size: 12.5, color: r.col, weight: 600, alpha: g });
          text(ctx, r.sub, X + 100, y + 10, { size: 10.5, color: P.inkDim, alpha: g });
          // bar
          ctx.save(); ctx.globalAlpha *= g; ctx.fillStyle = P.grid; ctx.fillRect(BX, y - 6, BW, 12); ctx.fillStyle = r.col; ctx.fillRect(BX, y - 6, BW * r.frac * sp(t, 5.5 + k * 0.25, 6.2 + k * 0.25), 12); ctx.restore();
          text(ctx, `${Math.round(r.frac * 100)} %`, BX + BW + 10, y, { size: 11, color: P.inkDim, alpha: g });
        });
        text(ctx, 'only valid pairs go into the matrix; typical: 50–80 % of uniquely mapped pairs', 480, Y0 + 6 * RH + 6, { size: 11.5, color: P.inkDim, align: 'center', alpha: a * sp(t, 7.0, 7.6) });
      }
    }

    // ── scene C: contact map (8 – 14) ──
    {
      const a = win(t, 8.0, 14.5, 0.5);
      if (a > 0) {
        const MX = 110, MY = 110, MS = 300, cs = MS / NB;
        text(ctx, 'contact matrix', MX, 84, { size: 14, color: P.ink, weight: 600, alpha: a });
        const reveal = sp(t, 8.3, 9.6);
        const bal = sp(t, 9.8, 10.6);
        for (let i = 0; i < NB; i++) for (let j = 0; j < NB; j++) {
          const order = hash(i * NB + j, 9);
          const show = a * prog(reveal, order * 0.8, order * 0.8 + 0.2);
          if (show <= 0) continue;
          let v = contact(i, j);
          // row 4 is over-covered (site density) before balancing
          if (i === 4 || j === 4) v = Math.min(1, v + 0.5 * (1 - bal));
          ctx.save(); ctx.globalAlpha *= show;
          ctx.fillStyle = withAlpha(P.dna, 0.08 + 0.92 * v);
          ctx.fillRect(MX + j * cs + 0.5, MY + i * cs + 0.5, cs - 1, cs - 1);
          ctx.restore();
        }
        ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; ctx.strokeRect(MX, MY, MS, MS); ctx.restore();
        text(ctx, 'bin (e.g. 25 kb)', MX + MS / 2, MY + MS + 16, { size: 11, color: P.inkDim, align: 'center', alpha: a });
        callout(ctx, 'diagonal: nearby loci', MX + MS + 14, MY + 40, P, { alpha: a * sp(t, 9.0, 9.5), size: 11.5, to: [MX + 60, MY + 50] });
        callout(ctx, 'off-diagonal spot: a loop', MX + MS + 14, MY + 90, P, { alpha: a * sp(t, 9.3, 9.8), size: 11.5, color: P.gold, to: [MX + 7.5 * cs, MY + 2.5 * cs] });
        callout(ctx, 'bright row: more sites / GC, not more contacts', MX + MS + 14, MY + 4.5 * cs, P, { alpha: a * win(t, 9.4, 10.6, 0.3), size: 11.5, color: P.alert, to: [MX + MS - 4, MY + 4.5 * cs] });
        text(ctx, 'balanced (ICE / KR): rows and columns sum to one', MX + MS + 14, MY + 4.5 * cs, { size: 11.5, color: P.good, alpha: a * sp(t, 10.6, 11.0) });
        text(ctx, 'bins with low coverage or no mappability are masked', MX + MS + 14, MY + 4.5 * cs + 20, { size: 11, color: P.inkDim, alpha: a * sp(t, 10.8, 11.2) });
      }
    }
    // ── scene D: resolution note (11 – 14) ──
    {
      const a = win(t, 11.0, 14.5, 0.5);
      if (a > 0) {
        const gx = 470, gy = 300, gw = 300, gh = 130;
        text(ctx, 'before calling features', gx, 268, { size: 13, color: P.ink, weight: 600, alpha: a });
        line(ctx, gx, gy + gh, gx + gw, gy + gh, P.inkFaint, 1, a); line(ctx, gx, gy, gx, gy + gh, P.inkFaint, 1, a);
        curve(ctx, gx, gy, gw, gh, u => 0.95 - 0.85 * u, P.good, { lw: 2.2, alpha: a * sp(t, 11.2, 12.0) });
        text(ctx, 'log P(s)', gx - 4, gy + 4, { size: 10.5, color: P.inkDim, align: 'right', alpha: a });
        text(ctx, 'log s', gx + gw, gy + gh + 14, { size: 10.5, color: P.inkDim, align: 'right', alpha: a });
        text(ctx, 'distance decay: a smooth power law', gx + 110, gy + 50, { size: 11, color: P.good, alpha: a * sp(t, 11.6, 12.2) });
        const notes = [
          ['≥ 1,000 valid pairs per bin, on average, at the bin size you call at', P.gold],
          ['~100 M pairs → 25–50 kb bins; ~1 B pairs → 1–5 kb in a human genome', P.inkDim],
          ['replicates should agree (HiCRep) before pooling', P.inkDim],
        ];
        notes.forEach(([s, c], k) => text(ctx, s, gx, gy + gh + 44 + k * 22, { size: 11.5, color: c, alpha: a * sp(t, 12.2 + k * 0.3, 12.7 + k * 0.3), maxWidth: 420 }));
      }
    }
  },
};
