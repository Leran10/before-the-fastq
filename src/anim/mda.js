// Multiple displacement amplification: phi29 + random hexamers turn
// picograms into micrograms, unevenly. Circular ssDNA is amplified far
// more, template switching makes chimeras, coverage swings by orders of magnitude.
import { prog, sp, win, pulse, lerp, hash, text, dsFragment, ssStrand, blob, dot, line, arrow, roundRect, withAlpha, clamp } from '../draw.js';

const LIN = [ { x: 90, y: 120, len: 150 }, { x: 110, y: 230, len: 120 }, { x: 80, y: 330, len: 170 } ];
const CIRC = { x: 480, y: 265, r: 26 };

// branches: [parent index or -1, position along parent (0..1), angle, length, start time]
const BR = [];
LIN.forEach((L, li) => {
  for (let k = 0; k < 5; k++) {
    const u = 0.1 + 0.8 * hash(k, li + 1);
    const ang = (hash(k, li + 7) > 0.5 ? -1 : 1) * (0.5 + 0.6 * hash(k, li + 3));
    const len = 40 + 40 * hash(k, li + 5);
    const st = 2.4 + 1.6 * hash(k, li + 9);
    BR.push({ li, u, ang, len, st, lvl: 1, id: BR.length });
    // second level
    for (let j = 0; j < 2; j++) {
      BR.push({ li, parent: BR.length - 1 - j * 0, u: 0.5 + 0.4 * hash(j, k + li * 10), ang: ang + (hash(j, k + 20) - 0.5) * 1.4, len: 25 + 25 * hash(j, k + 30), st: st + 1.0 + 0.6 * hash(j, k + 40), lvl: 2, pid: BR.length - 1 - j });
    }
  }
});

export default {
  id: 'mda',
  duration: 13,
  thumbT: 5.6,
  phases: [
    { t: 0, label: 'Picograms of template', caption: 'The input is a handful of linear dsDNA fragments and, often, small circular ssDNA genomes.' },
    { t: 2.2, label: 'phi29 strand displacement', caption: 'Random hexamers prime everywhere; phi29 displaces strands as it goes, producing hyperbranched products at 30 °C with no cycling.' },
    { t: 6.2, label: 'Template switch → chimera', caption: 'A displaced strand can switch templates mid-synthesis, joining two genomes into one molecule.' },
    { t: 8.6, label: 'What the coverage looks like', caption: 'Coverage varies by orders of magnitude along a genome, and circular ssDNA genomes dominate the library.' },
  ],
  draw(ctx, t, W, H, P) {
    const sceneA = 1 - 0.88 * sp(t, 8.6, 9.3);
    ctx.save(); ctx.globalAlpha = sceneA;
    // linear templates
    LIN.forEach((L, li) => dsFragment(ctx, L.x, L.x + L.len, L.y, { colorA: P.dna, colorB: P.dnaLight, lw: 2.2 }));
    text(ctx, 'linear dsDNA fragments', 90, 80, { size: 12, color: P.inkDim, alpha: win(t, 0.3, 2.4, 0.3) });
    // circular ssDNA
    ctx.save(); ctx.strokeStyle = P.dna; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(CIRC.x, CIRC.y, CIRC.r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.globalAlpha *= 0.6; ctx.beginPath();
    for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9; ctx.moveTo(CIRC.x + Math.cos(a) * CIRC.r, CIRC.y + Math.sin(a) * CIRC.r); ctx.lineTo(CIRC.x + Math.cos(a) * (CIRC.r - 4), CIRC.y + Math.sin(a) * (CIRC.r - 4)); }
    ctx.stroke(); ctx.restore();
    text(ctx, 'circular ssDNA genome', CIRC.x, CIRC.y + CIRC.r + 18, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 0.3, 2.4, 0.3) });
    text(ctx, 'a few picograms in total', 480, 60, { size: 13, color: P.ink, align: 'center', alpha: win(t, 0.5, 2.3, 0.3) });

    // hexamers landing (phase 1)
    const ha = win(t, 2.2, 3.4, 0.3);
    if (ha > 0) {
      for (let i = 0; i < 9; i++) { const L = LIN[i % 3]; const u = hash(i, 50); const drop = sp(t, 2.2 + hash(i, 51) * 0.6, 2.8 + hash(i, 51) * 0.6); line(ctx, L.x + u * L.len - 5, L.y - 5 - 30 * (1 - drop), L.x + u * L.len + 5, L.y - 5 - 30 * (1 - drop), P.p5, 2.5, ha); }
    }
    // legend + conditions (right side)
    const la = win(t, 2.3, 8.6, 0.4);
    if (la > 0) {
      line(ctx, 700, 110, 712, 110, P.p5, 2.5, la);
      text(ctx, 'random hexamer primers', 722, 110, { size: 11.5, color: P.inkDim, alpha: la });
      blob(ctx, 706, 138, 7, P.enzyme, { seed: 4, alpha: la });
      text(ctx, 'phi29 polymerase (strand-displacing)', 722, 138, { size: 11.5, color: P.inkDim, alpha: la });
      text(ctx, '30 °C, 1–16 h, no thermal cycling', 700, 180, { size: 11.5, color: P.inkDim, alpha: la });
      text(ctx, 'input × 10³–10⁶', 700, 202, { size: 11.5, color: P.inkDim, alpha: la });
    }
    // branches growing off linear templates
    const ends = [];
    BR.forEach(b => {
      const g = sp(t, b.st, b.st + 1.6);
      if (g <= 0) return;
      let bx, by;
      if (b.lvl === 1) { const L = LIN[b.li]; bx = L.x + b.u * L.len; by = L.y; }
      else { const p = BR[b.pid]; const L = LIN[p.li]; const px = L.x + p.u * L.len, py = L.y; const pg = sp(t, p.st, p.st + 1.6); bx = px + Math.cos(p.ang) * p.len * Math.min(pg, b.u); by = py + Math.sin(p.ang) * p.len * Math.min(pg, b.u); if (pg < b.u) return; }
      const ex = bx + Math.cos(b.ang) * b.len * g, ey = by + Math.sin(b.ang) * b.len * g;
      ssStrand(ctx, bx, by, ex, ey, { color: P.dna, lw: 1.8, tickEvery: 7, tickLen: 3 });
      if (g < 1) blob(ctx, ex, ey, 6, P.enzyme, { seed: b.id, alpha: 0.9 });
    });
    // rolling circle: spiral grows fast
    const rc = sp(t, 2.8, 6.4);
    if (rc > 0) {
      ctx.save(); ctx.strokeStyle = P.dna; ctx.lineWidth = 1.6; ctx.beginPath();
      const turns = 5.5 * rc; const N = Math.max(2, Math.floor(turns * 40));
      for (let i = 0; i <= N; i++) { const th = (i / N) * turns * Math.PI * 2; const r = CIRC.r + 6 + th * 2.6; const px = CIRC.x + Math.cos(th) * r, py = CIRC.y + Math.sin(th) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.restore();
      const th = turns * Math.PI * 2; const r = CIRC.r + 6 + th * 2.6;
      if (rc < 1) blob(ctx, CIRC.x + Math.cos(th) * r, CIRC.y + Math.sin(th) * r, 7, P.enzyme, { seed: 99 });
      text(ctx, 'rolling circle: 10–1000× more product', CIRC.x, CIRC.y + 150, { size: 11.5, color: P.gold, align: 'center', alpha: win(t, 4.2, 8.6, 0.4), weight: 600 });
    }
    // chimera: a strand from template 2 jumps to template 3
    const ch = win(t, 6.3, 8.6, 0.3);
    if (ch > 0) {
      const L2 = LIN[1], L3 = LIN[2];
      const g1 = sp(t, 6.3, 7.0), g2 = sp(t, 7.1, 7.9);
      const x0 = L2.x + 60, y0 = L2.y + 8;
      const x1 = x0 + 70 * g1;
      ssStrand(ctx, x0, y0, x1, y0, { color: P.dna, lw: 2.2, side: 1, tickEvery: 6 });
      if (g1 >= 1) {
        const jx = L3.x + 40, jy = L3.y - 8;
        ssStrand(ctx, x1, y0, lerp(x1, jx, g2), lerp(y0, jy, g2), { color: P.alert, lw: 1.5, ticks: false, dash: [3, 3] });
        if (g2 >= 1) { ssStrand(ctx, jx, jy, jx + 70 * sp(t, 7.9, 8.5), jy, { color: P.dna, lw: 2.2, side: -1, tickEvery: 6 }); dot(ctx, jx, jy, 5, P.alert, pulse(t, 7.8, 8.6) * 0.8 + 0.3); }
        blob(ctx, lerp(x1, jx, g2), lerp(y0, jy, g2), 7, P.enzyme, { seed: 7, alpha: g2 < 1 ? 1 : 0 });
      }
      text(ctx, 'template switch: one molecule, two genomes', 90, 430, { size: 12, color: P.alert, alpha: ch, weight: 600 });
    }
    ctx.restore();

    // ---- consequences ----
    const ca = win(t, 8.8, 14, 0.5);
    if (ca > 0) {
      // coverage along genome, log axis
      const X = 90, Y = 110, Wd = 500, Hd = 220;
      text(ctx, 'coverage along one genome after MDA', X, Y - 20, { size: 13, color: P.ink, weight: 600, alpha: ca });
      [0, 1, 2, 3, 4].forEach(k => { const y = Y + Hd - k * Hd / 4; line(ctx, X, y, X + Wd, y, P.grid, 1, ca); text(ctx, ['1', '10', '100', '1k', '10k'][k] + '×', X - 8, y, { size: 10.5, color: P.inkDim, align: 'right', alpha: ca }); });
      const g = sp(t, 9.0, 10.6);
      ctx.save(); ctx.globalAlpha = ca; ctx.strokeStyle = P.dna; ctx.lineWidth = 2; ctx.beginPath();
      const N = 200;
      for (let i = 0; i <= N * g; i++) {
        const u = i / N;
        const v = 0.5 + 0.28 * Math.sin(u * 19) + 0.2 * Math.sin(u * 53 + 1) + 0.12 * Math.sin(u * 131 + 2) + 0.1 * (hash(i, 3) - 0.5);
        const px = X + u * Wd, py = Y + Hd - clamp(v) * Hd;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke(); ctx.restore();
      text(ctx, 'genome position →', X + Wd, Y + Hd + 16, { size: 10.5, color: P.inkDim, align: 'right', alpha: ca });
      text(ctx, 'assemblies break at the valleys; abundances are not quantitative', X, Y + Hd + 40, { size: 11.5, color: P.inkDim, alpha: ca * sp(t, 10.4, 11) });
      // ssDNA vs dsDNA bars
      const bx = 680, by = 330, bw = 70;
      const g2 = sp(t, 10.6, 11.8);
      text(ctx, 'apparent abundance', 760, 90, { size: 13, color: P.ink, align: 'center', weight: 600, alpha: ca });
      text(ctx, 'equal input', 760, 110, { size: 11, color: P.inkDim, align: 'center', alpha: ca });
      ctx.save(); ctx.globalAlpha = ca;
      ctx.fillStyle = P.dna; ctx.fillRect(bx, by - 200 * g2, bw, 200 * g2);
      ctx.fillStyle = P.dnaDim; ctx.fillRect(bx + 100, by - 22 * g2, bw, 22 * g2);
      ctx.strokeStyle = P.alert; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeRect(bx - 6, by - 206, bw + 12, 206);
      ctx.restore();
      text(ctx, 'circular ssDNA', bx + bw / 2, by + 14, { size: 10.5, color: P.inkDim, align: 'center', alpha: ca });
      text(ctx, 'linear dsDNA', bx + 100 + bw / 2, by + 14, { size: 10.5, color: P.inkDim, align: 'center', alpha: ca });
      text(ctx, '10–1000× over-represented', bx + 85, by + 34, { size: 11, color: P.alert, align: 'center', alpha: ca * g2 });
    }
  },
};
