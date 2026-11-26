// The step library. A step is written once and reused by every workflow that
// contains it. Workflow-specific nuances live in tracks.js as notes.
//
// Fields:
//   title     short name
//   short     one-line summary for cards and the sidebar
//   bench     paragraphs: what physically happens
//   variants  common alternative methods the reader may meet in a Methods section
//   data      bullets: consequences visible in the reads / downstream
//   check     bullets: where to look in your files or QC reports
//   ask       bullets: questions worth asking the people who made the library
//   artifacts ids from artifacts.js
//   inputs / outputs  one-liners describing what goes in and comes out

export const steps = {

  // ───────────────────────── sample & nucleic acid prep ─────────────────────────
  collection: {
    title: 'Sample collection & storage',
    short: 'The sample is taken, stabilized and frozen. Composition starts changing the moment it leaves the body or the culture.',
    inputs: 'Stool, swab, tissue, blood, culture, soil, water…',
    outputs: 'A stored aliquot, ideally at −80 °C or in a preservative',
    bench: [
      'A sample is collected into a tube, often with a preservative (RNAlater, DNA/RNA Shield, ethanol, OMNIgene) or without one, then transported and frozen. Time at room temperature, freeze–thaw cycles and the preservative chemistry all alter which molecules survive and which taxa keep growing or lysing before the sample is frozen.',
      'Many studies collect over months or years, in several sites, with changing kits and personnel. The collection metadata (date, site, storage time, preservative, freezer) is where batch effects are born, and it is usually the metadata nobody sends to the bioinformatician.',
    ],
    variants: [
      { name: 'Immediate −80 °C freeze', text: 'Best for composition fidelity. Watch for freeze–thaw cycles when aliquots are re-used.' },
      { name: 'Preservative buffers', text: 'Stabilize at room temperature for days to weeks. Some (ethanol, OMNIgene) shift relative abundances of specific taxa; results are comparable within a preservative, not across.' },
      { name: 'Blood: EDTA vs cfDNA tubes', text: 'For cell-free DNA, standard EDTA tubes allow leukocyte lysis within hours, flooding the sample with genomic DNA; Streck-type tubes prevent this.' },
    ],
    data: [
      'Batch effects: samples collected or stored differently cluster separately in PCA regardless of biology. Confounding with the variable of interest is common when cases and controls were collected at different times.',
      'Degraded nucleic acid: long room-temperature exposure lowers integrity, which later shows up as short inserts and, for RNA, 3′ bias.',
      'Compositional drift: facultative anaerobes keep growing in unfrozen stool; RNA from stress-response genes rises within minutes of collection.',
    ],
    check: [
      'Ask for the full sample manifest and test whether collection date, site or storage time explains your top principal components.',
      'Look for collection-batch structure in negative controls and in low-biomass samples first; they show it earliest.',
    ],
    ask: [
      'What preservative, if any? Was it the same for every sample?',
      'How long between collection and freezing, and how many freeze–thaw cycles?',
      'Were cases and controls collected over the same period and by the same people?',
    ],
    artifacts: ['batch-effects', 'degradation'],
  },

  extraction: {
    title: 'Cell lysis & DNA extraction',
    short: 'Cells are broken open mechanically or chemically and DNA is purified away from proteins, lipids and inhibitors. Lysis efficiency differs by organism.',
    inputs: 'Stored sample',
    outputs: 'Purified DNA in buffer, typically 10–200 ng/µL',
    bench: [
      'Cells are lysed by some combination of detergent, heat, enzymes (lysozyme, proteinase K) and mechanical disruption (bead beating). Released DNA is then bound to a silica column or magnetic beads, washed, and eluted in a small volume of buffer. Everything that was not lysed, or that did not bind the column, is not in your data.',
      'Gram-positive bacteria, spores, fungi and some archaea have tough walls that chemical lysis alone under-represents. Bead beating fixes that but shears DNA into shorter pieces, which matters for long-read sequencing and for some long-insert libraries. Every kit sits somewhere on this trade-off, and different kits produce systematically different community profiles from the same sample.',
      'Reagents, columns and the lab environment carry their own low-level DNA (the “kitome”). In high-biomass samples it is invisible; in low-biomass samples (skin, tissue, blood, air, built environment) it can be most of what gets sequenced.',
    ],
    variants: [
      { name: 'Bead beating + column (e.g. PowerSoil, ZymoBIOMICS)', text: 'Better lysis of Gram-positives; more fragmented DNA. The de facto standard for microbiome work.' },
      { name: 'Chemical/enzymatic only (e.g. QIAamp)', text: 'Gentler, longer fragments, but under-represents hard-to-lyse taxa.' },
      { name: 'Phenol–chloroform', text: 'High yield and long fragments; organic carry-over can inhibit downstream enzymes.' },
      { name: 'Host depletion (e.g. saponin lysis, methylation-based pulldown)', text: 'Removes host cells or host DNA before sequencing to enrich microbial reads; also skews microbial composition.' },
    ],
    data: [
      'Taxon-specific bias: relative abundances reflect lysis efficiency as much as true abundance. Comparisons are valid within an extraction protocol, shaky across them.',
      'Kit and environmental contaminants: Ralstonia, Burkholderia, Bradyrhizobium, Pseudomonas, Sphingomonas and similar genera appearing at low biomass are classic reagent contaminants.',
      'Host DNA dominates in tissue, blood, saliva and skin; 90–99 % of reads may map to the host genome before any microbial signal.',
      'Fragment length ceiling: bead-beaten DNA is often <10 kb, which limits long-read N50 and some assembly approaches.',
    ],
    check: [
      'Do you have extraction blanks (negative controls)? Run them through the same pipeline and use decontam-style methods before interpreting rare taxa.',
      'Compare taxa prevalence against input biomass or DNA concentration: contaminants are inversely correlated with biomass.',
      'Record which extraction kit and lot each sample used; test it as a covariate.',
    ],
    ask: [
      'Which kit, and was it the same kit and lot for all samples? Were samples extracted in batches, and how were batches assigned?',
      'Was there bead beating? Were negative (blank) and positive (mock community) controls extracted alongside?',
      'Was any host-depletion step used?',
    ],
    artifacts: ['kitome', 'batch-effects', 'lysis-bias'],
  },

  'nucleic-qc': {
    title: 'Quantification & integrity check',
    short: 'How much DNA is there, how pure, and how long are the molecules. The answers decide how many PCR cycles the library will need.',
    inputs: 'Extracted DNA',
    outputs: 'Concentration (ng/µL), purity ratios, fragment-size trace',
    bench: [
      'Concentration is measured by UV absorbance (NanoDrop: fast, overestimates because RNA and free nucleotides also absorb at 260 nm) or by a dsDNA-specific fluorescent dye (Qubit or PicoGreen: what library-prep kits actually require). Purity ratios A260/280 (~1.8 for clean DNA) and A260/230 (>1.8) flag protein, phenol or salt carry-over that can inhibit enzymes later.',
      'Integrity is read from a capillary electrophoresis trace (TapeStation, Bioanalyzer, Fragment Analyzer) and summarized as a DNA Integrity Number (DIN, 1–10). High-molecular-weight DNA appears as a tight band above 20 kb; degraded DNA smears downward.',
      'The library prep protocol branches on these numbers: low input means more PCR cycles, which means more duplicates, or a switch to a low-input kit with different biases.',
    ],
    variants: [
      { name: 'NanoDrop (absorbance)', text: 'Reports total nucleic acid; inflated by RNA and short fragments. Good for purity ratios, poor for library input.' },
      { name: 'Qubit / PicoGreen (fluorometric)', text: 'dsDNA-specific. This is the number that sets the library input.' },
      { name: 'TapeStation / Bioanalyzer / Femto Pulse', text: 'Size distribution and integrity score; Femto Pulse resolves up to ~165 kb for long-read work.' },
    ],
    data: [
      'Low-input samples carry more PCR cycles and more duplicates. Duplication rate often correlates with input concentration across a project, which can masquerade as a biological signal.',
      'Samples below the kit’s minimum are sometimes run anyway; they show up as libraries with low complexity, high adapter-dimer content and high duplication.',
      'Degraded input gives shorter inserts than the protocol targeted; paired reads overlap more.',
    ],
    check: [
      'Request the per-sample input concentration and the number of PCR cycles; plot duplication rate against both.',
      'In FastQC, “Sequence Duplication Levels” and “Overrepresented sequences” are the first place low input shows.',
    ],
    ask: [
      'Qubit or NanoDrop values? What was the input mass into library prep, per sample?',
      'What was the DIN or the size trace of the input? Were any samples below the kit minimum?',
    ],
    artifacts: ['duplicates', 'low-input', 'degradation'],
  },

  // ───────────────────────── Illumina DNA library prep ─────────────────────────
  fragmentation: {
    title: 'Fragmentation',
    short: 'Long DNA is broken into pieces of a chosen size range. The size distribution you choose here is the insert-size distribution you will see later.',
    inputs: 'High-molecular-weight DNA',
    outputs: 'dsDNA fragments, typically 200–600 bp, with ragged ends',
    bench: [
      'A sequencer can only read a few hundred bases from each end of a molecule, so genomic DNA has to be cut into fragments whose length is matched to the read length. Acoustic shearing (Covaris) uses focused ultrasound: sequence-agnostic, tunable by time and power, but needs a dedicated instrument. Enzymatic fragmentation (NEBNext Ultra II FS, KAPA HyperPlus, Fragmentase) uses a cocktail of nucleases; cheaper and automatable, but with mild sequence preferences.',
      'Tagmentation (Nextera, Illumina DNA Prep) combines fragmentation and adapter tagging in one transposase step; it has its own page because it changes the next three steps.',
      'The result is a distribution, not a single length. Its center and spread are set here and only trimmed by the later size selection.',
    ],
    variants: [
      { name: 'Acoustic / mechanical shearing (Covaris, Bioruptor)', text: 'Random breakpoints, broad but controllable distribution, no sequence bias. Fragments have damaged, ragged ends that end-repair must fix.' },
      { name: 'Enzymatic fragmentation', text: 'Time-controlled. Subtle bias at cut sites; some kits show a mild GC-dependent fragment-size shift.' },
      { name: 'Tagmentation', text: 'See the tagmentation step: insertion bias at the transposase target and a different duplicate structure.' },
      { name: 'No fragmentation (cfDNA, ancient DNA, FFPE)', text: 'The sample is already fragmented by biology; insert sizes carry information (e.g. ~167 bp nucleosomal cfDNA peak).' },
    ],
    data: [
      'Insert-size distribution. Its mode and width define how often read 1 and read 2 overlap, how often reads run through the adapter, and what a “proper pair” means to the aligner.',
      'Inserts shorter than the read length produce adapter sequence at the 3′ end of reads (read-through), which must be trimmed before alignment or assembly.',
      'Mild sequence bias at fragment ends with enzymatic methods: the first ~10 bases of reads show a skewed base composition that looks like a FastQC “Per base sequence content” failure but is normal.',
      'Over-shearing yields short inserts, high overlap and low effective coverage per read pair; under-shearing loses molecules at size selection and gives weak clusters.',
    ],
    check: [
      'After alignment: `samtools stats` or Picard `CollectInsertSizeMetrics` for the insert-size histogram. Compare to the protocol’s target.',
      'FastQC “Adapter Content” rising toward the 3′ end means inserts < read length.',
      'Paired-read overlap rate from a merger (fastp, BBMerge) is a quick proxy for insert size without alignment.',
    ],
    ask: [
      'Shearing method and target fragment size? Was it the same across the project?',
      'Did any samples (FFPE, cfDNA, degraded) skip fragmentation?',
    ],
    artifacts: ['insert-size', 'adapter-readthrough', 'end-bias'],
  },

  'end-repair': {
    title: 'End repair & A-tailing',
    short: 'Ragged fragment ends are made blunt and 5′-phosphorylated, then a single A is added to each 3′ end so adapters can ligate specifically.',
    inputs: 'Fragments with overhangs and nicks',
    outputs: 'Blunt, phosphorylated fragments with a 3′ A overhang',
    bench: [
      'Shearing leaves fragments with 5′ and 3′ overhangs and missing phosphates. A mix of T4 DNA polymerase (fills in 5′ overhangs, chews back 3′ overhangs), T4 polynucleotide kinase (adds 5′ phosphates) and often Klenow produces blunt, ligatable ends.',
      'A single non-templated adenine is then added to each 3′ end (Klenow exo-, or Taq). The adapters carry a complementary 3′ T overhang. This A/T pairing prevents fragments from ligating to each other and gives adapters the right orientation. In most modern kits end repair and A-tailing happen in one tube in about 30 min.',
    ],
    variants: [
      { name: 'Single-tube end-prep (most kits)', text: 'Standard. Invisible in the data when it works.' },
      { name: 'Blunt-end ligation (some older / PCR-free protocols)', text: 'No A-tail; higher risk of insert–insert concatemers (chimeras).' },
      { name: 'Damage repair (ancient DNA, FFPE)', text: 'Uracil-DNA glycosylase (UDG) treatment removes deaminated cytosines; without it you see C→T at read ends.' },
    ],
    data: [
      'Mostly invisible. Its failure modes are: low ligation yield (then more PCR cycles, more duplicates) and insert–insert chimeras when the A-tail is incomplete.',
      'Fill-in of 5′ overhangs copies a few bases from the complementary strand; with damaged or deaminated input this is where end-of-read C→T / G→A patterns are fixed into both strands.',
    ],
    check: [
      'Chimeric read pairs (mates mapping far apart or to different contigs) at low frequency in a shotgun library are often ligation chimeras, not biology; check whether the rate is uniform across samples.',
      'For FFPE or ancient DNA, look at mismatch type by read position (e.g. mapDamage); UDG treatment flattens the profile.',
    ],
    ask: [
      'Which kit? Was any damage-repair or UDG step included?',
    ],
    artifacts: ['chimeras', 'damage-patterns'],
  },

  'adapter-ligation': {
    title: 'Adapter ligation',
    short: 'Y-shaped adapters are attached to both ends of every fragment. They carry the sequences the flow cell, the sequencing primers and the sample indexes need.',
    inputs: 'A-tailed fragments; adapters',
    outputs: 'Adapter-ligated fragments; also adapter dimers',
    bench: [
      'Illumina adapters are partially double-stranded: a short duplex stem with a 3′ T overhang, and two single-stranded arms. T4 DNA ligase joins the stem to the A-tailed fragment at both ends. Because the two arms differ, the ligated product carries the P5-side sequence on one arm and the P7-side sequence on the other. After the first PCR cycle each molecule has P5 at one end and P7 at the other, in both orientations across the population.',
      'Full-length adapters often already include the sample indexes (i7 on the P7 side, i5 on the P5 side) and, in some kits, unique molecular identifiers (UMIs). Truncated “stub” adapters instead rely on the indexing PCR to add indexes.',
      'Adapters are added in excess. Two adapters can ligate to each other, forming an adapter dimer (~120–130 bp) with no insert, which clusters very efficiently on the flow cell and produces reads that are pure adapter. Bead cleanup after ligation removes most of them; they are the first thing a TapeStation trace is checked for.',
    ],
    variants: [
      { name: 'Full-length indexed adapters (e.g. IDT for Illumina UD)', text: 'Index known at ligation; supports PCR-free libraries.' },
      { name: 'Stub adapters + indexing PCR (NEBNext, KAPA)', text: 'Index is added during amplification. Cheaper adapters; PCR is mandatory.' },
      { name: 'UMI adapters (e.g. xGen, IDT UMI, TruSeq UMI)', text: 'A random 6–12 nt tag per molecule, read as part of the index read or the first bases of R1. Enables true molecular deduplication.' },
      { name: 'Methylated adapters (bisulfite / EM-seq)', text: 'Cytosines in the adapter are protected so the adapter survives conversion.' },
    ],
    data: [
      'Every read begins with insert sequence, but reads from short inserts continue into the adapter on the opposite end. Trimming tools look for the start of the adapter sequence (for TruSeq: `AGATCGGAAGAGC`).',
      'Adapter dimers produce reads that are adapter from base 1, ~120–130 bp total molecule. Trimmers discard these as zero-length reads; many of them means ligation or cleanup went poorly.',
      'The i5/i7 sequences live in the adapter arms and are read in separate index reads; they never appear inside R1/R2 unless something is badly wrong.',
      'If UMIs are present they occupy the first bases of a read or an extra index read, and must be extracted before alignment or they become mismatches.',
    ],
    check: [
      'FastQC “Adapter Content” and the trimmer’s log: fraction of reads with adapter, fraction fully trimmed to zero.',
      'Check the first 10–20 bases of R1 for a fixed-length random-looking block; that is a UMI or inline barcode nobody told you about.',
      'The library TapeStation trace (ask for it): a peak at ~125 bp is adapter dimer.',
    ],
    ask: [
      'Which adapter set exactly (e.g. IDT for Illumina UD, NEBNext Multiplex Oligos, TruSeq CD)? Were UMIs used, and where do they sit in the reads?',
      'What adapter-to-insert molar ratio was used, and was there a post-ligation cleanup?',
    ],
    artifacts: ['adapter-readthrough', 'adapter-dimers', 'umis'],
  },

  'size-selection': {
    title: 'Bead cleanup & size selection',
    short: 'Carboxylated magnetic beads in PEG/salt bind DNA in a length-dependent way. The bead-to-sample ratio sets which fragment sizes are kept and which are thrown away.',
    inputs: 'Adapter-ligated or amplified library with leftover adapters, enzymes and short junk',
    outputs: 'Clean library within a chosen size window',
    bench: [
      'Solid-phase reversible immobilization (SPRI; AMPure XP, KAPA Pure, SPRIselect) uses polyethylene glycol and salt to crowd DNA onto carboxyl-coated magnetic beads. Longer molecules precipitate at lower PEG concentration. So the ratio of bead solution to sample volume is a size dial: roughly, 1.8× keeps almost everything above ~100 bp; 0.8× drops fragments below ~250 bp; 0.5–0.6× keeps only large fragments. The exact cut-offs depend on the bead brand and lot.',
      'A double-sided selection (for example 0.55× then 0.8×) first binds and discards the largest fragments, then binds and keeps a middle window, giving a tighter insert distribution at the cost of yield. The beads are pelleted on a magnet, washed with 80 % ethanol, dried briefly, and the DNA is eluted in a small volume. Over-drying the beads cracks them and loses DNA.',
      'Alternatives include agarose or automated gel extraction (BluePippin, PippinHT) for very tight or very large size windows.',
    ],
    variants: [
      { name: 'Single-sided SPRI (e.g. 0.8×–1.0×)', text: 'Removes adapter dimers and short fragments; keeps the upper tail. Standard post-ligation cleanup.' },
      { name: 'Double-sided SPRI', text: 'Tighter insert window; lower yield; used when overlap or insert spread matters (e.g. 16S merging, Hi-C).' },
      { name: 'Gel / Pippin selection', text: 'Precise windows, especially for long-insert or mate-pair libraries; more hands-on.' },
    ],
    data: [
      'This step, not fragmentation, decides the lower bound of your insert-size distribution. A sharp left edge in the insert-size histogram is the bead ratio.',
      'Any molecule discarded here is gone from the library. For cfDNA, ancient DNA or degraded RNA, aggressive size selection removes exactly the short molecules that carry the signal.',
      'Tight windows reduce library complexity (fewer unique molecules) and can push up duplication.',
    ],
    check: [
      'Insert-size histogram shape: a hard cutoff on the left side is bead ratio; a gentle rise is a loose selection.',
      'If short reads of biological interest are missing (e.g. miRNA, cfDNA sub-100 bp peaks), check the protocol’s cleanup ratios.',
    ],
    ask: [
      'What bead ratio(s) were used after ligation and after PCR? Single- or double-sided?',
    ],
    artifacts: ['insert-size', 'low-input'],
  },

  'pcr-amplification': {
    title: 'Library amplification (indexing PCR)',
    short: 'A few cycles of PCR make enough library to quantify and load, and may add sample indexes. Every cycle copies the same molecules, with the polymerase’s biases and errors.',
    inputs: 'Adapter-ligated fragments (nanograms or less)',
    outputs: 'Micrograms of indexed, sequencer-ready library; duplicates of every original molecule',
    bench: [
      'Primers that bind the adapter arms (and that may carry the i5 and i7 indexes plus the full P5/P7 flow-cell sequences) amplify every adapter-ligated fragment. Typical protocols use 4–12 cycles for standard input, 12–18 for low input, and 20+ for single-cell or ultra-low input. High-fidelity polymerases (KAPA HiFi, Q5, Phusion) are used to keep substitution errors around 10⁻⁶ per base per cycle.',
      'The number of distinct molecules does not increase during PCR. It is fixed by the input and the ligation efficiency. What increases is the number of copies per molecule. Copies that both end up on the flow cell are PCR duplicates: read pairs with identical start and end coordinates that carry no new information about the genome, only about the amplification.',
      'Amplification is not uniform. GC-rich and GC-poor fragments denature and prime differently and fall behind each cycle. Long fragments amplify less efficiently than short ones. Incomplete extension products can prime on a different template in the next cycle, creating chimeric molecules joined at a shared stretch of sequence.',
      'PCR-free protocols (TruSeq DNA PCR-Free, KAPA HyperPrep PCR-free) skip this step entirely by starting from ≥1 µg and using full-length indexed adapters. They have the flattest coverage and no PCR duplicates, at the cost of input requirement and harder quantification.',
    ],
    variants: [
      { name: 'Standard indexing PCR, 6–12 cycles', text: 'Most shotgun libraries. Duplication typically 2–10 %, higher with low input.' },
      { name: 'Low-input / high-cycle (15–25 cycles)', text: 'Single-cell, cfDNA, ancient DNA, VLP viromes. Duplication can exceed 50 %; GC bias pronounced.' },
      { name: 'PCR-free', text: 'No duplicates from PCR (optical and cluster duplicates remain). Uniform coverage. Input ≥ 0.5–1 µg.' },
      { name: 'UMI-aware amplification', text: 'UMIs added before PCR allow copies to be collapsed to their original molecule and errors to be corrected by consensus.' },
    ],
    data: [
      'PCR duplicates: pairs with identical outer coordinates. In WGS they inflate apparent depth and can create false variant support; in RNA-seq and amplicon data they are confounded with true high expression or abundance and should usually not be removed without UMIs.',
      'GC bias: coverage drops in high-GC and very low-GC regions. In metagenomics, high-GC and low-GC genomes are systematically under-covered, which biases abundance estimates and assembly.',
      'Polymerase errors: substitutions introduced in early cycles are propagated into many copies and appear as low-frequency variants supported by several “independent” reads. Variant callers set thresholds partly because of this.',
      'Chimeras: in-silico they look like reads whose two halves map to different loci or genomes; in amplicon data they inflate novel “species”.',
      'Jackpotting: a few molecules that amplified early dominate the library; appears as a handful of sequences at very high copy in FastQC “Overrepresented sequences”.',
    ],
    check: [
      'Picard `MarkDuplicates` or `samtools markdup` for duplication rate; Picard `EstimateLibraryComplexity` for how many unique molecules the library really has.',
      'Picard `CollectGcBiasMetrics` or a coverage-vs-GC plot per sample. Compare samples with different cycle counts.',
      'Correlate duplication rate with input mass and cycle number across the project before treating it as biology.',
      'FastQC “Sequence Duplication Levels” gives a quick read-level view; interpret it per library type (RNA-seq is naturally high).',
    ],
    ask: [
      'How many PCR cycles, per sample? Was the same number used for all?',
      'Which polymerase? Was the library PCR-free? Were UMIs included?',
    ],
    artifacts: ['duplicates', 'gc-bias', 'chimeras', 'polymerase-errors', 'low-input'],
  },

  'library-qc': {
    title: 'Library QC & quantification',
    short: 'The finished library is sized on a trace and quantified by qPCR or fluorometry. Molarity, not mass, decides how much goes on the flow cell.',
    inputs: 'Amplified or PCR-free library',
    outputs: 'Average fragment size, molar concentration, a pass/fail decision',
    bench: [
      'A TapeStation or Bioanalyzer trace shows the library’s size distribution: one broad peak at the expected size (insert + ~120–140 bp of adapter) is good. A sharp peak around 120–130 bp is adapter dimer; a hump at roughly twice the main peak is “bubble product” (heteroduplexes formed when PCR runs out of primer, harmless for sequencing but misleading for sizing).',
      'Concentration is measured by qPCR with primers against P5/P7 (counts only molecules that can cluster), or by Qubit (counts all dsDNA). Molarity is computed from concentration and average size: nM = (ng/µL × 10⁶) / (660 × bp). Libraries are then diluted to a common molarity for pooling. A mis-sized or mis-quantified library is simply over- or under-represented in the pool.',
    ],
    variants: [
      { name: 'qPCR (KAPA Library Quant)', text: 'Gold standard for loading; only counts adapter-flanked molecules.' },
      { name: 'Qubit + TapeStation', text: 'Faster, slightly overestimates clusterable molecules; adequate for routine pools.' },
    ],
    data: [
      'Mis-quantified libraries show up as uneven read counts per sample after demultiplexing, by factors of 2–10, with no biological reason.',
      'A library that passed QC with a dimer peak will contribute a chunk of empty reads to the whole lane, because dimers cluster better than real inserts.',
    ],
    check: [
      'Compare reads per sample to the pooling plan; samples far below target often had QC issues upstream.',
      'Ask for the trace images; they are usually saved and are the most informative QC artefact you can get.',
    ],
    ask: [
      'Can I see the TapeStation/Bioanalyzer traces? What were the average sizes and molarities per library?',
    ],
    artifacts: ['uneven-depth', 'adapter-dimers'],
  },

  pooling: {
    title: 'Pooling & normalization',
    short: 'Libraries from many samples are mixed at equal molarity into one pool so they can share a lane. The index pairs chosen here determine how well you can demultiplex.',
    inputs: 'Individually indexed libraries',
    outputs: 'One pooled library at a known molarity, plus a sample sheet',
    bench: [
      'Each library is diluted to the same molarity (e.g. 4 nM or 2 nM) and combined. Pipetting error, mis-quantification and differences in cluster efficiency mean the output is never perfectly even; a 2-fold spread is normal and a 5–10-fold spread happens. Some facilities sequence a shallow “QC run”, re-balance, and then sequence deep.',
      'Index design matters: unique dual indexes (UDIs) give every sample its own i7 and its own i5, so a read whose indexes do not match any planned pair can be recognized as index hopping and discarded. Combinatorial dual indexing (i7 and i5 re-used across samples) cannot detect hopping; those reads silently land in the wrong sample. Indexes are also chosen to be colour-balanced so the first cycles of the index read have signal in every channel.',
      'Low-diversity libraries (16S amplicons, bisulfite, some CRISPR screens) are spiked with 1–20 % PhiX control library so the base-calling software can estimate cluster positions and colour matrices.',
    ],
    variants: [
      { name: 'Unique dual indexing (UDI)', text: 'Hopping detectable and removable; standard now on patterned flow cells.' },
      { name: 'Combinatorial dual indexing (CDI)', text: 'Cheaper index sets. Hopped reads are mis-assigned, typically 0.1–2 % on patterned flow cells.' },
      { name: 'Single indexing', text: 'Legacy. No hopping detection; fewer samples per lane.' },
    ],
    data: [
      'Reads per sample vary; low-depth outliers may need re-sequencing or exclusion. Depth differences propagate into rarefaction, detection limits and variance.',
      'Index hopping moves ~0.1–2 % of reads between samples that shared a lane. In a high-depth sample next to a low-biomass one, that is enough to create false low-abundance taxa or “expression” of genes that are not there.',
      'PhiX reads appear in the “Undetermined” FASTQ (if not indexed) and sometimes in samples; filter against the PhiX genome before assembly.',
      'The sample sheet is the only link between index pairs and sample names. Sample swaps happen here.',
    ],
    check: [
      'Reads per sample from the demultiplexing report; the size of the Undetermined fraction and its top index pairs.',
      'With UDIs: how many reads were discarded as unexpected index pairs? That rate is your hopping rate.',
      'Sex markers, SNP fingerprints or known positive controls to catch sample swaps.',
    ],
    ask: [
      'Which index set, and are they unique dual? Which samples shared a lane? Was PhiX spiked in, and at what fraction?',
      'Can I have the sample sheet and the demultiplexing stats?',
    ],
    artifacts: ['uneven-depth', 'index-hopping', 'phix', 'sample-swaps'],
  },

  'cluster-generation': {
    title: 'Flow cell loading & cluster generation',
    short: 'Single library molecules are captured on the flow cell surface and amplified in place into clusters of ~1000 identical copies. Loading concentration decides data quality.',
    inputs: 'Denatured, diluted pooled library',
    outputs: 'Millions to billions of clonal clusters, each from one molecule',
    bench: [
      'The pool is denatured to single strands (NaOH or heat) and diluted to a loading concentration (e.g. 10–20 pM on MiSeq, ~1.8 pM on NextSeq 500/550, 150–400 pM on NovaSeq 6000; the numbers are not comparable between instruments because the loading volumes differ). The flow cell surface is coated with oligos complementary to P5 and P7. Each library strand hybridizes to one oligo and is copied; the copy is then amplified locally into a cluster.',
      'On older, non-patterned flow cells (MiSeq, HiSeq 2500) clusters grow by bridge amplification at random positions: too high a concentration and clusters overlap and cannot be resolved (“overclustering”, low % passing filter). On patterned flow cells (NovaSeq, NextSeq 2000, HiSeq X/4000) clusters grow inside fixed nanowells by exclusion amplification (ExAmp): overloading causes two molecules to land in one well (polyclonal wells, filtered out), underloading leaves wells empty (lost yield). Patterned flow cells also allow the same molecule to seed a neighbouring well (“pad hopping”) and let free adapters or primers mis-prime and swap indexes between molecules (index hopping), which is why unique dual indexes exist.',
      'After amplification, one strand of each cluster is cleaved and washed away so that every cluster is single-stranded and in the same orientation, ready for the Read 1 primer.',
    ],
    variants: [
      { name: 'Bridge amplification, random clusters (MiSeq, HiSeq 2500)', text: 'Density-sensitive; quality falls when overloaded. Essentially no index hopping.' },
      { name: 'ExAmp, patterned nanowells (NovaSeq, NextSeq 1000/2000, HiSeq X)', text: 'Fixed density, high output; index hopping and pad-hopping duplicates at 0.1–2 %.' },
    ],
    data: [
      'Overclustering: lower % PF (passing filter), lower quality, more mixed clusters, more reads with many N’s.',
      'Cluster duplicates: on patterned flow cells, the same molecule seeding adjacent wells produces “optical” duplicates with near-identical coordinates in the read header; Picard separates these from PCR duplicates using tile and x/y.',
      'Index hopping originates here, not at pooling, but its visibility depends on the index design chosen at pooling.',
      'Flow-cell-specific artefacts: tile edges, bubbles and oil smears produce localized bad quality that appears as per-tile quality drops in FastQC.',
    ],
    check: [
      'Run summary from the facility: cluster density or % occupancy, % PF, % ≥ Q30 by read.',
      'FastQC “Per tile sequence quality”: blue is fine, hot tiles indicate a physical flow-cell problem.',
      'Picard `MarkDuplicates` with `OPTICAL_DUPLICATE_PIXEL_DISTANCE=2500` for patterned flow cells to separate optical from PCR duplicates.',
    ],
    ask: [
      'Which instrument and flow-cell type? What was the loading concentration, % occupancy / cluster density and % PF?',
    ],
    artifacts: ['optical-duplicates', 'index-hopping', 'overclustering', 'tile-artefacts'],
  },

  sbs: {
    title: 'Sequencing by synthesis',
    short: 'One fluorescent, blocked nucleotide is added per cycle to every cluster, imaged, unblocked, repeated. Read 1, the index reads and Read 2 are separate primers on the same clusters.',
    inputs: 'Single-stranded clusters',
    outputs: 'A stack of images per cycle, one base per cycle per cluster',
    bench: [
      'A sequencing primer binds the adapter next to the insert. Each cycle, the polymerase incorporates one reversibly terminated nucleotide carrying a fluorophore. The flow cell is imaged, the terminator and fluorophore are cleaved, and the next cycle begins. 151 cycles give a 150 bp read (plus one). On four-colour systems (MiSeq, HiSeq) each base has its own dye; on two-colour systems (NextSeq, NovaSeq) G is dark: a cluster emitting nothing is called G. That is why reads that run off the end of a molecule, or dead clusters, become strings of G on two-colour instruments and strings of N or random bases on four-colour ones.',
      'Within a cluster not every strand keeps perfect step. A few fall one base behind (phasing) or jump one ahead (pre-phasing) each cycle. The population drifts out of sync, the signal purity falls, and quality scores decline toward the 3′ end of every read. This is intrinsic to the chemistry, not a sample problem.',
      'The run proceeds as Read 1 → Index 1 (i7, 8–10 cycles) → Index 2 (i5) → Read 2. For Read 2 the clusters are re-synthesized on the flow cell (“turnaround”) and the complementary strand is primed, so Read 2 sees the molecule from the other end and is typically slightly lower quality. The orientation of the i5 read differs between instruments (forward strand on MiSeq, HiSeq 2500 and NovaSeq 6000 with v1.0 reagents; reverse complement on NextSeq, MiniSeq, HiSeq 3000/4000/X, NovaSeq 6000 v1.5 and NovaSeq X), which is why sample sheets have an i5 orientation setting.',
    ],
    variants: [
      { name: 'Four-colour SBS (MiSeq, HiSeq 2500)', text: 'Dead clusters read as N or low-quality noise; no poly-G problem.' },
      { name: 'Two-colour SBS (NextSeq 500/2000, NovaSeq 6000/X, MiniSeq)', text: 'No-signal = G. Poly-G tails on reads shorter than the read length and on empty wells. Trim with fastp `--trim_poly_g`.' },
      { name: 'Element AVITI, Ultima, MGI DNBSEQ', text: 'Different chemistries (avidity, rolling-circle nanoballs); headers, error profiles and quality binning differ.' },
    ],
    data: [
      'Quality decays toward the 3′ end of every read, Read 2 more than Read 1; base substitution errors concentrate there.',
      'Poly-G tails on two-colour instruments. They are not biology; trim them before adapter detection or assembly.',
      'Reads are the length of the run, not of the molecule: a 100 bp insert sequenced at 2×150 gives 100 bp of insert, then adapter, then poly-G/noise.',
      'Strand of origin is random for DNA libraries; Read 1 and Read 2 point toward each other (FR orientation). For stranded RNA-seq libraries, which read matches the transcript is set by the chemistry, not the sequencer.',
      'Low-diversity positions (amplicon primers, inline barcodes) hurt base calling in the first ~25 cycles because the software calibrates there; PhiX spike-in mitigates.',
    ],
    check: [
      'FastQC “Per base sequence quality” for the 3′ decay and for any cycle-specific dips (a bubble or a reagent problem on one cycle hits every read at the same position).',
      'FastQC “Per base sequence content”: a jump to 100 % G at the end means poly-G.',
      'Read-length distribution after trimming tells you how often you ran off the molecule.',
    ],
    ask: [
      'Instrument model, read configuration (e.g. 2×151, 10+10 indexes) and chemistry version?',
    ],
    artifacts: ['quality-decay', 'poly-g', 'adapter-readthrough', 'phasing'],
  },

  basecalling: {
    title: 'Base calling & quality scores',
    short: 'Software turns images into bases and Phred quality scores. Modern instruments bin Q scores into a handful of values, so the Q column is coarser than it looks.',
    inputs: 'Images / intensities per cycle',
    outputs: 'Base calls with quality scores per cluster (BCL / CBCL files)',
    bench: [
      'Real-Time Analysis (RTA) software locates clusters, extracts intensities in each channel, corrects for crosstalk and phasing, and calls a base per cycle with an estimated error probability expressed as a Phred score (Q = −10·log₁₀ P). Q30 means 1 error in 1000. Clusters whose first 25 cycles are not “pure” enough (chastity filter) are flagged as not passing filter and dropped from the FASTQ.',
      'Since HiSeq X/4000 and on all NovaSeq and NextSeq 2000 runs, qualities are binned to a few values. Delivered NovaSeq 6000 and NextSeq 2000 FASTQs contain four quality characters, `#`, `,`, `:`, `F`, which decode to Q2, Q11, Q25, Q37 (early RTA3 documentation lists the bins as 2, 12, 23, 37; the characters in the files are what matter). Older MiSeq data have ~40 distinct values. Tools that model quality distributions, or that threshold at Q20/Q30, see a step function rather than a curve.',
      'The BCL files are converted to FASTQ by bcl2fastq or BCL Convert, which also performs demultiplexing (next step).',
    ],
    variants: [
      { name: 'Full-resolution Q scores (MiSeq, HiSeq 2500)', text: 'Values 2–41; tools calibrated on these.' },
      { name: 'Binned Q scores (NovaSeq, NextSeq 2000, HiSeq X)', text: 'Four to eight values. Base-quality recalibration (GATK BQSR) behaves differently; some error models expect a continuum.' },
      { name: 'Q-score binning can be turned off', text: 'Only on some platforms and at the facility’s discretion; files are much larger.' },
    ],
    data: [
      'A FASTQ quality string with only a few distinct characters (e.g. `F`, `:`, `,`, `#`) is binned NovaSeq output, not a corrupt file.',
      'Q scores are calibrated on average, not per read; an isolated Q37 base can still be wrong, especially at homopolymers or after a low-quality run of cycles.',
      '% ≥ Q30 is a run metric, not a per-sample one; a sample can be fine on a mediocre run and vice versa.',
      'Reads that fail the chastity filter are already gone from your FASTQ (flag `:Y:` in the header is rare in delivered files).',
    ],
    check: [
      'Count distinct quality characters in a few thousand reads: `awk` or `seqkit fx2tab -q`. Four to eight values means binned.',
      'The run’s `RunInfo.xml` / `RunParameters.xml` (ask for them) record instrument, chemistry and RTA version.',
    ],
    ask: [
      'RTA / BCL Convert version, and whether quality binning was on?',
    ],
    artifacts: ['q-binning', 'quality-decay'],
  },

  demultiplexing: {
    title: 'Demultiplexing → FASTQ',
    short: 'Index reads are matched to the sample sheet and each cluster’s reads are written to the right sample’s FASTQ. This is where the file you received was born.',
    inputs: 'Base calls + sample sheet',
    outputs: 'Per-sample FASTQ files (R1, R2, sometimes I1/I2), an Undetermined file and a demux report',
    bench: [
      'bcl2fastq or BCL Convert reads the index cycles for each cluster, compares them to the sample sheet (allowing by default one mismatch per index), and writes Read 1 and Read 2 to that sample’s files. Clusters whose indexes match no sample go to `Undetermined_S0`. Reads may be split by lane (`L001`, `L002` …) or merged, depending on the facility’s settings. Adapter trimming is sometimes applied here too, which is why some delivered FASTQs already contain variable-length reads.',
      'The FASTQ header records where each read came from. For Illumina: `@<instrument>:<run>:<flowcell>:<lane>:<tile>:<x>:<y> <read>:<is filtered>:<control>:<index sequence>`. The index field is the observed index, which lets you audit demultiplexing after the fact. Some pipelines add UMI sequences into the header as well. Qualities are Phred+33 (ASCII 33–74) on all modern data.',
    ],
    variants: [
      { name: 'bcl2fastq (legacy)', text: 'Default 1 mismatch per index; optional adapter masking/trimming; may add `:N:0:INDEX` to headers.' },
      { name: 'BCL Convert (current)', text: 'Supports index-hopping filtering with UDIs, UMI extraction, and reports in `Demultiplex_Stats.csv`.' },
      { name: 'Facility custom trimming', text: 'Some facilities deliver adapter- and quality-trimmed FASTQs; the reads then vary in length and should not be trimmed again blindly.' },
    ],
    data: [
      'The files you receive are already a filtered subset: chastity-failed clusters are gone, undetermined reads are gone, and sometimes adapters are gone.',
      'Allowing index mismatches rescues reads with a sequencing error in the index but also lets some hopped reads through; the index sequence in the header lets you re-check.',
      'Multiple files per sample (lanes, or re-runs) are often concatenated by the analyst; the header keeps the lane and flow cell so read-group information can be recovered for duplicate marking.',
      'Read names in R1 and R2 match line by line; files that have been filtered independently (or truncated in transfer) break pairing and most aligners.',
    ],
    check: [
      'Verify the delivered files: `md5sum` against the facility’s list; equal read counts in R1 and R2 (`seqkit stats`).',
      'Inspect the first header to learn instrument, flow cell, lane and observed index; check that the index matches the sample sheet.',
      'Ask for `Demultiplex_Stats` / the HTML report: reads per sample, % of lane, mismatch counts, top undetermined indexes.',
    ],
    ask: [
      'How many index mismatches were allowed? Were adapters or low-quality bases trimmed before delivery? Were lanes merged?',
      'Can I have the sample sheet and the demultiplexing report?',
    ],
    artifacts: ['index-hopping', 'undetermined', 'sample-swaps', 'uneven-depth'],
  },

  // ───────────────────────── RNA ─────────────────────────
  'rna-extraction': {
    title: 'RNA extraction & DNase treatment',
    short: 'RNA is purified in a RNase-free environment and residual genomic DNA is digested. Leftover gDNA becomes intronic and intergenic “expression”.',
    inputs: 'Stabilized sample',
    outputs: 'Total RNA, mostly ribosomal RNA by mass',
    bench: [
      'RNA is far less stable than DNA: RNases are everywhere and tissue autolysis starts within minutes. Samples are kept in RNAlater, TRIzol or liquid nitrogen until lysis in a guanidinium buffer that denatures RNases. RNA is then purified on a column or by phenol–chloroform (TRIzol) phase separation. Total RNA is ~80–90 % ribosomal RNA, a few percent tRNA, and only 1–5 % mRNA.',
      'Columns do not fully exclude genomic DNA, so an on-column or in-solution DNase I digestion is standard. Without it, gDNA carries through into the library and is sequenced as if it were RNA.',
    ],
    variants: [
      { name: 'Column kits (RNeasy, Direct-zol)', text: 'Fast, clean; often lose small RNAs < 200 nt unless a small-RNA protocol is used.' },
      { name: 'TRIzol / phenol-based', text: 'Higher yield including small RNAs; phenol carry-over inhibits enzymes if washing is sloppy.' },
      { name: 'Dual DNA/RNA extraction (AllPrep)', text: 'Both molecules from the same lysate; useful for metatranscriptomics paired with metagenomics.' },
    ],
    data: [
      'gDNA contamination: reads spread evenly across introns and intergenic regions, unstranded even in a stranded library (half map to each strand). Intronic read fraction above ~20–30 % in a poly(A) library is a warning.',
      'In metatranscriptomics, gDNA contamination looks like a flat background of “expression” across every gene in abundant genomes.',
      'rRNA dominates unless removed in the next step; rRNA reads are a measure of depletion efficiency, not of biology.',
    ],
    check: [
      'Fraction of reads in exons vs introns vs intergenic (RSeQC `read_distribution.py`, Qualimap rnaseq).',
      'Strand specificity statistic (RSeQC `infer_experiment.py`): a stranded library with a low fraction is gDNA-contaminated or mislabelled.',
    ],
    ask: [
      'Was a DNase step performed? Which extraction kit? How were samples stabilized before extraction?',
    ],
    artifacts: ['gdna-contamination', 'degradation', 'rrna-reads'],
  },

  'rna-qc': {
    title: 'RNA integrity (RIN)',
    short: 'A capillary trace of the 18S and 28S (or 16S and 23S) rRNA peaks scores how intact the RNA is. Degraded RNA leads to 3′ bias and shorter inserts.',
    inputs: 'Total RNA',
    outputs: 'RIN or RQN score (1–10), concentration',
    bench: [
      'On a Bioanalyzer or TapeStation, intact eukaryotic total RNA shows two sharp peaks (18S and 28S) with a 28S:18S ratio near 2. As RNA degrades, the peaks shrink and a smear of short fragments grows. The RNA Integrity Number (RIN) summarizes the trace: 10 is intact, below ~7 is “degraded” for poly(A) selection, below ~4 is suitable only for rRNA-depletion or 3′-counting protocols. Bacterial RNA shows 16S and 23S peaks; mixed-community RNA shows all four plus noise.',
      'DV200 (percentage of fragments > 200 nt) is used instead of RIN for FFPE and other heavily degraded samples.',
    ],
    variants: [
      { name: 'RIN (Agilent)', text: 'Standard for fresh/frozen eukaryotic RNA.' },
      { name: 'DV200', text: 'For FFPE; predicts library success better than RIN when everything is fragmented.' },
    ],
    data: [
      'Low RIN with poly(A) selection: strong 3′ bias in gene body coverage, because only fragments still attached to the poly(A) tail are captured. Long genes lose their 5′ ends; isoform and TSS analyses suffer.',
      'Low RIN with rRNA depletion: coverage stays more even, but intronic fraction rises and inserts are shorter.',
      'RIN differences between groups (e.g. tumour vs normal, or two collection sites) create expression differences in long vs short genes that look like biology.',
    ],
    check: [
      'Gene-body coverage plot (RSeQC `geneBody_coverage.py`, Picard `CollectRnaSeqMetrics` 5′/3′ bias).',
      'Include RIN as a covariate in differential expression if it differs between groups.',
    ],
    ask: [
      'RIN or DV200 per sample? Was a RIN threshold applied, and which protocol was chosen because of it?',
    ],
    artifacts: ['three-prime-bias', 'degradation', 'batch-effects'],
  },

  'rrna-depletion': {
    title: 'rRNA depletion or poly(A) selection',
    short: 'Ribosomal RNA is removed, either by pulling down polyadenylated mRNA or by hybridizing and digesting rRNA. The choice decides which RNA species you can see.',
    inputs: 'Total RNA',
    outputs: 'rRNA-reduced RNA: mRNA only (poly(A)) or mRNA + ncRNA + pre-mRNA (depletion)',
    bench: [
      'Poly(A) selection uses oligo(dT) beads to capture mature eukaryotic mRNA by its poly(A) tail. Everything without a tail (rRNA, most lncRNA, histone mRNAs, bacterial RNA, degraded fragments without their 3′ end) is washed away. It is clean and cheap and gives mostly exonic reads.',
      'rRNA depletion (Ribo-Zero Plus, NEBNext rRNA Depletion, RiboCop, riboPOOL) hybridizes species-specific DNA probes to rRNA and removes the hybrids with beads or RNase H. It keeps non-polyadenylated RNA and works on degraded or bacterial RNA, at the price of more intronic and intergenic reads and residual rRNA (typically 1–10 %, worse for organisms the probes were not designed for).',
      'In metatranscriptomics, probe sets rarely match every community member, so rRNA remains a large and taxon-biased fraction of reads.',
    ],
    variants: [
      { name: 'Poly(A) selection', text: 'Eukaryotic mRNA; needs RIN ≳ 7; 3′ bias with degradation; no bacteria, no ncRNA.' },
      { name: 'rRNA depletion (probe-based)', text: 'Degraded, FFPE, bacterial, total RNA. More intronic reads; residual rRNA varies with organism.' },
      { name: 'Enzymatic / 5′-phosphate dependent (Terminator exonuclease)', text: 'Older bacterial approach; incomplete.' },
      { name: 'None (total RNA)', text: 'Rare for sequencing; rRNA will be 80–95 % of reads.' },
    ],
    data: [
      'Poly(A): exonic reads ~70–90 %, few intronic reads, no rRNA. Non-polyadenylated transcripts are absent, not lowly expressed.',
      'Depletion: intronic reads 20–40 % (pre-mRNA), lncRNA present, 1–10 % rRNA remaining; residual rRNA competes for depth and varies per sample.',
      'Depletion and poly(A) libraries are not directly comparable; gene-length and 3′ bias differ.',
      'Metatranscriptomics: rRNA reads must be filtered computationally (SortMeRNA, RiboDetector) and their fraction treated as a technical covariate.',
    ],
    check: [
      'rRNA fraction (SortMeRNA, or align to rRNA references); intronic/exonic/intergenic split (RSeQC, Qualimap).',
      'If “expression” of histone genes or many lncRNAs is zero, the library was poly(A) selected.',
    ],
    ask: [
      'Poly(A) or depletion? Which depletion kit, and was it designed for this organism or community?',
    ],
    artifacts: ['rrna-reads', 'three-prime-bias', 'intronic-reads'],
  },

  'rna-fragmentation': {
    title: 'RNA fragmentation',
    short: 'RNA is cut into ~150–300 nt pieces with heat and magnesium so that each fragment can be converted to a sequenceable insert.',
    inputs: 'Enriched RNA',
    outputs: 'Short RNA fragments',
    bench: [
      'Divalent cations (Mg²⁺ or Zn²⁺) and heat (94 °C for 2–15 min) hydrolyse the RNA backbone at roughly random positions. The time sets the fragment size: longer incubation, shorter fragments. Because this happens before reverse transcription, every part of a transcript has a chance to be captured, unlike protocols that fragment cDNA after priming from the 3′ end.',
      'Some protocols (e.g. SMARTer Stranded, Takara Pico) fragment chemically before RT; others (3′ counting kits like QuantSeq, 10x) deliberately do not fragment and capture only the 3′ end.',
    ],
    variants: [
      { name: 'Heat + Mg²⁺ (TruSeq, NEBNext)', text: 'Standard; fragments ~200 nt; random but with a mild preference at certain sequences.' },
      { name: 'No fragmentation, 3′ end only (QuantSeq, 10x, Drop-seq)', text: 'One read per transcript near the poly(A) tail; no isoform information; counting rather than coverage.' },
      { name: 'Enzymatic (RNase III)', text: 'Older; leaves 5′ phosphate / 3′ OH suitable for direct ligation (small-RNA protocols).' },
    ],
    data: [
      'Gene-body coverage is roughly uniform for intact RNA; its unevenness is mostly priming bias from the next step, not fragmentation.',
      'Fragment size here plus bead cleanup sets the insert size; RNA-seq inserts are typically 150–250 bp, so 2×150 reads overlap heavily and 2×75 or 2×100 is often enough.',
      '3′-counting protocols produce reads piling up within ~500 nt of the poly(A) tail; aligning them to a full transcriptome and quantifying with length-normalized TPM is wrong.',
    ],
    check: [
      'Insert-size distribution after alignment; gene-body coverage plot.',
      'If coverage is confined to 3′ UTRs, you have a 3′ counting library: use the matching quantification.',
    ],
    ask: [
      'Fragmentation time/temperature or target insert size? Is this a full-length or a 3′-end protocol?',
    ],
    artifacts: ['insert-size', 'three-prime-bias'],
  },

  'reverse-transcription': {
    title: 'First-strand cDNA synthesis',
    short: 'Reverse transcriptase copies each RNA fragment into DNA, primed by random hexamers. Priming bias shapes coverage within transcripts.',
    inputs: 'RNA fragments',
    outputs: 'RNA:cDNA hybrids (first strand only)',
    bench: [
      'Short random hexamer primers anneal to the RNA fragments and a reverse transcriptase (SuperScript, Maxima, ProtoScript) extends them with dNTPs, producing a DNA strand complementary to the RNA. Random hexamers do not bind uniformly: some sequences are favoured, which produces a characteristic skew in base composition over the first ~12 bases of Read 1 and a reproducible pattern of coverage peaks and valleys within every transcript.',
      'Reverse transcriptases have template-switching and strand-displacement activities that can create antisense artefacts (spurious second-strand synthesis) in unstranded protocols, and they terminate at strong secondary structures and modified bases.',
      'Template-switching protocols (SMART, used in SMART-seq and 10x) instead rely on the RT adding a few non-templated Cs at the end of the first strand, to which a template-switch oligo anneals; this is how low-input and single-cell methods add an adapter to the 5′ end without ligation.',
    ],
    variants: [
      { name: 'Random hexamer priming (TruSeq, NEBNext)', text: 'Standard for fragmented RNA; sequence-specific priming bias at read starts.' },
      { name: 'Oligo(dT) priming (3′ kits, 10x, Smart-seq)', text: 'Starts every cDNA at the poly(A) tail; internal poly(A) stretches also prime.' },
      { name: 'Template switching (SMART-seq2/3, 10x)', text: 'Adds a 5′ adapter without ligation; TSO sequence appears at read starts and should be trimmed.' },
    ],
    data: [
      'The first ~10–12 bases of Read 1 have a biased base composition; FastQC “Per base sequence content” fails on nearly every RNA-seq library. This is expected and should not be trimmed away.',
      'Coverage within a transcript is bumpy and reproducible across samples; this is priming and fragmentation bias, not alternative splicing.',
      'Reverse transcriptase errors (~10⁻⁴) are higher than polymerase errors and set the noise floor for RNA variant calling and allele-specific expression.',
    ],
    check: [
      'FastQC “Per base sequence content” pattern at read start: expected, do not “fix”.',
      'Gene-body coverage reproducibility across samples.',
    ],
    ask: [
      'Which RT enzyme and priming strategy? Is there a template-switch oligo whose sequence I should trim?',
    ],
    artifacts: ['end-bias', 'three-prime-bias'],
  },

  'second-strand': {
    title: 'Second-strand synthesis (strand-specific)',
    short: 'The RNA is replaced by a second DNA strand made with dUTP instead of dTTP. That marked strand is later destroyed, so only the strand matching the original RNA’s orientation survives.',
    inputs: 'RNA:cDNA hybrids',
    outputs: 'Double-stranded cDNA with a uracil-marked second strand',
    bench: [
      'RNase H nicks the RNA in the hybrid; DNA polymerase I uses the RNA pieces as primers to synthesize the second DNA strand, replacing them. In the dUTP method the nucleotide mix contains dUTP instead of dTTP, so the second strand (which has the same sequence as the original RNA) is full of uracils. End repair, A-tailing and adapter ligation follow as for DNA. Before PCR, uracil-DNA glycosylase (USER enzyme) destroys the dU-containing strand, so only the first-strand cDNA (antisense to the RNA) is amplified.',
      'The consequence, which trips up most people the first time: in a dUTP-stranded library Read 1 is the reverse complement of the transcript and Read 2 matches the transcript. HTSeq/featureCounts call this “reverse” / `-s 2`; Salmon infers it as `ISR`; TopHat/StringTie call it `fr-firststrand`. Illumina Stranded mRNA / Total RNA and KAPA Stranded use the same dUTP chemistry (Read 1 antisense). Template-switching kits (SMARTer Stranded, SMART-seq) and some 3′ kits can be the opposite orientation (`fr-secondstrand`, `ISF`, `-s 1`).',
    ],
    variants: [
      { name: 'dUTP second strand (TruSeq Stranded, NEBNext Ultra II Directional, KAPA Stranded)', text: 'Read 1 antisense to transcript. featureCounts `-s 2`, Salmon `ISR` / `SR`.' },
      { name: 'Ligation-based / SMART (SMARTer Stranded Pico, SMART-seq)', text: 'Orientation depends on kit; check with RSeQC `infer_experiment.py`.' },
      { name: 'Unstranded (older TruSeq, many single-cell)', text: 'Reads from both strands; antisense transcription and overlapping genes cannot be resolved; `-s 0`, `IU`.' },
    ],
    data: [
      'Strand setting in quantification. Getting it wrong silently halves or zeroes counts for overlapping genes and flips antisense transcripts; in a well-annotated genome, the symptom is a large fraction of reads assigned to “no feature” or ambiguous.',
      'Residual unstrandedness of 1–5 % is normal (incomplete USER digestion, gDNA); above ~10 % suggests gDNA contamination or a mislabelled kit.',
      'dUTP libraries have slightly lower complexity (half the strands are destroyed before PCR), so more cycles and more duplicates than an unstranded prep of the same input.',
    ],
    check: [
      'RSeQC `infer_experiment.py` or Salmon’s automatic library-type detection (`-l A`) on a subsample before setting strand parameters.',
      'Antisense read fraction over highly expressed genes as a gDNA/strandedness diagnostic.',
    ],
    ask: [
      'Is the library stranded, and by which method? (The kit name is enough to determine orientation.)',
    ],
    artifacts: ['strandedness', 'gdna-contamination', 'duplicates'],
  },

  // ───────────────────────── Amplicon ─────────────────────────
  'amplicon-pcr': {
    title: 'Target-specific PCR (e.g. 16S V4)',
    short: 'Primers flanking a marker region amplify it from every template in the sample. Primer mismatch, cycle number and chimera formation define what you can see.',
    inputs: 'Extracted DNA',
    outputs: 'Amplicons of a defined region, often with overhang sequences for the next PCR',
    bench: [
      'A primer pair (for bacterial 16S rRNA: 515F/806R for V4, 341F/785R for V3–V4; ITS1F/ITS2 for fungi; 18S V9 for eukaryotes) anneals to conserved flanks and amplifies the variable region between them for 25–35 cycles. The primers are degenerate at some positions to match more taxa, but no primer pair matches everything: well-known gaps include some Archaea, SAR11, Verrucomicrobia and Bifidobacterium with older 16S primers, and a one-base mismatch near the 3′ end can drop a taxon 10–100-fold.',
      'Amplification efficiency differs between templates (GC content, secondary structure, length), and in late cycles, when primers are depleted, incomplete products anneal to other templates and are extended into chimeras: sequences whose two halves come from two different organisms. Chimera rates of 5–30 % of unique sequences before filtering are typical for 30+ cycles.',
      'In two-step protocols the primers carry 5′ overhangs (Illumina’s Nextera-style or custom linker sequences) that the second PCR will use to attach indexes and P5/P7. In one-step protocols, long fusion primers carry everything at once. Some designs add 0–7 nt phasing spacers (“heterogeneity spacers”) between the overhang and the primer, so that the conserved primer sequence does not land on the same cycle in every cluster.',
      'Different copy numbers of the 16S gene per genome (1–15) mean amplicon read counts are not cell counts even with perfect amplification.',
    ],
    variants: [
      { name: '16S V4 (515F/806R, EMP)', text: '~253 bp amplicon, reads merge easily at 2×150 or 2×250; good universal coverage after the 2015 primer updates.' },
      { name: '16S V3–V4 (341F/785R)', text: '~460 bp amplicon, needs 2×250 or 2×300 for merging; better resolution, more primer bias.' },
      { name: 'ITS (fungi), 18S (eukaryotes), rpoB / gyrB (higher resolution)', text: 'Variable amplicon lengths; ITS length varies by taxon so merging rates differ by taxon.' },
      { name: 'Full-length 16S (PacBio / Nanopore)', text: '~1500 bp, species-level resolution; different error profile; see long-read tracks.' },
    ],
    data: [
      'Reads start with the primer sequence (unless the facility used custom sequencing primers that skip it). Primers must be removed before denoising (cutadapt, DADA2 `trimLeft` or `removePrimers`), and their length tells you whether spacers were used.',
      'Chimeras: inflate richness with sequences that match no database at full length. Remove with DADA2 `removeBimeraDenovo`, UCHIME or VSEARCH before anything else.',
      'Low diversity in the first cycles hurts base calling on Illumina; libraries are spiked with PhiX and sometimes run at lower density. Quality is often lower than for shotgun data on the same instrument.',
      'Primer bias and copy-number variation make relative abundances semi-quantitative; absence of a taxon can be primer mismatch.',
      'Amplicon length vs read length sets whether R1 and R2 overlap enough to merge (≥ 12–20 bp overlap for DADA2); with V3–V4 at 2×250 the overlap is small and 3′ quality decay matters.',
    ],
    check: [
      'Look at the first 20 bases of a few reads: do they match the primer? Is there a variable-length spacer before it?',
      'Chimera fraction reported by the denoiser; fraction of reads lost at merging.',
      'Run a mock community (ZymoBIOMICS, ATCC) through the same pipeline to quantify primer bias.',
    ],
    ask: [
      'Primer pair and exact sequences, cycle number, polymerase, one- or two-step protocol, and whether spacers were used?',
      'Were PCR negatives and a mock community included?',
    ],
    artifacts: ['primer-bias', 'chimeras', 'primers-in-reads', 'low-diversity'],
  },

  'index-pcr': {
    title: 'Indexing PCR (second-stage)',
    short: 'A short second PCR attaches sample indexes and the P5/P7 sequences to the amplicon overhangs. Each sample gets its own index pair.',
    inputs: 'Cleaned first-round amplicons with overhangs',
    outputs: 'Indexed, sequencer-ready amplicon libraries',
    bench: [
      'After a bead cleanup to remove first-round primers, each sample is amplified for 8 cycles with a pair of index primers (e.g. Nextera XT Index Kit v2, or custom dual-index primers) whose 3′ ends match the overhangs and whose 5′ ends carry i7/i5 indexes and P7/P5. Because every sample gets a different primer pair from a plate, cross-contamination between wells and primer carry-over are the main risks.',
      'Final amplicon length = region + both primers + both overhangs + both index/adapter sequences, typically 380–600 bp. A second bead cleanup removes primer dimers before quantification and pooling.',
    ],
    variants: [
      { name: 'Two-step with Nextera-style overhangs (Illumina 16S protocol)', text: 'Flexible; any region can be indexed with the same index kit.' },
      { name: 'One-step fusion primers (EMP protocol, Caporaso/Kozich)', text: 'Long primers with index built in; needs custom sequencing primers on the run; fewer cycles overall.' },
    ],
    data: [
      'Index cross-talk: 0.01–0.1 % of reads of one sample appear in another from primer contamination or index hopping; with high-depth samples this creates spurious low-abundance ASVs in negatives.',
      'Total cycle number (first + second PCR) sets chimera and duplicate load; 35 + 8 cycles is common and is why amplicon data are not deduplicated.',
    ],
    check: [
      'Negative controls (extraction blanks, PCR blanks) sequenced with the batch: their read counts and ASVs calibrate the cross-talk floor.',
    ],
    ask: [
      'Which index kit/primers? How many cycles in each PCR? Were blanks carried through both PCRs?',
    ],
    artifacts: ['index-hopping', 'chimeras', 'kitome'],
  },

  // ───────────────────────── Virome ─────────────────────────
  'vlp-enrichment': {
    title: 'Virus-like particle enrichment',
    short: 'Cells and debris are removed by centrifugation and filtration so that encapsidated viral genomes dominate. Each physical step also removes some viruses.',
    inputs: 'Homogenized sample (stool, water, tissue)',
    outputs: 'A filtrate enriched for virus-like particles (VLPs)',
    bench: [
      'The sample is suspended in buffer (SM buffer, PBS), vortexed, and centrifuged to pellet cells and large debris. The supernatant is passed through 0.45 µm and/or 0.22 µm filters to remove remaining bacteria. Optional steps concentrate particles (PEG precipitation, ultracentrifugation, tangential-flow filtration) or purify them on a CsCl density gradient. Chloroform may be used to lyse remaining cells and enveloped particles.',
      'Every one of these steps is selective. 0.22 µm filtration removes giant viruses and some large phages and jumbo phages; CsCl gradients select by buoyant density and lose particles outside the collected bands; chloroform destroys enveloped viruses. The “virome” that comes out is defined as much by the enrichment protocol as by the sample.',
      'Because VLP preparations contain very little nucleic acid (picograms to a few nanograms), everything downstream is a low-input problem.',
    ],
    variants: [
      { name: 'Filtration only (0.45 / 0.22 µm)', text: 'Simple; retains most phages; bacterial DNA carry-over is substantial.' },
      { name: 'Filtration + CsCl gradient', text: 'Cleaner; loses low- and high-density particles and overall yield.' },
      { name: 'Ultracentrifugation / PEG / TFF concentration', text: 'Needed for low-titre samples (water); differential recovery by particle size.' },
      { name: 'Bulk metagenome, no enrichment', text: 'Viral sequences recovered computationally (VirSorter2, geNomad); prophages and lysogens included, free particles under-sampled.' },
    ],
    data: [
      'Absence of large viruses, giant viruses or enveloped viruses may be the filter and the chloroform, not the sample.',
      'Bacterial reads remain (5–50 %); what fraction is “contamination” vs. packaged host DNA in transducing particles is undecidable from reads alone.',
      'Composition differs sharply between VLP and bulk approaches on the same sample; do not compare across them without care.',
      'Low input → high duplication, strong amplification bias, and contaminant dominance in blanks (see MDA).',
    ],
    check: [
      'Fraction of reads classified as bacterial / human; presence of taxa expected to be excluded by the protocol.',
      'Enrichment blanks (buffer carried through the whole protocol) sequenced alongside.',
    ],
    ask: [
      'Pore size(s), gradient or concentration steps, chloroform? Were blanks processed?',
    ],
    artifacts: ['selection-bias', 'low-input', 'kitome'],
  },

  'nuclease-extraction': {
    title: 'Nuclease treatment & viral nucleic acid extraction',
    short: 'Free DNA and RNA outside capsids are digested, then the capsids are opened and their genomes purified. Both DNA and RNA viruses may be recovered.',
    inputs: 'VLP filtrate',
    outputs: 'Low-mass viral DNA and/or RNA',
    bench: [
      'DNase I, Benzonase, RNase A or a turbo cocktail is added to the filtrate to destroy nucleic acids that are not protected inside a capsid: lysed bacterial DNA, host DNA, free RNA. The nucleases are then inactivated (EDTA, heat, or just proceeding to a denaturing lysis buffer), and capsids are opened with proteinase K and detergent or with a guanidinium buffer. Nucleic acids are purified on columns or beads designed for low input (QIAamp MinElute Virus, Zymo Quick-DNA/RNA Viral).',
      'For RNA viruses, a reverse-transcription step converts RNA to cDNA before amplification; many virome protocols process DNA and RNA fractions separately or use combined DNA+RNA kits. ssDNA viruses (Microviridae, CRESS) survive this step but are handled unevenly by downstream amplification.',
    ],
    variants: [
      { name: 'DNase only', text: 'DNA viromes; RNA viruses lost unless a separate RNA workflow exists.' },
      { name: 'DNase + RNase, dual extraction', text: 'Both fractions, often sequenced as separate libraries.' },
      { name: 'No nuclease step', text: 'More bacterial and host background; useful when capsid integrity is doubtful.' },
    ],
    data: [
      'Bacterial reads that remain after nuclease treatment are protected: packaged in capsids, in gene-transfer agents, or in unlysed cells that passed the filter. Treat the “bacterial contamination” fraction as partly biology.',
      'Human / host reads should be low; a high fraction means nuclease failure or leaky filtration.',
      'RNA viruses absent in a DNA-only workflow are a protocol gap, not an ecological finding.',
    ],
    check: [
      'Host-read fraction and bacterial 16S read fraction as a protocol-efficiency metric per sample.',
    ],
    ask: [
      'Which nucleases, incubation time? Was an RNA fraction processed? Which extraction kit?',
    ],
    artifacts: ['selection-bias', 'low-input'],
  },

  mda: {
    title: 'Whole-genome amplification (MDA)',
    short: 'Phi29 polymerase with random primers amplifies picograms of DNA to micrograms by strand displacement. Coverage becomes extremely uneven and ssDNA genomes are over-represented.',
    inputs: 'Picograms to nanograms of viral DNA',
    outputs: 'Micrograms of highly branched, hyper-branched amplified DNA',
    bench: [
      'Multiple displacement amplification (GenomiPhi, REPLI-g) uses random hexamer primers and phi29 DNA polymerase, a highly processive enzyme with strand-displacement activity. At 30 °C for 1–16 h it synthesizes long branched products and amplifies the input 10³–10⁶-fold without thermal cycling. Phi29 has very high fidelity, but the amplification is stochastic: whichever molecules are primed first dominate, producing coverage that varies by orders of magnitude across a genome and between genomes.',
      'Circular single-stranded DNA genomes (Microviridae, anelloviruses, CRESS viruses) are amplified far more efficiently than linear dsDNA (rolling-circle amplification), so MDA viromes over-represent them by 10–1000-fold. Phi29 also produces chimeric products through template switching, and any contaminating DNA in the reagents is amplified along with the sample.',
      'Alternatives include lower-bias PCR-based methods (SISPA, WTA2 for RNA), linker-amplified shotgun libraries (LASL), and simply using ultra-low-input library kits (Nextera XT, NEBNext Ultra II FS with 18+ cycles, Accel-NGS 1S for ssDNA) without a separate WGA step.',
    ],
    variants: [
      { name: 'MDA (phi29, GenomiPhi / REPLI-g)', text: 'Huge yield; extreme coverage bias; ssDNA over-representation; chimeras.' },
      { name: 'SISPA / random PCR', text: 'Primer-tag amplification; less ssDNA bias, more GC bias and duplicates.' },
      { name: 'Direct low-input library (no WGA)', text: 'Most quantitative; requires ≥ 1 ng and tolerates many PCR cycles; preferred for abundance comparisons.' },
      { name: 'Accel-NGS 1S / xGen ssDNA', text: 'Captures ssDNA genomes without MDA bias; adaptase chemistry adds a low-complexity tail to read starts.' },
    ],
    data: [
      'Coverage along a genome varies 100–10,000-fold; assemblies fragment at coverage valleys and relative abundances between viruses are not quantitative.',
      'ssDNA viruses dominate MDA viromes; their apparent abundance cannot be compared to dsDNA viruses in the same sample.',
      'MDA chimeras create false genome junctions and inflate “novel” contigs; check assemblies for sharp coverage changes at junctions.',
      'Reagent contaminants (phi29 preparations historically contain trace bacterial DNA) are amplified to high coverage in low-input samples; blanks are essential.',
    ],
    check: [
      'Coverage evenness per contig (coefficient of variation, Gini); fraction of ssDNA families; chimeric read-pair rate.',
      'Compare abundance of a spiked-in control virus (e.g. known dsDNA phage) across samples.',
    ],
    ask: [
      'Was there a whole-genome amplification step? Which enzyme, how long? Were blanks amplified and sequenced?',
    ],
    artifacts: ['mda-bias', 'chimeras', 'low-input', 'kitome'],
  },

  tagmentation: {
    title: 'Tagmentation (Nextera / Illumina DNA Prep)',
    short: 'A transposase cuts DNA and inserts adapter sequences in one reaction. Fast and low-input friendly, with its own insertion bias and a signature at read starts.',
    inputs: '1–500 ng DNA (XT: 1 ng; Illumina DNA Prep: 1–500 ng)',
    outputs: 'Fragments tagged on both ends with partial adapters',
    bench: [
      'Tn5 transposase loaded with adapter oligos (“transposomes”) binds DNA, cuts it and covalently attaches the adapter to the 5′ ends of the cut, leaving a 9 bp gap. Fragment size depends on the ratio of transposome to DNA: more enzyme, shorter fragments. In Illumina DNA Prep the transposomes are bound to beads so that the bead capacity, not the input mass, sets the fragment size and yield, making the protocol tolerant to variable input. The 9 bp gap is filled in during the first PCR cycles, which also add indexes and P5/P7 (so tagmentation is never PCR-free).',
      'Tn5 prefers certain insertion sites (a weak palindromic motif) and avoids others; it also tends to under-represent very AT-rich and very GC-rich regions. Because both ends of every fragment are transposase cut sites, the first ~9–12 bases of every read carry a recognizable composition skew.',
      'Tagmentation is also the chemistry behind ATAC-seq (open chromatin) and Nextera XT (single-cell, low-input, viromes), and is standard in many large-scale shotgun metagenome projects.',
    ],
    variants: [
      { name: 'Nextera XT', text: '1 ng input; strong sensitivity to input quantity; 12 PCR cycles; pronounced GC bias and duplicates at low input.' },
      { name: 'Illumina DNA Prep (Nextera DNA Flex)', text: 'Bead-linked transposomes; robust insert size regardless of input; 5–12 cycles.' },
      { name: 'Custom / homemade Tn5', text: 'Common in single-cell and ATAC work; batch-to-batch variability.' },
    ],
    data: [
      'Insert sizes are set by enzyme:DNA ratio, not shearing; distributions are broader and shift with input mass in XT.',
      'Read-start composition bias for the first ~10 bases (FastQC “Per base sequence content” warning); do not hard-trim it unless assembling, where some do.',
      'The adapter sequence to trim is the Nextera transposase sequence `CTGTCTCTTATACACATCT`, not the TruSeq `AGATCGGAAGAGC`. Auto-detecting trimmers handle this; hard-coded TruSeq trimming leaves adapter in the reads.',
      'Duplicates have a different structure: both ends are insertion events, so reads from the same molecule share a start and an end just like sheared libraries, but “duplicate” reads can also arise from Tn5 cutting the two strands 9 bp apart (handled by standard duplicate marking).',
      'GC bias stronger than with ligation-based preps; high-GC organisms are under-covered.',
    ],
    check: [
      'Trimmer log: adapter detected should be Nextera/CTGTCTCTTATACACATCT.',
      'Coverage vs GC plot; insert-size distribution vs input mass.',
    ],
    ask: [
      'Nextera XT, Illumina DNA Prep, or custom Tn5? Input mass and PCR cycles per sample?',
    ],
    artifacts: ['adapter-readthrough', 'end-bias', 'gc-bias', 'duplicates'],
  },

  // ───────────────────────── Nanopore ─────────────────────────
  'hmw-extraction': {
    title: 'High-molecular-weight DNA extraction',
    short: 'For long reads the DNA must stay long. Gentle lysis, wide-bore tips and no vortexing keep molecules at tens to hundreds of kilobases.',
    inputs: 'Fresh or snap-frozen cells or tissue',
    outputs: 'HMW DNA, N50 > 30–50 kb, clean enough for the pore',
    bench: [
      'Standard bead-beating or column kits shear DNA to a few kilobases, which is fine for Illumina and ruinous for long reads. HMW protocols lyse gently (proteinase K, SDS or CTAB, no beads), avoid vortexing and narrow pipette tips, and purify by phenol–chloroform, magnetic beads (Nanobind, Circulomics), or precipitation. Short fragments can be removed afterward with the Short Read Eliminator kit or a 0.4× bead ratio, which raises N50 at the cost of yield.',
      'Purity matters more than for Illumina: polysaccharides, phenol and salts clog or deactivate pores and shorten run life. A260/230 and A260/280 are checked, and Femto Pulse or pulsed-field gels show the length distribution.',
      'For microbiome samples, gentle lysis trades off against Gram-positive representation even more sharply than for short reads: the taxa that resist lysis are missing, and the ones that lyse easily (including host cells) dominate.',
    ],
    variants: [
      { name: 'Phenol–chloroform or CTAB', text: 'Longest fragments; most hands-on; carry-over risk.' },
      { name: 'Nanobind / Circulomics (magnetic disk)', text: 'HMW with good purity; popular for human and bacterial isolates.' },
      { name: 'Gentle kit (e.g. QIAGEN Genomic-tip, MagAttract)', text: '50–150 kb; reliable; moderate yield.' },
      { name: 'Short Read Eliminator / size selection', text: 'Removes < 10–25 kb; essential for ultra-long reads; loses mass.' },
    ],
    data: [
      'Read-length N50 is set here, not by the sequencer: a 5 kb N50 means the extraction sheared the DNA.',
      'Pore clogging and early run death appear as a steep fall in active pores and low yield; the facility’s run report shows it.',
      'Lysis bias in microbial HMW extraction skews community profiles more than short-read kits; compare with a short-read profile when both exist.',
    ],
    check: [
      'Read-length histogram (NanoPlot, `seqkit stats -a`): N50 and the fraction of reads < 1 kb.',
      'Compare taxonomic profile against a bead-beating short-read extraction of the same sample if available.',
    ],
    ask: [
      'Extraction method, Femto Pulse / gel trace, and whether short fragments were depleted?',
    ],
    artifacts: ['lysis-bias', 'read-length', 'degradation'],
  },

  'nanopore-library': {
    title: 'Nanopore library preparation (ligation)',
    short: 'DNA ends are repaired, then a sequencing adapter carrying a motor protein is ligated. Barcodes can be ligated or PCR-added before the adapter.',
    inputs: 'HMW DNA (≈1 µg for LSK114) or amplicons',
    outputs: 'Adapter-ligated DNA with motor protein, loaded onto the flow cell in minutes',
    bench: [
      'Ends are repaired and dA-tailed (NEBNext Ultra II End Prep, often with FFPE repair mix to fix nicks), then the sequencing adapter (AMX) is ligated with a quick ligase. The adapter is a short duplex carrying a motor protein (a helicase) on one strand and a tether that attracts the complex to the membrane. The library is cleaned with beads and loaded in a loading buffer containing the fuel the motor needs.',
      'For multiplexing, native barcodes (NBD114, 24–96 barcodes) are ligated to the end-prepped DNA before the adapter, or rapid barcodes are introduced by a transposase (Rapid Barcoding Kit) that also fragments, or PCR barcodes are added by amplification. No PCR is needed for the ligation kit, so there are no PCR duplicates and base modifications (5mC, 6mA) are preserved and can be called.',
      'Nothing is “sequenced by cycles”: each molecule is pulled through a pore by its motor protein at ~400 bases per second until it has passed completely, so read length is molecule length. Both strands can be read in sequence in duplex mode when the complementary strand follows immediately.',
    ],
    variants: [
      { name: 'Ligation Sequencing Kit (LSK114, R10.4.1)', text: 'Highest quality and longest reads; 1 µg input; preserves modifications.' },
      { name: 'Rapid kit (RAD114 / RBK114)', text: '10-minute prep via transposase; shorter reads; smaller yield; good for quick ID or field use.' },
      { name: 'Native barcoding (NBD114)', text: 'PCR-free multiplexing; some barcode cross-assignment and unclassified reads.' },
      { name: 'PCR barcoding / cDNA-PCR (PCB114)', text: 'For low input and full-length cDNA; adds PCR biases; loses modification information.' },
    ],
    data: [
      'Adapter and barcode sequences flank each read and are trimmed by the basecaller or Porechop/Dorado; a few bases at read ends are low quality where the motor engages.',
      'Chimeric reads (two molecules ligated together, or two passing the pore in quick succession) occur at ~1–3 %; look for internal adapter sequences and split them (Duplex Tools, Porechop `--middle`).',
      'No PCR duplicates; apparent duplicates are real molecules or are the two strands of a duplex.',
      'Barcode misassignment of ~0.1–1 % between samples on the same flow cell; demultiplex with “both ends” barcode requirement when depth allows.',
    ],
    check: [
      'Fraction of unclassified barcodes in the basecaller summary; internal adapter hits.',
      'Read-end quality profile (NanoPlot) to decide how much to trim.',
    ],
    ask: [
      'Kit and chemistry version (e.g. SQK-LSK114 on R10.4.1), barcoding method, input mass and whether PCR was involved?',
    ],
    artifacts: ['chimeras', 'read-length', 'index-hopping'],
  },

  'nanopore-sequencing': {
    title: 'Nanopore sequencing',
    short: 'Single DNA strands pass through protein pores in a membrane while an ionic current is measured. The current trace (“squiggle”) is the raw data.',
    inputs: 'Loaded library on a flow cell (MinION: 512 channels / ~2000 pores; PromethION: 2675 channels / ~10,000 pores)',
    outputs: 'Raw signal (POD5 / FAST5) and, usually, basecalled FASTQ',
    bench: [
      'A voltage across the membrane drives an ionic current through each pore. When a DNA strand is pulled through by its motor protein, the bases inside the pore’s constriction (about 5–9 bases for R10 pores, which have two reading heads) partially block the current in a sequence-dependent way. Sampled at 4–5 kHz, this gives a characteristic signal for each k-mer as the strand ratchets through at roughly 400 bases per second. Each pore reads one molecule at a time, then the next; a flow cell runs for up to 72 h as pores gradually die or clog, and can be washed and reloaded.',
      'Because a read is a single molecule, there is no cluster averaging. Signal quality depends on the pore, translocation speed stability, and the sequence itself. Homopolymers are hard: the signal barely changes while identical bases pass, so their length is estimated from dwell time. The latest R10.4.1 pores with dual reading heads improved this considerably over R9.4.1.',
      'Adaptive sampling lets the device reject a molecule within its first few hundred bases if it maps (or does not map) to a target; this is a software enrichment step that changes the read-length and coverage distribution of the rejected set.',
    ],
    variants: [
      { name: 'R9.4.1 (legacy)', text: 'Modal accuracy ~Q15–Q20; homopolymer errors common; many public datasets.' },
      { name: 'R10.4.1 + Kit 14 (current)', text: 'Simplex ~Q20–Q25, duplex > Q30; improved homopolymers.' },
      { name: 'Adaptive sampling', text: 'In-silico enrichment/depletion (e.g. host depletion); rejected reads are ~500 bp fragments present in the output.' },
      { name: 'Direct RNA (RNA004)', text: 'Native RNA with modifications; lower throughput; different pore and motor.' },
    ],
    data: [
      'Errors are indels more than substitutions, concentrated in homopolymers and some k-mers; variant calling and assembly polishing need long-read-aware tools (Medaka, Clair3, Flye/metaFlye).',
      'Per-read quality is a mean Phred from the basecaller; reads below Q7–Q10 are “fail” reads, often delivered in separate files or filtered out.',
      'Yield decays over the run; reads from late in the run come from fewer, older pores and can differ in quality; the read header timestamp lets you check.',
      'Adaptive sampling leaves a population of short rejected reads that should be excluded from assembly and length statistics.',
    ],
    check: [
      'NanoPlot / pycoQC on the sequencing summary: read length vs quality, yield over time, active pores over time.',
      'Homopolymer-length error profile against a reference if one exists; it determines polishing needs.',
    ],
    ask: [
      'Flow cell version (R9.4.1 vs R10.4.1), device, run time, washes/reloads, adaptive sampling on or off?',
    ],
    artifacts: ['homopolymer-errors', 'read-length', 'quality-decay'],
  },

  'nanopore-basecalling': {
    title: 'Basecalling & modification calling',
    short: 'A neural network converts the raw current into bases. The model version matters as much as the chemistry, and re-basecalling old data with a new model can improve accuracy substantially.',
    inputs: 'Raw signal (POD5)',
    outputs: 'FASTQ or unaligned BAM with per-base qualities and, optionally, modification tags',
    bench: [
      'Dorado (previously Guppy) runs a neural network over the squiggle to emit bases. Three model sizes trade speed for accuracy: fast, high-accuracy (HAC) and super-accurate (SUP). Basecalling can happen live on the device (usually fast or HAC) or afterward on a GPU (SUP). Modified-base models additionally emit per-base probabilities for 5mC, 5hmC, 6mA, written as MM/ML tags in BAM. Duplex calling pairs a template read with the complementary strand that followed it through the pore and emits a consensus read with much higher accuracy.',
      'The basecaller also trims adapters, splits reads at internal adapters, and assigns barcodes. Raw signal is kept in POD5 so that the data can be re-basecalled when models improve: the same flow cell’s data called with a 2021 model and a 2024 SUP model differ by several Q points.',
    ],
    variants: [
      { name: 'Fast model (live)', text: 'Lowest accuracy; fine for species ID and adaptive sampling decisions.' },
      { name: 'HAC', text: 'Default live model on recent devices; ~Q20.' },
      { name: 'SUP (+ duplex, + modification models)', text: 'Best accuracy; GPU-hours per flow cell; what you want for assembly polishing and methylation.' },
    ],
    data: [
      'The basecaller model and version are the single largest determinant of error profile in a Nanopore FASTQ; always record them (they are in the read header or sequencing summary).',
      'Quality scores are per-read averages plus per-base estimates from the network; they are better calibrated with recent models but still not comparable to Illumina Q scores.',
      'Mixing data basecalled with different models in one analysis introduces a technical batch effect in error profile and homopolymer handling.',
      'Modification calls require the unaligned BAM output; a FASTQ has thrown that information away.',
    ],
    check: [
      'Read header: `basecall_model_version_id=`; sequencing summary for model and barcode statistics.',
      'If raw POD5 exists, consider re-basecalling with the current SUP model before assembly or variant work.',
    ],
    ask: [
      'Basecaller and model version? Were modified-base or duplex models used? Is the POD5 available?',
    ],
    artifacts: ['homopolymer-errors', 'batch-effects', 'q-binning'],
  },

  // ───────────────────────── single-cell RNA (10x Chromium 3′) ─────────────────────────
  'single-cell-suspension': {
    title: 'Tissue dissociation & single-cell suspension',
    short: 'Tissue is cut, digested and filtered into a suspension of single live cells. Whatever does not survive this step is not in your matrix, and what does survive has been stressed for an hour at 37 °C.',
    inputs: 'Fresh tissue, blood, or cultured cells',
    outputs: 'A counted suspension of single cells (or nuclei), 700–1,200 cells per µl, > 70–80 % viable',
    bench: [
      'Fresh tissue is minced and incubated with proteases (trypsin, collagenase, papain, dispase, often with DNase I to stop released DNA from gluing cells into clumps) at 37 °C for 15–60 minutes with trituration. The suspension is passed through a 30–70 µm strainer to remove clumps and debris, red blood cells may be lysed, and dead cells may be removed with magnetic beads or sorted out. Cells are counted (haemocytometer or automated counter with trypan blue or AO/PI) and diluted to the concentration the loading table asks for.',
      'The whole procedure is a selection. Fragile or large cells (neurons, adipocytes, podocytes, some epithelial cells) die or are filtered out; small robust cells (immune cells, fibroblasts) are over-represented. Every minute at 37 °C also changes the transcriptome: immediate-early genes (FOS, JUN, EGR1) and heat-shock genes rise within 15 minutes of digestion and are visible as a “dissociation signature” in the final data. Dead and dying cells leak RNA into the buffer; that RNA ends up in every droplet as ambient background.',
    ],
    variants: [
      { name: 'Cold-active protease', text: 'Bacillus licheniformis protease at 6 °C dissociates with far less immediate-early gene induction. Mention of “psychrophilic protease” in Methods means this.' },
      { name: 'Single-nucleus (snRNA-seq)', text: 'Frozen or hard-to-dissociate tissue is homogenised and nuclei isolated instead. No dissociation stress and no cell-size bias, but nuclear RNA is 30–50 % intronic, mitochondrial transcripts should be near zero, and cytoplasmic mRNA is lost.' },
      { name: 'Fixation (methanol, DSP, Fix & Perm)', text: 'Lets samples be stored or transported before loading; reduces ambient RNA from ongoing lysis but lowers RNA recovery and can bias against long transcripts.' },
      { name: 'Cell sorting / enrichment', text: 'FACS or bead enrichment of a population before loading. Doublet rate and composition now reflect the gate, not the tissue.' },
    ],
    data: [
      'Cell-type proportions are not tissue proportions. They reflect survival through digestion and filtration; compare proportions only between samples prepared identically.',
      'A dissociation-stress module (FOS, JUN, JUNB, EGR1, HSPA1A/B, DNAJB1, ATF3) appears in all cell types and can drive a spurious “activated” cluster.',
      'Ambient RNA: free transcripts from lysed cells are captured in every droplet, so even empty droplets contain reads and every cell carries a small background of other cells’ markers (haemoglobin in non-erythroid cells is the classic sign).',
      'Low viability raises the mitochondrial read fraction and the ambient fraction together.',
      'Clumps that pass the strainer become doublets and multiplets; very high counts mean the loading estimate was wrong.',
    ],
    check: [
      'Score the dissociation-stress gene set per cell; if it separates a cluster, regress it or drop the cluster from biology claims.',
      'Mitochondrial-read fraction per cell and per sample (cells: 5–20 % is typical depending on tissue; nuclei: should be < 1–2 %).',
      'Cell Ranger “Fraction Reads in Cells” < 70 % suggests heavy ambient RNA from lysis.',
      'Haemoglobin genes (HBB, HBA1/2) in non-erythroid clusters quantify ambient contamination at a glance.',
    ],
    ask: [
      'Enzyme, temperature and duration of dissociation? Was a cold protease used?',
      'Viability at loading, and was dead-cell removal done?',
      'Cells or nuclei? Fresh or fixed? How long between collection and loading?',
      'Were all samples dissociated by the same person with the same protocol on the same day?',
    ],
    artifacts: ['dissociation-stress', 'ambient-rna', 'mito-fraction', 'doublets', 'batch-effects'],
  },

  'droplet-encapsulation': {
    title: 'Droplet generation (GEMs)',
    short: 'Cells, barcoded gel beads and RT reagents are pushed through a microfluidic chip into oil, forming ~100,000 droplets. Poisson statistics decide how many droplets hold one cell, two cells, or none.',
    inputs: 'Single-cell suspension, Gel Beads, RT master mix, partitioning oil',
    outputs: 'An emulsion of Gel Bead-in-Emulsions (GEMs), most of them empty, each with one bead',
    bench: [
      'The Chromium chip has channels where a stream of cells in RT reagent meets a stream of gel beads and is cut into droplets by oil. The gel beads are close-packed so nearly every droplet receives exactly one bead; the cells are dilute, so cell occupancy follows a Poisson distribution. At the recommended loading, roughly 1 droplet in 10 contains a cell and the rest contain only bead and reagent. Each bead carries millions of copies of one oligo: a Read 1 sequencing primer site, a 16-base cell barcode (one of ~3.6 million in v3), a 12-base UMI (different on every oligo) and a 30-base poly(dT) tail with a VN anchor.',
      'The number of cells loaded sets the trade-off. Loading more cells recovers more cells (about 50–65 % of loaded cells are recovered) but raises the doublet rate linearly: about 0.8 % per 1,000 cells recovered, so 10,000 recovered cells means roughly 8 % doublets. Clumps, debris and a wetting failure of the chip (reagents flowing through without forming droplets) are the usual failure modes.',
    ],
    variants: [
      { name: '10x 3′ v2 / v3 / v3.1 / v4 (GEM-X)', text: 'v2: 16 bp barcode + 10 bp UMI. v3/v3.1: 16 + 12, higher sensitivity. GEM-X (v4) loads up to 20,000 cells per channel with lower doublet rates. The whitelist file your pipeline uses must match the version.' },
      { name: '5′ chemistry', text: 'Same droplets, but the bead oligo carries the template-switch sequence instead of poly(dT), so reads come from the 5′ end of transcripts and TCR/BCR V(D)J can be amplified.' },
      { name: 'Cell hashing / multiplexing (CellPlex, hashtag antibodies)', text: 'Several samples are tagged and loaded together into one channel. Doublets between samples become identifiable and removable; the extra oligo library is sequenced alongside.' },
      { name: 'Overloading + demultiplexing by genotype', text: 'Pooling genetically distinct donors and loading 20–50k cells, then assigning cells by SNPs (demuxlet, souporcell). Cross-donor doublets are removed; same-donor doublets remain.' },
    ],
    data: [
      'Doublets: 1–10 % of “cells” are two cells sharing a barcode. They look like a cell co-expressing two lineages’ markers, often with twice the UMI count. The rate is set here, by loading.',
      'Empty droplets: ~90 % of barcodes in the raw matrix have no cell behind them and carry only ambient RNA; the raw-vs-filtered matrix distinction exists because of this step.',
      'Barcode space: with 3.6 M barcodes and ~10,000 cells, two cells sharing a barcode by chance is rare; two cells in one droplet is not.',
      'A wetting failure or clog yields very few cells with normal per-cell metrics; a mis-count yields far more or fewer cells than expected.',
    ],
    check: [
      'Cell Ranger web summary: “Estimated Number of Cells” vs what was targeted; the barcode-rank (knee) plot shape.',
      'Run a doublet detector (scDblFinder, Scrublet, DoubletFinder) and compare the called rate to the expected ~0.8 % per 1,000 cells.',
      'If hashtags or multiple genotypes were used, use them to measure the doublet rate empirically, then apply it to same-sample doublets you cannot see.',
    ],
    ask: [
      'How many cells were loaded and how many were targeted for recovery?',
      'Chemistry version (v2, v3, v3.1, GEM-X), and 3′ or 5′?',
      'Were samples multiplexed in one channel (hashing, CellPlex, genotype pooling)?',
      'Any wetting failure, clog or re-run noted for a channel?',
    ],
    artifacts: ['doublets', 'ambient-rna', 'empty-droplets'],
  },

  'barcoded-rt': {
    title: 'In-droplet lysis & barcoded reverse transcription',
    short: 'Inside each droplet the bead dissolves, the cell lyses, and poly(dT) primers copy every polyadenylated transcript into cDNA stamped with that droplet’s cell barcode and a unique UMI. This is where the matrix’s rows and columns are decided.',
    inputs: 'GEMs containing cell, bead and RT reagents',
    outputs: 'Barcoded, UMI-tagged first-strand cDNA with a template-switch handle on the far end, still inside droplets',
    bench: [
      'The emulsion is incubated (45 min at 53 °C, then 85 °C to inactivate). The gel bead dissolves, releasing its oligos; the detergent in the mix lyses the cell. Each poly(dT) oligo anneals to a poly(A) tail and reverse transcriptase extends it, copying the transcript from its 3′ end. The product carries, in order: Read 1 site, cell barcode, UMI, poly(dT), then the cDNA. Every mRNA molecule that is captured receives a different UMI, so later PCR copies of one molecule can be collapsed back to one count.',
      'When the enzyme reaches the 5′ end of the transcript it adds a few untemplated C bases; a template-switch oligo (TSO) with three riboguanosines pairs with them and the enzyme switches template and copies the TSO, putting a known handle on the other end of every full-length cDNA. Capture is inefficient: only about 10–30 % of mRNA molecules in a cell are converted into a barcoded cDNA, which is why the matrix is mostly zeros and why counts per cell are far below the true transcript count.',
    ],
    variants: [
      { name: 'Poly(dT) priming (3′ assays)', text: 'Captures polyadenylated RNA only; histone mRNAs and many non-coding RNAs are missed; internal priming on A-rich stretches produces reads inside long introns and exons.' },
      { name: '5′ assays', text: 'The barcode is on the TSO side; reads come from the 5′ end of transcripts, so TSS and V(D)J information are accessible.' },
      { name: 'Feature barcoding (CITE-seq, hashtags, CRISPR guides)', text: 'Antibody- or guide-attached oligos have poly(A) or a capture sequence and are reverse-transcribed in the same reaction, giving a second count matrix with the same cell barcodes.' },
      { name: 'Plate-based full-length (Smart-seq2/3)', text: 'Same template-switching chemistry but one cell per well, reads along the whole transcript, and UMIs only in Smart-seq3.' },
    ],
    data: [
      'Read structure: Read 1 = 16 bp cell barcode + 12 bp UMI (v3), nothing else; the transcript sequence is entirely in Read 2. Treat Read 1 as tags, never align it.',
      'Counts are UMIs, not reads. Reads with the same barcode, UMI and gene are PCR copies of one captured molecule and must be collapsed.',
      'Capture efficiency, not biology, makes the matrix sparse: a cell with 20,000 mRNAs typically yields 2,000–8,000 UMIs. Zeros are mostly dropouts.',
      'Transcript ends: 3′ chemistry places reads within a few hundred bases of the poly(A) site, so quantification is per gene (3′ UTR), isoforms are mostly inaccessible, and genes whose 3′ ends are unannotated are under-counted.',
      'Internal poly(A) priming creates reads in A-rich intronic and intergenic regions that look like pre-mRNA or novel transcripts.',
      'Ambient RNA molecules in the droplet are barcoded exactly like the cell’s own, so they are indistinguishable at this stage.',
    ],
    check: [
      'FastQC on Read 1 shows no biology, just a per-position composition profile; Read 2 should look like RNA-seq with a poly(A)/poly(T) tail enrichment in some reads.',
      'Cell Ranger “Sequencing Saturation” and median UMIs/genes per cell tell you capture and depth, not cell quality alone.',
      'Fraction of reads mapping to intronic regions: expect 10–30 % in cells, higher in nuclei; sudden jumps suggest internal priming or nuclear contamination.',
    ],
    ask: [
      'Which chemistry and version, so the barcode whitelist, UMI length and read lengths are right?',
      'Were feature-barcoding libraries made from the same GEMs? They share cell barcodes with the gene-expression library.',
    ],
    artifacts: ['umis', 'three-prime-bias', 'ambient-rna', 'intronic-reads', 'sparse-counts'],
  },

  'cdna-amplification': {
    title: 'Emulsion breaking & cDNA amplification',
    short: 'The droplets are broken, all cells’ barcoded cDNA is pooled into one tube, cleaned up and PCR-amplified for 10–14 cycles. From here on every molecule carries its cell of origin as a sequence tag.',
    inputs: 'Barcoded first-strand cDNA in emulsion',
    outputs: '~10–100 ng of double-stranded, full-length, barcoded cDNA (broad peak 1–2 kb on a trace)',
    bench: [
      'Recovery Agent (a perfluorinated oil) breaks the emulsion; the aqueous phase, now containing the barcoded cDNA from all droplets together, is cleaned on magnetic silane beads to remove primers, oil residue and unused bead oligos. The cDNA is then amplified by PCR with two primers that anneal to the Read 1 site and to the TSO handle, so only molecules that have both a barcode end and a template-switched 5′ end amplify exponentially. Cycle number is chosen from the number of cells targeted (about 11 cycles for 10,000 cells, more for fewer cells).',
      'The amplified cDNA is cleaned with SPRIselect beads and run on a Bioanalyzer or TapeStation. A healthy trace is a broad hump centred around 1–2 kb; a sharp peak below 200 bp is primer or TSO concatemers, and a tall narrow peak at a fixed size may be an over-represented transcript or an artefact. The yield decides the input mass for library construction and is one of the few QC numbers from the wet lab that predicts data quality.',
    ],
    variants: [
      { name: 'Standard 3′ cDNA PCR', text: 'One PCR, 10–14 cycles. A portion of the cDNA is often set aside for feature-barcoding or targeted-panel libraries.' },
      { name: 'Feature-barcode split', text: 'Antibody-derived tags or hashtags are much shorter than cDNA; they are separated by size during cleanup and amplified separately with their own cycles.' },
      { name: 'Targeted or V(D)J enrichment', text: 'Nested PCRs pull out specific transcripts from the same cDNA; the gene-expression library is made from the rest.' },
    ],
    data: [
      'PCR duplicates: by the end of library prep each captured molecule exists as thousands of copies. The UMI exists to collapse them; the duplication rate per se is not a quality problem.',
      'UMI and barcode errors: polymerase errors in the barcode or UMI during these cycles create “new” barcodes one mismatch away from a real one. Pipelines correct barcodes against the whitelist and collapse UMIs within Hamming distance 1 for this reason.',
      'Chimeric molecules: template switching between cycles can attach one cell’s barcode to another cell’s transcript at a low rate, another small source of cross-cell background.',
      'Amplification bias: short and GC-balanced cDNAs amplify better; long transcripts are under-represented relative to their 3′ ends, which later fragmentation partly evens out.',
      'cDNA yield correlates with cells captured and cell size; very low yield means few cells or dead cells, not low expression.',
    ],
    check: [
      'Ask for the cDNA trace and yield per sample; samples whose yield is an outlier often become outliers in the matrix too.',
      'Cell Ranger “Sequencing Saturation” (fraction of reads that are duplicate UMI/barcode/gene combinations) above ~50–70 % means more sequencing would add little; below 30 % means the matrix is undersampled.',
      'Look for barcodes with very low counts one mismatch from high-count barcodes in the raw matrix: that is the correction the pipeline is supposed to make.',
    ],
    ask: [
      'How many cDNA PCR cycles, and what was the yield and trace shape for each sample?',
      'Was cDNA from these GEMs also used for other libraries (feature barcodes, V(D)J, targeted panels)?',
    ],
    artifacts: ['duplicates', 'barcode-errors', 'chimeras', 'sequencing-saturation'],
  },

  'sc-library-construction': {
    title: 'Fragmentation, Read 2 adapter & sample-index PCR',
    short: 'The long cDNA is fragmented, a Read 2 adapter is ligated to the pieces, and a final PCR adds P5, P7 and the sample index. Only the fragment that still carries the barcode end survives, which is why every read sits near the 3′ end of its transcript.',
    inputs: 'Amplified full-length cDNA, 10–50 ng',
    outputs: 'A sequencing-ready Illumina library, ~400–600 bp, with cell barcode + UMI at the P5 end and cDNA at the P7 end',
    bench: [
      'The cDNA is fragmented enzymatically, end-repaired and A-tailed in one reaction, then double-sided size-selected with SPRIselect beads so that fragments of roughly 300–600 bp remain. A single adapter carrying the Read 2 sequencing-primer site is ligated to both ends of every fragment. A sample-index PCR then uses one primer that anneals to the Read 1 site (adding P5) and one that anneals to the Read 2 adapter (adding the i7 sample index and P7). Only fragments that contain the Read 1–barcode–UMI end can be primed on both sides, so those are the only ones that amplify exponentially; the internal pieces of each cDNA are made but never become clusters.',
      'Each full-length cDNA therefore yields exactly one sequenceable fragment, and that fragment starts at the poly(A) end. The cDNA is read from the fragmentation point toward the poly(A) tail in Read 2, which is why reads pile up in the last few hundred bases of each transcript, and why 3′ scRNA-seq quantifies genes but not isoforms. The i7 (and in dual-index kits, i5) sequence is what later assigns reads to a sample; the cell barcode assigns them to a cell.',
    ],
    variants: [
      { name: 'Single index (v3, SI-GA plates)', text: 'Each sample receives a set of four i7 sequences, so a sample has four index sequences in the sample sheet. Index hopping on patterned flow cells cannot be filtered without an i5.' },
      { name: 'Dual index (v3.1 and later, SI-TT plates)', text: 'One unique i7 + i5 pair per sample; recommended on NovaSeq because hopped reads become filterable as unexpected pairs.' },
      { name: 'Feature-barcode and V(D)J libraries', text: 'Built from the same GEMs with their own index; sequenced in the same run and later joined to the gene-expression matrix by cell barcode.' },
    ],
    data: [
      'Read configuration for 3′ v3/v3.1 is 28 + 10 + 10 + 90 (Read 1, i7, i5, Read 2) or longer Read 2. Read 1 beyond 28 bp is poly(T) and is wasted.',
      'Read 2 is the sense strand of the transcript and sits within a few hundred bases upstream of the poly(A) site; expect gene-body coverage concentrated at the 3′ end and quantification against 3′ UTRs.',
      'Read 2 frequently reads into the poly(A) tail and then into the barcode/UMI/Read 1 adapter: trim poly(A) and TSO/adapter sequences before alignment if your pipeline does not.',
      'Index hopping on ExAmp flow cells moves reads between 10x libraries sequenced together: a cell barcode from library A appears in library B with a few reads. With single-index kits this cannot be filtered and shows up as low-count phantom cells sharing barcodes across samples.',
      'The library’s insert size (hence Read 2 usable length) comes from the size selection here, not from the transcript.',
    ],
    check: [
      'Cell Ranger “Q30 Bases in Barcode / UMI / RNA Read” and “Reads Mapped Confidently to Transcriptome” (typically 50–70 % for cells, lower for nuclei).',
      'Cell barcodes shared between libraries in one run with highly unequal counts indicate index hopping or barcode swapping; remove shared barcodes or use dual-index data.',
      'Check the sample sheet lists all four i7 sequences for single-index samples; missing ones send a quarter of the reads to Undetermined.',
    ],
    ask: [
      'Single or dual index? Which index plate and which well for each sample?',
      'Were other 10x libraries (other samples, feature barcodes) on the same flow cell lane?',
      'Final library size and concentration per sample, and how they were pooled?',
    ],
    artifacts: ['three-prime-bias', 'adapter-readthrough', 'index-hopping', 'barcode-swapping', 'undetermined'],
  },

  'barcode-processing': {
    title: 'From FASTQ to count matrix',
    short: 'Cell Ranger (or STARsolo, kallisto|bustools, alevin-fry) aligns Read 2, corrects barcodes against the whitelist, collapses UMIs and decides which barcodes were cells. The matrix you receive is the output of these decisions, each of which can be revisited.',
    inputs: 'Demultiplexed FASTQ (R1 = barcode + UMI, R2 = cDNA) per library',
    outputs: 'Raw and filtered feature × barcode matrices, a web summary of QC metrics, and a BAM with CB/UB tags',
    bench: [
      'This step happens on a server, not a bench, but it finishes what the gel bead started. Read 2 is aligned to the genome and assigned to a gene if it overlaps exons (and, by default since Cell Ranger 7, introns) on the correct strand. Read 1 is split into barcode and UMI; barcodes are matched to the chemistry’s whitelist, with one-mismatch correction when the quality of the mismatched base is low and the corrected barcode is abundant. UMIs one mismatch from a more abundant UMI on the same barcode and gene are merged, and reads with the same barcode, UMI and gene are counted once.',
      'Cell calling then separates barcodes that had a cell from those that had only ambient RNA. The classic knee cut keeps barcodes whose UMI total is above a tenth of the 99th-percentile among the expected number of cells; EmptyDrops-style testing then rescues barcodes with few UMIs whose expression profile differs significantly from the ambient profile estimated from the clearly empty droplets. The filtered matrix is what most people analyse, but the raw matrix (all ~millions of barcodes) is what ambient-removal tools need.',
    ],
    variants: [
      { name: 'Cell Ranger count / multi', text: 'Reference implementation; `--expect-cells` and `--force-cells` change the knee step; `--include-introns` defaults to true since v7.0 for both cells and nuclei.' },
      { name: 'STARsolo, kallisto|bustools, alevin-fry, salmon alevin', text: 'Faster or lighter alternatives with their own barcode-correction and UMI-collapse rules. Count matrices from different pipelines differ by a few percent; do not mix within a study.' },
      { name: 'Intron inclusion on or off', text: 'Including intronic reads adds 20–50 % more UMIs in nuclei and ~10–20 % in cells, changing per-gene counts and sometimes cluster structure.' },
    ],
    data: [
      'Barcode correction and UMI collapsing are modelling choices: a one-mismatch neighbour can be an error or a real rare molecule. Pipelines differ, and so do their matrices.',
      'Cell calling draws a line through a continuum. Low-RNA cell types (neutrophils, some T cells, erythroblasts) are lost by the knee and rescued only by EmptyDrops; cell-calling settings therefore change which cell types exist in your data.',
      'The filtered matrix still contains doublets, ambient contamination and damaged cells; the pipeline removes none of them.',
      'Multi-mapped reads (gene families, pseudogenes) are discarded by Cell Ranger by default, so paralog-rich families are under-counted.',
      'The BAM keeps uncorrected and corrected barcodes (CR/CB) and UMIs (UR/UB) as tags, so you can audit the decisions.',
    ],
    check: [
      'Web summary: Estimated Number of Cells, Fraction Reads in Cells (> 70 % expected), Median Genes per Cell, Sequencing Saturation, Reads Mapped Confidently to Transcriptome; and the barcode-rank plot, which should have a clear cliff.',
      'Re-run cell calling with EmptyDrops (DropletUtils) on the raw matrix if you expect low-RNA cell types.',
      'Run ambient removal (CellBender, SoupX, DecontX) and doublet detection yourself; they are not part of the default pipeline.',
      'Record pipeline, version, reference annotation and the intron setting; they are part of the experiment.',
    ],
    ask: [
      'Which pipeline and version, which reference and annotation, and was intron counting on?',
      'Were cells force-called or expected-cells set? Was the raw matrix kept?',
    ],
    artifacts: ['cell-calling', 'empty-droplets', 'ambient-rna', 'doublets', 'intronic-reads', 'barcode-errors'],
  },

  // ───────────────────────── PacBio HiFi ─────────────────────────
  'smrtbell-library': {
    title: 'SMRTbell library: shear, repair, hairpin adapters',
    short: 'HMW DNA is sheared to 15–20 kb, repaired, and capped on both ends with hairpin adapters so each molecule becomes a closed circle. Anything that is not a circle is digested away, then short circles are removed by size selection.',
    inputs: 'High-molecular-weight gDNA, 1–5 µg (300 ng–1 µg for low-input kits)',
    outputs: 'Circular SMRTbell templates, 15–20 kb, bound to primer and polymerase, ready to load',
    bench: [
      'DNA is sheared to the target size with a Megaruptor or g-TUBE (15–20 kb for human HiFi, 8–12 kb for metagenomes with limited input) and the distribution is checked on a Femto Pulse. A damage-repair mix fixes nicks, abasic sites and oxidised bases, then ends are repaired and A-tailed. Hairpin “SMRTbell” adapters with a T overhang are ligated to both ends, turning each linear duplex into a single-stranded closed circle. A nuclease cocktail (exonucleases III and VII) digests any linear DNA, free adapters and molecules with only one adapter.',
      'Size selection follows: diluted AMPure PB beads (35 % v/v) or a SageELF / PippinHT gel cut remove molecules below 3–10 kb, because short SMRTbells load into ZMWs preferentially and would eat the sequencing capacity. A sequencing primer is annealed to the adapter’s single-stranded loop and a polymerase is bound to it; the polymerase-bound complex is cleaned up and diluted to the loading concentration (tens to hundreds of pM depending on instrument and loading mode).',
    ],
    variants: [
      { name: 'SMRTbell prep kit 3.0 (standard)', text: 'The default for WGS: 15–20 kb shear, bead size selection, no PCR. Multiplexing by barcoded adapters.' },
      { name: 'Ultra-low input / HiFi amplification', text: 'For < 100 ng (single insects, microdissected tissue): PCR amplification of 8–10 kb fragments before SMRTbell prep. Introduces duplicates, chimeras and GC bias that standard HiFi lacks.' },
      { name: 'Iso-Seq (full-length cDNA)', text: 'cDNA from template switching is made into SMRTbells; reads are whole transcripts. Barcoded primers, no fragmentation.' },
      { name: 'Amplicon / targeted (HiFi amplicons, HiFiViral, capture)', text: 'Barcoded PCR amplicons or hybrid-capture products made into SMRTbells; insert size is set by the amplicon.' },
    ],
    data: [
      'Read length is set here. The shear size, the size-selection cut-off and the polymerase read length together give the HiFi read-length distribution (typically 15–20 kb median, tail to 30 kb+).',
      'No PCR in the standard kit: no PCR duplicates, no PCR chimeras, essentially no GC bias. If an amplified kit was used, all three return.',
      'Short molecules are over-represented relative to their mass because they load faster; a weak size selection yields a low-N50 run with many 1–5 kb reads.',
      'DNA damage that is not repaired stalls the polymerase and shortens reads; oxidised bases (8-oxoG) can produce substitution errors in raw subreads that consensus mostly removes.',
      'Barcoded adapters: demultiplexing happens on the read ends; asymmetric barcodes (different on the two adapters) allow detection of chimeric ligation products.',
    ],
    check: [
      'Read-length histogram (SMRT Link run report, NanoPlot or `seqkit stats`): median, N50 and the fraction below 5 kb; compare to the Femto Pulse trace of the library.',
      'Check the run report for “adapter dimers” and “short inserts” percentages, and the number of passes per read (`np` tag) versus insert length.',
    ],
    ask: [
      'Shear size and size-selection method and cut-off? Was any PCR used (ultra-low input kit)?',
      'Kit version and whether barcoded adapters or barcoded primers were used, and which barcodes per sample.',
    ],
    artifacts: ['read-length', 'zmw-loading', 'damage-patterns'],
  },

  'smrt-sequencing': {
    title: 'SMRT sequencing in zero-mode waveguides',
    short: 'Each polymerase sits at the bottom of a nanoscale well and is filmed as it incorporates fluorescent nucleotides, going around the circular template again and again. One movie, millions of wells, each giving many passes over one molecule.',
    inputs: 'Polymerase-bound SMRTbell complexes at loading concentration',
    outputs: 'Raw subreads (one per pass) per ZMW, with per-base pulse kinetics',
    bench: [
      'The complexes are loaded onto a SMRT Cell, a chip with millions of zero-mode waveguides (ZMWs): 8 million on Sequel II / IIe, 25 million on Revio. A ZMW is a hole ~70 nm wide in a metal film; light entering from below cannot propagate through it, so only the bottom few zeptolitres are illuminated. The polymerase is immobilised at the bottom. Phospholinked nucleotides carry a fluorophore on the phosphate chain, so each incorporation gives a flash of the base’s colour and the dye is cleaved away with the pyrophosphate, leaving a natural DNA strand.',
      'The polymerase proceeds around the circle: insert, adapter, the complementary strand, adapter, insert again. Each lap is a subread; the adapters are recognised and used to split the trace. The movie runs 24–30 hours. Loading is a diffusion process, so a fraction of ZMWs end up empty (P0), one in a polymerase (P1, the productive ones, ideally 60–80 %), or with two (P2, discarded). The interval between flashes (inter-pulse duration) and the flash width are recorded; they slow down at modified bases, which is how 5mC is read without any chemical conversion.',
    ],
    variants: [
      { name: 'Sequel II / IIe', text: '8M ZMW cells, 30 h movies, 15–30 Gb HiFi per cell; on-instrument CCS on the IIe.' },
      { name: 'Revio', text: '25M ZMW cells, four cells in parallel, 24 h movies, ~90 Gb HiFi per cell, on-board CCS and 5mC calling. The current default.' },
      { name: 'Adaptive loading', text: 'The instrument titrates loading automatically to hit a target P1; otherwise concentration is set by hand from a loading table.' },
    ],
    data: [
      'Yield per cell is set by P1 and by how many ZMWs hold a long, intact circle; a poorly loaded cell delivers a fraction of the expected gigabases with the same read-quality profile.',
      'Subreads are not the deliverable. Raw subread accuracy is ~85–90 % with indel-dominated errors; everything useful comes from the consensus of many passes (next step).',
      'Short inserts make more passes per movie; long inserts make fewer. The number of passes, not the insert length itself, decides the final read quality.',
      'Kinetic signatures give 5mC in CpG context as MM/ML tags on HiFi reads (Revio on-board; Jasmine/primrose on older data) without bisulfite; other modifications need specialised models.',
      'A ZMW reads one molecule; there are no clusters, no optical duplicates and no index hopping. Barcode misassignment comes only from ligation chimeras or barcode sequencing errors.',
    ],
    check: [
      'Run report: P0/P1/P2, polymerase read length, longest subread N50, mean passes, and the “HiFi yield” vs the total.',
      'Look for a bimodal insert-length distribution (adapter dimers or short contaminants loaded alongside the library).',
    ],
    ask: [
      'Instrument, chemistry version and movie length? What was P1 and the HiFi yield per cell?',
      'Was 5mC calling turned on and which model version produced the MM/ML tags?',
    ],
    artifacts: ['zmw-loading', 'read-length'],
  },

  'ccs-consensus': {
    title: 'Circular consensus: subreads → HiFi reads',
    short: 'The passes from one ZMW are aligned to each other and collapsed into one consensus read with a predicted quality. A read with at least three passes and predicted accuracy ≥ Q20 is a HiFi read. Remaining errors are mostly single-base indels in homopolymers.',
    inputs: 'Subreads per ZMW (movie BAM)',
    outputs: 'HiFi reads (unaligned BAM, optionally FASTQ) with per-read quality `rq`, passes `np`, and optional MM/ML methylation tags',
    bench: [
      'The CCS algorithm (pbccs, on-instrument on IIe and Revio) splits the ZMW’s trace at adapters, discards passes that are too short or low quality, builds a draft from the subreads and polishes it with a hidden-Markov-model that uses the raw pulse data. Errors in individual passes are random and mostly indels, so they cancel across passes; the consensus quality rises with the number of passes until it plateaus near Q30–Q40. Each read carries a predicted accuracy (`rq`, 0.99 = Q20) and the number of passes (`np`).',
      'Reads with `rq` ≥ 0.99 are called HiFi and written to the `hifi_reads.bam`; below that they land in a fail file. Demultiplexing (lima) trims and assigns barcodes from the adapters or primers. DeepConsensus, a learned polisher, can push accuracy further on older data. Methylation callers add MM/ML tags so a HiFi BAM contains both sequence and CpG methylation.',
    ],
    variants: [
      { name: 'Standard HiFi (rq ≥ 0.99, np ≥ 3)', text: 'The default output; median read Q30+, typically 99.9 % accurate.' },
      { name: 'Including “fail” reads (rq < 0.99)', text: 'More yield for assembly of low-coverage samples at the cost of accuracy; filter by `rq` yourself.' },
      { name: 'DeepConsensus', text: 'Neural polishing of CCS output; improves accuracy notably on low-pass reads.' },
    ],
    data: [
      'HiFi reads are long and accurate but not perfect: residual errors are concentrated in homopolymers (length ≥ 6) and are mostly 1-bp indels; substitutions are rare. Variant callers trained on HiFi (DeepVariant, Clair3 HiFi model) model this.',
      'The quality string is a prediction from the consensus model, not an empirical measurement; it is informative between reads (filter by `rq`) and less so between bases.',
      'Read quality depends on passes, so it is anti-correlated with insert length within a run: the longest reads are the least polished.',
      'No duplicates to mark in standard HiFi; `samtools markdup` has nothing to find. In amplified (ultra-low input, amplicon) libraries, PCR duplicates are real and need UMIs or coordinate-based marking.',
      'Barcode assignment is a Smith–Waterman score against the expected barcodes; low-scoring reads go to an unassigned bin, and a mis-synthesised or mixed-up barcode plate shows as a sample with no reads and another with twice its share.',
    ],
    check: [
      'Distribution of `rq` and `np` per read (`samtools view` + awk, or NanoPlot on the FASTQ); read-length vs quality scatter.',
      'lima report: reads per barcode, mean barcode score, fraction unassigned.',
      'If MM/ML tags are present, the CCS/primrose model version in the BAM header (`@PG` lines).',
    ],
    ask: [
      'CCS version and parameters; was the fail-read file kept? Was DeepConsensus run?',
      'Were reads demultiplexed with lima and which barcode set? Did the sample sheet match the plate?',
    ],
    artifacts: ['hifi-residual-errors', 'q-binning', 'sample-swaps'],
  },

  // ───────────────────────── metatranscriptomics ─────────────────────────
  'coextraction': {
    title: 'Paired DNA and RNA from one lysate',
    short: 'A single bead-beaten lysate is split into DNA and RNA fractions so expression can be read against the gene copies in the same sample. Bacterial mRNA has a half-life of minutes, so stabilisation at collection decides whether there is anything left to sequence.',
    inputs: 'Stabilised stool, soil, biofilm or tissue; 50–250 mg',
    outputs: 'Total RNA (DNase-treated) and gDNA from the same aliquot',
    bench: [
      'Bacterial mRNA turns over within 1–5 minutes, so samples must be flash-frozen or placed in RNAlater / DNA/RNA Shield at collection; a sample that sat at room temperature for an hour has a transcriptome of its stress response, not of its state in the body. Lysis is bead beating in a guanidinium or phenol buffer (TRIzol, Zymo DNA/RNA Shield lysis) to open Gram-positives and preserve RNA at the same time. Column kits (Zymo ZymoBIOMICS DNA/RNA Miniprep, Qiagen AllPrep PowerFecal) bind DNA and RNA on separate columns from the same lysate; TRIzol separates them by phase.',
      'The RNA fraction is treated with DNase I (on-column and often again in solution) because residual gDNA is indistinguishable from transcripts of intergenic regions. Yields are modest (hundreds of ng RNA from stool) and 80–95 % of the RNA is rRNA. The DNA fraction goes into a standard shotgun library; its reads will later be used to build the reference and to normalise expression by gene copy number.',
    ],
    variants: [
      { name: 'Co-extraction kit (Zymo, Qiagen AllPrep)', text: 'One lysate, two columns. The paired design most analyses assume.' },
      { name: 'Separate extractions', text: 'DNA and RNA from different aliquots; composition differs between the two, so RNA/DNA ratios are noisier.' },
      { name: 'RNA only (host-depleted or not)', text: 'Expression must then be referenced against public genomes or a co-assembly from the RNA itself.' },
    ],
    data: [
      'The DNA library is the reference: gene abundance (from DNA) and transcript abundance (from RNA) from the same sample let you compute per-gene expression as an RNA/DNA ratio instead of confusing “more copies of the organism” with “more expression”.',
      'Residual gDNA in the RNA fraction appears as uniform coverage across intergenic regions and both strands; a stranded library makes it detectable.',
      'Degradation and stress-response signatures: heat-shock, cold-shock and stringent-response transcripts dominate samples that were not stabilised quickly; this is a batch effect if stabilisation differed between groups.',
      'Host RNA can be the majority in tissue-associated microbiomes; it dilutes microbial depth and must be removed computationally or by poly(A) depletion.',
    ],
    check: [
      'Fraction of RNA reads mapping to intergenic regions and to the antisense strand (gDNA carry-over estimate); fraction mapping to host.',
      'Compare the taxonomic profile of DNA and RNA reads from the same sample: active taxa differ from present taxa, but a near-zero overlap indicates a swap.',
      'Stress-response gene expression as a per-sample covariate.',
    ],
    ask: [
      'Stabiliser and time to freezing? Were DNA and RNA from the same lysate?',
      'DNase treatment: on-column only or also in solution? Was a no-RT control sequenced?',
    ],
    artifacts: ['gdna-contamination', 'degradation', 'batch-effects', 'rna-dna-ratio'],
  },

  'community-rrna-depletion': {
    title: 'rRNA depletion in a mixed community',
    short: 'There is no poly(A) tail on bacterial mRNA, so rRNA must be removed by probes that hybridise to it. Probes cover the common taxa; whatever they miss stays in the library as rRNA reads, and whatever they accidentally match is lost.',
    inputs: 'Total RNA, 100 ng–1 µg',
    outputs: 'rRNA-depleted RNA, 5–20 % of the input mass, still mostly fragments of the original transcripts',
    bench: [
      'Pools of DNA oligonucleotides complementary to 16S, 23S, 5S (and 18S/28S for eukaryotes and host) are hybridised to the RNA; RNase H digests the RNA in the RNA:DNA hybrids; DNase removes the probes. Ribo-Zero Plus Microbiome, NEBNext rRNA Depletion (Bacteria), and riboPOOL pan-prokaryote are the usual kits; some labs design custom probes from the 16S/23S sequences assembled from the sample’s own DNA data. Depletion efficiency depends on how well the probes match each taxon’s rRNA; divergent or unusual lineages (archaea, some Clostridia, protists) are depleted poorly.',
      'The alternative is poly(A) selection, which captures only eukaryotic mRNA and is used when the host transcriptome is the target. A 1–5 µg total RNA input leaves tens of nanograms after depletion; the remainder is fragmented, reverse-transcribed with random primers and taken through the stranded dUTP workflow like any RNA-seq library.',
    ],
    variants: [
      { name: 'Probe-based depletion (Ribo-Zero Plus, NEBNext, riboPOOL)', text: 'Standard. Check which organisms the probe set targets; “pan-bacteria” kits vary.' },
      { name: 'Custom probes from the sample’s DNA', text: 'Best depletion for unusual communities; probes must be designed per study.' },
      { name: 'Duplex-specific nuclease normalisation', text: 'Removes abundant sequences of any kind after cDNA synthesis; also flattens highly expressed mRNAs.' },
      { name: 'No depletion', text: 'Sequence everything, filter rRNA computationally; 80–95 % of reads are wasted but no probe bias.' },
    ],
    data: [
      'Residual rRNA is 5–50 % of reads depending on kit and community; it must be removed computationally (SortMeRNA, RiboDetector) and the residual fraction reported per sample.',
      'Depletion bias: taxa poorly matched by probes keep their rRNA and look more abundant in raw read counts; mRNAs that resemble rRNA probes are lost. Compare taxon-level mRNA counts only after rRNA removal and only within one kit.',
      'Effective depth is the mRNA fraction times total reads; a 20 M-read library with 40 % rRNA and 30 % host has ~6 M microbial mRNA reads.',
      'tRNA, tmRNA and small RNAs are not depleted and can be 5–15 % of the remaining reads.',
      'Strandedness from the dUTP step is what separates antisense transcription and gDNA from sense expression; verify it before quantifying.',
    ],
    check: [
      'rRNA fraction per sample after SortMeRNA; compare to the kit’s claim and look for sample-to-sample variation that tracks community composition.',
      'Strand specificity (RSeQC infer_experiment, Salmon library type) and intergenic fraction.',
      'Fraction of reads assigned to host; decide whether host depletion is needed before microbial analyses.',
    ],
    ask: [
      'Which depletion kit and version, and which organisms does it target? Was host rRNA also depleted?',
      'Input mass into depletion and the yield after; number of PCR cycles for the library.',
    ],
    artifacts: ['rrna-reads', 'depletion-bias', 'mrna-fraction', 'strandedness'],
  },

  // ───────────────────────── methylation sequencing ─────────────────────────
  'conversion': {
    title: 'Cytosine conversion: bisulfite or enzymatic',
    short: 'Unmethylated cytosines are turned into uracils (read as thymines) while methylated cytosines stay cytosines. Afterwards the sequence itself encodes methylation, and the genome has become a three-letter alphabet from the sequencer’s point of view.',
    inputs: 'Fragmented gDNA (with or without methylated adapters already ligated), 10–200 ng, plus unmethylated lambda and methylated pUC19 controls',
    outputs: 'Converted single-stranded DNA: C→T on every unmethylated cytosine, 5mC and 5hmC unchanged',
    bench: [
      'Bisulfite: DNA is denatured and incubated with sodium bisulfite at low pH and 50–65 °C for hours. Sulfonation and hydrolytic deamination convert cytosine to uracil; 5-methylcytosine (and 5-hydroxymethylcytosine) react far more slowly and remain. The conditions fragment and degrade most of the DNA, which is why bisulfite libraries have short inserts and need more input or more PCR cycles. Conversion is incomplete at a low rate (0.5–2 % of unmethylated C survive) and occasionally over-converts 5mC.',
      'Enzymatic (EM-seq): TET2 oxidises 5mC and 5hmC to forms that resist deamination, T4-BGT glucosylates 5hmC, and APOBEC3A then deaminates unprotected cytosine to uracil. No harsh chemistry, so fragments stay long, GC coverage is even and less input is needed. Both methods include spike-in controls: unmethylated lambda DNA to measure conversion efficiency and fully methylated pUC19 to measure over-conversion. Converted DNA is single-stranded and the two original strands are no longer complementary.',
    ],
    variants: [
      { name: 'WGBS (bisulfite, whole genome)', text: 'The reference method; strongest degradation and GC bias; 30× coverage needs ~100 Gb per human sample.' },
      { name: 'EM-seq (NEBNext Enzymatic Methyl-seq)', text: 'Same information, longer inserts, less bias, lower input. Increasingly the default.' },
      { name: 'RRBS', text: 'MspI digestion (CCGG) before conversion enriches CpG-dense regions; 1–3 Gb per sample covers CpG islands and promoters; reads start with CGG/TGG.' },
      { name: 'oxBS / TAB-seq / ACE-seq', text: 'Variants that distinguish 5hmC from 5mC; standard BS and EM-seq report the sum of both.' },
      { name: 'Targeted methyl panels / capture', text: 'Hybrid capture of converted libraries with probes designed for the converted sequence.' },
      { name: 'Direct detection (Nanopore, PacBio)', text: 'No conversion: modifications are read from the signal on native DNA; see the long-read workflows.' },
    ],
    data: [
      'Reads are T-rich: on one strand C only remains where it was methylated. Alignment needs a converted reference and bisulfite-aware tools; ordinary aligners drop most reads.',
      'Incomplete conversion inflates methylation estimates uniformly; measure it on lambda (should be ≥ 99 %) and on non-CpG cytosines in mammalian samples (CHH is ~0 % methylated outside neurons and embryos).',
      'Bisulfite degradation gives short inserts, adapter read-through, low library complexity and high duplication; EM-seq data look like ordinary WGS in these respects.',
      'C/T SNPs are confounded with methylation on one strand; the opposite strand (G/A) resolves them, so strand-aware callers and a matched genotype help.',
      'Coverage depends on CpG density and GC: bisulfite under-covers GC-rich promoters, which are exactly the regions of interest.',
    ],
    check: [
      'Conversion efficiency on the lambda spike-in and non-CpG methylation level (Bismark report, MethylDackel `--CHH`).',
      'Insert-size distribution and duplication rate; expect short and high for bisulfite, normal for EM-seq.',
      'GC-coverage curve (Picard CollectGcBiasMetrics on the aligned BAM).',
    ],
    ask: [
      'Bisulfite or enzymatic, and which kit? Were lambda and pUC19 spike-ins included?',
      'Input mass and the number of PCR cycles after conversion?',
    ],
    artifacts: ['incomplete-conversion', 'degradation', 'gc-bias', 'reduced-complexity-mapping'],
  },

  'methyl-alignment': {
    title: 'Bisulfite-aware alignment and methylation calling',
    short: 'Reads and reference are both reduced to three letters before alignment so that converted bases still match, then the original letters are restored to count C versus T at each cytosine. Several standard metrics here only exist in methylation data.',
    inputs: 'Converted-library FASTQ, R1 (C→T strand) and R2 (G→A strand)',
    outputs: 'Aligned BAM with XM/XR tags (Bismark) or MD-based calls, per-cytosine coverage and methylation tables, M-bias and conversion reports',
    bench: [
      'This is computational, but it finishes what the conversion started. Bismark, bwa-meth, BSBolt and gemBS convert reads in silico (C→T for Read 1, G→A for Read 2) and align them to a reference converted the same way, in both orientations. In a directional library only the original top (OT) and original bottom (OB) strands exist; non-directional protocols also yield their complements (CTOT, CTOB) and need all four alignments. After placement, the original read sequence is compared to the reference at each cytosine: a C means methylated, a T means unmethylated, and the context (CpG, CHG, CHH) is recorded.',
      'Methylation callers (Bismark methylation extractor, MethylDackel) sum calls per cytosine or per CpG (merging both strands), apply filters for MAPQ and duplicate reads, and report M-bias: methylation level as a function of position in the read. The first bases of Read 2 and the last of Read 1 come from end repair with unmethylated cytosines and show artificially low methylation; they are trimmed by position. Lambda reads give the conversion rate; chrM or CHH gives it again.',
    ],
    variants: [
      { name: 'Bismark (Bowtie2 / HISAT2)', text: 'The reference tool; explicit OT/OB/CTOT/CTOB handling, M-bias and deduplication reports.' },
      { name: 'bwa-meth + MethylDackel', text: 'Faster, uses standard BAM tags; MethylDackel `mbias` suggests trim positions.' },
      { name: 'gemBS, BSBolt, Biscuit', text: 'Pipelines combining alignment, calling and SNP-aware filtering.' },
    ],
    data: [
      'Mapping efficiency is lower than WGS (60–80 % unique) because a three-letter alphabet is less unique, so coverage per gigabase is lower and repeats are under-covered.',
      'Methylation per CpG is a count ratio; with 10× coverage its 95 % interval is ± 30 percentage points. Region-level (DMR) analysis is the realistic unit.',
      'M-bias trimming, duplicate removal and overlap handling of paired reads (do not count a CpG twice when R1 and R2 overlap) change values by several percent.',
      'Strandedness is physical: a CpG is measured independently on both strands and the two should agree; disagreement flags a SNP or an alignment problem.',
      'RRBS reads start at an MspI site and have fixed ends, so duplicates cannot be identified by position and must not be removed.',
    ],
    check: [
      'Bismark summary: mapping efficiency, conversion rate (lambda / CHH), duplication, M-bias plot per read, context methylation levels.',
      'Coverage distribution across CpGs and the fraction of CpGs above a chosen depth.',
      'Overlap handling flag in the extractor (`--no_overlap`) and the trim positions actually used.',
    ],
    ask: [
      'Directional or non-directional library? PBAT or post-bisulfite adapter tagging?',
      'Which aligner and extractor, which trim positions, and was deduplication applied (not for RRBS)?',
    ],
    artifacts: ['m-bias', 'reduced-complexity-mapping', 'incomplete-conversion', 'duplicates'],
  },

  // ───────────────────────── Hi-C ─────────────────────────
  'crosslinking': {
    title: 'Formaldehyde crosslinking',
    short: 'Cells are fixed so that DNA segments that touch each other inside the nucleus are physically tied together through the proteins between them. Everything that follows reads out which pieces of DNA were close in space at that moment.',
    inputs: 'Fresh or frozen cells or dissociated tissue, 1–5 million cells',
    outputs: 'Fixed, quenched, permeabilised nuclei with chromatin contacts frozen in place',
    bench: [
      'Cells are suspended and treated with 1–2 % formaldehyde for 10 minutes at room temperature; formaldehyde forms covalent bridges between amine groups that are within about 2 Å, which means DNA–protein and protein–protein links where chromatin is in contact. Glycine quenches the reaction. The cells are pelleted, lysed with detergent to release nuclei, and the nuclei are permeabilised with SDS so enzymes can enter while the nuclear structure stays intact. For tissue, dissociation or dounce homogenisation precedes fixation; for microbes, fixation is done on the culture or sample directly.',
      'Fixation strength is a trade-off. Too little and contacts are lost during the later steps; too much and the chromatin is inaccessible to the restriction enzyme, giving poor digestion and many short, random ligations. Micro-C and some capture methods add a second crosslinker (DSG, EGS) to capture protein-mediated contacts more completely.',
    ],
    variants: [
      { name: 'Standard in situ Hi-C (1 % formaldehyde, 10 min)', text: 'Rao et al. 2014 protocol; the default for cell lines and blood.' },
      { name: 'Dual crosslinking (FA + DSG / EGS)', text: 'Used in Micro-C, HiChIP and some commercial kits for better contact capture and fewer dangling ends.' },
      { name: 'Metagenomic Hi-C / proximity ligation on microbial communities', text: 'Fixation of the whole community; contacts link plasmids and phages to their host genomes and link contigs of the same cell.' },
      { name: 'Fixed-tissue and FFPE kits', text: 'Over-fixed material: expect lower valid-pair rates and shorter contact range.' },
    ],
    data: [
      'The contact map is a snapshot of a population of nuclei at fixation; every value is an average over millions of cells, and single cells differ enormously.',
      'Over-fixation lowers digestion efficiency: more pairs from the same fragment (dangling ends, self-circles) and a contact-distance distribution that falls off faster than expected.',
      'Under-fixation and cell lysis before fixation let DNA from different nuclei mix, inflating trans contacts and, in metagenomic Hi-C, creating spurious inter-genome links.',
      'Batch differences in fixation time show up as different cis/trans ratios and distance-decay slopes between samples; normalise and compare only after matching them.',
    ],
    check: [
      'Cis/trans ratio (~70–90 % cis for a good mammalian library) and the distance-decay curve P(s) per sample (cooltools, HiCExplorer hicPlotDistVsCounts).',
      'Fraction of “dangling end” and “self-circle” pairs in the pipeline QC (HiC-Pro, pairtools stats).',
    ],
    ask: [
      'Formaldehyde concentration and time, and was a second crosslinker used? Cells or tissue, fresh or frozen, how many?',
      'Were all samples fixed with the same batch of reagents by the same person?',
    ],
    artifacts: ['invalid-pairs', 'batch-effects', 'trans-noise'],
  },

  'digestion-ligation': {
    title: 'In-nucleus digestion, biotin fill-in and proximity ligation',
    short: 'Chromatin is cut inside the intact nucleus, the cut ends are filled in with a biotinylated nucleotide, and ends that happen to be next to each other are ligated together. The junction created here, joining two loci that were close in space, is the molecule the whole experiment is about.',
    inputs: 'Permeabilised crosslinked nuclei',
    outputs: 'Chromatin in which spatially adjacent fragments are covalently joined through a biotin-marked ligation junction',
    bench: [
      'A restriction enzyme is added to the nuclei: MboI or DpnII (cut at GATC, every ~400 bp on average) are standard; HindIII (AAGCTT, ~4 kb) was used in the original dilution protocol; Arima kits use two enzymes to cut more uniformly; Micro-C uses micrococcal nuclease to cut between nucleosomes. The 5′ overhangs left by the enzyme are filled in by Klenow with a mix containing biotin-14-dATP, so every cut end becomes blunt and carries a biotin. T4 DNA ligase is then added at low concentration: in the crowded, crosslinked nucleus the ends most likely to meet are those already next to each other, so ligation joins fragments that were spatially close, whether or not they are near each other on the chromosome.',
      'The ligation of two filled-in MboI ends produces a new site, GATCGATC, which no longer cuts with MboI and can be recognised in reads. Not every end ligates to a neighbour: some are re-ligated to the fragment they came from (self-circles), some to the adjacent fragment on the same chromosome (re-ligation, indistinguishable from an uncut site), and many stay unligated (dangling ends). These classes are what the pipeline sorts out later.',
    ],
    variants: [
      { name: 'In situ Hi-C with MboI / DpnII', text: 'The default; 4-bp cutter, fragments ~ 400 bp, resolution limited by depth rather than fragment size.' },
      { name: 'Arima Hi-C (two enzymes)', text: '^GATC and G^ANTC together; more uniform fragment sizes; the junction motifs differ and the pipeline must know both.' },
      { name: 'Micro-C (MNase)', text: 'Nucleosome-resolution fragments; no restriction motif in the reads; requires dual crosslinking.' },
      { name: 'HiChIP / PLAC-seq, Capture Hi-C', text: 'Hi-C followed by immunoprecipitation or probe capture to enrich contacts at chosen proteins or promoters.' },
      { name: 'Omni-C / DNase Hi-C', text: 'Sequence-independent cutting; no restriction-site bias in coverage.' },
    ],
    data: [
      'Each valid read pair is one ligation junction: two fragments, often far apart or on different chromosomes. Aligners must be told to expect this (single-end alignment of each mate, or chimeric-aware modes).',
      'A read that spans the junction aligns in two pieces; the junction motif (GATCGATC for MboI) marks the split point and can be used to trim or to count junction reads directly.',
      'Resolution is set by the enzyme and by depth: with a 4-cutter and ~1 billion valid pairs, 1–5 kb bins are possible in a human genome; 100 M pairs gives ~25–50 kb.',
      'Restriction-site density, GC content and mappability bias coverage along the genome; matrix balancing (ICE, KR) corrects these but only within the mappable genome.',
      'In metagenomic Hi-C, cross-genome links between a plasmid or phage and a chromosome are the signal; inter-species links at low rate are noise from the ligation step and from pre-fixation lysis.',
    ],
    check: [
      'Fraction of pairs containing the ligation junction motif; fraction of valid vs dangling-end vs self-circle pairs (HiC-Pro, pairtools, Juicer `inter.txt`).',
      'Fragment-length distribution implied by the restriction map versus the actual coverage near sites.',
    ],
    ask: [
      'Which enzyme(s), or MNase / DNase? The pipeline needs the motif and the restriction map.',
      'Was digestion efficiency checked on a gel or by qPCR? What was the ligation time and volume?',
    ],
    artifacts: ['chimeric-pairs', 'invalid-pairs', 'site-bias'],
  },

  'biotin-pulldown': {
    title: 'Reverse crosslinking, shearing and junction pulldown',
    short: 'The crosslinks are reversed, the DNA is purified and sheared, and only the fragments carrying a biotin, which means those containing a ligation junction, are captured on streptavidin beads. The library is then made on the beads.',
    inputs: 'Ligated chromatin in nuclei',
    outputs: 'Junction-enriched DNA fragments, 300–500 bp, on streptavidin beads with adapters ligated; then a PCR-amplified library',
    bench: [
      'Proteinase K and SDS at 65 °C overnight break the formaldehyde crosslinks and digest the proteins; the DNA is purified. Biotin at unligated ends (dangling ends) is removed with T4 DNA polymerase exonuclease activity so that those fragments will not be captured. The DNA is sheared by sonication to 300–500 bp, and streptavidin-coated magnetic beads pull down the fragments that contain a biotinylated junction, typically a few percent of the total mass. End repair, A-tailing and adapter ligation are done on the beads, then PCR (6–12 cycles) amplifies the library off the beads, followed by size selection and QC.',
      'Enrichment is the step that makes Hi-C efficient: without it, most read pairs would come from unligated fragments. It is also where complexity is set, because only junction molecules present in the input nuclei can ever be captured; a few million cells give a library of hundreds of millions of unique junctions, and sequencing beyond that yields duplicates.',
    ],
    variants: [
      { name: 'Standard streptavidin pulldown', text: 'In situ Hi-C and most kits (Arima, Dovetail).' },
      { name: 'No biotin enrichment (3C-seq, some Micro-C)', text: 'All fragments are sequenced; junction fraction is low and depth requirements higher.' },
      { name: 'Low-input / single-cell Hi-C', text: 'Thousands or single nuclei; very few junctions, sparse matrices, heavy PCR, high duplication.' },
    ],
    data: [
      'Valid-pair rate (typically 50–80 % of uniquely mapped pairs) is mostly decided by how well biotin removal and pulldown worked: high dangling-end fractions mean the removal step failed.',
      'Library complexity is finite and modest; duplication rates of 10–40 % are normal at high depth and must be removed per pair (both mates’ coordinates), not per read.',
      'Insert size here (300–500 bp) is the shear size, not the distance between the two loci; the two mates can map megabases apart.',
      'PCR cycles add the usual GC bias and chimeras; PCR chimeras in Hi-C look like trans contacts and are indistinguishable from real ones except by their low rate and lack of reproducibility.',
      'Sonication fragments can contain a junction in the middle of one read, producing reads with two alignments; aligners for Hi-C handle this (bwa mem -5SP, chromap, HiC-Pro rescue).',
    ],
    check: [
      'Pipeline QC: unique valid pairs, duplicate rate, dangling-end and self-circle fractions, cis-short (< 20 kb) versus cis-long fractions.',
      'Library complexity estimate (Picard EstimateLibraryComplexity on pairs, or preseq) before deciding to sequence deeper.',
    ],
    ask: [
      'Was biotin removal from unligated ends performed? How many PCR cycles, and how many nuclei went in?',
      'Final library size and concentration; how many lanes were planned per sample?',
    ],
    artifacts: ['invalid-pairs', 'duplicates', 'chimeras', 'gc-bias'],
  },

  'hic-pairs': {
    title: 'From read pairs to contact matrix',
    short: 'Each mate is aligned independently, pairs are classified as valid contacts or artefacts, duplicates are removed, and the surviving contacts are binned into a matrix and balanced. Every downstream result inherits these filters.',
    inputs: 'Paired FASTQ, 2×100 to 2×150 bp',
    outputs: '.pairs file of valid contacts; .hic / .cool / .mcool matrices; QC tables',
    bench: [
      'Computational, but it defines what a “contact” is. Mates are aligned separately or in chimeric-aware mode (bwa mem -5SP, chromap, HiC-Pro’s two-step mapping, Juicer); a read spanning the junction is split at the ligation motif and the 5′ part is kept. Pairs are then classified by the positions and orientations of the two mates relative to restriction sites: a valid pair has mates on different fragments; dangling ends and self-circles have both mates on the same fragment pointing inward or outward; re-ligations join adjacent fragments and look like uncut DNA. Pairs with low MAPQ (< 30) and PCR/optical duplicates (identical coordinates of both mates) are dropped.',
      'Valid pairs are binned (1 kb to 1 Mb) into a contact matrix, which is then balanced (ICE / KR / cooler balance) to remove coverage biases from restriction-site density, GC content and mappability. From the balanced matrix come compartments (eigenvector), TADs (insulation), loops (HiCCUPS, Mustache) and, for assembly, scaffolding (3D-DNA, YaHS, SALSA) or, for metagenomes, binning (bin3C, MetaCC).',
    ],
    variants: [
      { name: 'HiC-Pro', text: 'Classic pipeline with explicit pair classes and QC plots.' },
      { name: 'Juicer / pairtools + cooler (4DN)', text: 'The two main ecosystems; .hic vs .cool formats, interconvertible with hic2cool / hicConvertFormat.' },
      { name: 'Enzyme-agnostic processing (Micro-C, Omni-C)', text: 'No restriction map; pair classification uses only distance and orientation.' },
    ],
    data: [
      'Read 1 and Read 2 of one pair are two different genomic positions; any tool that assumes a normal insert size will mark nearly every pair as improperly paired.',
      'Short-range cis pairs (< 1–2 kb) are mostly undigested or re-ligated neighbours and are usually removed; this also removes genuine very-short-range contacts.',
      'Trans fraction mixes biology with noise: random ligation between nuclei or in solution adds a uniform background that limits how weak a real inter-chromosomal signal you can call.',
      'Balancing assumes uniform visibility; copy-number changes, repeats and unmappable regions violate it, and cancer genomes need CNV-aware normalisation.',
      'Matrix resolution is depth-limited: aim for ≥ 1,000 valid pairs per bin on average before calling features at that bin size.',
    ],
    check: [
      'Pair-class table (valid, dangling, self-circle, re-ligation, duplicates, low MAPQ) and cis/trans split; the distance-decay curve on a log–log plot should be a smooth power law.',
      'Reproducibility between replicates (HiCRep, QuASAR-Rep) before pooling them.',
      'Resolution check: fraction of bins with ≥ 1,000 contacts at the chosen bin size (as in Rao et al.).',
    ],
    ask: [
      'Which pipeline, aligner settings and MAPQ cut-off? Were duplicates removed per pair?',
      'Enzyme and genome build used for the restriction map; which bins and balancing method were used for the shared matrices?',
    ],
    artifacts: ['invalid-pairs', 'chimeric-pairs', 'trans-noise', 'site-bias', 'duplicates'],
  },

  // ───────────────────────── atac, chip, rip, capture, amplicon (added 2026-11-26) ─────────────────────────
  'nuclei-isolation': {
    title: 'Nuclei isolation for ATAC',
    short: 'Cells are counted, checked for viability and gently lysed so that intact nuclei, stripped of cytoplasm and mitochondria, go into the transposition. The quality of this suspension sets background, mitochondrial fraction and library complexity.',
    inputs: 'Fresh, cryopreserved or FACS-sorted cells (typically 50,000 viable cells), or minced frozen tissue',
    outputs: 'A pellet of intact nuclei, free of cytoplasm and most mitochondria, counted and on ice',
    bench: [
      'Viable cells are counted (trypan blue or an automated counter) and a fixed number, typically 50,000, is pelleted and resuspended in a cold lysis buffer. In Omni-ATAC the buffer contains three mild detergents at low concentration: NP-40 and Tween-20 open the plasma membrane and digitonin permeabilises cholesterol-rich membranes, including mitochondrial ones. After about three minutes on ice the lysis is quenched with a Tween-only wash buffer, which strips away cytoplasm and mitochondria while leaving nuclear membranes intact. The original 2013 protocol used NP-40 alone, left mitochondria in place and produced libraries in which a fifth to a half of the reads were mitochondrial; the digitonin wash is what brought that below ~10 %.',
      'The nuclei must be intact, single and alive at the time of lysis. Dead or dying cells have fragmented, de-condensed chromatin that Tn5 cuts everywhere, so each dead cell contributes background rather than signal; viability above ~90 % is the usual requirement, and FACS sorting of live cells is common for mixed or stressed samples. Frozen tissue is dounced in the lysis buffer and filtered; cryopreserved cells in DMSO recover well, whereas flash-frozen cell pellets, whose membranes burst on thawing, generally do not. Cell number matters more than in most preps because it is also the enzyme-to-substrate ratio of the next step: counting debris as cells under-loads Tn5 and over-cycles the PCR.',
      'For single-cell ATAC (10x Chromium) the same lysis produces a nuclei suspension that is filtered, counted and bulk-transposed before the droplet partitioning, so nuclei quality, clumping and debris carry straight into per-cell metrics.',
    ],
    variants: [
      { name: 'Omni-ATAC (Corces 2017)', text: 'NP-40 + Tween-20 + digitonin lysis with a Tween wash; low mitochondrial fraction; works on frozen tissue. The current default for bulk.' },
      { name: 'Standard ATAC (Buenrostro 2013)', text: 'NP-40 lysis only, no wash. Mitochondrial reads typically 20–50 %; still seen in older datasets.' },
      { name: 'Fast-ATAC', text: 'Digitonin added directly to the transposition for blood cells; no separate lysis step.' },
      {
        name: 'Nuclei from frozen tissue / snATAC',
        text: 'Dounce homogenisation, filtering (30–40 µm), often a sucrose or iodixanol gradient to remove debris; nuclei are counted before 10x loading.',
      },
    ],
    data: [
      'Mitochondrial read fraction is a property of this step. chrM has no nucleosomes and is hyper-accessible, so any mitochondria left in the suspension contribute reads in proportion to their number, from under 5 % (Omni-ATAC) to 50 % (no wash).',
      'Dead cells and lysed nuclei give a flat, genome-wide background: low fraction of reads in peaks, low TSS enrichment and a fragment-size distribution without the nucleosome ladder, with no change in read count or quality scores.',
      'Library complexity is set by the number of nuclei that were actually intact: a count that was inflated by debris means fewer templates, more PCR cycles and a higher duplicate rate.',
      'Clumped nuclei in scATAC become doublets and “cells” with unusually many fragments; debris becomes barcodes with few fragments and low TSS enrichment.',
    ],
    check: [
      'Per-sample chrM fraction (`samtools idxstats`) alongside the protocol version; the two should agree.',
      'Fragment-size histogram and TSS enrichment per sample, plotted against recorded viability and cell count.',
      'scATAC: per-barcode TSS enrichment vs fragment count (the knee plot of ATAC), nucleosome signal, and doublet scores.',
    ],
    ask: [
      'Fresh, cryopreserved or frozen? Viability at the time of lysis and how it was measured?',
      'Which lysis buffer (digitonin or not) and how many nuclei went into transposition?',
      'Were the nuclei counted after lysis or was the cell count before lysis assumed?',
    ],
    artifacts: ['mito-reads', 'low-tss-enrichment', 'nucleosome-ladder', 'low-input', 'batch-effects'],
  },

  'chromatin-tagmentation': {
    title: 'Tn5 on native chromatin',
    short: 'Tn5 transposase loaded with sequencing adapters is let loose on intact nuclei. It can only insert where DNA is not wrapped in nucleosomes or covered by proteins, so the places it cuts are the accessible genome.',
    inputs: 'Intact nuclei (typically 50,000) in transposition buffer',
    outputs: 'Adapter-tagged fragments from accessible chromatin, nucleosome-free and nucleosome-spanning, purified immediately',
    bench: [
      'The nuclei are resuspended in a transposition mix containing Tn5 transposomes (Illumina TDE1 or a home-made, adapter-loaded Tn5), magnesium, and in Omni-ATAC a little digitonin and Tween, and incubated for about 30 minutes at 37 °C with shaking. The enzyme is the same one used for Nextera libraries (see the tagmentation step), but the substrate is chromatin instead of purified DNA. Tn5 is bulky and inserts only where it can reach the double helix: nucleosome-free regions at promoters, enhancers and insulators are cut repeatedly, linker DNA between nucleosomes is cut occasionally, and compacted heterochromatin is almost never cut. Each insertion event ligates an adapter to the 5′ end on each strand, and a fragment becomes sequenceable when two insertions with different adapters (one P5-side, one P7-side) occur close enough together, which happens for about half of the fragments.',
      'Two things about the enzyme shape the data. First, Tn5 works as a dimer that cuts the two strands 9 bp apart, so the two adapters flank a 9 bp duplicated stretch; the true centre of the insertion is 4–5 bp inside each read start, which is why aligned reads are shifted +4 on the forward strand and −5 on the reverse before any base-resolution analysis. Second, the ratio of enzyme to nuclei and the incubation time set the fragment-size distribution: fragments shorter than ~100 bp come from nucleosome-free DNA, fragments of roughly 180–250 bp and 350–450 bp span one or two nucleosomes, producing the ladder seen on a Bioanalyzer trace. Too much enzyme or time collapses the ladder towards short fragments and raises the background; too little leaves large fragments and low yield. Tn5 also has a weak insertion-sequence preference that imprints the first ~9 bases of every read and can look like a transcription-factor footprint.',
      'The reaction is stopped by immediately binding the DNA on a clean-up column (DNA Clean & Concentrator) or adding SDS and proteinase K; Tn5 stays bound to its products until a detergent removes it, so a delayed stop keeps changing the fragment distribution. The fragments are not yet sequenceable: the 9 bp gaps are filled and the full P5/P7 adapters with indexes are added in the first cycles of the PCR that follows.',
    ],
    variants: [
      { name: 'Omni-ATAC transposition', text: 'Tn5 in a buffer with 0.01 % digitonin and 0.1 % Tween-20, 30 min at 37 °C with mixing; low mitochondrial fraction.' },
      {
        name: 'Commercial vs home-made Tn5',
        text: 'Illumina TDE1 is consistent but costly; purified pA-Tn5 or Diagenode Tn5 are common in academic labs and vary by batch, so batches should be recorded.',
      },
      { name: 'scATAC (10x Chromium)', text: 'Bulk transposition of all nuclei first; the barcode is added later in the droplet by a gel-bead oligo that primes the Tn5 adapter.' },
      {
        name: 'Alternatives',
        text: 'DNase-seq and MNase-seq ask related questions with different enzymes and different biases; CUT&Tag uses tethered Tn5 for a specific protein instead of open chromatin.',
      },
    ],
    data: [
      'Reads start exactly at Tn5 cut sites. A +4/−5 shift is needed for footprinting and cut-site analyses, and the first ~9 bases of every read carry a Tn5 composition bias (FastQC per-base content warning, expected).',
      'The fragment-size distribution shows a nucleosome-free peak under ~100 bp and periodic peaks at ~200, ~400 bp; its shape is a direct readout of transposition conditions and nuclei quality, and nucleosome-free vs mono-nucleosomal fragments can be analysed separately.',
      'The adapter to trim is the Nextera transposase sequence `CTGTCTCTTATACACATCT`. With 2×50 bp reads few inserts are shorter than the read, but nucleosome-free fragments under 50 bp read into adapter.',
      'Signal-to-noise (FRiP, TSS enrichment) is largely decided here, by the enzyme-to-nuclei ratio and by how much chromatin from dead cells was present. Later steps cannot add signal; they can only lose it.',
      'Batch effects follow Tn5 lot and transposition conditions: samples transposed on different days with different enzyme batches separate in PCA on fragment-size and TSS metrics before any biology does.',
    ],
    check: [
      'Fragment-size histogram per sample (`ATACseqQC`, `ataqv`, deepTools `bamPEFragmentSize`): ladder present, nucleosome-free peak dominant.',
      'TSS enrichment score and FRiP per sample next to Tn5 batch and transposition date in the manifest.',
      'FastQC per-base content for the first 9 bases: the Tn5 skew should look the same in every sample; a sample that differs was treated differently.',
    ],
    ask: [
      'Which Tn5 (TDE1, home-made, which batch), how much per reaction, and for how long?',
      'Was the reaction stopped by immediate clean-up or left on the bench?',
      'How many nuclei actually went in, and were all samples transposed in one batch?',
    ],
    artifacts: [
      'nucleosome-ladder',
      'tn5-shift',
      'low-tss-enrichment',
      'end-bias',
      'insert-size',
      'adapter-readthrough',
      'gc-bias',
      'batch-effects',
    ],
  },

  'atac-fragments': {
    title: 'From reads to accessible regions',
    short: 'Mitochondrial reads and duplicates are removed, cut sites are shifted to the true Tn5 centre, fragment sizes and TSS enrichment are checked, and peaks are called on cut sites rather than on fragments. Every accessibility result inherits these decisions.',
    inputs: 'Paired FASTQ, typically 2×50 bp, Nextera adapters',
    outputs: 'Filtered, shifted fragment or BAM files; peak sets; count matrix of fragments in peaks; QC metrics (TSS enrichment, FRiP, fragment-size profile)',
    bench: [
      'Computational, but it defines what “accessible” means. After adapter trimming and alignment (Bowtie2 or BWA, with a large maximum insert so that di- and tri-nucleosomal fragments stay properly paired), three filters remove most of the reads: mitochondrial alignments, which can be a tenth to a half of the data; duplicates, which are both real PCR duplicates from a low-input, over-cycled library and identical fragments from hyper-accessible hotspots, and are removed by convention because the two cannot be told apart without UMIs; and low-MAPQ and blacklisted regions (ENCODE blacklist v2), which otherwise produce the strongest “peaks” in the genome. Read starts are then shifted +4 on the forward and −5 on the reverse strand so that each represents the centre of a Tn5 insertion.',
      'Quality is judged on the filtered fragments: a fragment-size distribution with a dominant nucleosome-free peak and visible nucleosome periodicity, a TSS enrichment score (ENCODE: below 5 concerning, 5–7 acceptable, above 7 ideal for hg38 RefSeq TSSs), the fraction of fragments in peaks (FRiP; typically 0.2–0.5, higher is better), and library complexity (NRF, PBC1, PBC2). Peaks are then called on cut sites, not on fragments: MACS2 with `--nomodel --shift -75 --extsize 150` (or `-f BAMPE` on fragments), Genrich in ATAC mode, or HMMRATAC, which uses the nucleosome structure directly. For comparisons across samples a consensus peak set is built, fragments are counted per peak, and differential accessibility is tested with the RNA-seq toolkit (DESeq2, edgeR, limma), ideally with FRiP or TSS enrichment checked as a covariate.',
      'For scATAC the same filters are applied per barcode to produce `fragments.tsv.gz`; cells are called on fragment count and TSS enrichment together, doublets are removed, and peaks or tiles become a sparse cells × regions matrix (ArchR, Signac, SnapATAC2). Each cell has only one or two copies of each locus, so the matrix is near-binary and far sparser than a gene-expression matrix.',
    ],
    variants: [
      { name: 'ENCODE ATAC-seq pipeline', text: 'The reference implementation with the standard QC thresholds, IDR between replicates and pseudo-replicates.' },
      { name: 'nf-core/atacseq', text: 'Nextflow pipeline with MACS2, consensus peaks, featureCounts and DESeq2 built in.' },
      {
        name: 'Genrich / HMMRATAC',
        text: 'Peak callers written for ATAC: Genrich handles replicates and mitochondrial exclusion natively; HMMRATAC models nucleosome-free vs nucleosomal fragments.',
      },
      { name: 'Footprinting (TOBIAS, HINT-ATAC)', text: 'Base-resolution analysis of cut sites around motifs; requires the shift and a Tn5 bias correction.' },
    ],
    data: [
      'Read 1 and Read 2 are the two Tn5 insertion sites; the fragment between them is what was accessible. Analyses work on fragments or cut sites, not on reads.',
      'Duplication of 20–50 % is normal and is removed by convention, which also deletes genuine identical fragments at the most accessible promoters and flattens the strongest peaks.',
      'Peak sets depend strongly on depth and on the caller: more reads give more peaks, so differential accessibility between samples of different depth or quality is biased unless a consensus set and a covariate are used.',
      'TSS enrichment and FRiP are sample-quality metrics; they differ between cell types too, so one fixed threshold across a mixed experiment removes whole cell types.',
      'scATAC counts are near-binary per cell; clustering uses term-frequency transforms (TF-IDF, LSI) rather than log-normalisation, and gene activity is only a proxy derived from nearby accessibility.',
    ],
    check: [
      'Per-sample QC table: chrM fraction, duplicate rate, NRF/PBC, fragment-size profile, TSS enrichment, FRiP, peaks called; look for samples that are outliers on quality before interpreting them as biology.',
      'Whether the Tn5 shift was applied (`ATACseqQC`, `alignmentSieve --ATACshift`); whether peaks were called in paired-end or shift/extend mode; whether blacklist filtering was applied.',
      'Replicate concordance (IDR or overlap of peak sets) and PCA of fragments-in-peaks coloured by batch and by FRiP.',
    ],
    ask: [
      'Which pipeline and peak caller, with which parameters? Was a consensus peak set used for comparisons?',
      'Were mitochondrial reads and duplicates removed before peak calling and before the QC metrics were computed?',
      'For scATAC: how were cells called (which fragment and TSS thresholds) and were doublets removed?',
    ],
    artifacts: ['tn5-shift', 'mito-reads', 'low-tss-enrichment', 'nucleosome-ladder', 'duplicates'],
  },

  'chromatin-shearing': {
    title: 'Chromatin shearing',
    short: 'Fixed cells are lysed and the chromatin is broken into 200–700 bp pieces by sonication, or cut between nucleosomes by MNase. The fragment size set here is the resolution of every peak, and open chromatin shears first.',
    inputs: 'Fixed (or native) cells or nuclei, typically 1–20 million for a TF ChIP, fewer for histone marks',
    outputs: 'Soluble chromatin fragments of 200–700 bp (sonication) or mono- to tri-nucleosomes (MNase), with proteins still attached',
    bench: [
      'After fixation and quenching, cells are lysed in detergent, nuclei are collected and resuspended in a lysis buffer with SDS, and the chromatin is sheared. Sonication (Covaris focused ultrasound, Bioruptor water bath, probe sonicator) breaks DNA by shear force; the operator tunes cycles and power per cell type until a smear of 200–700 bp appears on a gel. Shearing efficiency depends on fixation strength, cell number, cell type and buffer; the same program gives different sizes on different days, which is why a pilot shear check is done before every IP. Over-sonication heats the sample, denatures the epitope the antibody needs and pushes fragments below 150 bp; under-sonication leaves large insoluble chromatin in the pellet, which is removed by centrifugation and silently lost from the experiment, together with the regions that are hardest to shear.',
      'Native ChIP skips fixation and uses micrococcal nuclease (MNase), which digests linker DNA and leaves nucleosome-protected DNA of ~147 bp and multiples. It gives nucleosome-resolution maps of histone marks but cannot hold a transcription factor on DNA without crosslinking, and MNase has its own sequence preference (it cuts A/T-rich linkers first).',
      'Shearing is not uniform across the genome. Open, active chromatin fragments more readily and ends up over-represented in the soluble fraction; compact heterochromatin resists and is under-represented. The input sample is sheared chromatin without an antibody step, and it already carries this bias, which is why peaks are called against input rather than against a flat genome.',
    ],
    variants: [
      { name: 'Covaris focused ultrasound', text: 'Reproducible, tunable, temperature-controlled; the standard for TF ChIP. Programs are cell-type-specific.' },
      { name: 'Bioruptor / probe sonicator', text: 'Cheaper, more variable; probe sonication heats and foams, and over-sonication is common.' },
      {
        name: 'MNase digestion (native ChIP)',
        text: 'Nucleosome ladder instead of a smear; used for histone marks on unfixed chromatin and for high-resolution nucleosome maps. Degree of digestion (mono- vs oligo-nucleosomes) is a batch variable.',
      },
      { name: 'Enzymatic shearing kits', text: 'MNase-based kits for fixed chromatin (e.g. SimpleChIP); gentler on epitopes but biased toward accessible regions.' },
    ],
    data: [
      'Fragment size sets peak resolution: 200–300 bp fragments give sharp TF peaks; 500–700 bp fragments give broad shoulders and merge neighbouring sites.',
      'Shearing bias produces input signal that is not flat: open promoters, highly transcribed genes and some repeats are over-represented before any antibody is added. Peaks called without an input control inherit it.',
      'Under-sonicated samples lose compact chromatin: coverage over heterochromatin and lamina-associated domains drops in input and IP alike, and broad repressive marks (H3K9me3, H3K27me3) look weaker than they are.',
      'Over-sonicated samples give short, often sub-nucleosomal fragments and weak IPs because epitopes are destroyed; the insert-size histogram and the IP yield both shift together.',
      'Different shearing batches produce different input profiles; comparing IPs across batches without matched inputs produces batch-shaped “differential” regions.',
    ],
    check: [
      'Insert-size distribution per sample (Picard `CollectInsertSizeMetrics` for paired-end; cross-correlation fragment length for single-end) and whether it groups by shearing batch.',
      'Input coverage over a few housekeeping promoters versus gene deserts: a 2–5× difference is normal shearing bias; a 20× difference means the input is already “peaky”.',
      'Coverage over heterochromatin (e.g. pericentromeric regions, LADs) in the input: strong under-coverage suggests chromatin lost in the pellet.',
    ],
    ask: [
      'Sonication instrument, program and whether it was re-optimised for each cell type and batch? Was a shear check gel run before the IP?',
      'Sonication or MNase? If MNase, how far was it digested (mostly mono-nucleosomes or a ladder)?',
      'Was an input taken from the same sheared chromatin as each IP?',
    ],
    artifacts: ['hyperchipable-regions', 'insert-size', 'batch-effects', 'degradation'],
  },

  immunoprecipitation: {
    title: 'Immunoprecipitation',
    short: 'An antibody is used to pull the protein of interest, and the DNA crosslinked to it, out of the sheared chromatin. The antibody decides what the experiment measures; the yield decides how many PCR cycles and duplicates follow.',
    inputs: 'Sheared chromatin from 1–20 million cells; 1–10 µg of antibody; protein A/G beads; optionally spike-in chromatin',
    outputs: 'A few picograms to nanograms of purified, de-crosslinked DNA enriched for bound sites, plus an input and often an IgG control',
    bench: [
      'A portion of the sheared chromatin (typically 1–10 %) is set aside as the input. The rest is incubated overnight with an antibody against the target protein or histone modification, then with protein A or G magnetic beads that bind the antibody. The beads are washed with buffers of increasing salt and detergent to remove chromatin that stuck non-specifically, then the complexes are eluted, crosslinks are reversed by heating at 65 °C for several hours, and proteins and RNA are digested before the DNA is purified. A parallel IP with non-specific IgG, or a mock IP without antibody, estimates how much DNA comes down regardless of the target.',
      'Everything depends on the antibody. Polyclonal antibodies vary by lot and animal; monoclonals are consistent but may recognise a single epitope that fixation masks. Many commercial antibodies cross-react with related histone modifications (H3K4me2 vs me3, H3K27me3 vs H3K9me3) or with unrelated proteins, and some do not work in ChIP at all. ENCODE requires each antibody lot to pass characterisation (western blot or immunofluorescence plus a secondary test such as knockdown, mass spectrometry or a second independent antibody) before data are accepted. A failed or wrong antibody still produces a library and a peak list.',
      'The yield of a TF ChIP is often under a nanogram, sometimes picograms, so the library is amplified for 10–18 cycles and is low-complexity by construction. When a treatment changes the total amount of a mark genome-wide (an inhibitor, a histone methyltransferase knockout), ordinary normalisation to read depth hides the change; a fixed amount of chromatin from another species (Drosophila S2 cells, pulled down with an H2Av antibody, or spike-in nucleosomes) is added to every sample so that the foreign reads can serve as a scaling factor.',
    ],
    variants: [
      { name: 'Standard crosslinked ChIP (X-ChIP)', text: 'Formaldehyde fixation, sonication, antibody, protein A/G beads. TFs and histone marks.' },
      { name: 'Native ChIP (N-ChIP)', text: 'No fixation, MNase-digested chromatin; histone marks only; higher efficiency, nucleosome resolution.' },
      {
        name: 'Spike-in normalised ChIP (ChIP-Rx)',
        text: 'Drosophila chromatin plus H2Av antibody added at a fixed ratio; reads aligned to the dm6 genome give the per-sample scaling factor.',
      },
      { name: 'Tagged-protein ChIP (FLAG, HA, GFP)', text: 'Avoids antibody problems but requires a tagged construct; over-expression changes binding.' },
      { name: 'Low-input / carrier ChIP, ChIPmentation', text: 'Tn5 tagmentation of bead-bound chromatin instead of ligation; fewer losses, Nextera adapters in the reads.' },
    ],
    data: [
      'The peak set is the antibody’s specificity, not the protein’s biology: a cross-reacting antibody produces peaks that follow a different mark’s distribution, and a non-functional one produces input-like “peaks” at open chromatin.',
      'Low yield drives high PCR duplication (20–60 % is common for TF ChIP) and a library complexity that caps the useful depth; `preseq` saturates early.',
      'Fraction of reads in peaks (FRiP) is the single most informative number: ENCODE expects > 1 % for TFs (good TF ChIPs reach 5–30 %) and higher for point-source histone marks; broad marks spread signal and have lower FRiP by nature.',
      'Without a spike-in, a global loss or gain of a histone mark is invisible after depth normalisation and may even appear as the opposite: when the mark is lost almost everywhere, the few remaining sites look “up”.',
      'Input and IgG controls show the shearing and sequence bias of the genome in this sample; peaks also present in input or IgG are not binding.',
    ],
    check: [
      'FRiP, NSC/RSC and the deepTools `plotFingerprint` curve per sample; an IP whose fingerprint lies on the input curve did not enrich.',
      'Duplication rate versus IP yield and PCR cycles across samples; `preseq lc_extrap` for complexity.',
      'If a spike-in was used, the fraction of reads aligning to the spike-in genome per sample; it should be roughly constant across conditions unless the target mark changed globally.',
    ],
    ask: [
      'Which antibody (vendor, catalogue number, lot), and what validation exists for it in ChIP for this organism? Same lot for all samples?',
      'How much DNA came out of each IP and how many PCR cycles were used? Was an input and/or IgG made from the same chromatin?',
      'Was a spike-in added, and could the treatment change the total amount of the target genome-wide?',
    ],
    artifacts: [
      'antibody-cross-reactivity',
      'low-frip',
      'spike-in-normalisation',
      'hyperchipable-regions',
      'duplicates',
      'low-input',
    ],
  },

  'tethered-cleavage': {
    title: 'Tethered cleavage: CUT&RUN and CUT&Tag',
    short: 'Instead of shearing everything and fishing out the target, an antibody tethers a nuclease (CUT&RUN) or a transposase (CUT&Tag) to the target inside intact cells, and only the DNA next to it is cut and released. Very low background, very low input, and different QC expectations.',
    inputs: '5 000 to 500 000 unfixed or lightly fixed cells or nuclei bound to concanavalin A beads; antibody; pA/G-MNase or pA-Tn5',
    outputs: 'CUT&RUN: short DNA fragments released into the supernatant, ready for ligation-based library prep. CUT&Tag: fragments already carrying adapters, ready for PCR',
    bench: [
      'Cells are bound to concanavalin A-coated magnetic beads, permeabilised with digitonin and incubated with the primary antibody, which binds its target in situ. In CUT&RUN, a fusion of protein A/G with micrococcal nuclease is added; it binds the antibody and sits inactive until calcium is added at 0 °C, when it cuts the DNA on either side of the target for a few minutes before chelation stops it. The cut fragments diffuse out of the nuclei into the supernatant while the rest of the genome stays inside, so what is sequenced is almost entirely target-adjacent DNA. The E. coli DNA that co-purifies with the pA/G-MNase preparation is present in every reaction at a fixed amount and serves as a built-in spike-in.',
      'CUT&Tag replaces the nuclease with a protein A–Tn5 fusion loaded with sequencing adapters. Activated with magnesium, Tn5 inserts adapters on both sides of the target, so the DNA comes out of the cell already tagmented; after reversing permeabilisation and a protein digest, the only library step is PCR (typically 12–16 cycles). Because Tn5 prefers open chromatin, CUT&Tag works very well for active marks and for H3K27me3 but can be weak for many transcription factors and for marks in compact chromatin; untethered Tn5 also produces a low-level ATAC-like background at open regions.',
      'Both methods need far fewer cells (down to single cells) and far fewer reads (3–10 million is often enough) than ChIP, because the background is so low. That same property changes the controls: an IgG CUT&RUN yields very little DNA and its library is dominated by E. coli carry-over and open-chromatin background, and peak callers tuned to ChIP’s uniform background (MACS2 with default settings) behave differently; SEACR was written for this signal shape. Fragment sizes carry information: sub-nucleosomal fragments (< 120 bp) come from TF sites, nucleosomal fragments (150–300 bp) from flanking nucleosomes.',
    ],
    variants: [
      { name: 'CUT&RUN (pA/G-MNase)', text: 'Ligation-based library afterwards; works for TFs and histone marks; E. coli spike-in built in.' },
      { name: 'CUT&Tag (pA-Tn5)', text: 'Library made in situ; best for histone marks; Nextera adapters in the reads; 2×50 is sufficient.' },
      { name: 'CUTAC / ATAC-like variants', text: 'Deliberately exploit untethered Tn5 at open chromatin; interpret as accessibility, not binding.' },
      { name: 'Single-cell CUT&Tag, multimodal (nano-CT, Paired-Tag)', text: 'Combinatorial barcoding; sparse per-cell signal, same bulk failure modes.' },
    ],
    data: [
      'Background is near zero: most reads fall in or near peaks, FRiP of 30–80 % is normal, and a few million reads suffice. A CUT&RUN library with ChIP-like 1–5 % FRiP is a failed experiment, not a “noisy” one.',
      'Fragment length is informative: a bimodal insert distribution with a sub-nucleosomal peak (< 120 bp) and a mono-nucleosomal peak (~150–200 bp) is expected; TF binding footprints come from the short fraction. Paired-end sequencing is needed to use this.',
      'A sizeable fraction of reads may align to E. coli (CUT&RUN) or to nothing; the E. coli fraction rises when the target is scarce and can be used for scaling across samples.',
      'CUT&Tag reads start with the Tn5 adapter context; trim `CTGTCTCTTATACACATCT`, not the TruSeq sequence. Duplicates are common at the low input used; remove them unless the target is a point source saturated by depth.',
      'Open-chromatin background from untethered Tn5 means that peaks at strong promoters and enhancers can appear for any antibody, including IgG; compare peak sets against an ATAC-seq or IgG CUT&Tag track.',
    ],
    check: [
      'Insert-size histogram (paired-end): bimodal with a sub-nucleosomal peak for TFs; a single broad 300–500 bp peak suggests non-specific cleavage or over-digestion.',
      'Fraction of reads aligning to E. coli (CUT&RUN) per sample; FRiP with SEACR or MACS2 peaks; comparison of IgG peaks with the target’s peaks.',
      'Total yield and PCR cycle count per sample; CUT&Tag libraries with > 20 cycles are usually low complexity.',
    ],
    ask: [
      'CUT&RUN or CUT&Tag, which pA/G-enzyme lot, how many cells, and how long was the digestion or tagmentation?',
      'Was an IgG control run alongside, and was the sequencing paired-end?',
      'How was normalisation done: depth, E. coli spike-in, or an added spike-in?',
    ],
    artifacts: ['low-frip', 'hyperchipable-regions', 'spike-in-normalisation', 'adapter-readthrough', 'duplicates', 'low-input'],
  },

  'enrichment-qc': {
    title: 'From reads to peaks',
    short: 'Computational, but it defines what a “binding site” is. Reads are aligned, duplicates and blacklisted regions removed, enrichment is measured against input, and peaks are called and reconciled across replicates. Each setting changes which sites exist.',
    inputs: 'FASTQ for IP, input and/or IgG, and any spike-in genome',
    outputs: 'Filtered BAMs, signal tracks (bigWig), peak sets (narrowPeak / broadPeak), QC tables (FRiP, NSC/RSC, IDR)',
    bench: [
      'Computational, but it determines the result. Reads are aligned (bowtie2 or bwa), low-MAPQ and multi-mapping reads are dropped, and duplicates are marked. Removing duplicates is the default and is right for most libraries, but at a strongly enriched point source with deep sequencing, identical fragments arise legitimately and removal caps the peak height; paired-end data and UMIs resolve this. Reads in the ENCODE blacklist (centromeres, satellite repeats, a few hundred regions that are high in every experiment regardless of antibody) are removed because they otherwise dominate peak lists and correlations.',
      'For single-end data the fragment length is estimated by cross-correlation between strands; the strand shift at which the correlation peaks is the fragment length, and its height relative to the background and to the read-length “phantom peak” gives NSC and RSC. A library with RSC below ~0.8 did not enrich. The deepTools fingerprint plot shows how concentrated the reads are: an input is a near-diagonal line, a good TF ChIP has a steep rise at the end, and an IP that follows the input line is indistinguishable from it.',
      'Peaks are called against the matched input (MACS2 for sharp TF peaks, broad mode or SICER/epic2 for broad histone domains, SEACR for CUT&RUN’s sparse background). Replicates are reconciled by IDR or by requiring overlap. Signal is then normalised: per million reads by default, or by spike-in scaling factors when the total amount of the mark may differ between conditions. Differential binding on depth-normalised data assumes that most sites do not change; when the treatment removes the mark globally, that assumption fails silently.',
    ],
    variants: [
      { name: 'ENCODE ChIP-seq pipeline', text: 'Standardised QC (NSC/RSC, FRiP, IDR) and thresholds; a good default reference for what “passing” means.' },
      { name: 'MACS2 narrow / broad', text: 'Local Poisson model against input; broad mode merges nearby enriched regions for histone domains.' },
      { name: 'SEACR / GoPeaks for CUT&RUN and CUT&Tag', text: 'Threshold on signal relative to IgG or a top fraction; MACS2 defaults over-call at low background.' },
      { name: 'Spike-in scaling (ChIP-Rx, E. coli)', text: 'Scale each sample by reads in the spike-in genome; required when global changes are plausible.' },
    ],
    data: [
      'Peak numbers depend on depth, caller and threshold: a sample with twice the depth “has more peaks” for no biological reason; compare FRiP and signal at a fixed set of sites instead of peak counts.',
      'Blacklisted and hyper-ChIPable regions produce peaks in every sample, including IgG; a peak list that was not blacklist-filtered contains the same few hundred regions on top in every experiment.',
      'NSC/RSC and FRiP separate enrichment failures from biology: a condition with “no binding” and an RSC of 0.7 is a failed IP, not a lost binding programme.',
      'Depth normalisation erases global changes; spike-in normalisation can invert them if the spike-in amount was not constant. Which normalisation was used is part of the result.',
      'IDR-thresholded peak sets are conservative and reproducible but drop weak real sites; union sets are sensitive and contain noise. Neither is “the binding sites”.',
    ],
    check: [
      'Per-sample NSC, RSC, FRiP, fraction of reads in blacklist, duplicate rate and spike-in fraction in one table; look for samples that fall off the group.',
      'Fingerprint plot of all IPs and inputs together; peak overlap of IgG or input “peaks” with the IP peaks.',
      'The pipeline’s normalisation method and whether the peak caller matched the signal type (narrow, broad, sparse background).',
    ],
    ask: [
      'Which pipeline and caller, and were peaks called against a matched input from the same chromatin batch?',
      'Were duplicates and blacklist regions removed, and were replicates merged before or after peak calling?',
      'Is a global change in the target expected, and if so, how was it normalised?',
    ],
    artifacts: ['hyperchipable-regions', 'low-frip', 'spike-in-normalisation', 'duplicates', 'batch-effects'],
  },

  'rna-immunoprecipitation': {
    title: 'RNA–protein crosslinking and immunoprecipitation',
    short: 'Cells are UV-crosslinked (or not, for RIP), lysed, the RNA is partially digested, and one RNA-binding protein is pulled down with an antibody together with the RNA fragments it was touching. What comes off the beads is tiny, biased toward abundant RNAs, and only as specific as the antibody.',
    inputs: 'Cultured cells or tissue, typically 10–20 million cells per eCLIP replicate; an antibody validated for IP',
    outputs: 'Picograms of 20–100 nt RNA fragments that were bound by the protein, plus a size-matched input control',
    bench: [
      'In eCLIP (and its ancestors HITS-CLIP and iCLIP), living cells are irradiated with 254 nm UV on ice. UV forms a covalent bond only where an amino acid and a nucleobase are in direct contact, so the crosslink marks the actual binding site to within a nucleotide, and it does not crosslink protein to protein. The efficiency is low (often 1–5 % of complexes), which is one reason the input is measured in tens of millions of cells. PAR-CLIP instead feeds cells 4-thiouridine and crosslinks at 365 nm, which is more efficient and leaves a T→C signature in the reads. Native RIP-seq skips crosslinking altogether: the complex is held together only by its own affinity, which works for stable complexes but lets weak or transient partners fall off, and lets RNAs and proteins that never met in the cell re-associate in the lysate.',
      'After lysis, the RNA is partially digested with RNase I (eCLIP) or micrococcal nuclease so that only the footprint under the protein survives. The dose is titrated: too much leaves fragments under ~20 nt that cannot be mapped uniquely and destroys structured sites, too little leaves long fragments that map but give no resolution and more background. The antibody is bound to protein A/G beads, incubated with the lysate, and washed. CLIP washes are harsh (high salt, detergents) because the crosslink survives them; RIP washes must be mild, so RIP carries more non-specific RNA. In eCLIP the complexes are then run on an SDS-PAGE gel, transferred to nitrocellulose, and the membrane region from the protein’s size up to ~75 kDa above it is cut out, which removes free RNA and RNA bound to other proteins. Proteinase K digests the protein, leaving a short amino-acid remnant at the crosslink site on the RNA.',
      'The controls determine what a “target” means. eCLIP runs a size-matched input (SMInput): the same lysate, same gel region, no immunoprecipitation, so that enrichment is measured against everything of that size rather than against total RNA. RIP uses an IgG pulldown and an input. Without such a control, the list of bound RNAs is simply the list of abundant RNAs: rRNA, mitochondrial rRNA, snRNAs and the top few hundred mRNAs stick to any bead.',
    ],
    variants: [
      { name: 'eCLIP (ENCODE standard)', text: '254 nm UV, RNase I, SDS-PAGE and membrane transfer, SMInput control, UMIs. Two biological replicates plus SMInput is the ENCODE minimum.' },
      { name: 'iCLIP / iCLIP2 / irCLIP', text: 'Same crosslinking; the library is circularised after RT so truncated cDNAs are captured; infrared or radiolabel visualisation.' },
      {
        name: 'PAR-CLIP',
        text: '4-thiouridine plus 365 nm UV. Crosslink sites show as T→C transitions in the reads; needs cells that take up the nucleoside, so it is mostly cell-line work.',
      },
      {
        name: 'Native RIP-seq',
        text: 'No crosslink, mild washes, whole transcripts recovered; sequenced with a standard RNA-seq library. Reports which transcripts co-purify, not where on them the protein sat.',
      },
      { name: 'fRIP / formaldehyde RIP', text: 'Formaldehyde fixation instead of UV; crosslinks protein–protein as well, so indirect partners are captured.' },
    ],
    data: [
      'Enrichment is relative to the control. A peak caller run without SMInput or IgG returns the abundant RNAs of the cell; the same gene list appears for unrelated proteins.',
      'Crosslinking efficiency and RNase dose set fragment length and therefore mappability: eCLIP fragments of 20–60 nt map uniquely in most of the transcriptome but not in repeats, snRNA families or rRNA, which is why rRNA and multi-mappers are discarded early.',
      'RIP-seq reads cover whole transcripts with an RNA-seq-like profile; CLIP reads form narrow pile-ups. A broad, gene-wide signal in a CLIP dataset is background, not binding.',
      'Antibody specificity is the dominant variable: a cross-reacting antibody pulls down a second RNA-binding protein and its targets, which looks like a biologically interesting dual specificity.',
      'Target lists between labs differ more by antibody lot, RNase dose and control type than by biology; be cautious when comparing to a published list produced with another protocol.',
    ],
    check: [
      'Fraction of reads removed as rRNA, repeat-element or multi-mapping before peak calling, and the fraction of reads in peaks after SMInput normalisation; ENCODE flags eCLIP experiments below ~1–2 % reads in peaks.',
      'Peak overlap between the two biological replicates (IDR or simple reproducible-peak fraction); a reproducible-peak count under a few hundred usually means a weak IP.',
      'Whether the top targets are rRNA, mt-rRNA, snRNA or the most highly expressed mRNAs of that cell type: that is the control failing, not the protein’s preference.',
    ],
    ask: [
      'UV (254 or 365 nm), formaldehyde, or native? Which RNase, at what dose, and was the dose titrated for this protein?',
      'Which antibody (vendor, lot), and what control was sequenced: SMInput, IgG, input, or a knockout/knockdown IP?',
      'Was the IP validated by western blot and, for eCLIP, was the membrane region cut at the standard window above the protein’s size?',
    ],
    artifacts: ['abundance-driven-targets', 'rnase-overdigestion', 'low-input', 'rrna-reads', 'batch-effects'],
  },

  'clip-library': {
    title: 'CLIP library: adapters on RNA, truncating RT',
    short: 'Adapters are ligated to the tiny RNA fragments, reverse transcription stops at the crosslink, a second adapter goes onto the cDNA, and many PCR cycles turn picograms into a library. The read start is the data.',
    inputs: 'Picograms of protein-footprint RNA fragments (20–100 nt) with a peptide remnant at the crosslink site',
    outputs: 'Single-end library whose Read 1 begins with a UMI and in-line barcode followed by the cDNA; Read 1 start = crosslink site + 1',
    bench: [
      'The RNA fragments are dephosphorylated, then a 3′ RNA adapter carrying an in-line barcode and a random UMI is ligated with T4 RNA ligase; in eCLIP this happens on the beads, before the gel. After proteinase K release the RNA is reverse-transcribed. The reverse transcriptase cannot read through the amino-acid remnant left at the crosslink, so most cDNAs end one nucleotide before the crosslinked base: the 5′ end of the cDNA, which becomes the start of Read 1, points at the binding site. In HITS-CLIP and PAR-CLIP, where read-through products are kept, the information is instead a deletion or a T→C mismatch at the site.',
      'A second adapter is then ligated to the 3′ end of the single-stranded cDNA (eCLIP, with a ssDNA ligase) or the cDNA is circularised and re-cut (iCLIP), which is what makes truncated cDNAs clonable; a standard RNA-seq library would need read-through to the first adapter and would lose them. PCR follows with 15–25 cycles, because the input is picograms; the cycle number is often chosen from a qPCR on a test aliquot. Adapter–adapter products are the most abundant species at this stage and are removed by gel or bead size selection at ~140–160 bp.',
      'Because the UMI is ligated before PCR, reads sharing a UMI and a start position are PCR copies of one molecule and are collapsed after alignment. RIP-seq does not go this way: its recovered RNA is long, so it is fragmented, reverse-transcribed with random primers and made into a stranded RNA-seq library like any other, and the reads cover whole transcripts.',
    ],
    variants: [
      {
        name: 'eCLIP two-ligation',
        text: '3′ RNA adapter on beads, ssDNA adapter on cDNA; UMI 10 nt at the start of Read 1 in the single-end version, in-line barcodes distinguish replicates on the same gel.',
      },
      { name: 'iCLIP circularisation', text: 'cDNA with a barcoded RT primer is circularised and linearised by restriction; UMI at the 5′ end of the read.' },
      {
        name: 'HITS-CLIP / PAR-CLIP read-through',
        text: 'Both adapters on the RNA before RT; only cDNAs that read through the crosslink are captured; sites appear as deletions (HITS-CLIP) or T→C (PAR-CLIP).',
      },
      { name: 'seCLIP / single-end eCLIP', text: 'Same chemistry, single-end sequencing with the UMI in Read 1; the ENCODE default since 2017.' },
    ],
    data: [
      'The first nucleotides of Read 1 are the UMI and in-line barcode, not biology: they must be moved into the read name (`umi_tools extract`, Cutadapt `-u`) before alignment, or every read mis-aligns by that offset.',
      'Reads are short (often 20–40 nt of genomic sequence after trimming) and pile up with identical start coordinates. The pile-up is the crosslink signal, so duplicate marking by position alone would delete the data; deduplicate by UMI plus start position (`umi_tools dedup`) instead.',
      'Duplication rates of 50–90 % are normal: picogram input through 20 PCR cycles. What matters is the number of unique molecules after UMI collapsing, not the raw read count.',
      'Peaks are called against SMInput with CLIPper, PureCLIP, PEAKachu or omniCLIP; enrichment is a log₂ fold change and p-value per peak, and ENCODE keeps peaks with log₂FC ≥ 3 and p ≤ 10⁻³. Crosslink-site pile-ups can be called at single-nucleotide resolution from read starts (iCLIP, eCLIP).',
      'In PAR-CLIP the T→C transitions are the signal and must not be filtered as sequencing errors or SNPs; in HITS-CLIP the same is true of single-nucleotide deletions at the site.',
    ],
    check: [
      'Adapter-dimer fraction and the read-length histogram after trimming: a spike at 0–10 nt inserts is dimer, and a library that is mostly dimer cannot be rescued by depth.',
      '`umi_tools dedup` log: unique molecules per sample and the ratio of reads to molecules; replicate agreement should be judged on unique molecules.',
      'Read-start distribution relative to the peak summit: a sharp position-specific stack supports a crosslink site; a flat profile across a transcript indicates background or a RIP-type library.',
    ],
    ask: [
      'eCLIP, iCLIP, PAR-CLIP, HITS-CLIP or RIP-seq? Where is the UMI and how long is it, and what are the in-line barcodes per sample?',
      'How many PCR cycles, and what was the adapter-dimer fraction on the final trace?',
      'Was the library sequenced single-end, and does Read 1 start at the cDNA 5′ end (truncation site) or the 3′ end?',
    ],
    artifacts: ['crosslink-truncation', 'duplicates', 'umis', 'adapter-dimers', 'low-input'],
  },

  'probe-hybridization': {
    title: 'Probe hybridization',
    short: 'A finished, indexed shotgun library is denatured and left to anneal for hours with biotinylated baits that match the targets. The probe set, not the genome, now decides what can be seen.',
    inputs: 'Indexed, pre-capture-amplified library (typically 100–500 ng per library, 8–16 libraries per pool)',
    outputs: 'Bait–library hybrids in solution, with off-target library still present',
    bench: [
      'Capture starts from a complete shotgun library: fragmented, adapter-ligated, indexed and amplified for typically 6–10 cycles so that there is enough mass to hybridise. The library is dried or concentrated, mixed with blockers, denatured at 95 °C and incubated with a pool of biotinylated single-stranded baits, 80–120-mers of DNA or RNA tiled across the targets. Hybridisation runs at ~65 °C for anywhere from 4 h (fast protocols) to 16–24 h (classic SureSelect); the long incubation is what lets rare target molecules find a bait. Two kinds of blocker are in the tube: Cot-1 DNA (or synthetic repeat blockers) soaks up repetitive sequence so that an Alu in a target fragment does not pull in every Alu in the library, and adapter blockers (universal or index-specific oligos) cover the adapter ends so that library molecules do not daisy-chain to each other through shared adapter sequence. Weak adapter blocking is a main source of off-target reads.',
      'Most facilities capture in multiplex: 8–16 pre-indexed libraries are pooled by mass into one hybridisation. This saves bait but means the libraries compete for the same baits, so a library that was under-quantified ends up under-represented after capture, and any sequence shared between libraries (an abundant transcript, a viral genome at high titre) can bridge molecules of two samples through the bait during hybridisation. The cross-talk this produces is capture-pool specific, unlike index hopping, which is lane specific.',
      'The probe design decides the data before sequencing starts. Tiling density (1× to 2× overlap), probe GC balancing, whether probes were boosted for hard regions, and the reference used to design them all differ between vendors and versions (SureSelect v6 vs v7/v8, Twist Core vs Comprehensive Exome, IDT xGen v1 vs v2). Regions without a probe, such as novel exons, poorly annotated genes or any sequence more than ~10–15 % divergent from the design, are invisible. The baits also pull in 50–150 bp of flanking sequence on each side of every target (“padding”), so coverage tails off into introns rather than stopping at the exon boundary. Viral and pathogen capture panels (VirCapSeq-VERT, Twist Comprehensive Viral Research Panel) are the same chemistry with probes designed across hundreds to thousands of viral genomes, where divergence from the design is the dominant effect on coverage.',
    ],
    variants: [
      {
        name: 'Whole-exome capture (SureSelect, Twist, xGen)',
        text: 'Tens of megabases of target, typically 60–80 % on-target. Vendor and version change which exons are covered; compare samples only within one design.',
      },
      {
        name: 'Targeted gene panels',
        text: 'Kilobases to a few megabases. On-target fraction is lower and more variable; depth is high (500–5,000×) and duplicate rates are correspondingly high.',
      },
      {
        name: 'Viral / pathogen capture',
        text: 'Probes tiled across many viral genomes; works on degraded or low-titre material from a high-host background. Coverage falls with divergence from the probes, and a virus absent from the design is simply not seen.',
      },
      {
        name: 'RNA baits vs DNA baits',
        text: 'RNA baits (classic SureSelect) hybridise more tightly and are destroyed afterwards; DNA baits (Twist, xGen) are more stable. The on-target and GC behaviour differ slightly between the two.',
      },
    ],
    data: [
      'Coverage exists only where there was a probe. A gene with zero coverage in every sample is usually a design gap, not a homozygous deletion; check the target BED and the probe BED before interpreting.',
      'Coverage tails into the flanks of every target. Variants called in the padding (±50–100 bp) have lower depth and are often filtered by one pipeline and kept by another, which causes apparent discordance between callers.',
      'Different exome designs across a cohort look like a batch effect: whole regions covered in one batch and absent in another, and systematic depth differences in GC-rich targets.',
      'Multiplex capture gives capture-pool-specific cross-talk: low-level alleles shared only among the libraries that sat in the same hybridisation tube.',
      'Divergent targets are under-captured, so in viral capture and in population genetics of non-reference strains a region with low or no coverage may be present but too different from the baits.',
    ],
    check: [
      'Get the exact probe/target BED (vendor, version, padding) and intersect your coverage with it; compute the fraction of zero-coverage targets per sample (`CollectHsMetrics` ZERO_CVG_TARGETS_PCT).',
      'Plot per-target normalised coverage against target GC for one sample; a steep fall above ~65 % GC is the probe set, not the sample.',
      'Record which samples were captured together and test whether low-frequency shared variants cluster by capture pool.',
    ],
    ask: [
      'Which probe set, which version, and was the same design used for every sample? Can we have the target and probe BED files?',
      'How many libraries per capture pool, and which samples shared a pool? Were index-specific adapter blockers used?',
      'Hybridisation time, and were any regions boosted or custom probes added?',
    ],
    artifacts: ['probe-dropout', 'off-target-reads', 'padding-artefacts', 'gc-bias', 'index-hopping', 'batch-effects'],
  },

  'capture-pulldown': {
    title: 'Streptavidin pulldown & post-capture PCR',
    short: 'Beads pull the bait–library hybrids out of solution, washes strip off-target molecules, and a second PCR rebuilds a sequenceable library from a few nanograms. This is where capture libraries get their duplicates.',
    inputs: 'Hybridisation reaction (bait–library hybrids plus unbound library)',
    outputs: 'Enriched, re-amplified library, typically 60–80 % on-target for exomes',
    bench: [
      'Streptavidin-coated magnetic beads bind the biotin on the baits and, with it, every library molecule annealed to a bait. The supernatant, which holds the bulk of the library, is discarded. The beads are then washed at raised temperature (typically 65 °C) in buffers of decreasing salt. Each wash is a stringency decision: molecules that are only partly complementary to a bait, such as a divergent viral strain, a paralogue or a fragment with a short overlap, come off first. Too-stringent washing loses exactly the targets that are hardest to capture; too-lax washing keeps off-target fragments that were held by a few bases of adapter or repeat. The on-target fraction, usually 60–80 % for an exome and anywhere from 10 to 70 % for small panels, is set by these washes together with the blocking in the previous step.',
      'What is left on the beads is a few nanograms at most, far below what a flow cell needs, so the library is amplified again, typically 8–14 cycles (more for small panels and for viral capture from low-titre samples). This post-capture PCR is the main source of duplicate reads in capture data: the number of distinct molecules per target was fixed when the beads were washed, and every cycle after that only copies them. High depth over a small target therefore means that the same few hundred molecules per target are sequenced again and again. The duplicate rate after marking is the honest measure of how many molecules were captured, and it rises with smaller panels, lower input and more cycles. The post-capture library is quantified and sized like any other library (Bioanalyzer/TapeStation plus qPCR); a shift to shorter fragments or a visible 120–150 bp peak after capture means adapter dimers or bait–adapter products survived the washes.',
      'Two refinements are common. A second round of hybridisation and pulldown (“double capture”) raises the on-target fraction from, say, 30 % to over 80 % for small panels and for viral capture out of a host-dominated sample, at the cost of more PCR and fewer unique molecules. For low-frequency variant calling (liquid biopsy, minimal residual disease) the pre-capture adapters carry UMIs or duplex UMIs, so that after capture the PCR copies can be collapsed into molecule-level or strand-aware consensus reads, which is the only way to tell a 0.5 % allele from a polymerase error.',
    ],
    variants: [
      { name: 'Single capture', text: 'Standard for exomes. One hybridisation, one pulldown, 8–12 post-capture cycles.' },
      { name: 'Double capture', text: 'Second hybridisation of the first eluate; typical for small panels and viral capture. Higher on-target, lower complexity, more cycles.' },
      {
        name: 'UMI / duplex-UMI capture (cfDNA panels)',
        text: 'Adapters carry molecular barcodes before capture; reads are collapsed per molecule or per original duplex. Required for allele fractions below ~1 %.',
      },
      { name: 'Fast / automated protocols', text: 'Shortened washes and hybridisation on liquid handlers; slightly lower on-target but far more reproducible between batches.' },
    ],
    data: [
      'Duplicate rates of 10–30 % for exomes and 50–90 % for deep small panels are expected; raw depth overstates the number of molecules observed by that factor. Report and reason with deduplicated depth.',
      'Allele fractions at a site are drawn from a few hundred molecules, so a heterozygous site at 200× raw depth can read 30:70 after duplicates are collapsed. Expect wider allele-fraction distributions than in WGS at the same nominal depth.',
      'Insert size after capture is often shorter and tighter than before it, because short fragments hybridise and wash through more efficiently; the insert distribution of a capture library is not evidence about the input DNA.',
      'Off-target reads are not junk: they are a 0.1–2× low-pass genome of the same sample, usable for sex check, contamination estimates and coarse CNV, but not for variant calling.',
      'Stringent washing or a divergent sample removes partially matching molecules, so regions of low coverage can mean “different from the probes” rather than “absent”, especially in viral capture and in non-reference strains.',
    ],
    check: [
      'Picard `MarkDuplicates` percent duplication and `EstimateLibraryComplexity` per sample; plot against on-target fraction and input mass.',
      'Pre- vs post-capture Bioanalyzer traces and library yields, if the facility will share them; a post-capture peak near 120–150 bp is dimer.',
      'Allele-fraction histogram of known heterozygous SNPs after deduplication: a wide spread around 0.5 means few molecules per site.',
    ],
    ask: [
      'Single or double capture? How many post-capture PCR cycles, and were they the same for every sample?',
      'Were UMIs or duplex adapters used, and are they in the read or in the header?',
      'What was the measured on-target fraction and duplicate rate on the facility’s QC run?',
    ],
    artifacts: ['duplicates', 'pcr-jackpotting', 'off-target-reads', 'low-input', 'adapter-dimers', 'insert-size', 'umis'],
  },

  'on-target-metrics': {
    title: 'On-target metrics and what they allow',
    short: 'Which reads count, how even the coverage is and how many molecules stand behind each base are set by the target file and the capture, not the aligner. The metrics decide which analyses the data can support.',
    inputs: 'Aligned, duplicate-marked BAM; target and probe BED files; padding setting',
    outputs: 'HsMetrics table; per-target coverage; a defined callable region',
    bench: [
      'Computational, but it defines the experiment. Alignment is ordinary, but everything after it is conditioned on an interval file. The target BED (exons, panel regions, viral genomes) and the padding applied to it decide which reads are “on target”, which bases are “callable”, and which variants are reported at all. Two pipelines given the same BAM but different padding (0 vs 100 bp) produce different variant lists and different coverage numbers for the same sample. Duplicates must be marked before coverage is computed, otherwise depth reports count PCR copies as independent molecules.',
      'Picard `CollectHsMetrics` is the standard summary: PCT_SELECTED_BASES (on-target fraction), MEAN_TARGET_COVERAGE, PCT_TARGET_BASES_20X and 30X (how much of the target is usable), FOLD_80_BASE_PENALTY (how much more sequencing it would take to lift the lowest 20 % of targets to the mean; 1.5–2.5 is typical, higher means uneven capture), ZERO_CVG_TARGETS_PCT and AT_DROPOUT / GC_DROPOUT. Coverage drops out predictably in GC-rich first exons and promoters, in targets overlapping pseudogenes or segmental duplications where reads lose MAPQ, and in anything divergent from the probe design. Because probe efficiency dominates per-target coverage, copy-number calling from capture data needs a panel of normals captured with the same design and batch to divide out the probe effect; a single-sample depth plot is mostly a picture of the probe set.',
      'Variant allele fractions behave differently from WGS. At 100× raw depth a capture site may rest on 40 unique molecules, so allele fractions scatter widely and low-frequency calls need UMI-collapsed depth, not raw depth, in the denominator. Off-target reads form a sparse genome-wide layer that is good for sex determination, contamination estimation (VerifyBamID), ancestry and coarse CNV, and bad for anything that needs confident genotypes. In viral capture the host fraction is reported separately, genome coverage is interpreted against divergence from the probes (a 70 %-covered genome may be a divergent strain, not a low titre), and the absence of a virus means only that nothing hybridised to the probes that were present.',
    ],
    variants: [
      {
        name: 'Exome germline pipeline',
        text: 'HsMetrics on padded targets, GATK or DeepVariant restricted to the intervals, CNV with a panel of normals (GATK gCNV, ExomeDepth, CNVkit).',
      },
      {
        name: 'Deep somatic panel',
        text: 'UMI consensus (fgbio), per-molecule depth, error models per trinucleotide context, strict interval restriction; allele fractions reported with molecule counts.',
      },
      {
        name: 'Viral capture reporting',
        text: 'Host-subtracted reads, per-genome breadth and depth, probe-coverage mask, consensus with N-masking below a depth threshold; absence is “not detected with this panel”.',
      },
    ],
    data: [
      'Variant lists depend on the interval file and padding at least as much as on the caller; keep the BED under version control next to the pipeline.',
      'FOLD_80_BASE_PENALTY above ~3 and ZERO_CVG_TARGETS_PCT above a few percent flag a poor capture; both are per sample and often per batch.',
      'Single-sample depth plots reflect probe efficiency; CNV calls without a matched panel of normals are mostly probe artefacts.',
      'Allele-fraction noise is set by unique molecules per site, not by raw depth; report deduplicated or UMI-consensus depth with every variant.',
      'Coverage breadth of a viral genome mixes titre with divergence from the baits; a partial genome with high depth on the covered part suggests divergence, a partial genome with low depth everywhere suggests low titre.',
    ],
    check: [
      '`CollectHsMetrics` per sample with the exact vendor BEDs; compare PCT_SELECTED_BASES, FOLD_80 and PCT_TARGET_BASES_20X across batches.',
      'Per-target coverage heatmap across all samples: targets missing in every sample are design gaps; targets missing in one batch are a capture failure; a target missing in one sample may be a deletion.',
      'VerifyBamID or a sex check using off-target reads; it is free with the data.',
    ],
    ask: [
      'Which interval file and padding did the facility use for its QC numbers, so ours are comparable?',
      'Is there a panel of normals captured with the same design and in the same period for CNV work?',
      'For viral panels: the list of genomes in the design and its version, so that “not detected” can be qualified.',
    ],
    artifacts: ['off-target-reads', 'probe-dropout', 'padding-artefacts', 'pcr-jackpotting', 'uneven-depth'],
  },

  'tiled-amplicon-pcr': {
    title: 'Tiled multiplex amplicon PCR',
    short: 'Two pools of ~100 primer pairs each amplify overlapping ~400 bp pieces of a known viral genome from the cDNA. Coverage is decided here, amplicon by amplicon, by the primers, the viral load and the cycle count.',
    inputs: 'First-strand cDNA from the viral RNA extract (random-hexamer primed)',
    outputs: 'Two tubes of overlapping amplicons (pool 1 and pool 2) per sample, later combined',
    bench: [
      'A primer scheme (ARTIC V3, V4.1, V5.3.2 for SARS-CoV-2; schemes exist for Zika, Ebola, mpox, influenza, RSV, HIV, and any phage or virus whose genome is known) tiles the genome with amplicons of roughly 400 bp (Midnight and some newer schemes use ~1,200 bp) that overlap their neighbours by 50–100 bp. Neighbouring amplicons overlap, so if they were in one tube the forward primer of amplicon n and the reverse primer of amplicon n+1 would make a short product that would out-compete everything else. The scheme is therefore split into two pools of alternating amplicons (odd in pool 1, even in pool 2), each run as a separate multiplex PCR of typically 25–35 cycles with a hot-start polymerase (Q5 is the ARTIC standard). The pools are then combined and taken into library prep. Commercial kits (Illumina COVIDSeq, QIAseq DIRECT, Swift/xGen Amplicon, Paragon CleanPlex) do the same thing with proprietary primers and sometimes more pools.',
      'Each amplicon is its own small PCR with its own efficiency. Anything that weakens one primer pair lowers that amplicon relative to its neighbours: a mutation under a primer (the Alpha and Delta waves each knocked out ARTIC V3 amplicons, which is why V4 and V4.1 exist), primer degradation, pool imbalance, or a primer concentration that was never quite right. Below a few hundred genome copies (diagnostic Ct above ~30) amplification becomes stochastic: some amplicons simply never find a template, the ones that do are amplified from one or two molecules and show as near-100 % duplication, and the amplicon-to-amplicon imbalance grows from 10-fold to 1,000-fold. At the same time the empty reactions make primer dimers and chimeras between amplicons because the primers have nothing else to anneal to.',
      'Because the method amplifies a few hundred molecules by a million-fold, it is exquisitely sensitive to contamination. Positive controls (synthetic RNA such as Twist controls, or a high-titre culture) and strong samples contaminate weak ones by aerosol or on the plate; a no-template control is run with every batch for this reason. The primer scheme name and version, and the BED file that goes with it, are not optional metadata: without them the analyst cannot trim primers or interpret a coverage gap.',
    ],
    variants: [
      {
        name: 'ARTIC V3 / V4.1 / V5.3.2 (~400 bp)',
        text: 'The open scheme most pipelines assume by default; versions differ in which amplicons exist and where their primers sit. V3 lost amplicons 64, 72 and 73 to lineage mutations.',
      },
      {
        name: 'Midnight (~1,200 bp, ONT)',
        text: 'Fewer, longer amplicons; fewer dropouts from single mutations but more sensitive to RNA degradation, since a 1,200 bp amplicon needs an intact 1,200 nt template.',
      },
      {
        name: 'Commercial kits (COVIDSeq, QIAseq DIRECT, xGen, CleanPlex)',
        text: 'Proprietary primers and their own BED files; some add a human control. The analyst needs the kit’s BED, not ARTIC’s.',
      },
      {
        name: 'Custom schemes (PrimalScheme, varVAMP)',
        text: 'Designed for any known genome, including phages and non-model viruses; coverage depends on how well the design reference matches the sample’s strain.',
      },
    ],
    data: [
      'Depth is amplicon-shaped: a staircase of plateaus with sharp edges at primer positions, not a smooth profile. A gap is a dropped amplicon, not a deletion, unless the reads on either side say otherwise.',
      'Every read starts at a primer; both read ends are fixed, so all reads of an amplicon look like duplicates. Duplicate marking would remove most of the data.',
      'The first ~22–30 bases of each read are primer, i.e. synthetic copies of the reference, and carry no information about the sample at that position.',
      'Coverage per amplicon follows the primer pair’s efficiency and the sample’s viral load, not the virus’s biology; it is not comparable between schemes or batches as a quantity.',
      'Low-template samples carry chimeras between amplicons, primer dimers, and whatever the positive control or the neighbouring well contained.',
    ],
    check: [
      'Per-amplicon depth table (`mosdepth` or `samtools bedcov` over the scheme’s insert BED): the pattern of low amplicons across samples, and whether it follows pool, Ct or primer version.',
      'The no-template control’s read count and consensus coverage; anything above a few hundred mapped reads means contamination in the batch.',
      'Insert-size or read-length histogram before trimming: amplicon length ± primers, with a short peak if primer dimers survived.',
    ],
    ask: [
      'Which primer scheme and version, and can you send the exact BED file? Were any primers spiked in or replaced?',
      'What was each sample’s diagnostic Ct, how many cycles were run, and were cycles adjusted by Ct band?',
      'Which positive control was used and where did it sit on the plate relative to my samples?',
    ],
    artifacts: [
      'amplicon-dropout',
      'amplicon-cross-contamination',
      'primers-in-reads',
      'primer-bias',
      'chimeras',
      'low-input',
      'duplicates',
    ],
  },

  'amplicon-consensus': {
    title: 'Primer trimming and consensus',
    short: 'Reads are aligned to the reference, primers are cut away by coordinate, depth is masked, and a consensus genome is called. Every N, every missed variant and most false ones come from decisions made here.',
    inputs: 'FASTQ from the amplicon library; the scheme’s primer BED; a reference genome',
    outputs: 'Primer-trimmed BAM, consensus FASTA with N where depth is low, a variant table with allele frequencies, lineage calls',
    bench: [
      'Computational, but it defines what the genome is. Reads are aligned to the reference (minimap2 or bwa mem), then primers are removed by position, not by sequence: `ivar trim`, the ARTIC pipeline’s `align_trim`, or `samtools ampliconclip` soft-clip the bases that fall inside a primer interval from the BED. Sequence-based trimming cannot work, because the primer is a perfect copy of the reference and is indistinguishable from the genome. A read that was amplified by one primer pair is only trusted outside that pair’s primers; a variant that sits under a primer is visible only in reads from the overlapping amplicon of the other pool, which covers that position with its insert. If the BED is for the wrong scheme version, primers are left in place and every sample looks reference-like under them, or genuine sequence is clipped away.',
      'Consensus calling then applies a depth mask: positions with fewer than a threshold of reads (ivar’s default `-m 10`, the ARTIC pipeline’s 20×) become N, and the base at the others is the majority allele above a frequency threshold (often 0.75 for ivar). A dropped amplicon therefore becomes a run of ~300 N, which some viewers and some lineage tools treat like a deletion or missing data, and which can make Nextclade or pangolin report lineage-defining sites as missing, with “scorpio” constellation conflicts and lower-confidence calls. Duplicates are never marked: by construction every read of an amplicon shares its ends.',
      'Minor variants come from the same alignments. Illumina data support a practical floor around 3–5 % allele frequency once amplification errors, primer-site artefacts and strand bias are controlled; ONT needs more. A minor variant can be within-host diversity, a mixed infection, cross-contamination from another sample, or an amplification or sequencing error, and the frequency alone does not say which. Wastewater and other pooled samples are deliberately mixtures, deconvolved into lineage proportions with tools such as Freyja from the frequencies of lineage-defining mutations.',
    ],
    variants: [
      { name: 'ARTIC fieldbioinformatics (ONT)', text: 'Each read is one amplicon; `align_trim` also normalises depth per amplicon; medaka or Clair3 for variants; 20× mask.' },
      {
        name: 'ivar / viralrecon (Illumina)',
        text: '2×150 or 2×250 reads that overlap heavily within a 400 bp amplicon; `ivar trim` then `ivar variants` and `ivar consensus`; nf-core/viralrecon wraps the lot with QC.',
      },
      { name: 'Wastewater and mixtures (Freyja, LCS)', text: 'No single consensus is meaningful; lineage abundances are estimated from allele frequencies and depth per site.' },
    ],
    data: [
      'The consensus is a function of three thresholds (depth mask, consensus frequency, minimum base quality) and the BED file; two labs can produce different genomes from the same FASTQ.',
      'Variants under primer positions are systematically missed or called wrong if primers were not trimmed, or if the other pool’s amplicon also dropped out.',
      'N runs are amplicon dropouts and align exactly to primer coordinates; a true deletion is spanned by reads with a gap in the alignment and is visible in the pileup.',
      'Allele frequencies are per-amplicon estimates from a handful of template molecules at low viral load; a 20 % minor variant from a Ct-35 sample may rest on two molecules.',
      'Coverage depth cannot be read as viral load or as a biological signal; it is primer efficiency times template availability.',
    ],
    check: [
      'Genome completeness (fraction non-N) against Ct; N runs listed with their coordinates and matched to amplicon inserts.',
      'Pipeline log for the BED file and scheme version actually used, and for the depth and frequency thresholds.',
      'Variant table: allele frequency, depth and strand counts per site; flag sites inside primer intervals and sites that are 1–5 % in many samples of one batch.',
    ],
    ask: [
      'Which pipeline, which BED file and which thresholds produced the consensus I was given? Can I have the trimmed BAM?',
      'Was anything run on the same plate at high titre, and did the no-template control come out clean?',
    ],
    artifacts: ['amplicon-dropout', 'primer-site-variants', 'amplicon-cross-contamination', 'duplicates', 'index-hopping'],
  },
};

export const stepOrderForIndex = Object.keys(steps);
