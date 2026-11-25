// Reverse crosslinking, biotin removal from dangling ends, shearing,
// streptavidin pulldown of junction fragments, on-bead library and PCR.
// End: the insert is the shear size, not the distance between the loci.
import { prog, sp, win, pulse, lerp, hash, text, callout, dsFragment, blob, bead, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

// three molecules at rest
const M = [
  { y: 140, x0: 110, x1: 560, junction: 335, kind: 'junction' },   // A|B junction molecule
  { y: 240, x0: 130, x1: 470, biotinEnd: 470, kind: 'dangling' },  // dangling end with biotin
  { y: 340, x0: 150, x1: 520, kind: 'plain' },                      // no biotin at all
];
// shear pieces: deterministic boundaries per molecule
function pieces(m) {
  const out = []; let x = m.x0, i = 0;
  while (x < m.x1 - 20) { const len = 60 + 50 * hash(i + m.y, 2); const x1 = Math.min(m.x1, x + len); out.push({ x0: x, x1, i }); x = x1; i++; }
  if (out.length) out[out.length - 1].x1 = m.x1;
  return out;
}
const PIECES = M.map(pieces);
const BEADS = [{ x: 740, y: 200 }, { x: 760, y: 330 }];

export default {
  id: 'biotin-pulldown',
  duration: 14,
  thumbT: 8.4,
  phases: [
    { t: 0, label: 'Reverse the crosslinks', caption: 'Proteinase K and SDS at 65 °C overnight digest the proteins and undo the formaldehyde bridges. The ligated DNA is purified.' },
    { t: 2.5, label: 'Strip biotin from dangling ends', caption: 'T4 DNA polymerase chews back unligated ends and removes their biotin, so that only true junctions can be captured.' },
    { t: 5, label: 'Shear to 300–500 bp', caption: 'Sonication cuts everything into library-sized pieces. Only the piece that happens to contain the junction keeps the biotin.' },
    { t: 7.5, label: 'Streptavidin pulldown', caption: 'Magnetic streptavidin beads bind the biotinylated pieces; everything else, most of the mass, is washed away.' },
    { t: 10, label: 'Library on the beads', caption: 'End repair, A-tailing and adapter ligation happen on the beads; PCR off the beads makes the library. Complexity is the number of junctions captured.' },
    { t: 12, label: 'Insert ≠ distance', caption: 'The insert is 300–500 bp of shear size, but its two ends come from loci that may be megabases apart.' },
  ],
  draw(ctx, t, W, H, P) {
    const colA = P.samples[1], colB = P.samples[3];
    const protA = 1 - sp(t, 0.6, 2.0);           // proteins dissolve
    const chew = sp(t, 3.0, 4.2);                 // biotin removed from dangling end
    const shear = sp(t, 5.3, 6.3);
    const pull = sp(t, 7.8, 9.0);
    const wash = sp(t, 8.6, 9.6);
    const lib = sp(t, 10.2, 11.0);
    const pcr = sp(t, 11.0, 12.0);
    const sceneA = 1 - sp(t, 12.0, 12.6);

    ctx.save(); ctx.globalAlpha *= sceneA;

    // ── molecules: whole until shearing, then as pieces ──
    M.forEach((m, mi) => {
      const pcs = PIECES[mi];
      pcs.forEach((p, k) => {
        const gap = 4 * shear;
        let x0 = p.x0 + (k > 0 ? gap : 0), x1 = p.x1 - (k < pcs.length - 1 ? gap : 0);
        const dy = (hash(k + mi * 7, 3) - 0.5) * 18 * shear;
        let y = m.y + dy;
        const hasJunction = m.kind === 'junction' && p.x0 <= m.junction && m.junction < p.x1;
        const hasBiotin = hasJunction || (m.kind === 'dangling' && p.x1 === m.x1 && chew < 1);
        // pulldown: biotin pieces go to a bead; others wash away
        let alpha = 1;
        if (hasBiotin && pull > 0) {
          const b = BEADS[mi % BEADS.length];
          const len = x1 - x0;
          const tx0 = b.x - len / 2, ty = b.y - 34 - (mi === 1 ? -68 : 0);
          x0 = lerp(x0, tx0, pull); x1 = x0 + len; y = lerp(y, ty, pull);
        } else if (!hasBiotin) {
          alpha = 1 - wash;
        }
        if (alpha <= 0) return;
        // colours: junction molecule is A on the left half, B on the right
        if (m.kind === 'junction') {
          const jx = m.junction;
          if (p.x1 <= jx) dsFragment(ctx, x0, x1, y, { colorA: colA, colorB: colA, alpha, rungEvery: 8 });
          else if (p.x0 >= jx) dsFragment(ctx, x0, x1, y, { colorA: colB, colorB: colB, alpha, rungEvery: 8 });
          else {
            const jl = x0 + (jx - p.x0) * (shear > 0 ? 1 : 1) - (k > 0 ? 0 : 0);
            const jpos = x0 + (jx - (p.x0 + (k > 0 ? gap : 0)));
            dsFragment(ctx, x0, jpos, y, { colorA: colA, colorB: colA, alpha, rungEvery: 8 });
            dsFragment(ctx, jpos, x1, y, { colorA: colB, colorB: colB, alpha, rungEvery: 8 });
            dot(ctx, jpos, y, 4.5, P.gold, alpha);
            // adapters + copies once on the bead
            if (lib > 0 && pull > 0.99) {
              ctx.save(); ctx.globalAlpha *= alpha * lib;
              ctx.fillStyle = P.p5; ctx.fillRect(x0 - 16, y - 4, 15, 8);
              ctx.fillStyle = P.p7; ctx.fillRect(x1 + 1, y - 4, 15, 8);
              ctx.restore();
              const ncopy = Math.floor(pcr * 3.99);
              for (let c = 1; c <= 3; c++) {
                const ca = alpha * prog(pcr, (c - 1) / 3, c / 3);
                const yy = y + 60 + c * 14;
                ctx.save(); ctx.globalAlpha *= ca; ctx.fillStyle = P.p5; ctx.fillRect(x0 - 16, yy - 3, 15, 6); ctx.fillStyle = P.p7; ctx.fillRect(x1 + 1, yy - 3, 15, 6); ctx.restore();
                dsFragment(ctx, x0, jpos, yy, { colorA: colA, colorB: colA, alpha: ca, rungs: false, gap: 4, lw: 2 });
                dsFragment(ctx, jpos, x1, yy, { colorA: colB, colorB: colB, alpha: ca, rungs: false, gap: 4, lw: 2 });
              }
            }
          }
        } else {
          dsFragment(ctx, x0, x1, y, { colorA: P.dna, colorB: P.dna, alpha, rungEvery: 8 });
          if (m.kind === 'dangling' && p.x1 === m.x1) dot(ctx, x1 + 2, y, 4.5, P.gold, alpha * (1 - chew));
        }
      });
    });

    // ── proteins and crosslinks on the junction molecule (dissolve) ──
    if (protA > 0) {
      blob(ctx, M[0].junction, M[0].y - 22, 13, P.enzyme, { seed: 3, alpha: protA, stroke: P.inkDim });
      line(ctx, M[0].junction - 6, M[0].y - 10, M[0].junction - 6, M[0].y - 4, P.gold, 3, protA);
      line(ctx, M[0].junction + 6, M[0].y - 10, M[0].junction + 6, M[0].y - 4, P.gold, 3, protA);
      blob(ctx, 400, M[1].y - 20, 10, P.enzyme, { seed: 4, alpha: protA });
      blob(ctx, 420, M[2].y - 18, 9, P.enzyme, { seed: 5, alpha: protA });
    }
    text(ctx, 'proteinase K + SDS, 65 °C overnight: proteins gone, crosslinks reversed', 335, 60, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 0.3, 2.5, 0.3) });
    // labels for molecules
    text(ctx, 'junction (A | B)', M[0].x0, M[0].y - 20, { size: 11, color: P.ink, alpha: win(t, 0.3, 5.2, 0.3) });
    text(ctx, 'dangling end: biotin but no junction', M[1].x0, M[1].y - 20, { size: 11, color: P.alert, alpha: win(t, 0.3, 5.2, 0.3) });
    text(ctx, 'unligated, no biotin', M[2].x0, M[2].y - 20, { size: 11, color: P.inkDim, alpha: win(t, 0.3, 5.2, 0.3) });

    // ── T4 polymerase chewing ──
    {
      const a = win(t, 2.6, 5.0, 0.3);
      if (a > 0) {
        const u = sp(t, 2.7, 3.2);
        const x = lerp(620, M[1].x1 + 10, u);
        blob(ctx, x, M[1].y - 2, 11, P.enzyme, { seed: 9, alpha: a, stroke: P.inkDim });
        text(ctx, 'T4 DNA polymerase: exonuclease removes the biotin from unligated ends', 335, 60, { size: 12, color: P.inkDim, align: 'center', alpha: a });
      }
    }
    // ── shearing ──
    {
      const a = win(t, 5.0, 7.6, 0.3);
      text(ctx, 'sonication: 300–500 bp pieces; only the junction piece still has a biotin', 335, 60, { size: 12, color: P.inkDim, align: 'center', alpha: a });
      PIECES.forEach((pcs, mi) => pcs.forEach((p, k) => { if (k === 0) return; const f = pulse(t, 5.2 + hash(k + mi, 11) * 0.5, 5.9 + hash(k + mi, 11) * 0.5); if (f > 0) dot(ctx, p.x0, M[mi].y, 4 + 7 * f, P.gold, f * 0.8); }));
    }
    // ── beads ──
    {
      const a = win(t, 7.5, 14, 0.4);
      if (a > 0) {
        BEADS.forEach((b, i) => bead(ctx, b.x, b.y, 24, P, a));
        text(ctx, 'streptavidin beads', 750, 390, { size: 11.5, color: P.inkDim, align: 'center', alpha: a });
        text(ctx, 'captured: a few % of the mass', 750, 410, { size: 11.5, color: P.gold, align: 'center', alpha: a * sp(t, 8.6, 9.2) });
        text(ctx, 'the rest is washed away', 335, 60, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 7.6, 10.0, 0.3) });
      }
    }
    // ── on-bead library ──
    {
      const a = win(t, 10.0, 12.2, 0.3);
      if (a > 0) {
        text(ctx, 'end repair · A-tail · adapters on the bead, then PCR off the bead (6–12 cycles)', 335, 60, { size: 12, color: P.inkDim, align: 'center', alpha: a });
        text(ctx, 'complexity = junction molecules captured, not reads', 160, 300, { size: 13, color: P.gold, weight: 600, alpha: a * sp(t, 11.2, 11.8) });
        text(ctx, 'sequencing beyond it returns duplicates', 160, 322, { size: 11.5, color: P.inkDim, alpha: a * sp(t, 11.4, 12.0) });
      }
    }
    ctx.restore();

    // ── final panel: insert vs distance ──
    {
      const a = win(t, 12.0, 14.5, 0.5);
      if (a > 0) {
        const y = 200, x0 = 380, x1 = 580, jm = 480;
        text(ctx, 'what the library molecule is', 480, 120, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.p5; ctx.fillRect(x0 - 22, y - 5, 20, 10); ctx.fillStyle = P.p7; ctx.fillRect(x1 + 2, y - 5, 20, 10); ctx.restore();
        dsFragment(ctx, x0, jm, y, { colorA: P.samples[1], colorB: P.samples[1], alpha: a, rungEvery: 8, lw: 2.6, gap: 7 });
        dsFragment(ctx, jm, x1, y, { colorA: P.samples[3], colorB: P.samples[3], alpha: a, rungEvery: 8, lw: 2.6, gap: 7 });
        dot(ctx, jm, y, 5, P.gold, a);
        line(ctx, x0, y - 22, x1, y - 22, P.inkDim, 1, a); line(ctx, x0, y - 27, x0, y - 17, P.inkDim, 1, a); line(ctx, x1, y - 27, x1, y - 17, P.inkDim, 1, a);
        text(ctx, 'insert ≈ 400 bp (the shear size)', 480, y - 36, { size: 11.5, color: P.inkDim, align: 'center', alpha: a });
        // genome line
        const gy = 330, GA = 200, GB = 760;
        line(ctx, 80, gy, 880, gy, P.inkFaint, 1.5, a);
        [[GA, P.samples[1], 'locus A'], [GB, P.samples[3], 'locus B']].forEach(([x, c, l]) => { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = c; ctx.fillRect(x - 14, gy - 5, 28, 10); ctx.restore(); text(ctx, l, x, gy + 18, { size: 11.5, color: c, align: 'center', alpha: a }); });
        const l = a * sp(t, 12.4, 13.0);
        line(ctx, x0 + 40, y + 8, GA, gy - 8, P.samples[1], 1, l, [3, 4]);
        line(ctx, x1 - 40, y + 8, GB, gy - 8, P.samples[3], 1, l, [3, 4]);
        text(ctx, '10 Mb', 480, gy + 18, { size: 11.5, color: P.inkDim, align: 'center', alpha: l });
        text(ctx, 'the two ends of one insert map megabases apart (or on different chromosomes)', 480, 400, { size: 13, color: P.ink, align: 'center', alpha: a * sp(t, 12.8, 13.4), weight: 600 });
        text(ctx, 'any insert-size filter built for ordinary paired-end data throws these pairs away', 480, 424, { size: 12, color: P.alert, align: 'center', alpha: a * sp(t, 13.1, 13.7) });
      }
    }
  },
};
