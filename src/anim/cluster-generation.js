// Cluster generation: lawn of oligos -> bridge amplification -> random vs
// patterned flow cells -> optical duplicates and index hopping.
import { prog, sp, win, pulse, lerp, hash, clamp, text, callout, ssStrand, line, dot, arrow, roundRect, withAlpha } from '../draw.js';

const SURF = 400;              // flow-cell surface y in phases 0-1
const LAWN_X0 = 60, LAWN_X1 = 900;

function lawn(ctx, x0, x1, y, P, alpha, every = 11) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = P.glass; ctx.fillRect(x0, y, x1 - x0, 5);
  for (let x = x0 + 5, i = 0; x < x1; x += every, i++) {
    const c = i % 2 ? P.p7 : P.p5;
    line(ctx, x, y, x, y - 9, c, 2, 0.9);
  }
  ctx.restore();
}

// A single library strand: P5 (teal) - insert (blue) - P7 (violet), drawn as a polyline from a to b
function strand(ctx, ax, ay, bx, by, P, alpha = 1, lw = 2.2) {
  if (alpha <= 0) return;
  const f = (u) => [lerp(ax, bx, u), lerp(ay, by, u)];
  const [p1x, p1y] = f(0.18), [p2x, p2y] = f(0.82);
  line(ctx, ax, ay, p1x, p1y, P.p5, lw, alpha);
  line(ctx, p1x, p1y, p2x, p2y, P.dna, lw, alpha);
  line(ctx, p2x, p2y, bx, by, P.p7, lw, alpha);
}

function clusterStrands(ctx, cx, y, n, P, alpha, h = 34) {
  if (alpha <= 0) return;
  for (let i = 0; i < n; i++) {
    const x = cx + (hash(i, 3) - 0.5) * Math.min(60, 8 + n * 4);
    const hh = h * (0.8 + 0.3 * hash(i, 4));
    const top = i % 2 ? P.p5 : P.p7, bot = i % 2 ? P.p7 : P.p5;
    line(ctx, x, y, x, y - hh * 0.2, bot, 2, alpha);
    line(ctx, x, y - hh * 0.2, x, y - hh * 0.8, P.dna, 2, alpha);
    line(ctx, x, y - hh * 0.8, x, y - hh, top, 2, alpha);
  }
}

export default {
  id: 'cluster-generation',
  duration: 14,
  thumbT: 8.4,
  phases: [
    { t: 0, label: 'Lawn of oligos', caption: 'The flow-cell surface is covered with two kinds of short oligos, complementary to P5 and P7; denatured library strands land on it.' },
    { t: 3, label: 'Bridge amplification', caption: 'A captured strand is copied, bends over to a neighbouring oligo and is copied again; ~35 rounds give a cluster of ~1000 identical copies.' },
    { t: 6.8, label: 'Random vs patterned', caption: 'Random flow cells overcluster when overloaded; patterned nanowells are either empty, monoclonal or polyclonal, and only monoclonal wells pass.' },
    { t: 10.2, label: 'Two artefacts born here', caption: 'One molecule seeding two neighbouring wells gives an optical duplicate; a stray index primer re-priming a strand gives index hopping.' },
  ],
  draw(ctx, t, W, H, P) {
    // ───────── phases 0–1: lawn + bridge amplification ─────────
    const scene1 = 1 - prog(t, 6.6, 7.3);
    if (scene1 > 0) {
      ctx.save(); ctx.globalAlpha = scene1;
      lawn(ctx, LAWN_X0, LAWN_X1, SURF, P, 1);
      text(ctx, 'glass surface with covalently attached P5 and P7 oligos', W / 2, SURF + 24, { size: 12, color: P.inkDim, align: 'center' });
      callout(ctx, 'P5 oligo', 120, SURF - 30, P, { to: [115, SURF - 9], size: 11, color: P.p5, alpha: win(t, 0.3, 3) });
      callout(ctx, 'P7 oligo', 190, SURF - 30, P, { to: [181, SURF - 9], size: 11, color: P.p7, alpha: win(t, 0.3, 3) });

      // falling single strands (phase 0)
      for (let i = 0; i < 7; i++) {
        const x = 420 + i * 62 + (hash(i, 7) - 0.5) * 30;
        const d = prog(t, 0.2 + i * 0.25, 2.6 + i * 0.25);
        const y = lerp(80, SURF - 12, d * d);
        const a = (1 - prog(t, 2.9, 3.3)) * win(t, 0, 7, 0.2);
        const ang = Math.sin(t * 2 + i) * 0.5;
        strand(ctx, x - 20 * Math.cos(ang), y - 20 * Math.sin(ang) - 10, x + 20 * Math.cos(ang), y + 20 * Math.sin(ang) - 10, P, a * (i === 0 ? 1 : 0.85));
      }
      text(ctx, 'denatured library: single strands at ~1–2 pM (patterned) or ~10 pM (random)', 620, 36, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 0.4, 3) });

      // bridge amplification at x=300
      const BX = 300;
      const a1 = win(t, 3, 7, 0.4);
      if (a1 > 0) {
        // step a: strand hybridised to a P7 oligo (vertical), 3.0–3.8
        const h = 60;
        const up = sp(t, 3.0, 3.6);
        ctx.save(); ctx.globalAlpha = a1;
        // captured strand vertical
        line(ctx, BX, SURF, BX, SURF - h * 0.2 * up, P.p7, 2.4);
        line(ctx, BX, SURF - h * 0.2 * up, BX, SURF - h * 0.8 * up, P.dna, 2.4);
        line(ctx, BX, SURF - h * 0.8 * up, BX, SURF - h * up, P.p5, 2.4);
        callout(ctx, 'strand hybridises by its P7 end', BX + 14, SURF - 62, P, { size: 11.5, alpha: win(t, 3.1, 4.1, 0.3) });
        // step b: bend over to P5 oligo: arc from top to BX+44
        const bend = sp(t, 4.0, 4.9);
        if (bend > 0) {
          const ex = BX + 44 * bend, ey = lerp(SURF - h, SURF, bend);
          ctx.strokeStyle = P.dna; ctx.lineWidth = 2.4; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(BX, SURF - h); ctx.quadraticCurveTo(BX + 22 * bend, SURF - h - 30 * bend, ex, ey); ctx.stroke();
          dot(ctx, ex, ey, 3, P.p5, bend);
          callout(ctx, 'bends to a P5 oligo: a bridge', BX + 60, SURF - 92, P, { size: 11.5, alpha: win(t, 4.3, 5.4, 0.3) });
        }
        // step c: copies double
        const dbl = prog(t, 5.0, 6.4);
        const rounds = Math.floor(dbl * 6);          // 0..6 -> 1..64 shown as capped
        const n = Math.min(40, Math.pow(2, rounds));
        if (dbl > 0) clusterStrands(ctx, BX + 22, SURF, n, P, win(t, 5.0, 7, 0.2), 50);
        if (rounds > 0) {
          text(ctx, `round ${rounds} → ${Math.pow(2, rounds)} copies`, BX + 22, SURF - 84, { size: 12, color: P.ink, align: 'center', weight: 600, alpha: win(t, 5.1, 6.9, 0.2) });
        }
        text(ctx, '~35 rounds → ~1000 copies: one cluster = one original molecule', W / 2, 90, { size: 13, color: P.ink, align: 'center', weight: 600, alpha: win(t, 5.6, 7, 0.3) });
        text(ctx, 'one strand per copy is then cleaved off so every copy points the same way', W / 2, 112, { size: 12, color: P.inkDim, align: 'center', alpha: win(t, 6.0, 7, 0.3) });
        ctx.restore();
      }
      ctx.restore();
    }

    // ───────── phase 2: random vs patterned ─────────
    const focus3 = sp(t, 10.2, 11.0); // phase 3 fades the phase-2 panels out
    const a2 = win(t, 6.9, 14.5, 0.5) * (1 - focus3);
    if (a2 > 0) {
      ctx.save(); ctx.globalAlpha = a2;
      // left panel: random clusters
      const LX = 60, LY = 110, LW = 390, LH = 250;
      const RX = 510, RY = 110, RW = 390, RH = 250;
      const load = sp(t, 7.4, 9.6);          // loading concentration ramps
      ctx.save();
      ctx.strokeStyle = P.grid; ctx.lineWidth = 1; roundRect(ctx, LX, LY, LW, LH, 8); ctx.stroke(); roundRect(ctx, RX, RY, RW, RH, 8); ctx.stroke();
      text(ctx, 'random clusters (MiSeq, HiSeq 2500)', LX, LY - 14, { size: 13, color: P.ink, weight: 600 });
      text(ctx, 'patterned nanowells (NovaSeq, NextSeq 1000/2000)', RX, RY - 14, { size: 13, color: P.ink, weight: 600 });
      // random clusters
      const NC = 90, pts = [];
      for (let i = 0; i < NC; i++) pts.push([LX + 16 + hash(i, 11) * (LW - 32), LY + 16 + hash(i, 12) * (LH - 32)]);
      const shown = Math.floor(NC * (0.25 + 0.75 * load));
      const overlapping = new Set();
      for (let i = 0; i < shown; i++) for (let j = i + 1; j < shown; j++) {
        const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
        if (d < 22) { overlapping.add(i); overlapping.add(j); }
      }
      for (let i = 0; i < shown; i++) {
        const bad = overlapping.has(i);
        dot(ctx, pts[i][0], pts[i][1], 10, bad ? P.alert : P.dna, bad ? 0.55 : 0.75);
      }
      const nBad = overlapping.size;
      text(ctx, `loading ↑   clusters: ${shown}   unresolvable: ${nBad}`, LX + LW / 2, LY + LH + 16, { size: 12, color: nBad > 10 ? P.alert : P.inkDim, align: 'center' });
      text(ctx, 'overclustering: low % passing filter, mixed reads, lower quality', LX + LW / 2, LY + LH + 34, { size: 11.5, color: P.alert, align: 'center', alpha: win(t, 9.0, 14.5, 0.3) });
      // patterned wells
      const cols = 12, rows = 7, gx = RW / (cols + 1), gy = RH / (rows + 1);
      let empty = 0, mono = 0, poly = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = RX + gx * (c + 1), y = RY + gy * (r + 1);
        const seeds = Math.floor(hash(i, 21) < load * 0.9 ? 1 : 0) + (hash(i, 22) < load * 0.22 ? 1 : 0);
        ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
        if (seeds === 1) { dot(ctx, x, y, 7, P.dna, 0.85); mono++; }
        else if (seeds >= 2) { dot(ctx, x, y, 7, P.alert, 0.7); poly++; }
        else empty++;
      }
      text(ctx, `empty ${empty}   monoclonal ${mono}   polyclonal ${poly}`, RX + RW / 2, RY + RH + 16, { size: 12, color: P.inkDim, align: 'center' });
      text(ctx, 'fixed density: underload wastes wells, overload makes polyclonal wells (filtered out)', RX + RW / 2, RY + RH + 34, { size: 11.5, color: P.inkDim, align: 'center', alpha: win(t, 9.0, 14.5, 0.3) });
      ctx.restore();
      ctx.restore();
    }

    // ───────── phase 3: optical duplicate + index hopping ─────────
    const a3 = win(t, 10.3, 14.5, 0.5);
    if (a3 > 0) {
      ctx.save(); ctx.globalAlpha = a3;
      ctx.strokeStyle = P.grid; ctx.lineWidth = 1; roundRect(ctx, 40, 150, 880, 300, 10); ctx.stroke();
      text(ctx, 'both artefacts come from the flow cell, not from the library', W / 2, 120, { size: 13, color: P.inkDim, align: 'center' });

      // left: pad hopping / optical duplicates
      const ox = 110, oy = 330;
      text(ctx, 'optical (pad-hopping) duplicate', 250, 185, { size: 13, color: P.ink, weight: 600, align: 'center' });
      lawn(ctx, 90, 420, oy, P, 1, 13);
      // two wells
      [0, 1].forEach(k => {
        const wx = 200 + k * 70;
        ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(wx, oy - 2, 22, Math.PI, 0); ctx.stroke();
      });
      const seed = sp(t, 10.6, 11.6);
      // a molecule's amplified copy drifts from well A into well B before clustering
      const mx = lerp(200, 270, seed);
      strand(ctx, mx - 14, oy - 50 + 12 * Math.sin(t * 5), mx + 14, oy - 50 - 12 * Math.sin(t * 5), P, 1 - prog(t, 11.5, 11.9));
      clusterStrands(ctx, 200, oy, 14, P, sp(t, 11.3, 12.0), 30);
      clusterStrands(ctx, 270, oy, 14, P, sp(t, 11.7, 12.4), 30);
      const g = win(t, 12.0, 14.5, 0.3);
      ctx.save(); ctx.globalAlpha = g; ctx.strokeStyle = P.gold; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      roundRect(ctx, 165, oy - 50, 140, 54, 8); ctx.stroke(); ctx.restore();
      text(ctx, 'same molecule, two adjacent wells', 235, oy + 30, { size: 11.5, color: P.gold, align: 'center', alpha: g });
      text(ctx, 'same tile, x/y a few pixels apart → MarkDuplicates OPTICAL_DUPLICATE_PIXEL_DISTANCE=2500', 250, oy + 50, { size: 10.5, color: P.inkDim, align: 'center', alpha: g, maxWidth: 360 });

      // right: index hopping
      const hx = 560;
      text(ctx, 'index hopping (ExAmp chemistry)', 720, 185, { size: 13, color: P.ink, weight: 600, align: 'center' });
      lawn(ctx, 530, 900, oy, P, 1, 13);
      // sample A strand with its i7 index block (sample colour 0)
      const sx = 640;
      line(ctx, sx, oy, sx, oy - 14, P.p7, 2.4); line(ctx, sx, oy - 14, sx, oy - 58, P.dna, 2.4); line(ctx, sx, oy - 58, sx, oy - 72, P.p5, 2.4);
      ctx.fillStyle = P.samples[0]; roundRect(ctx, sx - 4, oy - 12, 8, 7, 2); ctx.fill();
      text(ctx, 'sample A', sx, oy + 16, { size: 11, color: P.samples[0], align: 'center' });
      // a free index primer from sample B floats in and primes
      const fly = sp(t, 10.8, 12.0);
      const px = lerp(860, sx + 3, fly), py = lerp(200, oy - 20, fly);
      const pa = 1;
      line(ctx, px - 16, py, px + 4, py, P.p7, 2.4, pa);
      ctx.fillStyle = P.samples[1]; ctx.globalAlpha = a3 * pa; roundRect(ctx, px - 12, py - 4, 8, 7, 2); ctx.fill(); ctx.globalAlpha = a3;
      text(ctx, 'free index primer from sample B', 760, 215, { size: 11, color: P.samples[1], align: 'center', alpha: win(t, 10.6, 12.2, 0.3) });
      const ext = sp(t, 12.0, 12.8);
      if (ext > 0) {
        // extended copy now carries B's index on A's insert
        const cx2 = sx + 26;
        line(ctx, cx2, oy, cx2, oy - 14, P.p7, 2.4, ext); line(ctx, cx2, oy - 14, cx2, oy - 58 * ext, P.dna, 2.4, ext);
        ctx.fillStyle = P.samples[1]; roundRect(ctx, cx2 - 4, oy - 12, 8, 7, 2); ctx.fill();
        const fl = pulse(t, 12.5, 13.3); if (fl > 0) dot(ctx, cx2, oy - 12, 6 + 8 * fl, P.alert, fl * 0.7);
      }
      const h3 = win(t, 12.7, 14.5, 0.3);
      text(ctx, 'A’s insert now wears B’s index: read lands in sample B', 720, oy + 34, { size: 11.5, color: P.alert, align: 'center', alpha: h3 });
      text(ctx, '0.1–2 % of reads; detectable only with unique dual indexes', 720, oy + 52, { size: 10.5, color: P.inkDim, align: 'center', alpha: h3 });
      ctx.restore();
    }
  },
};
