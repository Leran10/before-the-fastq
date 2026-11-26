// Primer trimming and consensus: reads whose ends sit on primer coordinates,
// trimming by position, the depth mask that turns a dropout into N, why
// duplicates are never removed, minor-variant floors, and the lineage call.
import { prog, sp, win, lerp, hash, text, callout, line, roundRect, panelTitle, footnote, withAlpha } from '../draw.js';

const X0 = 80, X1 = 880;
const PL = 26;                                   // primer length on screen
// four amplicons in view: A, C pool 1; B, D pool 2
const AMP = [
  { id: 'A', x0: 80, x1: 380, pool: 0, n: 6 },
  { id: 'B', x0: 300, x1: 600, pool: 1, n: 5 },
  { id: 'C', x0: 520, x1: 820, pool: 0, n: 1 },   // nearly dropped out
  { id: 'D', x0: 740, x1: 880, pool: 1, n: 5, partial: true },
];
const Y_REF = 92, Y_READ0 = 120, RH = 13;        // reads stacked below the reference
const Y_DEPTH = 294, DH = 30;
const Y_CONS = 350;
const VAR_X = 362;                                // a variant under A's right primer, inside B's insert
const MASK0 = 600, MASK1 = 740;                   // only C covers this, and C has 1 read

function depthAt(x) { let d = 0; AMP.forEach(a => { if (x >= a.x0 + PL && x <= a.x1 - (a.partial ? 0 : PL)) d += a.n; }); return d; }

export default {
  id: 'amplicon-consensus',
  duration: 15,
  thumbT: 13.8,
  phases: [
    { t: 0, label: 'Reads end at primers', caption: 'Aligned reads from an amplicon library all start and stop at the same coordinates: the primer positions in the scheme’s BED file.' },
    { t: 2.5, label: 'Trim by coordinate', caption: 'Primers are soft-clipped by position, never by sequence. A variant under a primer is visible only in the overlapping amplicon from the other pool.' },
    { t: 5.5, label: 'Mask by depth', caption: 'Positions below the depth threshold (10× to 20×) become N. A dropped amplicon turns into a run of ~300 N that looks like missing sequence, not a deletion.' },
    { t: 8, label: 'Never deduplicate', caption: 'Every read of an amplicon shares its ends by construction. Duplicate marking would discard almost everything.' },
    { t: 10, label: 'Minor variants', caption: 'Below a few percent, allele frequency cannot separate within-host diversity from contamination or amplification error; strand counts and depth decide what is reportable.' },
    { t: 12.5, label: 'The consensus', caption: 'The consensus genome is a function of the BED file and three thresholds. N runs can leave lineage-defining sites missing and produce conflicting lineage calls.' },
  ],
  draw(ctx, t, W, H, P) {
    const readsIn = sp(t, 0.2, 1.6);
    const guides = win(t, 0.8, 5.4, 0.3);
    const trim = sp(t, 2.8, 4.0);
    const varA = sp(t, 4.0, 4.6) * win(t, 4.0, 8.0, 0.3);
    const mask = sp(t, 5.9, 7.0);
    const maskNote = win(t, 6.4, 10.0, 0.3);
    const dedup = win(t, 8.0, 10.0, 0.3);
    const minor = win(t, 10.0, 12.5, 0.3);
    const consA = sp(t, 12.6, 13.4);
    const lineage = sp(t, 13.4, 14.1);

    panelTitle(ctx, 'Primer trimming and consensus', W, P);
    text(ctx, 'ivar trim · ivar consensus -m 20', W - 28, 30, { size: 12, color: P.inkDim, align: 'right', mono: true });

    // ── reference ──
    line(ctx, X0, Y_REF, X1, Y_REF, P.dnaDim, 3);
    text(ctx, 'reference', X0 - 10, Y_REF, { size: 11, color: P.inkDim, align: 'right' });
    // primer intervals from the BED on the reference
    AMP.forEach(a => {
      const col = a.pool === 0 ? P.p5 : P.p7;
      ctx.save(); ctx.globalAlpha *= 0.9; ctx.fillStyle = col;
      ctx.fillRect(a.x0, Y_REF - 4, PL, 8); if (!a.partial) ctx.fillRect(a.x1 - PL, Y_REF - 4, PL, 8);
      ctx.restore();
      text(ctx, a.id, (a.x0 + Math.min(a.x1, X1)) / 2, Y_REF - 16, { size: 11, color: col, weight: 600, align: 'center' });
    });

    // ── reads ──
    const rowY = (pool, r) => Y_READ0 + (pool === 0 ? r : r + 7) * (RH + 1);
    const gapY = Y_READ0 + 6.5 * (RH + 1);   // empty row between the two pools
    AMP.forEach(a => {
      const col = a.pool === 0 ? P.p5 : P.p7;
      for (let r = 0; r < a.n; r++) {
        const al = readsIn * prog(readsIn, r / 8, (r + 2) / 8);
        if (al <= 0) continue;
        const y = rowY(a.pool, r);
        const lx0 = a.x0 + PL * trim, lx1 = a.partial ? a.x1 : a.x1 - PL * trim;
        // kept part
        ctx.save(); ctx.globalAlpha *= al;
        ctx.fillStyle = withAlpha(col, 0.55); roundRect(ctx, lx0, y - 4.5, lx1 - lx0, 9, 2); ctx.fill();
        // clipped primer parts, greying out as they are trimmed
        ctx.fillStyle = withAlpha(P.enzymeDim, 0.8 * trim + 0.15);
        if (trim > 0) { ctx.fillRect(a.x0, y - 4.5, lx0 - a.x0, 9); if (!a.partial) ctx.fillRect(lx1, y - 4.5, a.x1 - lx1, 9); }
        ctx.restore();
        // the variant base
        if (a.id === 'B') {
          ctx.save(); ctx.globalAlpha *= al; ctx.fillStyle = P.gold; ctx.fillRect(VAR_X - 1.5, y - 4.5, 3, 9); ctx.restore();
        }
        if (a.id === 'A') {
          // under A's primer: it is primer sequence, so it reads as reference; fades as trimming removes it
          ctx.save(); ctx.globalAlpha *= al * (1 - trim); ctx.fillStyle = P.inkFaint; ctx.fillRect(VAR_X - 1.5, y - 4.5, 3, 9); ctx.restore();
        }
      }
    });
    text(ctx, 'pool 1', X0 - 10, rowY(0, 2.5), { size: 10, color: P.p5, align: 'right', alpha: readsIn });
    text(ctx, 'pool 2', X0 - 10, rowY(1, 2), { size: 10, color: P.p7, align: 'right', alpha: readsIn });

    // vertical guides: read ends coincide with primer coordinates
    if (guides > 0) {
      AMP.forEach(a => {
        line(ctx, a.x0, Y_REF + 6, a.x0, Y_DEPTH - 6, P.inkFaint, 1, guides * 0.6, [2, 3]);
        if (!a.partial) line(ctx, a.x1, Y_REF + 6, a.x1, Y_DEPTH - 6, P.inkFaint, 1, guides * 0.6, [2, 3]);
      });
      text(ctx, 'read ends = BED coordinates', 660, rowY(0, 3), { size: 12, color: P.inkDim, alpha: win(t, 1.2, 2.6, 0.3) });
    }
    text(ctx, 'primer bases soft-clipped', 660, rowY(0, 3), { size: 12, color: P.enzyme, alpha: win(t, 2.8, 4.0, 0.3) });
    callout(ctx, 'variant under A’s primer: seen only in B', VAR_X + 12, gapY, P, { to: [VAR_X, rowY(1, 0) - 6], color: P.gold, alpha: varA, size: 12 });

    // ── depth track ──
    text(ctx, 'depth', X0 - 10, Y_DEPTH + DH / 2, { size: 10, color: P.inkDim, align: 'right', alpha: readsIn });
    ctx.save(); ctx.globalAlpha *= readsIn;
    ctx.beginPath(); ctx.moveTo(X0, Y_DEPTH + DH);
    for (let x = X0; x <= X1; x += 2) { const d = depthAt(x) / 11; ctx.lineTo(x, Y_DEPTH + DH - d * DH); }
    ctx.lineTo(X1, Y_DEPTH + DH); ctx.closePath(); ctx.fillStyle = withAlpha(P.dna, 0.35); ctx.fill(); ctx.strokeStyle = P.dna; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    // threshold line
    const thrY = Y_DEPTH + DH - (2.4 / 11) * DH;
    line(ctx, X0, thrY, X1, thrY, P.alert, 1, mask, [3, 3]);
    text(ctx, '20×', X1 + 6, thrY, { size: 10, color: P.alert, alpha: mask });

    // ── consensus line ──
    const consAlpha = Math.max(readsIn * 0.9, consA);
    text(ctx, 'consensus', X0 - 10, Y_CONS, { size: 11, color: P.inkDim, align: 'right', alpha: consAlpha });
    ctx.save(); ctx.globalAlpha *= consAlpha;
    ctx.fillStyle = P.dna; roundRect(ctx, X0, Y_CONS - 6, X1 - X0, 12, 4); ctx.fill();
    // the variant carried into the consensus
    ctx.fillStyle = P.gold; ctx.fillRect(VAR_X - 1.5, Y_CONS - 6, 3, 12);
    // masked run
    if (mask > 0) {
      ctx.fillStyle = P.enzymeDim; const mw = (MASK1 - MASK0) * mask; const mx = (MASK0 + MASK1) / 2 - mw / 2;
      ctx.fillRect(mx, Y_CONS - 6, mw, 12);
      text(ctx, 'NNNNNNNNNN', (MASK0 + MASK1) / 2, Y_CONS, { size: 10, color: P.ink, align: 'center', mono: true, weight: 600, alpha: mask });
    }
    ctx.restore();
    callout(ctx, 'dropout, not a deletion', (MASK0 + MASK1) / 2, Y_CONS + 26, P, { to: [(MASK0 + MASK1) / 2, Y_CONS + 7], color: P.alert, align: 'center', alpha: maskNote, size: 12 });

    // ── lower band: phase-specific panels ──
    const by = 400;
    // the BED file that defines everything, shown while the reads are introduced
    {
      const ba = win(t, 0.4, 8.0, 0.3);
      if (ba > 0) {
        const bx = 300, bw = 360, bh = 92, byy = by - 14;
        ctx.save(); ctx.globalAlpha *= ba; ctx.fillStyle = P.panel; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; roundRect(ctx, bx, byy, bw, bh, 8); ctx.fill(); ctx.stroke(); ctx.restore();
        text(ctx, 'SARS-CoV-2.primer.bed  (scheme V4.1)', bx + 14, byy + 16, { size: 11, color: P.inkDim, mono: true, alpha: ba });
        const rows = [['nCoV-2019_1_LEFT', '30', '54', '1'], ['nCoV-2019_1_RIGHT', '385', '410', '1'], ['nCoV-2019_2_LEFT', '320', '342', '2'], ['nCoV-2019_2_RIGHT', '704', '726', '2']];
        rows.forEach((r, i) => {
          const y = byy + 36 + i * 15, col = r[3] === '1' ? P.p5 : P.p7;
          text(ctx, r[0], bx + 14, y, { size: 11, color: col, mono: true, alpha: ba });
          text(ctx, r[1].padStart(4) + '  ' + r[2].padStart(4) + '   pool ' + r[3], bx + 190, y, { size: 11, color: P.ink, mono: true, alpha: ba });
        });
        text(ctx, 'every trim, every N, every call starts from this file', 480, byy + bh + 18, { size: 12, color: P.inkDim, align: 'center', alpha: ba });
      }
    }
    // never deduplicate
    if (dedup > 0) {
      const a = AMP[0];
      // bracket around A's identical ends
      line(ctx, a.x0 + PL, rowY(0, 0) - 8, a.x0 + PL, rowY(0, 5) + 8, P.gold, 2, dedup);
      line(ctx, a.x1 - PL, rowY(0, 0) - 8, a.x1 - PL, rowY(0, 5) + 8, P.gold, 2, dedup);
      text(ctx, 'identical ends by design', (a.x0 + a.x1) / 2, by, { size: 13, color: P.ink, align: 'center', alpha: dedup });
      const mx = (a.x0 + a.x1) / 2;
      text(ctx, 'MarkDuplicates', mx, by + 26, { size: 14, color: P.alert, align: 'center', mono: true, alpha: dedup });
      line(ctx, mx - 62, by + 26, mx + 62, by + 26, P.alert, 2.5, dedup);
      text(ctx, 'would keep one read per amplicon', mx, by + 50, { size: 12, color: P.inkDim, align: 'center', alpha: dedup });
      text(ctx, 'depth ≠ viral load', 700, by + 10, { size: 13, color: P.inkDim, align: 'center', alpha: dedup });
      text(ctx, 'it is primer efficiency × template', 700, by + 30, { size: 12, color: P.inkDim, align: 'center', alpha: dedup });
    }
    // minor variants
    if (minor > 0) {
      const bx = 150, bw = 90, bh = 70, gap = 330;
      const floorY = by + bh - 0.05 * bh * 6; // 5 % line (scaled ×6 for visibility)
      text(ctx, 'allele frequency at two sites (scale ×6)', bx, by - 14, { size: 12, color: P.inkDim, alpha: minor });
      [{ f: 0.04, lab: '4 %', note: 'error, contamination or real?', col: P.alert }, { f: 0.40, lab: '40 %', note: 'callable: check strand counts', col: P.gold }].forEach((s, i) => {
        const x = bx + i * gap, g = sp(t, 10.3 + i * 0.4, 11.0 + i * 0.4);
        ctx.save(); ctx.globalAlpha *= minor;
        ctx.fillStyle = withAlpha(P.dna, 0.2); ctx.fillRect(x, by, bw, bh);
        const hh = Math.min(1, s.f * 6) * bh * g; ctx.fillStyle = s.col; ctx.fillRect(x, by + bh - hh, bw, hh);
        ctx.restore();
        text(ctx, s.lab, x + bw / 2, by + bh + 14, { size: 12, color: P.ink, weight: 600, align: 'center', alpha: minor });
        text(ctx, s.note, x + bw + 10, by + bh / 2, { size: 12, color: s.col, alpha: minor * g });
      });
      line(ctx, bx - 6, floorY, bx + gap + bw + 10, floorY, P.alert, 1, minor, [3, 3]);
      text(ctx, '5 % floor', bx - 12, floorY, { size: 10, color: P.alert, align: 'right', alpha: minor });
      text(ctx, 'at Ct 35 a 20 % variant may rest on two molecules', 700, by + bh - 4, { size: 12, color: P.inkDim, align: 'center', alpha: minor * sp(t, 11.4, 12.0) });
    }
    // lineage call
    if (consA > 0) {
      const lx = 300, ly = by - 14, lw = 360, lh = 86;
      ctx.save(); ctx.globalAlpha *= consA;
      ctx.fillStyle = P.panel; ctx.strokeStyle = P.inkFaint; ctx.lineWidth = 1; roundRect(ctx, lx, ly, lw, lh, 8); ctx.fill(); ctx.stroke();
      ctx.restore();
      text(ctx, 'Nextclade / pangolin', lx + 14, ly + 18, { size: 12, color: P.inkDim, alpha: consA, mono: true });
      text(ctx, 'lineage: BA.2.86-like', lx + 14, ly + 42, { size: 15, color: P.ink, weight: 600, alpha: consA });
      text(ctx, `${Math.round(lerp(99, 96, mask))} % genome called`, lx + 14, ly + 66, { size: 12, color: P.inkDim, alpha: consA });
      // badge
      const bxx = lx + lw - 150, byy = ly + 30;
      ctx.save(); ctx.globalAlpha *= lineage; ctx.fillStyle = P.alertDim; roundRect(ctx, bxx, byy, 136, 24, 12); ctx.fill(); ctx.restore();
      text(ctx, 'scorpio conflict', bxx + 68, byy + 12, { size: 12, color: P.alert, weight: 600, align: 'center', alpha: lineage });
      callout(ctx, 'defining sites inside the N run', bxx + 68, byy + 42, P, { to: [(MASK0 + MASK1) / 2, Y_CONS + 8], color: P.alert, align: 'center', alpha: lineage, size: 11 });
      footnote(ctx, 'Trim by position, mask by depth, never deduplicate.', W, H, P, lineage);
    }
  },
};
