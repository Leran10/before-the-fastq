// Tiled multiplex amplicon PCR: a known genome, two pools of overlapping
// amplicons, why the pools are separate, how a primer-site mutation or a
// low template drops amplicons, and the staircase coverage that results.
import { prog, sp, win, pulse, lerp, hash, text, callout, ssStrand, dsFragment, line, arrow, roundRect, panelTitle, footnote, withAlpha } from '../draw.js';

const G0 = 80, G1 = 880, GW = G1 - G0;      // genome on screen
const N = 8, L = 150, STEP = (GW - L) / (N - 1); // 8 amplicons of ~400 bp, overlapping
const PL = 16;                               // primer length on screen
const AMP = Array.from({ length: N }, (_, i) => ({ i, x0: G0 + i * STEP, x1: G0 + i * STEP + L, pool: i % 2 }));
const Y_G = 160, Y_P1 = 246, Y_P2 = 300, Y_MIX = 273;
const DROP = 3;                              // amplicon with a mutation under its forward primer
const EMPTY = 6;                             // amplicon that finds no template at Ct > 30

function poolColor(P, pool) { return pool === 0 ? P.p5 : P.p7; }

// yield of each amplicon as a function of time
function yields(t) {
  const mut = sp(t, 8.4, 9.2);
  const low = sp(t, 9.6, 10.6);
  return AMP.map(a => {
    let y = 1;
    if (a.i === DROP) y = 1 - mut;
    const stoch = a.i === EMPTY ? 0 : 0.25 + 0.75 * hash(a.i, 11);
    return y * lerp(1, stoch, low);
  });
}

function primerPair(ctx, a, y, col, alpha, o = {}) {
  const { dy = 0 } = o;
  arrow(ctx, a.x0, y + dy, a.x0 + PL, y + dy, col, { lw: 2.5, head: 6, alpha });
  arrow(ctx, a.x1, y - dy, a.x1 - PL, y - dy, col, { lw: 2.5, head: 6, alpha });
}

export default {
  id: 'tiled-amplicon-pcr',
  duration: 15,
  thumbT: 13.6,
  phases: [
    { t: 0, label: 'A known genome, tiled', caption: 'The viral RNA is copied to cDNA, then a primer scheme tiles the genome with ~400 bp amplicons that overlap their neighbours by 50–100 bp.' },
    { t: 2.5, label: 'Two pools, two tubes', caption: 'Odd amplicons are amplified in pool 1 and even ones in pool 2, each as its own multiplex PCR of 25–35 cycles.' },
    { t: 5.5, label: 'Why two pools', caption: 'In one tube, the inward-facing primers of two neighbours would make a short overlap product that out-competes every full-length amplicon.' },
    { t: 8, label: 'Dropout and low template', caption: 'A mutation under a primer silences that amplicon. Below a few hundred copies, amplification is stochastic: some amplicons never find a template and the rest are wildly unequal.' },
    { t: 11, label: 'Pools combined', caption: 'The two pools are mixed and go into library prep as one sample.' },
    { t: 12.5, label: 'Coverage is the scheme', caption: 'Depth is a staircase of plateaus with sharp edges at primer positions; a gap is a dropped amplicon, not a deletion.' },
  ],
  draw(ctx, t, W, H, P) {
    const rt = sp(t, 0.3, 1.3);                 // RNA → cDNA
    const primersIn = sp(t, 1.2, 2.2);
    const grow = sp(t, 2.8, 4.6);               // amplicons grow in two rows
    const why = win(t, 5.5, 8.0, 0.35);
    const yl = yields(t);
    const mix = sp(t, 11.1, 12.1);
    const cov = sp(t, 12.7, 13.9);
    const covA = win(t, 12.5, 15, 0.3);

    panelTitle(ctx, 'Tiled amplicon PCR', W, P);
    text(ctx, 'ARTIC V4.1 · 2 pools', W - 28, 30, { size: 13, color: P.inkDim, align: 'right', mono: true });

    // ── genome: RNA fading into cDNA ──
    ssStrand(ctx, G0, Y_G, G1, Y_G, { color: P.rna, alpha: 1 - rt, tickEvery: 12, side: -1 });
    ssStrand(ctx, G0, Y_G, G1, Y_G, { color: P.dna, alpha: rt, tickEvery: 12, side: -1 });
    text(ctx, rt < 0.5 ? 'viral RNA, ~30 kb' : 'first-strand cDNA (random hexamers)', G0, Y_G - 20, { size: 12, color: rt < 0.5 ? P.rna : P.dna });
    text(ctx, '5′', G0 - 18, Y_G, { size: 11, color: P.inkDim, align: 'right' });
    text(ctx, '3′', G1 + 8, Y_G, { size: 11, color: P.inkDim });

    text(ctx, '98 amplicons × ~400 bp, each overlapping its neighbours', W / 2, 300, { size: 13, color: P.inkDim, align: 'center', alpha: win(t, 1.0, 2.6, 0.3) });
    // primers on the genome: pool 1 just above, pool 2 just below
    AMP.forEach(a => {
      const col = poolColor(P, a.pool);
      const al = primersIn * (1 - 0.7 * grow);
      const y = a.pool === 0 ? Y_G - 9 : Y_G + 9;
      primerPair(ctx, a, y, col, al);
      if (a.i === DROP) {
        const m = sp(t, 8.1, 8.6);
        // mutation under the forward primer
        text(ctx, '×', a.x0 + PL / 2, Y_G + 1, { size: 20, color: P.gold, weight: 700, align: 'center', alpha: m });
        callout(ctx, 'mutation under primer', a.x0 + PL / 2 + 14, Y_G - 30, P, { to: [a.x0 + PL / 2, Y_G - 8], color: P.gold, alpha: m * (1 - cov) });
      }
    });
    text(ctx, 'pool 1', G0 - 18, Y_G - 11, { size: 10, color: P.p5, align: 'right', alpha: primersIn * (1 - grow) });
    text(ctx, 'pool 2', G0 - 18, Y_G + 11, { size: 10, color: P.p7, align: 'right', alpha: primersIn * (1 - grow) });

    // ── amplicons in two rows, later merged ──
    const rowY = pool => lerp(pool === 0 ? Y_P1 : Y_P2, Y_MIX, mix);
    if (grow > 0) {
      // row labels
      text(ctx, 'pool 1', G0 - 18, Y_P1, { size: 11, color: P.p5, align: 'right', alpha: grow * (1 - mix) });
      text(ctx, 'pool 2', G0 - 18, Y_P2, { size: 11, color: P.p7, align: 'right', alpha: grow * (1 - mix) });
      text(ctx, 'combined', G0 - 18, Y_MIX, { size: 11, color: P.ink, align: 'right', alpha: mix });
      AMP.forEach(a => {
        const col = poolColor(P, a.pool);
        const g = prog(grow, a.i / (N + 2), (a.i + 3) / (N + 2));
        if (g <= 0) return;
        const y = rowY(a.pool);
        const cx = (a.x0 + a.x1) / 2, half = (L / 2) * g;
        const yv = yl[a.i];
        if (yv > 0.02) {
          const bh = 3 + 7 * yv;                 // bar height follows yield
          ctx.save(); ctx.globalAlpha *= 0.35 + 0.65 * yv;
          ctx.fillStyle = col; roundRect(ctx, cx - half, y - bh / 2, half * 2, bh, 3); ctx.fill();
          ctx.restore();
          // primers at the ends, darker
          ctx.save(); ctx.globalAlpha *= 0.35 + 0.65 * yv; ctx.fillStyle = withAlpha(P.ink, 0.35);
          ctx.fillRect(cx - half, y - bh / 2, Math.min(PL, half * 2), bh); ctx.fillRect(cx + half - Math.min(PL, half * 2), y - bh / 2, Math.min(PL, half * 2), bh);
          ctx.restore();
        }
        if (yv < 0.98 && g > 0.95) {
          // dashed outline for the missing part
          ctx.save(); ctx.globalAlpha *= (1 - yv); ctx.strokeStyle = P.alert; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
          roundRect(ctx, cx - half, y - 5, half * 2, 10, 3); ctx.stroke(); ctx.restore();
        }
      });
      // dropout / low-template labels
      const d = AMP[DROP];
      text(ctx, 'dropout', (d.x0 + d.x1) / 2, rowY(d.pool) - 16, { size: 12, color: P.alert, weight: 600, align: 'center', alpha: sp(t, 8.8, 9.3) * (1 - cov) });
      const e = AMP[EMPTY];
      text(ctx, 'no template found', (e.x0 + e.x1) / 2, rowY(e.pool) + 20, { size: 11, color: P.alert, align: 'center', alpha: sp(t, 10.2, 10.7) * (1 - cov) });
      text(ctx, 'Ct > 30: stochastic, unequal', G1, Y_P2 + 34, { size: 12, color: P.inkDim, align: 'right', alpha: sp(t, 9.8, 10.4) * (1 - mix) });
      // overlap guides between rows while separate
      if (mix < 1) {
        for (let i = 0; i < N - 1; i++) {
          const a = AMP[i], b = AMP[i + 1];
          const al = 0.35 * prog(grow, 0.85, 1) * (1 - mix);
          line(ctx, b.x0, Y_P1 - 7, b.x0, Y_P2 + 7, P.inkFaint, 1, al, [2, 3]);
          line(ctx, a.x1, Y_P1 - 7, a.x1, Y_P2 + 7, P.inkFaint, 1, al, [2, 3]);
        }
        text(ctx, 'overlap 50–100 bp', AMP[1].x0 + 2, Y_P2 + 22, { size: 10, color: P.inkDim, alpha: win(t, 3.8, 5.6, 0.3) });
      }
    }

    // ── why two pools: inset in the lower band ──
    if (why > 0) {
      const y0 = 392, cx = 480, OV = 70;
      const a0 = cx - 250, a1 = cx + OV / 2, b0 = cx - OV / 2, b1 = cx + 250; // two neighbours sharing a tube
      text(ctx, 'if neighbours shared one tube', cx, y0 - 24, { size: 12, color: P.inkDim, align: 'center', alpha: why });
      ctx.save(); ctx.globalAlpha *= why * 0.9;
      ctx.fillStyle = P.p5; roundRect(ctx, a0, y0 - 5, a1 - a0, 10, 3); ctx.fill();
      ctx.fillStyle = P.p7; roundRect(ctx, b0, y0 + 19, b1 - b0, 10, 3); ctx.fill();
      ctx.restore();
      text(ctx, 'amplicon n', a0, y0 - 14, { size: 11, color: P.p5, alpha: why });
      text(ctx, 'amplicon n + 1', b1, y0 + 10, { size: 11, color: P.p7, align: 'right', alpha: why });
      // inward-facing primers in the overlap: forward of n+1 and reverse of n
      arrow(ctx, b0, y0 + 12, b0 + PL, y0 + 12, P.p7, { lw: 2.5, head: 6, alpha: why });
      arrow(ctx, a1, y0 + 12, a1 - PL, y0 + 12, P.p5, { lw: 2.5, head: 6, alpha: why });
      line(ctx, b0, y0 - 12, b0, y0 + 36, P.inkFaint, 1, why * 0.6, [2, 3]);
      line(ctx, a1, y0 - 12, a1, y0 + 36, P.inkFaint, 1, why * 0.6, [2, 3]);
      // the short product wins
      const w2 = sp(t, 6.3, 7.2);
      for (let k = 0; k < 4; k++) {
        const al = why * prog(w2, k / 4, (k + 1) / 4);
        ctx.save(); ctx.globalAlpha *= al; ctx.fillStyle = P.alert; roundRect(ctx, b0, y0 + 40 + k * 9, OV, 6, 2); ctx.fill(); ctx.restore();
      }
      text(ctx, 'short overlap product out-competes both', cx + OV / 2 + 14, y0 + 56, { size: 12, color: P.alert, alpha: why * w2 });
      text(ctx, 'so: odd amplicons in pool 1, even in pool 2', cx, y0 + 96, { size: 12, color: P.ink, align: 'center', alpha: why * sp(t, 7.0, 7.6) });
    }

    // ── coverage staircase ──
    if (covA > 0) {
      const cy0 = 356, ch = 108, cy1 = cy0 + ch;
      text(ctx, 'depth along the genome', G0, cy0 - 12, { size: 12, color: P.inkDim, alpha: covA });
      line(ctx, G0, cy1 + 0.5, G1, cy1 + 0.5, P.inkFaint, 1, covA);
      // step profile: sum of yields of amplicons covering x
      ctx.save(); ctx.globalAlpha *= covA;
      ctx.beginPath(); ctx.moveTo(G0, cy1);
      const steps = 400;
      for (let s = 0; s <= steps; s++) {
        const x = G0 + (GW * s) / steps;
        let d = 0; AMP.forEach(a => { if (x >= a.x0 && x <= a.x1) d += yl[a.i]; });
        const v = Math.min(1, d / 1.6) * cov;
        ctx.lineTo(x, cy1 - v * ch);
      }
      ctx.lineTo(G1, cy1); ctx.closePath();
      ctx.fillStyle = withAlpha(P.dna, 0.35); ctx.fill();
      ctx.strokeStyle = P.dna; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      // mark the gap and the edges
      const d = AMP[DROP], gx0 = AMP[DROP - 1].x1, gx1 = AMP[DROP + 1].x0;
      const ga = covA * sp(t, 13.6, 14.1);
      ctx.save(); ctx.globalAlpha *= ga * 0.25; ctx.fillStyle = P.alert; ctx.fillRect(gx0, cy0, gx1 - gx0, ch); ctx.restore();
      text(ctx, 'gap = dropped amplicon', (gx0 + gx1) / 2, cy0 + 8, { size: 11, color: P.alert, weight: 600, align: 'center', alpha: ga });
      callout(ctx, 'sharp edges at primer positions', AMP[5].x1 + 6, cy0 + 30, P, { to: [AMP[5].x1, cy1 - 20], alpha: ga, size: 11 });
      footnote(ctx, 'Coverage shape is the primer scheme, not the virus.', W, H, P, covA * sp(t, 13.4, 14));
    }
  },
};
