// Chromatin shearing for ChIP: fixed chromatin (nucleosome fibre with bound,
// crosslinked proteins) is sonicated into 200–700 bp pieces. Open chromatin
// shears into many small soluble pieces; compact chromatin stays large and
// partly pellets. Over-sonication destroys epitopes. MNase gives a ladder.
import { prog, sp, win, pulse, lerp, hash, text, callout, blob, dot, line, arrow, roundRect, panelTitle, footnote, histogram, curve, shake, withAlpha } from '../draw.js';

const FY = 222;                                   // fibre baseline
const fy = x => FY + 28 * Math.sin(x / 48);       // fibre path
// nucleosome positions: open (sparse) → transition → compact (dense)
const NUC = [];
for (let x = 100; x < 400; x += 50) NUC.push(x);
for (let x = 420; x < 520; x += 34) NUC.push(x);
for (let x = 530; x <= 870; x += 19) NUC.push(x);
// bound proteins (TF / complexes) on linkers in the open region, with crosslink ticks
const PROT = [{ x: 175, seed: 3 }, { x: 275, seed: 5 }, { x: 437, seed: 7 }];
// pieces after shearing: [x0, x1, class]  (breaks fall between nucleosomes)
const PIECES = [
  [90, 162, 'open'], [162, 225, 'open'], [225, 300, 'open'], [300, 362, 'open'], [362, 412, 'open'],
  [412, 470, 'mid'], [470, 530, 'mid'],
  [530, 705, 'compact'], [705, 880, 'pellet'],
];

function drawPiece(ctx, p, dx, dy, P, alpha, o = {}) {
  const { color = P.dna, nucColor = P.enzymeDim, nucStroke = P.enzyme, protAlpha = 1, epitope = 1 } = o;
  if (alpha <= 0) return;
  const [x0, x1] = p;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(dx, dy);
  // linker DNA along the path
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 4) { const y = fy(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  // nucleosomes
  ctx.fillStyle = nucColor; ctx.strokeStyle = nucStroke; ctx.lineWidth = 1.2;
  for (const nx of NUC) if (nx > x0 + 4 && nx < x1 - 4) { ctx.beginPath(); ctx.arc(nx, fy(nx), 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // proteins with crosslink ticks
  for (const pr of PROT) if (pr.x > x0 + 4 && pr.x < x1 - 4) {
    const y = fy(pr.x) - 17;
    blob(ctx, pr.x, y, 12, P.enzyme, { seed: pr.seed, alpha: protAlpha, stroke: P.inkDim });
    line(ctx, pr.x - 5, y + 9, pr.x - 5, fy(pr.x) - 2, P.gold, 2.5, protAlpha);
    line(ctx, pr.x + 5, y + 9, pr.x + 5, fy(pr.x) - 2, P.gold, 2.5, protAlpha);
    // epitope: a gold notch on the protein; alert cross when destroyed
    if (epitope > 0) dot(ctx, pr.x + 9, y - 7, 3, P.gold, protAlpha * epitope);
  }
  ctx.restore();
}

// MNase ladder (0..1 per bin)
const LADDER = Array.from({ length: 30 }, (_, i) => {
  const bp = (i + 0.5) * 25;
  return Math.min(1, Math.exp(-((bp - 150) ** 2) / (2 * 22 ** 2)) + 0.6 * Math.exp(-((bp - 320) ** 2) / (2 * 28 ** 2)) + 0.32 * Math.exp(-((bp - 490) ** 2) / (2 * 34 ** 2)) + 0.14 * Math.exp(-((bp - 660) ** 2) / (2 * 40 ** 2)) + 0.02);
});

export default {
  id: 'chromatin-shearing',
  duration: 15,
  thumbT: 6.6,
  phases: [
    { t: 0, label: 'Fixed chromatin', caption: 'After fixation and lysis, chromatin is a nucleosome fibre with the proteins of interest crosslinked onto it. Open regions have sparse nucleosomes; heterochromatin is densely packed.' },
    { t: 2.5, label: 'Sonication', caption: 'Focused ultrasound or a probe breaks the DNA by shear force. The operator tunes cycles and power per cell type until a 200–700 bp smear appears. Proteins stay on their fragments.' },
    { t: 5.5, label: 'Open shears first', caption: 'Open chromatin breaks into many small soluble pieces; compact chromatin resists, stays large and partly pellets. The pellet is discarded, and with it the regions hardest to shear.' },
    { t: 8, label: 'Over-sonication', caption: 'Too many cycles heat the sample, denature the epitope the antibody needs and push fragments below 150 bp. The IP yield and the insert size shift together.' },
    { t: 10.5, label: 'MNase instead', caption: 'Native ChIP digests linker DNA with micrococcal nuclease: a ladder of mono-, di- and tri-nucleosomes instead of a smear, nucleosome resolution, but no transcription factors and an A/T cutting preference.' },
    { t: 12.5, label: 'The trace', caption: 'The pilot gel or Bioanalyzer trace is the first QC: a 200–700 bp smear is the target; a short smear means over-sonication. The size set here is the resolution of every peak.' },
  ],
  draw(ctx, t, W, H, P) {
    const son = win(t, 2.5, 5.6, 0.3);              // sonication pulses visible
    const shear = sp(t, 3.0, 4.6);                   // pieces separate
    const pellet = sp(t, 4.6, 6.0);                  // pellet piece sinks
    const contrast = win(t, 5.6, 8.2, 0.3);
    const over = sp(t, 8.2, 9.0);
    const mnase = sp(t, 10.7, 11.5);
    const trace = sp(t, 12.7, 13.6);
    const sceneDim = 1 - 0.35 * sp(t, 8.0, 8.8);     // upper scene fades a little once the panels start

    panelTitle(ctx, 'Crosslinked chromatin after lysis', W, P, win(t, 0, 2.5, 0.3));
    panelTitle(ctx, 'Sonication: shear force breaks the DNA', W, P, win(t, 2.5, 5.5, 0.3));
    panelTitle(ctx, 'Open chromatin shears first, compact chromatin pellets', W, P, win(t, 5.5, 8, 0.3));
    panelTitle(ctx, 'Over-sonication destroys epitopes', W, P, win(t, 8, 10.5, 0.3));
    panelTitle(ctx, 'MNase digestion: a nucleosome ladder instead', W, P, win(t, 10.5, 12.5, 0.3));
    panelTitle(ctx, 'The shear check decides the resolution', W, P, win(t, 12.5, 15, 0.3));

    // ── region labels ──
    {
      const a = win(t, 0.2, 8.0, 0.3) * sceneDim;
      line(ctx, 100, 128, 400, 128, P.gold, 3, a);
      text(ctx, 'open chromatin', 250, 114, { size: 12.5, color: P.gold, align: 'center', weight: 600, alpha: a });
      line(ctx, 530, 128, 870, 128, P.inkFaint, 3, a);
      text(ctx, 'compact heterochromatin', 700, 114, { size: 12.5, color: P.inkDim, align: 'center', weight: 600, alpha: a });
      const a0 = win(t, 0.3, 2.6, 0.3);
      callout(ctx, 'bound protein, crosslinked', 60, 350, P, { to: [PROT[0].x - 8, fy(PROT[0].x) - 12], alpha: a0, color: P.inkDim });
      callout(ctx, 'nucleosome', 420, 350, P, { to: [NUC[4] + 2, fy(NUC[4]) + 10], alpha: a0, color: P.inkDim });
      callout(ctx, 'linker DNA', 700, 350, P, { to: [NUC[8] + 24, fy(NUC[8] + 24) + 2], alpha: a0, color: P.inkDim });
      text(ctx, 'crosslinked cells, SDS lysis, nuclei', 870, 60, { size: 11.5, color: P.inkDim, align: 'right', alpha: a0 });
    }

    // ── sonication pulses ──
    if (son > 0) {
      const sx = 480, sy = 70;
      // probe
      ctx.save(); ctx.globalAlpha *= son; ctx.fillStyle = P.enzyme; roundRect(ctx, sx - 7, 46, 14, 26, 3); ctx.fill(); ctx.restore();
      text(ctx, 'ultrasound', sx + 14, 58, { size: 11.5, color: P.inkDim, alpha: son });
      for (let k = 0; k < 4; k++) {
        const ph = ((t * 1.6 + k * 0.25) % 1);
        const r = 14 + ph * 120, a = son * (1 - ph) * 0.8;
        ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = P.gold; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, r, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); ctx.restore();
      }
    }

    // ── fibre / pieces ──
    ctx.save(); ctx.globalAlpha *= sceneDim;
    const [shx, shy] = shake(t, 2.5 * son * (1 - shear), 42, 1);
    PIECES.forEach((p, i) => {
      const [x0, x1, cls] = p;
      // separation: horizontal gap and vertical scatter
      let dx = shx + (i - 4) * 5 * shear, dy = shy + (hash(i, 9) - 0.5) * 34 * shear;
      let color = P.dna, alpha = 1;
      if (cls === 'pellet') { dy = lerp(dy, 86, pellet); dx = lerp(dx, -40, pellet); color = lerp(0, 1, pellet) > 0.5 ? P.alertDim : P.dna; }
      drawPiece(ctx, p, dx, dy, P, alpha, { color });
      // flashes at break points
      if (i > 0) { const f = pulse(t, 3.0 + hash(i, 4) * 0.6, 3.7 + hash(i, 4) * 0.6); if (f > 0) dot(ctx, x0 + shx, fy(x0) + shy, 4 + 8 * f, P.gold, f * 0.85); }
    });
    ctx.restore();

    // pellet zone
    if (pellet > 0) {
      const a = pellet * sceneDim;
      ctx.save(); ctx.globalAlpha *= a * 0.5; ctx.strokeStyle = P.alert; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; roundRect(ctx, 640, 278, 250, 60, 8); ctx.stroke(); ctx.restore();
      text(ctx, 'pellet: insoluble, discarded', 765, 354, { size: 11.5, color: P.alert, align: 'center', alpha: a });
    }

    // ── contrast annotations ──
    if (contrast > 0) {
      const a = contrast * sceneDim;
      text(ctx, '5 small pieces, all soluble', 250, 296, { size: 12, color: P.good, align: 'center', alpha: a, weight: 600 });
      text(ctx, 'over-represented in the input', 250, 314, { size: 11.5, color: P.inkDim, align: 'center', alpha: a });
      text(ctx, '2 large pieces, one lost', 520, 296, { size: 12, color: P.alert, align: 'center', alpha: a, weight: 600 });
      text(ctx, 'under-represented in input and IP', 520, 314, { size: 11.5, color: P.inkDim, align: 'center', alpha: a });
      text(ctx, 'the input is not flat before any antibody is added', 400, 354, { size: 12.5, color: P.ink, align: 'center', alpha: a * sp(t, 6.4, 7.0) });
    }

    // ── bottom row panels ──
    const py = 376, ph = 104;
    // 1. over-sonication inset
    if (over > 0) {
      const a = over, x = 70, w = 300;
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.panel; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; roundRect(ctx, x, py, w, ph, 8); ctx.fill(); ctx.stroke(); ctx.restore();
      text(ctx, 'too many cycles', x + 12, py + 16, { size: 12, color: P.alert, weight: 600, alpha: a });
      // a short piece with a protein whose epitope breaks off
      const yy = py + 62, ex = x + 120;
      const sh = sp(t, 8.8, 9.6);
      ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = P.dna; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 30, yy + 14); ctx.lineTo(x + 30 + 50 - 20 * sh, yy + 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 95 + 10 * sh, yy + 14); ctx.lineTo(x + 145, yy + 14); ctx.stroke();
      ctx.restore();
      line(ctx, ex - 5, yy + 4, ex - 5, yy + 12, P.gold, 2.5, a); line(ctx, ex + 5, yy + 4, ex + 5, yy + 12, P.gold, 2.5, a);
      blob(ctx, ex, yy - 6, 11, P.enzyme, { seed: 5, alpha: a, stroke: P.inkDim });
      // epitope drifting off, crossed
      const e = sp(t, 9.0, 9.8);
      dot(ctx, ex + 9 + 22 * e, yy - 13 - 14 * e, 3, P.gold, a * (1 - e * 0.5));
      line(ctx, ex + 26, yy - 33, ex + 36, yy - 23, P.alert, 2, a * e); line(ctx, ex + 36, yy - 33, ex + 26, yy - 23, P.alert, 2, a * e);
      text(ctx, 'epitope denatured', x + 165, yy - 18, { size: 11.5, color: P.alert, alpha: a * e });
      text(ctx, 'fragments < 150 bp', x + 165, yy + 2, { size: 11.5, color: P.alert, alpha: a * sh });
      text(ctx, 'weak IP, short inserts', x + 165, yy + 22, { size: 11.5, color: P.inkDim, alpha: a * sh });
      text(ctx, 'heat + foam', x + 12, py + ph - 12, { size: 11, color: P.inkDim, alpha: a });
    }
    // 2. MNase ladder
    if (mnase > 0) {
      const a = mnase, x = 395, w = 190;
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.panel; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; roundRect(ctx, x, py, w, ph, 8); ctx.fill(); ctx.stroke(); ctx.restore();
      text(ctx, 'MNase (native ChIP)', x + 12, py + 16, { size: 12, color: P.ink, weight: 600, alpha: a });
      histogram(ctx, x + 14, py + 30, w - 28, 54, LADDER.map((v, i) => v * sp(t, 10.8 + i * 0.012, 11.2 + i * 0.012)), P, { color: P.dna, alpha: a, labelL: '147', labelR: '~700 bp' });
      text(ctx, 'mono  di  tri', x + 14 + 8, py + 28, { size: 10.5, color: P.inkDim, alpha: a });
    }
    // 3. Bioanalyzer trace
    if (trace > 0) {
      const a = trace, x = 610, w = 290;
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.panel; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; roundRect(ctx, x, py, w, ph, 8); ctx.fill(); ctx.stroke(); ctx.restore();
      text(ctx, 'shear check (Bioanalyzer)', x + 12, py + 16, { size: 12, color: P.ink, weight: 600, alpha: a });
      const cx = x + 16, cy = py + 30, cw = w - 32, ch = 54;
      // target band 200–700 bp on a 0–1000 bp axis
      ctx.save(); ctx.globalAlpha *= a * 0.22; ctx.fillStyle = P.good; ctx.fillRect(cx + cw * 0.2, cy, cw * 0.5, ch); ctx.restore();
      ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy + ch + 0.5); ctx.lineTo(cx + cw, cy + ch + 0.5); ctx.stroke(); ctx.restore();
      const g = sp(t, 12.9, 13.7), b = sp(t, 13.4, 14.2);
      curve(ctx, cx, cy, cw, ch, u => 0.05 + 0.9 * g * Math.exp(-((u - 0.47) ** 2) / (2 * 0.12 ** 2)), P.good, { lw: 2.5, alpha: a });
      curve(ctx, cx, cy, cw, ch, u => 0.05 + 0.9 * b * Math.exp(-((u - 0.1) ** 2) / (2 * 0.055 ** 2)), P.alert, { lw: 2.5, alpha: a, dash: [5, 4] });
      text(ctx, '200', cx + cw * 0.2, cy + ch + 12, { size: 10.5, color: P.inkDim, align: 'center', alpha: a });
      text(ctx, '700 bp', cx + cw * 0.7, cy + ch + 12, { size: 10.5, color: P.inkDim, align: 'center', alpha: a });
      text(ctx, 'target 200–700', cx + cw * 0.76, cy + 12, { size: 11, color: P.good, align: 'center', alpha: a * g, weight: 600 });
      text(ctx, 'over-sheared', cx + 36, cy + 4, { size: 11, color: P.alert, alpha: a * b, weight: 600 });
      footnote(ctx, 'open chromatin shears more easily: the origin of input bias', W, H, P, sp(t, 13.4, 14.0));
    }
  },
};
