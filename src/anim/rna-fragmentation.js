// RNA fragmentation: heat and Mg2+ break mRNA into ~200 nt pieces; time sets
// the size; 3'-end protocols skip it; and what each does to gene-body coverage.
import { prog, sp, win, pulse, lerp, hash, text, callout, ssStrand, bead, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

const X0 = 110, X1 = 640;
const STR = [0, 1, 2].map(k => ({
  y: 110 + k * 46,
  // break positions (fraction along the strand) and the time each appears
  brks: Array.from({ length: 9 }, (_, j) => ({ u: 0.06 + (j + hash(j, k + 1) * 0.8) / 9.4, t: 3.5 + 3.0 * hash(j, k * 7 + 3) })).sort((a, b) => a.u - b.u),
}));

export default {
  id: 'rna-fragmentation',
  duration: 13,
  thumbT: 6.0,
  phases: [
    { t: 0, label: 'Full-length mRNA', caption: 'Enriched RNA is still thousands of nucleotides long, far longer than one insert.' },
    { t: 3, label: 'Heat + Mg²⁺', caption: 'Divalent cations and heat hydrolyse the backbone at random; the longer the incubation, the shorter the fragments.' },
    { t: 7, label: '3′-end protocols skip this', caption: 'QuantSeq, 10x and other 3′ kits do not fragment first: they capture one fragment per transcript, at the poly(A) end.' },
    { t: 10, label: 'Gene-body coverage', caption: 'Fragment-first libraries cover the whole transcript; 3′ protocols pile up within a few hundred nt of the tail and need matching quantification.' },
  ],
  draw(ctx, t, W, H, P) {
    // ---- strands and breaks (top) ----
    const topA = 1 - 0.5 * sp(t, 10.0, 10.8);
    text(ctx, 'mRNA', X0, 70, { size: 14, color: P.ink, weight: 600, alpha: topA });
    text(ctx, 'full length, thousands of nt', X0 + 52, 70, { size: 12, color: P.inkDim, alpha: topA * (1 - prog(t, 3.0, 3.6)) });
    text(ctx, 'fragments', X0 + 52, 70, { size: 12, color: P.inkDim, alpha: topA * prog(t, 4.5, 5.2) });
    STR.forEach((s, k) => {
      const active = s.brks.filter(b => t >= b.t);
      const bounds = [0, ...active.map(b => b.u), 1];
      for (let p = 0; p < bounds.length - 1; p++) {
        const u0 = bounds[p], u1 = bounds[p + 1];
        const bIdx = p === 0 ? -1 : s.brks.indexOf(active[p - 1]);
        const bt = p === 0 ? 0 : active[p - 1].t;
        const drift = p === 0 ? 0 : sp(t, bt, bt + 0.8);
        const dy = (hash(bIdx + 2, k + 5) - 0.5) * 16 * drift, dx = 3 * drift;
        const px0 = lerp(X0, X1, u0) + dx, px1 = lerp(X0, X1, u1) - (p === bounds.length - 2 ? 0 : 1);
        ssStrand(ctx, px0, s.y + dy, px1, s.y + dy, { color: P.rna, lw: 2.4, tickEvery: 8, tickLen: 4, alpha: topA });
        if (p === 0) dot(ctx, px0 - 3, s.y + dy, 3.5, P.rna, topA);                      // 5' cap
        if (p === bounds.length - 2) text(ctx, 'AAAAA', px1 + 4, s.y + dy, { size: 10, color: P.gold, weight: 700, mono: true, alpha: topA });
      }
      // break flashes
      s.brks.forEach(b => { const f = pulse(t, b.t - 0.1, b.t + 0.4); if (f > 0) dot(ctx, lerp(X0, X1, b.u), s.y, 3 + 5 * f, P.gold, f * 0.9 * topA); });
    });
    text(ctx, '5′ cap', X0 - 4, 92, { size: 10.5, color: P.inkDim, alpha: win(t, 0.4, 3.2, 0.3) });
    text(ctx, 'poly(A) 3′', X1 + 4, 92, { size: 10.5, color: P.inkDim, alpha: win(t, 0.4, 3.2, 0.3) });
    // heat + timer
    {
      const ha = win(t, 3.0, 7.0, 0.5);
      if (ha > 0) {
        ctx.save(); ctx.globalAlpha = ha * 0.7; ctx.strokeStyle = P.rnaLight; ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const x = X0 + 60 + i * 95; const ph = (t * 1.5 + i * 0.3) % 1;
          ctx.beginPath();
          for (let k = 0; k <= 16; k++) { const yy = 250 - k * 3 - ph * 30; const xx = x + Math.sin(k * 0.6 + t * 4) * 5; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
          ctx.stroke();
        }
        ctx.restore();
        const min = 8 * prog(t, 3.2, 6.8);
        const mean = Math.round(lerp(2000, 200, sp(t, 3.3, 6.8)) / 10) * 10;
        ctx.save(); ctx.globalAlpha = ha; ctx.fillStyle = P.panel; ctx.strokeStyle = P.grid; roundRect(ctx, 700, 80, 200, 92, 8); ctx.fill(); ctx.stroke(); ctx.restore();
        text(ctx, '94 °C · Mg²⁺', 716, 102, { size: 13, color: P.ink, weight: 600, alpha: ha });
        text(ctx, `${min.toFixed(1)} min`, 884, 102, { size: 13, color: P.rna, weight: 700, alpha: ha, align: 'right', mono: true });
        text(ctx, `mean fragment ≈ ${mean} nt`, 716, 128, { size: 11.5, color: P.inkDim, alpha: ha });
        text(ctx, 'longer incubation → shorter', 716, 150, { size: 11, color: P.inkDim, alpha: ha * win(t, 4.5, 7, 0.3) });
      }
    }

    // ---- bottom left: 3' protocol contrast ----
    {
      const a = win(t, 7.0, 13.5, 0.6);
      if (a > 0) {
        const y = 345, x0 = 90, x1 = 470;
        text(ctx, '3′-end protocol: no fragmentation', x0, 300, { size: 13, color: P.ink, weight: 600, alpha: a });
        ssStrand(ctx, x0, y, x1, y, { color: P.rnaDim, lw: 2.4, tickEvery: 8, tickLen: 4, alpha: a });
        const hi = sp(t, 7.8, 8.8);
        const hx0 = x1 - 90 * hi;
        ssStrand(ctx, hx0, y, x1, y, { color: P.rna, lw: 2.6, tickEvery: 8, tickLen: 4, alpha: a });
        text(ctx, 'AAAAA', x1 + 4, y, { size: 10, color: P.gold, weight: 700, mono: true, alpha: a });
        dot(ctx, x0 - 3, y, 3.5, P.rnaDim, a);
        // oligo(dT) primer
        const pa = a * win(t, 7.6, 13.5, 0.3);
        ssStrand(ctx, x1 + 6, y + 10, x1 + 40, y + 10, { color: P.dna, lw: 2.2, ticks: false, alpha: pa });
        text(ctx, 'oligo(dT) primer', x1 + 46, y + 10, { size: 10.5, color: P.dna, alpha: pa });
        ctx.save(); ctx.globalAlpha = a * hi * 0.22; ctx.fillStyle = P.gold; ctx.fillRect(hx0, y - 14, x1 - hx0, 28); ctx.restore();
        text(ctx, 'one fragment per transcript, ~300 nt from the tail', x0, y + 36, { size: 11.5, color: P.inkDim, alpha: a * win(t, 8.6, 13.5, 0.3) });
        text(ctx, 'the rest of the transcript is never read: no isoforms, counting not coverage', x0, y + 54, { size: 11, color: P.alert, alpha: a * win(t, 9.0, 13.5, 0.3) });
      }
    }

    // ---- bottom right: gene-body coverage ----
    {
      const a = win(t, 10.0, 13.5, 0.6);
      if (a > 0) {
        const x = 600, y = 300, w = 300, h = 150;
        text(ctx, 'gene-body coverage', x, 282, { size: 13, color: P.ink, weight: 600, alpha: a });
        line(ctx, x, y + h + 0.5, x + w, y + h + 0.5, P.inkFaint, 1, a);
        text(ctx, '5′', x, y + h + 14, { size: 11, color: P.inkDim, alpha: a });
        text(ctx, '3′', x + w, y + h + 14, { size: 11, color: P.inkDim, align: 'right', alpha: a });
        const rev = sp(t, 10.3, 11.6);
        const fU = u => 0.5 + 0.1 * Math.sin(u * 17) * Math.sin(u * 7 + 1) - 0.3 * Math.exp(-u * 15) - 0.3 * Math.exp(-(1 - u) * 15);
        const f3 = u => 0.02 + 0.95 * Math.exp(-((u - 0.93) ** 2) / 0.006);
        [[fU, P.rna, 'fragment first: whole transcript'], [f3, P.gold, '3′ kit: pile-up at the tail']].forEach(([f, c, lab], k) => {
          ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.beginPath();
          for (let i = 0; i <= 150; i++) { const u = i / 150; if (u > rev) break; const px = x + u * w, py = y + h - Math.max(0, Math.min(1, f(u))) * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
          ctx.stroke(); ctx.restore();
          text(ctx, lab, x + 6, y + 14 + k * 16, { size: 11, color: c, alpha: a * win(t, 11.4, 13.5, 0.3) });
        });
        text(ctx, 'align 3′ data to full transcripts + length-normalized TPM = wrong', x, 490, { size: 11, color: P.alert, alpha: a * win(t, 12.0, 13.5, 0.3), maxWidth: 320 });
      }
    }
  },
};
