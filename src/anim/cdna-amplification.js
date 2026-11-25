// Emulsion breaking and cDNA amplification: barcoded cDNA from every droplet
// is pooled into one tube (the tag travels with the molecule), PCR-amplified
// (copies share barcode + UMI; errors and chimeras appear), cleaned, traced.
import { sp, win, pulse, lerp, hash, text, callout, dot, line, arrow, roundRect, curve, tube, bead, withAlpha } from '../draw.js';

// droplets: 3 x 2 grid, each with a cell colour and 3 barcoded cDNA molecules
const DROPS = [];
for (let d = 0; d < 6; d++) {
  const cx = 150 + (d % 3) * 150, cy = 150 + Math.floor(d / 3) * 150;
  const mols = [];
  for (let m = 0; m < 3; m++) {
    const i = d * 3 + m;
    mols.push({
      i, k: d, len: 34 + 16 * hash(i, 1), umi: 0.2 + 0.6 * hash(i, 2),
      ox: cx - 28 + (hash(i, 3) - 0.5) * 24, oy: cy - 22 + m * 20 + (hash(i, 4) - 0.5) * 6,
      px: 150 + 330 * hash(i, 5), py: 120 + 190 * hash(i, 6),                 // pooled position
      moveT: 3.0 + 1.0 * hash(i, 7),
    });
  }
  DROPS.push({ d, cx, cy, mols });
}
const PCR = { x: 620, w: 70, rows: [{ k: 0, y: 118 }, { k: 2, y: 236 }, { k: 4, y: 354 }], cyc: [5.4, 6.5, 7.6] };

function molecule(ctx, x, y, len, col, umi, P, alpha = 1, o = {}) {
  if (alpha <= 0) return;
  const { err = false, chimeraCol = null, lw = 2.2 } = o;
  ctx.save(); ctx.globalAlpha *= alpha;
  // body = cDNA
  ctx.strokeStyle = P.dna; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + 10 + len, y); ctx.stroke();
  // barcode block
  ctx.fillStyle = chimeraCol || col; ctx.fillRect(x, y - 3.5, 10, 7);
  if (chimeraCol) { ctx.strokeStyle = P.alert; ctx.lineWidth = 1.5; ctx.strokeRect(x - 1, y - 4.5, 12, 9); }
  // UMI tick: its position along the block edge identifies the molecule
  ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 1 + umi * 8, y - 6.5); ctx.lineTo(x + 1 + umi * 8, y - 3.5); ctx.stroke();
  if (err) dot(ctx, x + 5, y, 2.6, P.alert, 1);
  ctx.restore();
}

function wrap(ctx, str, x, y, maxW, o) {
  const words = str.split(' '); let lineStr = ''; let yy = y;
  ctx.save(); ctx.font = `${o.weight || 400} ${o.size}px ui-sans-serif, system-ui, sans-serif`;
  for (const w of words) {
    const test = lineStr ? lineStr + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && lineStr) { text(ctx, lineStr, x, yy, o); lineStr = w; yy += o.size * 1.35; }
    else lineStr = test;
  }
  if (lineStr) text(ctx, lineStr, x, yy, o);
  ctx.restore();
  return yy + o.size * 1.35;
}

export default {
  id: 'cdna-amplification',
  duration: 13.5,
  thumbT: 7.4,
  phases: [
    { t: 0, label: 'Inside the droplets', caption: 'Each droplet holds one cell’s cDNA, every molecule stamped with that droplet’s cell barcode and its own UMI.' },
    { t: 2.5, label: 'Break the emulsion', caption: 'Recovery Agent dissolves the droplets. All cells’ cDNA mixes in one tube, but the tags travel with the molecules.' },
    { t: 5.0, label: 'cDNA PCR', caption: '10–14 cycles copy every molecule thousands of times. Copies share barcode and UMI; a few acquire errors or the wrong tag.' },
    { t: 8.5, label: 'Cleanup and trace', caption: 'Bead cleanup removes primers; a Bioanalyzer trace should show a broad hump at 1–2 kb and no sharp low peak.' },
    { t: 11.0, label: 'In your data', caption: 'Reads are counted per barcode + UMI, near-miss barcodes are corrected, and saturation says whether depth or capture limits you.' },
  ],
  draw(ctx, t, W, H, P) {
    // ---- scene A: droplets -> pool (left) ----
    const poolA = 1 - sp(t, 8.3, 9.0);
    if (poolA > 0) {
      ctx.save(); ctx.globalAlpha *= poolA;
      const dissolve = sp(t, 2.8, 3.9);
      text(ctx, 'GEMs: each droplet’s cDNA carries that droplet’s cell barcode', 300, 62, { size: 12.5, color: P.inkDim, align: 'center', alpha: win(t, 0.3, 2.6, 0.4) });
      text(ctx, 'Recovery Agent + bead cleanup: one pool, tags stay on the molecules', 300, 62, { size: 12.5, color: P.inkDim, align: 'center', alpha: win(t, 2.6, 8.3, 0.4) });
      DROPS.forEach(dr => {
        const da = 1 - dissolve;
        if (da > 0) {
          ctx.save(); ctx.globalAlpha *= da;
          ctx.fillStyle = withAlpha(P.liquid, 0.5); ctx.strokeStyle = P.glass; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(dr.cx, dr.cy, 56 * (1 + 0.15 * dissolve), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.restore();
          // dissolved gel bead remnant + cell debris
          dot(ctx, dr.cx + 30, dr.cy + 28, 5, withAlpha(P.bead, 0.5), da);
        }
        dr.mols.forEach(m => {
          const mv = sp(t, m.moveT, m.moveT + 1.3);
          const x = lerp(m.ox, m.px, mv), y = lerp(m.oy, m.py, mv) + Math.sin(t * 1.6 + m.i) * 1.2 * mv;
          molecule(ctx, x, y, m.len, P.samples[m.k], m.umi, P);
        });
      });
      // legend for the molecule anatomy
      {
        const a = win(t, 0.6, 2.7, 0.4);
        molecule(ctx, 600, 150, 120, P.samples[0], 0.5, P, a, { lw: 3 });
        callout(ctx, 'cell barcode (16 bp)', 600, 118, P, { alpha: a, size: 11.5, color: P.samples[0], to: [605, 146] });
        callout(ctx, 'UMI (12 bp): different on every molecule', 640, 184, P, { alpha: a, size: 11.5, color: P.ink, to: [605, 155] });
        callout(ctx, 'cDNA, from the poly(A) end', 760, 150 - 18, P, { alpha: a, size: 11.5, color: P.dna, to: [720, 148] });
        text(ctx, 'Read 1 site', 585, 150, { size: 10, color: P.inkDim, align: 'right', alpha: a });
      }
      // pool box label
      {
        const a = win(t, 4.2, 8.3, 0.4);
        ctx.save(); ctx.globalAlpha *= a * 0.5; ctx.strokeStyle = P.grid; ctx.setLineDash([5, 4]); roundRect(ctx, 110, 90, 400, 250, 14); ctx.stroke(); ctx.restore();
        text(ctx, 'one tube: all cells, still distinguishable by tag', 310, 356, { size: 11.5, color: P.inkDim, align: 'center', alpha: a });
      }
      ctx.restore();
    }

    // ---- PCR panel (right) ----
    const pcrA = win(t, 5.0, 11.2, 0.5);
    if (pcrA > 0) {
      const ncyc = PCR.cyc.filter(c => t >= c).length;
      text(ctx, 'cDNA PCR: primers on Read 1 site and TSO handle', 760, 62, { size: 12.5, color: P.inkDim, align: 'center', alpha: pcrA });
      text(ctx, `cycle ${Math.min(ncyc, 3)} of 10–14`, 760, 86, { size: 12, color: P.ink, weight: 600, align: 'center', alpha: pcrA });
      PCR.rows.forEach((r, ri) => {
        const col = P.samples[r.k];
        const umi = 0.25 + 0.25 * ri;
        for (let c = 0; c < 8; c++) {
          // copy c exists after cycle floor(log2(c+1)); fade in
          const born = c === 0 ? -1 : PCR.cyc[Math.floor(Math.log2(c + 1)) - 1];
          const a = c === 0 ? 1 : sp(t, born, born + 0.5);
          if (a <= 0) continue;
          const y = r.y + c * 10;
          const err = ri === 0 && c === 5;
          const chim = ri === 2 && c === 6 ? P.samples[2] : null;
          molecule(ctx, PCR.x, y, PCR.w, col, umi, P, pcrA * a, { err, chimeraCol: chim });
        }
        text(ctx, `cell ${['A', 'B', 'C'][ri]}`, PCR.x - 10, r.y + 35, { size: 11, color: col, align: 'right', alpha: pcrA });
      });
      // annotations
      const e1 = pcrA * win(t, 7.9, 11.2, 0.4);
      callout(ctx, 'same barcode, same UMI: one molecule', 730, 128, P, { alpha: pcrA * win(t, 6.9, 11.2, 0.4), size: 11, color: P.ink, to: [705, 138] });
      callout(ctx, 'polymerase error in the barcode →', 730, 240, P, { alpha: e1, size: 11, color: P.alert, to: [626, 168] });
      text(ctx, '“new” barcode 1 mismatch away', 730, 256, { size: 11, color: P.alert, alpha: e1 });
      callout(ctx, 'chimera: cell C’s cDNA, cell B’s tag', 730, 414, P, { alpha: e1, size: 11, color: P.alert, to: [626, 414] });
      text(ctx, 'reads per molecule: thousands', 760, 470, { size: 12, color: P.gold, weight: 600, align: 'center', alpha: pcrA * win(t, 7.6, 11.2, 0.4) });
    }

    // ---- trace panel (left) ----
    {
      const a = win(t, 8.6, 14, 0.5);
      if (a > 0) {
        const X = 110, Y = 130, PW = 400, PH = 190;
        text(ctx, 'SPRIselect cleanup, then a Bioanalyzer trace', 310, 62, { size: 12.5, color: P.inkDim, align: 'center', alpha: a });
        tube(ctx, 60, 90, 32, 70, P, { level: 0.35, alpha: a * 0.9 });
        bead(ctx, 72, 132, 4, P, a); bead(ctx, 81, 138, 4, P, a);
        text(ctx, 'amplified cDNA', X + PW / 2, Y - 18, { size: 13, color: P.ink, weight: 600, align: 'center', alpha: a });
        line(ctx, X, Y + PH + 0.5, X + PW, Y + PH + 0.5, P.inkFaint, 1, a);
        [['100', 0.05], ['500', 0.32], ['1 kb', 0.5], ['2 kb', 0.68], ['5 kb', 0.92]].forEach(([lab, u]) => {
          line(ctx, X + u * PW, Y + PH, X + u * PW, Y + PH + 5, P.inkFaint, 1, a);
          text(ctx, lab, X + u * PW, Y + PH + 16, { size: 10.5, color: P.inkDim, align: 'center', alpha: a });
        });
        text(ctx, 'size (bp)', X + PW / 2, Y + PH + 34, { size: 11, color: P.inkDim, align: 'center', alpha: a });
        const g = sp(t, 8.8, 10.0);
        const f = u => g * (0.9 * Math.exp(-0.5 * ((u - 0.59) / 0.13) ** 2) + 0.28 * Math.exp(-0.5 * ((u - 0.08) / 0.012) ** 2));
        curve(ctx, X, Y, PW, PH, f, P.dna, { alpha: a, lw: 2, fill: true, n: 240 });
        callout(ctx, 'broad hump, 1–2 kb: full-length cDNA', X + 0.70 * PW, Y + 10, P, { alpha: a * sp(t, 9.6, 10.1), size: 11.5, color: P.dna, to: [X + 0.63 * PW, Y + PH * 0.12] });
        callout(ctx, 'sharp peak < 200 bp: primer / TSO dimer', X + 0.12 * PW, Y + PH * 0.55, P, { alpha: a * sp(t, 9.9, 10.4), size: 11.5, color: P.alert, to: [X + 0.085 * PW, Y + PH * 0.74] });
        text(ctx, 'yield 10–100 ng; it tracks cells captured, not expression', 310, Y + PH + 58, { size: 11.5, color: P.gold, align: 'center', alpha: a * sp(t, 10.2, 10.7) });
      }
    }

    // ---- in your data (right, replaces PCR panel) ----
    {
      const a = win(t, 11.2, 14, 0.5);
      if (a > 0) {
        text(ctx, 'in your data', 760, 86, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: a });
        const items = [
          ['reads ≫ molecules:', 'collapse by cell barcode + UMI + gene; the duplication rate itself is not a problem.', P.dna],
          ['barcode 1 mismatch from a real one:', 'PCR or sequencing error; the pipeline corrects it to the whitelist.', P.alert],
          ['sequencing saturation:', 'fraction of reads whose barcode–UMI–gene was already seen. High = capture-limited, low = depth-limited.', P.gold],
        ];
        let y = 124;
        items.forEach(([h, body, col], k) => {
          const ia = a * sp(t, 11.4 + k * 0.5, 11.9 + k * 0.5);
          text(ctx, h, 612, y, { size: 12, color: col, weight: 600, alpha: ia });
          y = wrap(ctx, body, 612, y + 18, 290, { size: 11.5, color: P.inkDim, alpha: ia });
          y += 20;
        });
      }
    }
  },
};
