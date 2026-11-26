// Hash router + page rendering. No framework; every page is a template string.

import { steps } from './content/steps.js';
import { tracks, trackById, stepEntries, tracksForStep, planned } from './content/tracks.js';
import { artifacts, artifactsForStep } from './content/artifacts.js';
import { failures } from './content/failures.js';
import { finder, byAnalysis, triage } from './content/finder.js';
import { loadAnim } from './anim/index.js';
import { createPlayer, renderThumb } from './player.js';

export const VERSION = '2026-11-26h';
const main = document.getElementById('main');
document.getElementById('build').textContent = 'v ' + VERSION;

// Tell an open tab when a newer version has been deployed (browsers and the
// GitHub Pages cache otherwise keep old scripts; hash navigation never reloads).
let lastVersionCheck = 0;
async function checkVersion() {
  if (Date.now() - lastVersionCheck < 60000) return;
  lastVersionCheck = Date.now();
  try {
    const r = await fetch(new URL('version.json', document.baseURI) + '?t=' + Date.now(), { cache: 'no-store' });
    const { v } = await r.json();
    if (v && v !== VERSION && !document.getElementById('update-banner')) {
      const b = document.createElement('div');
      b.id = 'update-banner'; b.className = 'update-banner';
      b.innerHTML = `A newer version of this site is available (${esc(v)}; you have ${esc(VERSION)}). <button type="button">Reload</button>`;
      b.querySelector('button').addEventListener('click', () => location.reload());
      document.body.appendChild(b);
    }
  } catch { /* offline or local file: ignore */ }
}
const sidebar = document.getElementById('sidebar');
let player = null;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Minimal inline markup: `code` and **bold**
const md = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
const list = arr => `<ul>${arr.map(x => `<li>${md(x)}</li>`).join('')}</ul>`;

// ---------- theme ----------
const toggle = document.getElementById('themeToggle');
function applyTheme() {
  const t = localStorage.getItem('theme');
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
toggle.addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  localStorage.setItem('theme', cur === 'dark' ? 'light' : 'dark');
  applyTheme();
  route();
});
applyTheme();

// ---------- routing ----------
function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  return parts;
}

async function route() {
  if (player) { player.destroy(); player = null; }
  checkVersion();
  const parts = parse();
  document.querySelectorAll('.topnav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#/' + (parts[0] || '')));
  window.scrollTo(0, 0);
  await dispatch(parts);
  document.body.classList.toggle('no-sidebar', !sidebar.innerHTML.trim());
}

async function dispatch(parts) {
  if (parts.length === 0) return renderHome();
  if (parts[0] === 'tracks') return renderTracks();
  if (parts[0] === 'find') return renderFinder();
  if (parts[0] === 'track' && parts[1] && trackById[parts[1]]) {
    if (parts[2] && steps[parts[2]]) return renderStep(parts[2], trackById[parts[1]]);
    return renderTrack(trackById[parts[1]]);
  }
  if (parts[0] === 'step' && parts[1] && steps[parts[1]]) return renderStep(parts[1], null);
  if (parts[0] === 'steps') return renderAllSteps();
  if (parts[0] === 'artifacts') return renderArtifacts();
  if (parts[0] === 'artifact' && parts[1] && artifacts[parts[1]]) return renderArtifact(parts[1]);
  if (parts[0] === 'about') return renderAbout();
  main.innerHTML = `<h1>Not found</h1><p><a href="#/">Back to start</a></p>`;
  sidebar.innerHTML = '';
}
window.addEventListener('hashchange', route);

// ---------- sidebar ----------
function sidebarForTrack(track, activeStep) {
  const entries = track.steps;
  let html = `<h4>Workflow</h4><a class="track-title" href="#/track/${track.id}">${esc(track.title)}</a><ol>`;
  let n = 0;
  entries.forEach(e => {
    if (e.divider) { html += `</ol><div class="join">${esc(e.divider)}</div><ol>`; return; }
    const id = typeof e === 'string' ? e : e.step; n++;
    html += `<li><a href="#/track/${track.id}/${id}" class="${id === activeStep ? 'active' : ''}"><span class="num">${n}</span>${esc(steps[id].title)}</a></li>`;
  });
  html += `</ol><h4>Other workflows</h4><div class="alltracks">${tracks.filter(t => t.id !== track.id).map(t => `<a href="#/track/${t.id}">${esc(t.title)}</a>`).join('')}</div>`;
  sidebar.innerHTML = html;
}
function sidebarTracks(active) {
  sidebar.innerHTML = `<h4>Workflows</h4><div class="alltracks">${tracks.map(t => `<a href="#/track/${t.id}" class="${t.id === active ? 'active' : ''}">${esc(t.title)}</a>`).join('')}</div>`;
}

// ---------- pages ----------
function renderHome() {
  sidebar.innerHTML = '';
  main.innerHTML = `
    <div class="hero">
      <h1>What happened to your sample before it became a FASTQ file</h1>
      <p class="lede">Animated, step-by-step wet-lab workflows for people who analyse sequencing data but have never held the pipette. Each step shows what was physically done, what it changed about the molecules, and what that means for the reads you are about to process.</p>
    </div>
    <a class="callout find-callout" href="#/find"><b>Not sure which workflow your dataset is?</b> Start from the analysis you have to do, the SRA / GEO library strategy, or the shape of the reads. <span class="go">Which workflow is mine? →</span></a>
    <h2>Workflows</h2>
    <div class="cards">
      ${tracks.map(t => `<a class="card" href="#/track/${t.id}"><h3>${esc(t.title)}</h3><p>${esc(t.subtitle)}</p><div class="meta">${stepEntries(t).length} steps · ${esc(t.output)}</div></a>`).join('')}
      ${planned.map(p => `<div class="card soon"><h3>${esc(p.title)}</h3><p>${esc(p.why)}</p><div class="meta">planned</div></div>`).join('')}
    </div>
    <h2>Start from the symptom</h2>
    <p>If you already have a FASTQ and something looks odd, the <a href="#/artifacts">artifact index</a> goes from what you see in the data back to the bench step that produced it.</p>
    <div class="artifact-chips">${Object.entries(artifacts).slice(0, 14).map(([id, a]) => `<a href="#/artifact/${id}">${esc(a.title)}</a>`).join('')} <a href="#/artifacts" style="border-style:dashed">all ${Object.keys(artifacts).length} →</a></div>
    <h2>How colours work</h2>
    <p>Every animation uses the same colour vocabulary, so once you have learned it on one page it holds everywhere.</p>
    <div class="legend">
      <span style="--c:var(--accent)">DNA, inserts, cDNA</span>
      <span style="--c:var(--rna)">RNA</span>
      <span style="--c:var(--p5)">P5 side: P5 arm, i5 index, Read 1 primer</span>
      <span style="--c:var(--p7)">P7 side: P7 arm, i7 index, Read 2 primer</span>
      <span style="--c:#a46a3c">Magnetic beads</span>
      <span style="--c:#8d8a82">Enzymes, proteins, instruments</span>
      <span style="--c:var(--gold)">Look here</span>
      <span style="--c:var(--alert)">Artefact, bias, loss</span>
    </div>
    <p class="footer-note">Every step page has four parts aimed at the analyst: <b>In your data</b> (what this step leaves behind in the reads), <b>What can go wrong here</b> (how each bench failure looks in the FASTQ, and how to tell it from biology), <b>Check in your files</b> (where to look), and <b>Ask the wet lab</b> (the questions whose answers change your pipeline).</p>
  `;
}

function renderTracks() {
  sidebarTracks();
  main.innerHTML = `<h1>Workflows</h1><p class="lede">Each workflow is a sequence of steps. Steps that are the same across workflows share one page; workflow-specific details appear as notes.</p>
    <div class="cards">${tracks.map(t => `<a class="card" href="#/track/${t.id}"><h3>${esc(t.title)}</h3><p>${esc(t.blurb)}</p><div class="meta">${stepEntries(t).length} steps · ${esc(t.output)}</div></a>`).join('')}</div>`;
}

function renderFinder() {
  sidebarTracks();
  const link = id => `<a class="tlink" href="#/track/${id}">${esc(trackById[id].title)}</a>`;
  const links = ids => (Array.isArray(ids) ? ids : [ids]).map(link).join('');
  const searchText = t => [t.title, t.subtitle, ...(finder[t.id]?.aka || []), ...(finder[t.id]?.strategy || []), ...(finder[t.id]?.recognise || []), ...(finder[t.id]?.analyses || [])].join(' ').toLowerCase();
  main.innerHTML = `
    <h1>Which workflow is mine?</h1>
    <p class="lede">You have a dataset and an analysis to do, but the wet-lab name on it is unfamiliar. Three ways in: the analysis you need, the labels in the metadata, or the shape of the reads themselves.</p>
    <input class="search" id="q" placeholder="Search everything here… (e.g. exome, CUT&Tag, peak calling, WXS, 2×300, UMI)" aria-label="Search workflows">
    <div id="find-sections">
    <h2>1. From the analysis you have to do</h2>
    <div class="findtable" id="by-analysis">${byAnalysis.map(a => `<div class="findrow" data-text="${esc((a.task + ' ' + a.tracks.map(id => trackById[id].title).join(' ') + ' ' + (a.note || '')).toLowerCase())}"><div class="f-task">${esc(a.task)}</div><div class="f-tracks">${links(a.tracks)}${a.note ? `<small>${esc(a.note)}</small>` : ''}</div></div>`).join('')}</div>
    <h2>2. From the metadata label</h2>
    <p class="section-lede">SRA / ENA / GEO record every run with a <code>LIBRARY_STRATEGY</code>, <code>LIBRARY_SOURCE</code> and <code>LIBRARY_SELECTION</code>; Methods sections use the names in the second column.</p>
    <div class="findtable" id="by-label">${tracks.map(t => `<div class="findrow" data-text="${esc(searchText(t))}"><div class="f-task">${(finder[t.id]?.strategy || []).map(x => `<code>${esc(x)}</code>`).join('<br>')}</div><div class="f-tracks">${link(t.id)}<small>${(finder[t.id]?.aka || []).map(esc).join(' · ')}</small></div></div>`).join('')}</div>
    <h2>3. From the reads alone</h2>
    <p class="section-lede">Open the FASTQ (or the first QC report) and go down this list; stop at the first yes.</p>
    <ol class="triage" id="by-reads">${triage.map(q => `<li data-text="${esc((q.ask + ' ' + q.why + ' ' + (Array.isArray(q.then) ? q.then : [q.then]).map(id => trackById[id].title).join(' ')).toLowerCase())}"><b>${esc(q.ask)}</b><div class="f-tracks">${links(q.then)}<small>${esc(q.why)}</small></div></li>`).join('')}</ol>
    <h2>4. What each workflow is used for</h2>
    <div class="cards" id="by-track">${tracks.map(t => `<a class="card" href="#/track/${t.id}" data-text="${esc(searchText(t))}"><h3>${esc(t.title)}</h3><p>${(finder[t.id]?.analyses || []).map(esc).join(' · ')}</p><div class="meta">${esc((finder[t.id]?.aka || []).slice(0, 4).join(' · '))}</div></a>`).join('')}</div>
    </div>`;
  document.getElementById('q').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    main.querySelectorAll('[data-text]').forEach(el => { el.style.display = !q || el.dataset.text.includes(q) ? '' : 'none'; });
  });
}

async function renderTrack(track) {
  sidebarForTrack(track, null);
  const entries = track.steps;
  let n = 0;
  main.innerHTML = `
    <div class="crumbs"><a href="#/tracks">Workflows</a><span class="sep">›</span><span>${esc(track.title)}</span></div>
    <h1>${esc(track.title)}</h1>
    <p class="lede">${esc(track.subtitle)}</p>
    <p>${esc(track.blurb)}</p>
    <div class="note"><b>What you receive:</b> ${esc(track.output)}</div>
    ${finder[track.id] ? `<div class="section two-col fit">
      <div><h2>Is this your data?</h2>${list(finder[track.id].recognise)}<p class="aka"><b>Also called:</b> ${finder[track.id].aka.map(esc).join(' · ')}</p><p class="aka"><b>Metadata:</b> ${finder[track.id].strategy.map(x => `<code>${esc(x)}</code>`).join(' ')}</p></div>
      <div><h2>Analyses this data supports</h2>${list(finder[track.id].analyses)}<p class="aka"><a href="#/find">All analyses and workflows →</a></p></div>
    </div>` : ''}
    <h2 class="stepper-title">Steps</h2>
    <div class="stepper">
      ${entries.map(e => {
        if (e.divider) return `<div class="divider">— ${esc(e.divider)} —</div>`;
        const id = typeof e === 'string' ? e : e.step; const note = typeof e === 'string' ? null : e.note; n++;
        return `<a href="#/track/${track.id}/${id}"><canvas data-step="${id}" width="320" height="180"></canvas><div><span class="n">step ${n}</span><b>${esc(steps[id].title)}</b><small>${esc(steps[id].short)}</small>${note ? `<div class="tnote">${esc(note)}</div>` : ''}</div></a>`;
      }).join('')}
    </div>`;
  // thumbnails
  for (const c of main.querySelectorAll('canvas[data-step]')) {
    const anim = await loadAnim(c.dataset.step);
    renderThumb(c, anim, 320, false);
  }
}

async function renderStep(id, track) {
  const routeAtStart = parse().join('/');   // compared after the await below, so a navigation meanwhile is not overwritten
  const s = steps[id];
  const inTracks = tracksForStep(id);
  if (!track) track = inTracks[0] || null;
  if (track) sidebarForTrack(track, id); else sidebarTracks();
  const entries = track ? stepEntries(track) : [];
  const idx = entries.findIndex(e => e.step === id);
  const note = idx >= 0 ? entries[idx].note : null;
  const prev = idx > 0 ? entries[idx - 1] : null, next = idx >= 0 && idx < entries.length - 1 ? entries[idx + 1] : null;
  const arts = artifactsForStep(id);
  const others = inTracks.filter(t => !track || t.id !== track.id);

  main.innerHTML = `
    <div class="crumbs">${track ? `<a href="#/track/${track.id}">${esc(track.title)}</a><span class="sep">›</span><span>step ${idx + 1} of ${entries.length}</span>` : `<a href="#/steps">All steps</a>`}</div>
    <h1>${esc(s.title)}</h1>
    <p class="lede">${esc(s.short)}</p>
    ${note ? `<div class="note"><b>In this workflow:</b> ${md(note)}</div>` : ''}
    <div id="player"></div>
    <div class="keys"><kbd>space</kbd> play/pause · <kbd>←</kbd><kbd>→</kbd> step 0.1 s (<kbd>⇧</kbd> 1 s) · <kbd>[</kbd><kbd>]</kbd> phase · <kbd>R</kbd> restart</div>
    <div class="sections">
      <div class="section">
        <div class="two-col"><div><b>Goes in:</b> ${esc(s.inputs || '')}</div><div><b>Comes out:</b> ${esc(s.outputs || '')}</div></div>
      </div>
      <div class="section"><h2>What happens at the bench</h2>${s.bench.map(p => `<p>${md(p)}</p>`).join('')}</div>
      ${s.variants?.length ? `<div class="section"><h2>Variants you will meet in a Methods section</h2><div class="variants">${s.variants.map(v => `<div class="variant"><b>${esc(v.name)}</b>${md(v.text)}</div>`).join('')}</div></div>` : ''}
      <div class="section"><h2>In your data <span class="tag">consequences</span></h2>${list(s.data)}</div>
      ${failures[id]?.length ? `<div class="section"><h2>What can go wrong here <span class="tag">bench or biology?</span></h2>
        <p class="section-lede">Each row is a way this step fails, the trace it leaves in the FASTQ or downstream, and how to tell that trace from real biology.</p>
        <div class="failures">
          <div class="fhead"><span>At the bench</span><span>In your FASTQ / downstream</span><span>Bench or biology? How to tell</span></div>
          ${failures[id].map(f => `<div class="failure">
            <div class="f-what"><b>${md(f.what)}</b>${f.artifact && artifacts[f.artifact] ? `<a class="f-art" href="#/artifact/${f.artifact}">${esc(artifacts[f.artifact].title)}</a>` : ''}</div>
            <div class="f-sig"><small>In your FASTQ / downstream</small>${md(f.signature)}</div>
            <div class="f-tell"><small>Bench or biology?</small>${md(f.tell)}</div>
          </div>`).join('')}
        </div></div>` : ''}
      <div class="section two-col">
        <div><h2>Check in your files</h2>${list(s.check)}</div>
        <div><h2>Ask the wet lab</h2>${list(s.ask)}</div>
      </div>
      ${arts.length ? `<div class="section"><h2>Artefacts that trace back here</h2><div class="artifact-chips">${arts.map(a => `<a href="#/artifact/${a.id}">${esc(a.title)}</a>`).join('')}</div></div>` : ''}
      ${others.length ? `<div class="section"><h2>Also part of</h2><p>${others.map(t => `<a href="#/track/${t.id}/${id}">${esc(t.title)}</a>`).join(' · ')}</p></div>` : ''}
    </div>
    ${track ? `<div class="pager">
      ${prev ? `<a href="#/track/${track.id}/${prev.step}"><small>← previous</small>${esc(steps[prev.step].title)}</a>` : '<span></span>'}
      ${next ? `<a class="next" href="#/track/${track.id}/${next.step}"><small>next →</small>${esc(steps[next.step].title)}</a>` : `<a class="next" href="#/track/${track.id}"><small>done</small>Back to workflow</a>`}
    </div>` : ''}
  `;
  const anim = await loadAnim(id);
  if (parse().join('/') !== routeAtStart) return; // navigated away meanwhile
  player = createPlayer(document.getElementById('player'), anim);
}

async function renderAllSteps() {
  sidebarTracks();
  const ids = Object.keys(steps);
  main.innerHTML = `<h1>All steps</h1><p class="lede">${ids.length} steps in the library. Each is written once and reused by every workflow that contains it.</p>
    <input class="search" id="q" placeholder="Filter steps… (e.g. adapter, PCR, strand)" aria-label="Filter steps">
    <div class="cards" id="stepcards">${ids.map(id => `<a class="card step-card" href="#/step/${id}" data-text="${esc((steps[id].title + ' ' + steps[id].short + ' ' + (steps[id].data || []).join(' ') + ' ' + (failures[id] || []).map(f => f.what + ' ' + f.signature).join(' ')).toLowerCase())}"><canvas data-step="${id}"></canvas><h3>${esc(steps[id].title)}</h3><p>${esc(steps[id].short)}</p></a>`).join('')}</div>`;
  document.getElementById('q').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    main.querySelectorAll('#stepcards .card').forEach(c => { c.style.display = !q || c.dataset.text.includes(q) ? '' : 'none'; });
  });
  for (const c of main.querySelectorAll('canvas[data-step]')) {
    const anim = await loadAnim(c.dataset.step);
    renderThumb(c, anim, 260);
    c.style.width = '100%'; c.style.height = 'auto';
  }
}

function renderArtifacts() {
  sidebar.innerHTML = '';
  main.innerHTML = `<h1>Artifact index</h1><p class="lede">From what you see in the data back to the bench. Each entry lists how the artefact looks, which steps produce it, and what to do about it.</p>
    <div class="table-wrap"><table><thead><tr><th>Artefact</th><th>Looks like</th><th>Produced by</th></tr></thead><tbody>
    ${Object.entries(artifacts).map(([id, a]) => `<tr><td><a href="#/artifact/${id}"><b>${esc(a.title)}</b></a></td><td>${md(a.looksLike[0])}</td><td>${a.causes.map(c => `<a href="#/step/${c}">${esc(steps[c]?.title || c)}</a>`).join(', ')}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function renderArtifact(id) {
  const a = artifacts[id];
  sidebar.innerHTML = `<h4>Artefacts</h4><div class="alltracks">${Object.entries(artifacts).map(([k, v]) => `<a href="#/artifact/${k}" class="${k === id ? 'active' : ''}">${esc(v.title)}</a>`).join('')}</div>`;
  main.innerHTML = `
    <div class="crumbs"><a href="#/artifacts">Artifact index</a><span class="sep">›</span><span>${esc(a.title)}</span></div>
    <div class="artifact-head"><h1>${esc(a.title)}</h1><span class="badge">artefact</span></div>
    <div class="sections">
      <div class="section"><h2>What it looks like</h2>${list(a.looksLike)}</div>
      <div class="section"><h2>Where it comes from</h2><div class="cards">${a.causes.map(c => steps[c] ? `<a class="card" href="#/step/${c}"><h3>${esc(steps[c].title)}</h3><p>${esc(steps[c].short)}</p></a>` : '').join('')}</div></div>
      <div class="section"><h2>What to do about it</h2>${list(a.whatToDo)}</div>
    </div>`;
}

function renderAbout() {
  sidebar.innerHTML = '';
  main.innerHTML = `<h1>About</h1>
    <p class="lede">A visual reference for the part of a sequencing project that happens before the data exist.</p>
    <p>Bioinformaticians inherit FASTQ files and, with them, every decision the wet lab made: how the sample was stored, how cells were lysed, how many PCR cycles were run, which indexes were chosen, which instrument was used. Most of those decisions leave a fingerprint in the reads, and most analysis mistakes come from not knowing which fingerprints to expect.</p>
    <p>This site walks through the common workflows step by step. The <a href="#/find">Which workflow is mine?</a> page maps analysis tasks, metadata labels and read shapes to workflows. Each step has an animation that shows what happens to the molecules, and four sections written for the analyst: what the step does to your data, what can go wrong at the bench and how that failure looks in the FASTQ compared with real biology, where to look for it in your files, and what to ask the people who made the library.</p>
    <h2>Design</h2>
    <ul>
      <li>Every animation is drawn as a pure function of time, so scrubbing is exact and any frame can be reproduced.</li>
      <li>Colours carry fixed meanings across the whole site (see the legend on the start page).</li>
      <li>Steps are written once and shared between workflows; workflow-specific caveats appear as notes.</li>
      <li>Plain HTML, CSS and ES modules. No build step. Works offline from a local server.</li>
    </ul>
    <h2>Accuracy</h2>
    <p>Protocol details (cycle numbers, bead ratios, pore sizes) are typical values from vendor protocols and common practice, not the values used for any particular dataset. Always confirm against the actual Methods section or the facility’s records.</p>
    <h2>Contributing</h2>
    <p>Each step is a text entry in <code>src/content/steps.js</code> and an animation module in <code>src/anim/&lt;step-id&gt;.js</code>. Workflows are lists of step ids in <code>src/content/tracks.js</code>. See the README for the animation interface.</p>`;
}

route();
