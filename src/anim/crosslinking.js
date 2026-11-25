// Formaldehyde crosslinking: a folded chromatin fibre whose distant segments
// touch, formaldehyde ties them through the protein, the nucleus is
// permeabilised; then over- vs under-fixation and what it does to cis/trans.
import { prog, sp, win, pulse, lerp, hash, text, callout, dsPath, blob, dot, line, arrow, roundRect, curve, withAlpha } from '../draw.js';

const NX = 260, NY = 270, NR = 195;            // nucleus
const R0 = 150, N = 240;
const TOUCH = 0.35;                              // half-width (rad) of the touching segments

// Closed, pinched chromatin loop: both sides pass through the centre in opposite directions.
function fibrePoint(u) {
  const th = u * Math.PI * 2;
  const R = R0 * (1 + 0.12 * Math.sin(5 * th + 1));
  const c = Math.cos(th);
  const x = NX + R * c;
  const y = NY + R * Math.sin(th) * (0.07 + 0.93 * c * c);
  const nrm = 3 * Math.sin(th * 40);
  return [x + nrm * 0.3, y + nrm];
}
const FIBRE = [];
for (let k = 0; k <= N; k++) FIBRE.push(fibrePoint(k / N));
const segA = k => Math.abs(k / N * Math.PI * 2 - 3 * Math.PI / 2) < TOUCH;   // above the centre
const segB = k => Math.abs(k / N * Math.PI * 2 - Math.PI / 2) < TOUCH;       // below the centre
// extra proteins along the fibre (non-contact sites)
const PROTS = [0.08, 0.2, 0.62, 0.84].map((u, i) => ({ u, p: fibrePoint(u), i }));

function miniNucleus(ctx, x, y, r, P, alpha, o = {}) {
  const { dashed = false, fibreAlpha = 1, dense = false, seed = 1 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.strokeStyle = P.membrane; ctx.lineWidth = 2; if (dashed) ctx.setLineDash([5, 5]);
  ctx.fillStyle = withAlpha(P.cell, 0.5);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = withAlpha(P.dna, fibreAlpha); ctx.lineWidth = dense ? 2.6 : 1.8;
  ctx.beginPath();
  const n = dense ? 160 : 90;
  for (let k = 0; k <= n; k++) {
    const u = k / n, th = u * Math.PI * 2 * (dense ? 6 : 3);
    const rr = r * (0.2 + 0.6 * hash(k, seed));
    const px = x + Math.cos(th) * rr, py = y + Math.sin(th) * rr;
    k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke(); ctx.restore();
}

export default {
  id: 'crosslinking',
  duration: 13,
  thumbT: 4.8,
  phases: [
    { t: 0, label: 'Inside the nucleus', caption: 'Chromatin is folded so that segments far apart on the chromosome sit next to each other, often held by a protein complex.' },
    { t: 3, label: 'Formaldehyde', caption: '1–2 % formaldehyde for 10 minutes bridges amines that are within ~2 Å: DNA to protein, protein to protein. Contacts are now covalent. Glycine stops the reaction.' },
    { t: 6, label: 'Permeabilise', caption: 'Cells are lysed and the nuclei opened with SDS so that enzymes can enter while the fixed structure stays in place.' },
    { t: 8.5, label: 'Too much, too little', caption: 'Over-fixed chromatin cannot be cut; under-fixed or lysed cells let DNA from different nuclei mix and ligate at random.' },
    { t: 11, label: 'In your data', caption: 'Fixation shows up as the cis/trans ratio and the slope of contact frequency against distance. Compare samples only after matching them.' },
  ],
  draw(ctx, t, W, H, P) {
    const dimA = 1 - 0.75 * sp(t, 8.5, 9.2);
    const dashed = sp(t, 6.2, 7.0);
    // ── nucleus ──
    ctx.save(); ctx.globalAlpha *= dimA;
    ctx.fillStyle = withAlpha(P.cell, 0.45); ctx.strokeStyle = P.membrane; ctx.lineWidth = 2.5;
    if (dashed > 0) ctx.setLineDash([8, 2 + 8 * dashed]);
    ctx.beginPath(); ctx.arc(NX, NY, NR, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    text(ctx, 'nucleus', NX, NY - NR - 14, { size: 12, color: P.inkDim, align: 'center', alpha: dimA });

    // ── fibre, drawn in runs by colour ──
    const jit = (k) => Math.sin(t * 1.1 + k * 0.3) * 1.2;
    let run = [], runCol = null;
    const flush = () => { if (run.length > 1) dsPath(ctx, run, { colorA: runCol, colorB: runCol, gap: 4, lw: 2, rungs: false, alpha: dimA }); run = []; };
    for (let k = 0; k <= N; k++) {
      const col = segA(k) ? P.samples[1] : segB(k) ? P.samples[3] : P.dna;
      const p = [FIBRE[k][0], FIBRE[k][1] + jit(k)];
      if (col !== runCol) { if (run.length) run.push(p); flush(); runCol = col; }
      run.push(p);
    }
    flush();
    callout(ctx, 'locus A', NX + NR + 16, NY - 80, P, { alpha: dimA * win(t, 0.4, 8.5, 0.3), size: 12, color: P.samples[1], to: [NX + 44, NY - 14] });
    callout(ctx, 'locus B, 10 Mb away on the chromosome', NX + NR + 16, NY + 90, P, { alpha: dimA * win(t, 0.4, 8.5, 0.3), size: 12, color: P.samples[3], to: [NX + 44, NY + 14] });
    // proteins
    blob(ctx, NX, NY, 15, P.enzyme, { seed: 5, alpha: dimA, stroke: P.inkDim });
    PROTS.forEach(pr => blob(ctx, pr.p[0], pr.p[1], 9, P.enzyme, { seed: pr.i + 9, alpha: dimA * 0.9 }));
    text(ctx, 'protein complex', NX - 24, NY, { size: 11, color: P.inkDim, align: 'right', alpha: dimA * win(t, 0.6, 3.0, 0.3) });

    // ── formaldehyde ──
    {
      const a = win(t, 3.0, 6.0, 0.4) * dimA;
      if (a > 0) {
        for (let i = 0; i < 16; i++) {
          const u = sp(t, 3.0 + hash(i, 3) * 0.8, 4.3 + hash(i, 3) * 0.8);
          const ang = hash(i, 4) * Math.PI * 2;
          const x = lerp(NX + Math.cos(ang) * (NR + 40), NX + Math.cos(ang) * NR * 0.6, u);
          const y = lerp(NY + Math.sin(ang) * (NR + 40), NY + Math.sin(ang) * NR * 0.6, u);
          dot(ctx, x, y, 2.5, P.gold, a * (1 - sp(t, 4.6, 5.2)));
        }
        text(ctx, '1 % formaldehyde, 10 min, room temperature', NX, NY + NR + 26, { size: 12, color: P.inkDim, align: 'center', alpha: a * win(t, 3.0, 5.2, 0.3) });
        text(ctx, 'glycine: quench', NX, NY + NR + 26, { size: 12, color: P.inkDim, align: 'center', alpha: a * win(t, 5.2, 6.0, 0.3) });
      }
      // crosslink bars (persist)
      const x = sp(t, 3.9, 4.7) * dimA;
      if (x > 0) {
        line(ctx, NX - 6, NY - 11, NX - 6, NY - 3, P.gold, 3, x); line(ctx, NX + 6, NY + 11, NX + 6, NY + 3, P.gold, 3, x);
        PROTS.forEach(pr => { const k = Math.round(pr.u * N); const q = FIBRE[k]; line(ctx, q[0], q[1], lerp(q[0], pr.p[0], 0.5) + 6, lerp(q[1], pr.p[1], 0.5) - 6, P.gold, 3, x); });
        callout(ctx, 'covalent bridge', NX + 70, NY + 4, P, { alpha: x * win(t, 4.2, 6.0, 0.3), size: 11.5, color: P.gold, to: [NX + 8, NY + 6] });
      }
    }
    // ── permeabilise ──
    {
      const a = win(t, 6.0, 8.6, 0.4) * dimA;
      if (a > 0) {
        text(ctx, 'SDS: membrane permeabilised, structure kept', NX, NY + NR + 26, { size: 12, color: P.inkDim, align: 'center', alpha: a });
        for (let i = 0; i < 3; i++) {
          const ang = -0.6 + i * 0.5;
          const u = sp(t, 6.6 + i * 0.3, 7.8 + i * 0.3);
          const x = lerp(NX + Math.cos(ang) * (NR + 60), NX + Math.cos(ang) * NR * 0.55, u);
          const y = lerp(NY + Math.sin(ang) * (NR + 60), NY + Math.sin(ang) * NR * 0.55, u);
          blob(ctx, x, y, 10, P.enzyme, { seed: 20 + i, alpha: a, stroke: P.inkDim });
        }
        text(ctx, 'enzymes can enter', NX + NR + 10, NY - 90, { size: 11.5, color: P.inkDim, alpha: a * sp(t, 6.6, 7.2) });
      }
    }

    // ── side panel: over vs under fixation (8.5 – 11) ──
    {
      const a = win(t, 8.5, 11.2, 0.5);
      if (a > 0) {
        text(ctx, 'fixation is a trade-off', 720, 80, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        // too much
        miniNucleus(ctx, 610, 220, 75, P, a, { dense: true, seed: 2 });
        const blk = sp(t, 9.0, 9.8);
        for (let i = 0; i < 3; i++) { const ang = -0.9 + i * 0.6; const x = lerp(610 + Math.cos(ang) * 150, 610 + Math.cos(ang) * 86, blk), y = lerp(220 + Math.sin(ang) * 150, 220 + Math.sin(ang) * 86, blk); blob(ctx, x, y, 8, P.enzyme, { seed: 30 + i, alpha: a }); }
        text(ctx, '✕', 696, 196, { size: 16, color: P.alert, align: 'center', alpha: a * blk });
        text(ctx, 'too much', 610, 316, { size: 12.5, color: P.ink, align: 'center', weight: 600, alpha: a });
        text(ctx, 'enzymes cannot reach: few cuts, short-range pairs', 610, 336, { size: 11, color: P.inkDim, align: 'center', alpha: a, maxWidth: 200 });
        // too little / lysed
        miniNucleus(ctx, 790, 220, 60, P, a, { dashed: true, fibreAlpha: 0.7, seed: 3 });
        miniNucleus(ctx, 890, 250, 45, P, a, { dashed: true, fibreAlpha: 0.7, seed: 4 });
        const leak = sp(t, 9.4, 10.4);
        if (leak > 0) {
          const pts1 = [], pts2 = [];
          for (let k = 0; k <= 20; k++) { const u = k / 20; pts1.push([lerp(840, 850 + 10 * Math.sin(u * 9), leak * u + (1 - leak) * 0), lerp(235, 235, 1) + Math.sin(u * 7) * 5 - 10 * u * leak]); }
          for (let k = 0; k <= 20; k++) { const u = k / 20; pts2.push([lerp(855, 850, leak * u), 250 + Math.sin(u * 6 + 1) * 5 - 12 * u * leak]); }
          dsPath(ctx, pts1, { colorA: P.alert, colorB: P.alert, gap: 3, lw: 1.8, rungs: false, alpha: a * leak });
          dsPath(ctx, pts2, { colorA: P.alert, colorB: P.alert, gap: 3, lw: 1.8, rungs: false, alpha: a * leak });
          dot(ctx, 851, 224, 4, P.alert, a * sp(t, 10.0, 10.4));
        }
        text(ctx, 'too little / lysed cells', 840, 316, { size: 12.5, color: P.ink, align: 'center', weight: 600, alpha: a });
        text(ctx, 'DNA from different nuclei meets → random trans contacts', 840, 336, { size: 11, color: P.alert, align: 'center', alpha: a, maxWidth: 220 });
      }
    }

    // ── data panel (11 – 13) ──
    {
      const a = win(t, 11.0, 13.5, 0.5);
      if (a > 0) {
        const X = 520;
        text(ctx, 'what fixation looks like in the pairs', X, 80, { size: 14, color: P.ink, weight: 600, alpha: a });
        const rows = [
          { label: 'good library', cis: 0.82, col: P.good },
          { label: 'lysed / under-fixed', cis: 0.5, col: P.alert },
        ];
        rows.forEach((r, k) => {
          const y = 125 + k * 52, w = 380;
          const g = sp(t, 11.2 + k * 0.4, 12.0 + k * 0.4);
          text(ctx, r.label, X, y - 14, { size: 11.5, color: r.col, alpha: a });
          ctx.save(); ctx.globalAlpha *= a;
          ctx.fillStyle = P.dna; ctx.fillRect(X, y, w * r.cis * g, 14);
          ctx.fillStyle = P.inkFaint; ctx.fillRect(X + w * r.cis * g, y, w * (1 - r.cis) * g, 14);
          ctx.restore();
          text(ctx, `cis ${Math.round(r.cis * 100)} %`, X + 6, y + 7, { size: 10.5, color: P.bg, alpha: a * g });
          text(ctx, `trans ${Math.round((1 - r.cis) * 100)} %`, X + w - 6, y + 7, { size: 10.5, color: P.inkDim, align: 'right', alpha: a * g });
        });
        // distance decay sketch
        const gx = X, gy = 250, gw = 380, gh = 170;
        const c = a * win(t, 11.8, 13.5, 0.4);
        line(ctx, gx, gy + gh, gx + gw, gy + gh, P.inkFaint, 1, c); line(ctx, gx, gy, gx, gy + gh, P.inkFaint, 1, c);
        curve(ctx, gx, gy, gw, gh, u => 0.95 - 0.9 * u, P.good, { lw: 2.2, alpha: c });
        curve(ctx, gx, gy, gw, gh, u => Math.max(0.3, 0.95 - 1.5 * u), P.alert, { lw: 2, alpha: c, dash: [5, 4] });
        text(ctx, 'log contact frequency', gx - 6, gy + 6, { size: 10.5, color: P.inkDim, align: 'right', alpha: c });
        text(ctx, 'log genomic distance', gx + gw, gy + gh + 16, { size: 10.5, color: P.inkDim, align: 'right', alpha: c });
        text(ctx, 'smooth power law', gx + 200, gy + 56, { size: 11, color: P.good, alpha: c });
        text(ctx, 'flattens into a random floor', gx + 200, gy + 144, { size: 11, color: P.alert, alpha: c });
      }
    }
  },
};
