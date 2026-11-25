// Color is information, not decoration.
//
// A hue means one thing across every animation on the site. If a reader
// learns "blue is DNA" on the fragmentation page, blue must still be DNA on
// the PCR page and the flow-cell page. Attention is carried by gold;
// anything wrong, biased or artefactual is carried by alert red.
//
// Hue contract (same in light and dark themes):
//   slate blue   — DNA: genomic DNA, inserts, cDNA, amplicons
//   amber        — RNA
//   teal         — P5 side of the library: P5 adapter arm, i5 index, Read 1 primer site
//   violet       — P7 side of the library: P7 adapter arm, i7 index, Read 2 primer site
//   warm brown   — SPRI / magnetic beads
//   neutral grey — proteins, enzymes, polymerases, membranes, instruments
//   gold         — the thing to look at right now
//   alert red    — artefact, bias, error, loss
//   green        — a check that passed, a correct outcome

export const light = {
  name: 'light',
  bg: '#fbfaf7',
  panel: '#ffffff',
  grid: '#ece9e2',
  ink: '#1f2328',
  inkDim: '#6b7078',
  inkFaint: '#b4b8be',

  dna: '#3f6ea6',
  dnaLight: '#8fb0d6',
  dnaDim: '#c7d6e8',
  rna: '#d9822b',
  rnaLight: '#f0b57a',
  rnaDim: '#f4dcc2',
  rrna: '#b8a48a',

  p5: '#1f9e89',
  p5Dim: '#a9dcd3',
  p7: '#7b4fb6',
  p7Dim: '#cdb9e6',

  bead: '#a46a3c',
  beadDim: '#dcc2a8',
  enzyme: '#8d8a82',
  enzymeDim: '#cfccc4',
  membrane: '#7f8f86',
  cell: '#dfe7e0',
  liquid: '#dbe9f2',
  glass: '#9aa6ad',

  gold: '#d9a441',
  goldDim: '#f1dfb5',
  alert: '#d6453d',
  alertDim: '#f3c3bf',
  good: '#3c9d5a',
  goodDim: '#c3e5cd',

  // Sample index colors: used when several samples share a lane
  samples: ['#3f6ea6', '#d9822b', '#7b4fb6', '#1f9e89', '#c2417a', '#8d8a82'],
};

export const dark = {
  name: 'dark',
  bg: '#0f1216',
  panel: '#161a20',
  grid: '#232830',
  ink: '#e3e1da',
  inkDim: '#9a9c9f',
  inkFaint: '#4f545b',

  dna: '#7fa6d8',
  dnaLight: '#a9c4e6',
  dnaDim: '#3a4a60',
  rna: '#e89a4c',
  rnaLight: '#f3bf8c',
  rnaDim: '#5a4027',
  rrna: '#8a7e6a',

  p5: '#4fc2ad',
  p5Dim: '#28574f',
  p7: '#a98ad6',
  p7Dim: '#4a3b66',

  bead: '#c58a58',
  beadDim: '#5a4430',
  enzyme: '#a6a39b',
  enzymeDim: '#4a4944',
  membrane: '#8c9c93',
  cell: '#1f2a24',
  liquid: '#1b2a36',
  glass: '#6e7a82',

  gold: '#e8b85a',
  goldDim: '#5a4720',
  alert: '#ef6a60',
  alertDim: '#5c2a27',
  good: '#5cc47c',
  goodDim: '#234a30',

  samples: ['#7fa6d8', '#e89a4c', '#a98ad6', '#4fc2ad', '#e06a9d', '#a6a39b'],
};

export function currentPalette() {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'dark') return dark;
  if (forced === 'light') return light;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? dark : light;
}

// Hex -> rgba string with alpha. Used for fades without losing the hue.
export function withAlpha(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}
