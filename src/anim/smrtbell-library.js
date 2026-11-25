// SMRTbell library: shear to 15–20 kb, repair ends, ligate hairpin adapters,
// digest everything that is not a closed circle, remove short circles, bind
// primer + polymerase. End: read length is decided here.
import { prog, sp, win, pulse, lerp, hash, clamp, text, callout, dsPath, dsFragment, blob, dot, line, arrow, roundRect, curve, withAlpha, shake } from '../draw.js';

const X0 = 70, X1 = 890, YS = 120;
// shear pieces (constant, seed-derived)
const PIECES = [];
{
  let x = X0, i = 0;
  while (x < X1 - 30) {
    const len = 70 + 110 * hash(i, 5);
    const x1 = Math.min(X1, x + len);
    PIECES.push({ i, x0: x, x1, cutT: 0.9 + 1.4 * hash(i, 21), dy: (hash(i, 33) - 0.5) * 18, nick: hash(i, 44) > 0.4 });
    x = x1; i++;
  }
}
// histogram geometry (0–40 kb)
const HX0 = 620, HX1 = 900, HY = 420, HH = 110;
const kbToX = kb => HX0 + (kb / 40) * (HX1 - HX0);

// the three molecules of the ligation scene
const MOLS = [
  { y: 180, x0: 120, x1: 510, kind: 'long', label: '18 kb' },
  { y: 290, x0: 120, x1: 263, kind: 'short', label: '4 kb' },
  { y: 400, x0: 120, x1: 432, kind: 'one-adapter', label: 'only one adapter' },
];
const BIG = { y: 270, x0: 120, x1: 760 };   // the surviving SMRTbell in the final scene

function wavyY(x, ph = 0) { return YS + Math.sin(x * 0.025 + ph) * 12 + Math.sin(x * 0.061 + 2) * 4; }

// hairpin loop closing the two strands at x (dir -1 = left end, +1 = right end)
function loop(ctx, x, y, dir, P, alpha, gap = 7, lw = 2.4) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = P.enzyme; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath();
  if (dir < 0) ctx.arc(x, y, gap / 2 + 2, Math.PI / 2, Math.PI * 1.5);
  else ctx.arc(x, y, gap / 2 + 2, -Math.PI / 2, Math.PI / 2);
  ctx.stroke(); ctx.restore();
}

// a SMRTbell: duplex with a loop at each end; loopA / loopB in 0..1 control adapter attachment
function smrtbell(ctx, m, P, alpha, loopA = 1, loopB = 1, o = {}) {
  if (alpha <= 0) return;
  const { color = P.dna, colorB = P.dnaLight, scale = 1 } = o;
  const gap = 7 * scale, lw = 2.2 * scale, ad = 12 * scale;
  dsFragment(ctx, m.x0, m.x1, m.y, { colorA: color, colorB, alpha, gap, lw, rungEvery: 9 * scale });
  // adapters: short grey duplex stubs that slide in, then the loop
  if (loopA > 0) { const ax = lerp(m.x0 - 40, m.x0, loopA); dsFragment(ctx, ax - ad, ax, m.y, { colorA: P.enzyme, colorB: P.enzyme, alpha: alpha * loopA, gap, lw, rungEvery: 5 * scale }); loop(ctx, ax - ad, m.y, -1, P, alpha * loopA, gap, lw); }
  if (loopB > 0) { const bx = lerp(m.x1 + 40, m.x1, loopB); dsFragment(ctx, bx, bx + ad, m.y, { colorA: P.enzyme, colorB: P.enzyme, alpha: alpha * loopB, gap, lw, rungEvery: 5 * scale }); loop(ctx, bx + ad, m.y, 1, P, alpha * loopB, gap, lw); }
}

export default {
  id: 'smrtbell-library',
  duration: 13,
  thumbT: 7.2,
  phases: [
    { t: 0, label: 'Shear to 15–20 kb', caption: 'HMW DNA is sheared on a Megaruptor or g-TUBE to a distribution centred at 15–20 kb; the Femto Pulse trace sets expectations for read length.' },
    { t: 3, label: 'Repair the ends', caption: 'Nicks, abasic sites and oxidised bases are repaired, ends are blunted and A-tailed so the hairpin adapter can ligate.' },
    { t: 5.5, label: 'Hairpin adapters', caption: 'A hairpin on each end turns the duplex into one closed single-stranded circle. Exonucleases destroy anything that is still linear.' },
    { t: 8.5, label: 'Size selection', caption: 'Short SMRTbells diffuse into ZMWs faster and would take the wells; diluted beads or a gel cut remove circles below 3–10 kb.' },
    { t: 11, label: 'Primer and polymerase', caption: 'A sequencing primer anneals in the loop and a polymerase binds to it. Read length was decided by the shear and the cut-off, not by the sequencer.' },
  ],
  draw(ctx, t, W, H, P) {
    // ───── scene A/B: pieces (0 – 5.6) ─────
    const aA = 1 - sp(t, 5.2, 5.8);
    if (aA > 0) {
      const straighten = sp(t, 2.4, 3.2);
      const shakeAmp = 3 * pulse(t, 0.6, 2.6);
      const [shx, shy] = shake(t, shakeAmp, 36);
      PIECES.forEach(f => {
        const cut = sp(t, f.cutT, f.cutT + 0.8);
        const pts = [];
        const n = Math.max(2, Math.round((f.x1 - f.x0) / 7));
        for (let k = 0; k <= n; k++) {
          const u = k / n; const x = lerp(f.x0, f.x1, u);
          const y = lerp(wavyY(x), YS, straighten) + f.dy * cut;
          pts.push([x + shx * (1 - straighten), y + shy * (1 - straighten)]);
        }
        dsPath(ctx, pts, { colorA: P.dna, colorB: P.dnaLight, gap: 7, lw: 2.2, alpha: aA });
        // cut flash
        const fl = pulse(t, f.cutT - 0.1, f.cutT + 0.5);
        if (fl > 0 && f.i < PIECES.length - 1) dot(ctx, f.x1 + shx, wavyY(f.x1) + shy, 4 + 6 * fl, P.gold, fl * 0.9 * aA);
        // repair scene: nick marks that heal, enzyme blobs, A overhangs
        const rep = win(t, 3.0, 5.6, 0.4) * aA;
        if (rep > 0) {
          const yy = YS + f.dy;
          if (f.nick) {
            const heal = sp(t, 3.6 + hash(f.i, 9) * 0.8, 4.4 + hash(f.i, 9) * 0.8);
            const nx = lerp(f.x0 + 14, f.x1 - 14, hash(f.i, 10));
            dot(ctx, nx, yy - 4, 3.5, heal > 0.5 ? P.good : P.alert, rep * (1 - 0.6 * heal));
            blob(ctx, nx + 2, yy - 16, 8, P.enzyme, { seed: f.i + 5, alpha: rep * (1 - sp(t, 4.8, 5.4)) });
          }
          const at = sp(t, 4.2, 5.0) * rep;
          text(ctx, 'A', f.x1 - 5, yy - 12, { size: 9, color: P.gold, mono: true, align: 'center', alpha: at });
          text(ctx, 'A', f.x0 + 5, yy + 12, { size: 9, color: P.gold, mono: true, align: 'center', alpha: at });
        }
      });
      callout(ctx, 'HMW DNA → Megaruptor / g-TUBE → 15–20 kb pieces', X0, 60, P, { alpha: aA * win(t, 0.3, 3.0, 0.3), size: 13, color: P.ink });
      text(ctx, 'damage repair · end repair · A-tailing', X0, 60, { size: 13, color: P.ink, alpha: aA * win(t, 3.0, 5.6, 0.3) });
      text(ctx, 'nicks and oxidised bases would stall the polymerase later', X0, 84, { size: 11.5, color: P.inkDim, alpha: aA * win(t, 3.4, 5.6, 0.3) });
    }

    // ───── histogram (0.8 – 11, with cut-off from 8.5) ─────
    const hA = win(t, 0.8, 11.2, 0.6);
    if (hA > 0) {
      line(ctx, HX0, HY + 0.5, HX1, HY + 0.5, P.inkFaint, 1, hA);
      [0, 10, 20, 30, 40].forEach(kb => { const x = kbToX(kb); line(ctx, x, HY, x, HY + 4, P.inkFaint, 1, hA); text(ctx, String(kb), x, HY + 14, { size: 10.5, color: P.inkDim, align: 'center', alpha: hA }); });
      text(ctx, 'fragment length (kb)', (HX0 + HX1) / 2, HY + 32, { size: 11.5, color: P.inkDim, align: 'center', alpha: hA });
      const g = sp(t, 1.0, 2.4);
      const cut = sp(t, 8.8, 9.6);
      const cutKb = 8;
      curve(ctx, HX0, HY - HH, HX1 - HX0, HH, u => { const kb = u * 40; const v = Math.exp(-0.5 * ((kb - 17) / 6) ** 2) + 0.25 * Math.exp(-0.5 * ((kb - 3) / 2) ** 2); return v * g * (kb < cutKb ? 1 - cut : 1); }, P.dna, { alpha: hA, fill: true, lw: 1.5, n: 120 });
      text(ctx, 'library trace (Femto Pulse)', HX0, HY - HH - 14, { size: 11.5, color: P.inkDim, alpha: hA * g });
      if (cut > 0) {
        const cx = kbToX(cutKb);
        line(ctx, cx, HY - HH, cx, HY, P.alert, 1.5, hA * cut, [4, 3]);
        text(ctx, 'cut-off', cx + 5, HY - HH + 8, { size: 10.5, color: P.alert, alpha: hA * cut });
      }
    }

    // ───── scene C/D/E: molecules (5.4 – 13) ─────
    const aC = win(t, 5.4, 13.5, 0.5);
    if (aC > 0) {
      const grow = sp(t, 10.9, 11.7);       // the survivor moves to centre stage and grows
      MOLS.forEach((m0, k) => {
        const m = m0.kind === 'long' ? { ...m0, x0: lerp(m0.x0, BIG.x0, grow), x1: lerp(m0.x1, BIG.x1, grow), y: lerp(m0.y, BIG.y, grow) } : m0;
        const la = sp(t, 5.8 + k * 0.2, 6.6 + k * 0.2), lb = m.kind === 'one-adapter' ? 0 : sp(t, 6.0 + k * 0.2, 6.8 + k * 0.2);
        const digested = m.kind === 'one-adapter' ? sp(t, 7.3, 8.3) : 0;
        const removed = m.kind === 'short' ? sp(t, 9.2, 10.2) : 0;
        const al = aC * (1 - digested) * (1 - removed);
        if (al <= 0) return;
        smrtbell(ctx, m, P, al, la, lb, { scale: lerp(1, 1.6, grow) });
        text(ctx, m.label, m.x1 + 60, m.y, { size: 11.5, color: m.kind === 'one-adapter' ? P.alert : P.inkDim, alpha: al * win(t, 6.4, 13, 0.3) });
        // nuclease on the one-adapter molecule
        if (m.kind === 'one-adapter') {
          const na = win(t, 7.0, 8.4, 0.3) * aC;
          blob(ctx, m.x1 + 6 - 60 * digested, m.y - 12, 9, P.alert, { seed: 31, alpha: na });
          blob(ctx, m.x1 - 20 - 40 * digested, m.y + 14, 8, P.alert, { seed: 32, alpha: na * 0.8 });
        }
        // short circle removed: gold ring then fade
        if (m.kind === 'short') {
          const ra = win(t, 8.8, 10.4, 0.3) * aC;
          ctx.save(); ctx.globalAlpha *= ra; ctx.strokeStyle = P.gold; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
          roundRect(ctx, m.x0 - 24, m.y - 18, m.x1 - m.x0 + 48, 36, 8); ctx.stroke(); ctx.restore();
        }
      });
      // a free linear leftover (free adapter dimer / un-ligated piece) that is digested
      {
        const d = sp(t, 7.0, 8.0);
        const a = aC * (1 - d) * win(t, 5.6, 8.2, 0.3);
        dsFragment(ctx, 300, 380, 345, { colorA: P.dna, colorB: P.dnaLight, alpha: a, gap: 6, lw: 2 });
        text(ctx, 'linear leftover', 390, 345, { size: 10.5, color: P.inkDim, alpha: a });
      }
      text(ctx, 'hairpin adapters: the duplex becomes one closed circle', X0, 60, { size: 13, color: P.ink, alpha: aC * win(t, 5.6, 8.6, 0.3) });
      text(ctx, 'exonuclease III + VII: anything not a closed circle is digested', X0, 84, { size: 11.5, color: P.alert, alpha: aC * win(t, 7.0, 8.6, 0.3) });
      text(ctx, 'size selection', X0, 60, { size: 13, color: P.ink, alpha: aC * win(t, 8.6, 11.0, 0.3) });
      text(ctx, 'short circles load into ZMWs faster: remove them, or they take the wells', X0, 84, { size: 11.5, color: P.gold, alpha: aC * win(t, 8.8, 11.0, 0.3) });
      // primer + polymerase on the surviving SMRTbell
      const pa = aC * win(t, 11.0, 13.5, 0.4);
      if (pa > 0) {
        const px = BIG.x0 - 19, py = BIG.y;
        const bind = sp(t, 11.4, 12.1);
        line(ctx, px - 4, py - 5, px + 26, py - 5, P.gold, 3.5, pa * bind);
        blob(ctx, lerp(px - 70, px + 6, bind), lerp(py - 70, py - 22, bind), 18, P.enzyme, { seed: 7, alpha: pa, stroke: P.inkDim });
        callout(ctx, 'primer in the loop, polymerase bound', px + 34, py - 60, P, { alpha: pa * bind, size: 12, color: P.inkDim, to: [px + 10, py - 30] });
        text(ctx, 'the polymerase-bound SMRTbell is what gets loaded', X0, 60, { size: 13, color: P.ink, alpha: pa });
        const notes = [
          ['read length = shear size + size cut-off, decided before the sequencer', P.gold],
          ['no PCR in the standard kit: no duplicates, no chimeras, no GC bias', P.good],
          ['loaded at tens to hundreds of pM; anything short left in the tube loads first', P.inkDim],
        ];
        notes.forEach(([s, c], k) => text(ctx, s, X0, 380 + k * 36, { size: 12.5, color: c, alpha: pa * sp(t, 11.5 + k * 0.25, 11.9 + k * 0.25) }));
      }
    }
  },
};
