// Chromatin immunoprecipitation: sheared chromatin in a tube, an antibody
// finds the target protein, protein A/G beads and a magnet collect the
// antibody-bound fragments, washes remove the rest (almost), elution and
// reverse crosslinking release a few nanograms of DNA. End: IP vs input.
import { prog, sp, win, pulse, lerp, hash, text, dsFragment, blob, bead, dot, line, arrow, roundRect, tube, curve, footnote, withAlpha } from '../draw.js';

const TUBE = { x: 110, y: 80, w: 330, h: 380 };
const MAG = { x: 452, y: 170, w: 26, h: 200 };
// beads: where they enter, and where the magnet holds them
const BEADS = [
  { ex: 250, ey: 150, mx: 405, my: 200 },
  { ex: 330, ey: 300, mx: 405, my: 272 },
  { ex: 260, ey: 400, mx: 405, my: 344 },
];
const BR = 20;
// fragments at rest inside the tube. kind: target | other | bare | spike | sticky
const F = [
  { x: 150, y: 170, len: 70, kind: 'target', bead: 0, slot: 0 },
  { x: 275, y: 215, len: 64, kind: 'other' },
  { x: 160, y: 250, len: 80, kind: 'bare' },
  { x: 300, y: 165, len: 56, kind: 'bare' },
  { x: 250, y: 290, len: 72, kind: 'target', bead: 1, slot: 0 },
  { x: 145, y: 330, len: 60, kind: 'other' },
  { x: 330, y: 350, len: 66, kind: 'sticky', bead: 2, slot: 1 },
  { x: 190, y: 395, len: 74, kind: 'target', bead: 2, slot: 0 },
  { x: 300, y: 410, len: 58, kind: 'other' },
  { x: 160, y: 205, len: 48, kind: 'bare' },
  { x: 245, y: 370, len: 54, kind: 'bare' },
  { x: 230, y: 130, len: 62, kind: 'spike', bead: 1, slot: 1 },
];

// Y-shaped antibody. (x, y) is the hinge; `ang` is the direction the arms point.
function antibody(ctx, x, y, ang, P, alpha = 1, s = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.strokeStyle = P.enzyme; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, 0); ctx.stroke();                 // stem (Fc)
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -7); ctx.moveTo(0, 0); ctx.lineTo(10, 7); ctx.stroke(); // arms (Fab)
  ctx.fillStyle = P.gold; ctx.beginPath(); ctx.arc(10, -7, 2.4, 0, Math.PI * 2); ctx.arc(10, 7, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// a protein sitting on the DNA at (x, y). target = gold rim
function protein(ctx, x, y, P, alpha, target, seed) {
  if (alpha <= 0) return;
  blob(ctx, x, y, 9, P.enzyme, { seed, alpha, stroke: target ? P.gold : undefined });
  if (target) { ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = P.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 10.5, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
}

export default {
  id: 'immunoprecipitation',
  duration: 15,
  thumbT: 8.6,
  phases: [
    { t: 0, label: 'Sheared chromatin', caption: 'Fragments of 200–700 bp, each still carrying whatever proteins were crosslinked to it. A few carry the target; most carry other proteins or nothing. A portion is set aside as the input.' },
    { t: 2.5, label: 'Antibody binds the target', caption: 'Overnight, the antibody finds its epitope wherever it is exposed. Its specificity is the experiment: a cross-reacting antibody binds other proteins just as happily.' },
    { t: 5, label: 'Protein A/G beads and a magnet', caption: 'Magnetic beads coated with protein A or G bind the antibody’s stem; a magnet pulls every bead, and everything attached to it, to the tube wall.' },
    { t: 7.5, label: 'Washes', caption: 'Buffers of increasing salt and detergent remove unbound chromatin. Not all of it: some fragments stick to beads or antibody regardless of the target, and that is the background.' },
    { t: 10, label: 'Elute and reverse crosslinks', caption: '65 °C for hours plus proteinase K undo the formaldehyde and digest the proteins. What remains is 1–10 ng of DNA, often less, which is why 10–18 PCR cycles follow.' },
    { t: 12, label: 'IP versus input', caption: 'The IP is enriched where the antibody bound; the input shows the shearing and sequence bias of the same genome. Peaks present in both are not binding.' },
  ],
  draw(ctx, t, W, H, P) {
    const ab = sp(t, 2.8, 4.2);                   // antibodies arrive and bind
    const beadIn = sp(t, 5.2, 5.9);               // beads enter the tube
    const toBead = sp(t, 5.8, 6.6);               // antibody-bound fragments go to beads
    const mag = sp(t, 6.6, 7.4);                  // magnet pulls beads to the wall
    const wash = sp(t, 7.9, 9.2);                 // unbound fragments leave
    const elu = sp(t, 10.3, 11.3);                // release and protein digestion
    const sceneA = 1 - sp(t, 12.0, 12.6);

    ctx.save(); ctx.globalAlpha *= sceneA;

    // ── the tube and the magnet ──
    tube(ctx, TUBE.x, TUBE.y, TUBE.w, TUBE.h, P, { level: 0.9, liquid: withAlpha(P.liquid, 0.55) });
    {
      const a = win(t, 6.3, 11.8, 0.3);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.enzyme; roundRect(ctx, MAG.x, MAG.y, MAG.w, MAG.h, 4); ctx.fill();
        ctx.fillStyle = P.alert; ctx.fillRect(MAG.x, MAG.y, MAG.w, 26); ctx.fillStyle = P.dna; ctx.fillRect(MAG.x, MAG.y + MAG.h - 26, MAG.w, 26); ctx.restore();
        text(ctx, 'magnet', MAG.x + MAG.w / 2, MAG.y + MAG.h + 16, { size: 11.5, color: P.inkDim, align: 'center', alpha: a });
      }
    }
    // input aliquot: a small arrow out of the tube at the start
    {
      const a = win(t, 0.6, 2.6, 0.3);
      if (a > 0) {
        arrow(ctx, TUBE.x + TUBE.w - 30, 120, TUBE.x + TUBE.w + 50, 120, P.inkDim, { alpha: a, lw: 1.5 });
        text(ctx, '1–10 % set aside: the input', TUBE.x + TUBE.w + 58, 120, { size: 12, color: P.inkDim, alpha: a });
      }
    }

    // ── beads ──
    const beadPos = BEADS.map(b => ({ x: lerp(lerp(b.ex, b.ex, 1), b.mx, mag), y: lerp(b.ey, b.my, mag) }));
    if (beadIn > 0) {
      BEADS.forEach((b, i) => {
        const y0 = TUBE.y - 30;
        const x = beadPos[i].x, y = lerp(y0, beadPos[i].y, beadIn) + (mag > 0 ? 0 : 0);
        bead(ctx, x, mag > 0 ? beadPos[i].y : y, BR, P, Math.min(1, beadIn * 1.5) * (1 - sp(t, 11.2, 11.8) * 0.8));
      });
    }

    // ── fragments ──
    F.forEach((f, i) => {
      const drift = f.bead !== undefined && toBead > 0 ? 0 : 1;
      let x = f.x + 4 * Math.sin(t * 0.8 + i) * drift, y = f.y + 3 * Math.cos(t * 0.6 + i * 1.3) * drift;
      let alpha = 1;
      const isBound = f.kind === 'target' || f.kind === 'spike';   // antibody-bound
      const col = f.kind === 'spike' ? P.samples[4] : P.dna;
      // bound (and the sticky one) travel to a bead, then to the wall with it
      if (f.bead !== undefined) {
        const b = beadPos[f.bead];
        const slotDy = f.slot === 0 ? -6 : 22;
        const tx = b.x - BR - 44 - f.len / 2, ty = b.y + slotDy;
        const u = f.kind === 'sticky' ? sp(t, 6.2, 6.9) : toBead;
        x = lerp(x, tx, u); y = lerp(y, ty, u);
        // elution: leave the bead for a resting spot in the liquid
        const rx = 150 + (i % 3) * 85 + 20, ry = 190 + Math.floor(i / 3) * 60 + (f.slot || 0) * 10;
        x = lerp(x, rx, elu); y = lerp(y, ry, elu);
      } else {
        alpha = 1 - wash;
        y += 110 * wash;
      }
      if (alpha <= 0) return;
      const x0 = x - f.len / 2, x1 = x + f.len / 2;
      const lineCol = f.kind === 'sticky' && wash > 0.6 ? P.alert : col;
      dsFragment(ctx, x0, x1, y, { colorA: lineCol, colorB: lineCol, alpha, rungEvery: 8 });
      // proteins on the fragment (digested at elution)
      const pa = alpha * (1 - elu);
      if (f.kind === 'target' || f.kind === 'spike') {
        protein(ctx, x, y - 11, P, pa, true, i + 3);
        // antibody: arms down onto the protein while free; arms left, stem into the bead once captured
        if (ab > 0) {
          const free = 1 - toBead;
          const ax = lerp(x, x + 28, toBead), ay = lerp(y - 40 + 8 * ab, y - 11, toBead);
          const start = [x + 60 * (hash(i, 5) - 0.5), TUBE.y - 20];
          const hx = lerp(start[0], ax, ab), hy = lerp(start[1], ay, ab);
          antibody(ctx, hx, hy, lerp(Math.PI / 2, Math.PI, toBead), P, pa);
          void free;
        }
      } else if (f.kind === 'other') {
        protein(ctx, x + 6, y - 11, P, pa, false, i + 9);
      } else if (f.kind === 'sticky') {
        protein(ctx, x - 8, y - 11, P, pa, false, i + 9);
      }
      if (f.kind === 'spike') text(ctx, 'spike-in (Drosophila)', x0, y + 20, { size: 11, color: P.samples[4], alpha: alpha * win(t, 0.4, 7.4, 0.3) });
    });

    // ── the non-specific survivor ──
    {
      const a = win(t, 8.8, 11.6, 0.3) * sceneA;
      if (a > 0) {
        const b = beadPos[2];
        const sx = b.x - BR - 44, sy = b.y + 22;
        text(ctx, 'stuck without the target:', 520, 300, { size: 12.5, color: P.alert, weight: 600, alpha: a });
        text(ctx, 'survives the washes, becomes background', 520, 318, { size: 12, color: P.alert, alpha: a });
        line(ctx, 516, 306, sx + 36, sy + 6, P.alert, 1, a * (1 - elu), [3, 4]);
      }
    }

    // ── side notes per phase (right of the tube) ──
    const NX = 520;
    const note = (s0, s1, lines, color = P.inkDim) => {
      const a = win(t, s0, s1, 0.3);
      if (a <= 0) return;
      lines.forEach((l, k) => text(ctx, l, NX, 170 + k * 20, { size: 13, color: k === 0 ? P.ink : color, weight: k === 0 ? 600 : 400, alpha: a }));
    };
    // legend during the first phases
    {
      const a = win(t, 0.3, 5.0, 0.3);
      if (a > 0) {
        protein(ctx, NX + 8, 212, P, a, true, 3); text(ctx, 'target protein or histone mark', NX + 26, 212, { size: 12.5, color: P.inkDim, alpha: a });
        protein(ctx, NX + 8, 240, P, a, false, 9); text(ctx, 'any other crosslinked protein', NX + 26, 240, { size: 12.5, color: P.inkDim, alpha: a });
        antibody(ctx, NX + 14, 268, Math.PI / 2, P, a * sp(t, 2.6, 3.0)); text(ctx, 'antibody (one lot, one epitope)', NX + 26, 268, { size: 12.5, color: P.inkDim, alpha: a * sp(t, 2.6, 3.0) });
        dsFragment(ctx, NX, NX + 18, 296, { colorA: P.samples[4], colorB: P.samples[4], alpha: a, rungEvery: 6 }); text(ctx, 'spike-in chromatin, fixed amount per sample', NX + 26, 296, { size: 12.5, color: P.inkDim, alpha: a });
      }
    }
    note(0.3, 2.5, ['Sheared chromatin', '200–700 bp, proteins still attached']);
    note(2.6, 5.0, ['The antibody decides', 'what the experiment measures']);
    note(5.1, 7.6, ['Protein A/G beads bind the Fc stem', 'the magnet collects the beads']);
    note(7.7, 10.0, ['Washes: salt and detergent', 'unbound chromatin leaves']);
    {
      const a = win(t, 10.1, 12.0, 0.3);
      if (a > 0) {
        text(ctx, 'Elute · 65 °C reverse crosslinks · proteinase K', NX, 170, { size: 13, color: P.ink, weight: 600, alpha: a });
        text(ctx, 'proteins and antibody digested, DNA purified', NX, 190, { size: 12.5, color: P.inkDim, alpha: a });
        text(ctx, '≈ 1–10 ng of DNA', NX, 232, { size: 16, color: P.gold, weight: 600, alpha: a * sp(t, 10.8, 11.3) });
        text(ctx, 'often less for a transcription factor', NX, 254, { size: 12.5, color: P.inkDim, alpha: a * sp(t, 10.8, 11.3) });
        text(ctx, '→ 10–18 PCR cycles, low complexity', NX, 274, { size: 12.5, color: P.alert, alpha: a * sp(t, 11.1, 11.6) });
      }
    }
    ctx.restore();

    // ── final panel: IP versus input ──
    {
      const a = win(t, 12.0, 15.6, 0.5);
      if (a > 0) {
        const X = 110, Wd = 740;
        text(ctx, 'Coverage at the same locus', 480, 92, { size: 15, color: P.ink, weight: 600, align: 'center', alpha: a });
        const peak = (u, c, w) => Math.exp(-((u - c) * (u - c)) / (2 * w * w));
        const noise = (u, s) => hash(Math.floor(u * 74), s);
        const peaks = u => peak(u, 0.52, 0.012) + 0.55 * peak(u, 0.21, 0.014) + 0.7 * peak(u, 0.8, 0.013);
        const grow = sp(t, 12.3, 13.1);
        // IP track
        const y1 = 150, h1 = 110;
        curve(ctx, X, y1, Wd, h1, u => 0.08 + 0.07 * noise(u, 1) + 0.85 * peaks(u) * grow, P.dna, { fill: true, alpha: a, n: 240 });
        text(ctx, 'IP', X - 40, y1 + h1 - 8, { size: 14, color: P.ink, weight: 600, alpha: a });
        text(ctx, 'reads pile up where the antibody bound', X + Wd * 0.52 + 14, y1 + 14, { size: 12, color: P.gold, alpha: a * grow });
        dot(ctx, X + Wd * 0.52, y1 + 4, 4, P.gold, a * grow);
        // input track
        const y2 = 300, h2 = 70;
        curve(ctx, X, y2, Wd, h2, u => 0.28 + 0.14 * noise(u, 2) + 0.22 * peak(u, 0.52, 0.03) * grow, P.enzyme, { fill: true, alpha: a, n: 240 });
        text(ctx, 'input', X - 48, y2 + h2 - 8, { size: 14, color: P.ink, weight: 600, alpha: a });
        text(ctx, 'open chromatin shears more: a bump here is not binding', X + Wd * 0.52 + 14, y2 + 8, { size: 12, color: P.inkDim, alpha: a * sp(t, 13.0, 13.6) });
        line(ctx, X, y2 + h2 + 0.5, X + Wd, y2 + h2 + 0.5, P.inkFaint, 1, a);
        // takeaways
        const b = a * sp(t, 13.3, 13.9);
        text(ctx, 'FRiP: the fraction of reads inside peaks. ENCODE expects > 1 % for a TF; good ChIPs reach 5–30 %.', 480, 420, { size: 12.5, color: P.ink, align: 'center', alpha: b });
        text(ctx, 'A failed or wrong antibody still produces a library and a peak list.', 480, 444, { size: 12.5, color: P.alert, align: 'center', alpha: a * sp(t, 13.7, 14.3) });
        footnote(ctx, 'peaks also present in input or IgG are not binding', W, H, P, a * sp(t, 14.0, 14.6));
      }
    }
  },
};
