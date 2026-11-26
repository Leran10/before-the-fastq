// "Which workflow is mine?" Per workflow: the names it goes by, how the SRA/GEO
// metadata labels it, how to recognise it from the reads, and which analyses
// the data support. Plus a curated index from analysis task to workflow and a
// quick triage list that works from the FASTQ alone.
//
// finder[trackId] = { aka[], strategy[], recognise[], analyses[] }

export const finder = {
  'illumina-dna': {
    aka: ['WGS', 'whole-genome sequencing', 'shotgun metagenomics', 'bacterial isolate sequencing', 'low-pass WGS', 'PCR-free WGS', 'cfDNA WGS'],
    strategy: ['LIBRARY_STRATEGY: WGS', 'LIBRARY_SOURCE: GENOMIC or METAGENOMIC', 'LIBRARY_SELECTION: RANDOM / RANDOM PCR'],
    recognise: [
      'Paired FASTQ, usually 2×150 with R1 and R2 the same length; inserts 300–500 bp, so pairs rarely overlap and reads start at random positions.',
      'No constant sequence at read starts; FastQC per-base content flat after the first few cycles (Illumina DNA Prep libraries show a Tn5 skew in the first ~10 bases).',
      'Methods or kit names: TruSeq DNA PCR-Free, KAPA HyperPrep, NEBNext Ultra II DNA, Illumina DNA Prep / Nextera. Depth: 30× human ≈ 100 Gb; isolates 50–200×; metagenomes 5–20 M pairs.',
    ],
    analyses: [
      'Germline and somatic variant calling (SNV, indel, SV, CNV)',
      'De novo genome assembly and polishing (short-read)',
      'Taxonomic profiling (Kraken2, MetaPhlAn) and metagenome assembly / binning',
      'Pan-genome, MLST and AMR typing of isolates; outbreak phylogenetics',
      'Copy-number and aneuploidy from low-pass or cfDNA',
      'k-mer based contamination screening and reference-free comparison',
    ],
  },
  'illumina-rna': {
    aka: ['RNA-seq', 'bulk RNA-seq', 'mRNA-seq', 'poly(A) RNA-seq', 'total RNA-seq', 'ribo-depleted RNA-seq', 'stranded / dUTP RNA-seq', 'SMART-Seq (low input, unstranded)'],
    strategy: ['LIBRARY_STRATEGY: RNA-Seq', 'LIBRARY_SOURCE: TRANSCRIPTOMIC', 'LIBRARY_SELECTION: PolyA / Inverse rRNA / cDNA'],
    recognise: [
      'Paired 2×75–150 (or single-end 50–75); reads align spliced across exon junctions; most reads come from a few thousand genes, so duplication of 30–60 % is normal.',
      'Strand: in dUTP libraries Read 1 maps antisense to the gene (RSeQC infer_experiment “1+-,1-+,2++,2--”, Salmon library type ISR).',
      'Kit names: TruSeq Stranded mRNA / Total, NEBNext Ultra II Directional, KAPA RNA HyperPrep, Ribo-Zero, SMARTer. Degraded poly(A) libraries show 3′ bias.',
    ],
    analyses: [
      'Differential gene and transcript expression',
      'Transcript assembly, isoform and splicing analysis',
      'Gene fusion detection',
      'Allele-specific expression and RNA editing',
      'Signatures, deconvolution, co-expression networks',
      'Variant calling from RNA (with the usual caveats)',
    ],
  },
  'illumina-16s': {
    aka: ['16S rRNA amplicon', 'metabarcoding', '16S V3–V4 / V4', 'ITS amplicon (fungi)', '18S amplicon', 'rpoB / gyrB / cpn60 amplicons', 'Earth Microbiome Project protocol', 'two-step PCR'],
    strategy: ['LIBRARY_STRATEGY: AMPLICON', 'LIBRARY_SELECTION: PCR', 'LIBRARY_SOURCE: METAGENOMIC'],
    recognise: [
      'MiSeq 2×250 or 2×300; every read begins with the same primer sequence (or an overhang and then the primer); amplicons 250–460 bp, so pairs overlap.',
      'A few thousand unique sequences per sample; FastQC per-base content “fails” by design; PhiX 5–20 % in the run.',
      'Primer names in the Methods: 341F/805R, 515F/806R, 27F/338R, ITS1F/ITS2, ITS3/ITS4.',
    ],
    analyses: [
      'ASV / OTU inference (DADA2, Deblur, QIIME 2, USEARCH) and taxonomy assignment',
      'Alpha and beta diversity; compositional differential abundance',
      'Contaminant removal (decontam) and source tracking',
      'Functional prediction (PICRUSt2), with its limits',
      'Longitudinal community dynamics',
    ],
  },
  'illumina-virome': {
    aka: ['VLP virome', 'viral metagenomics', 'phageome', 'virus-like particle enrichment', 'MDA virome', 'dsDNA virome', 'RNA virome (with RT)'],
    strategy: ['LIBRARY_STRATEGY: WGS or OTHER', 'LIBRARY_SOURCE: VIRAL RNA or METAGENOMIC', 'LIBRARY_SELECTION: RANDOM PCR / MDA'],
    recognise: [
      'Paired 2×150 from very low input: high duplication, strong GC and coverage skew when MDA was used, and a large fraction of reads that match nothing in any database.',
      'Methods mention filtration (0.45 / 0.22 µm), CsCl or iodixanol gradients, DNase / RNase treatment, phi29 (GenomiPhi, REPLI-g), Nextera XT.',
      'Negative extraction controls sequenced alongside; kit contaminant taxa present in every sample.',
    ],
    analyses: [
      'Viral contig assembly and identification (VirSorter2, geNomad, CheckV)',
      'vOTU clustering and abundance tables',
      'Phage–host prediction (CRISPR spacers, iPHoP)',
      'Virome diversity and case/control comparisons',
      'Detection of specific viruses, with contamination controls',
    ],
  },
  'nanopore-dna': {
    aka: ['ONT', 'Oxford Nanopore', 'MinION / GridION / PromethION', 'long-read WGS', 'ligation sequencing kit (LSK)', 'rapid kit (RBK)', 'ultra-long', 'adaptive sampling', 'native barcoding'],
    strategy: ['LIBRARY_STRATEGY: WGS or OTHER', 'PLATFORM: OXFORD_NANOPORE', 'INSTRUMENT: MinION / GridION / PromethION'],
    recognise: [
      'One FASTQ or unaligned BAM per sample, read lengths from 200 bp to over 100 kb (N50 10–50 kb), per-read mean quality Q15–Q25; no pairs.',
      'Read headers carry read_id, runid, ch (channel), start_time and the basecall model; pod5 / fast5 signal files exist alongside.',
      'Kit and model names: SQK-LSK114, SQK-RBK114, SQK-NBD114, R10.4.1, dna_r10.4.1_e8.2_400bps_sup, Dorado / Guppy.',
    ],
    analyses: [
      'De novo assembly (Flye, Shasta, hifiasm with ONT) and polishing',
      'Structural variants, repeat expansions, phasing and haplotype assembly',
      'Methylation calling from signal (5mC, 5hmC, 6mA) without conversion',
      'Metagenome assembly; plasmid and AMR gene context',
      'Targeted sequencing by adaptive sampling',
    ],
  },
  'tenx-scrna': {
    aka: ['scRNA-seq', '10x Genomics Chromium 3′ (v2 / v3 / v3.1 / v4)', '5′ GEX', 'snRNA-seq (nuclei)', 'Single Cell Multiome GEX', 'Flex (probe-based)', 'CITE-seq / feature barcoding', 'Drop-seq / inDrops (similar read structure)'],
    strategy: ['LIBRARY_STRATEGY: RNA-Seq', 'LIBRARY_SELECTION: cDNA / PolyA', 'LIBRARY_CONSTRUCTION_PROTOCOL: 10x Genomics'],
    recognise: [
      'R1 is short (26–28 bp) and is barcode + UMI; R2 (90+ bp) is the cDNA. File names like Sample_S1_L001_R1_001.fastq.gz, sometimes with I1 / I2.',
      'Reads pile at transcript 3′ ends; thousands of distinct barcodes; deliverables include filtered_feature_bc_matrix.h5 or a barcodes / features / matrix.mtx triple.',
      'Metadata: Cell Ranger version, chemistry (SC3Pv3), include-introns setting, expected cell number.',
    ],
    analyses: [
      'Cell clustering, annotation and marker genes',
      'Differential expression across conditions (pseudobulk)',
      'Trajectory, pseudotime and RNA velocity',
      'Cell–cell communication inference',
      'Doublet, ambient-RNA and quality filtering; integration across batches',
    ],
  },
  'pacbio-hifi': {
    aka: ['PacBio HiFi', 'CCS reads', 'Sequel II / IIe / Revio', 'SMRT sequencing', 'HiFi WGS', 'HiFi metagenomics', 'full-length 16S (HiFi amplicon)', 'Kinnex / Iso-Seq (RNA; same instrument, different library)'],
    strategy: ['LIBRARY_STRATEGY: WGS', 'PLATFORM: PACBIO_SMRT', 'INSTRUMENT: Sequel II / Revio'],
    recognise: [
      'Unaligned BAM (hifi_reads.bam) or FASTQ with reads of 10–25 kb and per-read Q30+; read tags rq, np, ec; names like m84011_220902_175841_s1/…/ccs.',
      'Very uniform coverage, almost no duplicates, no pairs.',
      'Metadata: SMRTbell prep kit 3.0, DeepConsensus or ccs version, number of SMRT cells.',
    ],
    analyses: [
      'Haplotype-resolved de novo assembly (hifiasm, Verkko with ONT)',
      'Small and structural variant calling (DeepVariant, pbsv), tandem-repeat genotyping',
      '5mC calling from polymerase kinetics',
      'Metagenome assembly of complete circular genomes',
      'Full-length amplicons: 16S, HLA, long genes',
    ],
  },
  'metatranscriptomics': {
    aka: ['metatranscriptomics', 'metaT', 'community RNA-seq', 'microbiome RNA-seq', 'paired metaG / metaT', 'dual RNA-seq (host + microbe)'],
    strategy: ['LIBRARY_STRATEGY: RNA-Seq', 'LIBRARY_SOURCE: METATRANSCRIPTOMIC', 'LIBRARY_SELECTION: Inverse rRNA'],
    recognise: [
      'Stranded 2×75–150 paired FASTQ from a mixed community; a large rRNA fraction remains even after depletion (SortMeRNA 5–60 %); there is no single reference.',
      'Usually a matched shotgun DNA sample from the same extract; stabilisation in RNAlater or DNA/RNA Shield.',
      'Kit names: Ribo-Zero Plus Microbiome, riboPOOL, pan-prokaryote probes, NEBNext rRNA depletion (bacteria).',
    ],
    analyses: [
      'Community gene expression against metagenome-assembled genomes',
      'Pathway activity (HUMAnN, eggNOG, KEGG) and RNA/DNA ratios',
      'Active versus merely present taxa',
      'Host–microbe dual RNA-seq',
      'RNA virus discovery',
    ],
  },
  'methylation-seq': {
    aka: ['WGBS', 'bisulfite sequencing', 'EM-seq', 'RRBS', 'targeted / capture methyl-seq', 'PBAT', 'cfDNA methylation', 'not a methylation array (that is a different technology)'],
    strategy: ['LIBRARY_STRATEGY: Bisulfite-Seq', 'LIBRARY_SELECTION: RANDOM or Reduced Representation', 'often filed as OTHER for EM-seq'],
    recognise: [
      'Read 1 has almost no C (converted to T) and Read 2 almost no G; FastQC per-base content looks broken; a standard aligner maps under 20 % of reads.',
      'Spike-ins: unmethylated lambda and methylated pUC19; directional or non-directional stated in the Methods.',
      'Kit names: EZ DNA Methylation, NEBNext EM-seq, Swift Accel-NGS Methyl-Seq (needs end trimming), Ovation RRBS, SeqCap Epi.',
    ],
    analyses: [
      'Per-cytosine methylation calling (Bismark, bwa-meth + MethylDackel)',
      'Differentially methylated positions and regions',
      'Cell-type deconvolution and cfDNA tissue of origin',
      'Imprinting and allele-specific methylation',
      'Epigenetic clocks and global methylation levels',
    ],
  },
  'hi-c': {
    aka: ['Hi-C', 'in situ Hi-C', 'Arima Hi-C', 'Dovetail Omni-C / Micro-C', 'capture Hi-C / HiChIP / PLAC-seq', 'Hi-C scaffolding', 'metagenomic Hi-C (proximity ligation binning)'],
    strategy: ['LIBRARY_STRATEGY: Hi-C', 'LIBRARY_SELECTION: Restriction Digest', 'often OTHER for Micro-C'],
    recognise: [
      'Paired 2×100–150 where mates map far apart or to different chromosomes; a ligation-junction motif inside reads (GATCGATC for MboI / DpnII, GANTANTC for Arima); ordinary aligners call most pairs discordant or chimeric.',
      'Deliverables include .pairs, .hic or .cool / .mcool files and pair-class QC tables.',
      'Metadata: enzyme (MboI, DpnII, Arima two-enzyme, MNase for Micro-C / Omni-C), biotin fill-in, crosslinking conditions.',
    ],
    analyses: [
      'Contact matrices, compartments, TADs and loops',
      'Genome assembly scaffolding (3D-DNA, YaHS, SALSA)',
      'Metagenome binning by proximity ligation; plasmid–host linking',
      'Structural variants and translocations from contact maps',
      'Enhancer–promoter looping (HiChIP, capture Hi-C)',
    ],
  },
  'atac-seq': {
    aka: ['ATAC-seq', 'Omni-ATAC', 'Fast-ATAC', 'scATAC-seq / 10x ATAC', 'Multiome ATAC', 'chromatin accessibility', 'DNase-seq (related: nuclease instead of Tn5)'],
    strategy: ['LIBRARY_STRATEGY: ATAC-seq', 'LIBRARY_SELECTION: RANDOM', 'LIBRARY_SOURCE: GENOMIC'],
    recognise: [
      'Paired 2×50–75 with the Nextera adapter (CTGTCTCTTATACACATCT); fragment-size histogram with peaks below 100, at ~200 and ~400 bp; 10–60 % of reads on chrM; strong TSS enrichment.',
      'scATAC: R1 and R3 are genomic and R2 (or I2) is the cell barcode; a fragments.tsv.gz file is the main deliverable.',
      'Metadata: nuclei count, Tn5 source (Illumina TDE1, Diagenode, home-made), PCR cycles chosen by qPCR.',
    ],
    analyses: [
      'Peak calling and differential accessibility',
      'TF footprinting and motif enrichment (TOBIAS, chromVAR, HOMER)',
      'Nucleosome positioning (NucleoATAC)',
      'scATAC clustering, gene-activity scores and multiome integration',
      'Enhancer identification together with ChIP-seq or RNA-seq',
    ],
  },
  'chip-seq': {
    aka: ['ChIP-seq', 'X-ChIP / native ChIP', 'CUT&RUN', 'CUT&Tag', 'ChIP-exo / ChIP-nexus', 'histone-mark profiling', 'TF binding', 'MeDIP / hMeDIP (antibody to 5mC; same logic)'],
    strategy: ['LIBRARY_STRATEGY: ChIP-Seq', 'LIBRARY_SELECTION: ChIP', 'CUT&RUN / CUT&Tag often filed as OTHER'],
    recognise: [
      'Single- or paired-end 50–150; the sample set has an IP plus an input or IgG per condition; reads pile into peaks (narrow for TFs, broad for H3K27me3 / H3K36me3).',
      'CUT&Tag reads carry the Nextera adapter, IgG controls are near-empty, and 3–10 M reads per sample is normal.',
      'Metadata: antibody catalogue number and lot, target (H3K4me3, CTCF…), spike-in (Drosophila, E. coli carry-over), cell number.',
    ],
    analyses: [
      'Peak calling against input and differential binding',
      'Motif discovery and TF co-occupancy',
      'Chromatin-state segmentation (ChromHMM) from histone marks',
      'Super-enhancer and regulatory-element annotation',
      'Spike-in-normalised global changes (inhibitor or degron experiments)',
    ],
  },
  'rip-clip': {
    aka: ['RIP-seq', 'eCLIP / iCLIP / HITS-CLIP / PAR-CLIP / irCLIP', 'RNA–protein interaction', 'RBP binding sites', 'm6A-seq / MeRIP-seq (antibody to the modification; same logic)'],
    strategy: ['LIBRARY_STRATEGY: RIP-Seq', 'CLIP often filed as OTHER or RIP-Seq', 'LIBRARY_SOURCE: TRANSCRIPTOMIC'],
    recognise: [
      'Short single-end reads (eCLIP: R2 carries the insert) that begin with a UMI or in-line barcode; very high duplication; after UMI deduplication read 5′ ends pile at single nucleotides (CLIP) or whole transcripts are covered (RIP, MeRIP).',
      'A size-matched input (SMInput) or IgG per sample; PAR-CLIP shows T→C mismatches at crosslink sites.',
      'Metadata: antibody, RNase I dilution, crosslinking (UV 254 nm, 4SU + 365 nm, none for RIP).',
    ],
    analyses: [
      'Binding-site / peak calling against SMInput (CLIPper, PureCLIP, PEKA)',
      'Motif and RNA-structure analysis of binding sites',
      'Differential binding or modification (MeRIP: exomePeak2)',
      'RBP regulatory targets by integration with RNA-seq',
      'Transcript-level enrichment (RIP)',
    ],
  },
  'hybrid-capture': {
    aka: ['WES / exome', 'targeted gene panel', 'tumour panel (TSO500, MSK-IMPACT, FoundationOne-style)', 'cfDNA / liquid-biopsy panel', 'VirCapSeq / Twist viral panel', 'capture-based pathogen typing', 'clinical NGS'],
    strategy: ['LIBRARY_STRATEGY: WXS or Targeted-Capture', 'LIBRARY_SELECTION: Hybrid Selection', 'LIBRARY_SOURCE: GENOMIC (or VIRAL / METAGENOMIC for pathogen capture)'],
    recognise: [
      'Paired 2×100–150 where 60–80 % of bases fall inside a target BED (exons); off-target reads cover the genome thinly; coverage forms exon-shaped plateaus; duplicates 10–40 %; UMIs in many panels.',
      'A target BED or probe-set name is part of the deliverable: SureSelect v8, Twist Exome 2.0, IDT xGen, Nextera Flex for Enrichment.',
      'Viral capture: host reads dominate and viral coverage follows probe similarity, not viral load alone.',
    ],
    analyses: [
      'Germline and somatic variant calling within targets, low-VAF calling with UMIs',
      'CNV calling with a panel of normals',
      'Tumour mutational burden and MSI from panels',
      'Pathogen / virus detection and genome recovery by capture',
      'Carrier screening and clinical reporting',
    ],
  },
  'tiled-amplicon': {
    aka: ['ARTIC', 'tiled amplicon', 'SARS-CoV-2 whole-genome sequencing', 'COVIDSeq', 'Midnight', 'amplicon-based viral WGS (mpox, influenza, RSV, Zika, Ebola, HIV, measles)', 'wastewater sequencing', 'tiling PCR of a known phage or plasmid'],
    strategy: ['LIBRARY_STRATEGY: AMPLICON', 'LIBRARY_SELECTION: PCR', 'LIBRARY_SOURCE: VIRAL RNA'],
    recognise: [
      'Reads from one small genome only; coverage in flat ~400 bp plateaus that start and stop at primer sites; read ends coincide with primer positions; near 100 % duplication by position, which is normal here.',
      'ONT: read length ≈ amplicon length; Illumina 2×150 / 2×250 with heavy mate overlap.',
      'Metadata: primer scheme and version (ARTIC V4.1, V5.3.2, Midnight 1200), diagnostic Ct value, positive and no-template controls.',
    ],
    analyses: [
      'Consensus genome and lineage assignment (Nextclade, pangolin)',
      'Phylogenetics, outbreak and transmission analysis',
      'Intra-host minor variants and quasispecies',
      'Wastewater lineage deconvolution (Freyja)',
      'Recombinant and drug-resistance mutation screening',
    ],
  },
};

// Analysis task → the workflows whose data it is normally done on.
export const byAnalysis = [
  { task: 'Germline or somatic variant calling (SNV, indel)', tracks: ['illumina-dna', 'hybrid-capture', 'pacbio-hifi', 'nanopore-dna'], note: 'Capture data only inside the target BED; long reads add phasing.' },
  { task: 'Structural variants, repeats, phasing', tracks: ['pacbio-hifi', 'nanopore-dna', 'illumina-dna', 'hi-c'], note: 'Short reads see breakpoints poorly; Hi-C sees translocations as contact blocks.' },
  { task: 'Copy number and aneuploidy', tracks: ['illumina-dna', 'hybrid-capture'], note: 'Capture CNV needs a panel of normals because probe efficiency dominates coverage.' },
  { task: 'De novo genome assembly', tracks: ['pacbio-hifi', 'nanopore-dna', 'illumina-dna', 'hi-c'], note: 'Hi-C for scaffolding to chromosomes.' },
  { task: 'Metagenome profiling, assembly and binning', tracks: ['illumina-dna', 'nanopore-dna', 'pacbio-hifi', 'hi-c', 'illumina-16s'], note: '16S gives composition only, no genomes or genes.' },
  { task: 'Microbial community composition (marker gene)', tracks: ['illumina-16s', 'pacbio-hifi'], note: 'HiFi for full-length 16S.' },
  { task: 'Virus discovery and virome composition', tracks: ['illumina-virome', 'illumina-dna', 'metatranscriptomics', 'hybrid-capture'], note: 'RNA viruses need an RNA library; capture finds only what the probes cover.' },
  { task: 'Viral consensus genome and lineage', tracks: ['tiled-amplicon', 'hybrid-capture', 'illumina-virome'], note: 'Amplicon coverage shape is the scheme, not the virus.' },
  { task: 'Phage–host prediction and linkage', tracks: ['illumina-virome', 'hi-c', 'illumina-dna'], note: 'Metagenomic Hi-C links phage to host physically; otherwise CRISPR spacers and k-mers.' },
  { task: 'Differential gene expression', tracks: ['illumina-rna', 'metatranscriptomics', 'tenx-scrna'], note: 'Single-cell differential expression should be done per cell type, as pseudobulk.' },
  { task: 'Isoforms, splicing, fusions', tracks: ['illumina-rna', 'pacbio-hifi'], note: 'Iso-Seq / Kinnex gives full-length transcripts.' },
  { task: 'Single-cell clustering, trajectories, cell types', tracks: ['tenx-scrna', 'atac-seq'], note: 'scATAC follows the ATAC workflow with a barcode read.' },
  { task: 'Community gene expression and activity', tracks: ['metatranscriptomics'], note: 'Needs the matched metagenome as reference.' },
  { task: 'DNA methylation', tracks: ['methylation-seq', 'nanopore-dna', 'pacbio-hifi'], note: 'Long reads call 5mC from signal with no conversion.' },
  { task: 'Chromatin accessibility and TF footprints', tracks: ['atac-seq'] },
  { task: 'TF binding, histone marks, chromatin states', tracks: ['chip-seq'] },
  { task: '3D genome: compartments, TADs, loops', tracks: ['hi-c'] },
  { task: 'RNA–protein binding sites, RNA modifications', tracks: ['rip-clip'] },
  { task: 'Clinical panels: TMB, MSI, liquid biopsy', tracks: ['hybrid-capture'] },
  { task: 'Outbreak phylogenetics and transmission', tracks: ['tiled-amplicon', 'illumina-dna', 'nanopore-dna'], note: 'Viral genomes by amplicon; bacterial isolates by WGS.' },
];

// Quick triage from the FASTQ alone, in the order worth checking.
export const triage = [
  { ask: 'Is R1 only 26–28 bp while R2 is 90 bp or more?', then: 'tenx-scrna', why: 'R1 is cell barcode + UMI.' },
  { ask: 'Do all reads begin with the same 15–25 bases?', then: ['illumina-16s', 'tiled-amplicon'], why: 'Primer at the read start: a marker-gene amplicon if the sequences are 16S / ITS primers, a tiled viral scheme if the reads map to one small genome in plateaus.' },
  { ask: 'Do read lengths vary from hundreds of bases to tens of kilobases, with no R2?', then: ['nanopore-dna', 'pacbio-hifi'], why: 'ONT headers contain channel and start_time; HiFi BAMs carry rq / np tags and read names ending in /ccs.' },
  { ask: 'Is R1 almost free of C (and R2 of G)?', then: 'methylation-seq', why: 'Bisulfite or enzymatic conversion.' },
  { ask: 'Do most mates map far apart or to different chromosomes?', then: 'hi-c', why: 'Proximity ligation.' },
  { ask: 'Do fragment sizes show peaks below 100, at ~200 and ~400 bp, with the Nextera adapter?', then: 'atac-seq', why: 'Nucleosome ladder from Tn5 on chromatin.' },
  { ask: 'Is every sample paired with an input, IgG or SMInput library?', then: ['chip-seq', 'rip-clip'], why: 'Enrichment experiments; DNA-level if reads do not splice, RNA-level if they do and start with a UMI.' },
  { ask: 'Is there a target BED and do 60–80 % of reads fall inside it?', then: 'hybrid-capture', why: 'Exome or panel.' },
  { ask: 'Do reads splice across exon junctions?', then: ['illumina-rna', 'metatranscriptomics'], why: 'RNA; metatranscriptomics if there is no single host genome and rRNA dominates.' },
  { ask: 'Random-start paired reads, nothing above applies, very low input and many unclassifiable reads?', then: 'illumina-virome', why: 'VLP enrichment with MDA.' },
  { ask: 'Random-start paired reads, nothing above applies?', then: 'illumina-dna', why: 'Shotgun genome or metagenome.' },
];
