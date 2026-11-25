// From FASTQ to count matrix: read pairs -> alignment of Read 2 -> barcode
// correction and UMI collapsing -> the barcode-rank knee and cell calling ->
// a sparse cells x genes matrix.
import { sp, win, pulse, lerp, hash, text, arrow, dot, line, roundRect, curve, withAlpha } from '../draw.js';

// Six read pairs. cell: index into P.samples; umi: short tag; mis: barcode has a
// sequencing error; gene position u along the 3' exon (0..1)
const READS = [
  { cell: 0, umi: 'ACG', u: 0.55 },
  { cell: 0, umi: 'ACG', u: 0.55, dup: true },
  { cell: 1, umi: 'TTC', u: 0.25 },
  { cell: 1, umi: 'GAT', u: 0.78 },
  { cell: 3, umi: 'CCA', u: 0.40 },
  { cell: 0, umi: 'TGA', u: 0.66, mis: true },
];
const LX = 70, LY0 = 110, ROW = 38;          // FASTQ stack
const CBW = 50, UW = 30, R2W = 150;
const GX0 = 470, GX1 = 900, GY = 200;        // gene model
const EX3 = { x0: GX0 + 190, x1: GX1 - 40 };  // 3' exon / UTR

export default {
  id: 'barcode-processing',
  duration: 13,
  thumbT: 8.8,
  phases: [
    { t: 0, label: 'The read pairs', caption: 'Read 1 is nothing but tags: 16 bp cell barcode + 12 bp UMI. Read 2 is the cDNA. Neither says yet which cell is real.' },
    { t: 2.5, label: 'Align Read 2', caption: 'Read 2 is aligned to the genome and assigned to a gene when it overlaps an exon (and, by default now, an intron) on the sense strand.' },
    { t: 5, label: 'Correct barcodes, collapse UMIs', caption: 'Barcodes one mismatch from the whitelist are corrected; reads with the same barcode, UMI and gene become one molecule.' },
    { t: 7.5, label: 'Which barcodes were cells?', caption: 'Rank barcodes by UMI count: a plateau, a cliff, a long tail of empty droplets. The cut is a modelling decision, not a fact.' },
    { t: 10.5, label: 'The matrix', caption: 'Cells × genes, UMI counts, mostly zeros. Doublets, ambient RNA and damaged cells are all still inside.' },
  ],
  draw(ctx, t, W, H, P) {
    const fly = sp(t, 2.8, 4.0);              // R2 to the gene
    const corr = sp(t, 5.3, 6.1);             // barcode correction
    const coll = sp(t, 6.3, 7.1);             // UMI collapse
    const leftFade = 1 - sp(t, 7.5, 8.2);

    // ---------------- reads + gene (phases 0–2) ----------------
    ctx.save(); ctx.globalAlpha *= leftFade;
    if (leftFade > 0.02) {
      text(ctx, 'FASTQ: six read pairs', LX, 70, { size: 14, color: P.ink, weight: 600 });
      text(ctx, 'R1 = barcode + UMI', LX, LY0 - 22, { size: 10.5, color: P.p5, weight: 600 });
      text(ctx, 'R2 = cDNA', LX + CBW + UW + 16 + R2W, LY0 - 22, { size: 10.5, color: P.dna, weight: 600, align: 'right', alpha: 1 - fly });

      READS.forEach((r, i) => {
        const y = LY0 + i * ROW;
        const cellCol = P.samples[r.cell];
        // correction: the mismatched barcode shakes then snaps
        const jit = r.mis ? Math.sin(t * 30) * 2 * pulse(t, 5.3, 6.1) : 0;
        // R1 blocks
        ctx.save();
        ctx.fillStyle = cellCol; roundRect(ctx, LX + jit, y - 8, CBW, 16, 3); ctx.fill();
        ctx.fillStyle = P.gold; roundRect(ctx, LX + CBW + 3 + jit, y - 8, UW, 16, 3); ctx.fill();
        ctx.restore();
        text(ctx, r.umi, LX + CBW + 3 + UW / 2 + jit, y, { size: 9.5, color: P.panel, align: 'center', mono: true, weight: 700 });
        if (r.mis) dot(ctx, LX + 36 + jit, y, 4, P.alert, 1 - corr);
        // R2 bar: at rest in the stack, then flies to the gene
        const sx = LX + CBW + UW + 16, sy = y;
        const gx = EX3.x0 + (EX3.x1 - EX3.x0 - 60) * r.u;
        const stackRow = r.dup ? 1 : [0, 0, 0, 0, 1, 2][i];      // pile order above the exon
        const gy = GY - 18 - stackRow * 9;
        let ex = lerp(sx, gx, fly), ey = lerp(sy, gy, fly), ew = lerp(R2W, 60, fly);
        // collapse: the duplicate slides onto its twin and fades
        let a = 1;
        if (r.dup) { const twin = READS[0]; const tx0 = EX3.x0 + (EX3.x1 - EX3.x0 - 60) * twin.u; ex = lerp(ex, tx0, coll); ey = lerp(ey, GY - 18, coll); a = 1 - 0.85 * coll; }
        ctx.save(); ctx.globalAlpha *= a;
        ctx.fillStyle = P.dna; roundRect(ctx, ex, ey - 4, ew, 8, 2); ctx.fill();
        if (fly < 0.5) { ctx.strokeStyle = withAlpha(P.dnaLight, 0.7); ctx.lineWidth = 1; ctx.beginPath(); for (let k = ex + 8; k < ex + ew - 4; k += 10) { ctx.moveTo(k, ey - 3); ctx.lineTo(k, ey + 3); } ctx.stroke(); }
        ctx.restore();
        // gold ring around the collapsed molecule
        if (i === 0 && coll > 0) { ctx.save(); ctx.globalAlpha *= coll; ctx.strokeStyle = P.gold; ctx.lineWidth = 2; roundRect(ctx, ex - 3, ey - 7, ew + 6, 14, 4); ctx.stroke(); ctx.restore(); }
        // a leader line back to the read row while flying / after landing
        if (fly > 0) line(ctx, sx - 6, sy, ex, ey, cellCol, 1, 0.35 * fly * a, [2, 3]);
      });

      // cell legend
      const la = win(t, 0.4, 7.5, 0.4);
      [[0, 'cell A'], [1, 'cell B'], [3, 'cell C']].forEach(([c, name], i) => {
        dot(ctx, LX + 10 + i * 70, LY0 + 6 * ROW + 6, 5, P.samples[c], la);
        text(ctx, name, LX + 20 + i * 70, LY0 + 6 * ROW + 6, { size: 11, color: P.inkDim, alpha: la });
      });
      text(ctx, 'three colours = three droplets', LX, LY0 + 6 * ROW + 28, { size: 11, color: P.inkFaint, alpha: win(t, 0.4, 2.6, 0.4) });

      // ---- gene model ----
      const ga = win(t, 2.5, 7.6, 0.4);
      if (ga > 0) {
        line(ctx, GX0, GY, GX1, GY, P.inkFaint, 1.5, ga);
        [[GX0, 50], [GX0 + 95, 45], [EX3.x0, EX3.x1 - EX3.x0]].forEach(([ex, ew], i) => {
          ctx.save(); ctx.globalAlpha *= ga; ctx.fillStyle = i === 2 ? P.dnaDim : withAlpha(P.dnaDim, 0.6); roundRect(ctx, ex, GY - 7, ew, 14, 2); ctx.fill(); ctx.restore();
        });
        text(ctx, 'GENE X', GX0, GY - 34, { size: 13, color: P.ink, weight: 600, alpha: ga });
        text(ctx, '5′', GX0 - 16, GY, { size: 11, color: P.inkDim, alpha: ga });
        text(ctx, 'AAAA', GX1 + 4, GY, { size: 10, color: P.inkDim, alpha: ga, mono: true });
        text(ctx, '3′ UTR', (EX3.x0 + EX3.x1) / 2, GY + 20, { size: 10.5, color: P.dna, align: 'center', alpha: ga });
        text(ctx, 'sense strand, exon or intron → assigned to GENE X', GX0, GY + 44, { size: 11, color: P.inkDim, alpha: ga * win(t, 3.6, 5.2, 0.3) });
      }
      // ---- phase 2 labels ----
      {
        const ca = win(t, 5.1, 7.6, 0.3);
        const y5 = LY0 + 5 * ROW;
        text(ctx, '1 mismatch → nearest whitelist barcode', LX + CBW + UW + 16, y5, { size: 11, color: P.alert, alpha: ca * (1 - corr), weight: 600 });
        text(ctx, 'corrected', LX + CBW + UW + 16, y5, { size: 11, color: P.good, alpha: ca * sp(t, 5.9, 6.2), weight: 600 });
        const ka = win(t, 6.3, 7.6, 0.3);
        text(ctx, 'same barcode + UMI + gene → one molecule', GX0, GY + 68, { size: 11.5, color: P.gold, alpha: ka, weight: 600 });
        text(ctx, '6 reads → 5 UMIs', GX0, GY + 88, { size: 12, color: P.ink, alpha: ka * sp(t, 6.8, 7.2), weight: 600 });
        text(ctx, 'UMIs, not reads, are what you count', GX0, GY + 106, { size: 11, color: P.inkDim, alpha: ka * sp(t, 6.8, 7.2) });
      }
    }
    ctx.restore();

    // ---------------- knee plot (phase 3) ----------------
    const ka = win(t, 7.7, 13.6, 0.5);
    if (ka > 0) {
      const KX = 90, KY = 110, KW = 340, KH = 240;
      const grow = sp(t, 7.9, 9.2);
      // log-log shape: plateau, cliff, tail
      const f = u => { const plateau = 0.88 - 0.12 * u; const cliff = 1 / (1 + Math.exp((u - 0.36) * 40)); const tail = 0.22 - 0.16 * (u - 0.36) / 0.64; return plateau * cliff + Math.max(0.02, tail) * (1 - cliff); };
      text(ctx, 'barcode-rank plot', KX, 80, { size: 14, color: P.ink, weight: 600, alpha: ka });
      line(ctx, KX, KY, KX, KY + KH, P.inkFaint, 1, ka);
      line(ctx, KX, KY + KH, KX + KW, KY + KH, P.inkFaint, 1, ka);
      text(ctx, 'UMIs per barcode (log)', KX - 10, KY - 14, { size: 10.5, color: P.inkDim, alpha: ka });
      text(ctx, 'barcodes, ranked (log) →', KX + KW, KY + KH + 16, { size: 10.5, color: P.inkDim, align: 'right', alpha: ka });
      curve(ctx, KX, KY, KW * grow, KH, u => f(u * grow), P.dna, { lw: 2.5, alpha: ka, n: 120 });
      const ca = ka * sp(t, 9.3, 9.9);
      const cutU = 0.39;
      line(ctx, KX + KW * cutU, KY, KX + KW * cutU, KY + KH, P.gold, 1.5, ca, [4, 3]);
      text(ctx, 'cells', KX + KW * cutU - 8, KY + 14, { size: 11, color: P.ink, align: 'right', alpha: ca, weight: 600 });
      text(ctx, 'empty droplets', KX + KW * cutU + 8, KY + 14, { size: 11, color: P.inkDim, alpha: ca, weight: 600 });
      text(ctx, 'knee cut', KX + KW * cutU, KY + KH + 16, { size: 10.5, color: P.gold, align: 'center', alpha: ca });
      text(ctx, '~10⁴ barcodes', KX + 10, KY + 62, { size: 10, color: P.inkDim, alpha: ca });
      text(ctx, '~10⁶ barcodes, ambient RNA only', KX + KW - 4, KY + KH - 75, { size: 10, color: P.inkDim, align: 'right', alpha: ca });
      // EmptyDrops rescues
      const ea = ka * sp(t, 9.9, 10.5);
      [0.46, 0.5, 0.57].forEach((u, i) => {
        const gy = KY + KH - f(u) * KH - 6 - 6 * hash(i, 2);
        dot(ctx, KX + KW * u, gy, 4, P.gold, ea);
      });
      text(ctx, 'rescued by EmptyDrops:', KX + KW * 0.7, KY + KH - 150, { size: 10.5, color: P.gold, align: 'center', alpha: ea, weight: 600 });
      text(ctx, 'few UMIs, but profile ≠ ambient', KX + KW * 0.7, KY + KH - 136, { size: 10.5, color: P.gold, align: 'center', alpha: ea });
      text(ctx, 'low-RNA cell types live here', KX + KW * 0.7, KY + KH - 122, { size: 10, color: P.inkDim, align: 'center', alpha: ea });
    }

    // ---------------- matrix (phase 4) ----------------
    const ma = win(t, 10.6, 13.6, 0.5);
    if (ma > 0) {
      const MX = 520, MY = 120, CS = 24, NC = 14, NR = 9;
      text(ctx, 'filtered matrix: cells × genes', MX, 80, { size: 14, color: P.ink, weight: 600, alpha: ma });
      text(ctx, 'genes →', MX + NC * CS, MY - 12, { size: 10.5, color: P.inkDim, align: 'right', alpha: ma });
      for (let r = 0; r < NR; r++) {
        const ra = ma * sp(t, 10.7 + r * 0.12, 11.1 + r * 0.12);
        const cc = P.samples[[0, 1, 3, 0, 1, 3, 0, 1, 3][r]];
        dot(ctx, MX - 12, MY + r * CS + CS / 2, 4, cc, ra);
        for (let c = 0; c < NC; c++) {
          const x = MX + c * CS, y = MY + r * CS;
          ctx.save(); ctx.globalAlpha *= ra;
          ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, CS - 1, CS - 1);
          const h = hash(r * 31 + c, 9);
          // a cell-type marker column per colour group, otherwise sparse
          const marker = (c % 5 === [0, 1, 3, 0, 1, 3, 0, 1, 3][r] % 5);
          if (h < 0.14 || (marker && h < 0.8)) {
            const v = marker ? 0.5 + 0.5 * h : 0.25 + 0.5 * h;
            ctx.fillStyle = withAlpha(P.dna, v); ctx.fillRect(x + 3, y + 3, CS - 6, CS - 6);
            if (h < 0.1) text(ctx, String(1 + Math.floor(h * 60)), x + CS / 2, y + CS / 2, { size: 9, color: P.panel, align: 'center', mono: true, weight: 700 });
          }
          ctx.restore();
        }
      }
      text(ctx, 'cells', MX - 12, MY + NR * CS + 12, { size: 10.5, color: P.inkDim, align: 'center', alpha: ma });
      const na = ma * sp(t, 11.9, 12.5);
      text(ctx, 'UMIs, not reads  ·  mostly zeros', MX, MY + NR * CS + 40, { size: 12, color: P.ink, alpha: na, weight: 600 });
      text(ctx, 'doublets, ambient RNA and damaged cells are still inside', MX, MY + NR * CS + 60, { size: 11.5, color: P.alert, alpha: na });
      text(ctx, 'the pipeline removed none of them; that is your job', MX, MY + NR * CS + 78, { size: 11, color: P.inkDim, alpha: na });
    }
  },
};
