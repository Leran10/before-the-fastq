// Animation registry. Each step id maps to ./anim/<id>.js, loaded on demand.
// A step without an animation file gets the placeholder so the page still works.

import { text, dsFragment, dot, sp, win } from '../draw.js';

const cache = new Map();

export function placeholderFor(id) {
  return {
    id,
    duration: 6,
    thumbT: 2,
    placeholder: true,
    phases: [{ t: 0, label: 'Animation pending', caption: 'This step has text but no animation yet.' }],
    draw(ctx, t, W, H, P) {
      const a = win(t, 0, 6, 0.6);
      const x0 = W * 0.3, x1 = W * 0.7, y = H * 0.5;
      dsFragment(ctx, x0, x1, y, { colorA: P.dnaDim, colorB: P.dnaDim, alpha: 0.8 });
      const px = x0 + (x1 - x0) * sp(t % 3, 0, 3);
      dot(ctx, px, y, 5, P.gold, a);
      text(ctx, 'animation in progress', W / 2, H * 0.62, { size: 14, color: P.inkDim, align: 'center' });
    },
  };
}

export async function loadAnim(id) {
  if (cache.has(id)) return cache.get(id);
  let mod;
  try {
    mod = (await import(`./${id}.js`)).default;
    if (!mod || typeof mod.draw !== 'function') throw new Error('bad module');
    mod.id = mod.id || id;
    if (!mod.phases || !mod.phases.length) mod.phases = [{ t: 0, label: id, caption: '' }];
  } catch (e) {
    mod = placeholderFor(id);
  }
  cache.set(id, mod);
  return mod;
}
