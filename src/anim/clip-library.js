// CLIP library: 3′ adapter with UMI ligated to the RNA footprint, reverse
// transcription that stops at the crosslink remnant, a second adapter on the
// cDNA, many PCR cycles, and the read whose start is the crosslink site + 1.
// Upper half: the molecule, large. Lower half: a legend / zoom strip.
import { prog, sp, win, pulse, lerp, hash, text, ssStrand, blob, dot, line, arrow, roundRect, panelTitle, footnote } from '../draw.js';

// ── scene A geometry: one molecule across the canvas ──
const RNA = { x0: 100, x1: 560, y: 200 };
const XL = 330;                       // crosslinked base
const AD3 = { x0: 560, x1: 790 };     // 3′ adapter
const BC = { x0: 584, x1: 636 };      // in-line barcode
const UMI = { x0: 650, x1: 734 };     // UMI
const CY = RNA.y + 72;                // cDNA (antiparallel, below)
const STOP = XL + 14;                 // cDNA 5′ end: one nucleotide short of the crosslinked base
const AD5 = { x0: 150, x1: STOP };    // second adapter on the cDNA 3′ end
const LW = 7, TICK = { tickEvery: 14, tickLen: 9 };
const STRIP = { x: 80, y: 316, w: 800, h: 160 };

// PCR copies: three UMI families
const FAMILIES = [{ umi: 'TGCA', n: 4 }, { umi: 'GATC', n: 2 }, { umi: 'CCAT', n: 3 }];
const ROWS = [];
FAMILIES.forEach((f, fi) => { for (let c = 0; c < f.n; c++) ROWS.push({ fi, c, umi: f.umi }); });
// aligned reads in the final panel
const READS = Array.from({ length: 8 }, (_, i) => ({ len: 120 + 150 * hash(i, 21), dup: i === 2 || i === 4 || i === 7 }));

function block(ctx, x0, x1, y, color, alpha = 1, h = 22) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  roundRect(ctx, x0, y - h / 2, x1 - x0, h, 4); ctx.fill(); ctx.restore();
}
function umiBlock(ctx, x0, x1, y, P, label, alpha = 1, h = 22, size = 11) {
  block(ctx, x0, x1, y, P.gold, alpha, h);
  if (label) text(ctx, label, (x0 + x1) / 2, y, { size, color: P.ink, align: 'center', mono: true, weight: 700, alpha });
}
function panel(ctx, P, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = P.panel; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1;
  roundRect(ctx, STRIP.x, STRIP.y, STRIP.w, STRIP.h, 10); ctx.fill(); ctx.stroke(); ctx.restore();
}

export default {
  id: 'clip-library',
  duration: 15,
  thumbT: 7.2,
  phases: [
    { t: 0, label: 'RNA footprint', caption: 'What comes off the membrane: 20–100 nt of RNA with a few amino acids still crosslinked to one base, the footprint of the protein.' },
    { t: 2.5, label: '3′ adapter with UMI', caption: 'T4 RNA ligase attaches a 3′ adapter that carries an in-line barcode and a random UMI. The UMI is on the molecule before any PCR.' },
    { t: 5, label: 'RT stops at the crosslink', caption: 'Reverse transcriptase copies from the adapter toward the 5′ end and cannot pass the peptide remnant. The cDNA ends one nucleotide before the crosslinked base.' },
    { t: 8, label: 'Second adapter on the cDNA', caption: 'A single-stranded DNA ligase adds the second adapter to the cDNA 3′ end (eCLIP), or the cDNA is circularised (iCLIP). Truncated cDNAs become clonable.' },
    { t: 10.5, label: 'PCR, 15–25 cycles', caption: 'Picograms of input need many cycles. Most reads will be PCR copies; the UMI lets them collapse back to the molecules that were really there.' },
    { t: 12.6, label: 'The read start is the data', caption: 'Read 1 begins with the UMI and barcode, then genomic sequence. Aligned reads pile up with their 5′ ends one base downstream of the crosslink site.' },
  ],
  draw(ctx, t, W, H, P) {
    // ───────────── scene A: the molecule (upper half) + strip (lower half) ─────────────
    const sceneA = 1 - sp(t, 10.3, 10.9);
    if (sceneA > 0) {
      ctx.save(); ctx.globalAlpha *= sceneA;
      panelTitle(ctx, 'From RNA footprint to cDNA', W, P);

      const adIn = sp(t, 2.7, 3.6);
      const rt = sp(t, 5.4, 7.4);
      const rnaFade = 1 - 0.75 * sp(t, 8.0, 8.8);
      const ad5 = sp(t, 8.4, 9.3);

      // RNA
      ssStrand(ctx, RNA.x0, RNA.y, RNA.x1, RNA.y, { color: P.rna, side: -1, alpha: rnaFade, lw: LW, ...TICK });
      text(ctx, '5′', RNA.x0 - 22, RNA.y, { size: 16, color: P.rna, align: 'center', alpha: rnaFade });
      text(ctx, '3′', RNA.x1 + 18, RNA.y, { size: 16, color: P.rna, align: 'center', alpha: rnaFade * (1 - adIn) });
      blob(ctx, XL, RNA.y - 26, 18, P.enzymeDim, { seed: 5, alpha: rnaFade, stroke: P.inkDim });
      dot(ctx, XL, RNA.y, 9, P.gold, 1);
      text(ctx, 'peptide remnant at the crosslinked base', XL, RNA.y - 62, { size: 14, color: P.inkDim, align: 'center', alpha: win(t, 0.3, 5.0, 0.3) });
      text(ctx, '20–100 nt RNA footprint', RNA.x0 + 90, RNA.y + 30, { size: 14, color: P.rna, alpha: win(t, 0.3, 2.6, 0.3) });

      // 3′ adapter
      if (adIn > 0) {
        const dx = lerp(170, 0, adIn);
        ssStrand(ctx, AD3.x0 + dx, RNA.y, AD3.x1 + dx, RNA.y, { color: P.p7, side: -1, lw: LW, alpha: rnaFade, ...TICK });
        block(ctx, BC.x0 + dx, BC.x1 + dx, RNA.y, P.p7Dim, rnaFade);
        text(ctx, 'bc', (BC.x0 + BC.x1) / 2 + dx, RNA.y, { size: 11, color: P.ink, align: 'center', weight: 700, alpha: rnaFade });
        umiBlock(ctx, UMI.x0 + dx, UMI.x1 + dx, RNA.y, P, 'UMI', rnaFade);
        text(ctx, '3′ adapter', AD3.x1 + dx + 18, RNA.y, { size: 15, color: P.p7, alpha: win(t, 2.8, 10.3, 0.3) * rnaFade });
        const lg = win(t, 2.6, 4.6, 0.3);
        blob(ctx, AD3.x0 + dx, RNA.y + 30, 17, P.enzyme, { seed: 8, alpha: lg, stroke: P.inkDim });
        text(ctx, 'T4 RNA ligase', AD3.x0 + dx, RNA.y + 62, { size: 13, color: P.inkDim, align: 'center', alpha: lg });
      }
      // reverse transcription
      if (rt > 0) {
        const head = lerp(AD3.x1, STOP, rt);
        ssStrand(ctx, AD3.x1, CY, head, CY, { color: P.dna, side: 1, lw: LW, ...TICK });
        const rta = win(t, 5.0, 8.4, 0.3);
        blob(ctx, head - 4, CY + 26, 21, P.enzyme, { seed: 12, alpha: rta, stroke: P.inkDim });
        text(ctx, 'reverse transcriptase', head - 4, CY + 64, { size: 13, color: P.inkDim, align: 'center', alpha: rta });
        if (rt >= 1) {
          const b = pulse(t, 7.4, 8.0);
          dot(ctx, STOP, CY, 6 + 10 * b, P.alert, 0.7 * b);
        }
        text(ctx, 'cDNA', AD3.x1 + 18, CY, { size: 15, color: P.dna, alpha: win(t, 5.6, 10.3, 0.3) });
      }
      // second adapter
      if (ad5 > 0) {
        const dx = lerp(-140, 0, ad5);
        ssStrand(ctx, AD5.x0 + dx, CY, AD5.x1 + dx, CY, { color: P.p5, side: 1, lw: LW, ...TICK });
        text(ctx, '5′ adapter', AD5.x0 + dx - 16, CY, { size: 15, color: P.p5, align: 'right', alpha: ad5 });
        const lg = win(t, 8.3, 10.0, 0.3);
        blob(ctx, STOP, CY - 28, 16, P.enzyme, { seed: 9, alpha: lg, stroke: P.inkDim });
        text(ctx, 'ssDNA ligase', STOP + 24, CY - 30, { size: 13, color: P.inkDim, alpha: lg });
      }

      // ── lower strip: legend (phases 0,1,3) or zoom (phase 2) ──
      const legendA = Math.max(win(t, 0, 5.0, 0.4), win(t, 8.0, 10.6, 0.4));
      const zoomA = win(t, 5.0, 8.0, 0.4);
      panel(ctx, P, 1);
      if (legendA > 0) {
        ctx.save(); ctx.globalAlpha *= legendA;
        const ly = STRIP.y + 22;
        text(ctx, 'State of the molecule', STRIP.x + 20, ly, { size: 13, color: P.inkDim, weight: 600 });
        const states = [
          [0, 'RNA fragment, 20–100 nt, one base still carrying a peptide'],
          [2.6, 'RNA + 3′ adapter: barcode and UMI are on before any PCR'],
          [8.2, 'cDNA truncated at the crosslink, now with both adapters: clonable'],
        ];
        let st = states[0][1]; for (const [tt, s] of states) if (t >= tt) st = s;
        text(ctx, st, STRIP.x + 190, ly, { size: 14, color: P.ink, weight: 600 });
        // legend items in two rows
        const items = [
          { on: 0, draw: (x, y) => ssStrand(ctx, x, y, x + 46, y, { color: P.rna, side: -1, lw: 5, tickEvery: 10, tickLen: 6 }), label: 'RNA footprint' },
          { on: 0, draw: (x, y) => { blob(ctx, x + 23, y - 8, 9, P.enzymeDim, { seed: 5, stroke: P.inkDim }); dot(ctx, x + 23, y + 3, 5, P.gold); }, label: 'crosslink remnant' },
          { on: 2.8, draw: (x, y) => { ssStrand(ctx, x, y, x + 46, y, { color: P.p7, side: -1, lw: 5, tickEvery: 10, tickLen: 6 }); block(ctx, x + 6, x + 18, y, P.p7Dim, 1, 12); umiBlock(ctx, x + 24, x + 42, y, P, '', 1, 12); }, label: '3′ adapter: barcode + UMI' },
          { on: 5.6, draw: (x, y) => ssStrand(ctx, x, y, x + 46, y, { color: P.dna, side: 1, lw: 5, tickEvery: 10, tickLen: 6 }), label: 'cDNA, 5′ end at crosslink + 1' },
          { on: 8.5, draw: (x, y) => ssStrand(ctx, x, y, x + 46, y, { color: P.p5, side: 1, lw: 5, tickEvery: 10, tickLen: 6 }), label: '5′ adapter (eCLIP: ssDNA ligase)' },
          { on: 8.9, draw: (x, y) => { ssStrand(ctx, x, y, x + 46, y, { color: P.p5, side: 1, lw: 5, tickEvery: 10, tickLen: 6 }); text(ctx, '○', x + 23, y, { size: 12, color: P.inkDim, align: 'center' }); }, label: 'iCLIP instead: circularise + re-cut' },
        ];
        items.forEach((it, i) => {
          const a = it.on <= t ? 1 : 0.25;
          const col = i % 3, row = Math.floor(i / 3);
          const x = STRIP.x + 30 + col * 265, y = STRIP.y + 70 + row * 50;
          ctx.save(); ctx.globalAlpha *= a; it.draw(x, y); ctx.restore();
          text(ctx, it.label, x + 60, y, { size: 13, color: it.on <= t ? P.ink : P.inkFaint });
        });
        ctx.restore();
      }
      if (zoomA > 0) {
        ctx.save(); ctx.globalAlpha *= zoomA;
        // zoom box on the crosslink: magnified bases
        const zx = STRIP.x + 40, zy = STRIP.y + 18, zw = 520, zh = STRIP.h - 36;
        ctx.save(); ctx.strokeStyle = P.gold; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        roundRect(ctx, zx, zy, zw, zh, 8); ctx.stroke();
        // leader lines from the crosslink on the main molecule
        ctx.beginPath(); ctx.moveTo(XL - 24, CY + 8); ctx.lineTo(zx, zy); ctx.moveTo(XL + 24, CY + 8); ctx.lineTo(zx + zw, zy); ctx.stroke();
        ctx.restore();
        text(ctx, 'zoom: the crosslinked base', zx + 12, zy + 16, { size: 12, color: P.gold, weight: 600 });
        // RNA bases (top row) and cDNA bases (bottom row)
        const ry = zy + 56, cy = zy + 100, bx = zx + 60, stepX = 40;
        const rnaSeq = 'AGUCUAGGAU';
        const xlIdx = 4;
        for (let i = 0; i < rnaSeq.length; i++) {
          const x = bx + i * stepX;
          text(ctx, rnaSeq[i], x, ry, { size: 20, color: i === xlIdx ? P.gold : P.rna, align: 'center', mono: true, weight: i === xlIdx ? 700 : 500 });
        }
        text(ctx, '5′', bx - 36, ry, { size: 12, color: P.rna, align: 'center' });
        text(ctx, '3′', bx + rnaSeq.length * stepX - 8, ry, { size: 12, color: P.rna, align: 'center' });
        blob(ctx, bx + xlIdx * stepX, ry - 30, 14, P.enzymeDim, { seed: 5, stroke: P.inkDim });
        text(ctx, 'peptide', bx + xlIdx * stepX + 26, ry - 30, { size: 11, color: P.inkDim });
        // cDNA letters appear right-to-left with rt progress, stopping at xlIdx + 1
        const comp = { A: 'T', G: 'C', U: 'A', C: 'G' };
        const nMade = Math.floor(lerp(0, rnaSeq.length - xlIdx - 1, rt) + 0.001);
        for (let k = 0; k < nMade; k++) {
          const i = rnaSeq.length - 1 - k;
          text(ctx, comp[rnaSeq[i]], bx + i * stepX, cy, { size: 20, color: P.dna, align: 'center', mono: true, weight: 500 });
        }
        const headX = bx + (rnaSeq.length - nMade) * stepX - stepX / 2;
        blob(ctx, headX - 4, cy + 4, 13, P.enzyme, { seed: 12, stroke: P.inkDim, alpha: win(t, 5.2, 7.6, 0.2) });
        if (rt >= 1) {
          const a = sp(t, 7.4, 7.9);
          arrow(ctx, bx + xlIdx * stepX - 40, cy + 26, bx + xlIdx * stepX + 22, cy + 6, P.alert, { lw: 2, head: 8, alpha: a });
          text(ctx, 'RT stops here', bx + xlIdx * stepX - 44, cy + 32, { size: 13, color: P.alert, align: 'right', weight: 600, alpha: a });
          text(ctx, 'cDNA 5′ end = crosslink + 1', bx + (xlIdx + 1) * stepX, cy + 32, { size: 13, color: P.ink, weight: 600, alpha: a });
        }
        text(ctx, 'cDNA grows 5′→3′, toward the RNA 5′ end', zx + zw - 14, cy + 32, { size: 11, color: P.inkDim, align: 'right', alpha: win(t, 5.4, 7.2, 0.2) });
        // right of the zoom: the point
        text(ctx, 'HITS-CLIP / PAR-CLIP keep read-through cDNAs instead;', zx + zw + 20, zy + 50, { size: 12, color: P.inkDim, maxWidth: 210 });
        text(ctx, 'there the site is a deletion or a T→C mismatch.', zx + zw + 20, zy + 70, { size: 12, color: P.inkDim, maxWidth: 210 });
        text(ctx, 'eCLIP / iCLIP: the truncation itself is the signal.', zx + zw + 20, zy + 104, { size: 12, color: P.ink, weight: 600, maxWidth: 210 });
        ctx.restore();
      }
      ctx.restore();
    }

    // ───────────── scene B: PCR copies and UMI families ─────────────
    const sceneB = win(t, 10.5, 12.55, 0.3);
    if (sceneB > 0) {
      ctx.save(); ctx.globalAlpha *= sceneB;
      panelTitle(ctx, 'PCR: many copies, few molecules', W, P);
      const cyc = Math.min(20, Math.floor(1 + 19 * prog(t, 10.8, 12.0)));
      text(ctx, `cycle ${cyc} of 15–25`, 400, 72, { size: 16, color: P.gold, align: 'center', weight: 600, mono: true });
      const grow = prog(t, 10.9, 12.0);
      const collapse = sp(t, 12.2, 12.8);
      const x0 = 110, len = 480;
      ROWS.forEach((r, i) => {
        const a = prog(grow, i / ROWS.length, (i + 1) / ROWS.length);
        if (a <= 0) return;
        const y = 112 + i * 40;
        const isDup = r.c > 0;
        const fade = isDup ? 1 - 0.8 * collapse : 1;
        ctx.save(); ctx.globalAlpha *= a * fade;
        line(ctx, x0, y, x0 + 70, y, P.p5, 7);
        line(ctx, x0 + 70, y, x0 + len - 130, y, P.dna, 7);
        line(ctx, x0 + len - 130, y, x0 + len, y, P.p7, 7);
        block(ctx, x0 + len - 112, x0 + len - 90, y, P.p7Dim, 1, 16);
        umiBlock(ctx, x0 + len - 80, x0 + len - 24, y, P, r.umi, 1, 16, 10);
        ctx.restore();
        if (isDup) text(ctx, 'PCR copy', x0 + len + 18, y, { size: 13, color: P.alert, alpha: a * collapse });
        else text(ctx, 'molecule ' + (r.fi + 1), x0 + len + 18, y, { size: 13, color: P.good, alpha: a * collapse, weight: 600 });
      });
      const sx = 790;
      text(ctx, `${ROWS.length} reads`, sx, 200, { size: 20, color: P.ink, align: 'center', weight: 600, alpha: grow >= 1 ? 1 : 0 });
      arrow(ctx, sx, 222, sx, 276, P.ink, { lw: 1.6, head: 8, alpha: collapse });
      text(ctx, 'same UMI + same start', sx, 250, { size: 12, color: P.inkDim, align: 'center', alpha: collapse });
      text(ctx, '3 molecules', sx, 298, { size: 20, color: P.good, align: 'center', weight: 600, alpha: collapse });
      text(ctx, 'duplication of 50–90 % is normal here', sx, 360, { size: 13, color: P.inkDim, align: 'center', alpha: collapse, maxWidth: 220 });
      text(ctx, 'count unique molecules, not reads', sx, 382, { size: 13, color: P.inkDim, align: 'center', alpha: collapse, maxWidth: 220 });
      ctx.restore();
    }

    // ───────────── scene C: the read and the pile-up ─────────────
    const sceneC = sp(t, 12.4, 12.7);
    if (sceneC > 0) {
      ctx.save(); ctx.globalAlpha *= sceneC;
      panelTitle(ctx, 'What Read 1 contains', W, P);
      const ry = 112;
      umiBlock(ctx, 110, 230, ry, P, '', 1, 30); text(ctx, 'UMI', 170, ry, { size: 14, color: P.ink, align: 'center', weight: 700 });
      block(ctx, 230, 320, ry, P.p7Dim, 1, 30); text(ctx, 'barcode', 275, ry, { size: 13, color: P.ink, align: 'center', weight: 600 });
      block(ctx, 320, 700, ry, P.dna, 1, 30); text(ctx, 'genomic sequence, often 20–40 nt', 510, ry, { size: 14, color: P.bg, align: 'center', weight: 600 });
      arrow(ctx, 110, ry - 28, 700, ry - 28, P.inkDim, { lw: 1.4, head: 7 });
      text(ctx, 'Read 1', 405, ry - 42, { size: 13, color: P.inkDim, align: 'center' });
      text(ctx, 'move UMI + barcode into the read name before aligning', 720, ry, { size: 13, color: P.inkDim, maxWidth: 190 });

      const gy = 214, gx0 = 100, gx1 = 860, site = 440;
      line(ctx, gx0, gy, gx1, gy, P.inkFaint, 4);
      text(ctx, 'genome', gx0, gy - 18, { size: 13, color: P.inkDim });
      const sa = sp(t, 12.6, 12.9);
      line(ctx, site, gy - 12, site, 468, P.gold, 2.5, sa, [6, 5]);
      dot(ctx, site, gy, 7, P.gold, sa);
      text(ctx, 'crosslink site', site - 12, gy - 18, { size: 14, color: P.gold, align: 'right', weight: 600, alpha: sa });
      text(ctx, '+1', site + 12, gy + 20, { size: 13, color: P.ink, weight: 600, alpha: sa });
      const pile = prog(t, 12.6, 13.4);
      READS.forEach((r, i) => {
        const a = prog(pile, i / READS.length, (i + 1) / READS.length);
        if (a <= 0) return;
        const y = 250 + i * 28;
        const x0 = site + 9;
        const dedup = sp(t, 13.9, 14.4);
        const col = r.dup ? P.alert : P.dna;
        line(ctx, x0, y, x0 + r.len, y, col, 9, a * (r.dup ? 1 - 0.75 * dedup : 1));
        umiBlock(ctx, x0 - 30, x0 - 6, y, P, '', a, 12);
        if (r.dup) text(ctx, 'same UMI: PCR copy', x0 + r.len + 12, y, { size: 12, color: P.alert, alpha: a * dedup });
      });
      text(ctx, 'every read starts at the same base: the pile-up is the signal, not a duplicate artefact', 250, 300, { size: 14, color: P.ink, align: 'center', maxWidth: 290, alpha: sp(t, 13.2, 13.7) });
      text(ctx, 'do not mark duplicates by position alone', 250, 340, { size: 14, color: P.alert, align: 'center', maxWidth: 290, alpha: sp(t, 13.5, 14.0) });
      footnote(ctx, 'read start = crosslink site + 1; deduplicate by UMI', W, H, P, sp(t, 13.4, 13.9));
      ctx.restore();
    }
  },
};
