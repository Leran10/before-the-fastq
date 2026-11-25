// rRNA removal: total RNA splits into two routes, poly(A) selection and
// probe-based rRNA depletion; then the read-type composition each produces.
import { prog, sp, win, pulse, lerp, hash, text, callout, ssStrand, bead, blob, dot, line, roundRect, withAlpha } from '../draw.js';

// population: kind 0 = rRNA, 1 = mRNA (poly-A), 2 = ncRNA / histone / bacterial (no tail)
const pop = [];
for (let i = 0; i < 26; i++) {
  const kind = i < 17 ? 0 : i < 22 ? 1 : 2;
  pop.push({ i, kind, ax: (hash(i, 1) - 0.5) * 260, ay: (hash(i, 2) - 0.5) * 170, ang: (hash(i, 3) - 0.5) * 0.9, len: kind === 0 ? 46 + hash(i, 4) * 30 : kind === 1 ? 44 + hash(i, 4) * 18 : 22 + hash(i, 4) * 12, keepB: i === 3 || i === 11 });
}
const CY = 185, LX = 215, RX = 745, MX = 480;

function strand(ctx, s, cx, cy, P, alpha, o = {}) {
  if (alpha <= 0) return;
  const x = cx + s.ax * (o.spread ?? 1), y = cy + s.ay * (o.spread ?? 1);
  const c = Math.cos(s.ang), sn = Math.sin(s.ang);
  const color = s.kind === 0 ? P.rrna : s.kind === 1 ? P.rna : P.rnaLight;
  ssStrand(ctx, x - c * s.len / 2, y - sn * s.len / 2, x + c * s.len / 2, y + sn * s.len / 2, { color, lw: s.kind === 0 ? 2 : 2.4, tickEvery: 8, tickLen: 3, alpha });
  if (s.kind === 1) text(ctx, 'AAA', x + c * s.len / 2 + 3, y + sn * s.len / 2, { size: 8.5, color: P.gold, weight: 700, alpha, mono: true });
  return [x, y];
}

function bar(ctx, x, y, w, parts, P, alpha, rev) {
  if (alpha <= 0) return;
  let acc = 0;
  parts.forEach(([frac, color]) => {
    const ww = w * frac * rev;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(x + acc * rev, y, Math.max(0, ww - 1), 20); ctx.restore();
    acc += w * frac;
  });
}

export default {
  id: 'rrna-depletion',
  duration: 14,
  thumbT: 9.6,
  phases: [
    { t: 0, label: 'Total RNA', caption: 'Total RNA is 80–90 % ribosomal RNA; mRNA is a few percent, recognizable by its poly(A) tail.' },
    { t: 3, label: 'Poly(A) selection', caption: 'Oligo(dT) beads capture only polyadenylated mRNA; rRNA, most ncRNA, histone mRNA and bacterial RNA are washed away.' },
    { t: 7, label: 'rRNA depletion', caption: 'Probes hybridize to rRNA and RNase H or beads remove the hybrids; everything else stays, and a little rRNA always survives.' },
    { t: 11, label: 'What the reads look like', caption: 'Poly(A) libraries are mostly exonic; depletion libraries carry intronic pre-mRNA, ncRNA and residual rRNA. They are not interchangeable.' },
  ],
  draw(ctx, t, W, H, P) {
    const split = sp(t, 3.0, 4.2);
    // ---- original population in the centre ----
    const ca = 1 - prog(t, 3.0, 3.8);
    if (ca > 0) {
      pop.forEach(s => strand(ctx, s, MX, CY, P, ca));
      text(ctx, 'total RNA', MX, 60, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: ca });
    }
    const leg = win(t, 0.6, 14.5, 0.4);
    const ly = 342;
    text(ctx, 'rRNA', 60, ly, { size: 11, color: P.rrna, alpha: leg });
    ssStrand(ctx, 95, ly, 125, ly, { color: P.rrna, lw: 2, tickEvery: 8, tickLen: 3, alpha: leg });
    text(ctx, 'mRNA', 150, ly, { size: 11, color: P.rna, alpha: leg });
    ssStrand(ctx, 190, ly, 220, ly, { color: P.rna, lw: 2.4, tickEvery: 8, tickLen: 3, alpha: leg });
    text(ctx, 'AAA', 224, ly, { size: 8.5, color: P.gold, weight: 700, alpha: leg, mono: true });
    text(ctx, 'ncRNA · histone mRNA · bacterial RNA', 262, ly, { size: 11, color: P.rnaLight, alpha: leg });
    ssStrand(ctx, 486, ly, 510, ly, { color: P.rnaLight, lw: 2.4, tickEvery: 8, tickLen: 3, alpha: leg });

    // ---- route A (left): poly(A) ----
    {
      const a = split;
      if (a > 0) {
        text(ctx, 'A · poly(A) selection', LX, 60, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        const beadsA = win(t, 4.2, 14.5, 0.4);
        const bxs = [LX - 70, LX, LX + 70];
        bxs.forEach((bx, k) => bead(ctx, bx, CY + 70, 16, P, beadsA));
        text(ctx, 'oligo(dT) beads', LX, CY + 94, { size: 10.5, color: P.inkDim, align: 'center', alpha: beadsA });
        pop.forEach((s, i) => {
          const cx = lerp(MX, LX, split);
          if (s.kind === 1) {
            const m = sp(t, 4.6 + (i - 17) * 0.15, 5.6 + (i - 17) * 0.15);
            const bx = bxs[(i - 17) % 3], by = CY + 70 - 20 - ((i - 17) >= 3 ? 10 : 0);
            const x = lerp(cx + s.ax, bx, m), y = lerp(CY + s.ay, by, m);
            const c = Math.cos(s.ang * (1 - m)), sn = Math.sin(s.ang * (1 - m));
            ssStrand(ctx, x - c * s.len / 2, y - sn * s.len / 2, x + c * s.len / 2, y + sn * s.len / 2, { color: P.rna, lw: 2.4, tickEvery: 8, tickLen: 3, alpha: a });
            text(ctx, 'AAA', x + c * s.len / 2 + 3, y + sn * s.len / 2, { size: 8.5, color: P.gold, weight: 700, alpha: a, mono: true });
          } else {
            const w = sp(t, 5.2 + hash(i, 9) * 0.6, 6.4 + hash(i, 9) * 0.6);
            const al = a * (1 - w);
            if (al > 0) strand(ctx, { ...s, ay: s.ay + 90 * w }, cx, CY, P, al);
          }
        });
        const la = win(t, 5.8, 14.5, 0.4);
        text(ctx, 'kept: poly(A)+ mRNA', LX, 300, { size: 11.5, color: P.good, align: 'center', alpha: la });
        text(ctx, 'lost: rRNA, but also ncRNA, histone mRNA, bacterial RNA', LX, 316, { size: 10.5, color: P.alert, align: 'center', alpha: la });
      }
    }

    // ---- route B (right): depletion ----
    {
      const a = split;
      if (a > 0) {
        text(ctx, 'B · rRNA depletion', RX, 60, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        const cx = lerp(MX, RX, split);
        pop.forEach((s, i) => {
          if (s.kind === 0) {
            const probe = sp(t, 7.3 + hash(i, 13) * 0.6, 7.9 + hash(i, 13) * 0.6);
            const gone = s.keepB ? 0 : sp(t, 8.6 + hash(i, 15) * 0.7, 9.6 + hash(i, 15) * 0.7);
            const al = a * (1 - gone);
            const pos = strand(ctx, s, cx, CY, P, al);
            if (pos && probe > 0 && al > 0) {
              const c = Math.cos(s.ang), sn = Math.sin(s.ang);
              const pl = s.len * 0.5 * probe;
              ssStrand(ctx, pos[0] - c * pl / 2, pos[1] - sn * pl / 2 + 4, pos[0] + c * pl / 2, pos[1] + sn * pl / 2 + 4, { color: P.dna, lw: 2, ticks: false, alpha: al });
            }
            if (s.keepB) {
              const ra = a * win(t, 9.6, 14.5, 0.4);
              if (ra > 0 && pos) { ctx.save(); ctx.globalAlpha = ra; ctx.strokeStyle = P.alert; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(pos[0], pos[1], s.len / 2 + 6, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
            }
          } else {
            strand(ctx, s, cx, CY, P, a);
          }
        });
        const ea = win(t, 8.2, 9.8, 0.4);
        if (ea > 0) {
          const m = sp(t, 8.2, 8.8);
          blob(ctx, lerp(RX + 170, RX + 40, m), lerp(60, CY - 70, m), 11, P.enzyme, { seed: 7, alpha: ea });
          blob(ctx, lerp(RX + 180, RX - 60, m), lerp(90, CY + 40, m), 9, P.enzyme, { seed: 2, alpha: ea });
          text(ctx, 'RNase H', lerp(RX + 170, RX + 40, m) + 16, lerp(60, CY - 70, m) - 10, { size: 10.5, color: P.inkDim, alpha: ea });
        }
        text(ctx, 'DNA probes anneal to rRNA', RX, CY - 98, { size: 11, color: P.dna, align: 'center', alpha: win(t, 7.4, 8.6, 0.3) });
        const la = win(t, 9.8, 14.5, 0.4);
        text(ctx, 'kept: mRNA, ncRNA, pre-mRNA, bacterial RNA', RX, 300, { size: 11.5, color: P.good, align: 'center', alpha: la });
        text(ctx, 'residual rRNA 1–10 %, worse for organisms the probes were not designed for', RX, 316, { size: 10.5, color: P.alert, align: 'center', alpha: la, maxWidth: 400 });
      }
    }

    // ---- phase 3: read composition ----
    {
      const a = win(t, 11.0, 14.5, 0.6);
      if (a > 0) {
        const rev = sp(t, 11.3, 12.4);
        const y = 408;
        text(ctx, 'reads by type', W / 2, y - 24, { size: 13, color: P.ink, weight: 600, align: 'center', alpha: a });
        const A = [[0.84, P.rna], [0.07, P.rnaLight], [0.01, P.rrna], [0.08, P.inkFaint]];
        const B = [[0.52, P.rna], [0.3, P.rnaLight], [0.06, P.rrna], [0.12, P.inkFaint]];
        bar(ctx, LX - 150, y, 300, A, P, a, rev);
        bar(ctx, RX - 150, y, 300, B, P, a, rev);
        const la = a * win(t, 12.2, 14.5, 0.4);
        text(ctx, 'exonic ~85 %', LX - 150, y + 34, { size: 10.5, color: P.rna, alpha: la });
        text(ctx, 'intronic < 10 %', LX - 150 + 300 * 0.84, y + 34, { size: 10.5, color: P.rnaLight, alpha: la, align: 'center' });
        text(ctx, 'exonic ~50–60 %', RX - 150, y + 34, { size: 10.5, color: P.rna, alpha: la });
        text(ctx, 'intronic 20–40 %', RX - 150 + 300 * 0.67, y + 34, { size: 10.5, color: P.rnaLight, alpha: la, align: 'center' });
        text(ctx, 'rRNA · other', RX - 150 + 300 * 0.9, y + 48, { size: 10.5, color: P.rrna, alpha: la, align: 'center' });
        text(ctx, 'non-polyadenylated transcripts are absent, not lowly expressed', LX, y + 60, { size: 10.5, color: P.inkDim, alpha: la, align: 'center' });
        text(ctx, 'check: rRNA fraction (SortMeRNA), exon/intron split (RSeQC, Qualimap)', W / 2, 500, { size: 11.5, color: P.inkDim, align: 'center', alpha: la });
      }
    }
  },
};
