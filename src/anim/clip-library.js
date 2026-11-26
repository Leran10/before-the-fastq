// CLIP library: 3′ adapter with UMI ligated to the RNA footprint, reverse
// transcription that stops at the crosslink remnant, a second adapter on the
// cDNA, many PCR cycles, and the read whose start is the crosslink site + 1.
import { prog, sp, win, pulse, lerp, hash, text, ssStrand, blob, dot, line, arrow, roundRect, panelTitle, footnote } from '../draw.js';

// scene A geometry (one molecule, large and centred)
const RNA = { x0: 120, x1: 580, y: 235 };
const XL = 350;                 // crosslink position on the RNA
const AD3 = { x0: 580, x1: 760 }; // 3′ adapter
const BC = { x0: 600, x1: 640 };  // in-line barcode
const UMI = { x0: 650, x1: 712 }; // UMI
const CY = RNA.y + 54;          // cDNA strand y (antiparallel, below)
const STOP = XL + 12;            // cDNA 5′ end: one nucleotide short of the crosslinked base
const AD5 = { x0: 200, x1: STOP }; // second adapter on the cDNA 3′ end

// PCR copies: three UMI families
const FAMILIES = [
  { umi: 'TGCA', n: 4 },
  { umi: 'GATC', n: 2 },
  { umi: 'CCAT', n: 3 },
];
const ROWS = [];
FAMILIES.forEach((f, fi) => { for (let c = 0; c < f.n; c++) ROWS.push({ fi, c, umi: f.umi }); });

// aligned reads in the final panel
const READS = Array.from({ length: 9 }, (_, i) => ({ len: 95 + 110 * hash(i, 21), dup: i === 2 || i === 5 || i === 7 }));

function umiBlock(ctx, x0, x1, y, P, label, alpha = 1, h = 10) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = P.gold;
  roundRect(ctx, x0, y - h / 2, x1 - x0, h, 2); ctx.fill(); ctx.restore();
  if (label) text(ctx, label, (x0 + x1) / 2, y, { size: 8, color: P.ink, align: 'center', mono: true, weight: 700, alpha });
}
function block(ctx, x0, x1, y, color, alpha = 1, h = 10) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  roundRect(ctx, x0, y - h / 2, x1 - x0, h, 2); ctx.fill(); ctx.restore();
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
    { t: 13, label: 'The read start is the data', caption: 'Read 1 begins with the UMI and barcode, then genomic sequence. Aligned reads pile up with their 5′ ends one base downstream of the crosslink site.' },
  ],
  draw(ctx, t, W, H, P) {
    // ───────────── scene A: one molecule ─────────────
    const sceneA = 1 - sp(t, 10.3, 10.9);
    if (sceneA > 0) {
      ctx.save(); ctx.globalAlpha *= sceneA;
      panelTitle(ctx, 'From RNA footprint to cDNA', W, P);

      const adIn = sp(t, 2.7, 3.6);          // adapter slides in
      const rt = sp(t, 5.4, 7.4);            // RT progress
      const rnaFade = 1 - 0.75 * sp(t, 8.0, 8.8);
      const ad5 = sp(t, 8.4, 9.3);

      // RNA strand
      ssStrand(ctx, RNA.x0, RNA.y, RNA.x1, RNA.y, { color: P.rna, side: -1, alpha: rnaFade, lw: 5, tickEvery: 12, tickLen: 7 });
      text(ctx, '5′', RNA.x0 - 18, RNA.y, { size: 14, color: P.rna, align: 'center', alpha: rnaFade });
      text(ctx, '3′', RNA.x1 + 14, RNA.y, { size: 14, color: P.rna, align: 'center', alpha: rnaFade * (1 - adIn) });
      // crosslink remnant
      blob(ctx, XL, RNA.y - 20, 14, P.enzymeDim, { seed: 5, alpha: rnaFade, stroke: P.inkDim });
      dot(ctx, XL, RNA.y, 7, P.gold, 1);
      text(ctx, 'peptide remnant at the crosslinked base', XL, RNA.y - 50, { size: 13, color: P.inkDim, align: 'center', alpha: win(t, 0.3, 5.0, 0.3) });
      text(ctx, '20–100 nt RNA', RNA.x0 + 60, RNA.y + 26, { size: 13, color: P.rna, alpha: win(t, 0.3, 2.6, 0.3) });

      // 3′ adapter (arrives from the right)
      if (adIn > 0) {
        const dx = lerp(160, 0, adIn);
        ssStrand(ctx, AD3.x0 + dx, RNA.y, AD3.x1 + dx, RNA.y, { color: P.p7, side: -1, lw: 5, alpha: rnaFade, tickEvery: 12, tickLen: 7 });
        block(ctx, BC.x0 + dx, BC.x1 + dx, RNA.y, P.p7Dim, rnaFade, 16);
        umiBlock(ctx, UMI.x0 + dx, UMI.x1 + dx, RNA.y, P, 'UMI', rnaFade, 16);
        text(ctx, 'barcode', (BC.x0 + BC.x1) / 2 + dx, RNA.y - 22, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 3.4, 5.2, 0.3) });
        text(ctx, '3′ adapter', AD3.x1 + dx + 14, RNA.y, { size: 13, color: P.p7, alpha: win(t, 2.8, 5.2, 0.3) });
        // ligase
        const lg = win(t, 2.6, 4.6, 0.3);
        blob(ctx, AD3.x0 + dx, RNA.y + 24, 14, P.enzyme, { seed: 8, alpha: lg, stroke: P.inkDim });
        text(ctx, 'T4 RNA ligase', AD3.x0 + dx, RNA.y + 52, { size: 11, color: P.inkDim, align: 'center', alpha: lg });
      }

      // reverse transcription: cDNA grows from the adapter end leftwards
      if (rt > 0) {
        const head = lerp(AD3.x1, STOP, rt);
        ssStrand(ctx, AD3.x1, CY, head, CY, { color: P.dna, side: 1, lw: 5, tickEvery: 12, tickLen: 7 });
        const rta = win(t, 5.0, 8.4, 0.3);
        blob(ctx, head - 2, CY + 20, 17, P.enzyme, { seed: 12, alpha: rta, stroke: P.inkDim });
        text(ctx, 'reverse transcriptase', head - 2, CY + 52, { size: 11, color: P.inkDim, align: 'center', alpha: rta });
        if (rt >= 1) {
          // bump against the remnant
          const b = pulse(t, 7.4, 8.0);
          dot(ctx, STOP, CY, 5 + 8 * b, P.alert, 0.7 * b);
          text(ctx, 'stops: cDNA ends at crosslink + 1', STOP, CY + 82, { size: 13, color: P.ink, align: 'center', weight: 600, alpha: win(t, 7.4, 10.3, 0.3) });
          arrow(ctx, STOP, CY + 68, STOP, CY + 12, P.ink, { lw: 1.5, head: 6, alpha: win(t, 7.4, 10.3, 0.3) });
        }
        text(ctx, 'cDNA', AD3.x1 + 16, CY, { size: 13, color: P.dna, alpha: win(t, 5.6, 10.3, 0.3) });
      }
      // second adapter on the cDNA 3′ end
      if (ad5 > 0) {
        const dx = lerp(-120, 0, ad5);
        ssStrand(ctx, AD5.x0 + dx, CY, AD5.x1 + dx, CY, { color: P.p5, side: 1, lw: 5, tickEvery: 12, tickLen: 7 });
        text(ctx, 'second adapter', AD5.x0 + dx - 12, CY, { size: 13, color: P.p5, align: 'right', alpha: ad5 });
        const lg = win(t, 8.3, 10.0, 0.3);
        blob(ctx, STOP, CY - 22, 13, P.enzyme, { seed: 9, alpha: lg, stroke: P.inkDim });
        text(ctx, 'ssDNA ligase (eCLIP) or circularise (iCLIP)', 480, 425, { size: 12, color: P.inkDim, align: 'center', alpha: lg });
      }
      // phase-0/1 explanation line
      text(ctx, 'a standard RNA-seq library would need read-through to the first adapter; this one keeps the truncated cDNA', 480, 462, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 8.6, 10.3, 0.3) });
      ctx.restore();
    }

    // ───────────── scene B: PCR copies and UMI families ─────────────
    const sceneB = win(t, 10.5, 13.2, 0.5);
    if (sceneB > 0) {
      ctx.save(); ctx.globalAlpha *= sceneB;
      panelTitle(ctx, 'PCR: many copies, few molecules', W, P);
      const cyc = Math.min(20, Math.floor(1 + 19 * prog(t, 10.8, 12.0)));
      text(ctx, `cycle ${cyc} of 15–25`, 480, 72, { size: 14, color: P.gold, align: 'center', weight: 600, mono: true });
      const grow = prog(t, 10.9, 12.0);
      const collapse = sp(t, 12.2, 12.8);
      const x0 = 170, len = 380;
      ROWS.forEach((r, i) => {
        const a = prog(grow, i / ROWS.length, (i + 1) / ROWS.length);
        if (a <= 0) return;
        const y = 110 + i * 24;
        // molecule: p5 | cDNA | adapter(p7) with UMI
        const isDup = r.c > 0;
        const fade = isDup ? 1 - 0.8 * collapse : 1;
        ctx.save(); ctx.globalAlpha *= a * fade;
        line(ctx, x0, y, x0 + 50, y, P.p5, 4);
        line(ctx, x0 + 50, y, x0 + len - 90, y, P.dna, 4);
        line(ctx, x0 + len - 90, y, x0 + len, y, P.p7, 4);
        block(ctx, x0 + len - 78, x0 + len - 62, y, P.p7Dim);
        umiBlock(ctx, x0 + len - 56, x0 + len - 20, y, P, r.umi);
        ctx.restore();
        if (isDup) text(ctx, 'PCR copy', x0 + len + 14, y, { size: 11, color: P.alert, alpha: a * collapse });
        else text(ctx, 'molecule ' + (r.fi + 1), x0 + len + 14, y, { size: 11, color: P.good, alpha: a * collapse, weight: 600 });
      });
      // collapse summary
      const sx = 700;
      text(ctx, `${ROWS.length} reads`, sx + 60, 160, { size: 15, color: P.ink, align: 'center', weight: 600, alpha: grow >= 1 ? 1 : 0 });
      arrow(ctx, sx + 60, 180, sx + 60, 226, P.ink, { lw: 1.5, head: 7, alpha: collapse });
      text(ctx, 'same UMI + same start', sx + 60, 203, { size: 11, color: P.inkDim, align: 'center', alpha: collapse });
      text(ctx, '3 molecules', sx + 60, 246, { size: 15, color: P.good, align: 'center', weight: 600, alpha: collapse });
      text(ctx, 'duplication 50–90 % is normal here', sx + 60, 300, { size: 12, color: P.inkDim, align: 'center', alpha: collapse, maxWidth: 220 });
      text(ctx, 'count unique molecules, not reads', sx + 60, 320, { size: 12, color: P.inkDim, align: 'center', alpha: collapse, maxWidth: 220 });
      ctx.restore();
    }

    // ───────────── scene C: the read and the pile-up ─────────────
    const sceneC = sp(t, 12.9, 13.4);
    if (sceneC > 0) {
      ctx.save(); ctx.globalAlpha *= sceneC;
      panelTitle(ctx, 'What Read 1 contains', W, P);
      // read structure bar
      const ry = 105;
      umiBlock(ctx, 150, 240, ry, P, '', 1, 18); text(ctx, 'UMI', 195, ry, { size: 11, color: P.ink, align: 'center', weight: 700 });
      block(ctx, 240, 300, ry, P.p7Dim, 1, 18); text(ctx, 'barcode', 270, ry, { size: 10, color: P.ink, align: 'center', weight: 600 });
      block(ctx, 300, 640, ry, P.dna, 1, 18); text(ctx, 'genomic sequence, often 20–40 nt', 470, ry, { size: 11, color: P.bg, align: 'center', weight: 600 });
      arrow(ctx, 150, ry - 20, 640, ry - 20, P.inkDim, { lw: 1.2, head: 6 });
      text(ctx, 'Read 1', 395, ry - 32, { size: 11, color: P.inkDim, align: 'center' });
      text(ctx, 'move UMI + barcode into the read name before aligning', 660, ry, { size: 11.5, color: P.inkDim, maxWidth: 250 });

      // genome and crosslink site
      const gy = 200, gx0 = 120, gx1 = 840, site = 480;
      line(ctx, gx0, gy, gx1, gy, P.inkFaint, 3);
      text(ctx, 'genome', gx0, gy - 16, { size: 11, color: P.inkDim });
      const sa = sp(t, 13.6, 14.2);
      line(ctx, site, gy - 10, site, 450, P.gold, 2, sa, [5, 4]);
      dot(ctx, site, gy, 5, P.gold, sa);
      text(ctx, 'crosslink site', site - 8, gy - 16, { size: 12, color: P.gold, align: 'right', weight: 600, alpha: sa });
      text(ctx, '+1', site + 8, gy + 16, { size: 11, color: P.ink, weight: 600, alpha: sa });
      // reads piling up, 5′ ends at site + 1
      const pile = prog(t, 13.4, 14.6);
      READS.forEach((r, i) => {
        const a = prog(pile, i / READS.length, (i + 1) / READS.length);
        if (a <= 0) return;
        const y = 232 + i * 23;
        const x0 = site + 7;
        const dedup = sp(t, 14.4, 14.9);
        const col = r.dup ? P.alert : P.dna;
        line(ctx, x0, y, x0 + r.len, y, col, 6, a * (r.dup ? 1 - 0.75 * dedup : 1));
        umiBlock(ctx, x0 - 22, x0 - 4, y, P, '', a, 8);
        if (r.dup) text(ctx, 'same UMI: PCR copy', x0 + r.len + 10, y, { size: 10.5, color: P.alert, alpha: a * dedup });
      });
      text(ctx, 'every read starts at the same base: the pile-up is the signal, not a duplicate artefact', 270, 300, { size: 12, color: P.ink, align: 'center', maxWidth: 300, alpha: sp(t, 14.0, 14.5) });
      text(ctx, 'do not mark duplicates by position alone', 270, 322, { size: 12, color: P.alert, align: 'center', alpha: sp(t, 14.2, 14.7) });
      footnote(ctx, 'read start = crosslink site + 1; deduplicate by UMI', W, H, P, sp(t, 14.0, 14.6));
      ctx.restore();
    }
  },
};
