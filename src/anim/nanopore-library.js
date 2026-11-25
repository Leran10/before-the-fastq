// Nanopore ligation library: end prep, optional native barcode, sequencing
// adapter with motor protein. No PCR. End: chimeras and barcode misassignment.
import { prog, sp, win, pulse, lerp, hash, text, dsPath, dsFragment, blob, dot, line, roundRect, withAlpha } from '../draw.js';

const MX0 = 230, MX1 = 730, MY = 190;
function wave(x0, x1, y, amp, ph, n = 80) { const pts = []; for (let k = 0; k <= n; k++) { const u = k / n; const x = lerp(x0, x1, u); pts.push([x, y + Math.sin(x * 0.03 + ph) * amp]); } return pts; }

function adapter(ctx, x, y, dir, P, alpha = 1) {
  // short duplex stem + motor protein on the strand that enters first + tether
  if (alpha <= 0) return;
  const L = 30;
  const x1 = x + dir * L;
  dsFragment(ctx, Math.min(x, x1), Math.max(x, x1), y, { colorA: P.enzyme, colorB: P.enzyme, alpha, rungEvery: 6, lw: 2.4 });
  blob(ctx, x1 - dir * 6, y - 13, 11, P.enzyme, { seed: 11, alpha, stroke: P.inkDim });
  line(ctx, x1 - dir * 10, y + 4, x1 + dir * 10, y + 26, P.enzymeDim, 1.5, alpha, [3, 3]);
  dot(ctx, x1 + dir * 10, y + 26, 3.5, P.enzymeDim, alpha);
}

export default {
  id: 'nanopore-library',
  duration: 12,
  thumbT: 7.4,
  phases: [
    { t: 0, label: 'End prep', caption: 'Nicks are repaired, ends are blunted and dA-tailed; the molecule stays as long as the extraction left it.' },
    { t: 2.5, label: 'Native barcode', caption: 'For multiplexing, a short barcoded duplex is ligated to both ends before the adapter.' },
    { t: 5.5, label: 'Sequencing adapter', caption: 'The adapter carries a motor protein and a membrane tether; ligation takes minutes and there is no PCR.' },
    { t: 8.5, label: 'What can go wrong', caption: 'Two molecules ligated end to end give a chimeric read with an internal adapter; a small fraction of reads carry the wrong barcode.' },
  ],
  draw(ctx, t, W, H, P) {
    const up = sp(t, 8.5, 9.2);
    ctx.save(); ctx.translate(0, -70 * up);
    // molecule
    dsPath(ctx, wave(MX0, MX1, MY, 5, 1), { colorA: P.dna, colorB: P.dnaLight, lw: 2.4 });
    text(ctx, 'HMW DNA, 20–100+ kb', (MX0 + MX1) / 2, MY - 40, { size: 13, color: P.ink, align: 'center', weight: 600, alpha: win(t, 0.2, 2.6, 0.3) });
    // nick repair flashes
    [0.3, 0.72].forEach((u, k) => { const fl = pulse(t, 0.8 + k * 0.5, 1.8 + k * 0.5); const x = lerp(MX0, MX1, u); if (fl > 0) dot(ctx, x, MY + Math.sin(x * 0.03 + 1) * 5, 5 + 8 * fl, P.gold, fl * 0.8); });
    text(ctx, 'FFPE repair + end prep: nicks filled, ends blunted', (MX0 + MX1) / 2, MY + 44, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 0.5, 2.6, 0.3) });
    const aA = win(t, 1.8, 4.1, 0.3);
    text(ctx, 'A', MX1 + 8, MY - 6, { size: 11, color: P.dna, weight: 700, alpha: aA });
    text(ctx, 'A', MX0 - 8, MY + 6, { size: 11, color: P.dnaLight, weight: 700, alpha: aA });
    // barcodes
    const bc = sp(t, 2.8, 4.3);
    const bl = 36, bcol = P.samples[1];
    const lbx = lerp(60, MX0 - bl, bc), rbx = lerp(900 - bl, MX1, bc);
    const ba = win(t, 2.6, 14, 0.3);
    dsFragment(ctx, lbx, lbx + bl, MY + Math.sin(MX0 * 0.03 + 1) * 5, { colorA: bcol, colorB: bcol, alpha: ba, rungEvery: 6, lw: 2.6 });
    dsFragment(ctx, rbx, rbx + bl, MY + Math.sin(MX1 * 0.03 + 1) * 5, { colorA: bcol, colorB: bcol, alpha: ba, rungEvery: 6, lw: 2.6 });
    text(ctx, 'barcode NB01 (24–96 available), ligated to both ends', (MX0 + MX1) / 2, MY + 44, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 3.0, 5.6, 0.3) });
    if (bc >= 1) { const fl = pulse(t, 4.2, 4.9); if (fl > 0) { dot(ctx, MX0, MY + Math.sin(MX0 * 0.03 + 1) * 5, 5 + 8 * fl, P.gold, fl * 0.8); dot(ctx, MX1, MY + Math.sin(MX1 * 0.03 + 1) * 5, 5 + 8 * fl, P.gold, fl * 0.8); } }
    // adapters
    const ad = sp(t, 5.8, 7.3);
    const adA = win(t, 5.6, 14, 0.3);
    const yl = MY + Math.sin(MX0 * 0.03 + 1) * 5, yr = MY + Math.sin(MX1 * 0.03 + 1) * 5;
    adapter(ctx, lerp(40, MX0 - bl, ad), yl, -1, P, adA);
    adapter(ctx, lerp(920, MX1 + bl, ad), yr, +1, P, adA);
    if (ad >= 1) { const fl = pulse(t, 7.2, 7.9); if (fl > 0) { dot(ctx, MX0 - bl, yl, 5 + 8 * fl, P.gold, fl * 0.8); dot(ctx, MX1 + bl, yr, 5 + 8 * fl, P.gold, fl * 0.8); } }
    const la = win(t, 6.0, 8.6, 0.3);
    text(ctx, 'motor protein (helicase)', MX0 - bl - 36, MY - 36, { size: 11, color: P.inkDim, align: 'center', alpha: la * ad });
    text(ctx, 'tether: pulls the complex to the membrane', MX1 + bl + 40, MY + 44, { size: 11, color: P.inkDim, align: 'center', alpha: la * ad, maxWidth: 200 });
    text(ctx, 'no PCR: no PCR duplicates, base modifications (5mC, 6mA) preserved, read length = molecule length', (MX0 + MX1) / 2, MY + 76, { size: 12, color: P.good, align: 'center', weight: 600, alpha: win(t, 7.4, 14, 0.4) * (1 - up * 0.5), maxWidth: 700 });
    ctx.restore();

    // ---- failure modes ----
    const fa = win(t, 8.7, 14, 0.5);
    if (fa > 0) {
      const y = 300;
      text(ctx, 'chimera: two molecules ligated end to end', 160, y - 34, { size: 12.5, color: P.ink, weight: 600, alpha: fa });
      const g = sp(t, 9.0, 10.0);
      dsFragment(ctx, 160, 420, y, { colorA: P.dna, colorB: P.dnaLight, alpha: fa });
      dsFragment(ctx, 420, 444, y, { colorA: P.samples[1], colorB: P.samples[1], alpha: fa, rungEvery: 6 });
      dsFragment(ctx, 444, 474, y, { colorA: P.enzyme, colorB: P.enzyme, alpha: fa, rungEvery: 6 });
      dsFragment(ctx, 474, 498, y, { colorA: P.samples[1], colorB: P.samples[1], alpha: fa, rungEvery: 6 });
      dsFragment(ctx, lerp(760, 498, g), lerp(1020, 758, g), y, { colorA: P.dna, colorB: P.dnaLight, alpha: fa });
      if (g >= 1) {
        ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = P.alert; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; roundRect(ctx, 412, y - 16, 94, 32, 8); ctx.stroke(); ctx.restore();
        text(ctx, 'internal adapter: ~1–3 % of reads; split them (Porechop --middle, duplex_tools)', 160, y + 30, { size: 11.5, color: P.alert, alpha: fa * sp(t, 10, 10.5) });
      }
      // barcode misassignment
      const y2 = 400;
      const ma = fa * sp(t, 10.4, 11.0);
      text(ctx, 'barcode misassignment', 160, y2 - 30, { size: 12.5, color: P.ink, weight: 600, alpha: ma });
      for (let k = 0; k < 24; k++) {
        const grp = k < 12 ? 0 : 1;
        const x = 160 + k * 24 + grp * 30;
        const wrong = k === 19;
        ctx.save(); ctx.globalAlpha = ma;
        ctx.fillStyle = wrong ? P.samples[1] : P.samples[grp + 1];
        roundRect(ctx, x, y2 - 7, 16, 14, 3); ctx.fill();
        if (wrong) { ctx.strokeStyle = P.alert; ctx.lineWidth = 2; roundRect(ctx, x - 3, y2 - 10, 22, 20, 5); ctx.stroke(); }
        ctx.restore();
      }
      text(ctx, 'sample 1', 160 + 6 * 24, y2 + 22, { size: 11, color: P.inkDim, align: 'center', alpha: ma });
      text(ctx, 'sample 2', 160 + 18 * 24 + 30, y2 + 22, { size: 11, color: P.inkDim, align: 'center', alpha: ma });
      text(ctx, '0.1–1 % of reads carry the wrong barcode; require barcodes on both ends when depth allows', 160, y2 + 48, { size: 11.5, color: P.alert, alpha: ma, maxWidth: 700 });
    }
  },
};
