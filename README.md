# Before the FASTQ

Animated wet-lab workflows for people who analyse sequencing data but have
never done the bench work. Each step shows what was physically done to the
sample, what it changed about the molecules, and what that means for the reads.

Audience: bioinformaticians who receive FASTQ files and need to know what
happened before them, so that trimming, deduplication, strand flags, depth
thresholds and contamination filters are chosen for the right reasons.

## Run

```bash
python3 serve.py          # http://localhost:8765
```

No build step, no dependencies. Plain HTML, CSS and ES modules. Deploys as-is
to GitHub Pages (serve the repository root).

## What is in it

| Workflow | Steps | Output |
|---|---|---|
| Shotgun DNA on Illumina | 14 | 2×150 paired FASTQ |
| Stranded RNA-seq on Illumina | 17 | 2×75–150 paired FASTQ, dUTP orientation |
| 16S rRNA amplicon on Illumina | 12 | 2×250/300 paired FASTQ, primers in reads |
| VLP virome on Illumina | 12 | 2×150 paired FASTQ, low input, often MDA |
| Long-read DNA on Oxford Nanopore | 6 | FASTQ / uBAM, read length = molecule length |
| Single-cell RNA on 10x Chromium 3′ | 13 | R1 = 16 bp barcode + 12 bp UMI, R2 = cDNA; a UMI count matrix |
| Long-read DNA on PacBio HiFi | 6 | HiFi reads 15–20 kb, median Q30+, `rq`/`np` tags |
| Metatranscriptomics on Illumina | 17 | Stranded 2×75–150 paired FASTQ plus matched shotgun DNA |
| DNA methylation: WGBS and EM-seq | 16 | Three-letter-alphabet FASTQ; per-cytosine methylation tables |
| Hi-C and proximity ligation | 14 | Paired FASTQ where the mates are two distant loci; .pairs / .cool matrices |
| ATAC-seq: open chromatin | 12 | 2×50 paired FASTQ, Nextera adapters; fragments with a nucleosome ladder |
| ChIP-seq, CUT&RUN and CUT&Tag | 15 | Paired FASTQ enriched at bound sites; peaks need an input or IgG control |
| RIP-seq and eCLIP | 13 | Single-end reads starting with a UMI; read starts mark crosslink sites |
| Hybrid capture: exome, panels, viral capture | 17 | 2×100–150 paired FASTQ, 60–80 % on target; HsMetrics |
| Tiled amplicon viral sequencing (ARTIC) | 15 | Amplicon-shaped coverage; consensus genome with N runs at dropouts |

A **Which workflow is mine?** page (`#/find`) maps analysis tasks, SRA/GEO
library-strategy labels and the shape of the reads to the right workflow, and
every workflow page opens with "Is this your data?" and the analyses it supports.

Steps are written once and reused across workflows (61 steps in the library);
workflow-specific caveats appear as notes. A cross-cutting **artifact index**
(duplicates, adapter read-through, index hopping, poly-G, strandedness, …)
goes from what you see in the data back to the bench step that produced it.

Every step page has:

- an animation (scrubbable, deterministic),
- **What happens at the bench**,
- **Variants you will meet in a Methods section**,
- **In your data** – consequences in the reads,
- **What can go wrong here** – each bench failure, the trace it leaves in the
  FASTQ or downstream, and how to tell that trace from real biology,
- **Check in your files** – where to look (FastQC modules, Picard metrics, RSeQC, NanoPlot…),
- **Ask the wet lab** – questions whose answers change the pipeline.

## Controls

| Key | Action |
|---|---|
| `Space` | play / pause |
| `←` `→` | step 0.1 s (`⇧` = 1 s) |
| `[` `]` | previous / next phase |
| `R` | restart |

## Architecture

```
index.html            shell + hash router mount points
styles.css
src/
  main.js             router and page templates
  player.js           canvas player (clock, scrubber, phases, thumbnails)
  palette.js          colour-as-information contract (light + dark)
  draw.js             drawing vocabulary: dsDNA, ssDNA, Y-adapters, beads, tubes, cells, plots
  content/
    steps.js          the step library (text)
    tracks.js         workflows = ordered lists of step ids + notes
    artifacts.js      artefact index, linked to steps
    failures.js       per step: bench failure → FASTQ signature → bench-or-biology tell
    finder.js         per workflow: aliases, metadata labels, how to recognise it, analyses; task → workflow index; read-shape triage
  anim/
    index.js          loads ./anim/<step-id>.js on demand; placeholder if missing
    <step-id>.js      one animation per step
check.html            render one frame: ?step=<id>&t=<s>&theme=dark
contact-sheet.html    every animation at five time points (review tool)
serve.py              no-cache dev server
```

### The one invariant

Every animation is a pure function of time:

```js
export default {
  id: 'fragmentation',
  duration: 13,                       // seconds, loops
  thumbT: 7.6,                        // representative frame for thumbnails
  phases: [{ t: 0, label: 'Intact genomic DNA', caption: 'One sentence shown under the canvas.' }, …],
  draw(ctx, t, W, H, P) { /* W=960, H=540, P = palette */ },
};
```

Nothing holds animation state. Randomness comes from `hash(i, salt)` so the
same `t` always draws the same picture. That is what makes scrubbing exact and
lets `contact-sheet.html` render any frame for review.

### Colour contract

| Hue | Meaning |
|---|---|
| slate blue | DNA: genomic DNA, inserts, cDNA, amplicons |
| amber | RNA |
| teal | P5 side: P5 arm, i5 index, Read 1 primer site |
| violet | P7 side: P7 arm, i7 index, Read 2 primer site |
| brown | magnetic (SPRI) beads |
| grey | enzymes, proteins, instruments |
| gold | the thing to look at now |
| red | artefact, bias, loss |
| green | a check that passed |

### Adding a step

1. Add the text entry to `src/content/steps.js`.
2. Add `src/anim/<step-id>.js` following the interface above (helpers in `src/draw.js`).
3. Put the id in one or more workflows in `src/content/tracks.js`.
4. Link artefacts in `src/content/artifacts.js` (`causes: [...]`).
5. Add 3–5 failure modes to `src/content/failures.js` (`what`, `signature`, `tell`, optional `artifact`).
6. Review frames: `check.html?step=<id>&t=4.2` or the contact sheet.

Rendering frames headlessly for review:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --window-size=980,560 --virtual-time-budget=4000 --screenshot=out.png \
  "http://localhost:8765/check.html?step=fragmentation&t=4.2"
```

## Accuracy

Protocol numbers (cycle counts, bead ratios, pore sizes, index lengths) are
typical values from vendor protocols and common practice, not the values used
for any particular dataset. Confirm against the real Methods section or the
facility’s records before relying on them.
