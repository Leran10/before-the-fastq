// ATAC-seq: from aligned fragments to accessible regions.
// chrM, duplicates and blacklist piles are removed, cut sites are shifted
// +4/−5 to the Tn5 centre, fragment sizes and TSS enrichment are checked,
// then peaks are called on cut sites and FRiP is read off.
import { prog, sp, win, pulse, lerp, hash, text, callout, dot, line, arrow, roundRect, panelTitle, footnote, histogram, curve, withAlpha } from '../draw.js';

const GX0 = 80, GX1 = 690, GY = 268;      // genome line (chr region)
const TSS = 470;                          // TSS x
const PEAK = [412, 532];                  // called peak around the TSS
const PEAK2 = [238, 292];                 // a second, weaker peak
const BL = [118, 176];                    // blacklist region
const MX0 = 740, MX1 = 880;               // chrM pile
const ROW = 8, TOP = 256;                 // fragment rows stack upward from TOP

// ---- deterministic fragment set ----
function build() {
  const frags = [];
  // 1. genuine fragments: half near the TSS, some near peak 2, the rest uniform
  for (let i = 0; i < 64; i++) {
    const r = hash(i, 1);
    let x, len;
    if (r < 0.42) { x = TSS + (hash(i, 2) - 0.5) * 150; len = 22 + hash(i, 3) * 26; }           // NFR fragments at TSS
    else if (r < 0.55) { x = 265 + (hash(i, 2) - 0.5) * 60; len = 24 + hash(i, 3) * 26; }
    else { x = GX0 + 20 + hash(i, 2) * (GX1 - GX0 - 60); len = hash(i, 3) < 0.5 ? 26 + hash(i, 4) * 20 : 46 + hash(i, 4) * 30; } // includes nucleosomal
    frags.push({ x0: x - len / 2, x1: x + len / 2, kind: 'ok' });
  }
  // 2. duplicates: exact copies of a few TSS fragments
  const tssFr = frags.filter(f => Math.abs((f.x0 + f.x1) / 2 - TSS) < 50);
  for (let i = 0; i < 11; i++) { const s = tssFr[(i * 2) % tssFr.length]; frags.push({ x0: s.x0, x1: s.x1, kind: 'dup' }); }
  // 3. blacklist pile
  for (let i = 0; i < 14; i++) { const x = BL[0] + 8 + hash(i, 5) * (BL[1] - BL[0] - 36); frags.push({ x0: x, x1: x + 24 + hash(i, 6) * 12, kind: 'bl' }); }
  // stack rows greedily (deterministic order)
  const rows = [];
  for (const f of frags) {
    let r = 0;
    while (rows[r] && rows[r].some(g => g.x0 < f.x1 + 3 && g.x1 > f.x0 - 3)) r++;
    (rows[r] ||= []).push(f); f.row = r;
  }
  // chrM pile: dense stack on the right
  const mito = [];
  for (let i = 0; i < 40; i++) { const x = MX0 + 4 + hash(i, 7) * (MX1 - MX0 - 40); mito.push({ x0: x, x1: x + 22 + hash(i, 8) * 14, row: Math.floor(i / 4) * 1 + (i % 4) * 0, kind: 'mt' }); }
  // stack mito separately
  const mrows = [];
  for (const f of mito) { let r = 0; while (mrows[r] && mrows[r].some(g => g.x0 < f.x1 + 2 && g.x1 > f.x0 - 2)) r++; (mrows[r] ||= []).push(f); f.row = r; }
  return { frags, mito };
}
const { frags: FR, mito: MT } = build();
const inPeak = f => (f.x0 >= PEAK[0] && f.x1 <= PEAK[1]) || (f.x0 >= PEAK2[0] && f.x1 <= PEAK2[1]);

// fragment-size histogram with nucleosome periodicity (0..1), 36 bins ≈ 0–720 bp
const SIZES = Array.from({ length: 36 }, (_, i) => {
  const bp = (i + 0.5) * 20;
  const nfr = Math.exp(-((bp - 60) ** 2) / (2 * 35 ** 2));
  const mono = 0.55 * Math.exp(-((bp - 200) ** 2) / (2 * 40 ** 2));
  const di = 0.28 * Math.exp(-((bp - 400) ** 2) / (2 * 50 ** 2));
  const tri = 0.12 * Math.exp(-((bp - 600) ** 2) / (2 * 55 ** 2));
  return Math.min(1, nfr + mono + di + tri + 0.03);
});

export default {
  id: 'atac-fragments',
  duration: 15,
  thumbT: 9.2,
  phases: [
    { t: 0, label: 'Aligned fragments', caption: 'Each read pair is one Tn5 insertion pair; the fragment between the two cut sites is what was accessible. Piles form at the TSS, but also on chrM, in blacklist regions and as duplicates.' },
    { t: 2.5, label: 'Filter', caption: 'chrM alignments (often 10–50 % of reads), duplicates (20–50 %) and blacklist or low-MAPQ regions are removed. Most of the FASTQ is gone before any biology is read.' },
    { t: 5, label: 'Shift +4 / −5', caption: 'Tn5 inserts its two adapters 9 bp apart, so read starts are moved +4 (forward) and −5 (reverse) to the centre of the insertion. Footprinting and cut-site peaks depend on this.' },
    { t: 7.5, label: 'Sizes and TSS enrichment', caption: 'A usable library shows a nucleosome-free peak with periodic nucleosomal shoulders, and reads piled sharply on TSSs (ENCODE: below 5 concerning, above 7 ideal). A flat TSS profile is noise, whatever the depth.' },
    { t: 10.5, label: 'Peaks on cut sites', caption: 'Peaks are called on cut sites (MACS2 --shift -75 --extsize 150, Genrich, HMMRATAC). FRiP, the fraction of fragments in peaks, is the signal-to-noise of the sample and differs between cell types.' },
    { t: 13, label: 'Usable or not', caption: 'Depth, peak number and differential results all inherit these filters and metrics; compare them per sample before interpreting a difference as biology.' },
  ],
  draw(ctx, t, W, H, P) {
    const filt = sp(t, 2.8, 4.4);                // filtered fragments fade
    const shift = sp(t, 5.4, 6.6);
    const shiftShow = win(t, 5, 7.6, 0.4);
    const panels = sp(t, 7.6, 8.4);
    const peaks = sp(t, 10.8, 11.8);
    const final = sp(t, 13.2, 13.9);

    // ---- titles ----
    panelTitle(ctx, 'Aligned fragments over a promoter', W, P, win(t, 0, 2.5, 0.3));
    panelTitle(ctx, 'Remove chrM, duplicates, blacklist', W, P, win(t, 2.5, 5, 0.3));
    panelTitle(ctx, 'Shift read starts to the Tn5 centre', W, P, win(t, 5, 7.5, 0.3));
    panelTitle(ctx, 'Fragment sizes and TSS enrichment', W, P, win(t, 7.5, 10.5, 0.3));
    panelTitle(ctx, 'Peaks on cut sites, FRiP', W, P, win(t, 10.5, 13, 0.3));
    panelTitle(ctx, 'Metrics first, biology second', W, P, win(t, 13, 15, 0.3));

    // ---- genome line, TSS, blacklist band, peak bands ----
    // blacklist band
    {
      const a = 1 - filt * 0.75;
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = withAlpha(P.inkFaint, 0.35);
      ctx.fillRect(BL[0] - 4, 60, BL[1] - BL[0] + 8, GY - 60); ctx.restore();
      text(ctx, 'blacklist', (BL[0] + BL[1]) / 2, GY + 18, { size: 11, color: P.inkDim, align: 'center', alpha: a });
    }
    // called peaks (appear in phase 5)
    if (peaks > 0) {
      for (const [a, b] of [PEAK, PEAK2]) {
        ctx.save(); ctx.globalAlpha *= 0.22 * peaks; ctx.fillStyle = P.good; ctx.fillRect(a, 60, b - a, GY - 60); ctx.restore();
        ctx.save(); ctx.globalAlpha *= peaks; ctx.fillStyle = P.good; roundRect(ctx, a, GY + 8, b - a, 7, 3); ctx.fill(); ctx.restore();
      }
      text(ctx, 'peak', PEAK[1] + 6, GY + 11, { size: 11, color: P.good, alpha: peaks });
      text(ctx, 'peak', PEAK2[1] + 6, GY + 11, { size: 11, color: P.good, alpha: peaks });
    }
    line(ctx, GX0, GY, GX1, GY, P.dna, 3);
    // gene arrow from TSS
    arrow(ctx, TSS, GY, TSS + 90, GY, P.dnaDim, { lw: 2.5, head: 9 });
    line(ctx, TSS, GY, TSS, GY + 12, P.ink, 2);
    arrow(ctx, TSS, GY + 12, TSS + 22, GY + 12, P.ink, { lw: 2, head: 7 });
    text(ctx, 'TSS', TSS - 6, GY + 18, { size: 11.5, color: P.ink, align: 'right', weight: 600 });
    text(ctx, 'one promoter region', GX1, GY + 18, { size: 11, color: P.inkDim, align: 'right' });

    // chrM pile base
    {
      const a = 1 - filt;
      if (a > 0) {
        line(ctx, MX0 - 6, GY, MX1 + 6, GY, P.alert, 3, a);
        text(ctx, 'chrM', (MX0 + MX1) / 2, GY + 18, { size: 11.5, color: P.alert, align: 'center', alpha: a, weight: 600 });
      }
    }

    // ---- fragments ----
    const drawFrag = (f, color, alpha, dx0 = 0, dx1 = 0) => {
      if (alpha <= 0) return;
      const y = TOP - f.row * ROW;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
      roundRect(ctx, f.x0 + dx0, y - 3, f.x1 - f.x0 - dx0 + dx1, 6, 3); ctx.fill(); ctx.restore();
    };
    for (const f of FR) {
      let color = P.dna, alpha = 1;
      if (f.kind === 'dup') { color = P.alert; alpha = 1 - filt; }
      else if (f.kind === 'bl') { color = P.alertDim; alpha = 1 - filt; }
      else if (peaks > 0) color = inPeak(f) ? P.good : P.dnaDim;
      // shift: exaggerated ×2 px for visibility
      const dx0 = 8 * shift, dx1 = -10 * shift;
      drawFrag(f, color, alpha, dx0, dx1);
      // gold cut-site markers during the shift phase
      if (shiftShow > 0 && f.kind === 'ok') {
        const y = TOP - f.row * ROW;
        dot(ctx, f.x0 + dx0, y, 2.2, P.gold, shiftShow);
        dot(ctx, f.x1 + dx1, y, 2.2, P.gold, shiftShow);
      }
    }
    for (const f of MT) drawFrag(f, P.alert, 1 - filt);

    // labels in phase 1
    {
      const a = win(t, 0.4, 2.6, 0.3);
      callout(ctx, 'identical pairs = duplicates', 640, 90, P, { to: [TSS + 30, TOP - 10 * ROW], alpha: a, color: P.alert });
      text(ctx, 'nucleosome-free fragments pile on the TSS', 335, 104, { size: 12, color: P.inkDim, align: 'center', alpha: a });
    }
    // counts in the filter phase
    {
      const a = win(t, 2.7, 5.2, 0.3);
      const y0 = 330;
      const row = (label, pct, i) => {
        const yy = y0 + i * 34;
        const w = 220 * sp(t, 3.0 + i * 0.3, 3.8 + i * 0.3) * pct;
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.alert; roundRect(ctx, 300, yy - 8, w, 16, 4); ctx.fill(); ctx.restore();
        text(ctx, label, 290, yy, { size: 13, color: P.ink, align: 'right', alpha: a });
        text(ctx, `${Math.round(pct * 100)} %`, 306 + 220 * pct, yy, { size: 12.5, color: P.alert, alpha: a, mono: true });
      };
      row('chrM', 0.35, 0); row('duplicates', 0.20, 1); row('blacklist / MAPQ < 30', 0.05, 2);
      text(ctx, 'of the reads removed; typical bulk Omni-ATAC', 300, y0 + 3 * 34 + 2, { size: 12, color: P.inkDim, alpha: a });
      text(ctx, 'the remaining ~40 % are the experiment', 300, y0 + 3 * 34 + 22, { size: 12, color: P.inkDim, alpha: a });
    }

    // ---- shift inset (phase 3) ----
    if (shiftShow > 0) {
      const a = shiftShow, x = 200, y = 326, w = 560, h = 130;
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = P.panel; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; roundRect(ctx, x, y, w, h, 8); ctx.fill(); ctx.stroke(); ctx.restore();
      text(ctx, 'one Tn5 insertion, zoomed to the base', x + 14, y + 16, { size: 12, color: P.inkDim, alpha: a });
      const yF = y + 52, yR = y + 72, cx = x + 230;
      // two strands, 9 bp stagger: forward cut at cx-4.5*u, reverse at cx+4.5*u, u = 10 px per bp
      const u = 10;
      line(ctx, x + 30, yF, x + w - 30, yF, P.dna, 3, a);
      line(ctx, x + 30, yR, x + w - 30, yR, P.dnaDim, 3, a);
      // 9 bp duplicated stretch
      ctx.save(); ctx.globalAlpha *= a * 0.35; ctx.fillStyle = P.gold; ctx.fillRect(cx - 4.5 * u, yF - 6, 9 * u, yR - yF + 12); ctx.restore();
      text(ctx, '9 bp duplicated', cx, yR + 34, { size: 11, color: P.gold, align: 'center', alpha: a, weight: 600 });
      // read starts
      dot(ctx, cx - 4.5 * u, yF, 4, P.p5, a); text(ctx, 'R1 start', cx - 4.5 * u - 6, yF - 14, { size: 11, color: P.p5, align: 'right', alpha: a });
      dot(ctx, cx + 4.5 * u, yR, 4, P.p7, a); text(ctx, 'R2 start', cx + 4.5 * u + 6, yR + 16, { size: 11, color: P.p7, alpha: a });
      // arrows to centre
      const s = shift;
      arrow(ctx, cx - 4.5 * u, yF + 0, cx - 4.5 * u + 4 * u * s + 0.01, yF, P.gold, { lw: 2.5, head: 7, alpha: a * (s > 0.05 ? 1 : 0) });
      arrow(ctx, cx + 4.5 * u, yR, cx + 4.5 * u - 5 * u * s - 0.01, yR, P.gold, { lw: 2.5, head: 7, alpha: a * (s > 0.05 ? 1 : 0) });
      line(ctx, cx, yF - 10, cx, yR + 8, P.gold, 1.5, a * s, [3, 3]);
      text(ctx, '+4', cx - 2.5 * u, yF - 14, { size: 11, color: P.gold, align: 'center', alpha: a * s, weight: 600 });
      text(ctx, '−5', cx + 2.5 * u, yR + 16, { size: 11, color: P.gold, align: 'center', alpha: a * s, weight: 600 });
      text(ctx, 'Tn5 centre', cx + 8, yF - 26, { size: 11, color: P.gold, alpha: a * s });
      text(ctx, 'alignmentSieve --ATACshift / ATACseqQC', x + w - 14, y + 16, { size: 11, color: P.inkDim, align: 'right', alpha: a, mono: true });
    }

    // ---- QC panels (phase 4 onward) ----
    if (panels > 0) {
      const a = panels * (1 - final * 0.0);
      // fragment-size histogram
      const hx = 80, hy = 318, hw = 330, hh = 118;
      histogram(ctx, hx, hy, hw, hh, SIZES.map((v, i) => v * sp(t, 7.7 + i * 0.015, 8.1 + i * 0.015)), P, { color: P.dna, alpha: a, labelL: '0 bp', labelR: '720 bp', title: 'fragment size' });
      text(ctx, 'nucleosome-free', hx + 44, hy + 6, { size: 11, color: P.ink, alpha: a * sp(t, 8.2, 8.6) });
      text(ctx, 'mono', hx + 92, hy + 38, { size: 11, color: P.ink, align: 'center', alpha: a * sp(t, 8.4, 8.8) });
      text(ctx, 'di', hx + 183, hy + 68, { size: 11, color: P.ink, align: 'center', alpha: a * sp(t, 8.6, 9.0) });
      text(ctx, 'tri', hx + 275, hy + 86, { size: 11, color: P.ink, align: 'center', alpha: a * sp(t, 8.8, 9.2) });
      text(ctx, 'periodicity = intact nuclei, right Tn5 dose', hx, hy + hh + 30, { size: 11.5, color: P.good, alpha: a * sp(t, 9.0, 9.5) });

      // TSS enrichment curves
      const cx = 520, cy = 318, cw = 360, ch = 118;
      ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy + ch + 0.5); ctx.lineTo(cx + cw, cy + ch + 0.5); ctx.stroke(); ctx.restore();
      text(ctx, 'signal around TSSs', cx, cy - 10, { size: 12, color: P.inkDim, alpha: a });
      text(ctx, '−1 kb', cx, cy + ch + 14, { size: 11, color: P.inkDim, alpha: a });
      text(ctx, 'TSS', cx + cw / 2, cy + ch + 14, { size: 11, color: P.inkDim, align: 'center', alpha: a });
      text(ctx, '+1 kb', cx + cw, cy + ch + 14, { size: 11, color: P.inkDim, align: 'right', alpha: a });
      line(ctx, cx + cw / 2, cy, cx + cw / 2, cy + ch, P.inkFaint, 1, a, [3, 3]);
      const g = sp(t, 8.0, 9.0), b = sp(t, 8.6, 9.4);
      curve(ctx, cx, cy, cw, ch, u => 0.08 + 0.88 * g * Math.exp(-((u - 0.5) ** 2) / (2 * 0.045 ** 2)) + 0.05 * Math.sin(u * 40) * 0.3, P.good, { lw: 2.5, alpha: a });
      curve(ctx, cx, cy, cw, ch, u => 0.08 + 0.12 * b * Math.exp(-((u - 0.5) ** 2) / (2 * 0.12 ** 2)) + 0.025 * Math.sin(u * 55 + 1), P.alert, { lw: 2.5, alpha: a, dash: [5, 4] });
      text(ctx, 'TSS score ≈ 11  usable', cx + cw / 2 + 24, cy + 14, { size: 12, color: P.good, alpha: a * g, weight: 600 });
      text(ctx, 'TSS score ≈ 2.5  noise', cx + cw / 2 + 70, cy + ch - 32, { size: 12, color: P.alert, alpha: a * b, weight: 600 });
    }

    // ---- FRiP in phase 5 ----
    if (peaks > 0) {
      const n = FR.filter(f => f.kind === 'ok').length, k = FR.filter(f => f.kind === 'ok' && inPeak(f)).length;
      const a = peaks;
      const x = 720, y = 92;
      text(ctx, 'FRiP', x, y, { size: 12.5, color: P.inkDim, alpha: a });
      text(ctx, `${k} / ${n} = ${(k / n).toFixed(2)}`, x, y + 20, { size: 15, color: P.good, alpha: a, weight: 600, mono: true });
      text(ctx, 'fragments in peaks', x, y + 40, { size: 11, color: P.inkDim, alpha: a });
      text(ctx, 'typical 0.2–0.5; cell-type dependent', x, y + 56, { size: 11, color: P.inkDim, alpha: a });
      text(ctx, 'outside peaks = background', x, y + 80, { size: 11, color: P.dnaDim, alpha: a });
    }

    // ---- final takeaway ----
    if (final > 0) {
      const a = final;
      const x = 720, y = 208;
      text(ctx, 'per sample, before biology:', x, y, { size: 12, color: P.ink, alpha: a, weight: 600 });
      ['chrM %, duplicate %', 'size periodicity', 'TSS enrichment', 'FRiP, peaks called'].forEach((s, i) => {
        dot(ctx, x + 5, y + 20 + i * 17, 3, i < 2 ? P.alert : P.good, a);
        text(ctx, s, x + 14, y + 20 + i * 17, { size: 11.5, color: P.inkDim, alpha: a });
      });
      footnote(ctx, 'TSS enrichment and FRiP decide whether the library is usable', W, H, P, a);
    }
  },
};
