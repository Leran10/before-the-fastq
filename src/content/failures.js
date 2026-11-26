// What can go wrong at each step, written for the analyst who sees something
// odd in the data and has to decide whether it is biology or the bench.
//
// failures[stepId] = [{ what, signature, tell, artifact? }]
//   what       the bench failure and its usual cause (one line)
//   signature  what it looks like in the FASTQ, QC reports or downstream results
//   tell       how to tell it from real biology: what argues for the bench,
//              what argues for biology
//   artifact   optional id from artifacts.js

export const failures = {
  collection: [
    {
      what: 'Delayed freezing: hours at room temperature before the sample reached −80 °C',
      signature: 'Stool and other microbial samples gain facultative anaerobes (Enterobacteriaceae, Streptococcus, Enterococcus) and lose strict anaerobes; RNA samples show stress and heat-shock transcripts up and RIN down. Insert sizes shorten with time-to-freeze.',
      tell: 'Bench if the “bloom” taxa or stress genes correlate with the recorded time-to-freezer or with collection site, and the pattern crosses case/control groups. Biology if the same taxa differ between groups within one site and time window and a second aliquot stored immediately shows it too.',
      artifact: 'degradation',
    },
    {
      what: 'Repeated freeze–thaw of the same aliquot across a long project',
      signature: 'Samples processed late in the project have lower DIN/RIN, shorter inserts and more adapter read-through than those processed early; for RNA, stronger 3′ bias in RSeQC `geneBody_coverage` for the late samples.',
      tell: 'Bench if integrity falls with processing order or with the number of times the tube was opened, regardless of group. Biology (e.g. necrotic tissue, apoptotic cfDNA) is tied to sample type or clinical state and does not drift with the calendar.',
      artifact: 'degradation',
    },
    {
      what: 'Different preservative or collection kit for different sample groups',
      signature: 'Groups separate on PC1 or PC2; taxa known to be preservative-sensitive (e.g. Bacteroidetes in ethanol, certain Firmicutes in OMNIgene) differ cleanly between groups; a PERMANOVA on preservative explains as much as the variable of interest.',
      tell: 'Bench if preservative is confounded with group and the separating taxa match published preservative shifts; samples of either group that share a preservative cluster together. Biology if the effect persists within a single preservative and in controls collected the same way.',
      artifact: 'batch-effects',
    },
    {
      what: 'Collection tube or swab carrying its own DNA (low-biomass samples)',
      signature: 'Skin, air, blood and tissue samples show the same low-complexity set of genera as the field blanks; read counts are low and taxa prevalence rises as input biomass falls.',
      tell: 'Bench if the suspect taxa are present in unopened-tube or swab blanks and their relative abundance is inversely related to DNA yield. Biology if they are absent from blanks, scale with biomass, and appear in only some samples of a group with a plausible source.',
      artifact: 'kitome',
    },
    {
      what: 'Mislabelled tubes or manifest errors at collection',
      signature: 'A sample whose sex markers, host SNP fingerprint or expected positive-control genome disagree with its metadata; replicate pairs that do not cluster together while an unrelated pair does.',
      tell: 'Bench if the disagreement is total (wrong sex, wrong genotype), not partial; a mix-up swaps whole profiles, biology does not. Biology never changes a host SNP fingerprint between two visits.',
      artifact: 'sample-swaps',
    },
  ],

  extraction: [
    {
      what: 'Incomplete lysis: no bead beating, or too short a beating program',
      signature: 'Gram-positives, spores and fungi under-represented against the mock community; in a ZymoBIOMICS standard the Gram-positive members (Bacillus, Enterococcus, Listeria, Staphylococcus) fall well below their nominal abundances while Gram-negatives are inflated.',
      tell: 'Bench if the mock community shows the skew and every sample shifts the same direction regardless of group. Biology if the mock is on target and the Gram-positive shortfall is specific to a condition, a site or a time point.',
      artifact: 'lysis-bias',
    },
    {
      what: 'Reagent and lab contamination dominating low-biomass extracts',
      signature: 'Extraction blanks yield a FASTQ of similar size to real samples; Ralstonia, Burkholderia, Bradyrhizobium, Sphingomonas, Methylobacterium and Pseudomonas appear in most samples at a few percent; `decontam` prevalence or frequency tests flag them.',
      tell: 'Bench if the taxa are in the blanks, their abundance falls as input DNA concentration rises, and they are the same across unrelated sample types processed with the same kit lot. Biology if they are absent from blanks and their abundance is independent of yield.',
      artifact: 'kitome',
    },
    {
      what: 'Inhibitor or salt carry-over (phenol, humics, bile salts, ethanol)',
      signature: 'A260/230 below ~1.5; the library needs extra PCR cycles or fails; the affected samples have the lowest read counts, highest duplication and highest adapter-dimer fraction on the lane with no relation to biology.',
      tell: 'Bench if poor libraries line up with poor purity ratios or with a sample type known to carry inhibitors (soil, stool, FFPE) and a re-extraction fixes them. Biology (truly low microbial load) gives low yield with clean purity ratios and reproducible composition across replicate extractions.',
      artifact: 'low-input',
    },
    {
      what: 'Over-shearing by bead beating when long molecules were needed',
      signature: 'Long-read N50 of 2–8 kb instead of 20+ kb; Femto Pulse trace smears below 10 kb; assembly fragmented and HMW-dependent methods (Hi-C, optical maps) under-perform.',
      tell: 'Bench if every sample from a bead-beating kit shows the same ceiling while a gentle-lysis re-extraction of the same material gives long molecules. Biology (genuinely degraded sample, cfDNA) gives short fragments from any extraction method.',
      artifact: 'read-length',
    },
    {
      what: 'Extraction batches assigned by group instead of randomized',
      signature: 'Extraction date or plate explains a top principal component; a dendrogram splits by plate; within-plate replicates agree far better than between-plate replicates of the same sample.',
      tell: 'Bench if group and extraction batch are confounded and the effect disappears or shrinks when batch is modelled or when the few cross-batch samples are compared. Biology if the group effect holds within each batch separately.',
      artifact: 'batch-effects',
    },
  ],

  'nucleic-qc': [
    {
      what: 'Input quantified by NanoDrop instead of a dsDNA-specific dye',
      signature: 'The real dsDNA input was 2–10× lower than recorded, so libraries come out with far more duplicates and adapter dimers than the recorded input predicts; samples rich in RNA or short fragments are hit hardest.',
      tell: 'Bench if duplication rate does not track the recorded input but does track A260/280 or RNA content, and a Qubit re-measurement of leftover extract is much lower than the sheet says. Biology (low cellularity) gives low input by both methods.',
      artifact: 'low-input',
    },
    {
      what: 'Samples run below the kit minimum instead of being dropped',
      signature: 'A few libraries with duplication above 30–50 %, FastQC “Overrepresented sequences” full of adapter and primer, `EstimateLibraryComplexity` showing a small unique-molecule count, and depth that saturates early in a rarefaction curve.',
      tell: 'Bench if the affected samples are exactly those with the lowest recorded input or the most cycles, and their composition looks like a noisier version of their neighbours. Biology if the low-complexity samples had adequate input and the “few unique molecules” reflect a genuinely clonal or low-diversity sample.',
      artifact: 'low-input',
    },
    {
      what: 'Integrity not checked: degraded input processed as if intact',
      signature: 'Insert-size histogram shifted short with a long left tail and more read-through; for RNA, RIN below ~6 with 3′ coverage bias and shorter inferred transcript lengths in RSeQC.',
      tell: 'Bench if degradation follows storage time, freeze–thaw count or extraction batch and is unrelated to group. Biology if it tracks sample type (FFPE, cfDNA, apoptotic tissue) and a fresh re-extraction of the same material gives the same profile.',
      artifact: 'degradation',
    },
    {
      what: 'Concentration and purity values not recorded per sample',
      signature: 'No way to model input as a covariate; duplication and GC-bias differences between samples get interpreted as biology by default.',
      tell: 'Bench if asking the facility recovers a Qubit sheet that explains the duplication spread. Biology if, with input known and matched, the differences remain.',
    },
  ],

  fragmentation: [
    {
      what: 'Over-shearing: too long a Covaris program, too much enzyme, or degraded input',
      signature: 'Insert-size peak well below target; most pairs overlap; FastQC “Adapter Content” rising from mid-read; after trimming a tail of reads under 50 bp and a drop in effective coverage per pair.',
      tell: 'Bench if every library sheared that day shows the same shifted, unimodal insert histogram and the shift follows prep date, not sample group. Biology (cfDNA, FFPE, ancient DNA) gives a sample-type-specific pattern such as the ~167 bp nucleosome ladder, present no matter who prepared the library.',
      artifact: 'insert-size',
    },
    {
      what: 'Under-shearing: short program, viscous HMW input, or wrong tube/volume',
      signature: 'Insert-size peak above the protocol target with a long right tail; low cluster yield because long molecules cluster poorly; weak signal and low % PF for that sample’s share of the lane.',
      tell: 'Bench if the long inserts come with low read counts for the same libraries and the shift is shared by samples processed in the same Covaris batch. Biology never lengthens molecules; a long-insert sample is always a processing outcome.',
      artifact: 'insert-size',
    },
    {
      what: 'Enzymatic fragmentation time varied between samples or plates',
      signature: 'Bimodal or plate-dependent insert-size distributions across the project; GC-content-dependent fragment-size shift that differs by plate; coverage-vs-GC curves that cluster by prep plate.',
      tell: 'Bench if insert-size mode groups by plate or date and not by condition, and the GC bias follows the same grouping. Biology if insert size is uniform and only coverage patterns differ with condition.',
      artifact: 'gc-bias',
    },
    {
      what: 'Fragmentation applied to already-short material (cfDNA, FFPE)',
      signature: 'The informative short-fragment peaks are destroyed; insert sizes are uniformly short with no nucleosome ladder; fragmentomics features (end motifs, size ratios) are flat across samples.',
      tell: 'Bench if the protocol record shows a shearing step for these samples and the expected biological size structure is absent in all of them. Biology if some samples retain the ladder while others do not, and the Methods say no fragmentation was done.',
      artifact: 'insert-size',
    },
  ],

  'end-repair': [
    {
      what: 'Incomplete A-tailing: Klenow exo- or dATP step too short, cold, or omitted',
      signature: 'Low ligation yield so more PCR cycles and higher duplication; a rise in insert–insert chimeras: pairs mapping far apart or to two genomes, and split reads whose two halves join at a blunt junction without any shared sequence.',
      tell: 'Bench if the chimera rate is similar across all samples of a prep batch and the junctions lack the microhomology typical of PCR chimeras. Biology (structural variants, horizontal transfer) is sample-specific, reproducible in a second library, and supported by multiple independent pairs with consistent breakpoints.',
      artifact: 'chimeras',
    },
    {
      what: 'Damage repair (UDG) skipped for FFPE or ancient DNA',
      signature: 'Excess C→T (and complementary G→A) mismatches concentrated in the first and last ~10 bases of reads; `mapDamage` or `DamageProfiler` shows the classic terminal rise; false low-frequency transition variants.',
      tell: 'Bench or sample chemistry if the mismatches are terminal, strand-specific and transitions only, and vanish in a UDG-treated replicate library. Biology (real variants) is positionally uniform across the read, present in both read orientations, and reproduced in a second library.',
      artifact: 'damage-patterns',
    },
    {
      what: 'Blunt-end ligation without A-tailing (some PCR-free or legacy kits)',
      signature: 'Higher baseline of insert concatemers and adapter dimers; a small but steady fraction of “discordant” pairs in every sample; assemblies with suspicious short links between unrelated contigs.',
      tell: 'Bench if the discordant fraction is a flat baseline in all samples with randomly distributed junctions. Biology produces clustered junctions at specific loci.',
      artifact: 'chimeras',
    },
    {
      what: 'Residual 5′ or 3′ overhangs from an inefficient polymerase/kinase mix',
      signature: 'Reduced library yield and more cycles; a mild skew in base composition in the first 1–3 bases of reads where fill-in copied the opposite strand.',
      tell: 'Bench if the first-base skew is identical across all samples and matches the fill-in chemistry. Biology does not produce a fixed per-cycle base composition at read starts.',
      artifact: 'end-bias',
    },
  ],

  'adapter-ligation': [
    {
      what: 'Too much adapter or too little insert: adapter-dimer formation',
      signature: 'Reads that are adapter from base 1 (`AGATCGGAAGAGC…` for TruSeq); trimmer logs showing 5–50 % of reads trimmed to zero length; a ~125 bp spike on the library trace; the sample’s share of the lane is wasted.',
      tell: 'Bench if dimer fraction is highest in the lowest-input samples of the batch and absent from normal-input ones. Biology never produces adapter-only reads; any such read is a prep artefact.',
      artifact: 'adapter-dimers',
    },
    {
      what: 'Wrong adapter set recorded, or UMIs/inline barcodes undocumented',
      signature: 'The trimmer finds no adapter while FastQC “Adapter Content” shows an unlisted sequence; or the first 6–12 bases of R1 are a fixed-length high-entropy block that lowers mapping rate and creates clustered mismatches at read starts.',
      tell: 'Bench if the block is exactly the same length in every read of every sample and its base composition is uniform (random). Biology does not produce a fixed-width random prefix on all reads.',
      artifact: 'umis',
    },
    {
      what: 'Poor ligation efficiency: old ligase, wrong buffer, or inhibitors from extraction',
      signature: 'Fewer unique molecules than input predicted; more PCR cycles needed, so duplication and GC bias rise; `EstimateLibraryComplexity` well below expectation for the input mass.',
      tell: 'Bench if complexity is low across a whole prep batch despite adequate input, or in samples with poor purity ratios. Biology (low diversity, clonal population) gives low sequence diversity but normal library complexity in terms of unique fragment start/end positions.',
      artifact: 'duplicates',
    },
    {
      what: 'Methylated adapters not used in a bisulfite/EM-seq library',
      signature: 'Adapter sequence in reads is itself converted (C→T), so default trimmers miss it; adapter read-through survives into alignment as soft-clips and mismatches at 3′ ends.',
      tell: 'Bench if a converted-adapter sequence (e.g. `AGATTGGAAGAGT`) is found by a k-mer scan at 3′ read ends across all samples. Biology does not create converted adapter sequence.',
      artifact: 'adapter-readthrough',
    },
  ],

  'size-selection': [
    {
      what: 'Bead ratio too low (too stringent): short molecules discarded',
      signature: 'A hard left cut-off in the insert-size histogram above the expected biological minimum; missing cfDNA sub-150 bp fragments, miRNA or short-insert ancient DNA; artificially long mean insert and lower read-through than the fragmentation step would predict.',
      tell: 'Bench if the cut-off is sharp, at the same length across all samples, and matches the recorded ratio. Biology (fragment-length differences between conditions) shows up as gradual shifts of the whole distribution, not a vertical wall.',
      artifact: 'insert-size',
    },
    {
      what: 'Bead ratio too high or cleanup skipped: dimers and primers retained',
      signature: 'Adapter-dimer and primer-dimer reads (zero-length after trimming) in every sample of a batch; FastQC “Overrepresented sequences” listing adapter/primer sequences; an insert-size histogram with a small peak near zero.',
      tell: 'Bench if the junk fraction is similar across samples regardless of input and the trace shows a ~125 bp peak. Biology does not produce zero-insert molecules.',
      artifact: 'adapter-dimers',
    },
    {
      what: 'Over-dried or over-pipetted beads: random DNA loss',
      signature: 'Sporadic low-yield libraries scattered across the plate with normal input and purity; higher duplication and lower complexity only in those wells; no pattern by group.',
      tell: 'Bench if the affected wells are isolated, do not share any biological label, and re-prep from the same extract restores yield. Biology (truly low biomass) is reproducible across preps.',
      artifact: 'low-input',
    },
    {
      what: 'Different bead lot or ratio between batches',
      signature: 'Two or more distinct insert-size modes across the project that follow prep date; fragment-length-dependent coverage differences (long genes or GC-extreme regions) that separate the same batches.',
      tell: 'Bench if the insert-size mode is bimodal across batches and unimodal within each. Biology does not change the molecular size range of a shotgun library.',
      artifact: 'batch-effects',
    },
    {
      what: 'Very tight double-sided selection on a low-input library',
      signature: 'Library complexity drops sharply: duplication above 20–30 %, rarefaction saturates early, variant and taxon detection limits worsen despite adequate read counts.',
      tell: 'Bench if complexity loss accompanies a narrow insert window on the trace and tracks input mass. Biology (clonal or low-diversity samples) gives high sequence redundancy but a normal distribution of fragment start positions.',
      artifact: 'duplicates',
    },
  ],

  'pcr-amplification': [
    {
      what: 'Too many cycles for the input (over-amplification)',
      signature: 'Duplication above 20–50 % in Picard `MarkDuplicates`; a “bubble product” hump on the trace at ~2× the main peak; FastQC “Sequence Duplication Levels” with a tail of sequences at >10 copies; `EstimateLibraryComplexity` far below input expectation.',
      tell: 'Bench if duplication tracks recorded cycle number or input mass across samples and dropping duplicates removes the between-sample difference. Biology (high-expression genes, dominant taxa) gives identical fragments concentrated at specific loci, not spread genome-wide, and is reproduced in a second independent library.',
      artifact: 'duplicates',
    },
    {
      what: 'GC-dependent amplification efficiency (wrong polymerase, extension too short)',
      signature: 'Picard `CollectGcBiasMetrics` shows coverage falling steeply above ~60 % GC and below ~30 %; high- and low-GC genomes under-covered in metagenomes; CNV callers see wave-like coverage that correlates with GC.',
      tell: 'Bench if the GC curve shape differs between PCR batches or polymerases and PCR-free controls lack it. Biology (real copy-number change, genuine abundance) is locus-specific or taxon-specific and does not follow a smooth GC function.',
      artifact: 'gc-bias',
    },
    {
      what: 'Early-cycle polymerase errors propagated into many copies',
      signature: 'Low-frequency variants (1–5 % VAF) supported by several reads that share identical start/end coordinates; errors enriched in homopolymers and at consistent positions in duplicate families; UMI-collapsed consensus removes them.',
      tell: 'Bench if the supporting reads are duplicates of one another (same coordinates, same UMI) and the variant vanishes after UMI or coordinate deduplication. Biology (true subclonal variant) is supported by reads with distinct fragment ends and distinct UMIs.',
      artifact: 'polymerase-errors',
    },
    {
      what: 'PCR chimeras from incomplete extension re-priming on a different template',
      signature: 'Reads whose two halves map to different loci or genomes joined at a short shared stretch; in amplicon data, novel ASVs at 0.1–2 % that are two-parent recombinants; `uchime`/`removeBimeraDenovo` flags them.',
      tell: 'Bench if the junctions show microhomology, the chimera rate rises with cycle number, and the “novel” sequences are perfect halves of two abundant parents in the same sample. Biology (recombinant strain, fusion) is reproduced across libraries and supported by continuous long-read or mate-pair evidence.',
      artifact: 'chimeras',
    },
    {
      what: 'Jackpotting from a bottleneck: tiny input or a failed early cycle',
      signature: 'A handful of fragments at hundreds to thousands of copies dominating FastQC “Overrepresented sequences”; extremely spiky coverage; a single sample that looks “clonal” with little diversity.',
      tell: 'Bench if the jackpotted fragments are at random genomic positions and the sample had low input or extra cycles. Biology (true clonality) covers the whole genome of the dominant clone evenly rather than spiking a few fragments.',
      artifact: 'duplicates',
    },
  ],

  'library-qc': [
    {
      what: 'Mis-sizing: dimer or bubble peak included in the average size',
      signature: 'Molarity mis-calculated so the library is over- or under-loaded; after demultiplexing one sample has 2–10× more or fewer reads than planned with no biological reason.',
      tell: 'Bench if read count per sample disagrees with the pooling plan and the trace for that library shows a dimer or a double-size hump. Biology never changes how many reads a library yields.',
      artifact: 'uneven-depth',
    },
    {
      what: 'Qubit-only quantification counting non-clusterable molecules',
      signature: 'Libraries with many unligated fragments or adapter-less inserts are over-estimated, so they are under-represented on the lane; the under-represented set is often the low-input or poorly ligated libraries.',
      tell: 'Bench if the shortfall correlates with low ligation efficiency or input and a qPCR re-quant explains it. Biology does not change the fraction of adapter-flanked molecules.',
      artifact: 'uneven-depth',
    },
    {
      what: 'Library passed QC despite a visible adapter-dimer peak',
      signature: 'The whole lane carries extra zero-insert reads; the dimer-rich sample yields a FASTQ of normal size but 10–40 % of its reads trim to zero; its effective depth is far below plan.',
      tell: 'Bench: adapter-only reads are always artefactual. The sample is the one with the ~125 bp trace peak.',
      artifact: 'adapter-dimers',
    },
    {
      what: 'Traces not saved or not shared with the analyst',
      signature: 'Unexplained depth imbalance, duplication differences or insert-size outliers that cannot be assigned to a cause and so get treated as biology.',
      tell: 'Bench if recovered traces show the outlier library was mis-sized, dimer-rich or low-yield. Biology if the trace is normal and the oddity remains.',
    },
  ],

  pooling: [
    {
      what: 'Pipetting or dilution error during normalization',
      signature: 'Reads per sample spread 5–10× instead of 2×; the outliers sit in one column or row of the plate or belong to one pipetting batch; rarefaction thresholds have to be set low, losing samples.',
      tell: 'Bench if depth outliers follow plate position or pooling batch and not group. Biology never changes read yield.',
      artifact: 'uneven-depth',
    },
    {
      what: 'Combinatorial dual indexes on a patterned flow cell',
      signature: 'Low-abundance taxa, transcripts or variants that mirror the most abundant features of other samples on the same lane at ~0.1–2 %; “expression” of tissue-specific genes in the wrong tissue; a positive-control genome appearing faintly in every sample.',
      tell: 'Bench if the signal is proportional to the source sample’s abundance and depth and present only in lane-mates; UDI runs of the same samples lack it. Biology does not scale with a neighbour’s read count.',
      artifact: 'index-hopping',
    },
    {
      what: 'Sample sheet error: index pair assigned to the wrong sample name',
      signature: 'Two samples have swapped profiles; sex markers, host SNP fingerprints or expected positive-control genomes disagree with metadata; replicate pairs do not cluster together while unrelated samples do.',
      tell: 'Bench if the mismatch is complete and swapping the two labels restores every expectation. Biology never changes a host genotype.',
      artifact: 'sample-swaps',
    },
    {
      what: 'PhiX spike-in not indexed, or spiked at too high a fraction',
      signature: 'PhiX reads in the Undetermined FASTQ (expected) and, via hopping or barcode bleed, in sample FASTQs; a ~5.4 kb circular “novel phage” assembling in every sample.',
      tell: 'Bench if the sequence is PhiX174 and present in every lane-mate at similar low fraction. Biology (real Microviridae) is sample-specific and diverges from the PhiX reference.',
      artifact: 'phix',
    },
    {
      what: 'Poor index colour balance for the first index cycles',
      signature: 'A large Undetermined fraction whose top sequences are one or two bases off real indexes; demultiplexing stats show low Q30 in the index reads; whole sample sets under-represented.',
      tell: 'Bench if the lost reads re-appear under a 1-mismatch demultiplexing and the affected indexes share a base at the problem cycle. Biology has no bearing on index reads.',
      artifact: 'undetermined',
    },
  ],

  'cluster-generation': [
    {
      what: 'Overloading: too high a loading concentration',
      signature: 'Low % PF (passing filter), lower Q30, more N bases and mixed-signal reads throughout the run; on patterned flow cells high % duplicate from polyclonal wells; on non-patterned ones overlapping clusters and low quality in dense tiles.',
      tell: 'Bench: this hits every sample on the lane equally, and the run summary shows the loading error. Biology is per-sample and cannot lower a whole lane’s quality.',
      artifact: 'overclustering',
    },
    {
      what: 'Underloading: too low a loading concentration or failed denaturation',
      signature: 'Low cluster density or % occupancy; total yield far below the instrument’s specification; every sample short on reads by the same factor.',
      tell: 'Bench: uniform shortfall across all samples on the lane. Biology does not reduce every sample’s depth proportionally.',
      artifact: 'uneven-depth',
    },
    {
      what: 'Pad hopping and ExAmp cluster duplicates on patterned flow cells',
      signature: 'Duplicate pairs with identical coordinates whose read names share a tile and lie within a few thousand pixels; Picard `MarkDuplicates` reports a high optical-duplicate fraction when `OPTICAL_DUPLICATE_PIXEL_DISTANCE=2500`.',
      tell: 'Bench: duplicates that are spatially adjacent on the flow cell are never biology. If optical duplicates are not separated from PCR duplicates the library looks lower-complexity than it is.',
      artifact: 'optical-duplicates',
    },
    {
      what: 'Free adapter or primer carried into loading: index hopping',
      signature: 'Reads with an unexpected index combination (visible only with unique dual indexes); without UDIs, faint cross-sample signal of lane-mates’ dominant features at 0.1–2 %.',
      tell: 'Bench if the signal tracks lane-mate abundance and the UDI-filtered read count matches the expected hopping rate. Biology is independent of which samples shared the lane.',
      artifact: 'index-hopping',
    },
    {
      what: 'Flow-cell bubbles, oil smears or edge defects',
      signature: 'FastQC “Per tile sequence quality” shows red tiles or a block of low quality at specific cycles; reads from those tiles carry Ns or mismatches at the same positions; a dip in quality at one cycle across all reads.',
      tell: 'Bench: the defect is positional on the flow cell and cycle-specific, affecting every sample. Biology never maps to tile number.',
      artifact: 'tile-artefacts',
    },
  ],

  sbs: [
    {
      what: 'Reagent or fluidics problem at a specific cycle',
      signature: 'A sharp quality dip or N-column at one read position in every read of the run; a spike in mismatches at that position after alignment; a “novel variant” at the same read offset in every sample.',
      tell: 'Bench: the error is at a fixed cycle number regardless of genomic position or sample. Biology sits at a genomic position, not a read position.',
      artifact: 'quality-decay',
    },
    {
      what: 'Excessive phasing/pre-phasing (aged reagents, wrong temperature, high density)',
      signature: 'Steeper-than-usual 3′ quality decline; Read 2 worse than Read 1 by a larger margin than usual; higher soft-clip rates and 3′ substitution errors in all samples; run summary shows phasing above typical ~0.1–0.3 %.',
      tell: 'Bench: the decay curve is identical across samples and tracks the run. Biology does not produce position-dependent error that grows with cycle.',
      artifact: 'phasing',
    },
    {
      what: 'Poly-G tails on two-colour instruments (short inserts or empty wells)',
      signature: 'FastQC “Per base sequence content” jumps to near-100 % G at the 3′ end; reads that are pure G after a point; G-rich “contaminant” contigs or unaligned G-runs; k-mer spectra with a G-homopolymer spike.',
      tell: 'Bench: a run of G with high quality on a NextSeq/NovaSeq that starts where the insert ends is an instrument artefact, present in every sample. Biology (G-rich repeats) is flanked by real sequence and reproducible on a four-colour instrument.',
      artifact: 'poly-g',
    },
    {
      what: 'Low-diversity first cycles without PhiX (amplicons, inline barcodes)',
      signature: 'Poor template generation and colour-matrix estimation; low % PF, poor quality in the first 20–30 cycles, high N content early in reads, and a large Undetermined fraction.',
      tell: 'Bench: the problem is confined to runs with low-diversity libraries and improves with PhiX spike-in or shifted primers. Biology cannot lower base quality in the first cycles.',
      artifact: 'low-diversity',
    },
    {
      what: 'Wrong i5 orientation setting in the sample sheet',
      signature: 'Most reads land in Undetermined; the top Undetermined index pairs are the reverse complements of the planned i5 sequences; samples appear to have almost no reads.',
      tell: 'Bench: re-demultiplexing with the reverse-complement i5 recovers the reads. Biology plays no role in index reads.',
      artifact: 'undetermined',
    },
  ],

  basecalling: [
    {
      what: 'Over-loaded or low-diversity flow cell: RTA mis-registers clusters in early cycles',
      signature: 'Lower % passing filter and % ≥ Q30 in the run summary; FastQC “Per base sequence quality” already poor in cycles 1–25; read count below the ordered yield while the Undetermined file is normal.',
      tell: 'Bench if every sample on the lane shows the same drop and the facility’s run metrics (cluster density, % PF) are off their usual range. Biology never lowers Q scores of the first 25 cycles; a sample-specific quality problem points instead to library-specific low diversity (amplicons, bisulfite) rather than to the run.',
      artifact: 'overclustering',
    },
    {
      what: 'Fluidics or focus problem on part of the flow cell during the run',
      signature: 'Quality collapses at a specific cycle range for reads from certain tiles only; FastQC “Per tile sequence quality” shows blue/red stripes; many reads with runs of `#` (Q2) or N at the same positions.',
      tell: 'Bench if the affected reads share tile numbers in the header (field 5) and the problem starts at the same cycle in every sample of the lane. Biology cannot cluster by tile; a quality dip that tracks sequence context (homopolymers, GGC motifs) is chemistry, a dip that tracks tile is hardware.',
      artifact: 'tile-artefacts',
    },
    {
      what: 'Wrong or outdated RTA / basecaller settings, or quality binning the analyst did not expect',
      signature: 'Only four distinct quality characters in the FASTQ; GATK BQSR or Illumina error-model tools complain; `MarkDuplicates` and variant callers behave differently between batches sequenced on different instruments.',
      tell: 'Bench if the set of quality characters differs between batches and matches the instrument change in the header (`@A00…` NovaSeq vs `@M0…` MiSeq). Nothing in the sample changes how qualities are encoded; a batch effect that disappears after re-binning all data to the same scheme was technical.',
      artifact: 'q-binning',
    },
    {
      what: 'Chastity filter too aggressive or too lenient for the library type',
      signature: 'Either far fewer reads than expected with high mean quality, or normal read numbers with a tail of reads that have Q2 bases and mismatched mates; an unusually high fraction of reads with `N` in the first cycles.',
      tell: 'Bench if the shortfall or excess is uniform across the lane and matches the % PF in the run report. Biology shows up as sample-specific depth differences that correlate with input mass or library concentration, not with filtering settings that apply to the whole lane.',
      artifact: 'quality-decay',
    },
  ],

  demultiplexing: [
    {
      what: 'Sample-sheet error: index sequences entered wrong, swapped, or reverse-complemented for the instrument',
      signature: 'One or more samples with near-zero reads while `Undetermined_S0` is tens of percent of the lane; the demux report’s “top unknown barcodes” list contains the missing samples’ indexes or their reverse complements.',
      tell: 'Bench if the top undetermined index sequences match a sample-sheet entry after reverse-complementing i5, and if re-demultiplexing fixes it. Biology never produces an empty FASTQ; a genuinely failed library shows as a low but non-zero count with the correct index, and the facility’s library QC trace is flat.',
      artifact: 'undetermined',
    },
    {
      what: 'Sample swap or mislabelling: files renamed or wells mixed up before or during demux',
      signature: 'Sex-chromosome coverage, SNP fingerprints or 16S profiles disagree with metadata; a “case” sample clusters perfectly with the controls; pairs of samples swapped in a plate pattern.',
      tell: 'Bench if a genotype or sex check (`somalier`, `peddy`, XIST/Y-gene expression) contradicts the manifest and the mismatch resolves when two labels are exchanged. Biology can produce outliers but not a consistent identity mismatch; two samples that are each other’s expected genotype is a swap.',
      artifact: 'sample-swaps',
    },
    {
      what: 'Too permissive index mismatch setting, or combinatorial (non-unique dual) indexes on a patterned flow cell',
      signature: 'Low-level cross-sample reads: 0.1–2 % of a high-depth library’s reads appear in a low-depth or blank library on the same lane; rare variants and taxa “shared” between neighbours in the sample sheet.',
      tell: 'Bench if the contaminating sequences come from samples on the same lane and the fraction scales with that sample’s depth; blanks on the lane show the same taxa or alleles. Biology if the shared signal also appears in samples sequenced on another lane or run, or in a second library from the same extract.',
      artifact: 'index-hopping',
    },
    {
      what: 'Partial or interrupted delivery: files truncated, lanes missing, R1/R2 filtered independently',
      signature: 'R1 and R2 have different read counts or `gzip -t` fails; aligners abort with “mate not found”; `seqkit stats` totals do not match the demux report.',
      tell: 'Bench (or transfer) if checksums differ from the facility’s list or counts differ between mates. Biology cannot produce unpaired FASTQ records; if counts match the report and pairs are intact, the oddity is elsewhere.',
    },
    {
      what: 'Facility trimmed adapters or quality before delivery and did not say so',
      signature: 'Variable read lengths with a minimum far below the nominal cycle count; FastQC “Sequence Length Distribution” is a broad distribution rather than a spike; a second round of trimming removes almost nothing.',
      tell: 'Bench setting if every read file from the batch is variable-length and the header or delivery notes mention BCL Convert adapter trimming. Short inserts from degraded biology (cfDNA, FFPE) still arrive as full-length reads with adapter in them unless somebody trimmed them.',
      artifact: 'adapter-readthrough',
    },
  ],

  'rna-extraction': [
    {
      what: 'DNase step skipped, too short, or overwhelmed by a DNA-rich sample',
      signature: 'Intronic and intergenic reads above ~30 % in a poly(A) library; RSeQC `infer_experiment.py` reports a stranded library as 60/40 instead of 95/5; flat low coverage over every gene body including unexpressed genes.',
      tell: 'Bench if the “expression” extends to intergenic deserts and to genes silent in that tissue, and if the antisense fraction is uniform across loci. Biology (intron retention, nascent transcription, unspliced pre-mRNA in nuclear RNA) is stranded and concentrates in expressed genes; gDNA is unstranded and everywhere.',
      artifact: 'gdna-contamination',
    },
    {
      what: 'RNase contamination or slow lysis: RNA degraded before it was denatured',
      signature: 'RIN below 6 across a batch; strong 3′ bias in Picard `CollectRnaSeqMetrics` (`MEDIAN_5PRIME_BIAS` low); shorter inserts; fewer detected genes at the same depth.',
      tell: 'Bench if degradation follows extraction date, operator or kit lot and hits all tissues of that batch alike. Biology (apoptotic tissue, post-mortem interval, FFPE) correlates with sample type or clinical state and is seen on the Bioanalyzer trace before any library is made.',
      artifact: 'degradation',
    },
    {
      what: 'Phenol, guanidinium or ethanol carry-over inhibits reverse transcription',
      signature: 'Library yield low for the input mass; very high duplication and low complexity despite good RIN; a few samples in a batch need extra PCR cycles.',
      tell: 'Bench if the affected samples have low 260/230 ratios on the Nanodrop and the problem disappears after re-purification of the same RNA. Biology (low-RNA tissue) gives low yield with a normal 260/230 and normal complexity once input is normalised.',
      artifact: 'low-input',
    },
    {
      what: 'Column kit lost small RNAs, or kit changed mid-study',
      signature: 'miRNA, tRNA fragments and snoRNAs absent in some samples and abundant in others; small-RNA fraction splits the cohort in two in PCA.',
      tell: 'Bench if the split coincides with extraction kit or lot and with the size cut-off of each kit (columns typically lose fragments under ~200 nt). Biology would change the relative amounts of specific small RNAs, not switch a whole size class on and off.',
      artifact: 'batch-effects',
    },
  ],

  'rna-qc': [
    {
      what: 'RIN threshold applied inconsistently, or ignored for one group',
      signature: 'Groups differ in gene-body coverage (RSeQC `geneBody_coverage.py`), in 3′ bias and in the long-gene vs short-gene expression ratio; “differentially expressed” genes enriched for long transcripts.',
      tell: 'Bench if RIN differs systematically between groups and the DE signal shrinks when RIN is added as a covariate or when samples are matched on RIN. Biology if the DE genes have no length bias and the effect survives in RIN-matched samples.',
      artifact: 'three-prime-bias',
    },
    {
      what: 'RIN measured on the wrong RNA type or after DNA contamination inflated the trace',
      signature: 'RIN looks fine, but the library behaves like degraded RNA (3′ bias, short inserts); or gDNA shows in the trace as a high-molecular-weight hump misread as intact RNA.',
      tell: 'Bench if the Bioanalyzer trace file shows a broad hump above the 28S peak (gDNA) or if bacterial/community RNA was scored with the eukaryotic RIN algorithm. Biology does not inflate RIN; a mismatch between RIN and library behaviour is a QC-step problem.',
      artifact: 'gdna-contamination',
    },
    {
      what: 'Low RIN with poly(A) selection chosen anyway',
      signature: 'Extreme 3′ bias: coverage confined to the last 1–2 kb of long genes; isoform quantification unstable; long genes appear down-regulated.',
      tell: 'Bench if 3′ bias is proportional to the sample’s RIN and the Methods say poly(A) selection. Biology such as alternative polyadenylation shifts a few genes, not every long gene in the transcriptome.',
      artifact: 'three-prime-bias',
    },
  ],

  'rrna-depletion': [
    {
      what: 'Incomplete depletion: probe set mismatched to the organism, or too much input RNA for the probes',
      signature: 'rRNA fraction 20–80 % instead of under 5 %: a handful of loci take most reads; SortMeRNA / RiboDetector counts high; effective depth for mRNA collapses and detected-gene counts fall.',
      tell: 'Bench if the rRNA fraction varies with depletion batch or input mass and the surviving rRNA is from the expected organisms. A true top-expressed gene list does not consist of 16S/23S/28S fragments, so a glance at the top-10 features settles it.',
      artifact: 'rrna-reads',
    },
    {
      what: 'Poly(A) selection used on degraded or bacterial RNA',
      signature: 'Low yield, strong 3′ bias; in a microbial or mixed sample, bacterial transcripts nearly absent while host mRNA dominates; mitochondrial and histone mRNAs under-represented.',
      tell: 'Bench if the Methods say oligo(dT) beads and the “absent” transcripts are exactly the non-polyadenylated classes (bacterial mRNA, histone, many lncRNAs). Biology would reduce some bacterial transcripts, not every one at once regardless of taxon.',
      artifact: 'three-prime-bias',
    },
    {
      what: 'Probe-based depletion also removes off-target transcripts, or depletes unevenly by taxon',
      signature: 'A reproducible set of mRNAs with rRNA-like sequence or high GC has near-zero counts in every sample; in metatranscriptomics, rRNA remaining per taxon differs 10-fold, so taxon-level mRNA depth is distorted.',
      tell: 'Bench if the missing genes are the same in every sample using that kit and reappear in a sample prepared with a different depletion method. Biology if the genes are missing only in some conditions and the kit’s probe list does not overlap them.',
      artifact: 'depletion-bias',
    },
    {
      what: 'Mixed methods in one study: poly(A) for early samples, depletion for later ones',
      signature: 'Two clouds in PCA; intronic fraction 5 % in one cloud and 30 % in the other; lncRNA and histone gene detection differs between the clouds.',
      tell: 'Bench if cluster membership follows library-prep date or kit and the intronic fraction separates the clouds perfectly. Biology does not switch intronic read fraction by a factor of six in all genes at once.',
      artifact: 'intronic-reads',
    },
  ],

  'rna-fragmentation': [
    {
      what: 'Over-fragmentation: incubation too long or Mg²⁺ buffer concentration too high',
      signature: 'Insert-size peak below ~120 bp; most 2×150 pairs fully overlap and run into adapter; FastQC “Adapter Content” rises from mid-read; after trimming, a tail of reads under 50 bp that multi-map.',
      tell: 'Bench if every library from that prep day shares the shifted, unimodal insert peak regardless of RIN. Biology (degraded RNA) gives a broad smear that correlates with the sample’s RIN and co-occurs with 3′ bias.',
      artifact: 'insert-size',
    },
    {
      what: 'Under-fragmentation: incubation too short, RNA too dilute or too much input',
      signature: 'Insert-size peak above 400 bp with a long tail; clusters amplify poorly so cluster density and yield drop; bias toward short transcripts because long fragments sequence inefficiently.',
      tell: 'Bench if the Bioanalyzer library trace is broad and the under-representation of long inserts is the same across conditions. Biology does not change the fragment-size distribution of a library; a shifted size peak is always prep.',
      artifact: 'insert-size',
    },
    {
      what: 'Fragmentation skipped by mistake, or a 3′-end kit used where full-length coverage was expected',
      signature: 'Coverage confined to the last ~500 nt of transcripts; exon-level and isoform quantification empty; splice-junction counts very low.',
      tell: 'Bench if coverage ends sharply at a fixed distance from the poly(A) site in every gene and the kit name (QuantSeq, Lexogen 3′, 10x) explains it. Biology (alternative polyadenylation) shifts individual genes’ 3′ ends, not all genes to a 500 nt window.',
      artifact: 'three-prime-bias',
    },
    {
      what: 'Sequence-specific hydrolysis hotspots creating a reproducible coverage dip',
      signature: 'The same positions within a transcript show deep coverage valleys in every sample; exon-skipping callers report junctions that do not exist.',
      tell: 'Bench if the dips are at the same coordinates across all samples and conditions, and the fragment ends pile up at those positions. Biology (alternative splicing) produces spliced reads across the gap with a canonical junction, and varies between conditions.',
      artifact: 'end-bias',
    },
  ],

  'reverse-transcription': [
    {
      what: 'RT enzyme inhibited or dead: wrong buffer, carry-over phenol, expired enzyme',
      signature: 'Library yield very low; many PCR cycles needed; duplication rate above 50 %; few genes detected; in extreme cases adapter dimers dominate the library.',
      tell: 'Bench if the affected samples share an RT master mix or date and have good RIN and normal input mass. Biology (low-RNA tissue) gives low yield with input-proportional complexity; a high-input sample with no complexity is enzyme failure.',
      artifact: 'low-input',
    },
    {
      what: 'Template-switch oligo (TSO) or RT primer left in the reads and not trimmed',
      signature: 'A fixed sequence (often ending in GGG) at the start of a large fraction of reads; FastQC “Overrepresented sequences” flags it; soft-clipped read starts in the BAM; lower mapping rate.',
      tell: 'Bench if the sequence is identical across reads and matches the kit’s TSO; trimming it restores mapping. Biology would never put the same 30 nt at the start of 20 % of reads from different genes.',
      artifact: 'primers-in-reads',
    },
    {
      what: 'Spurious second-strand synthesis by the RT in an unstranded or poorly stranded protocol',
      signature: 'Antisense reads over highly expressed genes at 2–10 %; apparent antisense lncRNAs that are exact mirrors of the sense gene’s coverage; strand ratio worse for the most abundant transcripts.',
      tell: 'Bench if the antisense fraction scales with the sense gene’s expression and the antisense coverage traces the sense exons exactly, including splice junctions. Biology (real antisense transcripts) has its own TSS, its own exons and does not scale with the sense gene.',
      artifact: 'strandedness',
    },
    {
      what: 'Random-hexamer priming bias and RT stalling misread as biology',
      signature: 'FastQC “Per base sequence content” fails for cycles 1–12; coverage bumps within transcripts; coverage drops at stable RNA structures and modified bases (e.g. m¹A in tRNA, G-quadruplexes).',
      tell: 'Bench (expected, not a failure) if the bumps are identical across samples and conditions and start-site sequence logos look alike. Biology if the coverage change is condition-dependent, supported by both mates and reproduced with a different priming strategy.',
      artifact: 'end-bias',
    },
    {
      what: 'Internal poly(A) priming when oligo(dT) is used',
      signature: 'Read pile-ups at genomic A-rich stretches inside introns and in 3′ UTRs away from the annotated poly(A) site; apparent novel “transcripts” in A-rich repeats.',
      tell: 'Bench if the pile-up sits immediately upstream of an A-run of ≥ 8–10 nt in the genome and appears in every sample. Biology (a real alternative poly(A) site) is supported by a canonical signal (AAUAAA) and varies between tissues or conditions.',
      artifact: 'three-prime-bias',
    },
  ],

  'second-strand': [
    {
      what: 'USER / UDG digestion incomplete, so the dU strand survived',
      signature: 'RSeQC `infer_experiment.py` reports 70–90 % instead of ≥ 97 % for the expected strand; counts with `-s 2` are lower than expected and `-s 0` recovers them.',
      tell: 'Bench if the “wrong strand” reads trace the same exon structure as the sense reads and the fraction is uniform across all genes. Biology (antisense transcription) is gene-specific, has its own structure and does not change with the kit lot.',
      artifact: 'strandedness',
    },
    {
      what: 'Wrong kit assumed: library annotated as dUTP but actually SMARTer / ligation chemistry (or unstranded)',
      signature: 'Nearly all reads assigned to “no feature” or counts collapse when `-s 2` is used; `infer_experiment.py` shows the opposite orientation or 50/50.',
      tell: 'Bench (documentation) if flipping the strand parameter restores normal count distributions in every sample. Biology cannot flip the orientation of a whole transcriptome.',
      artifact: 'strandedness',
    },
    {
      what: 'dUTP omitted or dTTP contamination in the second-strand mix',
      signature: 'Library is effectively unstranded (50/50) despite a stranded kit; overlapping gene pairs show near-identical counts; antisense fraction ~50 % at every locus.',
      tell: 'Bench if the whole batch is 50/50 and samples prepared from the same RNA on another day are 98/2. Biology never gives exactly symmetric sense/antisense across all genes.',
      artifact: 'strandedness',
    },
    {
      what: 'Half the strands destroyed on purpose, combined with low input: library complexity too low',
      signature: 'Duplication rate 40–70 %; saturation curves flatten early; few genes detected at depth; FastQC “Sequence Duplication Levels” warning.',
      tell: 'Bench if duplication tracks input mass and PCR cycle number across samples. Biology (a transcriptome dominated by a few genes, e.g. globin in blood, insulin in islets) shows duplication concentrated in those genes with normal duplication elsewhere.',
      artifact: 'duplicates',
    },
  ],

  'amplicon-pcr': [
    {
      what: 'Too many cycles or template-limited reactions, generating chimeras',
      signature: 'Many unique sequences that match two different taxa over their two halves; denoiser reports 10–30 % bimeras; richness inflated with singletons that disappear when chimeras are removed.',
      tell: 'Bench if the chimeric sequences’ parents are both abundant in the same sample and the chimera is absent from a lower-cycle re-amplification. Biology (a genuinely novel taxon) has a consistent full-length match in a database or across unrelated samples, not a breakpoint between two known sequences.',
      artifact: 'chimeras',
    },
    {
      what: 'Primer mismatch to key taxa, or an outdated primer set',
      signature: 'A taxon expected in the sample type is absent or 10–100-fold under-represented; mock community recovers some members at a fraction of their known abundance.',
      tell: 'Bench if the missing taxa share a known primer mismatch (in silico PCR against SILVA, TestPrime) and are recovered by shotgun metagenomics of the same DNA. Biology if the taxon is truly absent in shotgun data too.',
      artifact: 'primer-bias',
    },
    {
      what: 'Contaminated reagents or aerosol cross-contamination in the PCR',
      signature: 'PCR blanks with hundreds to thousands of reads; the same handful of ASVs present in blanks and at low abundance in every real sample; a plate-position pattern of shared sequences.',
      tell: 'Bench if the ASVs in blanks are classic kitome taxa (Ralstonia, Burkholderia, Pseudomonas, Bradyrhizobium) and their abundance is anti-correlated with sample biomass. Biology if the taxon’s abundance is independent of biomass and absent from blanks run with the same reagents.',
      artifact: 'kitome',
    },
    {
      what: 'Low-complexity run without enough PhiX or phasing spacers',
      signature: 'FastQC “Per base sequence quality” poor in the first 20 cycles; low cluster passing filter; truncated or heavily filtered reads; high loss at merging.',
      tell: 'Bench if quality is low in exactly the primer positions and every sample on the run is affected equally. Biology cannot lower base quality at primer positions.',
      artifact: 'low-diversity',
    },
    {
      what: 'Polymerase substitution errors and heteroduplexes creating near-identical variants',
      signature: 'ASVs differing by one base from an abundant ASV at ratios of 0.1–1 %; many “strains” of the same species in each sample.',
      tell: 'Bench if the minor variants are different in every sample, scale with the parent’s abundance and are removed by DADA2 error modelling. Biology (true intragenomic 16S variants or co-occurring strains) recurs across samples with a consistent ratio.',
      artifact: 'polymerase-errors',
    },
  ],

  'index-pcr': [
    {
      what: 'Index primer cross-contamination between wells or reused index plates',
      signature: 'Blanks that contain the dominant ASVs of their plate neighbours; low-abundance (0.01–0.5 %) taxa shared by samples that share a row or column; in BCL Convert reports, no excess hopping.',
      tell: 'Bench if the shared sequences follow plate geometry rather than sample metadata and their abundance scales with the neighbour’s depth. Biology if the taxon’s presence tracks sample type and is unrelated to plate layout.',
      artifact: 'index-hopping',
    },
    {
      what: 'Too many cycles in the second PCR, or primers not removed before it',
      signature: 'Additional chimeras between samples’ first-round products; primer-dimer peak at ~120–170 bp in the library trace; short, adapter-dimer reads in the FASTQ that fail to merge.',
      tell: 'Bench if the dimer fraction is a property of the library trace and the chimeric sequences’ parents come from different wells. Biology does not make inter-sample chimeras.',
      artifact: 'adapter-dimers',
    },
    {
      what: 'Uneven amplification between samples, so a few libraries dominate the pool',
      signature: 'Read depth per sample spanning two orders of magnitude; low-input samples and blanks starved of reads; rarefaction removes most of the data.',
      tell: 'Bench if depth correlates with library concentration or amplicon yield rather than with biomass or sample type. Biology affects composition, not how many reads a sample gets after normalised pooling.',
      artifact: 'uneven-depth',
    },
    {
      what: 'Index-hopping on a patterned flow cell with combinatorial indexes',
      signature: 'A sample’s most abundant ASV appears at ~0.1 % in every other sample of the lane, including blanks; the Undetermined file contains index combinations not on the sheet.',
      tell: 'Bench if the contamination level scales with the source sample’s depth and only involves samples sequenced on the same lane. Biology if the taxon recurs across runs and in independent re-extractions.',
      artifact: 'index-hopping',
    },
  ],

  'vlp-enrichment': [
    {
      what: 'Filter clogging or incomplete centrifugation: bacterial cells carried into the VLP fraction',
      signature: 'Bacterial reads 50–90 % of the library; many complete bacterial rRNA genes; assembled contigs are bacterial chromosome fragments rather than phage genomes; low viral-contig fraction from VirSorter2 / geNomad.',
      tell: 'Bench if the bacterial fraction varies with sample viscosity and filter batch, and if blanks are clean. Biology (packaged host DNA in transducing particles, GTAs) gives a low, taxonomically patchy bacterial signal, not whole-genome coverage of the dominant community members.',
      artifact: 'selection-bias',
    },
    {
      what: 'Over-stringent enrichment: 0.22 µm filtration, chloroform or CsCl bands excluding real viruses',
      signature: 'Giant viruses, jumbo phages and enveloped viruses absent in every sample; viral composition unusually dominated by small tailed phages and ssDNA; low total DNA yield.',
      tell: 'Bench if the missing groups are predictable from the protocol (size, envelope, density) and are recovered in bulk metagenomes of the same samples. Biology if the groups are absent in bulk data too.',
      artifact: 'selection-bias',
    },
    {
      what: 'Buffer or filter contamination amplified from near-zero input',
      signature: 'Enrichment blanks with as many reads as samples; the same contigs (often bacterial plasmids, phiX, kit-associated phages) in every sample and blank; low-biomass samples look like blanks.',
      tell: 'Bench if the shared sequences are also in blanks and their relative abundance is inversely proportional to the sample’s DNA yield. Biology if the sequence is absent from blanks and its abundance tracks sample metadata.',
      artifact: 'kitome',
    },
    {
      what: 'Different enrichment protocols within one study, or between the study and a comparison dataset',
      signature: 'PCA separates samples by processing lab or protocol; the two groups differ in bacterial read fraction and in ssDNA vs dsDNA share; “novel” virome differences between cohorts.',
      tell: 'Bench if the separating variable is the protocol and blanks from each protocol differ the same way. Biology if samples processed by both protocols cluster by individual, not by method.',
      artifact: 'batch-effects',
    },
  ],

  'nuclease-extraction': [
    {
      what: 'Nuclease failed or was inactivated too early: free DNA survived',
      signature: 'Host (human) reads 10–60 % of the library instead of under a few percent; bacterial reads with uniform genome coverage; low viral-contig fraction.',
      tell: 'Bench if host fraction varies with nuclease lot or incubation time and the host reads cover the whole genome evenly. Biology (host DNA packaged in capsids) is rare, patchy and tiny by comparison.',
      artifact: 'selection-bias',
    },
    {
      what: 'Nuclease too aggressive or capsids damaged before treatment: genomes of fragile viruses destroyed',
      signature: 'Low yield; specific families (e.g. filamentous phages, enveloped RNA viruses) missing; diversity lower than in bulk metagenomes of the same sample.',
      tell: 'Bench if the missing viruses are those whose capsids are least stable and they return in a no-nuclease control. Biology if they are absent regardless of treatment.',
      artifact: 'selection-bias',
    },
    {
      what: 'Extraction kit carrying its own nucleic acid: columns, beads and lysis buffers are not sterile',
      signature: 'Blanks yield libraries; contigs from kit-associated bacteria and from circular ssDNA “contaminants” (CRESS-like) present in every sample; abundance anti-correlated with sample input.',
      tell: 'Bench if the contigs are in blanks processed with the same kit lot and vanish with a different lot. Biology if the virus is absent from blanks and prevalence tracks host variables.',
      artifact: 'kitome',
    },
    {
      what: 'RNA fraction skipped, or RNA degraded between nuclease step and RT',
      signature: 'No RNA viruses at all (no Picornavirales, Leviviricetes, Reoviridae) in a sample type where they are expected; or RNA libraries with very short inserts and few distinct genomes.',
      tell: 'Bench if the Methods describe DNA-only extraction, or if the RNA library’s insert size and complexity are poor across the batch. Biology if RNA viruses are also absent in an RNA-specific library made from the same material.',
      artifact: 'low-input',
    },
  ],

  mda: [
    {
      what: 'Picogram input amplified overnight: stochastic priming dominates',
      signature: 'Per-contig coverage varies 100–10,000-fold with deep valleys every few kilobases; assemblies break at the valleys and the per-contig coverage Gini is above ~0.5. Relative abundances between viruses change by orders of magnitude between technical replicates.',
      tell: 'Bench if the unevenness is equally extreme in every MDA library regardless of biomass, a spiked-in dsDNA phage shows the same valleys, and replicate MDA reactions of one extract disagree on abundances. Biology if a non-amplified library of the same extract reproduces the abundance ranking and the coverage valleys sit at the same positions in independent samples (true deletions or strain mixtures).',
      artifact: 'mda-bias',
    },
    {
      what: 'Rolling-circle preference for circular ssDNA genomes',
      signature: 'Microviridae, CRESS viruses and anelloviruses make up most of the virome; their contigs have very high, strand-skewed coverage while dsDNA phages that dominate a 16S-inferred host community are nearly absent.',
      tell: 'Bench if the ssDNA fraction is high only in MDA libraries and collapses in a library made without WGA or with an ssDNA-aware kit (Accel-NGS 1S) from the same extract. Biology if the ssDNA dominance survives an unamplified prep and tracks a sample variable (e.g. anelloviruses in immunosuppressed plasma) rather than the amplification batch.',
      artifact: 'mda-bias',
    },
    {
      what: 'Reagent and lab DNA amplified along with the sample',
      signature: 'A fixed set of taxa (Bacillus, Pseudomonas, Delftia, Ralstonia, lab-strain phages like phiX or lambda) appears in blanks and in low-input samples, with abundance inversely proportional to input mass, and often at very high coverage.',
      tell: 'Bench if the same organisms are in the amplified blanks and their share falls as input rises; a biological taxon does not become more abundant as you add less sample. Biology if the taxon is absent from blanks, its abundance is independent of input mass and its strain differs between samples.',
      artifact: 'kitome',
    },
    {
      what: 'Phi29 template switching creates chimeric products',
      signature: 'Read pairs and contig junctions that join unrelated genomes; mosaic “novel” contigs with an abrupt coverage change at the join; a chimeric read-pair rate of several percent when mapping back to a reference set.',
      tell: 'Bench if junction positions are random, each junction is supported by one or two reads, and the partners are the most abundant genomes in the sample (chimeras form in proportion to abundance). Biology (true recombinant or prophage) if the same junction recurs across independent samples, is spanned by many reads with consistent breakpoints, and coverage is continuous across it.',
      artifact: 'chimeras',
    },
  ],

  tagmentation: [
    {
      what: 'Transposome:DNA ratio off, usually a mis-quantified input (Nextera XT)',
      signature: 'Picard `InsertSizeMetrics` median shifts per sample by hundreds of bases; short-insert samples show FastQC adapter content rising from mid-read and many overlapping mates, long-insert samples cluster poorly and yield few reads.',
      tell: 'Bench if the insert-size median correlates with the recorded input mass or prep date and the distribution is unimodal but shifted. Biology only when the DNA was short before tagmentation (FFPE, cfDNA, ancient DNA), which shows as a fixed ladder or a smear on the pre-library trace and tracks sample type, not prep batch.',
      artifact: 'insert-size',
    },
    {
      what: 'Nextera adapter left in reads because a TruSeq trimmer was assumed',
      signature: 'FastQC “Adapter Content” flags “Nextera Transposase Sequence”; aligners soft-clip read 3′ ends, mapping rate drops a few percent and false variants cluster at read ends. The trimmer log reports the TruSeq sequence found in ~0 % of reads.',
      tell: 'Pipeline, never biology: `CTGTCTCTTATACACATCT` at read ends is the transposase mosaic end. Re-trim with auto-detection and the clipped tails disappear.',
      artifact: 'adapter-readthrough',
    },
    {
      what: 'Low input or too many PCR cycles after tagmentation',
      signature: 'Duplication 20–60 % (Picard `MarkDuplicates`) and a GC-coverage curve that bows down at both extremes; high-GC taxa (Actinobacteria) and AT-rich regions under-covered, so some genomes look absent.',
      tell: 'Bench if duplication and GC bowing track input mass and cycle number across samples and the “absent” taxa are detectable by 16S or qPCR from the same extract. Biology if a GC-defined group is missing only in samples of one condition while duplication and GC curves look the same across conditions.',
      artifact: 'gc-bias',
    },
    {
      what: 'Tn5 insertion motif misread as a biological signal',
      signature: 'FastQC “Per base sequence content” fails for the first ~10 bases of every read; a k-mer enrichment at read starts that motif-discovery tools report as a palindromic motif; in ATAC-seq a footprint-like dip at every cut site.',
      tell: 'Chemistry if the skew is identical across all samples and organisms and is confined to read positions 1–10. Biology if a motif is enriched independent of its position in the read and is absent from a tagmented genomic-DNA control.',
      artifact: 'end-bias',
    },
    {
      what: 'Different Tn5 lots or homemade enzyme across the study',
      signature: 'Samples cluster by prep batch in coverage profiles or ATAC peak strength; batch-specific insert-size and GC curves; differential “peaks” that are really insertion-preference differences.',
      tell: 'Bench if batch explains a top principal component and the batch-specific regions share a sequence composition. Biology if the signal persists after batch correction and is reproduced when samples from both conditions are re-prepped with one enzyme lot.',
      artifact: 'batch-effects',
    },
  ],

  'hmw-extraction': [
    {
      what: 'DNA sheared by vortexing, narrow tips or bead-beating',
      signature: 'NanoPlot read-length N50 of 3–10 kb instead of 30 kb or more, a unimodal histogram with no long tail; assemblies fragment at repeats; few reads span rRNA operons or transposons.',
      tell: 'Bench if every library from that extraction batch shares the N50, the Femto Pulse or gel trace already showed the DNA short, and the lambda control on a sister flow cell read long. Biology only when the DNA was short in the sample itself (degraded tissue, cfDNA, dying cells), which varies by sample rather than by who extracted it.',
      artifact: 'read-length',
    },
    {
      what: 'Carry-over of polysaccharides, phenol or salt',
      signature: 'pycoQC shows active pores falling steeply in the first hours and yield plateauing at a fraction of the expected gigabases; many pores reported as “unavailable” or “inactive”; per-read quality can also drift down.',
      tell: 'Bench: a flow cell check before loading showed normal pore counts and a clean control library runs fine on a sister cell. Sample biology does not kill pores; a viscous or coloured extract and A260/230 below 1.8 are the culprit.',
      artifact: 'quality-decay',
    },
    {
      what: 'Gentle lysis skips hard-to-lyse cells',
      signature: 'Gram-positive and spore-forming taxa (Firmicutes, Actinobacteria) are depleted and host or easily lysed Gram-negatives dominate relative to a bead-beating short-read profile of the same sample.',
      tell: 'Bench if the depletion hits the same taxa in every sample by roughly the same factor and disappears in the matched bead-beating extraction. Biology if the shift is sample-specific, agrees with 16S from the same gentle extraction and with an independent method such as qPCR.',
      artifact: 'lysis-bias',
    },
    {
      what: 'Short fragments not removed before library prep',
      signature: 'A bimodal read-length histogram with a large mass below 1–2 kb that consumes pores and sequencing time; N50 fine but N50 by read count low; coverage dominated by short reads.',
      tell: 'Bench if the short reads map to random genomic positions in proportion to coverage. Biology if they map preferentially to plasmids, phages or mitochondria, or if the sample type (plasma, saliva) is expected to carry short DNA.',
      artifact: 'read-length',
    },
  ],

  'nanopore-library': [
    {
      what: 'Poor end-repair or adapter ligation; too little library loaded',
      signature: 'MinKNOW pore occupancy well below ~70 % at the start, yield a fraction of expected, with normal read length and quality for the reads that exist.',
      tell: 'Bench, always: a pore scan shows pores available but idle. Nothing about the sample reduces occupancy once DNA is adapted; low yield with normal reads is a loading or ligation problem.',
      artifact: 'uneven-depth',
    },
    {
      what: 'Free adapter or barcode left after cleanup',
      signature: 'A spike of reads under ~200 bp consisting of adapter and barcode sequence with no insert, rising “unclassified” fraction, and pores blocked early in the run.',
      tell: 'Bench if the short reads are adapter-only and do not align anywhere. Biology if short reads carry insert sequence that maps to the genome, plasmids or phages.',
      artifact: 'adapter-dimers',
    },
    {
      what: 'Two molecules ligated end-to-end or read back-to-back through a pore',
      signature: 'Reads with an internal adapter and split (supplementary) alignments joining two distant loci or two organisms; a chimera rate of ~1–3 %; false structural variants, fusions or “horizontal transfer” events.',
      tell: 'Bench if the junction carries adapter or barcode remnants, partners pair randomly in proportion to abundance and each breakpoint is seen in one read. Biology (true SV, prophage, fusion) if many reads share the same breakpoint to the base, no adapter sits at the join, and coverage is continuous across it.',
      artifact: 'chimeras',
    },
    {
      what: 'Native barcodes ligated on one end only, or trimmed too aggressively',
      signature: '10–30 % of reads unclassified; 0.1–1 % of reads from sample A appear in sample B on the same flow cell, so B carries low-level traces of A’s dominant organisms.',
      tell: 'Bench if the “contaminant” taxa in B are exactly the dominant taxa of other samples on the same flow cell, their share scales with those samples’ yield, and they vanish when demultiplexing requires barcodes at both ends. Biology if the taxon is present in samples sequenced on other flow cells and absent from co-run negative controls.',
      artifact: 'index-hopping',
    },
    {
      what: 'PCR barcoding or cDNA-PCR chosen for low input',
      signature: 'Groups of reads with identical start and end coordinates (PCR duplicates); 5mC and 6mA calls near zero everywhere; shorter read-length distribution than the DNA trace suggests.',
      tell: 'Bench if the kit involved PCR: duplicates and absent methylation are expected and not biological. Biology if the library was PCR-free and methylation is still absent (some bacteria lack 5mC; look for 6mA at Dam motifs or the species’ known motifs instead).',
      artifact: 'duplicates',
    },
  ],

  'nanopore-sequencing': [
    {
      what: 'Pores dying or clogging through the run, no wash or reload',
      signature: 'pycoQC yield-over-time flattens; reads from late in the run have lower mean Q and more indels; the read `start_time` in the sequencing summary predicts quality.',
      tell: 'Bench if quality and error rate correlate with read start time and the same drift shows in every barcode on the flow cell. Biology does not change over the hours of a run; a sample-specific quality difference that persists after restricting to the first 12 h is real (e.g. a heavily modified genome).',
      artifact: 'quality-decay',
    },
    {
      what: 'Translocation speed drift from fuel exhaustion or temperature',
      signature: 'MinKNOW “speed” falls below ~350–400 b/s late in the run; basecall quality drops and homopolymer indels rise in late reads.',
      tell: 'Bench if the drop is time-dependent and corrected by re-basecalling with a model that handles the lower speed or by discarding late reads. Biology never shifts translocation speed.',
      artifact: 'homopolymer-errors',
    },
    {
      what: 'Adaptive sampling rejects left in the output',
      signature: 'A sharp read-length peak at ~400–600 bp whose reads map to the depleted target (host, abundant organism); `end_reason` is `data_service_unblock_mux_change` in the sequencing summary; N50 and the target’s coverage profile are distorted (reads start randomly but all end early).',
      tell: 'Instrument, not biology: the end_reason tag identifies every rejected read. Genuinely short molecules have `signal_positive` end reasons and are not restricted to one target.',
      artifact: 'read-length',
    },
    {
      what: 'Homopolymer length misread (worst on R9.4.1 and fast models)',
      signature: 'Frameshift indels in runs of 5 or more identical bases; annotated assemblies full of truncated or frameshifted ORFs (“pseudogenes”); indel “variants” in homopolymers that short reads or HiFi do not confirm.',
      tell: 'Chemistry if the frameshifts sit in homopolymers, are spread evenly across genes, and disappear after polishing or SUP re-basecalling. Biology if a frameshift is in a non-homopolymer context, is supported by nearly all reads and by an orthogonal technology.',
      artifact: 'homopolymer-errors',
    },
    {
      what: 'Flow cell washed and reloaded with a different library, or run resumed',
      signature: 'Reads from the previous library at 0.1–1 % in the new one; a second read-length or quality mode appearing at a specific time in the run.',
      tell: 'Bench if the foreign reads are the previous library’s dominant organisms and appear only after the reload time stamp. Biology if the taxon is also in samples run on fresh flow cells.',
      artifact: 'index-hopping',
    },
  ],

  'nanopore-basecalling': [
    {
      what: 'Live fast or HAC model kept as the final data',
      signature: 'Modal read quality Q10–Q17 instead of Q20+; assemblies need several polishing rounds and still carry frameshifts; indel calls in the thousands against a close reference.',
      tell: 'Pipeline, not biology: the `basecall_model_version_id` in the read header names the model, and re-basecalling the POD5 with SUP removes most of the differences. A genome does not have a low Q score.',
      artifact: 'homopolymer-errors',
    },
    {
      what: 'Different basecaller models or versions across samples',
      signature: 'Samples split by model in error profile, homopolymer handling and methylation frequency; variant calls present in one batch and absent in the other; a principal component that follows model string.',
      tell: 'Pipeline if the split follows the model id in the headers and disappears after re-basecalling everything with one model. Biology if it persists after uniform re-basecalling.',
      artifact: 'batch-effects',
    },
    {
      what: 'Fail reads (mean Q below ~9) merged into the pass set',
      signature: 'A bimodal per-read quality distribution in NanoPlot; mapping rate drops, and the unmapped reads are low quality and assemble into nothing coherent, inflating the “unclassified” or “novel” fraction.',
      tell: 'Pipeline if the unmapped reads are the low-Q mode and vanish with a Q9–Q10 filter. Biology (a truly novel organism) if unmapped reads are high quality, assemble into contigs with coding structure and recur across samples.',
      artifact: 'quality-decay',
    },
    {
      what: 'Adapters and barcodes not trimmed, or trimmed with the wrong kit setting',
      signature: '20–70 bp of constant sequence at read ends, soft-clips in every alignment, apparent insertions at read starts, a k-mer spike in the first positions; barcode demultiplexing leaves most reads unclassified when the wrong kit is named.',
      tell: 'Pipeline, never biology: the clipped sequence matches the ONT adapter or barcode set. Re-run Dorado with the right kit or Porechop.',
      artifact: 'adapter-readthrough',
    },
    {
      what: 'Modification calling on a PCR-amplified library or from a FASTQ',
      signature: 'Methylation at ~0 % at every CpG (PCR erases it) or calls absent entirely because the FASTQ discarded the MM/ML tags; uniform ~50 % values when the wrong modification model was used.',
      tell: 'Bench or pipeline if the library kit included PCR or the output was FASTQ rather than unaligned BAM. Biology if the library was PCR-free, the BAM carries MM/ML tags, and the zeros are confined to genomes or regions that lack that modification (many bacteria have no 5mC; check 6mA motifs).',
    },
  ],

  'single-cell-suspension': [
    {
      what: 'Over-digestion or a long warm dissociation (37 °C for more than ~30 min)',
      signature: 'A dissociation-stress module (FOS, JUN, HSPA1A, ATF3, EGR1) high in most cells; those genes drive a principal component and a “cluster” that cuts across cell types.',
      tell: 'Bench if the stress genes are up in every cell type at once and the module strength follows dissociation batch or time-to-chip, not condition. Biology if the response is confined to the cell types and conditions where it makes sense, is present in nuclei (snRNA-seq) from the same tissue, and is reproduced with cold-active protease or fixed cells.',
      artifact: 'dissociation-stress',
    },
    {
      what: 'Low viability at loading; dead cells not removed',
      signature: 'A population of barcodes with high mitochondrial fraction (> 20–30 %), low UMI and gene counts and no specific markers; Cell Ranger “Fraction Reads in Cells” below ~70 %; a sample-wide shift in the mito-fraction histogram.',
      tell: 'Bench if high-mito cells occur in every cell type, the sample’s viability was recorded low and ambient contamination is high in the same sample. Biology if the high mitochondrial content is confined to cell types known for it (cardiomyocytes, hepatocytes, proximal tubule) that otherwise have normal UMI counts and markers.',
      artifact: 'mito-fraction',
    },
    {
      what: 'Fragile or large cell types lost to digestion and straining',
      signature: 'Neurons, adipocytes, podocytes or tubular epithelium absent or at a fraction of their histological abundance; immune cells and fibroblasts over-represented; cell-type proportions differ from snRNA-seq of the same tissue.',
      tell: 'Bench if the missing types are the known fragile ones, are recovered by nuclei isolation or a gentler protocol, and the loss is similar in all samples. Biology if the loss is condition-specific and reproduced in nuclei and histology.',
      artifact: 'batch-effects',
    },
    {
      what: 'Clumping from released DNA (no DNase), no straining, or over-concentration',
      signature: 'Doublet rate far above the ~0.8 % per 1,000 recovered cells expected from loading; barcodes with 2–3× the UMI count co-expressing two lineages’ markers; often fewer cells recovered than targeted because clumps clog the chip.',
      tell: 'Bench if the doublet call rate exceeds the Poisson expectation, hetero-typic pairs combine the most abundant types in proportion to their frequency, and co-expressing barcodes have roughly summed UMIs. Biology if the “co-expressing” cells form a coherent population with normal UMI counts, intermediate markers and reproducible frequency across samples.',
      artifact: 'doublets',
    },
    {
      what: 'Red blood cells not lysed, or long delay with ongoing lysis before loading',
      signature: 'Haemoglobin genes (HBB, HBA1/2) in every cluster; an erythrocyte cluster with very few genes; haemoglobin UMIs in empty droplets; higher ambient fraction in that sample.',
      tell: 'Bench if haemoglobin appears in all cell types at a level proportional to that sample’s RBC content and the “erythrocyte” cells have almost no other genes. Biology if erythroid cells express nuclear erythroid genes (GYPA, ALAS2, KLF1) and the tissue (marrow, fetal liver) is expected to contain them.',
      artifact: 'ambient-rna',
    },
  ],

  'droplet-encapsulation': [
    {
      what: 'More cells loaded than recorded, or a cell count that was too high',
      signature: 'Doublet detectors (scDblFinder, Scrublet) call 10–20 % rather than the expected rate; a shoulder of barcodes with about twice the median UMI count; clusters bridging two cell types.',
      tell: 'Bench if the called rate matches the Poisson expectation for the actual number of cells recovered and the doublets pair cell types at random in proportion to abundance. Biology if the bridging population has its own markers, normal UMI counts and appears at a consistent fraction across independently loaded samples.',
      artifact: 'doublets',
    },
    {
      what: 'Chip wetting failure or clog',
      signature: 'A few hundred to a thousand cells recovered instead of thousands, with normal UMIs, genes and mito fraction per cell; a barcode-rank plot with a cliff at a very low barcode count; sometimes a note of a re-run channel.',
      tell: 'Bench, always: biology does not reduce the number of cells while leaving per-cell metrics normal. If the channel was re-run, the second library is a separate batch.',
      artifact: 'uneven-depth',
    },
    {
      what: 'Lysed cells before and during loading: heavy ambient RNA',
      signature: 'Cell Ranger “Fraction Reads in Cells” < 70 %; empty droplets with hundreds of UMIs; a barcode-rank plot with a gentle slope rather than a cliff; the most abundant cell types’ markers at low level in every cell.',
      tell: 'Bench if the shared transcripts are exactly the sum of that sample’s most abundant cell types’ top genes (the ambient profile from empty droplets) and the level is per-sample, not per-cell-type. Biology if the “shared” gene is expressed by a defined subset at high level and is absent from the empty-droplet profile.',
      artifact: 'ambient-rna',
    },
    {
      what: 'Samples pooled in one channel without hashing or genotype differences',
      signature: 'Same-sample doublets cannot be identified; the doublet rate rises with the total cells loaded while the detectable rate stays low; cells cannot be assigned back to samples at all.',
      tell: 'Bench design: the expected doublet rate follows total cells recovered; estimate it from a hashed or genotype-pooled channel and apply it, because biology cannot tell you which barcodes are two cells.',
      artifact: 'doublets',
    },
  ],

  'barcoded-rt': [
    {
      what: 'Inefficient reverse transcription (enzyme lot, RNase, temperature, delayed incubation)',
      signature: 'Median UMIs and genes per cell low in every cell type of one sample while Sequencing Saturation is high (so depth is not the cause); the matrix is sparser than sister samples; cDNA yield low.',
      tell: 'Bench if the shift is uniform across cell types within the sample and sister samples processed the same day are fine. Biology if low RNA content is confined to cell types known to be small or quiescent (naive T cells, neutrophils, erythrocytes) while other types match sister samples.',
      artifact: 'sparse-counts',
    },
    {
      what: 'Internal priming of poly(dT) on A-rich stretches, worse with degraded RNA',
      signature: 'Read pile-ups in introns and intergenic regions just upstream of runs of 6 or more A’s; apparent novel transcripts or “pre-mRNA” peaks; intronic fraction above ~30 % in cells.',
      tell: 'Chemistry if each peak sits 50–300 bp upstream of an A-rich stretch, is present in every sample and cell type and is strand-consistent with the gene. Biology if intronic reads are spread along the intron, vary by cell type or condition, and the sample is nuclei (where 30–50 % intronic is expected).',
      artifact: 'intronic-reads',
    },
    {
      what: 'RNA degraded before capture (dying cells, long bench time)',
      signature: 'Read coverage confined to the final 100–200 bp before the poly(A) site; low genes per cell; long genes under-counted; usually a high mitochondrial fraction in the same sample.',
      tell: 'Bench if the 3′ compression and low complexity affect one sample or batch in all cell types and correlate with time from dissociation to chip. Biology does not shorten the read-to-poly(A) distance; a cell type with few genes but normal gene-body profile is small, not degraded.',
      artifact: 'degradation',
    },
    {
      what: 'Failed template switching or excess TSO',
      signature: 'Very low cDNA yield because molecules lacking the TSO handle do not amplify; Read 2 starting with the TSO sequence `AAGCAGTGGTATCAACGCAGAGTACATGGG` in a sizeable fraction of reads; lower “Reads Mapped Confidently to Transcriptome”.',
      tell: 'Bench or pipeline: TSO at read starts is a chemistry sequence and should be trimmed; its abundance varies by batch, never by cell type. Biology never produces it.',
      artifact: 'adapter-readthrough',
    },
    {
      what: 'Feature-barcode oligos captured into the gene-expression library',
      signature: 'A few percent of Read 2 are a constant ~15–20 bp antibody or hashtag oligo plus poly(A); they are unmapped, and the unmapped-read fraction tracks how much antibody was added.',
      tell: 'Bench if the constant sequences match the feature-barcode design and sit in the unmapped fraction of every cell. Biology never yields identical unmapped reads across all cells.',
      artifact: 'adapter-dimers',
    },
  ],

  'cdna-amplification': [
    {
      what: 'Too many cDNA PCR cycles for the number of cells',
      signature: 'Sequencing Saturation above ~80 % at normal depth; raw matrix full of barcodes one mismatch from real ones with a handful of UMIs; UMI counts per cell inflated before, and deflated after, collapsing.',
      tell: 'Bench if the extra barcodes are Hamming-distance-1 neighbours of high-count barcodes and vanish after whitelist correction, and the “cells” they form have profiles identical to their parents. Biology never creates barcodes in sequence space adjacent to existing cells.',
      artifact: 'barcode-errors',
    },
    {
      what: 'Low cDNA yield (few or dead cells, failed RT) pushed through with extra cycles',
      signature: 'Yield an outlier on the cDNA trace; high duplication with low median UMIs per cell; saturation high while genes per cell stays low; the sample is an outlier in the embedding.',
      tell: 'Bench if the low complexity is sample-wide and the wet lab recorded the yield as an outlier. Biology if cells with low counts are the expected small cell types and the sample’s saturation and yield were normal.',
      artifact: 'sequencing-saturation',
    },
    {
      what: 'PCR chimeras and barcode swapping between templates',
      signature: 'Markers of one cell type at 1–3 UMIs in cells of another, at a level proportional to the marker’s total abundance in the library; low-level “co-expression” everywhere, indistinguishable from ambient RNA.',
      tell: 'Bench if the foreign counts are tiny, uniform across all cells and scale with the gene’s library-wide abundance, and if the same genes also appear in empty droplets. Biology if the gene is high in a defined subpopulation with normal UMI totals.',
      artifact: 'chimeras',
    },
    {
      what: 'Primer or TSO concatemers not removed by cleanup',
      signature: 'A sharp peak below 200 bp on the Bioanalyzer trace; reads that are primer and TSO sequence only; lower “Valid Barcodes” and “Reads Mapped Confidently” in the web summary.',
      tell: 'Bench: the sequences are chemistry oligos and vary by cleanup batch. Biology never produces reads composed of primer sequence.',
      artifact: 'adapter-dimers',
    },
  ],

  'sc-library-construction': [
    {
      what: 'Size selection too tight: short inserts',
      signature: 'Read 2 reads through the poly(A) tail into the UMI, barcode and Read 1 adapter; FastQC adapter and poly(A) content rising along Read 2; “Reads Mapped Confidently to Transcriptome” lower than sister libraries.',
      tell: 'Bench if the fraction of reads containing poly(A) plus adapter is high in that library and its final library trace peaked short. Biology never puts adapter in Read 2.',
      artifact: 'adapter-readthrough',
    },
    {
      what: 'Single-index libraries pooled on a patterned flow cell: index hopping',
      signature: 'Cell barcodes shared between libraries sequenced on the same lane with very unequal counts; phantom “cells” in library B whose profiles match library A’s cell types (classic: mouse cells in a human sample) at low UMIs.',
      tell: 'Bench if shared barcodes have counts differing by 100-fold or more across libraries and the phantom cells’ profiles belong to another library’s cell types. Biology if the barcode’s profile is unique and its counts in each library are comparable (chance barcode reuse).',
      artifact: 'index-hopping',
    },
    {
      what: 'Sample sheet lists only some of the four i7 sequences of a single-index set',
      signature: 'About a quarter (or half) of the lane’s reads go to Undetermined; the affected sample has lower depth and lower saturation than its pool share predicts.',
      tell: 'Pipeline, not biology: the Undetermined FASTQ’s top index sequences are the missing members of the set. Re-demultiplex.',
      artifact: 'undetermined',
    },
    {
      what: 'Libraries or indexes swapped between samples at pooling',
      signature: 'A sample’s sex genes (XIST, RPS4Y1) or genotype (SNPs in the BAM) contradict the metadata; treatment markers appear in the “control” sample; a hashed sample’s hashtags do not match the label.',
      tell: 'Bench if genotype or sex contradicts metadata, which biology cannot do. Biology if sex and genotype agree with the records and only the expression profile is surprising.',
      artifact: 'sample-swaps',
    },
  ],

  'barcode-processing': [
    {
      what: 'Wrong chemistry whitelist or read configuration given to the pipeline',
      signature: '“Valid Barcodes” well below ~90 %, often under 50 %; Cell Ranger refuses or auto-detects a different chemistry; very few cells called although the library looked normal.',
      tell: 'Pipeline, not biology: re-run with the right chemistry (v2 vs v3 whitelist, 3′ vs 5′, Read 1 length) and the valid-barcode fraction recovers.',
      artifact: 'barcode-errors',
    },
    {
      what: 'Knee-only cell calling drops low-RNA cell types',
      signature: 'Neutrophils, some T cells, erythroblasts or platelets absent from the filtered matrix but present as a shoulder below the knee in the raw barcode-rank plot; “no neutrophils in blood” type conclusions.',
      tell: 'Pipeline if EmptyDrops (DropletUtils) or `--force-cells` on the raw matrix recovers barcodes with a coherent profile for that type. Bench if the type is also missing from the raw matrix because it did not survive dissociation. Biology only if the type is absent by both routes and the sample context explains it.',
      artifact: 'cell-calling',
    },
    {
      what: 'Cell calling too permissive: empty droplets counted as cells',
      signature: 'Hundreds of “cells” with a few hundred UMIs forming a cluster with no specific markers, high mito fraction, and a profile equal to the ambient profile from empty droplets; it sits at the bottom of the UMI distribution.',
      tell: 'Pipeline if the cluster’s profile equals the empty-droplet average and disappears with a stricter cut or ambient-aware calling. Biology if the low-UMI population has distinct markers (platelets, neutrophils) at the rate expected for the tissue.',
      artifact: 'empty-droplets',
    },
    {
      what: 'Intron setting, pipeline or annotation differs between samples',
      signature: 'Samples split by pipeline in total UMIs (20–50 % more with introns in nuclei), per-gene counts for intron-rich genes, and sometimes cluster membership; a batch factor that equals the software version.',
      tell: 'Pipeline if the split follows the processing record and vanishes after reprocessing every sample with one pipeline, version, reference and intron setting. Biology if it persists after uniform reprocessing.',
      artifact: 'batch-effects',
    },
    {
      what: 'Multi-mapped reads discarded, so gene families are under-counted',
      signature: 'Paralog-rich families (histones, HLA, some metallothioneins) and recently duplicated genes appear absent or far below bulk RNA-seq; the BAM holds their reads with MAPQ 0 and no gene tag.',
      tell: 'Pipeline if the reads exist in the BAM as multi-mappers and a tool that handles multi-mapping (alevin-fry, STARsolo with EM) recovers counts. Biology if no reads at all touch the locus.',
      artifact: 'sparse-counts',
    },
  ],

  'smrtbell-library': [
    {
      what: 'Weak or skipped size selection: short molecules win the race into the ZMWs',
      signature: 'Read-length N50 far below the Femto Pulse peak of the sheared DNA, a heavy shoulder of 1–5 kb HiFi reads with very high `np`, and assembly contiguity well under what the gigabase yield predicts.',
      tell: 'Bench if the short reads are random genomic fragments spread evenly over the genome and the pre-selection trace was long. Biology if the short reads are enriched for specific sequences (mitochondria, plasmids, extrachromosomal circles, a virus) or if the input gDNA trace itself was already a smear, which points to a degraded sample rather than the library step.',
      artifact: 'read-length',
    },
    {
      what: 'Over-shearing (Megaruptor setting, g-TUBE speed) or nicked, damaged input DNA',
      signature: 'A unimodal insert distribution shifted to 5–10 kb instead of 15–20 kb; HiFi yield and `rq` look fine, but phasing blocks and repeat resolution are poor and the polymerase often stops before the circle is complete.',
      tell: 'Bench if every sample sheared on the same day is short regardless of tissue, or the Femto Pulse of the input gDNA was intact but the library is not. Sample-side degradation (FFPE, old extractions, stored blood) shows up as a smear in the input trace, differs by sample and tracks storage history, not shearing batch.',
      artifact: 'degradation',
    },
    {
      what: 'Adapter dimers or free adapter not removed by the bead clean-ups',
      signature: 'A sharp 50–100 bp peak on the library trace; the run report lists a high “adapter dimer” percentage; thousands of ZMWs give reads of near-zero length after trimming and the HiFi yield per cell is well below the loading table prediction.',
      tell: 'Bench only: no sample produces molecules that consist of adapter alone. A bimodal insert-length histogram whose short mode is adapter sequence settles it; a short mode that is genomic sequence points at size selection or the sample instead.',
      artifact: 'adapter-dimers',
    },
    {
      what: 'Incomplete exonuclease clean-up or failed ligation: molecules with one adapter or none',
      signature: 'Many ZMWs with a single pass (`np` = 1) and no HiFi read; the run report shows a wide gap between polymerase read yield and HiFi yield; some reads carry adapter sequence internally where the trace was not split.',
      tell: 'Bench if the single-pass fraction is high across the whole cell and the unsplit adapter sequence is found inside reads at random genomic positions. No biology lowers the pass count independently of insert length; if low `np` tracks long inserts only, that is the expected physics, not a failure.',
    },
    {
      what: 'Barcoded-adapter ligation chimeras or a mislabelled barcode plate in a multiplexed prep',
      signature: 'A low (0.1–1 %) uniform background of reads carrying another pool member’s alleles or taxa; with asymmetric barcodes lima reports a surprising fraction of “different barcode pair” reads; with symmetric barcodes nothing flags it at all.',
      tell: 'Bench if the “contaminant” sequences match a specific co-pooled sample, appear at a flat rate across the genome, and vanish when the sample is run alone. Biology (true low-frequency variants, mixed infection, mosaicism) is sample-specific, is not found in the other pool members, and is reproduced in an independent library.',
      artifact: 'chimeras',
    },
  ],

  'smrt-sequencing': [
    {
      what: 'Under-loading: library mis-quantified or diluted below the loading table',
      signature: 'P0 (empty ZMWs) above 50 % and P1 under 40 % in the run report; HiFi yield a fraction of the expected gigabases while read length, `np` and `rq` distributions look normal.',
      tell: 'Bench only. The reads that exist are fine; the problem is how many. Low coverage from under-loading is uniform across the genome, whereas biologically low coverage (a tiny genome, high host fraction in a metagenome) is uneven and sequence-specific.',
      artifact: 'zmw-loading',
    },
    {
      what: 'Over-loading: two polymerase complexes in many ZMWs',
      signature: 'P2 above 10–15 %; a large gap between polymerase reads and HiFi reads because mixed traces fail consensus; a sprinkling of reads that look like joins between two unrelated loci.',
      tell: 'Bench if the apparent chimeric joins have random breakpoints, lack any repeated junction, occur once each, and disappear in a re-loaded cell. Real structural variants recur at the same breakpoint in several reads, are supported by both flanks, and reappear in a second library.',
      artifact: 'zmw-loading',
    },
    {
      what: 'Polymerase stalling: carried-over phenol, EDTA, polysaccharides or unrepaired DNA damage',
      signature: 'Polymerase read length well below expectation (e.g. < 50 kb when 100 kb+ is typical), mean passes low for the insert size, HiFi yield down while P1 is normal; `rq` is lower especially for long inserts.',
      tell: 'Bench if every sample from one extraction batch or one sample type (plant, soil, stool) shows it and a cleaned-up re-prep recovers read length. There is no biological reason for a polymerase to stop early; a sample type that causes it is still a processing effect and should be handled as a batch covariate.',
      artifact: 'read-length',
    },
    {
      what: 'A short second population loaded with the library: adapter dimers or small contaminant DNA',
      signature: 'A clearly bimodal insert-length histogram in the run report; the short mode has very high `np` and takes a disproportionate share of ZMWs; coverage from the long mode is lower than planned.',
      tell: 'Bench if the short mode is adapter sequence or random genomic fragments. Biology if the short mode is one or a few specific sequences (mitochondrial genome, plasmids, a phage, circular viral genomes), in which case it is a real feature of the sample and should be kept, not filtered.',
      artifact: 'adapter-dimers',
    },
    {
      what: 'Methylation called from reads with too few passes or with a mismatched kinetics model',
      signature: 'MM/ML tags present but noisy: many CpGs at intermediate (30–70 %) methylation scattered at random, methylation values that correlate with `np` rather than with genomic context, and poor agreement with a matched bisulfite or EM-seq dataset.',
      tell: 'Bench if the intermediate values are concentrated in low-`np` reads and tighten toward 0 or 100 % after filtering to higher pass counts, or if batches differ by primrose / CCS model version in the `@PG` header. Biology (imprinting, allele-specific methylation, cell mixtures) is consistent across reads at a locus, phases with the haplotype, and does not depend on pass count.',
    },
  ],

  'ccs-consensus': [
    {
      what: 'Fail reads (rq < 0.99) kept, or a looser rq filter applied to one batch',
      signature: 'A tail of reads with `rq` 0.9–0.99; variant calling produces an excess of singleton 1-bp indels in homopolymers of 6+ bases; assembly polishing leaves homopolymer-length errors; batches differ in indel rate.',
      tell: 'Bench/compute if the extra variants are indels in homopolymers, supported by low-`np`/low-`rq` reads and present on one strand or one read only. Biology if a variant is a substitution or an indel outside homopolymers, supported by reads of all pass counts and both orientations, and reproduced in a second sample or library.',
      artifact: 'hifi-residual-errors',
    },
    {
      what: 'Demultiplexing with the wrong barcode set or the wrong symmetric/asymmetric mode',
      signature: 'lima reports a large unassigned fraction or low mean barcode scores; one sample receives almost no reads while another gets twice its share; sex or genotype of a sample does not match its metadata.',
      tell: 'Bench if the problem is a whole sample, the reads in the “wrong” bin are a clean single genotype, and the lima summary shows the mismatch. Biology never moves an entire sample; a mixture of two genotypes at roughly equal depth is a pooling error or a swap, not a mosaic.',
      artifact: 'sample-swaps',
    },
    {
      what: 'Unrecognised or untrimmed adapters: hairpin reads and adapter remnants in the FASTQ',
      signature: 'Reads that are near-perfect palindromes (the insert followed by its reverse complement joined through a short adapter remnant); assemblers produce inverted-duplication artefacts; adapter k-mers enriched at read ends.',
      tell: 'Bench if the inverted-repeat junction carries adapter sequence, the palindromes occur at random loci and each is seen in one read only. Biology if the inverted repeat sits at a fixed genomic locus, is supported by many independent molecules, and the junction sequence is genomic rather than adapter.',
      artifact: 'chimeras',
    },
    {
      what: 'Different CCS or DeepConsensus versions across batches',
      signature: 'Per-base quality distributions and `rq` histograms that differ by batch; variant callers with quality thresholds pass different fractions of sites per batch; a batch effect in error rate that tracks the `@PG` lines in the BAM header, not the sample group.',
      tell: 'Bench/compute if error rate, quality distribution and call rate separate samples by processing version and reprocessing all subreads with one version removes the split. Biology never aligns with software version; if the difference survives uniform reprocessing, it is in the samples.',
    },
  ],

  coextraction: [
    {
      what: 'Delayed stabilisation: the sample sat warm before freezing or preservative',
      signature: 'Cold-shock, heat-shock, stringent-response and SOS transcripts among the top expressed genes in every taxon; rRNA fragmented (low RIN / DV200); a transcriptome that looks like a stress experiment nobody designed.',
      tell: 'Bench if the stress signature appears in all taxa at once, in every sample from one collection site or day, and correlates with time-to-freeze in the manifest. Biology if the response is confined to one condition group, involves pathway-specific rather than universal genes, and is reproduced in samples handled on different days.',
      artifact: 'degradation',
    },
    {
      what: 'Incomplete DNase treatment: gDNA survives into the RNA fraction',
      signature: 'Uniform coverage across intergenic regions and of both strands; RSeQC infer_experiment drifts toward 50:50 in a stranded library; every gene of an abundant genome shows a flat baseline of “expression”; a no-RT control yields plenty of reads.',
      tell: 'Bench if the antisense and intergenic fraction is uniform per genome and scales with that organism’s DNA abundance, and a no-RT control is not empty. Biology if antisense coverage is locus-specific (known antisense RNAs, overlapping UTRs) and intergenic signal is concentrated on sRNAs and leaders rather than spread evenly.',
      artifact: 'gdna-contamination',
    },
    {
      what: 'Unequal lysis in the DNA and RNA fractions, or separate extractions treated as paired',
      signature: 'RNA/DNA ratios that make a whole taxon look hyperactive or dormant: every gene of a hard-to-lyse Gram-positive shifts together; the DNA and RNA taxonomic profiles disagree in a direction that follows cell-wall type.',
      tell: 'Bench if all genes of a taxon move together and the affected taxa are the thick-walled or spore-forming groups, or the shift follows which kit or aliquot was used. Biology if activity differences are gene- and pathway-specific within a taxon and the taxon’s housekeeping genes keep a normal ratio.',
      artifact: 'rna-dna-ratio',
    },
    {
      what: 'Low microbial biomass: host RNA dominates and reagent contaminants fill the rest',
      signature: '80–95 % of reads mapping to host; the microbial remainder dominated by taxa typical of kits (Ralstonia, Burkholderia, Bradyrhizobium, Sphingomonas); microbial read counts in the thousands rather than millions.',
      tell: 'Bench if the “microbial” taxa are the classic reagent genera, appear in extraction blanks and no-template controls, and their proportion rises as input biomass falls. Biology if the taxa fit the body site, are absent from blanks, and their abundance tracks the DNA fraction of the same sample.',
      artifact: 'kitome',
    },
    {
      what: 'DNA and RNA fractions from different samples mis-paired at the bench or on paper',
      signature: 'Taxonomic profiles of the DNA and RNA from one “sample” barely overlap; RNA/DNA ratios are extreme for everything; strain-level variants in RNA do not match those in DNA.',
      tell: 'Bench if the RNA profile matches another sample’s DNA profile better than its own; active and present taxa differ, but shared strains should still be visible. Biology does not produce near-zero overlap between what is present and what is transcribed in the same aliquot.',
      artifact: 'sample-swaps',
    },
  ],

  'community-rrna-depletion': [
    {
      what: 'Depletion failed: wrong kit for the community, expired probes or input above kit capacity',
      signature: 'SortMeRNA / RiboDetector flag 70–95 % of reads as rRNA in every sample of the batch; effective mRNA depth drops to a few hundred thousand reads; detected genes per sample collapses.',
      tell: 'Bench if the rRNA fraction is high for all samples processed together, including the dominant well-matched taxa the kit should remove. A high rRNA fraction confined to a few unusual taxa in an otherwise well-depleted sample is probe mismatch (next entry), not kit failure.',
      artifact: 'rrna-reads',
    },
    {
      what: 'Probes miss divergent lineages: archaea, protists, some Clostridia keep their rRNA',
      signature: 'Residual rRNA dominated by a few taxa; those taxa appear far more abundant in read-based taxonomy of the RNA library than in the DNA library, but their mRNA counts are unremarkable.',
      tell: 'Bench if the taxon’s apparent abundance is carried by rRNA reads and collapses after computational rRNA removal, or differs between depletion kits. Biology if the taxon is also abundant in mRNA reads, its RNA/DNA ratio is plausible, and the enrichment holds after rRNA filtering.',
      artifact: 'depletion-bias',
    },
    {
      what: 'Off-target depletion: probes hybridise to mRNAs or structured RNAs that resemble rRNA',
      signature: 'A reproducible set of genes with near-zero counts in every sample despite good DNA coverage, often ribosomal-protein or rRNA-processing genes and some tRNA-rich operons.',
      tell: 'Bench if the missing genes are the same in all samples made with one kit, share sequence similarity with rRNA probe regions, and are present in an undepleted or differently depleted library. Biology if absence is condition-specific and the gene is detected in other conditions of the same batch.',
      artifact: 'depletion-bias',
    },
    {
      what: 'Too little RNA left after depletion: library rescued with many extra PCR cycles',
      signature: 'Duplication 60–90 %, few unique fragments, short inserts and adapter read-through; saturation curves flatten early; a handful of transcripts account for most reads.',
      tell: 'Bench if duplication and complexity track the post-depletion yield and cycle count across samples rather than condition. Biology if the “duplicates” are confined to a few genuinely highly expressed operons while the rest of the library has normal complexity.',
      artifact: 'duplicates',
    },
    {
      what: 'Strand information lost: UDG step skipped, dUTP omitted, or a non-stranded kit used',
      signature: 'infer_experiment reports ~50:50; antisense counts equal sense counts at every gene; Salmon auto-detects an unstranded library type.',
      tell: 'Bench if the 50:50 split holds at every gene in every taxon. Biology if antisense reads are concentrated at specific loci (known antisense RNAs, convergent gene pairs) and the rest of the genome is strongly stranded.',
      artifact: 'strandedness',
    },
  ],

  conversion: [
    {
      what: 'Incomplete bisulfite conversion: old reagent, too much DNA, or a shortened incubation',
      signature: 'Non-CpG methylation (CHH/CHG) reported at several percent in a mammalian sample instead of under ~1 %; the unmethylated lambda spike-in shows conversion below ~99 %; Bismark’s M-bias plot is uniformly elevated rather than showing an end effect.',
      tell: 'Bench if non-CpG “methylation” is high in every context, every chromosome and the spike-in alike, and tracks conversion batch. Biology if non-CpG methylation is enriched in the expected contexts (CA in neurons and ES cells, CHG/CHH in plants), the spike-in converts fully, and the pattern is reproduced in a second conversion.',
      artifact: 'incomplete-conversion',
    },
    {
      what: 'Over-conversion: 5mC deaminated by too harsh or too long a bisulfite treatment',
      signature: 'The fully methylated pUC19 spike-in reads below ~97–98 % methylation; global CpG methylation sits uniformly lower than the tissue norm (e.g. 60 % where 70–80 % is expected), without any regional pattern.',
      tell: 'Bench if the methylated control reads low and the loss is the same across CpG islands, bodies and repeats and follows conversion batch. Biology (partially methylated domains, global hypomethylation in cancer or placenta) is region-structured, leaves the pUC19 control at ~100 %, and reproduces in a second conversion.',
    },
    {
      what: 'Bisulfite degradation plus excess PCR to rescue a low-input library',
      signature: 'Inserts of 100–200 bp, duplication 30–60 %, adapter read-through, and a GC-coverage curve that collapses over CpG islands and GC-rich promoters so that the regions of interest have the lowest depth.',
      tell: 'Bench if duplication and the GC collapse scale with input mass and cycle number across samples. Short inserts alone can be biology (cfDNA has a natural ~167 bp ladder), but PCR duplicates and GC-dependent coverage loss never are; EM-seq on the same sample shows neither.',
      artifact: 'gc-bias',
    },
    {
      what: 'Unconverted DNA in the library: carry-over, DNA added after conversion, or an untreated aliquot',
      signature: 'A subpopulation of reads with ~100 % “methylation” at every cytosine including CHH; per-read methylation is bimodal; those reads align better to the unconverted reference.',
      tell: 'Bench if the fully “methylated” reads are methylated in CHH as well as CpG and their fraction is constant across the genome. Biology if high non-CpG methylation is restricted to specific loci or cell types (neuronal CA methylation) and CHH methylation in other reads is near zero.',
      artifact: 'incomplete-conversion',
    },
    {
      what: 'Spike-in controls omitted or swapped (methylated lambda used as the “unmethylated” control)',
      signature: 'No way to compute conversion efficiency, or a lambda conversion rate near 0 % while the sample’s CHH methylation is normal; the Bismark report looks catastrophic for the control and ordinary for the sample.',
      tell: 'Bench/paperwork: when the control says conversion failed but sample CHH is under 1 %, the control was swapped, not the chemistry. Use chrM or CHH as the fallback conversion estimate and record that the spike-in cannot be trusted for this batch.',
    },
  ],

  'methyl-alignment': [
    {
      what: 'M-bias not trimmed: end-repair bases counted as unmethylated',
      signature: 'The M-bias plot dips over the first ~10 bp of Read 2 and the last few bases of Read 1; global methylation is a few percent too low; the bias is identical in every sample.',
      tell: 'Compute, always: methylation that depends on position within the read is never biology. Re-run the extractor with the trim positions MethylDackel `mbias` suggests and the dip disappears; a real hypomethylated region stays put regardless of where it lands in the read.',
      artifact: 'm-bias',
    },
    {
      what: 'Library directionality set wrong: non-directional reads aligned as directional, or the reverse',
      signature: 'Mapping efficiency halves (30–40 % instead of 60–80 %), or the Bismark report shows substantial CTOT/CTOB alignments for a directional kit; coverage per gigabase is far below plan.',
      tell: 'Compute if the loss is uniform across samples and the strand table in the Bismark summary shows reads in strands the protocol cannot produce. Low mapping that is sample-specific and comes with a high unconverted-read fraction points at the sample or the conversion instead.',
      artifact: 'reduced-complexity-mapping',
    },
    {
      what: 'Duplicates mishandled: not removed in WGBS/EM-seq, or removed in RRBS where they are expected',
      signature: 'WGBS: coverage inflated and per-CpG confidence overstated, producing DMRs that vanish after deduplication. RRBS: 70–90 % of reads discarded as “duplicates” and the CpG-island coverage collapses.',
      tell: 'Compute: check whether reads start at CCGG/TGG. Fixed MspI starts mean positional duplicates are genuine independent molecules and must be kept; random starts mean identical coordinates are PCR copies. Biology does not create identical start–end pairs at scale in a sheared library.',
      artifact: 'duplicates',
    },
    {
      what: 'C/T SNPs read as unmethylated cytosines (and G/A SNPs as methylated on the other strand)',
      signature: 'A CpG that is 0 % methylated in one individual and 80 % in others; strand-split calls disagree at that position; the site is a known dbSNP C>T variant.',
      tell: 'Genetics, not bench and not methylation: a true C>T SNP shows T on the top strand and A on the bottom strand, whereas an unmethylated C shows T on top but the bottom strand keeps its G. Check both strands separately or use a matched genotype; strand-concordant T/G is epigenetic, T/A is sequence.',
    },
    {
      what: 'Methylation called at too low coverage, giving binary 0 % / 100 % values',
      signature: 'A bimodal per-CpG methylation histogram at 1–3× coverage, many “DMRs” in low-coverage regions, and effect sizes of exactly ±100 % between samples.',
      tell: 'Compute if the DMRs sit in low-coverage regions and disappear with a 10× minimum or when CpGs are aggregated into regions. Biology if the differential methylation persists at high coverage, is reproduced across replicates and has a plausible regional structure.',
    },
  ],

  crosslinking: [
    {
      what: 'Over-fixation: too much formaldehyde, too long, or FFPE material',
      signature: 'Low valid-pair rate, high dangling-end and self-circle fractions, a surplus of cis pairs under 1–2 kb, and a distance-decay curve P(s) that drops faster than in reference datasets.',
      tell: 'Bench if every sample fixed in the same batch shows it and the P(s) slope separates by fixation batch rather than by condition. Biology (e.g. more compact chromatin in a condition) changes specific features such as compartment strength or TAD insulation while the valid-pair rate and pair-class table stay normal.',
      artifact: 'invalid-pairs',
    },
    {
      what: 'Under-fixation or cells lysed before fixation: thawed tissue, dead cells',
      signature: 'Trans fraction above 30–40 % (mammalian cells typically 10–30 %), a flat P(s) at long range, low cis/trans ratio; in metagenomic Hi-C, spurious links between unrelated genomes.',
      tell: 'Bench if trans contacts are spread uniformly over all chromosome pairs in proportion to chromosome length, show no focal enrichment, and differ between replicates. Biology (translocations, nucleolar or speckle associations) appears as focal, reproducible enrichments between specific regions on a normal background.',
      artifact: 'trans-noise',
    },
    {
      what: 'Too few cells, or a cell count wrong by an order of magnitude',
      signature: 'Library complexity exhausted early: duplicate rate above 50 % at modest depth, preseq predicts little gain from deeper sequencing, and the contact matrix stays sparse at the intended resolution.',
      tell: 'Bench only; low complexity is a property of how many junction molecules existed, not of the genome. Compare the unique-pair count against cell input across samples; it should scale, and a sample that does not fit was mis-counted or lost cells during fixation.',
      artifact: 'low-input',
    },
    {
      what: 'Many mitotic or dying cells: looks like a failed library, but is the sample',
      signature: 'Compartment checkerboard weak or absent, TAD insulation lost, and a characteristic bump in P(s) around 2–12 Mb; valid-pair rate and pair classes are normal.',
      tell: 'Biology if the pair-class QC is clean, the features that vanish are the specific interphase ones (compartments, loops) and the mitotic P(s) shape is present; check the cell-cycle distribution of the sample. Bench if the QC table is also poor and the loss of structure comes with excess dangling ends or trans noise.',
    },
  ],

  'digestion-ligation': [
    {
      what: 'Incomplete digestion: too little enzyme, unquenched SDS, over-fixed chromatin',
      signature: 'Short-range cis pairs (< 1 kb) and re-ligation pairs dominate, the fraction of reads carrying the ligation motif (GATCGATC for MboI) is low, and coverage shows long undigested stretches between cut sites.',
      tell: 'Bench if the cis-short and re-ligation fractions separate samples by digestion batch and the ligation-motif fraction is low across the genome. Biology does not change how often a restriction site was cut; a condition that “loses long-range contacts” while the junction fraction also drops is a digestion problem.',
      artifact: 'invalid-pairs',
    },
    {
      what: 'Ligation in solution: nuclei lysed by excess SDS or over-long dilute ligation',
      signature: 'Trans fraction high and uniform, inter-chromosomal contacts proportional to chromosome size, P(s) flat beyond a few megabases; in metagenomic Hi-C, inter-species links everywhere at a low constant rate.',
      tell: 'Bench if the trans background is uniform, lacks focal spots and is not reproducible between replicates. Biology if trans enrichments are focal and reproducible (translocations, specific plasmid–host pairs in a metagenome, which also show a normal cis signal within each genome).',
      artifact: 'trans-noise',
    },
    {
      what: 'Biotin fill-in inefficient: degraded biotin-dATP or an under-performing Klenow',
      signature: 'Few junctions carry biotin, so the later pulldown captures mostly background: very low library yield, many PCR cycles, valid-pair rate under 20 % with no excess of dangling ends, and high duplication.',
      tell: 'Bench only; the pattern of a low junction fraction together with low yield and high duplication tracks the fill-in batch. Biology has no way to lower the biotin content of a ligation junction.',
      artifact: 'duplicates',
    },
    {
      what: 'Pipeline told the wrong enzyme: Arima or MNase data processed with an MboI map',
      signature: 'The ligation motif is rarely found, pair classification is nonsense (valid pairs reclassified as dangling ends or re-ligations), and the restriction-fragment size distribution does not match coverage breakpoints.',
      tell: 'Compute: a junction-motif search on raw reads (`GATCGATC`, `GANTGATC`, `GATCANTC`, `GANTANTC` for Arima) shows which enzymes really cut; Micro-C reads have no motif at all. Reprocessing with the right map restores the valid-pair rate, which no biological difference would do.',
      artifact: 'chimeric-pairs',
    },
    {
      what: 'Restriction-site density and GC drive raw coverage: fake compartments before balancing',
      signature: 'Raw contact counts rise and fall along the genome with the density of cut sites and GC content; a checkerboard appears in raw maps that tracks the restriction map rather than A/B compartments.',
      tell: 'Bench if the pattern matches the restriction-site track and disappears after ICE/KR balancing or when the same cells are processed with a different enzyme or a sequence-independent method (Omni-C, MNase). Biology if the compartment eigenvector survives balancing and agrees across enzymes and with chromatin marks.',
      artifact: 'site-bias',
    },
  ],

  'biotin-pulldown': [
    {
      what: 'Biotin removal from unligated ends skipped or failed (T4 polymerase step)',
      signature: 'Dangling-end pairs at 20–40 % of mapped pairs instead of under ~5–10 %; valid-pair rate correspondingly low; both mates on the same restriction fragment pointing inward.',
      tell: 'Bench only. No biology produces inward-facing read pairs on a single restriction fragment; their fraction is set entirely by the biotin-removal and pulldown chemistry and should be constant across samples from one batch.',
      artifact: 'invalid-pairs',
    },
    {
      what: 'Pulldown inefficient: lost or over-washed beads, too little biotinylated DNA',
      signature: 'The library behaves like a WGS library: most pairs are properly paired with a normal insert size, junction reads are rare, valid-pair rate under 20 %, and the trans fraction is near the random expectation.',
      tell: 'Bench if the pair-class table shows mostly non-junction pairs with a normal insert distribution across the whole sample. There is no biological state that makes chromatin contacts disappear from a library while the DNA itself sequences normally.',
      artifact: 'invalid-pairs',
    },
    {
      what: 'Too many PCR cycles on a low-complexity pulldown',
      signature: 'Duplicate rate 40–70 % at moderate depth, GC-dependent coverage that balancing only partly removes, and spurious stripes or dots in the matrix at highly amplifiable regions.',
      tell: 'Bench if duplication and GC bias track cycle number and nuclei input across samples. Copy-number changes also alter coverage but do so in blocks with sharp boundaries that match a WGS CNV profile, not in a smooth GC-correlated curve.',
      artifact: 'duplicates',
    },
    {
      what: 'Shearing too short: the ligation junction lands inside one read',
      signature: 'A high fraction of reads with split alignments (5′ part to one locus, 3′ part to another), adapter read-through, and many pairs rescued only by chimeric-aware alignment; naive alignment drops them as low MAPQ.',
      tell: 'Bench if the split point in these reads coincides with the ligation motif and the split fraction tracks the insert size of the library. Biology if split reads share a junction sequence that is genomic, cluster at one locus and recur in several independent molecules, which is a structural variant.',
      artifact: 'chimeric-pairs',
    },
    {
      what: 'PCR chimeras masquerading as inter-chromosomal contacts',
      signature: 'A thin, uniform sprinkle of single trans pairs between regions that are both highly covered, rising with cycle number; no focal enrichment and poor reproducibility between replicates.',
      tell: 'Bench if the apparent trans contacts are singletons, scale with amplification, and vanish in a replicate or after per-pair deduplication. Biology if trans signals are focal, reproducible across replicates, and sit between regions with known affinity (a translocation, a plasmid and its host, speckle-associated regions).',
      artifact: 'chimeras',
    },
  ],

  'hic-pairs': [
    {
      what: 'Mates aligned in ordinary paired-end mode instead of independently or chimeric-aware',
      signature: 'Nearly every pair flagged improperly paired or discordant, mapping rate well below the single-end rate, junction-spanning reads lost, and a matrix that is almost empty beyond a few kilobases.',
      tell: 'Compute, always: re-aligning with `bwa mem -5SP`, chromap or a Hi-C pipeline recovers the pairs. The genome did not change; the aligner’s model of an insert did.',
      artifact: 'chimeric-pairs',
    },
    {
      what: 'Duplicates removed per read, or not removed at all',
      signature: 'Per-read dedup discards far too much: anything sharing one mate position goes, and coverage near frequently cut sites collapses. No dedup inflates everything: loop and TAD calls gain false confidence and replicate correlation looks better than it is.',
      tell: 'Compute: a PCR duplicate shares the coordinates of both mates; biology never recreates that exact pair at scale. Compare the pair-class table before and after per-pair deduplication; the duplicate fraction should resemble the library’s complexity, not the fragment-density profile.',
      artifact: 'duplicates',
    },
    {
      what: 'Rearrangements and copy-number changes mistaken for noise, or noise mistaken for rearrangements',
      signature: 'A translocation gives a focal “butterfly” of trans contacts with a sharp breakpoint; a CNV gives a block of elevated or lowered coverage with sharp edges that balancing smears into stripes. Random ligation noise gives neither.',
      tell: 'Biology if the trans enrichment is focal, has a sharp breakpoint, appears in every replicate and matches a WGS or karyotype finding; the same is true of coverage blocks with sharp edges. Bench if the trans signal is uniform or the coverage pattern follows GC and restriction-site density rather than chromosomal blocks.',
      artifact: 'trans-noise',
    },
    {
      what: 'Wrong genome build or restriction map used for pair classification',
      signature: 'Valid pairs classified as dangling ends or re-ligations, a valid-pair rate inexplicably low for a library with a good junction-motif fraction, and fragment-end positions that do not line up with coverage breaks.',
      tell: 'Compute if the raw reads contain the ligation motif at the expected rate but the classification says otherwise, and reprocessing with the right enzyme and build restores the rate. No biology changes where a restriction enzyme cuts.',
      artifact: 'invalid-pairs',
    },
    {
      what: 'Features called at unmappable regions, repeats and assembly gaps',
      signature: 'TAD boundaries and “loops” lining up with centromeres, gaps or satellite repeats; stripes at segmental duplications; features that vanish when a MAPQ ≥ 30 filter or a blacklist is applied.',
      tell: 'Compute if the feature coincides with a gap, a low-mappability track or a blacklist region and disappears with stricter MAPQ filtering. Biology if it lies in uniquely mappable sequence, survives filtering and balancing, is reproduced across replicates and, ideally, across enzymes.',
      artifact: 'site-bias',
    },
  ],

};
