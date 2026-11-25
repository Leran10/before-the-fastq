// In-nucleus digestion, biotin fill-in and proximity ligation: two crosslinked
// loci are cut at GATC, filled in with biotin-dATP, and their neighbouring ends
// are joined. The junction molecule carries two loci that are 10 Mb apart.
import { prog, sp, win, pulse, lerp, hash, text, callout, dsFragment, dsPath, ssStrand, blob, dot, line, arrow, roundRect, baseRow, withAlpha } from '../draw.js';

const GY = 70, GX0 = 80, GX1 = 880, LA = 230, LB = 690;      // genome line and loci
const PX = 270, PY = 275;                                      // protein (contact point)
const AY = PY - 17, BY = PY + 17;                              // segment rows
const A = { x0: 70, x1: 470, cuts: [170, 345], col: 0 };      // locus A segment, cut sites
const B = { x0: 70, x1: 470, cuts: [190, 360], col: 3 };      // locus B segment
const C = { x0: 560, x1: 900, y: 420, cuts: [730] };          // unrelated segment

function cutSegment(ctx, seg, y, col, P, t, o = {}) {
  // draw a segment as pieces separated at cut sites; `cut` 0..1 opens the gap,
  // `fill` turns overhangs blunt and adds biotin, `alpha` overall.
  const { cut = 0, fill = 0, alpha = 1, hideEnds = [] } = o;
  const bounds = [seg.x0, ...seg.cuts, seg.x1];
  for (let i = 0; i < bounds.length - 1; i++) {
    let x0 = bounds[i], x1 = bounds[i + 1];
    const gap = 5 * cut;
    if (i > 0) x0 += gap; if (i < bounds.length - 2) x1 -= gap;
    dsFragment(ctx, x0, x1, y, { colorA: col, colorB: col, alpha, rungEvery: 8, gap: 6 });
    // 5' overhangs after the cut, blunt + biotin after fill-in
    if (cut > 0.5) {
      const ov = 1 - fill;
      if (i > 0) { ssStrand(ctx, x0 - 7 * ov, y - 3, x0, y - 3, { color: col, lw: 2, ticks: false, alpha: alpha * ov }); if (!hideEnds.includes(`${i}L`)) dot(ctx, x0 - 2, y, 4, P.gold, alpha * fill); }
      if (i < bounds.length - 2) { ssStrand(ctx, x1, y + 3, x1 + 7 * ov, y + 3, { color: col, lw: 2, ticks: false, alpha: alpha * ov }); if (!hideEnds.includes(`${i}R`)) dot(ctx, x1 + 2, y, 4, P.gold, alpha * fill); }
    }
  }
}

export default {
  id: 'digestion-ligation',
  duration: 14,
  thumbT: 8.6,
  phases: [
    { t: 0, label: 'Two loci, one contact', caption: 'Locus A and locus B are 10 Mb apart on the chromosome but sit next to each other in the fixed nucleus, tied through a protein.' },
    { t: 2.5, label: 'MboI cuts at GATC', caption: 'A 4-base cutter cleaves every ~400 bp on average, inside the intact nucleus, leaving 5′ overhangs.' },
    { t: 5, label: 'Biotin fill-in', caption: 'Klenow fills the overhangs with a mix containing biotin-dATP: every cut end becomes blunt and carries a biotin.' },
    { t: 7.5, label: 'Proximity ligation', caption: 'Dilute ligase joins blunt ends that are next to each other. Most such ends belong to fragments that were spatially close, whatever their distance on the chromosome.' },
    { t: 10.5, label: 'One molecule, two loci', caption: 'The product is a single fragment made of locus A and locus B joined at a GATCGATC junction, which MboI can no longer cut.' },
  ],
  draw(ctx, t, W, H, P) {
    const colA = P.samples[1], colB = P.samples[3];
    const cut = sp(t, 2.8, 3.8), fill = sp(t, 5.3, 6.2);
    const lig = sp(t, 7.9, 8.8);
    const dimScene = 1 - sp(t, 10.5, 11.2);

    // ── genome coordinate line (persists) ──
    {
      const a = 1;
      line(ctx, GX0, GY, GX1, GY, P.inkFaint, 1.5, a);
      [[LA, colA, 'locus A'], [LB, colB, 'locus B']].forEach(([x, c, l]) => { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = c; ctx.fillRect(x - 14, GY - 5, 28, 10); ctx.restore(); text(ctx, l, x, GY - 16, { size: 11.5, color: c, align: 'center', alpha: a }); });
      line(ctx, LA + 20, GY + 14, LB - 20, GY + 14, P.inkFaint, 1, a, [3, 3]);
      text(ctx, '10 Mb apart on the chromosome', (LA + LB) / 2, GY + 26, { size: 11, color: P.inkDim, align: 'center', alpha: a });
    }

    // ── in-nucleus scene ──
    ctx.save(); ctx.globalAlpha *= dimScene;
    ctx.strokeStyle = withAlpha(P.membrane, 0.5); ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(PX, PY, 225, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    text(ctx, 'inside the fixed nucleus', PX, PY - 238, { size: 11.5, color: P.inkDim, align: 'center', alpha: dimScene });

    // the valid ends (A piece 1 right end at 345, B piece 1 right end at 360) move toward each other and join
    const jx = 352, jy = PY;
    // we draw segments, then overlay the joining ends by hiding the two gold dots once ligation starts
    const hide = lig > 0 ? ['1R'] : [];
    cutSegment(ctx, A, AY, colA, P, t, { cut, fill, alpha: dimScene, hideEnds: hide });
    cutSegment(ctx, B, BY, colB, P, t, { cut, fill, alpha: dimScene, hideEnds: hide });
    // unrelated segment C (blue), one cut
    cutSegment(ctx, { x0: C.x0, x1: C.x1, cuts: C.cuts }, C.y, P.dna, P, t, { cut, fill, alpha: dimScene });
    text(ctx, 'another locus, not in contact', (C.x0 + C.x1) / 2, C.y + 22, { size: 11, color: P.inkDim, align: 'center', alpha: dimScene * win(t, 0.4, 7.5, 0.3) });
    // protein + crosslinks
    blob(ctx, PX, PY, 14, P.enzyme, { seed: 7, alpha: dimScene, stroke: P.inkDim });
    line(ctx, PX - 5, AY + 4, PX - 5, PY - 6, P.gold, 3, dimScene); line(ctx, PX + 5, BY - 4, PX + 5, PY + 6, P.gold, 3, dimScene);
    text(ctx, 'A', A.x0 - 14, AY, { size: 12, color: colA, align: 'right', weight: 600, alpha: dimScene });
    text(ctx, 'B', B.x0 - 14, BY, { size: 12, color: colB, align: 'right', weight: 600, alpha: dimScene });

    // GATC site markers and cut flashes
    [[A, AY], [B, BY], [{ cuts: C.cuts }, C.y]].forEach(([seg, y]) => seg.cuts.forEach((x, i) => {
      const site = win(t, 2.5, 3.4, 0.3) * dimScene;
      text(ctx, 'GATC', x, y - 14, { size: 9, color: P.inkDim, align: 'center', mono: true, alpha: site });
      const f = pulse(t, 2.8 + i * 0.15, 3.5 + i * 0.15);
      if (f > 0) dot(ctx, x, y, 5 + 8 * f, P.gold, f * 0.9 * dimScene);
    }));
    text(ctx, 'MboI (or DpnII): ^GATC, every ~400 bp', PX, PY + 250, { size: 12, color: P.inkDim, align: 'center', alpha: dimScene * win(t, 2.5, 5.0, 0.3) });
    text(ctx, 'Klenow + biotin-14-dATP: blunt ends, each marked', PX, PY + 250, { size: 12, color: P.inkDim, align: 'center', alpha: dimScene * win(t, 5.0, 7.5, 0.3) });
    callout(ctx, 'biotin', A.cuts[0] + 10, AY - 36, P, { alpha: dimScene * win(t, 5.6, 7.5, 0.3), size: 11, color: P.gold, to: [A.cuts[0] + 3, AY - 4] });
    text(ctx, 'T4 ligase, dilute, in the nucleus: neighbours join', PX, PY + 250, { size: 12, color: P.inkDim, align: 'center', alpha: dimScene * win(t, 7.5, 10.5, 0.3) });

    // ── ligation: the two ends at 345 (A) and 360 (B) bend together ──
    if (lig > 0) {
      const ax = A.cuts[1] - 5 + 2, bx = B.cuts[1] - 5 + 2;
      // short connector arcs from each end toward the junction point
      const pa = [[ax - 10, AY], [lerp(ax, jx, lig), lerp(AY, jy, lig)]];
      const pb = [[bx - 10, BY], [lerp(bx, jx, lig), lerp(BY, jy, lig)]];
      dsPath(ctx, pa, { colorA: colA, colorB: colA, gap: 6, lw: 2.2, rungs: false, alpha: dimScene });
      dsPath(ctx, pb, { colorA: colB, colorB: colB, gap: 6, lw: 2.2, rungs: false, alpha: dimScene });
      dot(ctx, jx, jy, 4.5, P.gold, dimScene);
      const flash = pulse(t, 8.6, 9.3);
      if (flash > 0) dot(ctx, jx, jy, 8 + 14 * flash, P.good, flash * 0.6 * dimScene);
      const ba = dimScene * win(t, 8.8, 10.6, 0.3);
      baseRow(ctx, 'GATCGATC', jx + 4, AY - 44, { size: 11, step: 9, color: P.gold, alpha: ba });
      text(ctx, 'junction: a new 8-mer, no longer an MboI site', jx - 30, AY - 26, { size: 10.5, color: P.inkDim, alpha: ba });
      text(ctx, 'valid pair', jx + 20, BY + 22, { size: 11, color: P.good, weight: 600, alpha: ba });
    }

    // ── artefact panel (7.5 – 10.5), right side ──
    {
      const a = win(t, 7.8, 10.6, 0.4) * dimScene;
      if (a > 0) {
        const X = 560, Y = 130;
        text(ctx, 'the other ligations', X, Y, { size: 13, color: P.ink, weight: 600, alpha: a });
        // self-circle
        const y1 = Y + 45; const g1 = a * sp(t, 8.0, 8.5);
        ctx.save(); ctx.globalAlpha *= g1; ctx.strokeStyle = P.dna; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(X + 22, y1, 16, 0.3, Math.PI * 2 - 0.3); ctx.stroke(); ctx.restore();
        dot(ctx, X + 37, y1 - 5, 3.5, P.gold, g1);
        text(ctx, 'self-circle: a fragment ligates to itself', X + 55, y1 - 7, { size: 11, color: P.alert, alpha: g1 });
        text(ctx, 'both mates on one fragment, pointing outward', X + 55, y1 + 9, { size: 10, color: P.inkDim, alpha: g1 });
        // dangling end
        const y2 = Y + 100; const g2 = a * sp(t, 8.5, 9.0);
        dsFragment(ctx, X + 5, X + 42, y2, { colorA: P.dna, colorB: P.dna, alpha: g2, rungEvery: 7 });
        dot(ctx, X + 44, y2, 3.5, P.gold, g2);
        text(ctx, 'dangling end: never ligated', X + 55, y2 - 7, { size: 11, color: P.alert, alpha: g2 });
        text(ctx, 'still carries biotin; removed later, or it is pulled down', X + 55, y2 + 9, { size: 10, color: P.inkDim, alpha: g2 });
        // re-ligation
        const y3 = Y + 155; const g3 = a * sp(t, 9.0, 9.5);
        dsFragment(ctx, X + 5, X + 22, y3, { colorA: P.dna, colorB: P.dna, alpha: g3, rungEvery: 7 });
        dsFragment(ctx, X + 24, X + 42, y3, { colorA: P.dna, colorB: P.dna, alpha: g3, rungEvery: 7 });
        dot(ctx, X + 23, y3, 3.5, P.gold, g3);
        text(ctx, 're-ligation to the neighbour', X + 55, y3 - 7, { size: 11, color: P.inkDim, alpha: g3 });
        text(ctx, 'looks like uncut DNA; a short cis pair', X + 55, y3 + 9, { size: 10, color: P.inkDim, alpha: g3 });
      }
    }

    // ── final: straightened junction molecule (10.5 – 14) ──
    {
      const a = win(t, 10.6, 14.5, 0.5);
      if (a > 0) {
        const y = 300, x0 = 200, x1 = 760, jm = (x0 + x1) / 2;
        const g = sp(t, 10.8, 11.6);
        dsFragment(ctx, lerp(jm, x0, g), jm - 1, y, { colorA: P.samples[1], colorB: P.samples[1], alpha: a, rungEvery: 8, lw: 2.6, gap: 7 });
        dsFragment(ctx, jm + 1, lerp(jm, x1, g), y, { colorA: P.samples[3], colorB: P.samples[3], alpha: a, rungEvery: 8, lw: 2.6, gap: 7 });
        dot(ctx, jm, y, 5.5, P.gold, a);
        baseRow(ctx, 'GATCGATC', jm - 32, y + 26, { size: 12, step: 9.5, color: P.gold, alpha: a * g });
        text(ctx, 'locus A', lerp(jm, x0, g) + 10, y - 20, { size: 12, color: P.samples[1], alpha: a * g, weight: 600 });
        text(ctx, 'locus B', lerp(jm, x1, g) - 10, y - 20, { size: 12, color: P.samples[3], align: 'right', alpha: a * g, weight: 600 });
        // leaders to the genome line
        const l = a * sp(t, 11.6, 12.3);
        line(ctx, x0 + 60, y - 8, LA, GY + 8, P.samples[1], 1, l, [3, 4]);
        line(ctx, x1 - 60, y - 8, LB, GY + 8, P.samples[3], 1, l, [3, 4]);
        text(ctx, 'one molecule, two loci', jm, y + 70, { size: 16, color: P.ink, weight: 600, align: 'center', alpha: a * sp(t, 11.8, 12.4) });
        text(ctx, 'a read pair from this molecule maps 10 Mb apart; a read through the middle contains GATCGATC', jm, y + 96, { size: 12, color: P.inkDim, align: 'center', alpha: a * sp(t, 12.2, 12.8), maxWidth: 640 });
        text(ctx, 'biotin marks it for capture', jm, y + 120, { size: 12, color: P.gold, align: 'center', alpha: a * sp(t, 12.6, 13.2) });
      }
    }
  },
};
