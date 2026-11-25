// Nuclease treatment and viral nucleic acid extraction: free nucleic acid is
// digested, capsids protect their genomes, capsids are then opened and the
// genomes captured. End: what the reads will contain.
import { prog, sp, win, pulse, lerp, hash, text, phage, blob, dsPath, ssStrand, tube, dot, roundRect, line, withAlpha } from '../draw.js';

const BX0 = 70, BX1 = 620, BY0 = 70, BY1 = 410;
const CAPS = [];
for (let i = 0; i < 8; i++) CAPS.push({ i, x: BX0 + 50 + (BX1 - BX0 - 100) * hash(i, 1), y: BY0 + 50 + (BY1 - BY0 - 100) * hash(i, 2), s: 9 + 3 * hash(i, 3), ang: hash(i, 4) * 6.28, kind: i === 2 ? 'rna' : i === 5 ? 'transducing' : 'dna' });
const FREE = [];
for (let i = 0; i < 7; i++) FREE.push({ i, x: BX0 + 40 + (BX1 - BX0 - 80) * hash(i, 11), y: BY0 + 40 + (BY1 - BY0 - 80) * hash(i, 12), len: 50 + 40 * hash(i, 13), rna: i >= 4, ang: (hash(i, 14) - 0.5) * 1.2, eat: 2.8 + 2.0 * hash(i, 15) });
const COL = { x: 760, y: 150, w: 70, h: 140 };

function wavy(x, y, len, ang, amp, ph) {
  const pts = []; const n = 14;
  for (let k = 0; k <= n; k++) { const u = k / n; const s = u * len; const off = Math.sin(u * 9 + ph) * amp; pts.push([x + Math.cos(ang) * s - Math.sin(ang) * off, y + Math.sin(ang) * s + Math.cos(ang) * off]); }
  return pts;
}

export default {
  id: 'nuclease-extraction',
  duration: 12,
  thumbT: 4.2,
  phases: [
    { t: 0, label: 'The filtrate', caption: 'The VLP filtrate holds intact capsids plus free DNA and RNA from lysed bacteria and host cells.' },
    { t: 2.5, label: 'Nucleases', caption: 'DNase and RNase digest everything that is not protected inside a capsid.' },
    { t: 5.5, label: 'Open the capsids', caption: 'Proteinase K and detergent release the protected genomes, which are captured on a low-input column.' },
    { t: 8.5, label: 'What you sequence', caption: 'Remaining bacterial reads were protected inside particles; RNA viruses are lost unless an RNA branch exists.' },
  ],
  draw(ctx, t, W, H, P) {
    const sceneA = 1 - 0.93 * sp(t, 8.5, 9.2);
    ctx.save(); ctx.globalAlpha = sceneA;
    const boxA = 1 - sp(t, 6.2, 7.2);   // the filtrate box fades once the genomes have moved to the column
    if (boxA > 0) {
      ctx.save(); ctx.globalAlpha *= boxA;
      ctx.fillStyle = withAlpha(P.liquid, 0.35); ctx.strokeStyle = P.grid; ctx.lineWidth = 1.5;
      roundRect(ctx, BX0, BY0, BX1 - BX0, BY1 - BY0, 12); ctx.fill(); ctx.stroke();
      text(ctx, 'VLP filtrate', BX0, BY0 - 14, { size: 12, color: P.inkDim });
      ctx.restore();
    }

    // free nucleic acids being eaten
    FREE.forEach(f => {
      const eaten = sp(t, f.eat, f.eat + 1.2);
      const len = f.len * (1 - eaten);
      if (len < 2) return;
      const jit = Math.sin(t * 1.5 + f.i) * 2;
      const pts = wavy(f.x, f.y + jit, len, f.ang, 4, f.i);
      if (f.rna) ssStrand(ctx, pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1], { color: P.rna, ticks: true, tickEvery: 7 });
      else dsPath(ctx, pts, { colorA: P.dna, colorB: P.dnaLight, gap: 5, lw: 1.8, rungEvery: 7 });
      // nuclease blob chewing at the receding end
      const na = win(t, 2.6, 5.4, 0.4);
      if (na > 0) {
        const ex = pts[pts.length - 1][0], ey = pts[pts.length - 1][1];
        blob(ctx, ex + 4, ey - 4, 9, P.enzyme, { seed: f.i + 3, alpha: na });
      }
    });
    text(ctx, 'free DNA', 100, BY1 - 20, { size: 11, color: P.dna, alpha: win(t, 0.4, 2.6, 0.3) });
    text(ctx, 'free RNA', 180, BY1 - 20, { size: 11, color: P.rna, alpha: win(t, 0.4, 2.6, 0.3) });
    text(ctx, 'capsids', 260, BY1 - 20, { size: 11, color: P.enzyme, alpha: win(t, 0.4, 2.6, 0.3) });
    text(ctx, 'DNase + RNase: unprotected nucleic acid is digested', (BX0 + BX1) / 2, BY1 + 16, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 2.6, 5.5, 0.4) });
    text(ctx, 'proteinase K + detergent (or guanidinium) open the capsids', (BX0 + BX1) / 2, BY1 + 16, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 5.6, 8.5, 0.4) });

    // capsids and released genomes
    CAPS.forEach(c => {
      const open = sp(t, 5.7 + hash(c.i, 21) * 0.8, 6.5 + hash(c.i, 21) * 0.8);
      const toCol = sp(t, 6.9 + hash(c.i, 22) * 0.8, 8.2 + hash(c.i, 22) * 0.8);
      const jit = Math.sin(t * 1.3 + c.i * 2) * 2;
      phage(ctx, c.x, c.y + jit, c.s, P, { angle: c.ang, alpha: 1 - open });
      // genome emerges and travels to the column
      if (open > 0) {
        const gx = lerp(c.x, COL.x + COL.w / 2 + (hash(c.i, 23) - 0.5) * 30, toCol);
        const gy = lerp(c.y + jit, COL.y + 40 + hash(c.i, 24) * 70, toCol);
        const len = 28 * open * (1 - 0.5 * toCol);
        const ang = (hash(c.i, 25) - 0.5) * 2;
        const pts = wavy(gx - Math.cos(ang) * len / 2, gy - Math.sin(ang) * len / 2, len, ang, 3, c.i);
        if (c.kind === 'rna') ssStrand(ctx, pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1], { color: P.rna, tickEvery: 6, alpha: open });
        else dsPath(ctx, pts, { colorA: c.kind === 'transducing' ? P.membrane : P.dna, colorB: c.kind === 'transducing' ? P.membrane : P.dnaLight, gap: 5, lw: 1.8, rungEvery: 6, alpha: open });
      }
      // labels for the two special capsids
      const la = win(t, 0.6, 5.6, 0.4);
      if (c.kind === 'rna') text(ctx, 'RNA virus', c.x, c.y + jit + c.s * 2.6 + 8, { size: 10.5, color: P.rna, align: 'center', alpha: la });
      if (c.kind === 'transducing') text(ctx, 'bacterial DNA, packaged', c.x, c.y + jit + c.s * 2.6 + 8, { size: 10.5, color: P.membrane, align: 'center', alpha: la });
    });

    // column
    const ca = win(t, 5.6, 14, 0.5);
    if (ca > 0) {
      ctx.save(); ctx.globalAlpha *= ca;
      tube(ctx, COL.x, COL.y, COL.w, COL.h, P, { level: 0.55, liquid: withAlpha(P.glass, 0.25) });
      text(ctx, 'low-input column / beads', COL.x + COL.w / 2, COL.y - 16, { size: 11.5, color: P.inkDim, align: 'center' });
      text(ctx, 'picograms to nanograms', COL.x + COL.w / 2, COL.y + COL.h + 30, { size: 10.5, color: P.inkFaint, align: 'center' });
      ctx.restore();
    }
    ctx.restore();

    // ---- what you sequence ----
    const ba = win(t, 8.7, 14, 0.5);
    if (ba > 0) {
      const rows = [
        { name: 'viral DNA (dsDNA + ssDNA phages)', v: 0.78, c: P.dna },
        { name: 'bacterial DNA, protected in particles', v: 0.16, c: P.membrane, note: 'partly biology, not only contamination' },
        { name: 'host DNA', v: 0.03, c: P.enzyme, note: 'high → nuclease failed or filter leaked' },
        { name: 'RNA viruses', v: 0.0, c: P.rna, lost: true, note: 'absent unless an RT / RNA branch was run' },
      ];
      const X = 130, BWmax = 520;
      text(ctx, 'read composition of a DNA virome library', X, 110, { size: 14, color: P.ink, weight: 600, alpha: ba });
      rows.forEach((r, k) => {
        const y = 160 + k * 70; const g = sp(t, 9.0 + k * 0.3, 10.0 + k * 0.3);
        text(ctx, r.name, X, y - 14, { size: 12, color: r.lost ? P.alert : P.ink, alpha: ba });
        ctx.save(); ctx.globalAlpha = ba;
        ctx.fillStyle = P.grid; ctx.fillRect(X, y, BWmax, 14);
        if (r.lost) { ctx.strokeStyle = P.alert; ctx.setLineDash([4, 3]); ctx.strokeRect(X + 0.5, y + 0.5, BWmax * 0.25 * g, 13); }
        else { ctx.fillStyle = r.c; ctx.fillRect(X, y, BWmax * r.v * g, 14); }
        ctx.restore();
        if (r.note) text(ctx, r.note, X + BWmax + 14, y + 7, { size: 11, color: r.lost ? P.alert : P.inkDim, alpha: ba * g, maxWidth: 180 });
      });
    }
  },
};
