// Demultiplexing: index pairs route reads to per-sample FASTQs; one mismatch
// is tolerated; unknown pairs go to Undetermined; then the FASTQ header.
import { prog, sp, win, pulse, lerp, hash, clamp, text, callout, libraryMolecule, line, dot, arrow, roundRect, withAlpha } from '../draw.js';

const NS = 4;
const BIN_X = 760, BIN_Y0 = 120, BIN_DY = 66, UND_Y = BIN_Y0 + NS * BIN_DY + 20;
const LANE_Y = 300;

// Reads: appear at t0, travel the lane, then drop into a bin.
const reads = [];
for (let i = 0; i < 17; i++) {
  const t0 = 0.3 + i * 0.5;
  let sample = i % NS, kind = 'ok';
  if (i === 8) kind = 'mismatch';           // t0 = 4.3
  if (i === 14) { kind = 'unknown'; sample = -1; } // t0 = 7.3
  reads.push({ i, t0, sample, kind, insert: 44 + 20 * hash(i, 5) });
}
const TRAVEL = 2.0, DROP = 0.7;

function filePath(ctx, x, y, w, h) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w - 10, y); ctx.lineTo(x + w, y + 10); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
}

export default {
  id: 'demultiplexing',
  duration: 13.5,
  thumbT: 5.2,
  phases: [
    { t: 0, label: 'Index pairs route reads', caption: 'For every cluster the i7 and i5 index reads are compared with the sample sheet and Read 1 / Read 2 are written to that sample’s FASTQ.' },
    { t: 4.3, label: 'One mismatch allowed', caption: 'By default one sequencing error per index is tolerated, so a read with a single wrong index base is still assigned.' },
    { t: 7.3, label: 'Unknown pair → Undetermined', caption: 'A pair that matches no sample (an unexpected i7/i5 combination, PhiX, or a typo in the sheet) goes to Undetermined_S0.' },
    { t: 9.8, label: 'Anatomy of the header', caption: 'The read name records where the cluster came from and the index that was observed, so demultiplexing can be audited later.' },
  ],
  draw(ctx, t, W, H, P) {
    const fade = 1 - prog(t, 9.6, 10.3);
    if (fade > 0) {
      ctx.save(); ctx.globalAlpha = fade;
      // ----- sample sheet -----
      text(ctx, 'sample sheet', 60, 80, { size: 13, color: P.ink, weight: 600 });
      const names = ['gut_01', 'gut_02', 'blank_A', 'mock'];
      for (let s = 0; s < NS; s++) {
        const y = 104 + s * 22;
        text(ctx, names[s], 60, y, { size: 12, color: P.inkDim, mono: true });
        text(ctx, 'i7', 150, y, { size: 10.5, color: P.inkFaint });
        ctx.fillStyle = P.samples[s]; roundRect(ctx, 166, y - 5, 22, 10, 2); ctx.fill();
        text(ctx, 'i5', 198, y, { size: 10.5, color: P.inkFaint });
        ctx.fillStyle = P.samples[s]; roundRect(ctx, 214, y - 5, 22, 10, 2); ctx.fill();
      }
      text(ctx, 'unique dual indexes: each sample has its own i7 and its own i5', 60, 104 + NS * 22 + 4, { size: 10.5, color: P.inkFaint });

      // ----- lane -----
      line(ctx, 40, LANE_Y + 14, 640, LANE_Y + 14, P.grid, 1);
      text(ctx, 'clusters, with their index reads', 40, LANE_Y + 30, { size: 11, color: P.inkFaint });
      // the sorter
      ctx.fillStyle = P.enzymeDim; roundRect(ctx, 600, LANE_Y - 34, 70, 68, 8); ctx.fill();
      text(ctx, 'bcl2fastq /', 635, LANE_Y - 8, { size: 10.5, color: P.ink, align: 'center' });
      text(ctx, 'BCL Convert', 635, LANE_Y + 8, { size: 10.5, color: P.ink, align: 'center' });

      // ----- bins -----
      const counts = new Array(NS).fill(0); let und = 0;
      reads.forEach(r => { if (t > r.t0 + TRAVEL + DROP) { if (r.sample >= 0) counts[r.sample]++; else und++; } });
      for (let s = 0; s < NS; s++) {
        const y = BIN_Y0 + s * BIN_DY;
        ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.fillStyle = P.panel; filePath(ctx, BIN_X, y - 22, 150, 44); ctx.fill(); ctx.stroke();
        ctx.fillStyle = P.samples[s]; ctx.fillRect(BIN_X, y - 22, 4, 44);
        text(ctx, `${names[s]}_S${s + 1}_R1.fastq.gz`, BIN_X + 12, y - 6, { size: 10.5, color: P.ink, mono: true });
        text(ctx, `${counts[s]} reads`, BIN_X + 12, y + 10, { size: 10.5, color: P.inkDim });
      }
      ctx.strokeStyle = P.grid; ctx.fillStyle = P.panel; filePath(ctx, BIN_X, UND_Y - 22, 150, 44); ctx.fill(); ctx.stroke();
      ctx.fillStyle = P.alert; ctx.fillRect(BIN_X, UND_Y - 22, 4, 44);
      text(ctx, 'Undetermined_S0_R1', BIN_X + 12, UND_Y - 6, { size: 10.5, color: P.ink, mono: true });
      text(ctx, `${und} reads`, BIN_X + 12, UND_Y + 10, { size: 10.5, color: und ? P.alert : P.inkDim });

      // ----- reads in flight -----
      reads.forEach(r => {
        const u = prog(t, r.t0, r.t0 + TRAVEL);
        const d = prog(t, r.t0 + TRAVEL, r.t0 + TRAVEL + DROP);
        if (t < r.t0 || d >= 1) return;
        const targetY = r.sample >= 0 ? BIN_Y0 + r.sample * BIN_DY : UND_Y;
        const x = u < 1 ? lerp(-60, 600, u) : lerp(600, BIN_X - 10, d);
        const y = u < 1 ? LANE_Y : lerp(LANE_Y, targetY, sp(t, r.t0 + TRAVEL, r.t0 + TRAVEL + DROP));
        const alpha = 1 - prog(d, 0.85, 1);
        const i7 = r.kind === 'unknown' ? P.samples[0] : P.samples[r.sample];
        const i5 = r.kind === 'unknown' ? P.samples[2] : P.samples[r.sample];
        libraryMolecule(ctx, x, y, r.insert, P, { alpha, i5, i7, adapterLen: 26, gap: 6, lw: 2.2 });
        if (r.kind === 'mismatch') {
          // one wrong base in i7: a small notch
          dot(ctx, x + r.insert / 2 + 26 * 0.7 + 3, y - 6, 3, P.alert, alpha);
          const ga = win(t, r.t0 + 0.6, r.t0 + TRAVEL + DROP + 0.8, 0.3);
          callout(ctx, '1 mismatch in i7 → still assigned (rescued): the header keeps the observed index', 60, 390, P, { to: [x + r.insert / 2 + 21, y - 6], size: 11.5, color: P.gold, alpha: ga });
        }
        if (r.kind === 'unknown') {
          const ga = win(t, r.t0 + 0.6, r.t0 + TRAVEL + DROP + 1.0, 0.3);
          callout(ctx, 'i7 of gut_01 with i5 of blank_A: no such sample → Undetermined', 60, 390, P, { to: [x, y + 8], size: 11.5, color: P.alert, alpha: ga });
          text(ctx, 'a hopped read: with unique dual indexes it is caught here; with combinatorial indexes it would land in a sample', 60, 410, { size: 10.5, color: P.inkDim, alpha: ga * 0.9 });
        }
      });

      text(ctx, 'reads that fail the chastity filter were already dropped; everything else ends up in exactly one file', 40, 470, { size: 11.5, color: P.inkDim, alpha: win(t, 1.5, 9.6, 0.4) });
      text(ctx, 'index sequences are not in R1/R2; they are read separately and recorded in the header', 40, 490, { size: 11.5, color: P.inkDim, alpha: win(t, 2.5, 9.6, 0.4) });
      ctx.restore();
    }

    // ───────── phase 3: header anatomy ─────────
    const ha = win(t, 9.9, 14, 0.5);
    if (ha > 0) {
      ctx.save(); ctx.globalAlpha = ha;
      text(ctx, 'one FASTQ record', 60, 90, { size: 14, color: P.ink, weight: 600 });
      const fields = [
        ['@A00123', 'instrument'], [':', null], ['45', 'run'], [':', null], ['HXYZ3DSXX', 'flow cell'], [':', null], ['1', 'lane'], [':', null], ['1101', 'tile'], [':', null], ['2345', 'x'], [':', null], ['1000', 'y'],
        [' ', null], ['1', 'read 1/2'], [':', null], ['N', 'filtered?'], [':', null], ['0', 'control'], [':', null], ['ACGTTGCA+TTGACCAG', 'observed i7+i5'],
      ];
      const size = 17;
      ctx.font = `500 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      let x = 60; const y = 150;
      const labelled = fields.filter(f => f[1]);
      let k = 0;
      const rowOf = [0, 1, 0, 1, 0, 1, 0, 1, 0, 2, 1];
      fields.forEach(f => {
        const w = ctx.measureText(f[0]).width;
        if (f[1]) {
          const idx = k++;
          const on = win(t, 10.3 + idx * 0.2, 14, 0.25);
          const hot = pulse(t, 10.3 + idx * 0.2, 10.3 + idx * 0.2 + 0.8);
          ctx.fillStyle = withAlpha(idx < 7 ? P.dna : P.p7, 0.12 + 0.25 * hot); roundRect(ctx, x - 2, y - 14, w + 4, 28, 4); ctx.fill();
          text(ctx, f[0], x, y, { size, color: idx === 10 ? P.p7 : P.ink, mono: true, weight: 600 });
          // label below, staggered in two rows to avoid overlap
          const row = rowOf[idx];
          const ly = y + 34 + row * 17;
          line(ctx, x + w / 2, y + 15, x + w / 2, ly - 8, P.inkFaint, 1, on);
          text(ctx, f[1], x + w / 2, ly, { size: 10.5, color: P.inkDim, align: 'center', alpha: on });
        } else {
          text(ctx, f[0], x, y, { size, color: P.inkFaint, mono: true });
        }
        x += w;
      });
      text(ctx, 'cluster location', 60, 122, { size: 11, color: P.dna });
      text(ctx, 'read description', 640, 122, { size: 11, color: P.p7 });
      // rest of record
      const ra = win(t, 12.0, 14, 0.4);
      text(ctx, 'TTGCAGTACCGTAGGCTTAGCCAGTGACTTAGCGTTACGGATCCAGTTAGC…', 60, 250, { size: 13, color: P.ink, mono: true, alpha: ra });
      text(ctx, '+', 60, 276, { size: 13, color: P.inkDim, mono: true, alpha: ra });
      text(ctx, 'FFFFFFFFFFFFF:FFFFFFFF:FFFFFFF,FFFFFF:FFFFFF,FFF:FF#…', 60, 302, { size: 13, color: P.good, mono: true, alpha: ra });
      const na = win(t, 12.4, 14, 0.4);
      const notes = [
        'tile + x/y identify optical duplicates; lane + flow cell give read groups when files are merged',
        'the observed index lets you re-check an assignment; UMIs may be appended here too',
        'R1 and R2 files list the same names in the same order; if not, pairing is broken',
        'Phred+33 qualities; a few distinct characters means the run was Q-binned',
      ];
      notes.forEach((n, i) => text(ctx, '· ' + n, 60, 350 + i * 24, { size: 12, color: P.inkDim, alpha: na * sp(t, 12.4 + i * 0.2, 12.8 + i * 0.2) }));
      ctx.restore();
    }
  },
};
