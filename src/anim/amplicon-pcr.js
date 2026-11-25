// Amplicon PCR: primers on conserved flanks, a taxon with a primer mismatch,
// exponential cycles, late-cycle chimeras, then primer-in-read and overlap.
import { prog, sp, win, pulse, lerp, hash, clamp, text, callout, dsFragment, line, dot, arrow, roundRect, baseRow, withAlpha } from '../draw.js';

const TAXA = ['A', 'B', 'C', 'D'];
const ROW_Y = [110, 170, 230, 290];
const TX0 = 110, TLEN = 300;                   // template span
const FL = 44;                                 // conserved flank length (px)
const MISMATCH = 3;                            // taxon D has a primer mismatch
const EFF = [2.0, 1.95, 1.9, 1.45];            // per-cycle amplification factor

function template(ctx, x0, y, col, P, alpha, variableOnly = false) {
  // conserved flank - variable region - conserved flank
  dsFragment(ctx, x0, x0 + FL, y, { colorA: P.inkFaint, colorB: P.inkFaint, lw: 2.4, alpha });
  dsFragment(ctx, x0 + FL, x0 + TLEN - FL, y, { colorA: col, colorB: col, lw: 2.4, alpha });
  dsFragment(ctx, x0 + TLEN - FL, x0 + TLEN, y, { colorA: P.inkFaint, colorB: P.inkFaint, lw: 2.4, alpha });
}

function primer(ctx, x, y, dir, col, P, alpha, tail = true) {
  // short primer with a 5' overhang tail (grey) bent away from the template
  if (alpha <= 0) return;
  const L = 34;
  line(ctx, x, y, x + dir * L, y, col, 3, alpha);
  if (tail) line(ctx, x, y, x - dir * 10, y - 9, P.enzyme, 2.2, alpha);
  // 3' arrowhead
  arrow(ctx, x + dir * (L - 6), y, x + dir * L, y, col, { lw: 3, head: 6, alpha });
}

export default {
  id: 'amplicon-pcr',
  duration: 14,
  thumbT: 6.0,
  phases: [
    { t: 0, label: 'Primers on conserved flanks', caption: 'One primer pair binds the conserved regions flanking a variable region (here 16S V4) in every template at once; no primer pair matches every taxon equally.' },
    { t: 3, label: 'Exponential cycles', caption: 'Each cycle roughly doubles well-matched templates; a template with a mismatch near the primer 3′ end falls behind and the gap compounds over 30 cycles.' },
    { t: 8, label: 'Late cycles: chimeras', caption: 'When primers run low, an incomplete product anneals to a different template through the shared conserved sequence and is extended into a chimera.' },
    { t: 11, label: 'In your reads', caption: 'Reads begin with the primer sequence, and the amplicon length against the read length decides whether read pairs can be merged.' },
  ],
  draw(ctx, t, W, H, P) {
    const sceneA = 1 - prog(t, 10.7, 11.4);
    if (sceneA > 0) {
      ctx.save(); ctx.globalAlpha = sceneA;
      const cyc = Math.floor(clamp((t - 3.2) / 4.4) * 30);  // 0..30 over phase 1
      // templates
      TAXA.forEach((name, i) => {
        const y = ROW_Y[i], col = P.samples[i];
        text(ctx, `taxon ${name}`, TX0 - 16, y, { size: 12, color: col, align: 'right', weight: 600 });
        template(ctx, TX0, y, col, P, 1);
        // primers approach (phase 0)
        const ap = sp(t, 0.6 + i * 0.15, 2.2 + i * 0.15);
        const fx = lerp(TX0 - 120, TX0 + 4, ap), rx = lerp(TX0 + TLEN + 120, TX0 + TLEN - 4, ap);
        const wob = i === MISMATCH ? Math.sin(t * 9) * 3 * (1 - prog(t, 3, 3.5)) : 0;
        primer(ctx, fx, y - 11 + wob, +1, P.p5, P, 1);
        primer(ctx, rx, y + 11 - wob, -1, P.p7, P, 1);
        if (i === MISMATCH) {
          dot(ctx, TX0 + 4 + 28, y - 11 + wob, 3.5, P.alert, ap);
          callout(ctx, 'taxon D: mismatch near the primer 3′ end, binds poorly, amplifies slowly', TX0 + 20, 350, P, { size: 11.5, color: P.alert, alpha: win(t, 3.3, 8, 0.4), to: [TX0 + 36, y - 11] });
        }
      });
      text(ctx, 'forward primer, e.g. 515F  (grey tail = overhang for the index PCR)', TX0, 60, { size: 11.5, color: P.p5, alpha: win(t, 0.8, 3.2, 0.4) });
      text(ctx, 'conserved flank · variable region (V4, ~253 bp) · conserved flank', TX0 + TLEN / 2, 330, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 0.4, 3.2, 0.4) });

      // ---- phase 1: cycle counter + copy-number bars (log scale) ----
      const ba = win(t, 3.0, 10.7, 0.4);
      if (ba > 0) {
        const BX = 560, BY = 110, BW = 300, BH = 200;
        text(ctx, `cycle ${cyc} / 30`, BX + BW / 2, 80, { size: 15, color: P.ink, align: 'center', weight: 700, alpha: ba });
        text(ctx, 'copies per template (log scale)', BX, BY - 14, { size: 11.5, color: P.inkDim, alpha: ba });
        const maxLog = Math.log10(Math.pow(2, 30)) + 0.6;
        TAXA.forEach((name, i) => {
          const copies = Math.pow(EFF[i], cyc);
          const h = BH * Math.log10(Math.max(1, copies)) / maxLog;
          const x = BX + 20 + i * 70;
          ctx.save(); ctx.globalAlpha = ba; ctx.fillStyle = withAlpha(P.samples[i], 0.85);
          ctx.fillRect(x, BY + BH - h, 40, h); ctx.restore();
          text(ctx, name, x + 20, BY + BH + 14, { size: 12, color: P.samples[i], align: 'center', alpha: ba, weight: 600 });
          const lab = copies >= 1e9 ? (copies / 1e9).toFixed(1) + ' G' : copies >= 1e6 ? (copies / 1e6).toFixed(0) + ' M' : copies >= 1e3 ? (copies / 1e3).toFixed(0) + ' k' : copies.toFixed(0);
          text(ctx, lab, x + 20, BY + BH - h - 10, { size: 10, color: P.inkDim, align: 'center', alpha: ba, mono: true });
        });
        line(ctx, BX, BY + BH + 0.5, BX + BW, BY + BH + 0.5, P.inkFaint, 1, ba);
        const fa = win(t, 6.0, 10.7, 0.4);
        text(ctx, '2.0³⁰ ≈ 10⁹ vs 1.45³⁰ ≈ 7×10⁴: a 10,000-fold under-count', BX, BY + BH + 40, { size: 11.5, color: P.alert, alpha: fa, maxWidth: 320 });
        text(ctx, 'plus 1–15 rRNA copies per genome: counts ≠ cells', BX, BY + BH + 60, { size: 11.5, color: P.inkDim, alpha: fa });
      }
      // cycle thermal pulse on the templates
      const flash = cyc > 0 && t < 7.6 ? (Math.sin(t * 14) + 1) / 2 * 0.15 : 0;
      if (flash > 0) { ctx.fillStyle = withAlpha(P.gold, flash); ctx.fillRect(TX0 - 10, 90, TLEN + 20, 220); }

      // ---- phase 2: chimera ----
      const ca = win(t, 8.0, 10.7, 0.4);
      if (ca > 0) {
        const y = 400;
        text(ctx, 'late cycle, primers depleted:', TX0, y - 44, { size: 12.5, color: P.ink, weight: 600, alpha: ca });
        // incomplete product of A (teal primer + half of A's variable region) drifts to template B
        const drift = sp(t, 8.3, 9.3);
        const px = lerp(TX0 - 40, TX0, drift), py = lerp(y - 50, y - 11, drift);
        line(ctx, px, py, px + 34, py, P.p5, 3, ca);
        line(ctx, px + 34, py, px + 34 + 110, py, P.samples[0], 3, ca);
        // template B below
        template(ctx, TX0, y, P.samples[1], P, ca);
        text(ctx, 'template B', TX0 - 16, y, { size: 12, color: P.samples[1], align: 'right', weight: 600, alpha: ca });
        // extension across B
        const ext = sp(t, 9.3, 10.1);
        if (ext > 0) line(ctx, TX0 + 144, y - 11, TX0 + 144 + (TLEN - 144) * ext, y - 11, P.samples[1], 3, ca);
        const done = win(t, 10.0, 10.7, 0.2) * ca;
        ctx.save(); ctx.globalAlpha = done; ctx.strokeStyle = P.alert; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        roundRect(ctx, TX0 - 6, y - 22, TLEN + 12, 22, 5); ctx.stroke(); ctx.restore();
        text(ctx, 'chimera: half A, half B; matches no real organism', TX0 + TLEN + 30, y - 11, { size: 11.5, color: P.alert, alpha: done, weight: 600 });
        text(ctx, '5–30 % of unique sequences at 30+ cycles → remove before taxonomy', TX0 + TLEN + 30, y + 10, { size: 11, color: P.inkDim, alpha: done, maxWidth: 360 });
      }
      ctx.restore();
    }

    // ───────── phase 3: reads ─────────
    const ra = win(t, 11.0, 14.5, 0.5);
    if (ra > 0) {
      ctx.save(); ctx.globalAlpha = ra;
      // top: primer in read
      const prm = 'GTGYCAGCMGCCGCGGTAA';
      const ins = 'TACGGAGGGTGCAAGCGTTAATCGGAATTACTGGGCGTAAAGCG';
      const step = 10.5;
      text(ctx, 'read 1 begins with the forward primer (degenerate bases Y, M included):', 60, 80, { size: 13, color: P.ink, weight: 600 });
      baseRow(ctx, prm, 70, 110, { size: 12, step, color: P.p5 });
      baseRow(ctx, ins, 70 + prm.length * step, 110, { size: 12, step, color: P.dna });
      ctx.save(); ctx.strokeStyle = P.p5; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); roundRect(ctx, 62, 98, prm.length * step + 4, 24, 4); ctx.stroke(); ctx.restore();
      text(ctx, 'trim it (cutadapt / DADA2) before denoising; if a 0–7 nt spacer precedes it, trimLeft alone is wrong', 60, 140, { size: 11.5, color: P.inkDim, alpha: win(t, 11.5, 14.5, 0.3), maxWidth: 840 });

      // bottom: amplicon length vs read length
      const ya = win(t, 12.0, 14.5, 0.4);
      const sc = 0.9; // px per bp
      const rows = [
        { name: 'V4 (515F/806R): ~253 bp', len: 253, y: 250, ok: true },
        { name: 'V3–V4 (341F/785R): ~460 bp', len: 460, y: 350, ok: false },
      ];
      text(ctx, 'amplicon length vs 2 × 250 bp reads', 60, 180, { size: 13, color: P.ink, weight: 600, alpha: ya });
      rows.forEach((r, k) => {
        const a = ya * sp(t, 12.2 + k * 0.5, 12.8 + k * 0.5);
        const x0 = 120, x1 = x0 + r.len * sc, rl = 250 * sc;
        dsFragment(ctx, x0, x1, r.y, { colorA: P.dna, colorB: P.dnaLight, lw: 2.6, alpha: a });
        dsFragment(ctx, x0, x0 + 19 * sc, r.y, { colorA: P.p5, colorB: P.p5, lw: 2.6, alpha: a });
        dsFragment(ctx, x1 - 20 * sc, x1, r.y, { colorA: P.p7, colorB: P.p7, lw: 2.6, alpha: a });
        const r1e = Math.min(x0 + rl, x1 + 40), r2s = Math.max(x1 - rl, x0 - 40);
        arrow(ctx, x0, r.y - 14, r1e, r.y - 14, P.p5, { lw: 3, head: 7, alpha: a });
        arrow(ctx, x1, r.y + 14, r2s, r.y + 14, P.p7, { lw: 3, head: 7, alpha: a });
        const ov = Math.max(0, Math.min(x0 + rl, x1) - Math.max(x1 - rl, x0));
        if (ov > 0) { ctx.save(); ctx.globalAlpha = a * 0.25; ctx.fillStyle = r.ok ? P.good : P.gold; ctx.fillRect(Math.max(x1 - rl, x0), r.y - 22, ov, 44); ctx.restore(); }
        text(ctx, r.name, 60, r.y - 40, { size: 12, color: P.inkDim, alpha: a });
        const ovbp = Math.round(ov / sc);
        text(ctx, r.ok ? `overlap ≈ ${ovbp} bp: merges easily; R1 runs past the amplicon into adapter (trim)` : `overlap ≈ ${ovbp} bp only, and it sits in the low-quality 3′ ends of both reads`, 60, r.y + 42, { size: 11.5, color: r.ok ? P.good : P.alert, alpha: a });
        if (r1e > x1) line(ctx, x1, r.y - 14, r1e, r.y - 14, P.alert, 3, a);
        if (r2s < x0) line(ctx, x0, r.y + 14, r2s, r.y + 14, P.alert, 3, a);
      });
      text(ctx, 'DADA2 truncLen must keep ≥ 12–20 bp overlap after quality truncation', 60, 428, { size: 11.5, color: P.inkDim, alpha: win(t, 13.3, 14.5, 0.3) });
      ctx.restore();
    }
  },
};
