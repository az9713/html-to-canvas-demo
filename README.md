# HTML-in-Canvas — demos and developer docs

A fork of [WICG/html-in-canvas](https://github.com/WICG/html-in-canvas) with four extra demos and a full documentation site for the proposed API.

> **What is HTML-in-Canvas?** A Web Platform API proposal that lets you draw real, live, accessible HTML into a `<canvas>` — in 2D, WebGL, and WebGPU contexts. Tab order, screen readers, focus rings, keyboard input, IME — it all keeps working while the browser composites the pixels however your shader decides.
>
> For the explainer and full spec text, see [`EXPLAINER.md`](EXPLAINER.md).

---

## Watch the video first

The creator's overview — **"This Makes The Web Fun Again (HTML-in-Canvas)"** — is a great 12-minute tour of what the API does and why it matters:

- YouTube: <https://www.youtube.com/watch?v=1zfRSiZBLyQ&t=1s>

Once you've watched that, the demos below will make immediate sense.

## A quick tour of the demos in this fork

https://github.com/user-attachments/assets/9de4ce20-4db1-49e1-afcf-2eda6eb0a04f

---

## ⚠️ A special version of Chrome is required

These demos only run in **Chromium Canary** with the feature flag turned on. They will NOT run in regular Chrome, Firefox, or Safari.

1. Download [Chromium Canary](https://www.google.com/chrome/canary/).
2. Open `chrome://flags/#canvas-draw-element`.
3. Change the dropdown from **Default** to **HTML-in-Canvas Enabled**.
4. Click **Relaunch**.

Verify in DevTools:

```js
'onpaint' in HTMLCanvasElement.prototype
// → true means the flag is active
```

If you see `false`, the flag isn't on. Re-check step 3.

---

## Demos

The `Examples/` directory ships ten demos in total — five originals from the WICG repo and five new ones added in this fork.

### Starter demos (from upstream)

| Demo | What it shows | Source |
|------|---------------|--------|
| Complex text | Rotated multi-line text with emoji, RTL, vertical CJK, inline SVG and images | [`Examples/complex-text.html`](Examples/complex-text.html) |
| Pie chart | Focusable, keyboard-navigable pie chart with multi-line HTML labels | [`Examples/pie-chart.html`](Examples/pie-chart.html) |
| Text input | A full interactive form drawn into canvas with keyboard, focus, and IME | [`Examples/text-input.html`](Examples/text-input.html) |
| WebGL cube | HTML rendered as a texture on a spinning 3D cube | [`Examples/webGL.html`](Examples/webGL.html) |
| WebGPU jelly slider | Range input under a WebGPU jelly-physics distortion shader | [`Examples/webgpu-jelly-slider/`](Examples/webgpu-jelly-slider/) |

### Advanced demos (added in this fork)

| Demo | What it shows | Source |
|------|---------------|--------|
| Holographic card | Pokémon-style holographic foil over a real HTML business card with working `mailto:` / `tel:` / URL links. Mouse-tracked iridescence. | [`Examples/holographic-card.html`](Examples/holographic-card.html) |
| Infinite canvas | Figma-style zoomable workspace with six live HTML widgets (form, sparkline, multi-script typography, calculator). Zoom with the toolbar or scroll wheel. | [`Examples/infinite-canvas.html`](Examples/infinite-canvas.html) |
| Trading terminal | Bloomberg-style dense HTML table with CRT/scanline/vignette treatment. Sortable, focusable, screen-reader accessible. | [`Examples/trading-terminal.html`](Examples/trading-terminal.html) |
| Liquid glass nav | Apple-style frosted-glass navigation bar with chromatic dispersion refracting a scrollable article below. Menu items are real `<a>` elements. | [`Examples/liquid-glass-nav/`](Examples/liquid-glass-nav/) |
| Crystal hands | Real-time webcam hand tracking (MediaPipe) + WebGPU SDF ray-march shader rendering hands as translucent crystal with caustics. Live HTML stats HUD composited by the GPU via `copyElementImageToTexture`. | [`Examples/crystal-hands/`](Examples/crystal-hands/) |
| Shadow puppet | Hold a hand gesture up to your webcam — 8 gestures map to cute cartoon animals (bird, rabbit, butterfly, wolf, dragon, snake, owl, spider) that animate autonomously across the screen. Three-canvas stack: WebGPU particle background, procedural 2D canvas animals, HTML-in-Canvas HUD via `drawElementImage`. | [`Examples/shadow-puppet/`](Examples/shadow-puppet/) |

https://github.com/user-attachments/assets/e8df2cfd-1e63-4c9a-95d4-0de2bb54d1fd

---

## Run the demos

In Canary with the flag enabled:

### 1. Start a static server

From the repository root:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

> **Note — Windows IPv6 gotcha.** Without `--bind 127.0.0.1`, Python's `http.server` binds to IPv6 only, which can cause Chrome to return "This page isn't working" when you hit `localhost`. The explicit IPv4 bind avoids it.

Then open the demo index:

- <http://127.0.0.1:8765/Examples/>

…which links to every demo with a live flag-status check at the top.

### 2. (For bundled demos) start Vite

Three demos are bundled TypeScript projects that need their own dev server. In a second terminal:

```bash
# liquid-glass-nav
cd Examples/liquid-glass-nav && npm install && npm run dev

# crystal-hands
cd Examples/crystal-hands && npm install && npm run dev

# shadow-puppet
cd Examples/shadow-puppet && npm install && npm run dev
```

Vite prints a `http://localhost:5173/` URL — open it in Canary.

---

## Documentation

A full developer documentation site lives in [`docs/`](docs/), organized for both new readers and experienced developers:

| Section | What's inside |
|---------|---------------|
| [Overview](docs/overview/what-is-this.md) | Mental model, architecture, key concepts |
| [Getting started](docs/getting-started/quickstart.md) | Flag setup, 10-minute quickstart, zero-to-hero onboarding |
| [Concepts](docs/concepts/layoutsubtree.md) | Deep dives: `layoutsubtree`, the `paint` event, element images, synchronization, the privacy model |
| [Guides](docs/guides/render-to-2d-canvas.md) | Task-oriented how-tos for 2D, WebGL, WebGPU, `OffscreenCanvas`, and crisp HiDPI sizing |
| [Reference](docs/reference/api.md) | Complete API reference and raw WebIDL |
| [Architecture](docs/architecture/design-goals.md) | Design goals and Architecture Decision Records (paint-event timing, ignored CSS transforms, threaded effects) |
| [Demos](docs/demos.md) | Full walkthrough of every demo and what API surface it exercises |
| [Troubleshooting](docs/troubleshooting/common-issues.md) | Top 15 failures and their fixes |
| [Debugging journal](docs/debugging-journal.md) | Every non-trivial bug hit while building this fork, with root cause + fix |

Entry point: [`docs/index.md`](docs/index.md).

## What this fork adds on top of upstream

- `Examples/holographic-card.html`, `Examples/infinite-canvas.html`, `Examples/trading-terminal.html`, `Examples/liquid-glass-nav/`, `Examples/crystal-hands/`, `Examples/shadow-puppet/` — six new demos.
- `Examples/index.html` — a cards landing page with live flag-status detection.
- `docs/` — 25 markdown files, all cross-linked, covering concepts, guides, reference, architecture, and troubleshooting.
- `docs/debugging-journal.md` — a field report of every issue encountered while writing the demos (GPU hangs on tight `texElementImage2D` loops, the undocumented `position: static` enforcement on canvas children, containing-block side effects from near-identity sync transforms, etc.).

## Credits

- The original explainer, IDL, and starter examples come from the [WICG/html-in-canvas](https://github.com/WICG/html-in-canvas) working group. See `EXPLAINER.md` for the authoritative spec text and author list.
- The YouTube walkthrough: [*This Makes The Web Fun Again (HTML-in-Canvas)*](https://www.youtube.com/watch?v=1zfRSiZBLyQ&t=1s).

## License

Documentation and demos follow the same W3C licensing as the upstream repo — see `LICENSE.md`.
