// Cross-cutting artefact index: things you see in the data, linked back to the
// bench steps that produce them. `looksLike` is what you observe; `causes`
// are step ids; `whatToDo` is the analysis response.

export const artifacts = {
  duplicates: {
    title: 'PCR duplicates',
    looksLike: [
      'Read pairs with identical outer alignment coordinates (and identical UMI if present).',
      'FastQC “Sequence Duplication Levels” high; Picard MarkDuplicates reports 5–60 % depending on library type and input.',
      'Duplication rate correlates with low input mass or high PCR cycle number across samples.',
    ],
    causes: ['pcr-amplification', 'nucleic-qc', 'size-selection', 'tagmentation', 'second-strand', 'cdna-amplification', 'biotin-pulldown', 'conversion', 'nuclei-isolation', 'atac-fragments', 'immunoprecipitation', 'tethered-cleavage', 'enrichment-qc', 'clip-library', 'capture-pulldown', 'tiled-amplicon-pcr', 'amplicon-consensus'],
    whatToDo: [
      'WGS / exome / ChIP: mark or remove duplicates (Picard, samtools markdup, sambamba).',
      'RNA-seq and amplicon: do not remove without UMIs; high-expression genes legitimately produce identical fragments.',
      'With UMIs: collapse by UMI + position (UMI-tools, fgbio) instead.',
      'Report duplication as a per-sample QC metric and test it as a covariate.',
    ],
  },
  'optical-duplicates': {
    title: 'Optical / cluster duplicates',
    looksLike: [
      'Duplicate pairs whose read names share a tile and have x/y coordinates within a few thousand pixels.',
      'More on patterned flow cells (NovaSeq, NextSeq 2000) than on MiSeq.',
    ],
    causes: ['cluster-generation'],
    whatToDo: [
      'Picard MarkDuplicates with `OPTICAL_DUPLICATE_PIXEL_DISTANCE=2500` for patterned flow cells (100 for non-patterned) separates these from PCR duplicates in the metrics.',
      'They are not evidence of low library complexity; do not use them to estimate it.',
    ],
  },
  'adapter-readthrough': {
    title: 'Adapter read-through',
    looksLike: [
      'FastQC “Adapter Content” rising toward the 3′ end of reads.',
      'Reads that fail to align or soft-clip at their 3′ end; k-mer spikes in the final cycles.',
      'Insert size shorter than read length in the insert-size histogram.',
    ],
    causes: ['fragmentation', 'adapter-ligation', 'sbs', 'tagmentation', 'sc-library-construction', 'chromatin-tagmentation', 'tethered-cleavage'],
    whatToDo: [
      'Trim adapters before alignment or assembly (fastp, cutadapt, Trimmomatic, Trim Galore). Make sure the adapter sequence matches the kit: TruSeq `AGATCGGAAGAGC` vs Nextera `CTGTCTCTTATACACATCT`.',
      'For paired data, use overlap-aware trimming (fastp default) which also catches adapter in short inserts without a known sequence.',
    ],
  },
  'adapter-dimers': {
    title: 'Adapter dimers',
    looksLike: [
      'Reads that are adapter sequence from base 1; after trimming they have length 0 and are discarded.',
      'A sharp peak at ~120–130 bp in the library TapeStation trace.',
      'Overrepresented sequences in FastQC that match the adapter.',
    ],
    causes: ['adapter-ligation', 'size-selection', 'library-qc', 'immunoprecipitation', 'tethered-cleavage', 'clip-library', 'capture-pulldown'],
    whatToDo: [
      'Trim and discard; report the fraction lost. A few percent is normal; tens of percent means the library should have been re-cleaned.',
    ],
  },
  'insert-size': {
    title: 'Insert-size distribution',
    looksLike: [
      'Picard CollectInsertSizeMetrics / samtools stats histogram: mode, width, hard left edge (bead ratio), tail.',
      'Fraction of overlapping read pairs from fastp or BBMerge.',
    ],
    causes: ['fragmentation', 'size-selection', 'rna-fragmentation', 'tagmentation', 'nucleic-qc', 'chromatin-tagmentation', 'chromatin-shearing', 'tethered-cleavage', 'capture-pulldown'],
    whatToDo: [
      'Use it to set aligner expectations (proper-pair limits), to choose assembler k-mer sizes, and to decide whether to merge overlapping pairs.',
      'Check that it matches the protocol target; large deviations indicate degraded input or a different protocol for some samples.',
    ],
  },
  'gc-bias': {
    title: 'GC bias',
    looksLike: [
      'Coverage falls in high-GC (> 60 %) and very low-GC (< 30 %) windows; Picard CollectGcBiasMetrics normalized coverage curve is not flat.',
      'In metagenomes: high- and low-GC genomes under-covered; GC-dependent abundance differences between PCR-amplified and PCR-free libraries.',
      'FastQC “Per sequence GC content” shifted or bimodal relative to expectation.',
    ],
    causes: ['pcr-amplification', 'tagmentation', 'mda', 'conversion', 'biotin-pulldown', 'chromatin-tagmentation', 'immunoprecipitation', 'probe-hybridization', 'capture-pulldown'],
    whatToDo: [
      'Compare only within protocol; include GC covariates in coverage-based copy-number or abundance models (e.g. CNV callers do GC correction).',
      'For assembly, expect fragmentation at high-GC regions; consider lower coverage thresholds there.',
    ],
  },
  chimeras: {
    title: 'Chimeric molecules',
    looksLike: [
      'Shotgun: read pairs whose mates map to distant loci or different genomes at a low, uniform rate across samples; split alignments with no biological support.',
      'Amplicon: sequences whose first half matches one taxon and second half another; flagged by removeBimeraDenovo / UCHIME / VSEARCH.',
      'Long reads: internal adapter sequence in the middle of a read.',
    ],
    causes: ['pcr-amplification', 'amplicon-pcr', 'end-repair', 'mda', 'nanopore-library', 'cdna-amplification', 'biotin-pulldown', 'tiled-amplicon-pcr'],
    whatToDo: [
      'Amplicon: always run chimera removal before taxonomy.',
      'Shotgun: treat low-frequency discordant pairs with suspicion in structural-variant calling; require multiple independent molecules.',
      'Long reads: split reads at internal adapters (Porechop `--middle`, duplex_tools) before assembly.',
    ],
  },
  'polymerase-errors': {
    title: 'Polymerase / RT errors',
    looksLike: [
      'Low-frequency variants supported by several reads that are PCR duplicates of one molecule.',
      'A floor of ~0.1–1 % mismatches in deep sequencing that does not go away with more depth.',
    ],
    causes: ['pcr-amplification', 'reverse-transcription', 'amplicon-pcr', 'tiled-amplicon-pcr'],
    whatToDo: [
      'Mark duplicates before variant calling; set variant allele frequency thresholds above the error floor; use UMI consensus for low-frequency variants.',
    ],
  },
  'index-hopping': {
    title: 'Index hopping / cross-talk',
    looksLike: [
      'A tiny fraction (0.1–2 %) of reads from one sample appearing in another sample from the same lane: rare “taxa” in negatives, trace expression of a tissue-specific gene in the wrong tissue.',
      'With unique dual indexes: reads with unexpected i5/i7 combinations in the demultiplexing report.',
    ],
    causes: ['cluster-generation', 'pooling', 'index-pcr', 'nanopore-library', 'sc-library-construction', 'probe-hybridization', 'amplicon-consensus'],
    whatToDo: [
      'Ask whether unique dual indexes were used; if so the hopped reads were filtered, and the report tells you the rate.',
      'With combinatorial indexes, apply a per-sample abundance floor derived from negatives or from the expected hopping rate; be skeptical of features present at < 0.1 % in a sample and abundant in a lane-mate.',
    ],
  },
  undetermined: {
    title: 'Undetermined reads',
    looksLike: [
      'A large `Undetermined_S0` FASTQ (> 5–10 % of the lane).',
      'Top undetermined index sequences in the demux report that match a sample with a typo, a reverse-complemented i5, or PhiX.',
    ],
    causes: ['demultiplexing', 'pooling', 'sc-library-construction'],
    whatToDo: [
      'Check the top undetermined index pairs: if they match a sample’s indexes (or their reverse complement), fix the sample sheet and re-demultiplex rather than losing the sample.',
    ],
  },
  'sample-swaps': {
    title: 'Sample swaps and mislabelling',
    looksLike: [
      'Sex inferred from reads disagrees with metadata; genotype fingerprints do not match paired samples from the same individual; a “control” clusters with cases.',
    ],
    causes: ['pooling', 'demultiplexing', 'collection', 'ccs-consensus'],
    whatToDo: [
      'Check sex markers, SNP concordance between samples that should match (e.g. tumour/normal, timepoints), and positive controls as early as possible.',
      'Keep the sample sheet and the facility’s demux report with the data.',
    ],
  },
  'uneven-depth': {
    title: 'Uneven depth across samples',
    looksLike: [
      'Reads per sample vary 2–10-fold within a lane with no biological reason.',
    ],
    causes: ['library-qc', 'pooling', 'nucleic-qc', 'probe-hybridization', 'on-target-metrics'],
    whatToDo: [
      'Decide on depth thresholds for inclusion; rarefy or use depth-aware models; check whether depth correlates with the outcome (it often does when cases and controls were prepared separately).',
    ],
  },
  overclustering: {
    title: 'Overclustering / low % PF',
    looksLike: [
      'Run summary with low % passing filter, high cluster density (non-patterned) or high % polyclonal wells (patterned).',
      'Lower quality overall; many N calls; reduced yield.',
    ],
    causes: ['cluster-generation', 'library-qc'],
    whatToDo: [
      'Nothing to fix in analysis; apply quality trimming and expect lower usable yield. Ask the facility for the run metrics.',
    ],
  },
  'tile-artefacts': {
    title: 'Tile / flow-cell artefacts',
    looksLike: [
      'FastQC “Per tile sequence quality” heat map with hot tiles or stripes; quality drops at specific cycles across all samples.',
    ],
    causes: ['cluster-generation', 'sbs'],
    whatToDo: [
      'Usually ignorable after quality trimming; for sensitive applications, filter reads from affected tiles using the header tile field.',
    ],
  },
  'quality-decay': {
    title: '3′ quality decay',
    looksLike: [
      'FastQC “Per base sequence quality” falling toward the end of reads, Read 2 lower than Read 1.',
    ],
    causes: ['sbs', 'nanopore-sequencing'],
    whatToDo: [
      'Quality-trim or let the aligner soft-clip; for amplicon denoising, truncate reads where quality drops (DADA2 `truncLen`) while keeping enough overlap to merge.',
    ],
  },
  'poly-g': {
    title: 'Poly-G tails',
    looksLike: [
      'Runs of G at the 3′ end of reads on NextSeq / NovaSeq data; FastQC “Per base sequence content” jumping to 100 % G at the end; reads of pure G.',
    ],
    causes: ['sbs'],
    whatToDo: [
      'Trim with fastp `--trim_poly_g` (on by default for NextSeq/NovaSeq headers) or cutadapt `--nextseq-trim`. Do this before adapter trimming and before assembly.',
    ],
  },
  phasing: {
    title: 'Phasing / pre-phasing',
    looksLike: [
      'Gradual quality decline along the read; run metrics report phasing/pre-phasing percentages per read.',
    ],
    causes: ['sbs'],
    whatToDo: [
      'Nothing per sample; it is the chemistry. Quality-trim.',
    ],
  },
  'q-binning': {
    title: 'Binned quality scores',
    looksLike: [
      'Only 4–8 distinct quality characters in the FASTQ (e.g. `#`, `,`, `:`, `F`).',
    ],
    causes: ['basecalling', 'nanopore-basecalling', 'ccs-consensus'],
    whatToDo: [
      'Expected on modern instruments; tools that threshold at Q20/Q30 behave fine. Base-quality recalibration and quality-model-based tools (some error correctors) should be configured for binned input.',
    ],
  },
  'end-bias': {
    title: 'Read-start composition bias',
    looksLike: [
      'FastQC “Per base sequence content” failing for the first 9–12 bases in every sample, with a similar pattern across samples.',
    ],
    causes: ['reverse-transcription', 'tagmentation', 'fragmentation', 'chromatin-tagmentation'],
    whatToDo: [
      'Expected: random-hexamer priming (RNA-seq) and Tn5 insertion (Nextera) are not uniform. Do not hard-trim for alignment-based quantification. For de novo assembly some pipelines trim 10 bases; for k-mer-based methods it can matter.',
    ],
  },
  'primers-in-reads': {
    title: 'Primer sequence in reads',
    looksLike: [
      'Every read begins with the same ~20 bases (possibly offset by a 0–7 nt spacer); FastQC “Overrepresented sequences” and “Per base sequence content” flag it.',
    ],
    causes: ['amplicon-pcr', 'index-pcr', 'tiled-amplicon-pcr'],
    whatToDo: [
      'Remove primers before denoising (cutadapt with linked adapters, DADA2 `trimLeft` only if no spacers). Keep them out of the ASV sequences used for taxonomy.',
    ],
  },
  'primer-bias': {
    title: 'Primer bias and copy-number variation',
    looksLike: [
      'Taxa known to be present (by shotgun or culture) absent or depleted; mock community proportions deviate from expected in a reproducible way.',
    ],
    causes: ['amplicon-pcr', 'tiled-amplicon-pcr'],
    whatToDo: [
      'Treat amplicon abundances as compositional and semi-quantitative; compare within primer set only; use a mock community to estimate bias; consider copy-number correction cautiously (it is poorly determined for most taxa).',
    ],
  },
  'low-diversity': {
    title: 'Low-diversity run',
    looksLike: [
      'Lower overall quality than shotgun runs on the same instrument; PhiX reads in the undetermined file; sometimes N-rich first cycles.',
    ],
    causes: ['amplicon-pcr', 'pooling', 'sbs', 'tiled-amplicon-pcr'],
    whatToDo: [
      'Filter PhiX; apply quality truncation; accept lower yield.',
    ],
  },
  kitome: {
    title: 'Reagent and environmental contamination (“kitome”)',
    looksLike: [
      'Taxa present in negative controls; prevalence inversely correlated with input biomass; genera such as Ralstonia, Burkholderia, Bradyrhizobium, Sphingomonas, Pseudomonas, Delftia, Methylobacterium, Cutibacterium.',
      'In viromes and low-input libraries: contaminant genomes at high coverage.',
    ],
    causes: ['extraction', 'mda', 'vlp-enrichment', 'index-pcr'],
    whatToDo: [
      'Sequence blanks; use decontam, SourceTracker or prevalence/frequency filters; never interpret rare taxa in low-biomass samples without controls.',
    ],
  },
  'lysis-bias': {
    title: 'Lysis / extraction bias',
    looksLike: [
      'Systematic differences in community composition between extraction kits or batches; Gram-positive taxa depleted without bead beating; mock-community proportions off in a kit-specific way.',
    ],
    causes: ['extraction', 'hmw-extraction'],
    whatToDo: [
      'One kit per study, randomized batches, mock community per batch; treat kit as a covariate if it varied.',
    ],
  },
  'batch-effects': {
    title: 'Batch effects',
    looksLike: [
      'Samples cluster by processing date, extraction batch, library batch, lane or sequencing run rather than by biology; often confounded with case/control status.',
    ],
    causes: ['collection', 'extraction', 'rna-qc', 'nanopore-basecalling', 'pooling', 'single-cell-suspension', 'crosslinking', 'coextraction', 'nuclei-isolation', 'chromatin-tagmentation', 'chromatin-shearing', 'immunoprecipitation', 'enrichment-qc', 'rna-immunoprecipitation', 'probe-hybridization', 'tiled-amplicon-pcr'],
    whatToDo: [
      'Get the full processing metadata; test each batch variable against the top principal components; include it in models (limma removeBatchEffect, ComBat, or as a covariate) only when it is not confounded with the question.',
    ],
  },
  degradation: {
    title: 'Degraded input',
    looksLike: [
      'Short inserts; for RNA, 3′ bias and low RIN; for DNA, low DIN, C→T damage patterns in ancient or FFPE samples.',
    ],
    causes: ['collection', 'nucleic-qc', 'rna-qc', 'rna-extraction', 'hmw-extraction', 'conversion', 'coextraction', 'chromatin-shearing'],
    whatToDo: [
      'Include integrity scores as covariates; for RNA, prefer rRNA depletion data or 3′-counting methods for degraded material; for DNA damage, use damage-aware callers or UDG-treated libraries.',
    ],
  },
  'low-input': {
    title: 'Low input',
    looksLike: [
      'High duplication, strong GC bias, large contaminant fraction, adapter dimers, low library complexity (EstimateLibraryComplexity).',
    ],
    causes: ['nucleic-qc', 'pcr-amplification', 'vlp-enrichment', 'nuclease-extraction', 'mda', 'size-selection', 'nuclei-isolation', 'immunoprecipitation', 'tethered-cleavage', 'rna-immunoprecipitation', 'clip-library', 'capture-pulldown', 'tiled-amplicon-pcr'],
    whatToDo: [
      'Lower your expectations for depth-based claims; rely on blanks; deduplicate (or use UMIs); do not interpret coverage-based abundance quantitatively.',
    ],
  },
  umis: {
    title: 'Unique molecular identifiers',
    looksLike: [
      'A fixed-length block of random-looking bases at the start of Read 1 (or in an index read / header) in every read.',
    ],
    causes: ['adapter-ligation', 'barcoded-rt', 'clip-library', 'capture-pulldown'],
    whatToDo: [
      'Extract to the read name before alignment (UMI-tools extract, fastp `--umi`); deduplicate by UMI + position; for consensus calling use fgbio.',
    ],
  },
  'damage-patterns': {
    title: 'DNA damage patterns',
    looksLike: [
      'Elevated C→T at 5′ read ends and G→A at 3′ ends (ancient DNA, FFPE); mapDamage plots.',
    ],
    causes: ['collection', 'end-repair', 'smrtbell-library', 'capture-pulldown'],
    whatToDo: [
      'Use damage-aware variant calling, trim read ends, or ask whether UDG treatment was applied.',
    ],
  },
  'gdna-contamination': {
    title: 'Genomic DNA in RNA-seq',
    looksLike: [
      'Even coverage across introns and intergenic regions; reduced strand specificity; high intergenic read fraction.',
    ],
    causes: ['rna-extraction', 'second-strand', 'coextraction'],
    whatToDo: [
      'Quantify intronic/intergenic fraction and strand specificity per sample; in stranded data, antisense reads estimate contamination; count only exonic, strand-correct reads.',
    ],
  },
  'three-prime-bias': {
    title: '3′ bias in gene-body coverage',
    looksLike: [
      'Gene-body coverage rising toward the 3′ end (RSeQC geneBody_coverage, Picard MEDIAN_5PRIME_TO_3PRIME_BIAS); long genes under-quantified.',
    ],
    causes: ['rna-qc', 'rrna-depletion', 'rna-fragmentation', 'reverse-transcription', 'barcoded-rt', 'sc-library-construction'],
    whatToDo: [
      'Include RIN or a bias metric as a covariate; avoid isoform and TSS inference on degraded poly(A) data; for 3′ kits, use 3′-aware quantification.',
    ],
  },
  'rrna-reads': {
    title: 'Residual rRNA reads',
    looksLike: [
      'A few percent to tens of percent of reads mapping to rRNA genes; FastQC overrepresented sequences matching rRNA; in metatranscriptomes, dominant reads from SSU/LSU of abundant taxa.',
    ],
    causes: ['rrna-depletion', 'rna-extraction', 'community-rrna-depletion', 'coextraction', 'rna-immunoprecipitation'],
    whatToDo: [
      'Filter rRNA reads (SortMeRNA, RiboDetector, or reference alignment) before quantification; treat residual fraction as a technical covariate.',
    ],
  },
  'intronic-reads': {
    title: 'Intronic reads',
    looksLike: [
      '20–40 % of reads in introns in rRNA-depleted total RNA libraries (pre-mRNA) versus < 10 % in poly(A) libraries.',
    ],
    causes: ['rrna-depletion', 'rna-extraction', 'single-cell-suspension', 'barcoded-rt', 'barcode-processing'],
    whatToDo: [
      'Expected for depletion libraries; include intronic reads in gene counting only deliberately (e.g. single-nucleus); distinguish from gDNA by strand specificity.',
      'In 10x data, intronic reads come from nuclear pre-mRNA and internal poly(A) priming; Cell Ranger ≥ 7 counts them by default, so note the setting when comparing matrices.',
    ],
  },
  strandedness: {
    title: 'Library strandedness',
    looksLike: [
      'RSeQC infer_experiment: fraction of reads explained by “1++,1--,2+-,2-+” vs “1+-,1-+,2++,2--”; Salmon `-l A` reporting ISR / ISF / IU.',
    ],
    causes: ['second-strand'],
    whatToDo: [
      'Set the strand flag to match: dUTP → featureCounts `-s 2`, HTSeq `--stranded=reverse`, Salmon `ISR`. Verify on a subsample before quantifying everything.',
    ],
  },
  'selection-bias': {
    title: 'Physical selection bias (filtration, gradients)',
    looksLike: [
      'Absence of large or enveloped viruses; family composition that changes with pore size or gradient fraction; strong differences between VLP and bulk approaches on the same sample.',
    ],
    causes: ['vlp-enrichment', 'nuclease-extraction'],
    whatToDo: [
      'Interpret absence cautiously; compare only within protocol; report the enrichment protocol alongside any diversity claim.',
    ],
  },
  'mda-bias': {
    title: 'Whole-genome amplification bias',
    looksLike: [
      'Coverage along a genome varying by orders of magnitude; ssDNA viral families dominating; fragmented assemblies at coverage valleys; chimeric junctions.',
    ],
    causes: ['mda'],
    whatToDo: [
      'Treat abundances as presence/absence or ranks; never compare ssDNA and dsDNA abundances; use coverage-evenness filters in binning; prefer unamplified libraries for quantitative work.',
    ],
  },
  'read-length': {
    title: 'Read-length distribution (long reads)',
    looksLike: [
      'NanoPlot N50 and length histogram; large fraction of reads under 1 kb; a population of ~500 bp reads from adaptive sampling rejections.',
    ],
    causes: ['hmw-extraction', 'nanopore-library', 'nanopore-sequencing', 'smrtbell-library', 'smrt-sequencing'],
    whatToDo: [
      'Filter short reads before assembly (Filtlong, chopper); exclude adaptive-sampling rejects; report N50 with every assembly.',
    ],
  },
  'homopolymer-errors': {
    title: 'Homopolymer and k-mer specific errors',
    looksLike: [
      'Indels at homopolymer runs; systematic errors at specific k-mers; frame-shifted genes in unpolished assemblies.',
    ],
    causes: ['nanopore-sequencing', 'nanopore-basecalling'],
    whatToDo: [
      'Polish with Medaka / Racon (or with short reads); use long-read-aware variant callers (Clair3, DeepVariant ONT model); re-basecall with the latest SUP model when possible.',
    ],
  },
  phix: {
    title: 'PhiX reads',
    looksLike: [
      'Reads mapping to the PhiX174 genome (5386 bp) in Undetermined or in samples; in assemblies, a 5.4 kb circular contig.',
    ],
    causes: ['pooling'],
    whatToDo: [
      'Filter against PhiX before assembly or taxonomic profiling (bbduk, bowtie2).',
    ],
  },

  // ───────── single-cell ─────────
  doublets: {
    title: 'Doublets and multiplets',
    looksLike: [
      '“Cells” co-expressing mutually exclusive lineage markers (e.g. CD3E with CD79A, or epithelial with immune genes), usually with roughly twice the UMI count of their neighbours.',
      'Small bridge clusters between two large clusters on a UMAP; a cluster whose markers are a union of two others.',
      'With hashtags or pooled genotypes, barcodes assigned to two samples at once.',
    ],
    causes: ['droplet-encapsulation', 'single-cell-suspension', 'nuclei-isolation'],
    whatToDo: [
      'Estimate the expected rate from cells recovered (≈ 0.8 % per 1,000 cells on 10x v3) and run scDblFinder, Scrublet or DoubletFinder per library, never on merged libraries.',
      'Where hashing or genotype demultiplexing exists, use the empirically measured cross-sample rate to calibrate the within-sample rate.',
      'Drop doublets before clustering and differential expression; do not interpret bridge clusters as transitional states without other evidence.',
    ],
  },
  'ambient-rna': {
    title: 'Ambient RNA (the soup)',
    looksLike: [
      'Haemoglobin, immunoglobulin, or tissue-specific markers (surfactant, albumin, digestive enzymes) detected at low levels in every cell type.',
      'Cell Ranger “Fraction Reads in Cells” below ~70 %; empty droplets with hundreds of UMIs.',
      'Marker genes that never go to zero in any cluster.',
    ],
    causes: ['single-cell-suspension', 'droplet-encapsulation', 'barcoded-rt'],
    whatToDo: [
      'Estimate the ambient profile from the empty droplets of the raw matrix and subtract it (CellBender, SoupX, DecontX) per library before integration.',
      'Treat low-level expression of another lineage’s marker as contamination unless it survives correction.',
      'Report ambient fraction per sample; it tracks viability and dissociation batch.',
    ],
  },
  'empty-droplets': {
    title: 'Empty droplets and the cell-calling cut',
    looksLike: [
      'Barcode-rank plot: a plateau of high-UMI barcodes, a cliff, then a long tail of barcodes with tens of UMIs; the raw matrix has 10⁵–10⁶ barcodes and the filtered one 10³–10⁴.',
      'Cell types with little RNA (neutrophils, platelets, erythroblasts, some T cells) missing from the filtered matrix.',
    ],
    causes: ['droplet-encapsulation', 'barcode-processing'],
    whatToDo: [
      'Keep the raw matrix. Re-call cells with EmptyDrops (DropletUtils) or Cell Ranger’s EmptyDrops step when low-RNA cell types are expected.',
      'Do not force a cell number unless you know the loading; check the knee plot per library.',
      'Use the empty droplets as the ambient estimate for soup correction.',
    ],
  },
  'dissociation-stress': {
    title: 'Dissociation-induced stress signature',
    looksLike: [
      'FOS, FOSB, JUN, JUNB, EGR1, ATF3, HSPA1A/B, HSP90AA1, DNAJB1, IER2 high across many cell types; a cluster or gradient defined by these genes.',
      'Signature strongest in samples with the longest or warmest digestion.',
    ],
    causes: ['single-cell-suspension', 'collection'],
    whatToDo: [
      'Score the published dissociation gene set (van den Brink et al. 2017) per cell; regress or exclude the module from clustering and marker selection.',
      'Compare only samples prepared with the same protocol; treat protease and digestion time as covariates.',
      'Do not report immediate-early gene activation as biology without a cold-protease or nuclei control.',
    ],
  },
  'mito-fraction': {
    title: 'High mitochondrial read fraction',
    looksLike: [
      'Cells where MT- genes make up > 10–20 % of UMIs (threshold is tissue-dependent: cardiomyocytes and hepatocytes are naturally high); such cells often also have low total UMIs.',
      'In nuclei, any substantial MT fraction indicates cytoplasmic contamination.',
    ],
    causes: ['single-cell-suspension', 'collection'],
    whatToDo: [
      'Filter with a data-driven, per-sample threshold (e.g. median + 3 MADs) rather than one fixed cut-off; document it.',
      'Check whether the “high-mito” cells are a biological population before removing them.',
      'High fractions across a whole sample indicate poor viability; treat the sample as compromised rather than filtering heavily.',
    ],
  },
  'sparse-counts': {
    title: 'Sparsity and dropouts',
    looksLike: [
      '> 90 % zeros in the count matrix; medians of 1,000–8,000 UMIs and 500–3,000 genes per cell; moderately expressed genes detected in only a fraction of cells of a type.',
    ],
    causes: ['barcoded-rt', 'cdna-amplification'],
    whatToDo: [
      'Use count models that expect this (negative binomial, Poisson-based normalisation) rather than treating zeros as absence.',
      'Judge gene detection at the cluster level, not per cell; use pseudobulk for differential expression between conditions.',
      'More sequencing does not fix capture: saturation tells you whether depth or capture is the limit.',
    ],
  },
  'barcode-errors': {
    title: 'Barcode and UMI sequencing / PCR errors',
    looksLike: [
      'Barcodes one mismatch from a high-count barcode with a handful of UMIs; UMIs one mismatch from an abundant UMI on the same barcode and gene.',
      'Q30 fraction in the barcode or UMI read below ~90 % in the web summary.',
    ],
    causes: ['cdna-amplification', 'sc-library-construction', 'sbs'],
    whatToDo: [
      'Let the pipeline correct against the whitelist and collapse UMIs at Hamming distance 1; do not disable it to “keep more cells”.',
      'Compare matrices from different pipelines only after noting their correction rules differ.',
      'If Read 1 quality is poor, check whether it was sequenced beyond 28 cycles into poly(T).',
    ],
  },
  'barcode-swapping': {
    title: 'Barcode swapping between multiplexed 10x libraries',
    looksLike: [
      'The same cell barcode present in two libraries sequenced on one patterned flow cell, with a high count in one and a low count in the other; low-count phantom cells carrying another sample’s markers.',
      'More pronounced with single-index kits on NovaSeq / HiSeq 4000.',
    ],
    causes: ['sc-library-construction', 'cluster-generation', 'pooling'],
    whatToDo: [
      'With dual indices, drop reads whose i5/i7 pair is unexpected (bcl2fastq / BCL Convert do this by default).',
      'With single indices, remove cell barcodes shared across libraries from the same lane, or keep only the library where the barcode is dominant (DropletUtils swappedDrops).',
      'Prefer dual-index kits and avoid putting libraries that will be compared on the same lane as libraries with very different cell numbers.',
    ],
  },
  'sequencing-saturation': {
    title: 'Sequencing saturation',
    looksLike: [
      'Cell Ranger “Sequencing Saturation”: the fraction of confidently mapped reads whose barcode-UMI-gene combination was already seen. 30 % means most reads are new molecules; 80 % means most are duplicates.',
      'Median genes per cell that barely rises when a library is resequenced.',
    ],
    causes: ['cdna-amplification', 'pooling'],
    whatToDo: [
      'Below ~30–40 %: consider sequencing deeper if the question needs lowly expressed genes.',
      'Above ~70 %: more depth adds little; the matrix is limited by capture.',
      'Compare samples at similar saturation or downsample reads before comparing detection rates.',
    ],
  },
  // ───────── PacBio HiFi ─────────
  'zmw-loading': {
    title: 'ZMW loading and short-insert bias',
    looksLike: [
      'Low HiFi yield per SMRT Cell with normal read quality; run report P1 well below 60 % or P2 high.',
      'A read-length histogram with a large peak at 1–5 kb that was not in the library trace; adapter-dimer reads.',
    ],
    causes: ['smrtbell-library', 'smrt-sequencing'],
    whatToDo: [
      'Filter reads by length for assembly (e.g. ≥ 5 kb) and report N50; expect lower coverage than planned rather than worse reads.',
      'Ask for the loading metrics and the size-selection cut-off before comparing yields between samples.',
    ],
  },
  'hifi-residual-errors': {
    title: 'HiFi residual errors (homopolymer indels)',
    looksLike: [
      'Variant calls dominated by 1-bp indels in homopolymer runs ≥ 6 bp; frame-shifts in genes with long A/T runs in unpolished assemblies; lower `rq` on the longest reads.',
    ],
    causes: ['ccs-consensus', 'smrt-sequencing'],
    whatToDo: [
      'Use HiFi-aware callers (DeepVariant PacBio model, Clair3 HiFi); filter reads by `rq` and `np` for sensitive applications; polish assemblies with the HiFi reads themselves (hifiasm already does).',
      'Treat per-base quality values as model predictions; use per-read `rq` for filtering rather than per-base Q.',
    ],
  },

  // ───────── metatranscriptomics ─────────
  'depletion-bias': {
    title: 'rRNA depletion bias across taxa',
    looksLike: [
      'Residual rRNA concentrated in a few taxa (archaea, unusual Firmicutes, protists); those taxa over-represented in raw read counts and under-represented in mRNA counts.',
      'mRNA genes with rRNA-like sequence missing or depleted.',
    ],
    causes: ['community-rrna-depletion'],
    whatToDo: [
      'Remove rRNA reads computationally before any quantification; compare taxon-level expression within one kit only; report per-sample residual rRNA as a covariate.',
    ],
  },
  'mrna-fraction': {
    title: 'Low usable mRNA fraction',
    looksLike: [
      'After removing rRNA, host and low-quality reads, a few million microbial mRNA reads remain from a 20–40 M read library; sparse gene-level counts with many zeros.',
    ],
    causes: ['community-rrna-depletion', 'coextraction', 'collection'],
    whatToDo: [
      'Quantify at gene-family or pathway level rather than per gene; use count models for sparse data; sequence deeper or deplete host RNA if the question needs per-gene resolution.',
    ],
  },
  'rna-dna-ratio': {
    title: 'Expression confounded with abundance',
    looksLike: [
      'Transcript counts per gene that track the organism’s DNA abundance; “differentially expressed” genes that all belong to the taxa that changed in abundance.',
    ],
    causes: ['coextraction'],
    whatToDo: [
      'Normalise transcripts by gene copies from the matched DNA library (RNA/DNA ratio) or by per-genome scaling; test abundance and expression changes separately.',
    ],
  },

  // ───────── methylation ─────────
  'incomplete-conversion': {
    title: 'Incomplete or over-conversion',
    looksLike: [
      'Lambda spike-in conversion rate below 99 %; non-CpG (CHH) methylation above ~1 % in a tissue where it should be absent; methylation levels inflated uniformly.',
      'Over-conversion: methylated pUC19 control reading below ~95 % methylated.',
    ],
    causes: ['conversion'],
    whatToDo: [
      'Report conversion rate per sample and exclude samples below threshold; filter reads with ≥ 3 unconverted CHH (Bismark `--filter_non_conversion`, MethylDackel); use CHH as an internal estimate when no spike-in exists.',
    ],
  },
  'm-bias': {
    title: 'M-bias (position-dependent methylation)',
    looksLike: [
      'Methylation level dropping or rising in the first ~5–10 bases of Read 2 and the last bases of Read 1 in the M-bias plot; artefactual low methylation near fragment ends.',
    ],
    causes: ['methyl-alignment', 'end-repair', 'conversion'],
    whatToDo: [
      'Trim by position after inspecting the M-bias plot (`--ignore_r2 N`, MethylDackel `--OT/--OB` bounds) rather than by a fixed rule; do not count overlapping mates twice.',
    ],
  },
  'reduced-complexity-mapping': {
    title: 'Low mapping efficiency in converted libraries',
    looksLike: [
      'Unique mapping 60–80 % (lower in repeats and GC-poor regions); more multi-mappers than WGS; coverage gaps at repeats and low-complexity sequence.',
    ],
    causes: ['conversion', 'methyl-alignment'],
    whatToDo: [
      'Use bisulfite-aware aligners only; plan 20–30 % more sequencing than the WGS equivalent; restrict analyses to CpGs with adequate coverage and mappability.',
    ],
  },

  // ───────── Hi-C ─────────
  'invalid-pairs': {
    title: 'Dangling ends, self-circles and re-ligations',
    looksLike: [
      'High fractions of pairs with both mates on the same restriction fragment (dangling ends: inward-facing; self-circles: outward-facing) or on adjacent fragments; a low valid-pair rate (< 50 %).',
    ],
    causes: ['crosslinking', 'digestion-ligation', 'biotin-pulldown', 'hic-pairs'],
    whatToDo: [
      'Let the pipeline remove them (HiC-Pro, pairtools, Juicer) and report the fractions; a high dangling-end rate points to failed biotin removal, a high self-circle rate to inefficient digestion or over-fixation.',
    ],
  },
  'chimeric-pairs': {
    title: 'Chimeric reads spanning the ligation junction',
    looksLike: [
      'Reads with two alignments (supplementary alignments, SA tag); the ligation motif (e.g. GATCGATC) inside reads; mates mapping megabases apart or on different chromosomes.',
    ],
    causes: ['digestion-ligation', 'biotin-pulldown', 'hic-pairs'],
    whatToDo: [
      'Align with a Hi-C-aware mode (bwa mem -5SP, chromap --preset hic, HiC-Pro’s split mapping); keep the 5′ alignment of each mate; never use the standard paired-end insert-size filter.',
    ],
  },
  'trans-noise': {
    title: 'Random-ligation background (trans noise)',
    looksLike: [
      'Trans-contact fraction well above expectation (> 30–40 % in mammalian cells); a flat, uniform background in the matrix; in metagenomic Hi-C, weak links between unrelated genomes.',
    ],
    causes: ['crosslinking', 'collection', 'hic-pairs'],
    whatToDo: [
      'Estimate the background from inter-chromosomal contacts and subtract or threshold it; compare samples only after matching cis/trans ratios; for metagenomic binning, use normalisation that accounts for spurious inter-genome links.',
    ],
  },
  'site-bias': {
    title: 'Restriction-site, GC and mappability bias',
    looksLike: [
      'Coverage along the genome correlated with restriction-site density and GC; stripes and checkerboard artefacts in unbalanced matrices; low coverage in repeats.',
    ],
    causes: ['digestion-ligation', 'hic-pairs'],
    whatToDo: [
      'Balance matrices (ICE / KR / cooler balance) and remove low-coverage bins; use enzyme-agnostic protocols or explicit bias models when uniform coverage matters.',
    ],
  },

  'cell-calling': {
    title: 'Cell-calling and pipeline choices',
    looksLike: [
      'Cell numbers that change substantially between Cell Ranger versions or when `--expect-cells` / `--force-cells` is set; a cell type present in one pipeline’s output and absent from another’s.',
      'Counts per gene that differ between runs with and without intron inclusion.',
    ],
    causes: ['barcode-processing', 'atac-fragments'],
    whatToDo: [
      'Fix pipeline, version, reference and intron setting for a whole study and record them.',
      'Re-examine the knee plot and consider EmptyDrops when low-RNA populations matter.',
      'Treat the filtered matrix as a starting point, then apply your own QC, ambient correction and doublet removal.',
    ],
  },

  // ───────── atac, chip, rip, capture, amplicon ─────────
  'nucleosome-ladder': {
    title: 'Missing or distorted nucleosome ladder',
    'looksLike': [
      'Fragment-size histogram (deepTools `bamPEFragmentSize`, `ATACseqQC`, `ataqv`) without the expected shape: a dominant nucleosome-free peak under ~100 bp followed by peaks near ~200 and ~400 bp. Either a monotonic decay of short fragments (over-tagmented or dead cells) or a profile dominated by large fragments (under-tagmented).',
      'Bioanalyzer / TapeStation trace of the library showing a smear instead of discrete bands at ~200 bp intervals.',
      'TSS enrichment and FRiP usually low in the same sample.',
    ],
    causes: ['nuclei-isolation', 'chromatin-tagmentation', 'size-selection'],
    'whatToDo': [
      'Treat the sample as low quality: check viability and transposition records, and compare its fragment profile with other samples of the same batch before interpreting any accessibility difference.',
      'Do not “rescue” it by lowering peak-calling thresholds; include FRiP or TSS enrichment as a covariate, or exclude the sample, and say so.',
      'If all samples lack the ladder, check whether a double-sided bead selection removed the large fragments on purpose; some labs keep only nucleosome-free fragments by design.',
    ],
  },

  'tn5-shift': {
    title: 'Tn5 cut-site offset (+4/−5)',
    'looksLike': [
      'Aggregate cut-site plots in which forward- and reverse-strand profiles are offset by ~9 bp, or footprints that sit next to rather than on the motif.',
      'Results from two pipelines that differ by a constant few base pairs at base resolution.',
      'A composition skew in the first ~9 bases of every read (FastQC per-base sequence content) that is identical across samples.',
    ],
    causes: ['chromatin-tagmentation', 'atac-fragments'],
    'whatToDo': [
      'Shift read starts +4 (forward) and −5 (reverse) once, before footprinting, V-plots or cut-site counting (`alignmentSieve --ATACshift`, `ATACseqQC::shiftGAlignmentsList`). Peak calling on fragments does not need it.',
      'Do not trim the first bases of the reads; the skew is the insertion preference, not an adapter.',
      'For footprinting, apply a Tn5 bias correction (TOBIAS, HINT-ATAC) so that the sequence preference is not read as protein binding.',
    ],
  },

  'low-tss-enrichment': {
    title: 'Low TSS enrichment and FRiP',
    'looksLike': [
      'TSS enrichment score below ~5 (ENCODE: 5–7 acceptable, > 7 ideal for hg38 RefSeq) and FRiP below ~0.2, with depth and base quality normal.',
      'Coverage that looks similar over promoters and gene deserts; few peaks called; weak replicate concordance.',
      'In scATAC, a per-barcode TSS vs fragment-count plot without a clear high-TSS population.',
    ],
    causes: ['nuclei-isolation', 'chromatin-tagmentation', 'pcr-amplification', 'atac-fragments'],
    'whatToDo': [
      'Report TSS enrichment and FRiP per sample next to the experimental design; check whether they confound the comparison and include them as a covariate if they do.',
      'Prefer a consensus peak set built from the good samples and count fragments in it for all samples, rather than calling peaks per sample.',
      'Do not compare cell types with one fixed threshold; signal-to-noise is also cell-type dependent.',
    ],
  },

  'mito-reads': {
    title: 'Mitochondrial reads in ATAC-seq',
    'looksLike': [
      '`samtools idxstats` or the pipeline QC showing 10–60 % of aligned reads on chrM; usable (nuclear, non-duplicate) depth far below sequenced depth.',
      'Inflated duplicate rate and the tallest peaks in the genome on chrM or NUMTs when chrM is not removed before downstream steps.',
    ],
    causes: ['nuclei-isolation', 'chromatin-tagmentation', 'atac-fragments'],
    'whatToDo': [
      'Remove chrM alignments before duplicate marking, QC metrics, normalisation and peak calling; also blacklist NUMTs or filter by MAPQ.',
      'Compute usable depth after removal and check it against the target (ENCODE: ~50 M non-duplicate, non-mitochondrial fragments for bulk human).',
      'Treat the chrM fraction as a protocol fingerprint: a large difference between batches points to a lysis-protocol change and predicts other batch effects.',
    ],
  },

  'hyperchipable-regions': {
    title: 'Hyper-ChIPable regions and blacklist peaks',
    'looksLike': [
      'The same regions (strong promoters, highly transcribed genes, satellite and centromeric repeats, rDNA) are enriched in every IP, in IgG and often in input, regardless of the antibody.',
      'Peak lists from unrelated targets overlap heavily at their top entries; sample correlations are driven by a few hundred loci.',
      'In CUT&RUN and CUT&Tag, an ATAC-like set of open-chromatin peaks appears in IgG controls.',
    ],
    causes: ['chromatin-shearing', 'immunoprecipitation', 'tethered-cleavage', 'enrichment-qc'],
    'whatToDo': [
      'Remove the ENCODE blacklist for the genome build before peak calling and correlation; call peaks against a matched input or IgG from the same chromatin batch.',
      'Treat peaks shared with IgG, input or an unrelated antibody as non-specific; require motif or mark-specific distribution for the rest.',
      'For CUT&RUN/CUT&Tag, compare target peaks against an IgG track and an accessibility map before interpreting promoter peaks.',
    ],
  },

  'low-frip': {
    title: 'Poor enrichment (low FRiP, flat fingerprint)',
    'looksLike': [
      'FRiP under 1 % (ChIP) or in the single digits (CUT&RUN/CUT&Tag); RSC below 0.8 and a cross-correlation plot where the read-length phantom peak is taller than the fragment-length peak.',
      'deepTools `plotFingerprint` curve for the IP lies on the input curve; peak caller returns few peaks or thousands of weak ones.',
      'High duplication and low yield in the same samples.',
    ],
    causes: ['immunoprecipitation', 'tethered-cleavage', 'chromatin-shearing', 'enrichment-qc'],
    'whatToDo': [
      'Treat the sample as a failed IP rather than as “no binding”; do not include it in differential analysis.',
      'Check antibody validation, yield and PCR cycles; repeat with a validated lot or an orthogonal method before claiming a biological absence.',
      'For CUT&RUN/CUT&Tag, confirm the caller and thresholds suit a sparse background before concluding enrichment is low.',
    ],
  },

  'antibody-cross-reactivity': {
    title: 'Antibody cross-reactivity or non-specificity',
    'looksLike': [
      'Peak distribution matches a related mark or a different factor (e.g. an H3K4me3 antibody giving enhancer-like H3K4me1 peaks; a TF antibody giving the open-chromatin set).',
      'Peaks persist in a knockout, knockdown or inhibitor-treated sample; two antibody lots or two antibodies against the same target disagree.',
      'Motif enrichment at peaks belongs to a different factor.',
    ],
    causes: ['immunoprecipitation', 'tethered-cleavage'],
    'whatToDo': [
      'Check antibody validation (ENCODE characterisation, vendor ChIP data, knockout controls) before interpreting; prefer a second independent antibody or a tagged construct.',
      'Compare the peak distribution with public data for the intended target and for the suspected cross-reacting mark.',
      'Report antibody vendor, catalogue number and lot with the data.',
    ],
  },

  'spike-in-normalisation': {
    title: 'Missed or invented global changes',
    'looksLike': [
      'A treatment known to remove a mark globally shows no change, or paradoxical gains at residual sites, after per-million normalisation.',
      'Spike-in read fraction differs several-fold between samples although the same amount was supposedly added; conclusions flip between depth and spike-in scaling.',
      'Fold-change distributions centred away from zero in a way that depends on the normalisation method.',
    ],
    causes: ['immunoprecipitation', 'tethered-cleavage', 'enrichment-qc'],
    'whatToDo': [
      'Ask whether a global change is plausible; if so, use spike-in scaling (ChIP-Rx, E. coli carry-over) and report both normalisations.',
      'Verify the spike-in fraction is consistent within conditions; a variable spike-in is worse than none.',
      'Anchor conclusions with an orthogonal global measurement (western blot, mass spectrometry) when the mark may change everywhere.',
    ],
  },

  'crosslink-truncation': {
    title: 'Crosslink truncation sites',
    'looksLike': [
      'Stacks of reads whose 5′ ends share one genomic coordinate, one nucleotide downstream of the crosslinked base, in eCLIP and iCLIP data; the stack is the signal, not a duplication artefact.',
      'In HITS-CLIP, single-nucleotide deletions at the site; in PAR-CLIP, T→C mismatches (A→G on the minus strand) that a naive mismatch filter removes.',
      'Soft-clipped first bases or a mapping offset equal to the UMI length when the UMI was not removed before alignment.',
    ],
    causes: ['clip-library', 'rna-immunoprecipitation'],
    'whatToDo': [
      'Move the UMI and in-line barcode into the read name before aligning; deduplicate with UMI plus position (`umi_tools dedup`), never by position alone.',
      'Call sites from read starts (eCLIP/iCLIP: CLIPper, PureCLIP) or from the mismatch/deletion signature (PAR-CLIP: PARalyzer; HITS-CLIP: CIMS), matching the protocol.',
      'Keep mismatch-tolerant alignment settings and do not filter T→C or deletions as errors; a real SNP appears in the input library at the same position.',
    ],
  },

  'abundance-driven-targets': {
    title: 'Abundance-driven “targets”',
    'looksLike': [
      'A RIP or CLIP target list that is the cell’s most expressed transcripts: rRNA, mt-rRNA, snRNAs, histone and ribosomal-protein mRNAs; similar lists for unrelated proteins and for the IgG control.',
      'IP read counts proportional to input counts across genes; enrichment that shrinks or disappears when a size-matched input or IgG is used for normalisation.',
    ],
    causes: ['rna-immunoprecipitation'],
    'whatToDo': [
      'Normalise peaks to the size-matched input (eCLIP) or IgG/input (RIP) from the same experiment; require log₂ enrichment and significance, not read count.',
      'Plot IP against input per gene; true targets lie off the diagonal. Remove rRNA and repeat-mapped reads before calling.',
      'Treat a target list without a matched control as unvalidated; a knockout or knockdown IP is the definitive specificity control.',
    ],
  },

  'rnase-overdigestion': {
    title: 'RNase over-digestion',
    'looksLike': [
      'Inserts under ~20 nt after trimming, multi-mapping rate above ~30 %, few uniquely mapped usable reads, and loss of peaks in structured or repeat-adjacent regions.',
      'Conversely, under-digestion: inserts above ~100 nt, broad peaks the width of exons and high background outside peaks.',
    ],
    causes: ['rna-immunoprecipitation', 'clip-library'],
    'whatToDo': [
      'Check the insert-length histogram per sample before anything else; set a minimum mapped length (typically 18–20 nt) and report multi-mapper fractions.',
      'Do not compare peak sets across samples digested at different doses without noting it; fragment length is a batch variable.',
      'If the digest is unusable, no analysis setting recovers resolution; ask for a re-titrated IP.',
    ],
  },

  'off-target-reads': {
    title: 'Off-target reads',
    'looksLike': [
      '20–40 % of reads (more for small panels) align outside the target intervals; `CollectHsMetrics` PCT_SELECTED_BASES below the vendor’s expected range.',
      'A thin, roughly uniform layer of genome-wide coverage (0.1–2×) under the deep targets; repeat-enriched when blocking was weak.',
    ],
    causes: ['probe-hybridization', 'capture-pulldown', 'on-target-metrics'],
    'whatToDo': [
      'Restrict variant calling to padded targets; never genotype from off-target depth.',
      'Use the off-target layer for what it is good at: sex check, VerifyBamID contamination estimates, ancestry, coarse copy-number.',
      'Track on-target fraction per sample and per capture pool as a QC covariate; a batch with a low fraction needs deeper sequencing, not different thresholds.',
    ],
  },

  'probe-dropout': {
    title: 'Probe dropout and design gaps',
    'looksLike': [
      'Targets at zero or near-zero coverage in every sample (design gap or failed probe), or in one batch (design version or wash batch), or over the divergent part of a viral genome.',
      'ZERO_CVG_TARGETS_PCT above a few percent; GC_DROPOUT high; per-target coverage heatmap with horizontal stripes across the cohort.',
    ],
    causes: ['probe-hybridization', 'capture-pulldown', 'on-target-metrics'],
    'whatToDo': [
      'Intersect coverage with the exact probe BED and mark uncovered targets as “not assessed” rather than reference or deleted.',
      'Compare designs when cohorts were captured with different kits; analyse only the intersection of targets, or model design as a covariate.',
      'For viral capture, interpret breadth against divergence from the probe set; report absence as “not detected with this panel”.',
    ],
  },

  'padding-artefacts': {
    title: 'Interval-edge and padding effects',
    'looksLike': [
      'Variant lists that differ between pipelines mainly within ~100 bp of target boundaries; coverage that tails off into introns rather than stopping.',
      'Different on-target and callable-fraction numbers for the same BAM depending on the padding used.',
    ],
    causes: ['probe-hybridization', 'on-target-metrics'],
    'whatToDo': [
      'Fix one target BED and one padding for the project, version them with the pipeline, and state them in Methods.',
      'Flag variants in padding separately; they have lower depth and are the first to disagree between callers.',
    ],
  },

  'pcr-jackpotting': {
    title: 'PCR jackpotting of allele fractions',
    'looksLike': [
      'Heterozygous SNPs with allele fractions spread from ~0.2 to ~0.8 at raw depths that look ample; deduplicated depth a small fraction of raw depth.',
      'Low-frequency variants supported by many reads that collapse to one or two UMI families.',
    ],
    causes: ['capture-pulldown', 'on-target-metrics', 'pcr-amplification'],
    'whatToDo': [
      'Mark duplicates before coverage and allele counting; report deduplicated or UMI-consensus depth with every call.',
      'For sub-percent allele fractions require UMI families of several reads on both strands (fgbio duplex consensus).',
      'Confirm unexpected allele fractions in an independent library from the same DNA; jackpots do not reproduce.',
    ],
  },

  'amplicon-dropout': {
    title: 'Amplicon dropout',
    'looksLike': [
      'Coverage falls to near zero over a ~300–400 bp window with vertical edges that coincide with primer coordinates, then returns to full depth; neighbouring amplicons are unaffected.',
      'Consensus FASTA contains runs of N at the same coordinates; in alignment viewers these can look like a deletion or a gap in the genome.',
      'Either the same window in every sample of a lineage or a batch (primer problem), or different random windows per sample that get worse with higher Ct (template limitation).',
    ],
    causes: ['tiled-amplicon-pcr', 'amplicon-consensus'],
    'whatToDo': [
      'Compute depth per amplicon from the scheme’s insert BED and report it per sample; treat a low amplicon as missing data, never as a deletion, unless spanning reads show the gap.',
      'Check whether the dropped amplicon is shared by a lineage (look for a mutation under its primers in the overlapping amplicon) and whether a newer scheme version has moved those primers.',
      'Set completeness thresholds for downstream use (e.g. ≥ 90 % non-N for lineage assignment, higher for phylogenetics) and record Ct alongside completeness.',
    ],
  },

  'primer-site-variants': {
    title: 'Variants under primer sites',
    'looksLike': [
      'Allele frequencies around 30–70 % at single sites that fall inside a primer interval, while the same site in the overlapping amplicon’s reads is near 0 or 100 %.',
      'Lineage-defining mutations missing from the consensus exactly where a primer sits; or, after a wrong BED file, real sequence soft-clipped away and depth collapsing at old primer positions.',
    ],
    causes: ['amplicon-consensus', 'tiled-amplicon-pcr'],
    'whatToDo': [
      'Trim primers by coordinate with the BED file of the exact scheme version used; confirm in the log which file was applied.',
      'For any variant inside a primer interval, require support from reads of the overlapping amplicon (other pool); otherwise mark the site as unreliable.',
      'When a scheme is updated mid-study, process all samples with their own BED and compare consensus genomes only at positions outside all primer intervals of both schemes.',
    ],
  },

  'amplicon-cross-contamination': {
    title: 'Cross-contamination in amplicon libraries',
    'looksLike': [
      'A no-template control with hundreds to thousands of mapped reads and a partial consensus; weak samples with implausibly complete genomes.',
      'Minor variants at 1–10 % that, taken together, reconstruct the haplotype of the positive control or of a high-titre sample on the same plate or lane.',
      'Affected samples cluster by plate position or by processing batch rather than by patient or site.',
    ],
    causes: ['tiled-amplicon-pcr', 'amplicon-consensus', 'demultiplexing'],
    'whatToDo': [
      'Sequence a no-template control with every batch and report its read count and completeness; set a per-batch background below which minor variants are not interpreted.',
      'Compare each sample’s minor alleles against the positive control and every other sample on the run before calling mixed infections; require replication from a second extraction.',
      'Use unique dual indexes and keep high-titre controls off plates with low-load clinical samples.',
    ],
  },
};

export function artifactsForStep(stepId) {
  return Object.entries(artifacts).filter(([, a]) => a.causes.includes(stepId)).map(([id, a]) => ({ id, ...a }));
}
