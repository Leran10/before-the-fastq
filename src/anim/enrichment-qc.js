// From reads to peaks: IP and input coverage over one genome segment, duplicate
// removal, fragment-length estimation by cross-correlation, peak calling against
// input, and the two plots that tell a failed IP from lost biology
// (fingerprint, spike-in scaling).
import { prog, sp, win, lerp, hash, text, line, arrow, roundRect, panelTitle, footnote, curve, withAlpha } from '../draw.js';

// genome axis
const GX0 = 70, GX1 = 890, GW = GX1 - GX0;
const IPY = 190, INY = 300, TH = 96;              // track baselines and max height
// features (u along the axis)
const PEAK = 0.28, HYPER = 0.60, BLACK = 0.85;
const gauss = (u, c, w) => Math.exp(-((u - c) * (u - c)) / (2 * w * w));
const noise = u => 0.03 * Math.sin(u * 83) + 0.025 * Math.sin(u * 231 + 1.3) + 0.02 * Math.sin(u * 517 + 2);
const ipCov = (u, dedup) => 0.10 + noise(u) + (0.86 - 0.16 * dedup) * gauss(u, PEAK, 0.018) + 0.62 * gauss(u, HYPER, 0.045) + (0.95 - 0.25 * dedup) * (gauss(u, BLACK, 0.012) + 0.6 * gauss(u, BLACK + 0.025, 0.008));
const inCov = u => 0.11 + noise(u + 3) + 0.52 * gauss(u, HYPER, 0.045) + 0.92 * (gauss(u, BLACK, 0.012) + 0.6 * gauss(u, BLACK + 0.025, 0.008));
const ux = u => GX0 + u * GW;

function track(ctx, y, f, color, P, alpha, label) {
  if (alpha <= 0) return;
  curve(ctx, GX0, y - TH, GW, TH, f, color, { alpha, fill: true, n: 240, lw: 1.5 });
  line(ctx, GX0, y, GX1, y, P.inkFaint, 1, alpha);
  text(ctx, label, GX0 - 6, y - TH / 2, { size: 12, color: P.ink, align: 'right', weight: 600, alpha });
}

function hatch(ctx, x, y, w, h, color, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = 1.2;
  for (let k = -h; k < w + h; k += 7) { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k - h, y + h); ctx.stroke(); }
  ctx.restore();
}

export default {
  id: 'enrichment-qc',
  duration: 15,
  thumbT: 10.2,
  phases: [
    { t: 0, label: 'IP and input', caption: 'The IP track and its matched input over the same region. Three things stick up: a site enriched only in the IP, a region high in both, and a blacklisted repeat.' },
    { t: 3, label: 'Duplicates removed', caption: 'Reads with identical coordinates are marked and dropped. At a strongly enriched site some of them were real, which caps the peak height; UMIs or paired ends resolve it.' },
    { t: 5.5, label: 'Fragment length', caption: 'Cross-correlation between strands peaks at the fragment length. A second, smaller peak at the read length is the phantom peak; their ratio (RSC) says whether the IP enriched at all.' },
    { t: 8.5, label: 'Peaks against input', caption: 'MACS2 tests each window against the input. The IP-only site becomes a peak. The region that is high in both is background, and the blacklist region never enters.' },
    { t: 11.5, label: 'Failed IP or lost biology?', caption: 'The fingerprint plot separates an IP that enriched from one that did not; spike-in scaling reveals global changes that per-million normalisation would erase.' },
  ],
  draw(ctx, t, W, H, P) {
    const dedup = sp(t, 3.3, 4.6);
    const callU = sp(t, 8.8, 9.8);
    const cc = win(t, 5.5, 11.8, 0.4);
    const fp = win(t, 11.6, 15, 0.4);

    panelTitle(ctx, 'From reads to peaks', W, P);

    // ── tracks ──
    track(ctx, IPY, u => ipCov(u, dedup), P.dna, P, 1, 'IP');
    track(ctx, INY, inCov, P.enzyme, P, 1, 'input');
    text(ctx, 'chr · 200 kb', GX1, INY + 14, { size: 11, color: P.inkFaint, align: 'right' });

    // blacklist hatch over both tracks
    {
      const x = ux(BLACK - 0.03), w = GW * 0.075;
      hatch(ctx, x, IPY - TH, w, TH, P.inkDim, 0.55);
      hatch(ctx, x, INY - TH, w, TH, P.inkDim, 0.55);
      text(ctx, 'blacklist', x + w / 2, IPY - TH - 10, { size: 11, color: P.inkDim, align: 'center', alpha: 1 - callU });
      text(ctx, 'blacklist: removed', x + w / 2, IPY - TH - 10, { size: 11, color: P.inkDim, align: 'center', alpha: callU });
    }

    // feature labels (phase 0..)
    {
      const a = win(t, 0.3, 8.8, 0.3);
      text(ctx, 'IP only', ux(PEAK), IPY - TH - 10, { size: 11.5, color: P.ink, align: 'center', alpha: a });
      text(ctx, 'high in both', ux(HYPER), IPY - TH - 10, { size: 11.5, color: P.alert, align: 'center', alpha: a });
    }

    // ── duplicates: stacked reads under the peak ──
    {
      const a = win(t, 3.0, 5.6, 0.3);
      if (a > 0) {
        const x = ux(PEAK) - 48, y0 = IPY + 8;
        const reads = [[0, 0], [6, 1], [6, 2], [6, 3], [18, 4], [30, 5], [30, 6], [44, 7]];   // x offset, row; same offset = duplicate
        const seen = {};
        reads.forEach(([dx, r]) => {
          const dup = seen[dx] !== undefined; seen[dx] = true;
          const al = dup ? 1 - dedup : 1;
          ctx.save(); ctx.globalAlpha *= a * al; ctx.fillStyle = dup ? P.alert : P.dna;
          ctx.fillRect(x + dx, y0 + r * 7, 52, 5); ctx.restore();
        });
        text(ctx, 'identical coordinates → marked', x + 120, y0 + 20, { size: 11.5, color: P.alert, alpha: a * (1 - prog(dedup, 0.35, 0.55)) });
        text(ctx, 'unique fragments kept', x + 120, y0 + 20, { size: 11.5, color: P.good, alpha: a * prog(dedup, 0.45, 0.65) });
      }
    }

    // ── peak calling ──
    if (callU > 0) {
      // called peak
      const x0 = ux(PEAK - 0.035), w = GW * 0.07;
      ctx.save(); ctx.globalAlpha *= callU; ctx.fillStyle = P.good; roundRect(ctx, x0, IPY + 6, w, 9, 3); ctx.fill(); ctx.restore();
      text(ctx, 'peak', x0 + w / 2, IPY + 26, { size: 12, color: P.good, align: 'center', weight: 600, alpha: callU });
      // rejected hyper-ChIPable
      const hx = ux(HYPER);
      line(ctx, hx - 9, IPY - 20, hx + 9, IPY - 2, P.alert, 3, callU);
      line(ctx, hx + 9, IPY - 20, hx - 9, IPY - 2, P.alert, 3, callU);
      text(ctx, 'not above input', hx, IPY + 26, { size: 12, color: P.alert, align: 'center', alpha: callU });
      // blacklist
      // FRiP
      const fa = callU * win(t, 8.8, 15, 0.1);
      text(ctx, 'FRiP = reads in peaks / all reads ≈ 9 %', ux(PEAK + 0.1), IPY - TH - 10, { size: 12, color: P.ink, alpha: fa * sp(t, 9.6, 10.2) });
    }

    // ── bottom-left panel: cross-correlation, then spike-in ──
    {
      const bx = 70, by = 346, bw = 330, bh = 110;
      if (cc > 0 && fp < 1) {
        const a = cc * (1 - fp);
        text(ctx, 'strand cross-correlation', bx, by - 12, { size: 12, color: P.inkDim, alpha: a });
        const f = u => 0.12 + 0.4 * gauss(u, 0.18, 0.02) + 0.78 * gauss(u, 0.52, 0.09);
        const grow = sp(t, 5.8, 7.0);
        curve(ctx, bx, by, bw, bh, u => f(u) * grow, P.dna, { alpha: a, n: 160 });
        line(ctx, bx, by + bh, bx + bw, by + bh, P.inkFaint, 1, a);
        text(ctx, 'strand shift →', bx + bw, by + bh + 13, { size: 11, color: P.inkFaint, align: 'right', alpha: a });
        const a2 = a * sp(t, 6.8, 7.6);
        line(ctx, bx + 0.18 * bw, by + bh, bx + 0.18 * bw, by + bh - 0.52 * bh, P.alert, 1.5, a2, [3, 3]);
        text(ctx, 'read length (phantom)', bx + 0.18 * bw + 12, by + bh - 0.7 * bh, { size: 11, color: P.alert, align: 'center', alpha: a2 });
        line(ctx, bx + 0.52 * bw, by + bh, bx + 0.52 * bw, by + bh - 0.9 * bh, P.gold, 1.5, a2, [3, 3]);
        text(ctx, 'fragment length', bx + 0.62 * bw, by + 6, { size: 11, color: P.gold, weight: 600, alpha: a2 });
        text(ctx, 'RSC = fragment / phantom ≈ 1.9 (≥ 0.8 passes)', bx, by + bh + 13, { size: 11, color: P.ink, alpha: a * sp(t, 7.4, 8.0) });
      }
      if (fp > 0) {
        const a = fp;
        text(ctx, 'spike-in scaling', bx, by - 12, { size: 12, color: P.inkDim, alpha: a });
        const base = by + bh;
        const groups = [{ x: bx + 30, lab: 'per million', b: 1.0 }, { x: bx + 190, lab: 'spike-in scaled', b: 0.5 }];
        const u = sp(t, 12.2, 13.4);
        groups.forEach((g, gi) => {
          const hB = gi === 0 ? 1.0 : lerp(1.0, g.b, u);
          ctx.save(); ctx.globalAlpha *= a;
          ctx.fillStyle = P.samples[0]; ctx.fillRect(g.x, base - 80, 40, 80);
          ctx.fillStyle = P.samples[1]; ctx.fillRect(g.x + 52, base - 80 * hB, 40, 80 * hB);
          ctx.restore();
          text(ctx, 'A', g.x + 20, base + 12, { size: 11, color: P.inkDim, align: 'center', alpha: a });
          text(ctx, 'B', g.x + 72, base + 12, { size: 11, color: P.inkDim, align: 'center', alpha: a });
          text(ctx, g.lab, g.x + 46, by - 2 + 10, { size: 11, color: P.ink, align: 'center', alpha: a });
        });
        line(ctx, bx, base, bx + bw, base, P.inkFaint, 1, a);
        text(ctx, 'B lost half its mark; only the spike-in shows it', bx, base + 28, { size: 11, color: P.alert, alpha: a * u });
      }
    }

    // ── bottom-right panel: fingerprint ──
    if (fp > 0) {
      const bx = 540, by = 346, bw = 150, bh = 110, a = fp;
      text(ctx, 'fingerprint', bx, by - 12, { size: 12, color: P.inkDim, alpha: a });
      ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh); ctx.restore();
      const g = sp(t, 11.8, 13.0);
      curve(ctx, bx, by, bw, bh, u => Math.pow(u, 1.15) * g, P.inkDim, { alpha: a, lw: 2 });
      curve(ctx, bx, by, bw, bh, u => Math.pow(u, 1.4) * g, P.alert, { alpha: a, lw: 2 });
      curve(ctx, bx, by, bw, bh, u => Math.pow(u, 5) * g, P.good, { alpha: a, lw: 2.5 });
      text(ctx, 'rank of bins →', bx + bw, by + bh + 13, { size: 11, color: P.inkFaint, align: 'right', alpha: a });
      const lx = bx + bw + 18;
      line(ctx, lx, by + 20, lx + 18, by + 20, P.good, 3, a); text(ctx, 'good IP: reads concentrate', lx + 24, by + 20, { size: 11, color: P.ink, alpha: a });
      line(ctx, lx, by + 42, lx + 18, by + 42, P.alert, 3, a); text(ctx, 'failed IP: follows input', lx + 24, by + 42, { size: 11, color: P.alert, alpha: a });
      line(ctx, lx, by + 64, lx + 18, by + 64, P.inkDim, 3, a); text(ctx, 'input: near the diagonal', lx + 24, by + 64, { size: 11, color: P.inkDim, alpha: a });
      text(ctx, '“no binding” + flat fingerprint = failed IP', lx, by + 92, { size: 11, color: P.ink, weight: 600, alpha: a * sp(t, 13.0, 13.6) });
    }

    footnote(ctx, 'a peak is a difference from input, not a pile of reads', W, H, P, win(t, 9.2, 15, 0.4));
  },
};
