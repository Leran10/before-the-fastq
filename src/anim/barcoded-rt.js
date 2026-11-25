// Inside one GEM: the bead dissolves, the cell lyses, poly(dT) oligos prime
// reverse transcription at the poly(A) tail, template switching adds a handle,
// every captured molecule carries the cell barcode and its own UMI.
import { prog, sp, win, pulse, lerp, hash, text, callout, cellShape, bead, blob, dot, line, arrow, roundRect, ssStrand, withAlpha } from '../draw.js';

const DX = 250, DY = 265, DR = 185;           // the droplet
const CELL = { x: DX + 40, y: DY - 30, r: 46 };
const BEAD = { x: DX - 70, y: DY + 55, r: 36 };
const CB = 1;                                  // this cell's colour index

// mRNAs released from the cell (5) + ambient ones already in the droplet (2)
// explicit resting positions so labels never collide
const RNAS = [
  { i: 0, ambient: false, x: DX - 95, y: DY - 70, len: 62, ang: 0.15, captured: true },
  { i: 1, ambient: false, x: DX + 5, y: DY - 135, len: 56, ang: -0.1, captured: false },
  { i: 2, ambient: false, x: DX - 115, y: DY + 25, len: 70, ang: 0.05, captured: true },
  { i: 3, ambient: false, x: DX - 135, y: DY + 118, len: 58, ang: -0.25, captured: false },
  { i: 4, ambient: false, x: DX + 30, y: DY + 55, len: 66, ang: 0.3, captured: true },
  { i: 5, ambient: true, x: DX + 55, y: DY - 10, len: 54, ang: 0.35, captured: true },
  { i: 6, ambient: true, x: DX + 15, y: DY + 135, len: 50, ang: -0.2, captured: true },
].map(r => ({ ...r, umi: 30 + r.i }));

// a short mRNA with poly(A) tail at its right end; returns the tail end point
function mrna(ctx, x, y, len, ang, P, alpha, o = {}) {
  if (alpha <= 0) return [x, y];
  const { tail = true } = o;
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  ssStrand(ctx, x, y, ex, ey, { color: P.rna, lw: 2, tickEvery: 7, tickLen: 3, alpha });
  if (tail) text(ctx, 'AAAA', ex + Math.cos(ang) * 12, ey + Math.sin(ang) * 12, { size: 8, color: P.rna, align: 'center', mono: true, alpha });
  return [ex, ey];
}

// a bead oligo: Read 1 (teal), barcode (cell colour), UMI (gold), poly(dT) (faint)
function oligo(ctx, x, y, ang, P, alpha, o = {}) {
  if (alpha <= 0) return;
  const { scale = 1, umiSeed = 1, cdna = 0, cbColor = P.samples[CB], tso = 0 } = o;
  const seg = [[14, P.p5], [18, cbColor], [12, P.gold], [16, P.inkFaint]];
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale);
  let cx = 0;
  seg.forEach(([w, c], i) => {
    ctx.fillStyle = c; ctx.fillRect(cx, -3, w - 1, 6);
    if (i === 2) { ctx.fillStyle = withAlpha('#000', 0.35); for (let k = 0; k < 4; k++) if (hash(k, umiSeed) > 0.5) ctx.fillRect(cx + 1 + k * 2.6, -2, 1.2, 4); }
    cx += w;
  });
  if (cdna > 0) { ctx.strokeStyle = P.dna; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx + cdna, 0); ctx.stroke(); cx += cdna; }
  if (tso > 0) { ctx.fillStyle = P.enzyme; ctx.fillRect(cx, -3, 10 * tso, 6); }
  ctx.restore();
}

export default {
  id: 'barcoded-rt',
  duration: 13,
  thumbT: 6.4,
  phases: [
    { t: 0, label: 'Inside one droplet', caption: 'A cell, a gel bead and reverse-transcription reagents share a droplet of about a nanolitre. A little free RNA from lysed cells came in with the buffer.' },
    { t: 2.4, label: 'Lysis and bead dissolution', caption: 'Detergent opens the cell and the bead dissolves, releasing millions of barcoded poly(dT) oligos among the cell’s mRNAs.' },
    { t: 5.0, label: 'Reverse transcription', caption: 'An oligo anneals to a poly(A) tail; the enzyme copies the transcript from its 3′ end and, at the 5′ end, switches template onto the TSO, adding a known handle.' },
    { t: 8.6, label: 'One barcode, many UMIs', caption: 'Every captured molecule now carries this droplet’s barcode and its own UMI. Ambient RNA is barcoded too, and most molecules are never captured at all.' },
    { t: 10.8, label: 'Your reads', caption: 'Read 1 will contain only the 16-nt barcode and 12-nt UMI; the transcript sequence is read from the other end. Counts are UMIs, not reads.' },
  ],
  draw(ctx, t, W, H, P) {
    const lyse = sp(t, 2.6, 4.0);            // cell opens
    const dissolve = sp(t, 2.8, 4.2);        // bead goes
    const rtOn = sp(t, 8.2, 8.9);            // molecules become cDNA in the droplet view
    const dimAll = 1 - 0.55 * sp(t, 10.8, 11.5);
    const col = P.samples[CB];

    // ───── the droplet (always, dimmed at the end) ─────
    ctx.save(); ctx.globalAlpha *= dimAll;
    ctx.fillStyle = withAlpha(P.liquid, 0.4); ctx.strokeStyle = P.glass; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(DX, DY, DR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    text(ctx, 'oil', 40, 60, { size: 12, color: P.inkDim, alpha: dimAll });
    text(ctx, 'one GEM, ~1 nl', DX, DY + DR + 22, { size: 12, color: P.inkDim, align: 'center', alpha: dimAll * win(t, 0, 10.8, 0.4) });

    // cell
    if (lyse < 1) {
      ctx.save(); if (lyse > 0) ctx.setLineDash([6, 4 + 10 * lyse]);
      cellShape(ctx, CELL.x, CELL.y, CELL.r * (1 + 0.3 * lyse), P, { fill: withAlpha(col, 0.5 * (1 - lyse)), stroke: col, alpha: dimAll * (1 - lyse * 0.9), wall: 1.2 });
      ctx.restore();
      // nucleus-ish dot and a few mRNAs inside
      dot(ctx, CELL.x - 8, CELL.y - 6, 14, withAlpha(col, 0.5), dimAll * (1 - lyse));
    }
    const burst = pulse(t, 2.6, 3.6);
    if (burst > 0) dot(ctx, CELL.x, CELL.y, 30 + 60 * burst, P.gold, burst * 0.35 * dimAll);
    text(ctx, 'cell', CELL.x, CELL.y - CELL.r - 14, { size: 12, color: col, align: 'center', alpha: dimAll * win(t, 0.3, 2.6, 0.3) });

    // bead with oligo fuzz
    if (dissolve < 1) {
      bead(ctx, BEAD.x, BEAD.y, BEAD.r * (1 - 0.6 * dissolve), P, dimAll * (1 - dissolve));
      ctx.save(); ctx.globalAlpha *= dimAll * (1 - dissolve); ctx.lineWidth = 1.2;
      for (let i = 0; i < 22; i++) {
        const a = i / 22 * Math.PI * 2; const r0 = BEAD.r * (1 - 0.6 * dissolve);
        ctx.strokeStyle = P.p5; ctx.beginPath(); ctx.moveTo(BEAD.x + Math.cos(a) * r0, BEAD.y + Math.sin(a) * r0); ctx.lineTo(BEAD.x + Math.cos(a) * (r0 + 6), BEAD.y + Math.sin(a) * (r0 + 6)); ctx.stroke();
        ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(BEAD.x + Math.cos(a) * (r0 + 6), BEAD.y + Math.sin(a) * (r0 + 6)); ctx.lineTo(BEAD.x + Math.cos(a) * (r0 + 11), BEAD.y + Math.sin(a) * (r0 + 11)); ctx.stroke();
      }
      ctx.restore();
      text(ctx, 'gel bead', BEAD.x, BEAD.y + BEAD.r + 16, { size: 12, color: P.inkDim, align: 'center', alpha: dimAll * win(t, 0.3, 2.6, 0.3) * (1 - dissolve) });
    }
    // free oligos drifting out of the bead
    for (let i = 0; i < 18; i++) {
      const a = hash(i, 12) * Math.PI * 2, rr = DR * (0.2 + 0.72 * hash(i, 13));
      const tx = DX + Math.cos(a) * rr, ty = DY + Math.sin(a) * rr;
      const u = sp(t, 2.9 + hash(i, 14) * 0.6, 4.4 + hash(i, 14) * 0.6);
      const gone = sp(t, 8.2, 8.8);                                    // tidy away once the cDNAs are shown
      const al = dimAll * u * (1 - gone) * 0.9;
      oligo(ctx, lerp(BEAD.x, tx, u), lerp(BEAD.y, ty, u) + Math.sin(t * 1.4 + i) * 2, hash(i, 15) * Math.PI * 2, P, al, { scale: 0.75, umiSeed: i });
    }
    // RT enzyme blobs
    for (let i = 0; i < 6; i++) {
      const a = hash(i, 22) * Math.PI * 2, rr = DR * (0.3 + 0.55 * hash(i, 23));
      blob(ctx, DX + Math.cos(a) * rr + Math.sin(t + i) * 3, DY + Math.sin(a) * rr + Math.cos(t * 0.8 + i) * 3, 7, P.enzyme, { seed: i + 40, alpha: dimAll * 0.7 * win(t, 0, 8.4, 0.5) });
    }
    text(ctx, 'reverse transcriptase + TSO + dNTPs', 40, DY + DR + 50, { size: 11.5, color: P.inkDim, alpha: dimAll * win(t, 0.3, 2.6, 0.3) });

    // mRNAs: ambient ones present from t=0; the cell's own released on lysis
    RNAS.forEach(r => {
      const rel = r.ambient ? 1 : sp(t, 2.8 + hash(r.i, 8) * 0.5, 4.2 + hash(r.i, 8) * 0.5);
      if (rel <= 0) return;
      const x = r.ambient ? r.x : lerp(CELL.x, r.x, rel), y = (r.ambient ? r.y : lerp(CELL.y, r.y, rel)) + Math.sin(t * 1.2 + r.i) * 2;
      const lost = !r.captured ? sp(t, 8.6, 9.6) : 0;
      // RNA
      mrna(ctx, x, y, r.len, r.ang, P, dimAll * (1 - 0.85 * rtOn * (r.captured ? 1 : 0)) * (1 - lost * 0.8));
      // after RT: barcoded cDNA alongside
      if (r.captured && rtOn > 0) {
        const ex = x + Math.cos(r.ang) * r.len, ey = y + Math.sin(r.ang) * r.len;
        oligo(ctx, ex + 12 * Math.cos(r.ang), ey + 8 + 12 * Math.sin(r.ang), r.ang + Math.PI, P, dimAll * rtOn, { scale: 0.75, umiSeed: r.umi, cdna: r.len, tso: 1 });
        if (r.ambient) { ctx.save(); ctx.globalAlpha *= dimAll * rtOn * win(t, 8.8, 10.8, 0.3); ctx.strokeStyle = P.alert; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc((x + ex) / 2, (y + ey) / 2, r.len * 0.62, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      }
      if (!r.captured) text(ctx, 'not captured', x + Math.cos(r.ang) * r.len / 2, y + (r.i === 1 ? -16 : 18), { size: 10, color: P.inkDim, align: 'center', alpha: dimAll * lost });
    });
    // ambient labels
    text(ctx, 'ambient RNA, already in the buffer', 40, 92, { size: 11.5, color: P.rna, alpha: dimAll * win(t, 0.6, 2.6, 0.3) });
    callout(ctx, 'barcoded as if it were this cell’s', 40, 118, P, { alpha: dimAll * win(t, 9.0, 10.8, 0.3), size: 11.5, color: P.alert });
    text(ctx, 'cDNA tagged: Read 1 · barcode · UMI · cDNA · TSO', 40, 92, { size: 11.5, color: P.ink, alpha: dimAll * win(t, 8.8, 10.8, 0.3) });
    text(ctx, 'only ~10–30 % of molecules are captured', 40, DY + DR + 50, { size: 11.5, color: P.inkDim, alpha: dimAll * win(t, 9.2, 10.8, 0.3) });

    // ───── right panel: one RT reaction (5.0 – 8.6) ─────
    const aR = win(t, 5.0, 8.6, 0.5);
    if (aR > 0) {
      const X0 = 520, X1 = 850, Y = 190;
      text(ctx, 'one molecule, one reaction', X0, 110, { size: 14, color: P.ink, weight: 600, alpha: aR });
      // mRNA 5' (left) → 3' poly(A) (right)
      ssStrand(ctx, X0 + 40, Y, X1 - 60, Y, { color: P.rna, lw: 2.5, tickEvery: 9, tickLen: 4, side: -1, alpha: aR });
      text(ctx, 'AAAAAAAA', X1 - 30, Y, { size: 9, color: P.rna, align: 'center', mono: true, alpha: aR });
      text(ctx, '5′', X0 + 26, Y, { size: 11, color: P.inkDim, align: 'right', alpha: aR });
      text(ctx, '3′', X1 + 6, Y - 16, { size: 11, color: P.inkDim, alpha: aR });
      text(ctx, 'mRNA', X0 + 40, Y - 20, { size: 11, color: P.rna, alpha: aR });
      // oligo anneals below the tail: poly(dT) under the poly(A), Read 1 end dangling past the 3′ end
      const ann = sp(t, 5.3, 6.0);
      const oy = lerp(Y + 70, Y + 14, ann);
      // drawn right-to-left (rotate by PI), so its start (Read 1) sits 44·1.3 px to the right of the tail
      const ox = X1 + 44 * 1.3 - 18;
      oligo(ctx, ox, oy, Math.PI, P, aR, { scale: 1.3, umiSeed: 31 });
      text(ctx, 'Read 1 · barcode · UMI · TTTT', ox, oy + 20, { size: 10.5, color: P.inkDim, align: 'right', alpha: aR * win(t, 5.3, 8.6, 0.3) });
      callout(ctx, 'poly(dT) pairs with the poly(A) tail', X1 - 60, Y + 48, P, { alpha: aR * win(t, 6.0, 7.2, 0.3), size: 11.5, color: P.inkDim, align: 'right' });
      // extension: blue cDNA grows leftwards under the RNA
      const ext = sp(t, 6.2, 7.6);
      const startX = X1 - 60 - 2, endX = lerp(startX, X0 + 40, ext);
      if (ext > 0) { line(ctx, startX, Y + 14, endX, Y + 14, P.dna, 3.5, aR); blob(ctx, endX - 6, Y + 8, 9, P.enzyme, { seed: 77, alpha: aR * (1 - sp(t, 8.0, 8.5)) }); }
      // template switch at the 5' end
      const ts = sp(t, 7.5, 8.2);
      if (ts > 0) {
        text(ctx, 'CCC', X0 + 30, Y + 26, { size: 9, color: P.dna, mono: true, alpha: aR * ts });
        ctx.save(); ctx.globalAlpha *= aR * ts; ctx.fillStyle = P.enzyme; ctx.fillRect(X0 - 2, Y - 3, 40, 6); ctx.restore();
        text(ctx, 'TSO rGrGrG', X0 + 18, Y - 18, { size: 10, color: P.enzyme, align: 'center', alpha: aR * ts });
        line(ctx, X0 + 40, Y + 14, lerp(X0 + 40, X0 - 2, sp(t, 7.9, 8.4)), Y + 14, P.dna, 3.5, aR);
        callout(ctx, 'template switch: a handle on the 5′ end', X0, Y + 78, P, { alpha: aR * win(t, 7.6, 8.6, 0.3), size: 11.5, color: P.inkDim });
      }
      text(ctx, 'first-strand cDNA, copied 3′ → 5′', X0 + 40, Y + 110, { size: 11.5, color: P.dna, alpha: aR * win(t, 6.6, 8.6, 0.3) });
      text(ctx, '45 min · 53 °C', X0, 150, { size: 11, color: P.inkDim, alpha: aR });
    }

    // ───── bottom strip: your reads (10.8 – 13) ─────
    const aS = win(t, 10.8, 13.5, 0.5);
    if (aS > 0) {
      const X = 480, Y = 172;
      text(ctx, 'what one captured molecule becomes', X, 72, { size: 14, color: P.ink, weight: 600, alpha: aS });
      // linear molecule, big
      const segs = [[60, P.p5, 'Read 1 site'], [70, col, 'barcode 16'], [50, P.gold, 'UMI 12'], [60, P.inkFaint, 'poly(dT)'], [150, P.dna, 'cDNA (3′ end of transcript)'], [40, P.enzyme, 'TSO']];
      let cx = X;
      segs.forEach(([w, c, l], i) => {
        const g = sp(t, 11.0 + i * 0.15, 11.4 + i * 0.15) * aS;
        ctx.save(); ctx.globalAlpha *= g; ctx.fillStyle = c; roundRect(ctx, cx, Y - 7, w - 3, 14, 3); ctx.fill(); ctx.restore();
        text(ctx, l, cx + (w - 3) / 2, Y + (i % 2 ? 26 : -22), { size: 11, color: i === 1 ? col : i === 2 ? P.gold : i === 4 ? P.dna : P.inkDim, align: 'center', alpha: g });
        cx += w;
      });
      // Read 1 arrow over barcode + UMI
      const ra = aS * win(t, 11.8, 13.5, 0.3);
      arrow(ctx, X + 60, Y - 46, X + 60 + 118 * sp(t, 11.8, 12.4), Y - 46, P.p5, { lw: 3, head: 7, alpha: ra });
      text(ctx, 'Read 1 = 28 bp: barcode + UMI, nothing to align', X + 60, Y - 64, { size: 11.5, color: P.p5, alpha: ra });
      const notes = [
        ['the transcript sequence is read from the other end (Read 2), after fragmentation', P.inkDim],
        ['same barcode + UMI + gene across reads = one molecule → count once', P.gold],
        ['a cell with 20,000 mRNAs yields ~2,000–8,000 UMIs: zeros are mostly dropouts', P.inkDim],
        ['ambient molecules carry a real cell’s barcode: the soup is born here', P.alert],
      ];
      notes.forEach(([s, c], k) => text(ctx, s, X, Y + 90 + k * 40, { size: 12, color: c, alpha: aS * sp(t, 12.0 + k * 0.25, 12.4 + k * 0.25), maxWidth: 440 }));
    }
  },
};
