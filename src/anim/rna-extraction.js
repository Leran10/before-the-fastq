// RNA extraction: lysis in a denaturing buffer, column binding, DNase, and
// what carried-over genomic DNA looks like over a gene model.
import { prog, sp, win, pulse, lerp, hash, text, callout, ssStrand, dsPath, dsFragment, blob, dot, line, roundRect, withAlpha } from '../draw.js';

const CELL = { x: 300, y: 235, r: 115 };
const NUC = { x: 275, y: 250, r: 42 };
const COL = { x: 500, y: 80, w: 90, h: 230 };          // column body
const BAND = { y0: COL.y + 95, y1: COL.y + 150 };       // silica band

const rnas = Array.from({ length: 12 }, (_, i) => {
  const a = hash(i, 1) * Math.PI * 2, r = 45 + hash(i, 2) * 60;
  return { ax: Math.cos(a) * r, ay: Math.sin(a) * r, ang: hash(i, 3) * Math.PI, len: 26 + hash(i, 4) * 28, col: i % 4, row: Math.floor(i / 4) };
});
const rnases = Array.from({ length: 4 }, (_, i) => { const a = hash(i, 11) * 6.3, r = 60 + hash(i, 12) * 40; return { ax: Math.cos(a) * r, ay: Math.sin(a) * r }; });
const proteins = Array.from({ length: 10 }, (_, i) => { const a = hash(i, 21) * 6.3, r = 30 + hash(i, 22) * 75; return { ax: Math.cos(a) * r, ay: Math.sin(a) * r }; });

const EXONS = [[150, 215], [305, 350], [455, 530], [640, 705]];
const GENE = [120, 740];

function exonCov(u, X0, X1) {
  const x = lerp(X0, X1, u);
  let v = 0;
  EXONS.forEach(([a, b]) => { const e = 10; v = Math.max(v, Math.min(prog(x, a - e, a + e), 1 - prog(x, b - e, b + e))); });
  return v * (0.55 + 0.35 * Math.sin(x * 0.07) ** 2);
}

export default {
  id: 'rna-extraction',
  duration: 13,
  thumbT: 4.6,
  phases: [
    { t: 0, label: 'Lysis', caption: 'A guanidinium buffer dissolves the cell and denatures the RNases that would otherwise destroy the RNA within seconds.' },
    { t: 3, label: 'Column binding', caption: 'Nucleic acids bind a silica column; proteins and lipids wash through. Genomic DNA binds too.' },
    { t: 6, label: 'DNase', caption: 'DNase I digests the carried-over genomic DNA. Skip it and the gDNA goes into the library as if it were RNA.' },
    { t: 9.4, label: 'In your data', caption: 'Over a gene model, RNA gives exon peaks; carried-over gDNA gives a flat background across introns and intergenic space.' },
  ],
  draw(ctx, t, W, H, P) {
    const scene = 1 - prog(t, 9.3, 10.1);
    if (scene > 0) {
      ctx.save(); ctx.globalAlpha = scene;
      // ---- buffer pouring in (phase 0) ----
      const buf = sp(t, 1.0, 2.4);
      const bufOut = 1 - prog(t, 3.0, 3.9);
      if (buf > 0 && bufOut > 0) {
        ctx.save(); ctx.globalAlpha = 0.5 * scene * bufOut;
        ctx.fillStyle = P.liquid; roundRect(ctx, 120, lerp(400, 95, buf), 360, 400 - lerp(400, 95, buf), 14); ctx.fill();
        ctx.restore();
        text(ctx, 'guanidinium lysis buffer', 300, 78, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 1.0, 3.4, 0.4) });
      }
      // ---- cell ----
      const memb = 1 - prog(t, 2.0, 3.0);
      if (memb > 0) {
        ctx.save(); ctx.globalAlpha = memb;
        ctx.fillStyle = P.cell; ctx.strokeStyle = P.membrane; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(CELL.x, CELL.y, CELL.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = withAlpha(P.dna, 0.12); ctx.strokeStyle = withAlpha(P.dna, 0.5); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(NUC.x, NUC.y, NUC.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      callout(ctx, 'cell', CELL.x - CELL.r - 10, CELL.y - CELL.r + 10, P, { alpha: win(t, 0.2, 2.2), size: 12, align: 'right' });
      // proteins: wobble in cell, then flow through column to waste
      proteins.forEach((p, i) => {
        const m = sp(t, 3.3 + i * 0.05, 4.4 + i * 0.05);
        const drop = sp(t, 4.6 + i * 0.08, 5.8 + i * 0.08);
        const x = lerp(CELL.x + p.ax, COL.x + COL.w / 2 + (hash(i, 31) - 0.5) * 50, m);
        const y = lerp(CELL.y + p.ay, lerp(BAND.y0 - 20, COL.y + COL.h + 70, drop), m);
        dot(ctx, x, y, 3.5, P.enzymeDim, (1 - drop * 0.9));
      });
      // gDNA: wavy in nucleus -> straight piece in the band -> cut by DNase
      {
        const m = sp(t, 3.4, 4.8);
        const cut = sp(t, 7.3, 8.3);
        const gx = lerp(NUC.x, COL.x + COL.w / 2, m), gy = lerp(NUC.y, (BAND.y0 + BAND.y1) / 2, m);
        if (m < 1) {
          const pts = [];
          for (let k = 0; k <= 40; k++) { const u = k / 40; const ang = u * Math.PI * 3.2; const rr = lerp(8, 30, u) * (1 - m); pts.push([gx + Math.cos(ang) * rr + (u - 0.5) * 60 * m, gy + Math.sin(ang) * rr * 0.6]); }
          dsPath(ctx, pts, { colorA: P.dna, colorB: P.dnaLight, gap: 5, lw: 1.8, rungEvery: 7, alpha: 1 - cut });
        } else {
          // three pieces separating
          const segs = [[-30, -10], [-10, 10], [10, 30]];
          segs.forEach(([a, b], k) => {
            const dy = (k - 1) * 14 * cut, dx = (k - 1) * 8 * cut;
            dsFragment(ctx, gx + a + dx, gx + b + dx, gy + dy, { colorA: P.dna, colorB: P.dnaLight, gap: 5, lw: 1.8, rungEvery: 7, alpha: 1 - cut });
          });
        }
        callout(ctx, 'genomic DNA', NUC.x, NUC.y + NUC.r + 14, P, { alpha: win(t, 0.4, 3.0), size: 11, align: 'center', color: P.dna });
      }
      // RNA strands
      rnas.forEach((r, i) => {
        const m = sp(t, 3.2 + i * 0.07, 4.5 + i * 0.07);
        const tx = COL.x + 14 + r.col * 20 + 2, ty = BAND.y0 + 10 + r.row * 17;
        const x = lerp(CELL.x + r.ax, tx, m), y = lerp(CELL.y + r.ay, ty, m);
        const ang = lerp(r.ang, 0, m), len = lerp(r.len, 16, m);
        const wob = Math.sin(t * 3 + i) * 2 * (1 - m);
        ssStrand(ctx, x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2 + wob, x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2 + wob, { color: P.rna, lw: 2, tickEvery: 7, tickLen: 3 });
      });
      callout(ctx, 'RNA (mostly ribosomal)', CELL.x + 40, CELL.y - CELL.r - 6, P, { alpha: win(t, 0.4, 3.0), size: 11, color: P.rna });
      // RNases: alert tint until the buffer denatures them
      rnases.forEach((r, i) => {
        const active = 1 - sp(t, 1.8, 2.8);
        const wob = active * 5;
        const x = CELL.x + r.ax + Math.sin(t * 7 + i) * wob, y = CELL.y + r.ay + Math.cos(t * 6 + i * 2) * wob;
        const fade = 1 - prog(t, 3.0, 4.0);
        blob(ctx, x, y, 9, lerp(0, 1, active) > 0.5 ? P.alertDim : P.enzymeDim, { seed: i + 3, alpha: fade, stroke: active > 0.5 ? P.alert : P.enzyme });
      });
      callout(ctx, 'RNases', CELL.x + CELL.r + 12, CELL.y + 40, P, { alpha: win(t, 0.4, 1.8), size: 11, color: P.alert });
      text(ctx, 'RNases denatured', CELL.x, CELL.y + CELL.r + 24, { size: 12, color: P.good, align: 'center', alpha: win(t, 2.2, 3.4, 0.3) });

      // ---- column ----
      {
        const ca = win(t, 2.6, 9.6, 0.5);
        if (ca > 0) {
          ctx.save(); ctx.globalAlpha = ca;
          ctx.strokeStyle = P.glass; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(COL.x, COL.y); ctx.lineTo(COL.x, COL.y + COL.h - 40); ctx.lineTo(COL.x + COL.w / 2 - 8, COL.y + COL.h); ctx.lineTo(COL.x + COL.w / 2 + 8, COL.y + COL.h); ctx.lineTo(COL.x + COL.w, COL.y + COL.h - 40); ctx.lineTo(COL.x + COL.w, COL.y); ctx.stroke();
          ctx.fillStyle = withAlpha(P.enzymeDim, 0.5); ctx.fillRect(COL.x + 2, BAND.y0, COL.w - 4, BAND.y1 - BAND.y0);
          ctx.restore();
          text(ctx, 'silica column', COL.x + COL.w / 2, COL.y - 14, { size: 12, color: P.inkDim, align: 'center', alpha: ca });
          text(ctx, 'flow-through: proteins, lipids, salts', COL.x + COL.w / 2 + 110, COL.y + COL.h + 70, { size: 11, color: P.inkDim, align: 'left', alpha: win(t, 4.6, 6.4, 0.4) });
          text(ctx, 'nucleic acids bind silica in high salt', COL.x - 20, (BAND.y0 + BAND.y1) / 2, { size: 11, color: P.inkDim, align: 'right', alpha: win(t, 4.4, 6.2, 0.4) });
        }
      }
      // ---- DNase ----
      {
        const da = win(t, 6.3, 9.4, 0.4);
        if (da > 0) {
          const m = sp(t, 6.5, 7.3);
          const bx = lerp(820, COL.x + COL.w / 2 + 22, m), by = lerp(60, (BAND.y0 + BAND.y1) / 2 - 18, m);
          blob(ctx, bx, by, 11, P.enzyme, { seed: 9, alpha: da });
          blob(ctx, bx - 44 * m, by + 36 * m, 9, P.enzyme, { seed: 4, alpha: da });
          text(ctx, 'DNase I', bx + 16, by - 12, { size: 11, color: P.inkDim, alpha: da });
          callout(ctx, 'gDNA digested', COL.x + COL.w + 60, (BAND.y0 + BAND.y1) / 2 + 40, P, { alpha: win(t, 7.6, 9.4, 0.4), size: 12, color: P.good });
          text(ctx, 'skipped → gDNA goes into the library', COL.x + COL.w + 60, (BAND.y0 + BAND.y1) / 2 + 62, { size: 11, color: P.alert, alpha: win(t, 8.0, 9.4, 0.4) });
        }
      }
      ctx.restore();
    }

    // ---- phase 3: gene model + coverage ----
    {
      const a = win(t, 9.5, 13.5, 0.6);
      if (a <= 0) return;
      const yG = 370, base = 340, hCov = 130, X0 = 80, X1 = 880;
      text(ctx, 'reads over a gene model', X0, 150, { size: 14, color: P.ink, weight: 600, alpha: a });
      // gene line and exons
      line(ctx, GENE[0], yG, GENE[1], yG, P.inkFaint, 1.5, a);
      line(ctx, X0, yG, GENE[0], yG, P.inkFaint, 1, a, [2, 4]);
      line(ctx, GENE[1], yG, X1, yG, P.inkFaint, 1, a, [2, 4]);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P.dna;
      EXONS.forEach(([x0, x1]) => ctx.fillRect(x0, yG - 8, x1 - x0, 16));
      ctx.restore();
      text(ctx, 'intergenic', (X0 + GENE[0]) / 2, yG + 24, { size: 11, color: P.inkDim, align: 'center', alpha: a });
      text(ctx, 'intergenic', (GENE[1] + X1) / 2, yG + 24, { size: 11, color: P.inkDim, align: 'center', alpha: a });
      text(ctx, 'exon', (EXONS[0][0] + EXONS[0][1]) / 2, yG + 24, { size: 11, color: P.dna, align: 'center', alpha: a });
      text(ctx, 'intron', (EXONS[0][1] + EXONS[1][0]) / 2, yG + 24, { size: 11, color: P.inkDim, align: 'center', alpha: a });
      // blue flat background (gDNA)
      const gb = sp(t, 11.2, 12.4);
      if (gb > 0) {
        ctx.save(); ctx.globalAlpha = a * 0.75; ctx.fillStyle = withAlpha(P.dna, 0.35);
        const hh = 24 * gb;
        ctx.fillRect(X0, base - hh, (X1 - X0), hh);
        ctx.restore();
        text(ctx, 'gDNA carried through: flat background over introns and intergenic space, unstranded', X0, base - 36 - 0, { size: 12, color: P.alert, alpha: a * win(t, 11.6, 13.5, 0.4) });
      }
      // amber exon coverage
      const rev = sp(t, 9.9, 11.2);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = withAlpha(P.rna, 0.55); ctx.strokeStyle = P.rna; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X0, base);
      const n = 200;
      for (let k = 0; k <= n; k++) { const u = k / n; const v = u <= rev ? exonCov(u, X0, X1) : 0; ctx.lineTo(lerp(X0, X1, u), base - v * hCov); }
      ctx.lineTo(X1, base); ctx.closePath(); ctx.fill();
      ctx.restore();
      text(ctx, 'RNA: coverage on exons only', GENE[0] + 40, base - hCov - 10, { size: 12, color: P.rna, alpha: a * win(t, 10.4, 13.5, 0.4) });
      text(ctx, 'check: fraction of reads in introns / intergenic (RSeQC read_distribution, Qualimap)', X0, 470, { size: 11.5, color: P.inkDim, alpha: a * win(t, 12.0, 13.5, 0.4) });
    }
  },
};
