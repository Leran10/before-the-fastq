// Canvas player for one step animation.
//
// An animation module exports an object:
//   {
//     id: 'fragmentation',
//     duration: 12,                 // seconds; the animation loops
//     thumbT: 5.5,                  // a representative time for thumbnails
//     phases: [{ t: 0, label: 'Intact gDNA', caption: 'One sentence shown under the canvas.' }, ...],
//     draw(ctx, t, W, H, P) {}      // pure function of t
//   }
//
// The player owns the clock. The animation owns nothing.

import { currentPalette } from './palette.js';

export const LOGICAL_W = 960;
export const LOGICAL_H = 540;

export function renderFrame(canvas, anim, t, opts = {}) {
  const P = opts.palette || currentPalette();
  const dpr = opts.dpr || window.devicePixelRatio || 1;
  const cssW = opts.width || canvas.clientWidth || LOGICAL_W;
  const cssH = cssW * LOGICAL_H / LOGICAL_W;
  const pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
  if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, pw, ph);
  const s = pw / LOGICAL_W;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.fillStyle = P.panel;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  ctx.save();
  try { anim.draw(ctx, t, LOGICAL_W, LOGICAL_H, P); }
  catch (e) {
    ctx.restore(); ctx.save();
    ctx.fillStyle = P.alert; ctx.font = '14px ui-monospace, monospace'; ctx.textBaseline = 'top';
    ctx.fillText('draw() threw: ' + (e && e.message), 20, 20);
    console.error(e);
  }
  ctx.restore();
}

export function phaseAt(anim, t) {
  let cur = anim.phases[0], idx = 0;
  anim.phases.forEach((p, i) => { if (t >= p.t) { cur = p; idx = i; } });
  return { phase: cur, index: idx };
}

export function createPlayer(root, anim) {
  root.classList.add('player');
  root.innerHTML = `
    <div class="player-stage"><canvas aria-label="${anim.id} animation"></canvas>
      <div class="player-caption" aria-live="polite"></div>
    </div>
    <div class="player-controls">
      <button class="btn-play" title="Play / pause (space)" aria-label="Play or pause">
        <svg class="ic-play" viewBox="0 0 16 16" width="14" height="14"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>
        <svg class="ic-pause" viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" fill="currentColor"/></svg>
      </button>
      <div class="scrub-wrap">
        <div class="phase-ticks"></div>
        <input class="scrub" type="range" min="0" max="${anim.duration}" step="0.01" value="0" aria-label="Scrub time">
      </div>
      <span class="time mono">0.0 / ${anim.duration.toFixed(0)}s</span>
      <select class="rate" aria-label="Playback speed">
        <option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option>
      </select>
    </div>
    <div class="phase-chips" role="tablist"></div>
  `;
  const canvas = root.querySelector('canvas');
  const caption = root.querySelector('.player-caption');
  const btn = root.querySelector('.btn-play');
  const scrub = root.querySelector('.scrub');
  const timeEl = root.querySelector('.time');
  const rateEl = root.querySelector('.rate');
  const chips = root.querySelector('.phase-chips');
  const ticks = root.querySelector('.phase-ticks');

  anim.phases.forEach((p, i) => {
    const c = document.createElement('button');
    c.className = 'chip'; c.textContent = p.label; c.setAttribute('role', 'tab');
    c.addEventListener('click', () => { seek(p.t + 0.001); });
    chips.appendChild(c);
    if (i > 0) {
      const tk = document.createElement('span');
      tk.className = 'tick'; tk.style.left = (p.t / anim.duration * 100) + '%';
      ticks.appendChild(tk);
    }
  });

  let t = 0, playing = true, last = performance.now(), rate = 1, raf = 0, visible = true;
  let lastPhase = -1;

  function paint() {
    renderFrame(canvas, anim, t);
    scrub.value = t.toFixed(2);
    timeEl.textContent = `${t.toFixed(1)} / ${anim.duration.toFixed(0)}s`;
    const { phase, index } = phaseAt(anim, t);
    if (index !== lastPhase) {
      lastPhase = index;
      caption.textContent = phase.caption || '';
      chips.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', i === index));
    }
  }
  function frame(now) {
    raf = 0;
    if (playing && visible) {
      const dt = Math.min(0.1, (now - last) / 1000) * rate;
      t += dt; if (t >= anim.duration) t -= anim.duration;
    }
    last = now;
    paint();
    if (playing && visible) raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function setPlaying(p) { playing = p; root.classList.toggle('paused', !p); if (p) start(); else paint(); }
  function seek(nt) { t = ((nt % anim.duration) + anim.duration) % anim.duration; paint(); }

  btn.addEventListener('click', () => setPlaying(!playing));
  scrub.addEventListener('input', () => { setPlaying(false); seek(parseFloat(scrub.value)); });
  rateEl.addEventListener('change', () => { rate = parseFloat(rateEl.value); });
  canvas.addEventListener('click', () => setPlaying(!playing));

  function onKey(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setPlaying(false); seek(t + (e.shiftKey ? 1 : 0.1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); seek(t - (e.shiftKey ? 1 : 0.1)); }
    else if (e.key === 'r' || e.key === 'R') { seek(0); setPlaying(true); }
    else if (e.key === ']') { const { index } = phaseAt(anim, t); const n = anim.phases[Math.min(anim.phases.length - 1, index + 1)]; seek(n.t + 0.001); }
    else if (e.key === '[') { const { index } = phaseAt(anim, t); const n = anim.phases[Math.max(0, index - 1)]; seek(n.t + 0.001); }
  }
  window.addEventListener('keydown', onKey);

  const io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) start(); });
  io.observe(root);
  const ro = new ResizeObserver(() => paint());
  ro.observe(canvas);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onTheme = () => paint();
  mq.addEventListener && mq.addEventListener('change', onTheme);

  paint(); start();

  return {
    seek, setPlaying,
    destroy() {
      playing = false; if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey); io.disconnect(); ro.disconnect();
      mq.removeEventListener && mq.removeEventListener('change', onTheme);
    },
  };
}

// Static thumbnail at anim.thumbT
// width sets the backing resolution; setStyle=false leaves CSS sizing to the stylesheet
export function renderThumb(canvas, anim, width = 240, setStyle = true) {
  if (setStyle) { canvas.style.width = width + 'px'; canvas.style.height = (width * LOGICAL_H / LOGICAL_W) + 'px'; }
  renderFrame(canvas, anim, anim.thumbT ?? anim.duration * 0.45, { width });
}
