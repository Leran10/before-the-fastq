// Sequencing by synthesis: one base per cycle per cluster; phasing and the
// 3' quality decay; two-colour chemistry and poly-G; the read order.
import { prog, sp, win, pulse, lerp, clamp, hash, text, callout, ssStrand, line, dot, arrow, roundRect, curve, baseRow, fakeSeq, blob, withAlpha } from '../draw.js';

const SEQ = 'TCAGGATCCTGAACGTTAGC';
const CYCLE_T0 = 2.0, CYCLE_DT = 0.72, NCYC = 8;
const TX = 180, TY0 = 460, TLEN = 320;      // template anchor x, bottom y, length
const STEP = TLEN / 24;                      // px per base

// dye colours for a two-colour instrument: T green, C red-pink, A both (amber), G dark
function dye(P, b) { return { T: P.good, C: P.samples[4], A: P.rna, G: P.inkFaint }[b]; }

export default {
  id: 'sbs',
  duration: 16,
  thumbT: 6.2,
  phases: [
    { t: 0, label: 'Primer binds', caption: 'A sequencing primer anneals to the adapter right next to the insert; synthesis will proceed into the insert, one base per cycle.' },
    { t: 2, label: 'Incorporate · image · cleave', caption: 'A fluorescent, blocked nucleotide is added, the flow cell is photographed, the dye and block are removed, and the next cycle begins.' },
    { t: 8, label: 'Phasing', caption: 'Some strands in a cluster fall a base behind or ahead. The mixed signal lowers confidence, so quality falls toward the 3′ end of every read.' },
    { t: 11.5, label: 'No signal means G', caption: 'On two-colour instruments G is the dark base, so a cluster that stops emitting (insert ended, dead cluster) is called as a run of G.' },
    { t: 14, label: 'Read order', caption: 'Read 1, then the index reads, then the strand is regenerated and Read 2 is primed from the other adapter.' },
  ],
  draw(ctx, t, W, H, P) {
    const dimLeft = 1 - 0.5 * sp(t, 11.5, 12.2) - 0.4 * sp(t, 14, 14.6);
    // ---- flow-cell surface and template ----
    ctx.save(); ctx.globalAlpha = dimLeft;
    ctx.fillStyle = P.grid; ctx.fillRect(60, TY0 + 14, 300, 8);
    text(ctx, 'flow-cell surface', 60, TY0 + 36, { size: 11, color: P.inkFaint });
    // template strand (violet-ish adapter at bottom, insert blue, adapter at top) drawn vertical
    line(ctx, TX, TY0 + 14, TX, TY0, P.p5, 2.4);                      // P5 oligo tether
    ssStrand(ctx, TX, TY0, TX, TY0 - 36, { color: P.p5, side: 1, tickEvery: 7 });     // adapter part incl. Rd1 primer site
    ssStrand(ctx, TX, TY0 - 36, TX, TY0 - TLEN, { color: P.dna, side: 1, tickEvery: STEP });  // insert
    ssStrand(ctx, TX, TY0 - TLEN, TX, TY0 - TLEN - 30, { color: P.p7, side: 1, tickEvery: 7 });
    text(ctx, 'template (one strand of the cluster)', TX + 16, TY0 - TLEN - 20, { size: 11, color: P.inkDim });
    // primer
    const pa = sp(t, 0.4, 1.6);
    const prY = lerp(TY0 - 90, TY0 - 36, pa);
    ssStrand(ctx, TX + 8, prY + 36, TX + 8, prY, { color: P.p5, side: -1, tickEvery: 7, lw: 2.6 });
    text(ctx, 'Read 1 primer', TX + 20, prY + 18, { size: 11, color: P.p5, alpha: win(t, 0.4, 3) });
    text(ctx, '5′', TX + 14, prY + 40, { size: 9, color: P.inkFaint, alpha: win(t, 0.4, 3) });
    text(ctx, '3′', TX + 14, prY - 6, { size: 9, color: P.inkFaint, alpha: win(t, 0.4, 3) });

    // ---- cycles ----
    const cycF = clamp((t - CYCLE_T0) / CYCLE_DT, 0, NCYC);
    const done = Math.floor(cycF), ph = cycF - done;
    // incorporated bases so far (as part of the growing strand)
    for (let i = 0; i < Math.min(done, NCYC); i++) {
      const y = TY0 - 36 - (i + 0.5) * STEP;
      line(ctx, TX + 8, y + STEP / 2, TX + 8, y - STEP / 2, P.dna, 2.6);
      line(ctx, TX + 8, y, TX + 3, y, P.dna, 1.4, 0.8);
    }
    if (done < NCYC && t >= CYCLE_T0) {
      const i = done, b = SEQ[i];
      const y = TY0 - 36 - (i + 0.5) * STEP;
      // 0–0.4 arrive, 0.4–0.7 image, 0.7–1 cleave
      const arrive = sp(ph, 0, 0.4);
      const nx = lerp(TX + 90, TX + 8, arrive), ny = lerp(y - 40, y, arrive);
      const glow = ph < 0.7 ? 1 : 1 - prog(ph, 0.7, 0.95);
      dot(ctx, nx, ny, 5, dye(P, b), 0.95 * (b === 'G' ? 0.3 : 1) * (ph < 0.7 ? 1 : glow));
      if (ph >= 0.4 && ph < 0.7) {
        // imaging flash
        ctx.save(); ctx.globalAlpha = 0.35 * pulse(ph, 0.4, 0.7); ctx.fillStyle = dye(P, b); ctx.beginPath(); ctx.arc(TX + 8, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (ph >= 0.4) line(ctx, TX + 8, y + STEP / 2, TX + 8, y - STEP / 2, P.dna, 2.6);
      // blocking group
      if (ph >= 0.4 && ph < 0.75) { ctx.save(); ctx.fillStyle = P.enzyme; roundRect(ctx, TX + 4, y - STEP / 2 - 4, 8, 4, 1); ctx.fill(); ctx.restore(); }
      // polymerase
      blob(ctx, TX + 24, y + 2, 9, P.enzyme, { seed: 4, alpha: 0.9 });
    }
    // cycle readout
    {
      const a = win(t, CYCLE_T0 - 0.2, 11.5, 0.4);
      const stage = ph < 0.4 ? 'incorporate' : ph < 0.7 ? 'image' : 'cleave';
      text(ctx, 'cycle', 420, 120, { size: 12, color: P.inkDim, alpha: a });
      text(ctx, String(Math.min(NCYC, done + (ph > 0 ? 1 : 0))), 462, 118, { size: 30, color: P.ink, weight: 700, mono: true, alpha: a });
      text(ctx, 'of 151', 500, 124, { size: 12, color: P.inkDim, alpha: a });
      text(ctx, done < NCYC ? stage : '… continues to cycle 151', 420, 150, { size: 11.5, color: P.inkFaint, mono: true, alpha: a });
      // camera
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P.enzyme; roundRect(ctx, 600, 110, 34, 24, 4); ctx.fill(); ctx.fillStyle = P.panel; ctx.beginPath(); ctx.arc(617, 122, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      text(ctx, 'camera', 617, 146, { size: 10.5, color: P.inkFaint, align: 'center', alpha: a });
      if (ph >= 0.4 && ph < 0.7 && done < NCYC) dot(ctx, 617, 122, 10 * pulse(ph, 0.4, 0.7), P.gold, 0.6);
      // the read so far
      text(ctx, 'read 1:', 420, 190, { size: 12, color: P.inkDim, mono: true, alpha: a });
      const colors = { A: dye(P, 'A'), C: dye(P, 'C'), G: P.inkDim, T: dye(P, 'T') };
      baseRow(ctx, SEQ, 486, 190, { size: 14, step: 13, color: P.ink, colors, upto: done + (ph >= 0.7 ? 1 : 0), alpha: a });
      // two-colour legend
      const lg = win(t, 2.4, 11.5, 0.5);
      ['T', 'C', 'A', 'G'].forEach((b, i) => {
        dot(ctx, 420 + i * 70, 226, 5, dye(P, b), lg * (b === 'G' ? 0.35 : 1));
        text(ctx, b === 'A' ? 'A  both dyes' : b === 'G' ? 'G  dark' : b === 'T' ? 'T  green' : 'C  red', 430 + i * 70, 226, { size: 10.5, color: P.inkDim, alpha: lg });
      });
      text(ctx, 'two-colour chemistry (NextSeq / NovaSeq); four-colour instruments use one dye per base', 420, 246, { size: 10.5, color: P.inkFaint, alpha: lg });
    }
    ctx.restore();

    // ---- phasing panel ----
    {
      const a = win(t, 8, 11.9, 0.5);
      if (a > 0) {
        const gx = 420, gy = 290;
        text(ctx, 'one cluster, ~1000 strands', gx, gy - 14, { size: 11.5, color: P.inkDim, alpha: a });
        const prog_ = sp(t, 8.3, 10.8);  // "later cycles"
        const n = 7;
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
          const k = r * n + c;
          const lag = hash(k, 3) < 0.18 * prog_ ? -1 : hash(k, 9) < 0.08 * prog_ ? 1 : 0;   // behind / ahead
          const b = SEQ[(5 + lag + n) % SEQ.length];
          dot(ctx, gx + 8 + c * 14, gy + 8 + r * 14, 5, dye(P, b), a * (b === 'G' ? 0.35 : 1));
        }
        const purity = 1 - 0.55 * prog_;
        text(ctx, 'signal purity', gx + 120, gy + 10, { size: 11.5, color: P.inkDim, alpha: a });
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P.grid; roundRect(ctx, gx + 120, gy + 22, 140, 10, 3); ctx.fill();
        ctx.fillStyle = purity > 0.7 ? P.good : P.alert; roundRect(ctx, gx + 120, gy + 22, 140 * purity, 10, 3); ctx.fill(); ctx.restore();
        text(ctx, `${Math.round(prog_ * 2.0 * 10) / 10} % phasing, ${Math.round(prog_ * 0.8 * 10) / 10} % pre-phasing`, gx + 120, gy + 46, { size: 10.5, color: P.inkFaint, alpha: a, mono: true });
        // Q vs cycle curve
        const qx = gx + 300, qy = gy - 6, qw = 200, qh = 100;
        line(ctx, qx, qy + qh, qx + qw, qy + qh, P.inkFaint, 1, a);
        line(ctx, qx, qy, qx, qy + qh, P.inkFaint, 1, a);
        text(ctx, 'Q', qx - 12, qy + 4, { size: 10.5, color: P.inkDim, alpha: a });
        text(ctx, 'cycle 1', qx, qy + qh + 12, { size: 10.5, color: P.inkDim, alpha: a });
        text(ctx, '151', qx + qw, qy + qh + 12, { size: 10.5, color: P.inkDim, alpha: a, align: 'right' });
        text(ctx, 'Read 1', qx + 8, qy + qh - 30, { size: 10.5, color: P.p5, alpha: a });
        text(ctx, 'Read 2', qx + 8, qy + qh - 16, { size: 10.5, color: P.p7, alpha: a });
        const reveal = sp(t, 8.3, 10.8);
        curve(ctx, qx, qy, qw * reveal, qh, u => { const uu = u * reveal; return 0.92 - 0.25 * uu * uu - 0.08 * Math.max(0, uu - 0.7) * 3; }, P.p5, { alpha: a, lw: 2 });
        curve(ctx, qx, qy, qw * reveal, qh, u => { const uu = u * reveal; return 0.88 - 0.33 * uu * uu - 0.1 * Math.max(0, uu - 0.65) * 3; }, P.p7, { alpha: a, lw: 2 });
        text(ctx, 'quality falls toward the 3′ end, Read 2 more', qx + qw / 2, qy + qh + 30, { size: 10.5, color: P.inkDim, align: 'center', alpha: a * win(t, 10.2, 11.9, 0.4), maxWidth: 230 });
      }
    }

    // ---- poly-G panel ----
    {
      const a = win(t, 11.6, 14.2, 0.5);
      if (a > 0) {
        const y = 400;
        text(ctx, 'a 90 bp insert sequenced for 151 cycles', 420, y - 46, { size: 12, color: P.ink, weight: 600, alpha: a });
        const x0 = 420;
        const segs = [[P.dna, 'insert (90)', 0, 150], [P.p7, 'adapter', 150, 215], [P.inkFaint, 'nothing left to read', 215, 400]];
        segs.forEach(s => { line(ctx, x0 + s[2], y - 18, x0 + s[3], y - 18, s[0], 6, a); text(ctx, s[1], x0 + (s[2] + s[3]) / 2, y - 32, { size: 10.5, color: s[0] === P.inkFaint ? P.inkDim : s[0], align: 'center', alpha: a }); });
        const read = fakeSeq(12, 8) + 'AGATCGGAAGAGC' + 'GGGGGGGGGGGGGGGGGG';
        const upto = Math.floor(read.length * sp(t, 11.9, 13.4));
        const colors = {};
        baseRow(ctx, read.slice(0, 25), x0, y, { size: 12.5, step: 11, color: P.ink, upto: Math.min(upto, 25), alpha: a });
        baseRow(ctx, read.slice(25), x0 + 25 * 11, y, { size: 12.5, step: 11, color: P.alert, upto: Math.max(0, upto - 25), alpha: a });
        text(ctx, 'poly-G tail: not biology. fastp --trim_poly_g', x0 + 25 * 11, y + 22, { size: 11, color: P.alert, alpha: a * win(t, 13.2, 14.2, 0.3) });
        text(ctx, 'insert', x0, y + 22, { size: 10.5, color: P.inkDim, alpha: a });
        text(ctx, 'adapter', x0 + 12 * 11, y + 22, { size: 10.5, color: P.p7, alpha: a });
      }
    }

    // ---- run order ----
    {
      const a = win(t, 14, 16.5, 0.5);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = withAlpha(P.panel, 0.92); ctx.fillRect(40, 340, 880, 190); ctx.restore();
        const x0 = 100, y = 430, total = 760;
        const parts = [['Read 1', 151, P.p5], ['i7', 10, P.p7], ['i5', 10, P.p5], ['Read 2', 151, P.p7]];
        const cyc = parts.reduce((s, p) => s + p[1], 0);
        let x = x0; const reveal = sp(t, 14.3, 15.6);
        parts.forEach((p, i) => {
          const w = p[1] / cyc * total;
          const shown = clamp((reveal * total - (x - x0)) / w);
          if (shown > 0) {
            ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = p[2]; roundRect(ctx, x, y - 12, Math.max(2, w * shown), 24, 4); ctx.fill(); ctx.restore();
            if (shown > 0.5) {
              if (p[1] > 50) text(ctx, `${p[0]} · ${p[1]} cycles`, x + w / 2, y + 30, { size: 11, color: p[2], align: 'center', alpha: a });
              else text(ctx, `${p[0]} · ${p[1]}`, x + w / 2, i === 1 ? y - 24 : y + 30, { size: 10.5, color: p[2], align: 'center', alpha: a });
            }
          }
          x += w + 4;
        });
        text(ctx, 'turnaround: the strand is regenerated and Read 2 is primed from the P7 adapter', x0 + 380, y - 40, { size: 11.5, color: P.inkDim, align: 'center', alpha: a * win(t, 15.2, 16.5, 0.3) });
        text(ctx, 'i5 is read in the opposite orientation on NextSeq / NovaSeq vs MiSeq: the sample-sheet “reverse complement i5” column', x0 + 380, y + 56, { size: 10.5, color: P.inkFaint, align: 'center', alpha: a * win(t, 15.4, 16.5, 0.3) });
      }
    }
  },
};
