// Paired DNA/RNA co-extraction: stabilise fast (bacterial mRNA half-life is
// minutes), bead-beat in guanidinium, split one lysate onto a DNA and an RNA
// column, DNase the RNA, see what the RNA tube actually contains.
import { prog, sp, win, pulse, lerp, hash, text, callout, cellShape, bead, blob, dot, line, arrow, roundRect, tube, dsPath, ssStrand, shake, withAlpha } from '../draw.js';

const TAXA = [0, 1, 3, 4];     // P.samples indices for four taxa

function squiggle(ctx, x, y, len, phase, color, alpha, o = {}) {
  if (alpha <= 0) return;
  const { rna = false, lw = 2 } = o;
  const pts = [];
  for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push([x + (u - 0.5) * len, y + Math.sin(u * 9 + phase) * 4]); }
  if (rna) ssStrand(ctx, pts[0][0], pts[0][1], pts[10][0], pts[10][1], { color, lw, tickEvery: 7, tickLen: 3, alpha });
  else dsPath(ctx, pts, { colorA: color, colorB: color, gap: 3, lw, rungs: false, alpha });
}

function cellsInTube(ctx, x, y, w, h, P, alpha, seed, burst = 0) {
  for (let i = 0; i < 9; i++) {
    const cx = x + 8 + (w - 16) * hash(i, seed), cy = y + h * 0.45 + (h * 0.5 - 12) * hash(i, seed + 1);
    const col = P.samples[TAXA[i % 4]];
    const b = burst > 0 ? sp(burst, 0.1 + 0.6 * hash(i, 3), 0.5 + 0.6 * hash(i, 3)) : 0;
    if (b < 1) cellShape(ctx, cx, cy, 5 * (1 + 0.4 * b), P, { fill: withAlpha(col, 0.55), stroke: col, alpha: alpha * (1 - b), wall: 0.7, seed: i });
  }
}

function column(ctx, x, y, w, h, P, alpha, color, label) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = P.glass; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h * 0.7); ctx.lineTo(x + w * 0.35, y + h); ctx.lineTo(x + w * 0.65, y + h); ctx.lineTo(x + w, y + h * 0.7); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.fillStyle = withAlpha(color, 0.35); ctx.fillRect(x + 2, y + h * 0.5, w - 4, 12);   // silica frit
  ctx.restore();
  text(ctx, label, x + w / 2, y - 14, { size: 12, color, align: 'center', alpha, weight: 600 });
}

export default {
  id: 'coextraction',
  duration: 13.5,
  thumbT: 7.6,
  phases: [
    { t: 0, label: 'Stabilise at collection', caption: 'Bacterial mRNA turns over within minutes. A sample that waits at room temperature keeps its DNA but its transcriptome becomes a stress response.' },
    { t: 3.5, label: 'Bead beating in guanidinium', caption: 'Mechanical lysis in a chaotropic buffer opens Gram-positives and protects RNA at the same time; DNA and RNA are released together.' },
    { t: 6.5, label: 'One lysate, two columns', caption: 'The lysate is split: DNA binds one column, RNA the other. DNase removes the gDNA that came along with the RNA, mostly.' },
    { t: 9.5, label: 'What the RNA tube holds', caption: '80–95 % of total RNA is ribosomal; the messenger RNA you want is a few percent, and in tissue-associated samples host RNA can dominate.' },
    { t: 11.5, label: 'In your data', caption: 'DNA and RNA from the same lysate let you read expression per gene copy instead of mistaking a more abundant organism for a more active one.' },
  ],
  draw(ctx, t, W, H, P) {
    // ───── scene A: two tubes, stabilised vs room temperature (0 – 3.7) ─────
    const aA = win(t, 0, 3.7, 0.5);
    if (aA > 0) {
      const decay = prog(t, 0.6, 3.0);
      const tubes = [
        { x: 200, label: 'stabiliser at collection', good: true },
        { x: 560, label: '1 h at room temperature', good: false },
      ];
      text(ctx, 'mRNA half-life: minutes', W / 2, 60, { size: 15, color: P.ink, weight: 600, align: 'center', alpha: aA });
      tubes.forEach((tb, k) => {
        const tx = tb.x, ty = 110, tw = 90, th = 180;
        tube(ctx, tx, ty, tw, th, P, { level: 0.7, liquid: withAlpha(tb.good ? P.good : P.liquid, tb.good ? 0.25 : 0.6), alpha: aA, label: tb.label });
        cellsInTube(ctx, tx, ty + th * 0.3, tw, th * 0.65, P, aA, 10 + k * 7);
        // mRNA bar and stress bar beside the tube
        const bx = tx + tw + 30, by = ty + th - 10, bh = 120;
        const m = tb.good ? 1 : 1 - 0.85 * decay;
        const s = tb.good ? 0.05 : 0.05 + 0.8 * decay;
        ctx.save(); ctx.globalAlpha *= aA;
        ctx.fillStyle = P.grid; ctx.fillRect(bx, by - bh, 22, bh); ctx.fillRect(bx + 34, by - bh, 22, bh);
        ctx.fillStyle = P.rna; ctx.fillRect(bx, by - bh * m, 22, bh * m);
        ctx.fillStyle = P.gold; ctx.fillRect(bx + 34, by - bh * s, 22, bh * s);
        ctx.restore();
        text(ctx, 'mRNA', bx + 11, by + 14, { size: 10.5, color: P.rna, align: 'center', alpha: aA });
        text(ctx, 'stress', bx + 45, by + 14, { size: 10.5, color: P.gold, align: 'center', alpha: aA });
        if (!tb.good) text(ctx, 'what is left is a stress response', tx + tw / 2, ty + th + 34, { size: 11.5, color: P.alert, align: 'center', alpha: aA * sp(t, 2.2, 2.8) });
        else text(ctx, 'DNA/RNA Shield, RNAlater, or −80 °C', tx + tw / 2, ty + th + 34, { size: 11.5, color: P.good, align: 'center', alpha: aA * sp(t, 1.2, 1.8) });
      });
      // clock
      const cx = W / 2, cy = 200, r = 26;
      ctx.save(); ctx.globalAlpha *= aA; ctx.strokeStyle = P.inkDim; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      const ang = -Math.PI / 2 + decay * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * (r - 6), cy + Math.sin(ang) * (r - 6)); ctx.stroke();
      ctx.restore();
      text(ctx, `${Math.round(decay * 60)} min`, cx, cy + r + 16, { size: 11, color: P.inkDim, align: 'center', alpha: aA });
    }

    // ───── scene B: bead beating (3.5 – 6.8) ─────
    const aB = win(t, 3.5, 6.8, 0.5);
    if (aB > 0) {
      const tx = 390, ty = 120, tw = 180, th = 260;
      const burst = prog(t, 4.2, 6.0);
      const [shx, shy] = shake(t, 4 * pulse(t, 3.9, 6.4), 42);
      ctx.save(); ctx.translate(shx, shy);
      tube(ctx, tx, ty, tw, th, P, { level: 0.75, liquid: withAlpha(P.liquid, 0.6), alpha: aB, label: 'guanidinium / TRIzol' });
      cellsInTube(ctx, tx, ty + th * 0.25, tw, th * 0.7, P, aB, 30, burst);
      // beads
      for (let i = 0; i < 8; i++) {
        const [bx, by] = shake(t, 12, 28 + i * 3, i);
        bead(ctx, tx + 25 + i * 18 + bx, ty + th * 0.5 + (hash(i, 8) - 0.5) * 120 + by, 6, P, aB * win(t, 3.8, 6.8, 0.3));
      }
      // released DNA + RNA
      for (let i = 0; i < 12; i++) {
        const rel = sp(t, 4.4 + hash(i, 5) * 1.0, 5.2 + hash(i, 5) * 1.0);
        if (rel <= 0) continue;
        const x = tx + 20 + (tw - 40) * hash(i, 6), y = ty + th * 0.35 + (th * 0.55) * hash(i, 7);
        const rna = i % 2 === 1;
        squiggle(ctx, x, y + Math.sin(t * 2 + i) * 2, 30 * rel, i, rna ? P.rna : P.dna, aB * rel, { rna });
      }
      ctx.restore();
      text(ctx, 'bead beating opens Gram-positives; the buffer keeps RNase quiet', W / 2, 70, { size: 13, color: P.inkDim, align: 'center', alpha: aB });
      callout(ctx, 'DNA', tx - 60, ty + 120, P, { alpha: aB * sp(t, 5.2, 5.6), size: 12, color: P.dna });
      callout(ctx, 'RNA', tx + tw + 20, ty + 120, P, { alpha: aB * sp(t, 5.2, 5.6), size: 12, color: P.rna });
      text(ctx, 'one lysate: both nucleic acids from the same cells', W / 2, ty + th + 44, { size: 12, color: P.ink, align: 'center', alpha: aB * sp(t, 5.6, 6.2) });
    }

    // ───── scene C: two columns (6.5 – 9.8) ─────
    const aC = win(t, 6.5, 9.8, 0.5);
    if (aC > 0) {
      const DC = { x: 230, y: 140, w: 105, h: 255 }, RC = { x: 600, y: 140, w: 105, h: 255 };
      column(ctx, DC.x, DC.y, DC.w, DC.h, P, aC, P.dna, 'DNA column');
      column(ctx, RC.x, RC.y, RC.w, RC.h, P, aC, P.rna, 'RNA column');
      text(ctx, 'lysate', W / 2 - 15, 72, { size: 13, color: P.inkDim, align: 'center', alpha: aC });
      arrow(ctx, W / 2 - 40, 82, DC.x + DC.w / 2, DC.y - 32, P.inkFaint, { lw: 1.5, head: 6, alpha: aC });
      arrow(ctx, W / 2 + 10, 82, RC.x + RC.w / 2, RC.y - 32, P.inkFaint, { lw: 1.5, head: 6, alpha: aC });
      // strands travelling to columns
      for (let i = 0; i < 14; i++) {
        const rna = i % 2 === 1;
        const stray = i === 6 || i === 10;                       // DNA that goes to the RNA side
        const toRna = rna || stray;
        const C = toRna ? RC : DC;
        const u = sp(t, 6.8 + hash(i, 9) * 0.8, 7.8 + hash(i, 9) * 0.8);
        const x = lerp(W / 2 - 15 + (hash(i, 11) - 0.5) * 60, C.x + C.w / 2 + (hash(i, 12) - 0.5) * 60, u);
        const y = lerp(78, C.y + C.h * 0.62 + (hash(i, 13) - 0.5) * 44, u);
        let al = aC;
        if (stray) {
          const eaten = i === 6 ? sp(t, 8.3, 9.0) : 0;              // i=6 digested, i=10 escapes
          al *= 1 - eaten;
          if (i === 6 && eaten > 0 && eaten < 1) blob(ctx, x + 14, y - 6, 8, P.enzyme, { seed: 5, alpha: aC });
        }
        squiggle(ctx, x, y, 36, i, stray ? P.dna : rna ? P.rna : P.dna, al, { rna, lw: 2.4 });
      }
      // DNase label + escapee
      const da = aC * win(t, 8.2, 9.8, 0.3);
      text(ctx, 'DNase I removes', RC.x + RC.w + 18, RC.y + 100, { size: 13, color: P.inkDim, alpha: da });
      text(ctx, 'carried-over gDNA', RC.x + RC.w + 18, RC.y + 118, { size: 13, color: P.inkDim, alpha: da });
      const ra2 = aC * win(t, 8.9, 9.8, 0.3);
      text(ctx, 'one escapes: residual gDNA', RC.x + RC.w + 18, RC.y + 170, { size: 13, color: P.alert, alpha: ra2 });
      text(ctx, '= intergenic, unstranded reads', RC.x + RC.w + 18, RC.y + 188, { size: 12, color: P.alert, alpha: ra2 });
      text(ctx, 'shotgun library → the reference and gene copy numbers', DC.x + DC.w / 2, DC.y + DC.h + 34, { size: 13, color: P.dna, align: 'center', alpha: aC * sp(t, 8.0, 8.6), maxWidth: 330 });
      text(ctx, 'stranded RNA library → transcript counts', RC.x + RC.w / 2, RC.y + RC.h + 34, { size: 13, color: P.rna, align: 'center', alpha: aC * sp(t, 8.0, 8.6), maxWidth: 330 });
    }

    // ───── scene D: RNA tube composition (9.5 – 11.8) ─────
    const aD = win(t, 9.5, 11.8, 0.5);
    if (aD > 0) {
      const bx = 380, by = 110, bw = 90, bh = 300;
      const fr = [['rRNA  80–95 %', 0.86, P.rrna], ['host RNA', 0.07, P.enzyme], ['tRNA / small RNA', 0.03, P.inkFaint], ['mRNA', 0.04, P.rna]];
      text(ctx, 'total RNA from the RNA column', W / 2, 80, { size: 14, color: P.ink, weight: 600, align: 'center', alpha: aD });
      let cy = by + bh; const g = sp(t, 9.8, 10.8);
      fr.forEach(([l, f, c], k) => {
        const hh = bh * f * g; cy -= hh;
        ctx.save(); ctx.globalAlpha *= aD; ctx.fillStyle = c; ctx.fillRect(bx, cy, bw, hh); ctx.restore();
        const ly = k === 0 ? cy + hh / 2 : [0, 148, 128, 108][k] + (by + bh - bh * g) - by;   // staggered labels for the thin segments
        if (k > 0) line(ctx, bx + bw + 2, cy + hh / 2, bx + bw + 10, ly, P.inkFaint, 1, aD * g);
        text(ctx, l, bx + bw + 14, ly, { size: 12, color: k === 3 ? P.rna : P.inkDim, alpha: aD * g, weight: k === 3 ? 600 : 400 });
      });
      text(ctx, '← the part you want', bx + bw + 62, by - 2, { size: 11, color: P.rna, alpha: aD * sp(t, 10.8, 11.2) });
      text(ctx, 'no poly(A) on bacterial mRNA: depletion, not selection, comes next', W / 2, by + bh + 36, { size: 12, color: P.inkDim, align: 'center', alpha: aD * sp(t, 10.6, 11.2) });
    }

    // ───── scene E: in your data (11.5 – end) ─────
    const aE = win(t, 11.5, 14, 0.5);
    if (aE > 0) {
      text(ctx, 'same sample, two libraries', 100, 90, { size: 15, color: P.ink, weight: 600, alpha: aE });
      const genes = [
        { name: 'gene A', dna: 0.9, rna: 0.9, note: 'abundant organism, ordinary expression' },
        { name: 'gene B', dna: 0.25, rna: 0.85, note: 'rare organism, highly expressed' },
        { name: 'gene C', dna: 0.8, rna: 0.15, note: 'abundant but switched off' },
      ];
      const X = 100, Y = 150, bw = 250, rowH = 90, bh = 16;
      genes.forEach((gn, k) => {
        const y = Y + k * rowH; const g = sp(t, 11.8 + k * 0.3, 12.4 + k * 0.3) * aE;
        text(ctx, gn.name, X, y + 18, { size: 14, color: P.ink, alpha: g, weight: 600 });
        ctx.save(); ctx.globalAlpha *= g;
        ctx.fillStyle = P.grid; ctx.fillRect(X + 80, y, bw, bh); ctx.fillRect(X + 80, y + 22, bw, bh);
        ctx.fillStyle = P.dna; ctx.fillRect(X + 80, y, bw * gn.dna, bh);
        ctx.fillStyle = P.rna; ctx.fillRect(X + 80, y + 22, bw * gn.rna, bh);
        ctx.restore();
        text(ctx, 'DNA copies', X + 80 + bw + 12, y + 8, { size: 12, color: P.dna, alpha: g });
        text(ctx, 'RNA reads', X + 80 + bw + 12, y + 30, { size: 12, color: P.rna, alpha: g });
        const ratio = (gn.rna / gn.dna).toFixed(1);
        text(ctx, `RNA / DNA = ${ratio}`, X + 80 + bw + 110, y + 19, { size: 14, color: P.gold, alpha: g, weight: 600 });
        text(ctx, gn.note, X + 80 + bw + 250, y + 19, { size: 13, color: P.inkDim, alpha: g, maxWidth: 270 });
      });
      text(ctx, 'normalise transcripts by gene copies from the matched DNA,', W / 2, Y + 3 * rowH + 20, { size: 14, color: P.gold, align: 'center', alpha: aE * sp(t, 12.8, 13.3) });
      text(ctx, 'or “expression” just restates abundance', W / 2, Y + 3 * rowH + 44, { size: 14, color: P.gold, align: 'center', alpha: aE * sp(t, 12.8, 13.3) });
    }
  },
};
