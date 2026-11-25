// Droplet generation on the Chromium chip: cells, gel beads and oil meet at a
// junction and form GEMs; Poisson loading decides occupancy; the bead oligo
// anatomy; loading vs doublet rate.
import { prog, sp, win, pulse, lerp, hash, text, callout, cellShape, bead, blob, dot, line, arrow, roundRect, curve, baseRow, fakeSeq, withAlpha } from '../draw.js';

const JX = 430, JY = 260;            // junction
const OUT_X1 = 930;                  // right end of outlet channel
const SPACING = 62, SPEED = 95;      // droplet conveyor
const N_CONV = 12;

// Field of droplets for the Poisson scene (10 x 5)
const FIELD = [];
{
  const cols = 10, rows = 5;
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    let cells = 0;
    if ([3, 11, 17, 24, 28, 36, 41, 47].includes(i)) cells = 1;
    if (i === 22) cells = 2;                       // the doublet
    FIELD.push({ i, x: 95 + c * 60, y: 110 + r * 62, cells, col: Math.floor(hash(i, 3) * 6) });
  }
}

function dropletContents(k) {
  // conveyor droplet k: 0/1/2 cells by hash (shown denser than reality so the stream is readable)
  const h = hash(k, 7);
  return h < 0.62 ? 0 : h < 0.94 ? 1 : 2;
}

function oligoFuzz(ctx, x, y, r, P, alpha, seed = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = withAlpha(P.p5, 0.8); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + hash(i, seed); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5)); }
  ctx.stroke(); ctx.restore();
}

function droplet(ctx, x, y, r, P, alpha, contents, colIdx, seed, o = {}) {
  if (alpha <= 0) return;
  const { beadR = r * 0.42, cellR = r * 0.38, doubletMark = false } = o;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = withAlpha(P.liquid, 0.45); ctx.strokeStyle = P.glass; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // one bead, slightly off-centre
  const bx = x - r * 0.25, by = y + r * 0.15;
  bead(ctx, bx, by, beadR, P, 1);
  oligoFuzz(ctx, bx, by, beadR, P, 0.7, seed);
  // cells
  for (let c = 0; c < contents; c++) {
    const cx = x + r * 0.35 - c * r * 0.3, cy = y - r * 0.35 + c * r * 0.55;
    const col = P.samples[(colIdx + c * 2) % 6];
    cellShape(ctx, cx, cy, cellR, P, { fill: withAlpha(col, 0.55), stroke: col, seed, wall: 0.8 });
  }
  if (doubletMark) { ctx.strokeStyle = P.alert; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

// one bead oligo drawn linearly; returns right x
function oligo(ctx, x, y, P, o = {}) {
  const { cbColor = P.samples[2], umiSeed = 1, alpha = 1, scale = 1, labels = false } = o;
  if (alpha <= 0) return x;
  const h = 10 * scale;
  const segs = [
    { w: 46 * scale, c: P.p5, l: 'Read 1 site' },
    { w: 64 * scale, c: cbColor, l: 'cell barcode · 16 nt' },
    { w: 48 * scale, c: P.gold, l: 'UMI · 12 nt' },
    { w: 70 * scale, c: P.inkFaint, l: 'poly(dT) · 30 nt' },
  ];
  let cx = x;
  ctx.save(); ctx.globalAlpha *= alpha;
  segs.forEach((s, i) => {
    ctx.fillStyle = s.c; roundRect(ctx, cx, y - h / 2, s.w - 2, h, 2); ctx.fill();
    if (i === 2) {
      // UMI pattern: a few darker ticks so each oligo looks different
      ctx.fillStyle = withAlpha(P.ink, 0.45);
      for (let k = 0; k < 12; k++) if (hash(k, umiSeed) > 0.5) ctx.fillRect(cx + 2 + k * (s.w - 6) / 12, y - h / 2 + 2, 2, h - 4);
    }
    if (i === 3) { ctx.restore(); text(ctx, 'TTTTTTTTTTTTT', cx + (s.w - 2) / 2, y, { size: 7.5 * scale, color: P.inkDim, align: 'center', mono: true, alpha }); ctx.save(); ctx.globalAlpha *= alpha; }
    if (labels) { ctx.restore(); text(ctx, s.l, cx + (s.w - 2) / 2, y + (i % 2 ? 22 : -18), { size: 11, color: i === 1 ? cbColor : i === 2 ? P.gold : P.inkDim, align: 'center', alpha }); ctx.save(); ctx.globalAlpha *= alpha; }
    cx += s.w;
  });
  ctx.restore();
  return cx;
}

export default {
  id: 'droplet-encapsulation',
  duration: 13,
  thumbT: 4.6,
  phases: [
    { t: 0, label: 'The chip', caption: 'Cells in RT reagent meet a stream of close-packed gel beads and are pinched off by oil into droplets, about 100,000 per channel.' },
    { t: 3.2, label: 'Poisson loading', caption: 'Nearly every droplet gets one bead. Cells are dilute, so most droplets are empty, some hold one cell, and a few hold two.' },
    { t: 6.6, label: 'The bead oligo', caption: 'Each bead carries millions of copies of one oligo: Read 1 site, a 16-nt cell barcode shared by the whole bead, a 12-nt UMI unique to each oligo, and poly(dT).' },
    { t: 9.8, label: 'Loading decides doublets', caption: 'More cells loaded means more cells recovered and more doublets, about 0.8 % per 1,000 cells recovered. The rate is fixed here, before any sequencing.' },
  ],
  draw(ctx, t, W, H, P) {
    // ───── scene A: chip junction (0 – 3.4) ─────
    const aA = win(t, 0, 3.4, 0.5);
    if (aA > 0) {
      ctx.save(); ctx.globalAlpha *= aA;
      const chan = (x1, y1, x2, y2, w) => { ctx.strokeStyle = withAlpha(P.liquid, 0.7); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
      // inlet channels: cells from top-left, beads from bottom-left, oil from top and bottom at the junction
      chan(60, 150, JX, JY, 30); chan(60, 370, JX, JY, 30); chan(JX + 40, 90, JX + 40, JY, 22); chan(JX + 40, 430, JX + 40, JY, 22);
      // outlet channel
      ctx.strokeStyle = withAlpha(P.liquid, 0.7); ctx.lineWidth = 56; ctx.beginPath(); ctx.moveTo(JX, JY); ctx.lineTo(OUT_X1, JY); ctx.stroke();
      ctx.restore();
      // oil (two flat shapes) labels
      text(ctx, 'oil', JX + 40, 72, { size: 12, color: P.inkDim, align: 'center', alpha: aA });
      text(ctx, 'oil', JX + 40, 452, { size: 12, color: P.inkDim, align: 'center', alpha: aA });
      text(ctx, 'cells + RT reagent', 60, 122, { size: 12, color: P.ink, alpha: aA });
      text(ctx, 'gel beads, close-packed', 60, 398, { size: 12, color: P.ink, alpha: aA });
      // moving cells along the top inlet
      for (let k = 0; k < 7; k++) {
        const u = ((t * 0.22 + k * 0.143) % 1);
        const x = lerp(60, JX - 14, u), y = lerp(150, JY - 8, u);
        const col = P.samples[k % 6];
        cellShape(ctx, x, y + (hash(k, 2) - 0.5) * 10, 7, P, { fill: withAlpha(col, 0.55), stroke: col, alpha: aA, wall: 0.8 });
      }
      // moving beads along the bottom inlet (dense)
      for (let k = 0; k < 16; k++) {
        const u = ((t * 0.22 + k * 0.0625) % 1);
        const x = lerp(60, JX - 10, u), y = lerp(370, JY + 6, u);
        bead(ctx, x, y + (k % 2 ? 5 : -5), 7, P, aA);
      }
      // droplets on the conveyor
      for (let k = 0; k < N_CONV; k++) {
        const L = OUT_X1 - JX + SPACING;
        const p = (k * SPACING + t * SPEED) % L;
        const x = JX + p;
        if (x > OUT_X1) continue;
        const form = prog(x - JX, 0, 50);                 // pinch-off: grows from the junction
        const n = dropletContents(k);
        droplet(ctx, x, JY, lerp(8, 22, form), P, aA * form, n, k % 6, k, { doubletMark: n === 2 && form > 0.9 });
      }
      callout(ctx, 'droplets (GEMs) pinch off at the junction', JX + 90, JY - 52, P, { alpha: aA * win(t, 0.8, 3.4, 0.3), size: 12, color: P.inkDim });
      text(ctx, 'one bead per droplet, cells by chance', JX + 120, JY + 54, { size: 12, color: P.inkDim, alpha: aA * win(t, 1.6, 3.4, 0.3) });
    }

    // ───── scene B: Poisson field (3.2 – 6.8) ─────
    const aB = win(t, 3.2, 6.8, 0.5);
    if (aB > 0) {
      FIELD.forEach(d => {
        const show = aB * sp(t, 3.3 + hash(d.i, 9) * 0.6, 3.8 + hash(d.i, 9) * 0.6);
        droplet(ctx, d.x, d.y, 24, P, show, d.cells, d.col, d.i, { doubletMark: d.cells === 2 && t > 5.2 });
      });
      const la = aB * win(t, 4.2, 6.8, 0.3);
      text(ctx, '50 droplets: 50 beads, 10 cells, 1 doublet', 95, 72, { size: 14, color: P.ink, weight: 600, alpha: la });
      // legend
      const ly = 408;
      droplet(ctx, 110, ly + 10, 13, P, la, 0, 0, 101); text(ctx, 'empty: bead + ambient RNA only  (~90 % of barcodes in the raw matrix)', 132, ly + 10, { size: 11.5, color: P.inkDim, alpha: la });
      droplet(ctx, 110, ly + 44, 13, P, la, 1, 2, 102); text(ctx, 'one cell: what you want', 132, ly + 44, { size: 11.5, color: P.inkDim, alpha: la });
      droplet(ctx, 110, ly + 78, 13, P, la, 2, 4, 103, { doubletMark: true }); text(ctx, 'two cells: a doublet, one barcode for two transcriptomes', 132, ly + 78, { size: 11.5, color: P.alert, alpha: la });
      const dbl = FIELD[22];
      callout(ctx, 'doublet', dbl.x + 32, dbl.y - 30, P, { alpha: aB * win(t, 5.2, 6.8, 0.3), size: 12, color: P.alert, to: [dbl.x + 20, dbl.y - 18] });
      text(ctx, 'occupancy follows a Poisson distribution set by the cell concentration', 700, ly + 44, { size: 11.5, color: P.inkDim, align: 'center', alpha: la, maxWidth: 400 });
    }

    // ───── scene C: bead oligo (6.6 – 10.0) ─────
    const aC = win(t, 6.6, 10.0, 0.5);
    if (aC > 0) {
      // big droplet with one bead, oligos radiating
      const cx = 200, cy = 250, r = 120;
      ctx.save(); ctx.globalAlpha *= aC;
      ctx.fillStyle = withAlpha(P.liquid, 0.45); ctx.strokeStyle = P.glass; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      bead(ctx, cx, cy, 48, P, aC);
      ctx.save(); ctx.globalAlpha *= aC; ctx.lineWidth = 1.5;
      for (let i = 0; i < 28; i++) {
        const a = i / 28 * Math.PI * 2 + 0.1;
        const x0 = cx + Math.cos(a) * 48, y0 = cy + Math.sin(a) * 48;
        const x1 = cx + Math.cos(a) * 62, y1 = cy + Math.sin(a) * 62, x2 = cx + Math.cos(a) * 74, y2 = cy + Math.sin(a) * 74;
        ctx.strokeStyle = P.p5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = P.samples[2]; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.restore();
      text(ctx, 'one gel bead ≈ 10⁶ oligos', cx, cy + r + 24, { size: 12, color: P.inkDim, align: 'center', alpha: aC });
      // three oligos, same barcode, different UMI
      const ox = 400;
      text(ctx, 'every oligo on this bead', ox, 110, { size: 14, color: P.ink, weight: 600, alpha: aC });
      const first = aC * sp(t, 7.0, 7.6);
      oligo(ctx, ox, 160, P, { cbColor: P.samples[2], umiSeed: 11, alpha: first, scale: 2, labels: true });
      [2, 3].forEach((k, j) => {
        const a = aC * sp(t, 7.8 + j * 0.5, 8.3 + j * 0.5);
        oligo(ctx, ox, 230 + j * 40, P, { cbColor: P.samples[2], umiSeed: 20 + k, alpha: a, scale: 2 });
      });
      text(ctx, '…', ox + 228, 300, { size: 16, color: P.inkDim, alpha: aC * sp(t, 8.6, 9.0) });
      const na = aC * win(t, 8.8, 10.0, 0.3);
      text(ctx, 'same barcode on all of them → “this cell”', ox, 345, { size: 12.5, color: P.samples[2], alpha: na });
      text(ctx, 'different UMI on each → “this molecule”', ox, 368, { size: 12.5, color: P.gold, alpha: na });
      text(ctx, '~3.6 million barcodes in the v3 whitelist; two cells sharing one by chance is rare', ox, 400, { size: 11.5, color: P.inkDim, alpha: na, maxWidth: 520 });
    }

    // ───── scene D: loading vs doublets (9.8 – 13) ─────
    const aD = win(t, 9.8, 13.5, 0.5);
    if (aD > 0) {
      const X = 120, Y = 110, Wd = 440, Hd = 280;
      text(ctx, 'cells recovered vs doublet rate (10x 3′ v3)', X, 78, { size: 14, color: P.ink, weight: 600, alpha: aD });
      line(ctx, X, Y + Hd + 0.5, X + Wd, Y + Hd + 0.5, P.inkFaint, 1, aD);
      line(ctx, X + 0.5, Y, X + 0.5, Y + Hd, P.inkFaint, 1, aD);
      [0, 2, 4, 6, 8, 10].forEach(k => { const x = X + Wd * k / 10; text(ctx, k ? `${k}k` : '0', x, Y + Hd + 16, { size: 11, color: P.inkDim, align: 'center', alpha: aD }); });
      text(ctx, 'cells recovered', X + Wd / 2, Y + Hd + 36, { size: 12, color: P.inkDim, align: 'center', alpha: aD });
      [0, 2, 4, 6, 8].forEach(k => { const y = Y + Hd - Hd * k / 8; text(ctx, `${k} %`, X - 10, y, { size: 11, color: P.inkDim, align: 'right', alpha: aD }); });
      const g = sp(t, 10.2, 11.4);
      line(ctx, X, Y + Hd, X + Wd * g, Y + Hd - Hd * g, P.gold, 2.5, aD);   // 0.8 % per 1,000 → 8 % at 10k
      // markers
      [[1, 0.8], [5, 4], [10, 8]].forEach(([k, pct], j) => {
        const show = aD * sp(t, 10.3 + j * 0.4, 10.7 + j * 0.4);
        const x = X + Wd * k / 10, y = Y + Hd - Hd * pct / 8;
        dot(ctx, x, y, 5, P.gold, show);
        text(ctx, `${k * 1000} cells → ~${pct} % doublets`, x + (k === 10 ? -10 : 10), y - 14, { size: 11.5, color: P.ink, align: k === 10 ? 'right' : 'left', alpha: show });
      });
      // side notes
      const nx = 620, na = aD * win(t, 11.0, 13.5, 0.4);
      text(ctx, 'what the loading table hides', nx, 110, { size: 14, color: P.ink, weight: 600, alpha: na });
      const notes = [
        ['≈ 0.8 % doublets per 1,000 cells recovered', P.gold],
        ['≈ 50–65 % of loaded cells are recovered', P.inkDim],
        ['≈ 90 % of droplets are empty: barcodes with ambient RNA only', P.inkDim],
        ['a doublet: two lineages in one “cell”, about twice the UMIs', P.alert],
        ['hashing or genotype pooling makes cross-sample doublets visible', P.inkDim],
      ];
      notes.forEach(([s, c], k) => text(ctx, s, nx, 150 + k * 52, { size: 12.5, color: c, alpha: na * sp(t, 11.1 + k * 0.3, 11.5 + k * 0.3), maxWidth: 320 }));
    }
  },
};
