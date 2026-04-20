/**
 * Liquid-glass navigation bar demo for HTML-in-Canvas (2D).
 *
 * A fixed nav bar appears to be frosted glass, refracting and blurring
 * whatever content scrolls underneath it. The nav is real HTML —
 * focusable links, keyboard-navigable, screen-reader-announceable.
 *
 * Implementation is pure 2D canvas — see ./liquid-glass.ts.
 *
 * Requires Chromium Canary with chrome://flags/#canvas-draw-element.
 */

import './style.css';
import { buildDemoDom } from './dom';
import { LiquidGlass } from './liquid-glass';

function main() {
  if (!('onpaint' in HTMLCanvasElement.prototype)) {
    showUnsupported('The HTML-in-Canvas flag is not enabled.');
    return;
  }

  const { root: demoRoot, canvas, pageEl, navEl } = buildDemoDom();
  const mount = document.getElementById('root')!;
  mount.appendChild(demoRoot);

  const glass = new LiquidGlass(canvas, navEl, pageEl);
  glass.init();

  new ResizeObserver(([entry]) => {
    const box = entry.devicePixelContentBoxSize[0];
    canvas.width = box.inlineSize;
    canvas.height = box.blockSize;
    glass.onResize(box.inlineSize, box.blockSize);
    canvas.requestPaint();
  }).observe(canvas, { box: 'device-pixel-content-box' });

  canvas.requestPaint();
}

function showUnsupported(msg: string) {
  document.body.setAttribute('data-unsupported', '');
  const box = document.createElement('div');
  box.className = 'unsupported';
  box.setAttribute('role', 'alert');
  box.innerHTML = `
    <strong>${msg}</strong>
    <p>This demo needs Chromium Canary with
    <code>chrome://flags/#canvas-draw-element</code> enabled.</p>
  `;
  document.body.appendChild(box);
}

try {
  main();
} catch (err) {
  console.error(err);
  showUnsupported('Demo failed to initialize: ' + (err as Error).message);
}
