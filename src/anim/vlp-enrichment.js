// VLP enrichment: a mixed suspension is centrifuged, filtered and treated
// with chloroform. Each step removes a class of particle. End: what was
// there vs what came out.
import { prog, sp, win, pulse, lerp, hash, text, callout, cellShape, phage, roundRect, line, dot, withAlpha } from '../draw.js';

const SX0 = 70, SX1 = 430, SY0 = 80, SY1 = 400;      // sample box
const FX = 480;                                       // filter x
const OX0 = 530, OX1 = 890;                           // filtrate box

const parts = [];
for (let i = 0; i < 6; i++) parts.push({ type: 'cell', i, x: SX0 + 50 + (SX1 - SX0 - 100) * hash(i, 1), y: SY0 + 50 + (SY1 - SY0 - 110) * hash(i, 2), rod: i % 2 === 0, r: 13, px: SX0 + 60 + (SX1 - SX0 - 120) * (i / 5) });
for (let i = 0; i < 14; i++) parts.push({ type: 'phage', i: 10 + i, s: 5.5 + 3 * hash(i, 3), x: SX0 + 30 + (SX1 - SX0 - 60) * hash(i, 4), y: SY0 + 30 + (SY1 - SY0 - 60) * hash(i, 5), ang: hash(i, 6) * 6.28, pass: true, delay: hash(i, 7) * 1.4, tx: OX0 + 30 + (OX1 - OX0 - 60) * hash(i, 8), ty: SY0 + 30 + (SY1 - SY0 - 60) * hash(i, 9) });
parts.push({ type: 'phage', i: 30, s: 20, x: 150, y: 300, ang: -0.3, pass: false, delay: 0.3, label: 'jumbo phage' });
parts.push({ type: 'giant', i: 31, r: 24, x: 330, y: 150, pass: false, delay: 0.8, label: 'giant virus' });
parts.push({ type: 'env', i: 32, r: 11, x: 250, y: 220, pass: true, delay: 0.6, tx: 700, ty: 230, env: true });

function giant(ctx, x, y, r, P, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = P.enzymeDim; ctx.strokeStyle = P.enzyme; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // fibres
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6), P.enzyme, 1.2); }
  ctx.restore();
}
function enveloped(ctx, x, y, r, P, alpha = 1, burst = 0) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = P.enzymeDim; ctx.strokeStyle = P.enzyme; ctx.lineWidth = 1.5;
  if (burst < 1) { ctx.globalAlpha *= 1 - burst; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.globalAlpha /= (1 - burst) || 1; }
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5; const rr = r + 5 + burst * 30;
    dot(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 2, burst > 0 ? P.alert : P.enzyme, 1 - burst * 0.8);
  }
  ctx.restore();
}

export default {
  id: 'vlp-enrichment',
  duration: 13,
  thumbT: 7.4,
  phases: [
    { t: 0, label: 'What is in the sample', caption: 'A homogenate contains cells, debris, small phages, large and giant viruses, and enveloped particles.' },
    { t: 2.5, label: 'Centrifugation', caption: 'A spin pellets cells and debris; the supernatant with free particles is taken forward.' },
    { t: 5, label: 'Filtration', caption: '0.45 and 0.22 µm filters remove remaining cells, and with them jumbo phages and giant viruses.' },
    { t: 8.6, label: 'Chloroform', caption: 'Chloroform lyses leftover cells and also destroys enveloped viruses.' },
    { t: 10.6, label: 'What came out', caption: 'The virome is defined by what the enrichment keeps; absence of large or enveloped viruses may be the protocol.' },
  ],
  draw(ctx, t, W, H, P) {
    const sceneA = 1 - 0.92 * sp(t, 10.6, 11.3);
    ctx.save(); ctx.globalAlpha = sceneA;
    // boxes
    ctx.strokeStyle = P.grid; ctx.lineWidth = 1.5; ctx.fillStyle = withAlpha(P.liquid, 0.35);
    roundRect(ctx, SX0, SY0, SX1 - SX0, SY1 - SY0, 12); ctx.fill(); ctx.stroke();
    text(ctx, 'sample homogenate', SX0, SY0 - 14, { size: 12, color: P.inkDim });
    const fa = win(t, 5, 14, 0.5);
    if (fa > 0) {
      ctx.save(); ctx.globalAlpha *= fa; ctx.fillStyle = withAlpha(P.liquid, 0.35); ctx.strokeStyle = P.grid;
      roundRect(ctx, OX0, SY0, OX1 - OX0, SY1 - SY0, 12); ctx.fill(); ctx.stroke(); ctx.restore();
      text(ctx, 'filtrate: virus-like particles', OX0, SY0 - 14, { size: 12, color: P.inkDim, alpha: fa });
      // filter membrane
      line(ctx, FX, SY0, FX, SY1, P.glass, 10, fa, [9, 7]);
      text(ctx, '0.45 → 0.22 µm', FX, SY1 + 16, { size: 11, color: P.inkDim, align: 'center', alpha: fa });
    }
    // centrifuge label
    text(ctx, 'centrifuge: cells and debris pellet', (SX0 + SX1) / 2, SY1 + 16, { size: 11, color: P.inkDim, align: 'center', alpha: win(t, 2.6, 5, 0.4) });

    parts.forEach(p => {
      const jit = Math.sin(t * 1.7 + p.i) * 2;
      if (p.type === 'cell') {
        const sink = sp(t, 2.6 + hash(p.i, 11) * 0.6, 4.3 + hash(p.i, 11) * 0.6);
        const x = lerp(p.x, p.px, sink), y = lerp(p.y + jit, SY1 - 18, sink);
        const a = lerp(1, 0.18, sp(t, 4.5, 5.2));
        cellShape(ctx, x, y, p.r, P, { rod: p.rod, alpha: a, seed: p.i });
        return;
      }
      const d = p.delay;
      const mv = sp(t, 5.3 + d, 7.3 + d);
      let x, y, retained = false;
      if (p.pass) { x = lerp(p.x, p.tx, mv); y = lerp(p.y, p.ty, mv) + jit; }
      else { x = lerp(p.x, FX - (p.r || p.s) - 10, mv); y = p.y + jit; retained = mv > 0.98; }
      if (p.type === 'phage') {
        phage(ctx, x, y, p.s, P, { angle: p.ang + (p.pass ? 0 : 0), color: retained ? P.alert : P.enzyme });
      } else if (p.type === 'giant') {
        giant(ctx, x, y, p.r, P);
        if (retained) { ctx.save(); ctx.strokeStyle = P.alert; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, y, p.r + 10, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      } else if (p.type === 'env') {
        const burst = sp(t, 9.2, 9.9);
        const a = 1 - prog(t, 9.9, 10.5);
        enveloped(ctx, x, y, p.r, P, a, burst);
        if (burst > 0 && a > 0) text(ctx, 'enveloped virus destroyed', x, y + 40, { size: 11, color: P.alert, align: 'center', alpha: a });
      }
      if (retained && p.label) {
        const la = win(t, 7.5 + d, 14, 0.3);
        text(ctx, p.label + ': retained', x - (p.r || p.s) - 14, y - 2, { size: 11, color: P.alert, align: 'right', alpha: la });
      }
    });
    // phase-0 labels
    const l0 = win(t, 0.4, 2.6, 0.4);
    if (l0 > 0) {
      const LX = 600;
      text(ctx, 'what is in there', LX, 95, { size: 13, color: P.ink, weight: 600, alpha: l0 });
      const items = [['bacterial cells and debris', 'cell'], ['small phages (most of the virome)', 'phage'], ['jumbo phage (> 200 kb genome, large capsid)', 'jumbo'], ['giant virus (> 0.3 µm)', 'giant'], ['enveloped virus', 'env']];
      items.forEach(([name, kind], k) => {
        const y = 140 + k * 56;
        ctx.save(); ctx.globalAlpha = l0;
        if (kind === 'cell') cellShape(ctx, LX + 14, y, 11, P, { rod: true, seed: 3 });
        if (kind === 'phage') phage(ctx, LX + 14, y - 6, 7, P);
        if (kind === 'jumbo') phage(ctx, LX + 14, y - 10, 12, P);
        if (kind === 'giant') giant(ctx, LX + 14, y, 14, P);
        if (kind === 'env') enveloped(ctx, LX + 14, y, 9, P);
        ctx.restore();
        text(ctx, name, LX + 48, y, { size: 12, color: P.inkDim, alpha: l0, maxWidth: 250 });
      });
    }
    // chloroform label
    const ca = win(t, 8.7, 10.6, 0.4);
    text(ctx, 'chloroform', 700, SY1 + 16, { size: 12, color: P.ink, align: 'center', alpha: ca, weight: 600 });
    ctx.restore();

    // ---- composition bars ----
    const ba = win(t, 10.8, 14, 0.5);
    if (ba > 0) {
      const BX = 200, BW = 560, bh = 34;
      const cats = [
        { n: 6, c: P.membrane, name: 'bacteria' },
        { n: 14, c: P.dna, name: 'small phages' },
        { n: 2, c: P.p7, name: 'jumbo phage' },
        { n: 2, c: P.p5, name: 'giant virus' },
        { n: 2, c: P.rna, name: 'enveloped' },
      ];
      const tot = cats.reduce((s, c) => s + c.n, 0);
      const draw = (y, title, keep) => {
        text(ctx, title, BX, y - 14, { size: 12, color: P.ink, weight: 600, alpha: ba });
        let x = BX;
        cats.forEach(c => {
          const w = BW * c.n / tot * sp(t, 11.0, 12.0);
          ctx.save(); ctx.globalAlpha = ba;
          if (keep(c)) { ctx.fillStyle = c.c; ctx.fillRect(x, y, w, bh); }
          else { ctx.strokeStyle = P.alert; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2; ctx.strokeRect(x + 1, y + 1, Math.max(0, w - 2), bh - 2); }
          ctx.restore();
          x += w;
        });
      };
      draw(190, 'what was in the sample', () => true);
      draw(290, 'what reached the library', c => c.name === 'small phages');
      cats.forEach((c, k) => {
        const lx = BX + 20 + k * (BW / 5), la = ba * sp(t, 11.8, 12.3);
        ctx.save(); ctx.globalAlpha = la; ctx.fillStyle = c.c; ctx.fillRect(lx, 341, 10, 10); ctx.restore();
        text(ctx, c.name, lx + 16, 346, { size: 11, color: P.inkDim, alpha: la });
      });
      text(ctx, 'dashed = removed by the protocol, not absent from the sample', (BX + BX + BW) / 2, 380, { size: 12, color: P.alert, align: 'center', alpha: ba * sp(t, 12.0, 12.6) });
      text(ctx, 'plus carry-over: some bacterial DNA always passes', (BX + BX + BW) / 2, 400, { size: 11, color: P.inkDim, align: 'center', alpha: ba * sp(t, 12.3, 12.9) });
    }
  },
};
