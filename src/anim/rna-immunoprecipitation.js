// eCLIP: UV crosslinks a protein to the RNA it touches, RNase I trims the RNA
// to the protected footprint, the antibody pulls the complex onto beads, a gel
// and membrane keep only the protein-sized band and above, proteinase K leaves
// an amino-acid remnant at the site. RIP-seq by contrast: no UV, whole
// transcripts, abundant RNAs dominate.
import { prog, sp, win, pulse, lerp, hash, text, line, arrow, blob, bead, dot, roundRect, ssStrand, tube, cellShape, panelTitle, footnote, withAlpha } from '../draw.js';

const CELL = { x: 275, y: 285, r: 145 };
// RNA 1: horizontal, protein A sits on it; footprint is the piece under the protein
const R1 = { y: 268, pieces: [[150, 210], [210, 262], [262, 298], [298, 350], [350, 395]], foot: 2, protX: 280 };
// RNA 2: no protein on it
const R2 = { y: 350, pieces: [[160, 215], [215, 270], [270, 325], [325, 385]] };
const PROT_B = { x: 330, y: 195 };
const BEAD = { x: 560, y: 268, r: 30 };
const AB = { x: 615, y: 212 };              // antibody tip where the complex docks
const LANE = { x: 768, y: 104, w: 112, h: 330 };
const KDA = [[250, 0.07], [150, 0.25], [100, 0.43], [75, 0.56], [50, 0.72], [37, 0.87]];
const BAND_Y = LANE.y + LANE.h * 0.72;      // protein at ~50 kDa
const CUT_Y = LANE.y + LANE.h * 0.5;        // +75 kDa above it

function rna(ctx, x0, x1, y, P, o = {}) {
  const { alpha = 1, color = P.rna, lw = 2.4, wave = 4 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 3) { const yy = y + Math.sin(x * 0.18) * wave; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
  ctx.stroke(); ctx.restore();
}
// antibody: a Y shape pointing to (x, y) from the bead
function antibody(ctx, x, y, P, alpha) {
  if (alpha <= 0) return;
  const c = P.enzyme;
  line(ctx, BEAD.x + 18, BEAD.y - 22, x - 8, y + 12, c, 3, alpha);
  line(ctx, x - 8, y + 12, x - 18, y - 2, c, 3, alpha);
  line(ctx, x - 8, y + 12, x + 6, y, c, 3, alpha);
}
// the protein + footprint complex, drawn at (x, y) with the protein centred
function complex(ctx, x, y, P, o = {}) {
  const { alpha = 1, prot = 1, footLen = 36, remnant = 0 } = o;
  if (alpha <= 0) return;
  rna(ctx, x - footLen / 2, x + footLen / 2, y, P, { alpha, color: P.gold, lw: 3 });
  blob(ctx, x, y - 16, 15, P.enzyme, { seed: 7, alpha: alpha * prot, stroke: P.inkDim });
  line(ctx, x, y - 6, x, y - 1, P.gold, 3, alpha * prot);
  if (remnant > 0) dot(ctx, x, y, 4, P.gold, alpha * remnant);
}

export default {
  id: 'rna-immunoprecipitation',
  duration: 16,
  thumbT: 7.4,
  phases: [
    { t: 0, label: 'UV crosslink', caption: '254 nm UV on ice forms a covalent bond only where an amino acid touches a base. A protein that is not on RNA gets nothing; efficiency is a few per cent, so tens of millions of cells go in.' },
    { t: 2.8, label: 'Lysis and RNase I', caption: 'The lysate is partially digested. Only the footprint under the protein is protected; the dose is titrated so fragments stay mappable (20–60 nt) but short enough to give resolution.' },
    { t: 5.6, label: 'Antibody, beads, harsh washes', caption: 'The antibody on protein A/G beads pulls down the complex. High salt and detergent strip everything the crosslink does not hold. A size-matched input is kept in parallel.' },
    { t: 8.4, label: 'Gel and membrane', caption: 'Complexes run on SDS-PAGE and transfer to nitrocellulose. The strip from the protein’s size up to ~75 kDa above it is cut out; free RNA and other proteins’ RNA are left behind.' },
    { t: 11.2, label: 'Proteinase K', caption: 'The protein is digested away. A short amino-acid remnant stays at the crosslink site on the RNA; it will stop reverse transcription exactly there.' },
    { t: 13.6, label: 'RIP-seq, by contrast', caption: 'No UV, mild washes, whole transcripts come down. Without a stringent control the “targets” are the abundant RNAs of the cell: rRNA, snRNA, the top few hundred mRNAs.' },
  ],
  draw(ctx, t, W, H, P) {
    const uv = win(t, 0.2, 2.9, 0.3);
    const xl = sp(t, 1.2, 1.8);                  // crosslink forms
    const lyse = sp(t, 2.9, 3.6);                // membrane fades
    const trim = sp(t, 3.3, 4.6);                // RNase trims
    const move = sp(t, 5.9, 7.0);                // complex to antibody
    const wash = sp(t, 7.0, 7.8);                // free fragments gone
    const gel = sp(t, 8.6, 9.8);
    const pk = sp(t, 11.4, 12.3);
    const ripA = sp(t, 13.6, 14.3);
    const sceneA = 1 - ripA * 0.0;               // right half stays

    panelTitle(ctx, 'eCLIP: crosslink, digest, pull down', W, P, 1 - ripA);
    panelTitle(ctx, 'eCLIP vs RIP-seq', W, P, ripA);

    // ── cell ──
    const cellA = (1 - lyse) * (1 - ripA);
    cellShape(ctx, CELL.x, CELL.y, CELL.r, P, { alpha: cellA });
    text(ctx, 'cell', CELL.x - CELL.r + 14, CELL.y - CELL.r + 18, { size: 11, color: P.inkDim, alpha: cellA });

    // ── UV rays ──
    if (uv > 0) {
      for (let i = 0; i < 9; i++) {
        const x = CELL.x - 120 + i * 30;
        const flick = 0.55 + 0.45 * Math.sin(t * 18 + i * 1.7);
        line(ctx, x, 62, x + 6, CELL.y - CELL.r - 6, P.gold, 1.6, uv * flick, [6, 5]);
      }
      text(ctx, '254 nm UV, on ice', CELL.x, 52, { size: 12, color: P.gold, align: 'center', weight: 600, alpha: uv });
    }

    // ── RNAs inside the cell → fragments ──
    const leftA = 1 - ripA;
    // RNA 1 pieces
    R1.pieces.forEach(([a, b], k) => {
      if (k === R1.foot) return;                 // footprint drawn with the complex
      const dy = (hash(k, 4) - 0.5) * 50 * trim, dx = (hash(k, 9) - 0.5) * 40 * trim;
      const al = leftA * (1 - trim * 0.75) * (1 - wash);
      const shrink = 8 * trim;
      rna(ctx, a + dx + (k > 0 ? shrink : 0), b + dx - (k < 4 ? shrink : 0), R1.y + dy, P, { alpha: al });
    });
    // RNA 2 pieces: all free
    R2.pieces.forEach(([a, b], k) => {
      const dy = (hash(k, 14) - 0.5) * 60 * trim, dx = (hash(k, 19) - 0.5) * 50 * trim;
      const al = leftA * (1 - trim * 0.7) * (1 - wash);
      const shrink = 8 * trim;
      rna(ctx, a + dx + shrink, b + dx - shrink, R2.y + dy, P, { alpha: al });
    });
    // RNase I enzymes nibbling
    {
      const a = win(t, 3.0, 5.4, 0.3) * leftA;
      if (a > 0) {
        [[215, 252], [330, 280], [240, 362], [352, 336]].forEach(([x, y], i) => {
          const p = pulse(t, 3.2 + i * 0.25, 4.8 + i * 0.25);
          blob(ctx, x, y + Math.sin(t * 9 + i) * 3, 7, P.enzyme, { seed: 20 + i, alpha: a * (0.5 + 0.5 * p) });
        });
        text(ctx, 'RNase I (titrated)', CELL.x, CELL.y + CELL.r + 18, { size: 12, color: P.inkDim, align: 'center', alpha: a });
        text(ctx, 'lysis: everything not under a protein is trimmed away', 480, 60, { size: 12, color: P.inkDim, align: 'center', alpha: a });
      }
    }
    // protein B: never on RNA
    {
      const a = leftA * (1 - lyse) + leftA * lyse * (1 - wash);
      const y = PROT_B.y + 30 * lyse;
      blob(ctx, PROT_B.x, y, 13, P.enzyme, { seed: 11, alpha: a, stroke: P.inkDim });
      text(ctx, 'no RNA → no bond', PROT_B.x + 22, y, { size: 11, color: P.inkDim, alpha: a * uv });
    }
    // protein A + footprint: in the cell, then moving to the antibody
    {
      const cx = lerp(R1.protX, AB.x, move), cy = lerp(R1.y, AB.y, move);
      const protAlive = 1 - pk;
      complex(ctx, cx, cy, P, { alpha: 1, prot: protAlive, footLen: lerp(36, 36, 0), remnant: pk });
      // before crosslink: the tick appears
      if (xl < 1) line(ctx, cx, cy - 6, cx, cy - 1, P.bg, 4, 1 - xl);
      text(ctx, 'RBP on RNA → covalent bond', R1.protX + 24, R1.y - 30, { size: 11, color: P.gold, weight: 600, alpha: uv * xl * (1 - lyse) });
      text(ctx, 'protected footprint', R1.protX, R1.y + 22, { size: 11, color: P.gold, align: 'center', alpha: win(t, 3.6, 5.8, 0.3) * (1 - move) });
    }

    // ── bead, antibody, SMInput tube ──
    {
      const a = win(t, 5.6, 16, 0.4);
      if (a > 0) {
        bead(ctx, BEAD.x, BEAD.y, BEAD.r, P, a);
        antibody(ctx, AB.x, AB.y, P, a);
        text(ctx, 'protein A/G bead', BEAD.x, BEAD.y + BEAD.r + 16, { size: 11, color: P.inkDim, align: 'center', alpha: a });
        text(ctx, 'antibody', AB.x + 14, AB.y + 26, { size: 11, color: P.inkDim, alpha: a });
        const wa = win(t, 6.9, 8.6, 0.3);
        text(ctx, 'high salt + detergent: free RNA and other proteins wash off', 480, 60, { size: 12, color: P.inkDim, align: 'center', alpha: wa });
        // SMInput
        const ta = a * sp(t, 6.2, 6.8);
        tube(ctx, 418, 330, 40, 96, P, { alpha: ta, level: 0.55 });
        [[426, 390], [434, 404], [442, 384]].forEach(([x, y], i) => rna(ctx, x, x + 14, y, P, { alpha: ta, lw: 1.6, wave: 2 }));
        text(ctx, 'SMInput', 438, 445, { size: 11, color: P.ink, align: 'center', weight: 600, alpha: ta });
        text(ctx, 'same lysate, no IP', 438, 460, { size: 10.5, color: P.inkDim, align: 'center', alpha: ta });
      }
    }

    // ── membrane lane ──
    {
      const a = win(t, 8.4, 16, 0.4);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha *= a;
        ctx.fillStyle = P.panel; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1;
        roundRect(ctx, LANE.x, LANE.y, LANE.w, LANE.h, 4); ctx.fill(); ctx.stroke();
        ctx.restore();
        text(ctx, 'membrane', LANE.x + LANE.w / 2, LANE.y - 12, { size: 12, color: P.inkDim, align: 'center', alpha: a });
        KDA.forEach(([k, f]) => { const y = LANE.y + LANE.h * f; line(ctx, LANE.x - 8, y, LANE.x, y, P.inkFaint, 1, a); text(ctx, k, LANE.x - 12, y, { size: 10, color: P.inkFaint, align: 'right', alpha: a }); });
        text(ctx, 'kDa', LANE.x - 12, LANE.y - 6, { size: 10, color: P.inkFaint, align: 'right', alpha: a });
        // smear above the band (RNA adds mass) + protein band
        if (gel > 0) {
          ctx.save(); ctx.globalAlpha *= a * gel;
          const g = ctx.createLinearGradient(0, CUT_Y, 0, BAND_Y);
          g.addColorStop(0, withAlpha(P.rna, 0)); g.addColorStop(1, withAlpha(P.rna, 0.75));
          ctx.fillStyle = g; ctx.fillRect(LANE.x + 14, CUT_Y, LANE.w - 28, BAND_Y - CUT_Y);
          ctx.fillStyle = P.enzyme; ctx.fillRect(LANE.x + 12, BAND_Y - 4, LANE.w - 24, 8);
          ctx.restore();
          text(ctx, 'protein ± RNA', LANE.x + LANE.w / 2, BAND_Y + 18, { size: 10.5, color: P.inkDim, align: 'center', alpha: a * gel });
          // cut box
          const ca = a * sp(t, 9.6, 10.3);
          ctx.save(); ctx.globalAlpha *= ca; ctx.strokeStyle = P.gold; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
          ctx.strokeRect(LANE.x + 6, CUT_Y - 6, LANE.w - 12, BAND_Y - CUT_Y + 14); ctx.restore();
          text(ctx, 'cut: size → +75 kDa', LANE.x + LANE.w / 2, CUT_Y - 16, { size: 11, color: P.gold, align: 'center', weight: 600, alpha: ca });
          text(ctx, 'free RNA runs off', LANE.x + LANE.w / 2, LANE.y + LANE.h - 14, { size: 10.5, color: P.alert, align: 'center', alpha: ca });
        }
        arrow(ctx, AB.x + 40, AB.y + 40, LANE.x - 14, BAND_Y - 40, P.inkDim, { alpha: a * win(t, 8.4, 9.6, 0.3), dash: [4, 4] });
      }
    }

    // ── proteinase K: magnified fragment with remnant ──
    {
      const a = win(t, 11.2, 16, 0.4);
      if (a > 0) {
        text(ctx, 'proteinase K', AB.x, 60, { size: 12, color: P.inkDim, align: 'center', alpha: a * (1 - ripA) });
        const fx = 600, fy = 430;
        const g = a * pk;
        rna(ctx, fx - 70, fx + 70, fy, P, { alpha: g, lw: 3, wave: 3 });
        dot(ctx, fx, fy, 5, P.gold, g);
        text(ctx, 'amino-acid remnant', fx, fy - 20, { size: 11.5, color: P.gold, align: 'center', weight: 600, alpha: g });
        text(ctx, '20–60 nt RNA fragment', fx, fy + 22, { size: 11, color: P.inkDim, align: 'center', alpha: g });
        arrow(ctx, fx + 68, fy + 40, fx + 8, fy + 8, P.dna, { alpha: g * sp(t, 12.4, 13.0) });
        text(ctx, 'RT stops here', fx + 76, fy + 44, { size: 11, color: P.dna, alpha: g * sp(t, 12.4, 13.0) });
      }
    }

    // ── RIP-seq comparison (left half, final phase) ──
    if (ripA > 0) {
      const a = ripA;
      const bx = 200, by = 300;
      text(ctx, 'RIP-seq: no UV, mild washes', 240, 96, { size: 13, color: P.ink, align: 'center', weight: 600, alpha: a });
      bead(ctx, bx, by, 30, P, a);
      line(ctx, bx + 18, by - 22, bx + 48, by - 50, P.enzyme, 3, a);
      line(ctx, bx + 48, by - 50, bx + 40, by - 64, P.enzyme, 3, a);
      line(ctx, bx + 48, by - 50, bx + 62, by - 60, P.enzyme, 3, a);
      blob(ctx, bx + 58, by - 76, 14, P.enzyme, { seed: 31, alpha: a, stroke: P.inkDim });
      // whole transcripts hanging around, rRNA thick and dominant
      const g = sp(t, 14.0, 15.0);
      rna(ctx, bx + 40, bx + 190, by - 92, P, { alpha: a * g, lw: 2.2 });
      rna(ctx, bx - 60, bx + 110, by - 40 + 0, P, { alpha: a * g, lw: 2.2 });
      rna(ctx, bx - 110, bx + 90, by + 52, P, { alpha: a * g, color: P.rrna, lw: 5, wave: 5 });
      rna(ctx, bx + 10, bx + 210, by + 84, P, { alpha: a * g, color: P.rrna, lw: 5, wave: 5 });
      rna(ctx, bx - 90, bx + 60, by + 118, P, { alpha: a * g, color: P.rrna, lw: 4, wave: 4 });
      text(ctx, 'rRNA', bx + 74, by + 118, { size: 11, color: P.rrna, weight: 600, alpha: a * g });
      text(ctx, 'mRNA', bx + 200, by - 92, { size: 11, color: P.rna, alpha: a * g });
      text(ctx, 'whole transcripts; abundant RNAs dominate', 240, by + 150, { size: 12, color: P.alert, align: 'center', weight: 600, alpha: a * g });
      text(ctx, 'which transcripts, not where on them', 240, by + 168, { size: 11, color: P.inkDim, align: 'center', alpha: a * g });
    }

    footnote(ctx, 'the remnant stops reverse transcription: read starts mark the site', W, H, P, win(t, 12.2, 16, 0.4));
  },
};
