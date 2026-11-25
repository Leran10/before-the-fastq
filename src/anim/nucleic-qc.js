// Quantification & integrity: NanoDrop vs Qubit, purity ratios, a size trace,
// and the chain input mass -> PCR cycles -> duplicates.
import { prog, sp, win, pulse, lerp, hash, text, callout, dsFragment, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

function readout(ctx, x, y, w, h, title, value, unit, P, alpha, accent) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = P.panel; ctx.strokeStyle = P.grid; ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 8); ctx.fill(); ctx.stroke(); ctx.restore();
  text(ctx, title, x + 12, y + 18, { size: 12, color: P.inkDim, alpha });
  text(ctx, value, x + 12, y + h / 2 + 6, { size: 26, color: accent || P.ink, weight: 700, alpha, mono: true });
  text(ctx, unit, x + w - 12, y + h / 2 + 8, { size: 12, color: P.inkDim, alpha, align: 'right' });
}

function gelLane(ctx, x, y, w, h, bands, P, alpha, label, grow) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = P.panel; ctx.strokeStyle = P.grid; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); ctx.restore();
  bands.forEach(b => {
    // b: {pos 0..1 (0 = top = large), thick, intensity}
    const by = y + b.pos * h;
    const g = ctx.createLinearGradient(0, by - b.thick / 2, 0, by + b.thick / 2);
    g.addColorStop(0, withAlpha(P.dna, 0)); g.addColorStop(0.5, withAlpha(P.dna, b.intensity * grow)); g.addColorStop(1, withAlpha(P.dna, 0));
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(x + 3, by - b.thick / 2, w - 6, b.thick); ctx.restore();
  });
  text(ctx, label, x + w / 2, y + h + 14, { size: 11, color: P.inkDim, align: 'center', alpha });
}

export default {
  id: 'nucleic-qc',
  duration: 13,
  thumbT: 7.4,
  phases: [
    { t: 0, label: 'How much?', caption: 'Absorbance at 260 nm counts everything that absorbs: DNA, RNA and free nucleotides. A dsDNA-specific dye counts only what library prep can use.' },
    { t: 3.2, label: 'How pure?', caption: 'A260/280 flags protein; A260/230 flags salts, phenol and carbohydrates that inhibit the enzymes used later.' },
    { t: 5.8, label: 'How long?', caption: 'A capillary trace shows whether the DNA is still high-molecular-weight or has degraded into a smear, summarised as DIN.' },
    { t: 9.2, label: 'In your data', caption: 'The input mass decides how many PCR cycles the library needs, and the cycle number decides how many duplicates you will see.' },
  ],
  draw(ctx, t, W, H, P) {
    // ---- phase 1: NanoDrop vs Qubit ----
    {
      const a = win(t, 0, 3.4, 0.5);
      if (a > 0) {
        const bx = 110, by = 120;
        // stacked composition bar of what absorbs
        const parts = [['dsDNA', 40, P.dna], ['RNA', 30, P.rna], ['free nucleotides', 15, P.rnaLight]];
        let x = bx; const g = sp(t, 0.4, 1.6);
        parts.forEach(([l, v, c]) => { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(x, by, v * 3.4 * g, 22); ctx.restore(); text(ctx, l, x + v * 1.7, by + 36, { size: 10.5, color: P.inkDim, align: 'center', alpha: a * g }); x += v * 3.4 * g; });
        text(ctx, 'what absorbs at 260 nm', bx, by - 16, { size: 12, color: P.inkDim, alpha: a });
        readout(ctx, bx, 180, 260, 70, 'NanoDrop (absorbance)', `${Math.round(85 * sp(t, 0.4, 1.6))}`, 'ng/µL', P, a, P.alert);
        readout(ctx, bx, 262, 260, 70, 'Qubit (dsDNA dye)', `${Math.round(40 * sp(t, 1.4, 2.4))}`, 'ng/µL', P, a, P.good);
        // dye glow on dsDNA only
        const gl = win(t, 1.4, 3.4, 0.3);
        dsFragment(ctx, 440, 560, 200, { colorA: P.dna, colorB: P.dnaLight, alpha: a });
        dot(ctx, 500, 200, 18 + 4 * Math.sin(t * 5), P.gold, a * gl * 0.35);
        dsFragment(ctx, 440, 560, 240, { colorA: P.rna, colorB: P.rna, rungs: false, alpha: a });
        text(ctx, 'dsDNA', 572, 200, { size: 11, color: P.dna, alpha: a });
        text(ctx, 'RNA', 572, 240, { size: 11, color: P.rna, alpha: a });
        text(ctx, 'dye binds dsDNA, not RNA', 640, 220, { size: 12, color: P.inkDim, alpha: a * gl });
        text(ctx, 'library input must be the Qubit number', 110, 360, { size: 13, color: P.ink, weight: 600, alpha: a * sp(t, 2.4, 3.0) });
      }
    }
    // ---- phase 2: purity ratios ----
    {
      const a = win(t, 3.2, 6.0, 0.5);
      if (a > 0) {
        const rows = [['A260 / A280', '1.82', 'clean of protein', true], ['A260 / A230', '1.31', 'salt, phenol or carbohydrate carry-over', false]];
        rows.forEach(([k, v, note, ok], i) => {
          const y = 190 + i * 90, g = sp(t, 3.5 + i * 0.6, 4.3 + i * 0.6);
          text(ctx, k, 140, y, { size: 16, color: P.inkDim, alpha: a, mono: true });
          text(ctx, v, 300, y, { size: 26, color: ok ? P.good : P.alert, weight: 700, alpha: a * g, mono: true });
          text(ctx, ok ? '✓' : '!', 380, y, { size: 24, color: ok ? P.good : P.alert, weight: 700, alpha: a * g });
          text(ctx, note, 420, y, { size: 13, color: P.inkDim, alpha: a * g });
          text(ctx, ok ? 'target ≈ 1.8' : 'target > 1.8', 300, y + 26, { size: 11, color: P.inkFaint, alpha: a * g });
        });
        text(ctx, 'inhibitors reduce ligation and PCR efficiency → fewer molecules → more cycles', 480, 380, { size: 12.5, color: P.inkDim, align: 'center', alpha: a * sp(t, 5.0, 5.6) });
      }
    }
    // ---- phase 3: size trace / gel ----
    {
      const a = win(t, 5.8, 9.4, 0.5);
      if (a > 0) {
        const gy = 110, gh = 260, g = sp(t, 6.0, 7.4);
        // ladder marks
        const marks = [['> 60 kb', 0.08], ['20 kb', 0.2], ['5 kb', 0.42], ['1 kb', 0.66], ['250 bp', 0.88]];
        marks.forEach(([l, p]) => { text(ctx, l, 150, gy + p * gh, { size: 10.5, color: P.inkFaint, align: 'right', alpha: a }); line(ctx, 156, gy + p * gh, 170, gy + p * gh, P.grid, 1, a); });
        gelLane(ctx, 180, gy, 70, gh, [{ pos: 0.12, thick: 22, intensity: 0.95 }], P, a, 'intact', g);
        gelLane(ctx, 300, gy, 70, gh, [{ pos: 0.3, thick: 60, intensity: 0.35 }, { pos: 0.55, thick: 140, intensity: 0.5 }, { pos: 0.8, thick: 80, intensity: 0.3 }], P, a, 'degraded', g);
        gelLane(ctx, 420, gy, 70, gh, [{ pos: 0.3, thick: 40, intensity: 0.4 }, { pos: 0.5, thick: 90, intensity: 0.6 }], P, a, 'bead-beaten', g);
        const la = a * sp(t, 7.2, 7.8);
        text(ctx, 'DIN 9.4', 215, gy - 14, { size: 13, color: P.good, weight: 700, align: 'center', alpha: la });
        text(ctx, 'DIN 3.8', 335, gy - 14, { size: 13, color: P.alert, weight: 700, align: 'center', alpha: la });
        text(ctx, 'DIN 6.5', 455, gy - 14, { size: 13, color: P.ink, weight: 700, align: 'center', alpha: la });
        callout(ctx, 'tight band high up: long molecules', 540, gy + 40, P, { alpha: la, size: 12, to: [250, gy + 0.12 * gh] });
        callout(ctx, 'smear: shorter inserts, more overlap, lost at size selection', 540, gy + 160, P, { alpha: la, size: 12, to: [370, gy + 0.55 * gh] });
        callout(ctx, 'fine for short reads, N50 ceiling for long reads', 540, gy + 230, P, { alpha: la, size: 12, to: [490, gy + 0.5 * gh] });
      }
    }
    // ---- phase 4: input -> cycles -> duplicates ----
    {
      const a = win(t, 9.2, 13.5, 0.6);
      if (a > 0) {
        text(ctx, 'the number that follows you into the FASTQ', 480, 80, { size: 15, color: P.ink, weight: 600, align: 'center', alpha: a });
        const rows = [
          { y: 170, mass: '100 ng input', cyc: 6, dup: 3, n: 10, col: P.good },
          { y: 330, mass: '1 ng input', cyc: 14, dup: 35, n: 2, col: P.alert },
        ];
        rows.forEach((r, k) => {
          const g1 = sp(t, 9.6 + k * 0.4, 10.2 + k * 0.4), g2 = sp(t, 10.4 + k * 0.4, 11.0 + k * 0.4), g3 = sp(t, 11.2 + k * 0.4, 12.2 + k * 0.4);
          // molecules
          for (let i = 0; i < r.n; i++) dsFragment(ctx, 100 + (i % 5) * 44, 100 + (i % 5) * 44 + 34, r.y - 14 + Math.floor(i / 5) * 24, { colorA: P.dna, colorB: P.dnaLight, alpha: a * g1, lw: 2 });
          text(ctx, r.mass, 100, r.y + 44, { size: 13, color: P.ink, weight: 600, alpha: a * g1 });
          arrow(ctx, 340, r.y, 390, r.y, P.inkFaint, { alpha: a * g2 });
          text(ctx, `${r.cyc} PCR cycles`, 400, r.y, { size: 14, color: P.ink, alpha: a * g2, mono: true });
          arrow(ctx, 540, r.y, 590, r.y, P.inkFaint, { alpha: a * g3 });
          // duplicate stack: copies of the same molecule
          const copies = Math.round(lerp(1, k === 0 ? 2 : 7, g3));
          for (let c = 0; c < copies; c++) dsFragment(ctx, 610, 644, r.y - 20 + c * 6, { colorA: k === 0 ? P.dna : P.alert, colorB: k === 0 ? P.dnaLight : P.alert, alpha: a * g3, lw: 2, rungs: false });
          text(ctx, `${Math.round(r.dup * g3)} % duplicates`, 670, r.y, { size: 15, color: r.col, weight: 700, alpha: a * g3, mono: true });
          text(ctx, k === 0 ? 'high complexity library' : 'low complexity, GC bias, dimers', 670, r.y + 22, { size: 11.5, color: P.inkDim, alpha: a * g3 });
        });
        text(ctx, 'duplication that tracks input mass across a project is technical, not biological', 480, 440, { size: 12.5, color: P.gold, weight: 600, align: 'center', alpha: a * sp(t, 12.2, 12.8) });
      }
    }
  },
};
