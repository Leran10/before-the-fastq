// Hybrid capture, part 1: an indexed library is denatured and left for hours
// with biotinylated baits. Blockers keep adapters and repeats from pairing.
// Multiplex capture puts several libraries in one tube. The probe design
// decides what can be seen at all.
import { prog, sp, win, pulse, lerp, hash, text, ssStrand, libraryMolecule, blob, dot, line, roundRect, panelTitle, footnote } from '../draw.js';

// library molecules: x centre, y, insert length, target?
const LIB = [
  { x: 320, y: 115, len: 230, target: true, rep: false },
  { x: 360, y: 190, len: 190, target: false, rep: true },
  { x: 300, y: 265, len: 260, target: false, rep: false },
  { x: 350, y: 340, len: 210, target: true, rep: false },
  { x: 310, y: 415, len: 200, target: false, rep: false },
];
const AD = 34; // adapter length (matches libraryMolecule default)
// extra libraries that join in the multiplex phase (right half of the tube)
const MULTI = [
  { x: 720, y: 115, len: 170, s: 1, target: true },
  { x: 750, y: 190, len: 150, s: 2, target: false },
  { x: 710, y: 265, len: 190, s: 3, target: true },
  { x: 740, y: 340, len: 160, s: 1, target: false },
  { x: 720, y: 415, len: 180, s: 2, target: true },
];

// one denatured molecule: two single strands, split apart by `sep`
function ssLibrary(ctx, m, sep, P, col, o = {}) {
  const { alpha = 1, insertColor = P.dna, dim = false } = o;
  if (alpha <= 0) return;
  const half = m.len / 2;
  const xa = m.x - half - AD, xb = m.x + half + AD;
  for (const side of [-1, 1]) {
    const y = m.y + side * sep;
    const ic = dim ? P.dnaDim : insertColor;
    ssStrand(ctx, xa, y, m.x - half, y, { color: dim ? P.p5Dim : P.p5, side, lw: 3.2, alpha, tickEvery: 9, tickLen: 5 });
    ssStrand(ctx, m.x - half, y, m.x + half, y, { color: ic, side, lw: 3.2, alpha, tickEvery: 9, tickLen: 5 });
    ssStrand(ctx, m.x + half, y, xb, y, { color: dim ? P.p7Dim : P.p7, side, lw: 3.2, alpha, tickEvery: 9, tickLen: 5 });
    if (col) {
      ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = col;
      roundRect(ctx, xb - 16, y - 4, 12, 8, 2); ctx.fill(); roundRect(ctx, xa + 4, y - 4, 12, 8, 2); ctx.fill();
      ctx.restore();
    }
  }
}
function bait(ctx, x0, x1, y, P, alpha = 1) {
  if (alpha <= 0) return;
  ssStrand(ctx, x0, y, x1, y, { color: P.gold, side: -1, lw: 3.4, alpha, tickEvery: 9, tickLen: 5 });
  dot(ctx, x1 + 6, y, 4.5, P.gold, alpha);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = P.gold; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x1 + 6, y, 7.5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function blocker(ctx, x0, x1, y, P, alpha = 1) {
  if (alpha <= 0) return;
  ssStrand(ctx, x0, y, x1, y, { color: P.enzymeDim, side: -1, lw: 3.2, alpha, tickEvery: 9, tickLen: 5 });
}

export default {
  id: 'probe-hybridization',
  duration: 15,
  thumbT: 7.6,
  phases: [
    { t: 0, label: 'A finished library', caption: 'Capture starts from a complete, indexed shotgun library, amplified 6–10 cycles so there is enough mass. Only a small fraction of its molecules come from the targets.' },
    { t: 2.5, label: 'Denature at 95 °C', caption: 'The double strands are melted apart. From now on every molecule is single-stranded and free to pair with whatever matches.' },
    { t: 5, label: 'Baits and blockers, 65 °C', caption: 'Biotinylated 80–120-mer baits anneal to target inserts over 4–24 h. Adapter blockers cap the adapter ends and Cot-1 DNA covers repeats, so molecules do not pair with each other.' },
    { t: 8.5, label: 'Multiplex capture', caption: 'Typically 8–16 pre-indexed libraries share one hybridisation and compete for the same baits. Cross-talk here is capture-pool specific, unlike index hopping.' },
    { t: 11, label: 'The design decides', caption: 'Coverage exists only where a bait was designed. GC-rich exons get thin tiling, every target comes with 50–150 bp of padding, and a divergent viral genome without a matching bait is simply not seen.' },
  ],
  draw(ctx, t, W, H, P) {
    // ─────────── scene A: the tube ───────────
    const sceneA = 1 - sp(t, 10.8, 11.4);
    if (sceneA > 0) {
      ctx.save(); ctx.globalAlpha *= sceneA;
      panelTitle(ctx, 'Hybridisation', W, P);
      const melt = sp(t, 2.7, 3.9);          // strands separate
      const sep = lerp(3.5, 14, melt);
      const baitIn = sp(t, 5.2, 6.4);
      const blockIn = sp(t, 6.0, 7.0);
      const multi = sp(t, 8.7, 9.6);
      const drift = (i) => Math.sin(t * 0.8 + i * 1.7) * 3 * melt;

      // phase-specific header line
      text(ctx, 'indexed library: P5 · insert · P7; two target molecules among many', 330, 68, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 0.3, 2.6, 0.3) });
      text(ctx, '95 °C, 5 min: double strands melt apart', 330, 68, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 2.6, 5.0, 0.3) });
      text(ctx, 'baits find the targets; blockers cap adapters and repeats', 330, 68, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 5.1, 8.5, 0.3) });
      text(ctx, 'several libraries, one tube, one set of baits', 480, 68, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 8.6, 10.9, 0.3) });

      // first library (sample colour 0)
      LIB.forEach((m, i) => {
        const mm = { ...m, y: m.y + drift(i) };
        if (melt < 0.05) {
          libraryMolecule(ctx, mm.x, mm.y, mm.len, P, { lw: 3.2, i5: P.samples[0], i7: P.samples[0], highlight: m.target && win(t, 0.6, 2.6, 0.3) > 0.5 ? P.gold : null });
        } else {
          const dim = !m.target && baitIn > 0.5;
          ssLibrary(ctx, mm, sep, P, P.samples[0], { dim });
        }
        // repeat element on one off-target insert
        if (m.rep) {
          const rx0 = mm.x - 20, rx1 = mm.x + 50;
          line(ctx, rx0, mm.y - sep, rx1, mm.y - sep, P.alert, 4, melt > 0.05 ? 0.9 : 0.0);
          text(ctx, 'repeat (Alu): would pull in every Alu', (rx0 + rx1) / 2, mm.y - sep - 16, { size: 11, color: P.alert, align: 'center', alpha: win(t, 3.6, 6.0, 0.3) });
          // Cot-1 blocker covers it
          const ca = blockIn;
          blob(ctx, (rx0 + rx1) / 2, mm.y - sep - 10, 11, P.enzymeDim, { seed: 4, alpha: ca, stroke: P.inkDim });
          text(ctx, 'Cot-1 blocker', (rx0 + rx1) / 2, mm.y - sep - 30, { size: 10.5, color: P.inkDim, align: 'center', alpha: ca });
        }
      });
      // target labels (phase 0)
      text(ctx, 'target', LIB[0].x + LIB[0].len / 2 + AD + 12, LIB[0].y, { size: 11, color: P.gold, weight: 600, alpha: win(t, 0.6, 2.6, 0.3) });
      text(ctx, 'target', LIB[3].x + LIB[3].len / 2 + AD + 12, LIB[3].y, { size: 11, color: P.gold, weight: 600, alpha: win(t, 0.6, 2.6, 0.3) });
      text(ctx, 'off-target: most of the library', LIB[2].x + LIB[2].len / 2 + AD + 12, LIB[2].y, { size: 11.5, color: P.inkDim, alpha: win(t, 0.6, 2.6, 0.3) });

      // baits onto target top strands
      LIB.filter(m => m.target).forEach((m, k) => {
        const i = LIB.indexOf(m);
        const y = m.y + drift(i) - sep + 9;
        const bx0 = m.x - m.len / 2 + 20, bx1 = m.x + m.len / 2 - 30;
        const dy = lerp(-120, 0, baitIn);
        bait(ctx, bx0, bx1, y + dy, P, baitIn > 0 ? 1 : 0);
        if (k === 0) text(ctx, 'biotinylated bait, 80–120 nt', bx1 + 24, y + dy, { size: 11, color: P.gold, alpha: win(t, 5.4, 8.5, 0.3) });
      });
      // adapter blockers on every strand
      LIB.forEach((m, i) => {
        const half = m.len / 2;
        for (const side of [-1, 1]) {
          const y = m.y + drift(i) + side * sep + side * 8;
          const dy = lerp(side * 80, 0, blockIn);
          blocker(ctx, m.x - half - AD + 2, m.x - half - 2, y + dy, P, blockIn > 0 ? 0.95 : 0);
          blocker(ctx, m.x + half + 2, m.x + half + AD - 2, y + dy, P, blockIn > 0 ? 0.95 : 0);
        }
      });
      text(ctx, 'adapter blockers: no adapter-to-adapter daisy chains', 330, 478, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 6.2, 8.5, 0.3) });
      text(ctx, 'off-target strands: no bait, stay free in solution', 330, 498, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 6.6, 8.5, 0.3) });

      // clock: 65 °C, 4–24 h
      {
        const a = win(t, 5.0, 8.9, 0.4);
        if (a > 0) {
          const cx = 850, cy = 120, r = 30;
          ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = P.inkDim; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
          const ang = -Math.PI / 2 + Math.PI * 2 * prog(t, 5.0, 8.9);
          line(ctx, cx, cy, cx + Math.cos(ang) * (r - 8), cy + Math.sin(ang) * (r - 8), P.gold, 2.5);
          dot(ctx, cx, cy, 3, P.inkDim);
          ctx.restore();
          text(ctx, '65 °C', cx, cy + r + 16, { size: 13, color: P.ink, align: 'center', weight: 600, alpha: a });
          text(ctx, '4–24 h', cx, cy + r + 34, { size: 12, color: P.inkDim, align: 'center', alpha: a });
          text(ctx, 'rare targets need the time', cx, cy + r + 52, { size: 11, color: P.inkDim, align: 'center', alpha: a * sp(t, 6.5, 7.2), maxWidth: 140 });
        }
      }

      // multiplex: other libraries join on the right
      if (multi > 0) {
        MULTI.forEach((m, i) => {
          const a = prog(multi, i / MULTI.length, (i + 1) / MULTI.length);
          if (a <= 0) return;
          const mm = { ...m, y: m.y + drift(i + 5) };
          ssLibrary(ctx, mm, sep, P, P.samples[m.s], { alpha: a, dim: !m.target });
          if (m.target) {
            const y = mm.y - sep + 9;
            bait(ctx, mm.x - mm.len / 2 + 20, mm.x + mm.len / 2 - 30, y, P, a * sp(t, 9.2, 9.9));
          }
        });
        // legend of index colours
        const ly = 468;
        [0, 1, 2, 3].forEach((s, k) => {
          const x = 580 + k * 80;
          ctx.save(); ctx.globalAlpha *= multi; ctx.fillStyle = P.samples[s]; roundRect(ctx, x, ly - 4, 12, 8, 2); ctx.fill(); ctx.restore();
          text(ctx, 'library ' + (s + 1), x + 18, ly, { size: 11, color: P.inkDim, alpha: multi });
        });
        text(ctx, 'an under-quantified library loses the competition for baits', 740, 496, { size: 12, color: P.inkDim, align: 'center', alpha: multi * sp(t, 9.6, 10.2), maxWidth: 380 });
      }
      ctx.restore();
    }

    // ─────────── scene B: the design panel ───────────
    const sceneB = sp(t, 11.2, 11.8);
    if (sceneB > 0) {
      ctx.save(); ctx.globalAlpha *= sceneB;
      panelTitle(ctx, 'The probe design decides what can be seen', W, P);

      // gene with exons
      const gy = 170, gx0 = 90, gx1 = 870;
      line(ctx, gx0, gy, gx1, gy, P.inkFaint, 2);
      text(ctx, 'a gene: exons and the baits tiled over them', gx0, gy - 46, { size: 12.5, color: P.ink, weight: 600 });
      const EX = [[130, 220], [300, 380], [470, 530], [620, 720], [780, 850]];
      EX.forEach(([a, b], i) => {
        ctx.save(); ctx.fillStyle = P.dna; roundRect(ctx, a, gy - 9, b - a, 18, 3); ctx.fill(); ctx.restore();
        text(ctx, 'exon ' + (i + 1), (a + b) / 2, gy + 24, { size: 10.5, color: P.inkDim, align: 'center' });
      });
      // padding (light gold) around exons
      const pad = sp(t, 13.0, 13.6);
      EX.forEach(([a, b]) => {
        ctx.save(); ctx.globalAlpha *= pad * 0.9; ctx.fillStyle = P.goldDim;
        roundRect(ctx, a - 22, gy - 24, 22, 8, 2); ctx.fill(); roundRect(ctx, b, gy - 24, 22, 8, 2); ctx.fill(); ctx.restore();
      });
      text(ctx, '± 50–150 bp padding (light gold) is captured too', gx1, gy + 44, { size: 11, color: P.gold, align: 'right', alpha: pad });
      // baits: 2x tiling over exons 1,2,4,5; one thin bait over exon 3
      const tile = prog(t, 11.6, 12.8);
      let k = 0;
      EX.forEach(([a, b], i) => {
        if (i === 2) { // GC-rich exon: one bait only
          const al = prog(tile, 0.6, 0.8);
          bait(ctx, a + 6, a + 36, gy - 20, P, al);
          text(ctx, 'GC-rich: thin tiling', (a + b) / 2, gy - 60, { size: 11.5, color: P.alert, align: 'center', weight: 600, alpha: al });
          text(ctx, 'coverage dropout', (a + b) / 2, gy + 44, { size: 11, color: P.alert, align: 'center', alpha: al });
          return;
        }
        const n = Math.max(2, Math.round((b - a) / 30));
        for (let j = 0; j < n; j++) {
          const bx0 = a - 10 + j * ((b - a) / (n - 1)) - 15, bx1 = bx0 + 44;
          const al = prog(tile, (k % 7) / 8, (k % 7) / 8 + 0.25); k++;
          bait(ctx, bx0, Math.min(bx1, b + 24), gy - 20 - (j % 2) * 10, P, al);
        }
      });

      // viral genome
      const vy = 360;
      text(ctx, 'viral capture panel: probes designed on known genomes', gx0, vy - 46, { size: 12.5, color: P.ink, weight: 600 });
      line(ctx, gx0, vy, gx1, vy, P.dna, 6);
      const va = sp(t, 12.8, 13.6);
      // segments: tiles everywhere except a divergent region
      const DIV = [520, 700];
      for (let x = gx0 + 10; x < gx1 - 40; x += 34) {
        const inDiv = x > DIV[0] - 20 && x < DIV[1] - 10;
        if (inDiv) continue;
        bait(ctx, x, x + 28, vy - 18, P, va);
      }
      ctx.save(); ctx.globalAlpha *= va; ctx.fillStyle = P.alert; roundRect(ctx, DIV[0], vy - 3, DIV[1] - DIV[0], 6, 2); ctx.fill(); ctx.restore();
      text(ctx, 'divergent strain: no probe', (DIV[0] + DIV[1]) / 2, vy - 30, { size: 11.5, color: P.alert, align: 'center', weight: 600, alpha: va });
      text(ctx, '> 10–15 % divergence from the design: not captured', (DIV[0] + DIV[1]) / 2, vy + 24, { size: 11, color: P.alert, align: 'center', alpha: va });
      text(ctx, 'host reads', gx0, vy + 24, { size: 11, color: P.inkDim, alpha: va });
      // sample coverage sketch under the viral genome
      const cv = sp(t, 13.6, 14.4);
      const cy0 = 440;
      ctx.save(); ctx.globalAlpha *= cv; ctx.strokeStyle = P.good; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = gx0; x <= gx1; x += 4) {
        const inDiv = x > DIV[0] && x < DIV[1];
        const h = inDiv ? 2 : 22 + 8 * Math.sin(x * 0.05) + 6 * hash(x, 3);
        if (x === gx0) ctx.moveTo(x, cy0 - h); else ctx.lineTo(x, cy0 - h);
      }
      ctx.stroke(); ctx.restore();
      text(ctx, 'coverage', gx0, cy0 + 12, { size: 10.5, color: P.good, alpha: cv });
      text(ctx, 'absent ≠ not there', (DIV[0] + DIV[1]) / 2, cy0 - 12, { size: 11, color: P.alert, align: 'center', alpha: cv });
      footnote(ctx, 'what is not in the probe set cannot be captured', W, H, P, sp(t, 13.8, 14.4));
      ctx.restore();
    }
  },
};
