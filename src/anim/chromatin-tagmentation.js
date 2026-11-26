// Tn5 on native chromatin: a fibre with nucleosomes and one open region,
// transposomes land where they can reach, fragments of nucleosome-free,
// mono- and di-nucleosomal length appear, the 9 bp stagger explains the
// +4/−5 shift, and the fragment-size histogram shows the ladder.
import { prog, sp, win, pulse, lerp, hash, text, dsFragment, blob, dot, line, arrow, roundRect, histogram, withAlpha, footnote } from '../draw.js';

const FY0 = 250, FY1 = 165;          // fibre y: centred at first, moves up when the fragments drop
const X0 = 70, X1 = 890;
// nucleosome centres: dense on the left (compact), one open region, spaced on the right
const NUCS = [105, 160, 215, 270, 610, 690, 760, 840];
const OPEN = [305, 560];             // nucleosome-free region
// Tn5 landing sites (x): three in the open region, two in linkers on the right
const SITES = [
  { x: 350, t0: 2.8 }, { x: 440, t0: 3.2 }, { x: 525, t0: 3.6 }, { x: 650, t0: 4.2 }, { x: 800, t0: 4.5 },
];
// sequenceable fragments between consecutive sites (both adapters)
const FRAGS = [
  { a: 350, b: 440, label: '< 100 bp', kind: 'nfr' },
  { a: 440, b: 525, label: '< 100 bp', kind: 'nfr' },
  { a: 525, b: 650, label: '~200 bp', kind: 'mono' },
  { a: 650, b: 800, label: '~400 bp', kind: 'di' },
];
const ROW = 262;                     // fragment row y

function nucleosome(ctx, x, y, P, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = P.enzyme; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = P.dna; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, 19, -2.6, 2.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y - 3, 17, 0.4, 2.9); ctx.stroke();
  ctx.restore();
}

function tn5(ctx, x, y, P, alpha = 1, s = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  blob(ctx, -9, 0, 11, P.enzyme, { seed: 4, stroke: P.inkDim });
  blob(ctx, 9, 0, 11, P.enzyme, { seed: 7, stroke: P.inkDim });
  ctx.fillStyle = P.p5; ctx.fillRect(-20, 6, 12, 5);
  ctx.fillStyle = P.p7; ctx.fillRect(8, 6, 12, 5);
  ctx.restore();
}

// fibre segment [a,b] at y with the nucleosomes inside it
function fibre(ctx, a, b, y, P, alpha = 1, o = {}) {
  if (alpha <= 0 || b <= a) return;
  const { dim = false } = o;
  dsFragment(ctx, a, b, y, { colorA: dim ? P.dnaDim : P.dna, colorB: dim ? P.dnaDim : P.dna, alpha, rungEvery: 8, gap: 6 });
  NUCS.forEach(n => { if (n > a + 8 && n < b - 8) nucleosome(ctx, n, y, P, alpha * (dim ? 0.6 : 1)); });
}

// fragment-size density with nucleosome periodicity, length in bp
function density(L) {
  const g = (m, s) => Math.exp(-((L - m) ** 2) / (2 * s * s));
  return 1.9 * Math.exp(-L / 80) + 0.75 * g(200, 32) + 0.42 * g(400, 42) + 0.22 * g(600, 50) + 0.1 * g(800, 55);
}
const BINS = Array.from({ length: 48 }, (_, i) => density((i + 0.5) * 1000 / 48));
const BMAX = Math.max(...BINS);
const HIST = BINS.map(v => v / BMAX);

export default {
  id: 'chromatin-tagmentation',
  duration: 15,
  thumbT: 7.2,
  phases: [
    { t: 0, label: 'Chromatin, not naked DNA', caption: 'Inside the nucleus the DNA is wrapped around nucleosomes. Promoters and enhancers that are in use sit in nucleosome-free stretches; compact chromatin is packed tight.' },
    { t: 2.5, label: 'Tn5 lands where it can reach', caption: 'Adapter-loaded Tn5 dimers (TDE1 or home-made) are bulky: they insert repeatedly in open regions, occasionally in linker DNA, almost never in compacted chromatin. 30 min at 37 °C.' },
    { t: 5.2, label: 'Cut and tag', caption: 'Each insertion attaches an adapter. A fragment is sequenceable when two insertions with different adapters are close: short nucleosome-free pieces, and pieces spanning one or two nucleosomes.' },
    { t: 8.3, label: '9 bp apart: the +4/−5 shift', caption: 'The dimer cuts the two strands 9 bp apart. After fill-in the 9 bp is duplicated, so the true insertion centre is 4–5 bp inside each read start; cut-site analyses shift reads by +4 and −5.' },
    { t: 11.3, label: 'Fragment length = chromatin', caption: 'The size distribution has a nucleosome-free peak under 100 bp and periodic peaks near 200 and 400 bp. Enzyme-to-nuclei ratio and time move this shape; dead cells flatten it.' },
  ],
  draw(ctx, t, W, H, P) {
    const land = SITES.map(s => sp(t, s.t0, s.t0 + 0.7));
    const cut = sp(t, 5.4, 6.3);
    const drop = sp(t, 6.4, 7.6);
    const fibreA = 1 - 0.5 * sp(t, 8.4, 9.0);       // top scene dims a bit when insets appear
    const FY = lerp(FY0, FY1, sp(t, 5.4, 6.6));

    // open-region highlight
    {
      const a = win(t, 0.4, 5.6, 0.4);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha *= a * (0.55 + 0.25 * pulse(t % 2, 0, 2));
        ctx.fillStyle = P.goldDim; roundRect(ctx, OPEN[0], FY - 34, OPEN[1] - OPEN[0], 68, 12); ctx.fill();
        ctx.restore();
      }
      text(ctx, 'nucleosome-free: promoter / enhancer', (OPEN[0] + OPEN[1]) / 2, FY - 48, { size: 12, color: P.gold, align: 'center', weight: 600, alpha: win(t, 0.5, 5.4, 0.3) });
      text(ctx, 'compact chromatin', 190, FY - 48, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 0.8, 5.4, 0.3) });
      text(ctx, 'linker DNA', 725, FY - 48, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 0.8, 5.4, 0.3) });
    }

    // ── the fibre: whole, then as segments separated at cut sites ──
    ctx.save(); ctx.globalAlpha *= fibreA;
    const cuts = SITES.map(s => s.x);
    const bounds = [X0, ...cuts, X1];
    for (let i = 0; i < bounds.length - 1; i++) {
      let a = bounds[i], b = bounds[i + 1];
      const gap = 5 * cut;
      if (i > 0) a += gap; if (i < bounds.length - 2) b -= gap;
      const frag = FRAGS.find(f => f.a === bounds[i] && f.b === bounds[i + 1]);
      if (frag) {
        // moves down to the fragment row once cut
        const y = lerp(FY, ROW, drop);
        fibre(ctx, a, b, y, P, 1);
        if (drop > 0) {
          ctx.save(); ctx.globalAlpha *= drop;
          ctx.fillStyle = P.p5; ctx.fillRect(a - 13, y - 4, 12, 8);
          ctx.fillStyle = P.p7; ctx.fillRect(b + 1, y - 4, 12, 8);
          ctx.restore();
          text(ctx, frag.label, (a + b) / 2, y + 30, { size: 12, color: P.ink, align: 'center', alpha: drop });
          text(ctx, frag.kind === 'nfr' ? 'nucleosome-free' : frag.kind === 'mono' ? 'mono-nucleosomal' : 'di-nucleosomal', (a + b) / 2, y + 46, { size: 10.5, color: P.inkDim, align: 'center', alpha: drop });
        }
      } else {
        // not sequenceable: one adapter or none; stays on top and fades
        fibre(ctx, a, b, FY, P, 1 - 0.6 * drop, { dim: drop > 0.5 });
        if (drop > 0 && i === 0) text(ctx, 'uncut: never sequenced', (a + b) / 2, FY + 36, { size: 11.5, color: P.inkDim, align: 'center', alpha: drop });
        if (drop > 0 && i === bounds.length - 2) text(ctx, 'one adapter only', (a + b) / 2, FY + 36, { size: 11.5, color: P.inkDim, align: 'center', alpha: drop });
      }
    }
    // Tn5 dimers landing, then leaving with the fragments
    SITES.forEach((s, i) => {
      const l = land[i]; if (l <= 0) return;
      const y = lerp(-30, FY - 16, l);
      const a = (1 - drop) * (cut > 0 ? 1 - 0.4 * cut : 1);
      tn5(ctx, s.x, y, P, a);
      if (cut > 0 && cut < 1) dot(ctx, s.x, FY, 4 + 8 * pulse(cut, 0, 1), P.gold, 0.8 * pulse(cut, 0, 1));
    });
    text(ctx, 'adapter-loaded Tn5 dimers', 480, 96, { size: 12.5, color: P.inkDim, align: 'center', alpha: win(t, 2.6, 5.2, 0.3) });
    text(ctx, 'insertion = cut + adapter on each 5′ end', 480, 96, { size: 12.5, color: P.inkDim, align: 'center', alpha: win(t, 5.3, 8.2, 0.3) });
    ctx.restore();

    // ── inset: the 9 bp stagger and the +4/−5 shift ──
    {
      const a = win(t, 8.4, 15, 0.4);
      if (a > 0) {
        const bx = 60, by = 318, bw = 420, bh = 190;
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.panel; ctx.strokeStyle = P.grid; roundRect(ctx, bx, by, bw, bh, 10); ctx.fill(); ctx.stroke(); ctx.restore();
        text(ctx, 'one insertion, zoomed in', bx + 14, by + 20, { size: 12.5, color: P.ink, weight: 600, alpha: a });
        const bp = 13, cx = bx + 150, y1 = by + 78, y2 = by + 104;   // top and bottom strand
        const c1 = cx, c2 = cx + 9 * bp;
        const show = sp(t, 8.8, 9.6), fill = sp(t, 9.8, 10.6);
        // strands as base ticks
        ctx.save(); ctx.globalAlpha *= a;
        for (let i = 0; i < 26; i++) {
          const x = bx + 40 + i * bp;
          const inDup = x >= c1 && x < c2;
          ctx.fillStyle = inDup && fill > 0 ? P.gold : P.dna;
          ctx.fillRect(x, y1 - 4, bp - 3, 8);
          ctx.fillStyle = inDup && fill > 0 ? P.gold : P.dna;
          ctx.fillRect(x, y2 - 4, bp - 3, 8);
        }
        ctx.restore();
        text(ctx, '5′', bx + 26, y1, { size: 10, color: P.inkDim, alpha: a }); text(ctx, '3′', bx + 26, y2, { size: 10, color: P.inkDim, alpha: a });
        // the two cuts
        line(ctx, c1, y1 - 12, c1, y1 + 12, P.alert, 2.5, a * show);
        line(ctx, c2, y2 - 12, c2, y2 + 12, P.alert, 2.5, a * show);
        text(ctx, 'cut, top strand', c1, y1 - 20, { size: 10.5, color: P.alert, align: 'center', alpha: a * show });
        text(ctx, 'cut, bottom strand', c2, y2 + 22, { size: 10.5, color: P.alert, align: 'center', alpha: a * show });
        // 9 bp bracket
        const yb = by + 136;
        line(ctx, c1, yb, c2, yb, P.gold, 2, a * fill); line(ctx, c1, yb - 5, c1, yb + 5, P.gold, 2, a * fill); line(ctx, c2, yb - 5, c2, yb + 5, P.gold, 2, a * fill);
        text(ctx, '9 bp duplicated after fill-in', (c1 + c2) / 2, yb + 14, { size: 11, color: P.gold, align: 'center', weight: 600, alpha: a * fill });
        // centre + shifts
        const cc = (c1 + c2) / 2, sh = sp(t, 10.6, 11.4);
        line(ctx, cc, y1 - 30, cc, y2 + 10, P.ink, 1.2, a * sh, [3, 3]);
        arrow(ctx, c1 + 2, y1 - 28, cc - 3, y1 - 28, P.p5, { lw: 2, head: 7, alpha: a * sh });
        arrow(ctx, c2 - 2, y2 + 8, cc + 3, y2 + 8, P.p7, { lw: 2, head: 7, alpha: a * sh });
        text(ctx, '+4', (c1 + cc) / 2, y1 - 40, { size: 11, color: P.p5, align: 'center', weight: 600, alpha: a * sh });
        text(ctx, '−5', (c2 + cc) / 2, y2 + 20 + 14, { size: 11, color: P.p7, align: 'center', weight: 600, alpha: a * sh });
        text(ctx, 'true centre', cc + 6, y1 - 42, { size: 10, color: P.inkDim, alpha: a * sh });
        text(ctx, 'shift forward reads +4, reverse −5', bx + 14, by + bh - 16, { size: 11.5, color: P.ink, alpha: a * sh });
      }
    }

    // ── inset: fragment-size histogram ──
    {
      const a = win(t, 11.3, 15, 0.4);
      if (a > 0) {
        const bx = 500, by = 318, bw = 400, bh = 190;
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.panel; ctx.strokeStyle = P.grid; roundRect(ctx, bx, by, bw, bh, 10); ctx.fill(); ctx.stroke(); ctx.restore();
        text(ctx, 'fragment size (Bioanalyzer / bamPEFragmentSize)', bx + 14, by + 20, { size: 12.5, color: P.ink, weight: 600, alpha: a });
        const grow = sp(t, 11.6, 12.8);
        const hx = bx + 20, hy = by + 40, hw = bw - 40, hh = 110;
        histogram(ctx, hx, hy, hw, hh, HIST.map((v, i) => v * prog(grow, i / 96, 0.5 + i / 96)), P, { color: P.dna, alpha: a, labelL: '0', labelR: '1,000 bp' });
        const lab = sp(t, 12.6, 13.4);
        const px = L => hx + (L / 1000) * hw;
        text(ctx, '< 100 bp', px(95), hy + 6, { size: 11, color: P.gold, weight: 600, alpha: a * lab });
        text(ctx, 'nucleosome-free', px(95), hy + 20, { size: 10, color: P.inkDim, alpha: a * lab });
        text(ctx, '~200', px(200), hy + hh - HIST[9] * hh - 10, { size: 11, color: P.ink, align: 'center', alpha: a * lab });
        text(ctx, '~400', px(400), hy + hh - HIST[19] * hh - 10, { size: 11, color: P.ink, align: 'center', alpha: a * lab });
        text(ctx, '~600', px(600), hy + hh - HIST[28] * hh - 10, { size: 11, color: P.inkDim, align: 'center', alpha: a * lab });
        text(ctx, 'more enzyme or time → everything shifts left; dead cells → no ladder', bx + 14, by + bh - 14, { size: 11, color: P.alert, alpha: a * lab });
      }
    }

    footnote(ctx, 'fragment length = chromatin structure', W, H, P, win(t, 12.2, 15, 0.4));
  },
};
