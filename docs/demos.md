# Live demos

> **⚠️ A special version of Chrome is required.** All demos below require **Chromium Canary** with `chrome://flags/#canvas-draw-element` set to **HTML-in-Canvas Enabled** (not "Default"). Regular Chrome, Firefox, and Safari will render blank fallbacks.
>
> Quick verify — paste into DevTools console: `'onpaint' in HTMLCanvasElement.prototype`. Must print `true`. If `false`, see [prerequisites](getting-started/prerequisites.md) before clicking anything below.

## Starter demos

The original WICG examples. Each one exercises a single API surface as cleanly as possible.

| Demo | What it shows | Source |
|------|---------------|--------|
| **complex-text** | Rotated, multi-line text with emoji, RTL, vertical CJK, inline SVG and images | [`Examples/complex-text.html`](../Examples/complex-text.html) |
| **pie-chart** | Focusable, keyboard-navigable pie chart with multi-line HTML labels | [`Examples/pie-chart.html`](../Examples/pie-chart.html) |
| **text-input** | A full interactive form drawn into canvas with keyboard, focus, and IME | [`Examples/text-input.html`](../Examples/text-input.html) |
| **webGL cube** | HTML content rendered as a texture on a spinning 3D cube via `texElementImage2D` | [`Examples/webGL.html`](../Examples/webGL.html) |
| **webgpu-jelly-slider** | A range input under a WebGPU jelly-physics distortion shader | [`Examples/webgpu-jelly-slider/`](../Examples/webgpu-jelly-slider/) |

Live versions are hosted at [wicg.github.io/html-in-canvas](https://wicg.github.io/html-in-canvas/) but will only render correctly in Canary with the flag on.

## Advanced demos

Demos pushing the API into territory you can't reach with HTML overlays, `html2canvas`, or SVG `foreignObject`. Each is designed to be obviously impossible without this API.

### holographic-card

**What it is.** A real HTML business card with a Pokémon-style holographic foil effect overlaid on top. The iridescent sheen moves with your pointer. The name, email link, phone link, and URL are real DOM — you can tab to them and press Enter.

**What it shows.**
- `CanvasRenderingContext2D.drawElementImage` with a layered composition — the card is drawn once, then a radial rainbow gradient is painted on top using `globalCompositeOperation: 'overlay'`, followed by a specular highlight using `'screen'`.
- Event-driven paints (not a continuous rAF loop) so the GPU idles when the pointer is still.
- Accessibility preserved: links focusable, AT-announceable, keyboard-operable.

**What's uniquely enabled.** A live UI surface with a cinematic visual treatment where the foil effect doesn't break focus, keyboard, or screen readers. Overlays can't be composited; `html2canvas` is static; `foreignObject` can't sample cross-origin.

Source: [`Examples/holographic-card.html`](../Examples/holographic-card.html)

### infinite-canvas

**What it is.** A Figma-style infinite zoomable workspace. Pan by dragging empty space; zoom with scroll-wheel. Each panel on the board is a live HTML widget — a form, a sparkline, a calculator, a multi-script typography panel.

**What it shows.**
- 2D `CanvasRenderingContext2D.drawElementImage` with arbitrary scale + translation applied via the context CTM.
- Pointer and keyboard interaction across many panels, at any zoom.
- The user-facing claim tools like Figma and Miro want: crisp HTML at every zoom level.

**What's uniquely enabled.** Canvas-based design tools today re-implement text layout from scratch to get zoom fidelity. With this API the browser does the rendering; the author just positions the panels.

> **To verify.** Whether text remains crisp at extreme zoom depends on whether the implementation rasterizes the element at the destination size each frame vs. snapshotting once and scaling. The WICG explainer doesn't pin this down, and implementations may differ. If you zoom to 4× and text is blurry in your Canary build, file an issue — this demo's headline claim is a design aspiration, not a spec guarantee.

Source: [`Examples/infinite-canvas.html`](../Examples/infinite-canvas.html)

### trading-terminal

**What it is.** A Bloomberg-terminal-style dense HTML table with live prices that flash green or red on change, rendered through a subtle CRT / scanline / vignette treatment. Rows are focusable, headers are sortable, and every cell remains readable by a screen reader.

**What it shows.**
- Dense real-time HTML under a market-tick-driven `setInterval` with targeted `requestPaint()` calls (not every rAF).
- 2D canvas with layered compositing: chromatic-aberration ghost passes, a tiled scanline pattern, a radial vignette, and a soft green phosphor tint — all `drawElementImage` plus 2D ops, no WebGL needed.
- Accessibility preserved under heavy visual treatment.

**What's uniquely enabled.** "Aesthetic" UIs (CRT, terminal, cyberpunk) on the web today almost always sacrifice semantics for visual flair. Here, the semantic HTML table is still the source of truth — the shader-like CRT is pure 2D post-process.

Source: [`Examples/trading-terminal.html`](../Examples/trading-terminal.html)

### liquid-glass-nav

**What it is.** A full-page article with a fixed navigation bar that refracts the content scrolling underneath it — Apple-style liquid glass. Menu items are real `<a>` and `<button>` elements; Tab focuses them, Enter follows links, screen readers announce correctly.

**What it shows.**
- 2D `CanvasRenderingContext2D.drawElementImage` called three times per frame: once to fill the full-page background (scroll-offset), then twice inside a rounded-rect clip at the nav's bounding rect — a blurred pass (`blur(14px) saturate(1.1)`) and a chromatic-shifted pass (`'lighter'` blend, slight x-offset, `blur(18px)`) — plus two fill passes for a frost overlay and rim highlight.
- Scroll hijacked via `wheel` events → `requestPaint()` for smooth scroll-linked updates.
- Live HTML `<nav>` sibling (outside the canvas) positioned over the glass zone so links stay keyboard-navigable and focusable.

**What's uniquely enabled.** Apple-style liquid-glass effects on the web have historically required either expensive DOM-clone approximations or native apps. Here the canvas samples the live HTML once via `drawElementImage` and applies the blur as a pure 2D compositing step.

> **Note.** An earlier version of this demo attempted to use WebGPU `copyElementImageToTexture`, but that path hung the renderer in the Canary build we tested against. The pure-2D implementation is reliable and demonstrates the same core idea.

Source: [`Examples/liquid-glass-nav/`](../Examples/liquid-glass-nav/)

This is the only demo in the advanced set that's a bundled project — it uses Vite + TypeScript. Build with:

```bash
cd Examples/liquid-glass-nav
npm install
npm run dev
```

### crystal-hands

**What it is.** Hold your hands up to your webcam — they appear as thick translucent crystal sculptures with a honey-amber glow. MediaPipe tracks 21 keypoints per hand at 60 fps; a TypeGPU WebGPU ray-march shader reconstructs each hand as 20 SDF capsule bones, smooth-unioned into one continuous crystal volume. Beer-Lambert light absorption, Fresnel rim glow, and refraction caustics run on the GPU. A live HTML stats panel (FPS, hand count, gesture label) is composited into the frame each paint via the HTML-in-Canvas API.

**What it shows.**
- `GPUQueue.copyElementImageToTexture` — live HTML `<div>` copied to GPU texture every frame, composited by the fragment shader as a HUD.
- TypeGPU SDF ray march with 40-bone smooth-union hand volume.
- `copyElementImageToTexture` for webcam video upload (`copyExternalImageToTexture`).
- Real HTML controls (`<details>` for crystal tint, caustic intensity, absorption) outside the canvas — keyboard and screen-reader accessible.

**What's uniquely enabled.** The HUD labels (gesture name, hand count, FPS) are real DOM — screen-reader announceable, styleable in CSS — yet they appear composited inside the GPU render frame as if native shader overlays. Without HTML-in-Canvas this would require a separate 2D canvas + manual pixel composition.

Source: [`Examples/crystal-hands/`](../Examples/crystal-hands/)

Build with:

```bash
cd Examples/crystal-hands
npm install
npm run dev
```

### shadow-puppet

**What it is.** Hold a hand gesture up to your webcam and a cute cartoon animal spawns and wanders autonomously across the screen. Eight gestures map to eight animals: all-fingers-spread → Spider, four-fingers-no-thumb → Dragon, peace sign → Rabbit, rock-on (index + pinky) → Snake, point (index only) → Wolf, thumbs-up → Owl, both-hands-spread → Bird, both-hands-peace → Butterfly. Hold a gesture for 500 ms to trigger a spawn; a confidence bar in the HUD fills as you hold. Up to 8 animals can coexist on screen simultaneously, each wandering with soft collision avoidance.

**What it shows.**
- `CanvasRenderingContext2D.drawElementImage` for a live HUD overlay (gesture name + confidence bar + 8-gesture cheat sheet) on a separate `layoutsubtree` canvas layer.
- Three-canvas stacking: a WebGPU animated background (bottom), a Canvas 2D layer for animals and particles (middle), and an HTML-in-Canvas HUD (top) — all composited by the browser, no manual blending.
- SVG-in-Canvas animal rendering: each animal's geometry is defined as an inline SVG string constant (`src/animals/sprites/*.ts`), pre-loaded to an `HTMLImageElement` via `data:image/svg+xml` URL (`src/animals/svg-cache.ts`), and drawn with `ctx.drawImage()`. This gives crisp, scalable visuals at any DPR with no raster assets.
- Physics-based autonomous motion: each animal instance is wrapped in a `PhysicsAnimal` that applies wander steering (slowly rotating `wanderAngle`), soft boundary forces, and pairwise separation forces (O(N²) over ≤ 8 animals) to prevent clustering.
- Canvas 2D particle system: 72 firefly-like particles float upward behind the animals, each with a bright core and soft halo, cycling through a blue-cyan-purple hue range.
- WebGPU background via TypeGPU: 6 vivid animated orbs (magenta, cyan, gold, violet, teal, orange) with 4-octave fBm Perlin noise fog and a crepuscular spotlight cone rising from the bottom centre. Uses `@typegpu/noise`'s `perlin2d.staticCache` injected into the render pipeline.
- Gesture classifier with palm normalization: landmarks are normalized to wrist-origin / palm-scale before classification, using tip-to-wrist vs MCP-to-wrist extension ratios (threshold 1.6) instead of raw pixel offsets. Explicit curl guards (`ratio < 1.2`) prevent ambiguous gestures from misfiring. A 3-frame smoothing buffer prevents transient misfires during transitions.
- MediaPipe HandLandmarker two-pass classifier: each hand classified independently, then combined for two-hand gestures (Bird, Butterfly).
- Hand debug panel: a fixed bottom-right canvas (`src/hand-debug.ts`) draws the mirrored webcam feed with MediaPipe skeleton overlay, per-finger state dots, and the current gesture label — useful for tuning the classifier.

**What's uniquely enabled.** The HUD (gesture label + progress bar) is real DOM — styled in CSS, screen-reader accessible — yet it appears composited inside the live animation frame. Without this API you'd need a separate absolutely-positioned overlay that can't be in sync with the canvas render.

Source: [`Examples/shadow-puppet/`](../Examples/shadow-puppet/)

Build with:

```bash
cd Examples/shadow-puppet
npm install
npm run dev
```

---

## Which demo should I start with?

| If you want to... | Open this first |
|-------------------|----------------|
| See the API for the first time | complex-text |
| Understand interactivity | text-input |
| Be convinced the API is worth shipping | holographic-card |
| See a framework-builder use case | infinite-canvas |
| See a dense-UI use case | trading-terminal |
| See WebGPU at full tilt | webgpu-jelly-slider |
| See liquid-glass / blur compositing | liquid-glass-nav |
| See WebGPU + live camera + HTML HUD | crystal-hands |
| See multi-layer canvas + gesture classification + HTML HUD | shadow-puppet |
