# Liquid-glass navigation

A WebGPU demo for the HTML-in-Canvas proposal.

A fixed navigation bar floats over a colorful, scrollable article. The bar refracts the article content with chromatic dispersion and a soft frost blur — Apple-style "liquid glass." Menu items are real `<a>` elements: Tab focuses them, Enter follows, screen readers announce correctly.

## Requirements

- **Chromium Canary** with `chrome://flags/#canvas-draw-element` **Enabled**. No other browser supports the API.
- **WebGPU available** (most 2017+ devices). Check with `'gpu' in navigator && await navigator.gpu.requestAdapter() !== null`.
- **Node 18+** and any npm-compatible package manager.

## Run

```bash
npm install
npm run dev
```

Vite will print a local URL. Open it in Canary.

## Architecture

```
<canvas layoutsubtree>           ← fills the viewport
  <div class="page">             ← direct child: the content "behind"
    …article, gradients, orbs…
  </div>
  <nav class="nav">              ← direct child: the real nav DOM
    <a>Work</a><a>Studio</a>…   ← focusable, keyboard-accessible
  </nav>
</canvas>
```

Each frame:

1. `copyElementImageToTexture(pageEl, pageTex)` — captures the body.
2. `copyElementImageToTexture(navEl, navTex)` — captures the nav DOM.
3. Fragment shader:
   - Samples `pageTex` with UV displacement driven by the gradient of a rounded-rectangle SDF of the nav.
   - Adds chromatic dispersion and a small frost blur inside the glass region.
   - Composites `navTex` on top.
4. `getElementTransform` + `style.transform` assignment keeps both DOM elements' hit-test boxes aligned with what's drawn.

Scroll is hijacked: `wheel` events translate the `.page` element's `transform: translateY(...)` instead of the document.

## Files

- `index.html` — shell with `<div id="root">`.
- `src/main.ts` — feature detection + bootstrap.
- `src/dom.ts` — builds the `<canvas>` + children.
- `src/liquid-glass.ts` — WebGPU pipeline (shader, textures, paint loop).
- `src/style.css` — all styles.

## Falls back to what?

If the flag is off or WebGPU is missing, the demo replaces itself with a message explaining what's needed. It does **not** degrade to a CSS-only approximation — this demo exists to exercise the new API, not to be a graceful-degradation reference.
