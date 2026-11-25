// RNA integrity: an electropherogram draws itself for intact and degraded
// RNA; then why degraded RNA plus poly(A) selection gives 3' bias.
import { prog, sp, win, pulse, lerp, hash, text, callout, ssStrand, bead, blob, dot, line, arrow, roundRect, withAlpha } from '../draw.js';

const g = (u, m, s, h) => h * Math.exp(-0.5 * ((u - m) / s) ** 2);
const intact = u => 0.03 + g(u, 0.05, 0.012, 0.35) + g(u, 0.46, 0.02, 0.5) + g(u, 0.64, 0.022, 0.95);
const degraded = u => 0.05 + g(u, 0.05, 0.012, 0.35) + g(u, 0.2, 0.12, 0.42) + g(u, 0.46, 0.02, 0.17) + g(u, 0.64, 0.022, 0.18);

// progressive electropherogram
function trace(ctx, x, y, w, h, f, upto, color, alpha = 1) {
  if (alpha <= 0 || upto <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.fillStyle = withAlpha(color, 0.15); ctx.lineWidth = 2; ctx.lineJoin = 'round';
  const n = 160;
  ctx.beginPath();
  for (let k = 0; k <= n; k++) { const u = k / n; if (u > upto) break; const px = x + u * w, py = y + h - Math.min(1, f(u)) * h; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + h);
  for (let k = 0; k <= n; k++) { const u = k / n; if (u > upto) break; ctx.lineTo(x + u * w, y + h - Math.min(1, f(u)) * h); }
  ctx.lineTo(x + Math.min(upto, 1) * w, y + h); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function axes(ctx, x, y, w, h, P, alpha) {
  line(ctx, x, y + h + 0.5, x + w, y + h + 0.5, P.inkFaint, 1, alpha);
  line(ctx, x + 0.5, y, x + 0.5, y + h, P.inkFaint, 1, alpha);
  text(ctx, 'size (nt) →', x + w, y + h + 14, { size: 10.5, color: P.inkDim, align: 'right', alpha });
  text(ctx, 'fluorescence', x - 4, y - 8, { size: 10.5, color: P.inkDim, align: 'left', alpha });
}

export default {
  id: 'rna-qc',
  duration: 13,
  thumbT: 6.2,
  phases: [
    { t: 0, label: 'Intact RNA', caption: 'On a Bioanalyzer trace intact total RNA shows two sharp ribosomal peaks, 18S and 28S, with 28S about twice as tall.' },
    { t: 3.4, label: 'Degraded RNA', caption: 'As RNA degrades the peaks shrink and a smear of short fragments grows; the RIN score summarizes the trace from 10 down to 1.' },
    { t: 7, label: 'Poly(A) capture of broken RNA', caption: 'Oligo(dT) beads capture only the fragment still attached to the poly(A) tail; the rest of the transcript is never sequenced.' },
    { t: 10, label: '3′ bias', caption: 'Gene-body coverage rises toward the 3′ end and the 5′ ends of long genes disappear: a RIN difference between groups looks like biology.' },
  ],
  draw(ctx, t, W, H, P) {
    // ---- traces (phases 0-1), kept visible until phase 2 ----
    const ta = 1 - prog(t, 7.0, 7.8);
    if (ta > 0) {
      const L = { x: 80, y: 90, w: 360, h: 200 }, R = { x: 520, y: 90, w: 360, h: 200 };
      axes(ctx, L.x, L.y, L.w, L.h, P, ta);
      text(ctx, 'intact total RNA', L.x, 60, { size: 14, color: P.ink, weight: 600, alpha: ta });
      trace(ctx, L.x, L.y, L.w, L.h, intact, sp(t, 0.3, 2.6), P.rna, ta);
      const la = win(t, 1.6, 7.6, 0.4) * ta;
      text(ctx, '18S', L.x + 0.46 * L.w, L.y + L.h - 0.5 * L.h - 12, { size: 11, color: P.inkDim, align: 'center', alpha: la });
      text(ctx, '28S', L.x + 0.64 * L.w, L.y + L.h - 0.95 * L.h - 12, { size: 11, color: P.inkDim, align: 'center', alpha: la });
      text(ctx, 'marker', L.x + 0.05 * L.w, L.y + L.h - 0.35 * L.h - 12, { size: 10.5, color: P.inkFaint, align: 'center', alpha: la });
      const ra = win(t, 2.4, 7.6, 0.4) * ta;
      text(ctx, 'RIN 9.5', L.x + L.w - 10, L.y + 18, { size: 20, color: P.good, align: 'right', weight: 700, alpha: ra });
      text(ctx, '28S : 18S ≈ 2', L.x + L.w - 10, L.y + 40, { size: 11.5, color: P.inkDim, align: 'right', alpha: ra });

      const da = win(t, 3.3, 8, 0.4) * ta;
      if (da > 0) {
        axes(ctx, R.x, R.y, R.w, R.h, P, da);
        text(ctx, 'same sample, degraded', R.x, 60, { size: 14, color: P.ink, weight: 600, alpha: da });
        trace(ctx, R.x, R.y, R.w, R.h, degraded, sp(t, 3.6, 5.8), P.rna, da);
        const l2 = win(t, 5.0, 8, 0.4) * ta;
        text(ctx, 'smear of short fragments', R.x + 0.2 * R.w, R.y + R.h - 0.45 * R.h - 14, { size: 11, color: P.alert, align: 'center', alpha: l2 });
        text(ctx, '18S', R.x + 0.46 * R.w, R.y + R.h - 0.17 * R.h - 12, { size: 11, color: P.inkDim, align: 'center', alpha: l2 });
        text(ctx, '28S', R.x + 0.64 * R.w, R.y + R.h - 0.18 * R.h - 12, { size: 11, color: P.inkDim, align: 'center', alpha: l2 });
        const r2 = win(t, 5.6, 8, 0.4) * ta;
        text(ctx, 'RIN 4', R.x + R.w - 10, R.y + 18, { size: 20, color: P.alert, align: 'right', weight: 700, alpha: r2 });
        text(ctx, '≳ 7 for poly(A) selection · < 4 depletion / 3′ kits only', R.x + R.w - 10, R.y + 40, { size: 11, color: P.inkDim, align: 'right', alpha: r2 });
      }
      text(ctx, 'RIN: RNA Integrity Number, 10 = intact, 1 = fully degraded  ·  DV200 (% > 200 nt) used for FFPE', W / 2, 330, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 1.0, 7.6, 0.4) * ta });
    }

    // ---- phase 2: poly(A) capture ----
    {
      const a = win(t, 7.0, 13.5, 0.6);
      if (a > 0) {
        const y = 150, x0 = 90, x1 = 560;
        text(ctx, 'a degraded transcript meets oligo(dT) beads', x0, 90, { size: 14, color: P.ink, weight: 600, alpha: a });
        // break points
        const brk = [0.22, 0.41, 0.63, 0.8];
        const pieces = [[0, 0.22], [0.22, 0.41], [0.41, 0.63], [0.63, 0.8], [0.8, 1]];
        const sep = sp(t, 7.6, 8.4);
        const cap = sp(t, 8.6, 9.6);
        const bx = 680, by = y + 6;
        pieces.forEach(([u0, u1], k) => {
          const last = k === pieces.length - 1;
          let px0 = lerp(x0, x1, u0) + 6 * sep * k, px1 = lerp(x0, x1, u1) + 6 * sep * k;
          let py = y + (last ? 0 : (hash(k, 5) - 0.5) * 40 * sep);
          let al = 1;
          if (last) { const L = px1 - px0; px0 = lerp(px0, bx - 22 - L, cap); px1 = px0 + L; py = lerp(py, by - 14, cap); }
          else { al = 1 - 0.75 * sp(t, 9.0, 10.2); py += 60 * sp(t, 9.0, 10.4); }
          ssStrand(ctx, px0, py, px1, py, { color: P.rna, lw: 2.4, tickEvery: 8, tickLen: 4, alpha: a * al });
          if (last) text(ctx, 'AAAAAAA', px1 + 4, py, { size: 10.5, color: P.gold, weight: 700, alpha: a * al, mono: true });
          if (k === 0) text(ctx, '5′', px0 - 14, py, { size: 10.5, color: P.inkDim, alpha: a * al });
        });
        // bead
        bead(ctx, bx + 26, by, 22, P, a * win(t, 8.2, 13.5, 0.4));
        text(ctx, 'oligo(dT)', bx + 26, by + 36, { size: 10.5, color: P.inkDim, align: 'center', alpha: a * win(t, 8.2, 13.5, 0.4) });
        text(ctx, 'TTTTTTT', bx + 4, by, { size: 10.5, color: P.bead, weight: 700, alpha: a * win(t, 8.2, 13.5, 0.4), mono: true, align: 'right' });
        text(ctx, 'only the 3′ fragment is captured; everything upstream is washed away', x0, y + 95, { size: 12, color: P.alert, alpha: a * win(t, 9.4, 13.5, 0.4) });
      }
    }

    // ---- phase 3: gene-body coverage ----
    {
      const a = win(t, 10.0, 13.5, 0.6);
      if (a > 0) {
        const x = 110, y = 300, w = 560, h = 160;
        text(ctx, 'gene-body coverage', x, y - 14, { size: 13, color: P.ink, weight: 600, alpha: a });
        line(ctx, x, y + h + 0.5, x + w, y + h + 0.5, P.inkFaint, 1, a);
        text(ctx, '5′', x, y + h + 14, { size: 11, color: P.inkDim, alpha: a });
        text(ctx, '3′', x + w, y + h + 14, { size: 11, color: P.inkDim, align: 'right', alpha: a });
        text(ctx, 'position along transcript (%)', x + w / 2, y + h + 14, { size: 11, color: P.inkDim, align: 'center', alpha: a });
        const rev = sp(t, 10.3, 11.6);
        const fInt = u => 0.55 + 0.12 * Math.sin(u * 9) * Math.exp(-((u - 0.5) ** 2) * 2) - 0.25 * Math.exp(-u * 12) - 0.25 * Math.exp(-(1 - u) * 12);
        const fDeg = u => 0.08 + 0.85 * Math.pow(u, 2.6) - 0.3 * Math.exp(-(1 - u) * 14);
        [[fInt, P.good, 'intact, RIN 9.5'], [fDeg, P.alert, 'degraded + poly(A), RIN 4']].forEach(([f, c, lab], k) => {
          ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.beginPath();
          const n = 120;
          for (let i = 0; i <= n; i++) { const u = i / n; if (u > rev) break; const px = x + u * w, py = y + h - Math.max(0, Math.min(1, f(u))) * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
          ctx.stroke(); ctx.restore();
          text(ctx, lab, x + w + 14, y + h - Math.min(1, f(1)) * h + (k ? 16 : -8), { size: 11.5, color: c, alpha: a * win(t, 11.2, 13.5, 0.4) });
        });
        const la = a * win(t, 11.8, 13.5, 0.4);
        ctx.save(); ctx.globalAlpha = la * 0.18; ctx.fillStyle = P.alert; ctx.fillRect(x, y, w * 0.35, h); ctx.restore();
        text(ctx, '5′ ends of long genes: no reads', x + w * 0.175, y + 18, { size: 11, color: P.alert, align: 'center', alpha: la });
        text(ctx, 'check: RSeQC geneBody_coverage, Picard 5′/3′ bias; include RIN as a covariate', x, 500, { size: 11.5, color: P.inkDim, alpha: la });
      }
    }
  },
};
