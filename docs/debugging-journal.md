# Debugging journal

A record of every non-trivial bug and design issue we hit while writing the docs and the four advanced demos (`holographic-card`, `infinite-canvas`, `trading-terminal`, `liquid-glass-nav`). Each entry is symptom → root cause → fix, with the commit-level detail left in the source.

> **Prerequisite for reproducing any of this.** All the demos require **Chromium Canary** with the flag at `chrome://flags/#canvas-draw-element` set to **HTML-in-Canvas Enabled**. The flag label in the Chrome UI is literally "HTML-in-Canvas Enabled" — if you see "Default" or "Disabled", change it and relaunch. Demos will not run in regular Chrome, Firefox, or Safari. Quick sanity check in DevTools:
>
> ```js
> 'onpaint' in HTMLCanvasElement.prototype  // must be true
> ```

---

## Part 1 — Documentation bugs caught by review

### 1.1 `UNPACK_FLIP_Y_WEBGL` described as one-shot

**Symptom.** The 2D-guide and troubleshooting docs described `gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)` as "applies only to the next upload, not retroactively."

**Root cause.** Misread of WebGL state semantics. `pixelStorei` values are **sticky** — they persist for every subsequent upload until changed.

**Fix.** Updated both `guides/render-to-webgl.md` and `troubleshooting/common-issues.md` to say "the setting is sticky — it persists until you change it, and applies to every subsequent upload in the same context."

### 1.2 Made-up Node / pnpm version requirements

**Symptom.** `getting-started/prerequisites.md` declared "Node.js 20 or newer" and "pnpm 9 or newer" for the WebGPU jelly-slider demo.

**Root cause.** I wrote these without opening `Examples/webgpu-jelly-slider/package.json`. The actual `package.json` declares no `engines` field and ships a `package-lock.json` (not `pnpm-lock.yaml`), so npm is the correct package manager, and the only hard floor is whatever Vite 6 requires (Node 18+).

**Fix.** Replaced the fabricated requirements with the real ones (Node 18+, any npm-compatible manager). Added a note that the project doesn't declare `engines`, so the floor comes from Vite.

### 1.3 "Flag landed in 2025-era Canary builds"

**Symptom.** Unfounded specificity about a calendar date in `troubleshooting/common-issues.md`.

**Root cause.** Pattern-matching from vague memory rather than checking.

**Fix.** Replaced with "Update Chromium Canary to a recent build. The flag ships in current Canary; older or non-Canary builds may not include it."

### 1.4 Claim that canvas resize auto-fires `paint`

**Symptom.** `concepts/paint-event.md` and `reference/api.md` asserted that resizing the canvas backing store triggers a `paint` event.

**Root cause.** Plausible-sounding assumption. The explainer doesn't say this, and every demo in the repo calls `canvas.requestPaint()` explicitly inside its `ResizeObserver` callback — which is the opposite signal (they wouldn't, if resize triggered `paint` on its own).

**Fix.** Removed the claim. Added an explicit "resize does not trigger paint — call `requestPaint()` yourself" note.

### 1.5 `InvalidStateError` exception names stated as definitive

**Symptom.** `reference/api.md` listed specific `DOMException.name` values (`InvalidStateError`) for precondition failures on `drawElementImage` and friends.

**Root cause.** The explainer says "an exception is thrown" but doesn't pin the name. I invented a specific name that fit the pattern.

**Fix.** Softened to "Throws a `DOMException`" with a note that the exact `name` is not fixed by the current explainer — implementations are expected to use `InvalidStateError` or a closely related name. Advised catching generically.

### 1.6 Broken anchor links in cross-references

**Symptom.** Automated link-checker found two links into `reference/api.md` pointing at non-existent anchors:
- `api.md#getelementtransform` from `concepts/synchronization.md`
- `api.md#captureelementimage` from `guides/use-offscreencanvas.md`

**Root cause.** GitHub's heading-to-slug algorithm lowercases, strips punctuation, and joins words with hyphens. The heading `## HTMLCanvasElement.getElementTransform()` slugs to `htmlcanvaselementgetelementtransform`, not `getelementtransform`.

**Fix.** Corrected both links to use the full slug.

---

## Part 2 — Bugs in the new demos

### 2.1 Unverified "zoom fidelity" claim in `infinite-canvas.html`

**Symptom.** The demo's source comments and `demos.md` entry asserted: *"HTML text stays crisp at any zoom level because `drawElementImage` re-rasterizes at the destination resolution each frame."*

**Root cause.** Plausible-sounding expectation, but the explainer doesn't pin down whether `drawElementImage` snapshots-and-scales or re-rasterizes. Different implementations could do either.

**Fix.** Softened the claim in both `Examples/infinite-canvas.html` (header comment) and `docs/demos.md`. The demo now notes this is a design aspiration, not a spec guarantee, and invites the reader to file an issue if zoom appears blurry. (In the Canary build we tested against, text did stay crisp — so the aspiration holds in practice there, just not contractually.)

### 2.2 `liquid-glass-nav` used a CSS transform to "scroll"

**Symptom.** First draft of `liquid-glass.ts` translated the page via `pageEl.style.transform = translateY(...)`. This would appear to work locally but the refraction wouldn't actually sample the scrolled content — it would always sample the top of the page.

**Root cause.** CSS transforms on canvas children are **ignored** by `drawElementImage` / `copyElementImageToTexture` — this is by design (see [ADR 002](architecture/adr/002-ignore-css-transforms.md)). Transforms affect hit testing and a11y only, not sampling.

**Fix (first attempt).** Switched to the source-rect overload `copyElementImageToTexture(source, sx, sy, sw, sh, dest)` to sample from the scroll offset directly.

**Second fix (after the architecture was rewritten — see 2.5).** In the pure-2D variant, we call `ctx.translate(0, -scrollY * dpr)` before `drawElementImage`, which moves the *drawing* origin and correctly surfaces scrolled content without touching the source element's transform.

### 2.3 Holographic card crashed the tab ("Aw, Snap!")

**Symptom.** Loading `holographic-card.html` in Canary froze the renderer process and Chrome showed the "Aw, Snap!" crash page.

**Root causes (compounding).**

1. `onpaint` unconditionally called `canvas.requestPaint()` at the end of every frame. Even with `rAF` throttling, this is a tight ping-pong that hammers the compositor.
2. The WebGL 2 fragment shader included a 25-sample hash-noise sparkle pass, rainbow cosine gradient, and stripe pattern. Not extreme, but compounded with per-frame `texElementImage2D` uploads it saturated the GPU.
3. Subsequent simplifications (WebGL 1, simpler shader, event-driven paints only) **still** froze — suggesting the crash root-cause was more fundamental than shader complexity.

**Resolution.** Rewrote the demo as pure 2D:

- `ctx.drawElementImage(card, 0, 0, W, H)` to draw the card.
- A radial rainbow gradient composited on top with `globalCompositeOperation: 'overlay'` that moves with the mouse.
- A specular highlight with `globalCompositeOperation: 'screen'`.
- `requestPaint()` is scheduled only from pointer events and runs a small eased-tilt animation for ~22 frames.

The 2D pipeline is reliable; this variant renders correctly with visible rainbow glow and working mouse-reactive highlight. Interactive `<a>` links (`mailto:`, `tel:`, URL) stay focusable.

### 2.4 Trading terminal froze on load

**Symptom.** Same as 2.3 — renderer process timed out on first paint, couldn't screenshot or run JavaScript.

**Root causes.**

1. CSS `@keyframes flash-up 0.6s ease-out` animations on every flashed price cell. Each frame of the keyframe is a paint change, which invalidates the snapshot and fires `paint` again. With 4–6 cells flashing continuously and a 0.6-second animation duration, this produced a steady ~60 Hz stream of `paint` events.
2. Each `paint` re-ran a WebGL 2 fragment shader with a 25-sample (5×5) Gaussian blur for bloom, plus chromatic aberration and scanlines.
3. `texElementImage2D` re-uploaded the ~25-row table into a 1760×1120 texture every frame.

Combined: ~60 × (table upload + 5×5 blur per pixel × 2M pixels) per second, more work than the GPU could drain.

**Fixes, applied in order.**

1. **Replaced `@keyframes` with discrete class toggles.** `.flash-up` / `.flash-down` are now plain classes set by JS and removed 400ms later via `setTimeout`. Two paints per price change instead of 36.
2. **Reduced shader cost** — dropped the blur loop, kept just chromatic aberration + scanlines.
3. **Converted the market tick to `setInterval(900ms)`** instead of a rAF loop so paints are bounded.

Those fixes cut paint frequency by ~30× but the demo still froze. Root cause of the remaining freeze is the same as in 2.3 (something about tight `texElementImage2D` + shader loops on this Canary build).

**Final resolution.** Rewrote the post-processing in pure 2D:

- `ctx.drawElementImage(terminal, 0, 0, W, H)` for the terminal table.
- Two extra `drawElementImage` ghost passes at ±1 px with `globalCompositeOperation: 'lighter'` and `ctx.filter = 'hue-rotate(...) saturate(2)'` for chromatic aberration.
- A pre-built 1×4 scanline pattern image, filled with `globalCompositeOperation: 'multiply'`.
- A radial vignette via `createRadialGradient` + `'multiply'`.
- A green phosphor tint via `'soft-light'` blend.

The 2D pipeline renders the terminal, flashes prices, and holds up under live ticking.

### 2.5 `liquid-glass-nav` — WebGPU path hung and `position: absolute` was silently ignored

**Symptom 1 (hang).** The WebGPU variant of liquid-glass-nav froze the renderer the same way the WebGL demos did, even after reducing it to a single `copyElementImageToTexture` per frame.

**Symptom 2 (positioning).** After switching to a 2D fallback, the nav bar — styled with `position: absolute; left: 50%; transform: translateX(-50%)` inside the canvas — rendered at `(−360, 0)` instead of centered. Setting `nav.style.position = 'absolute'` via JavaScript had no effect: `getComputedStyle(nav).position` was `'static'`.

**Root cause 1.** WebGPU `copyElementImageToTexture` in the tested Canary build appears to be fragile in paths my demo exercised (possibly multi-copy-per-frame, possibly any tight loop). Not able to isolate further without browser-side debugging access.

**Root cause 2 — the big one.** `<canvas layoutsubtree>` forces `position: static` on its direct children. This is neither documented in the explainer nor mentioned in any reference I'd written. Verified via live DOM inspection:

```js
getComputedStyle(nav).position  // → "static" despite `position: absolute` in CSS
```

Implication: canvas children cannot be absolutely / fixed / relatively positioned. Any "floating nav over content" pattern that depends on CSS positioning is broken.

**Fix.**

1. Moved the nav **outside the canvas** — it's now a sibling DOM element with `position: fixed`, layered above the canvas via `z-index: 2`.
2. The canvas contains a single direct child (`.page` with the article body).
3. Each paint: `ctx.drawElementImage(pageEl, 0, 0, pageW, pageH)` for the page (with `ctx.translate(0, -scrollY * dpr)` applied to simulate scroll), then a clipped rounded-rect region is rendered with blurred + chromatically shifted copies of the page to create the glass effect.
4. The nav DOM sits on top of the canvas. Its text, focus ring, and interactions live in normal DOM — accessibility, Tab, screen-reader announcements all work.

Documented the `position: static` finding in [`concepts/layoutsubtree.md`](concepts/layoutsubtree.md) so future demo authors don't hit this.

### 2.6 Applying near-identity `getElementTransform` silently broke CSS layout

**Symptom.** After pushing the new architecture but before moving the nav outside the canvas, setting `pageEl.style.transform = pageSync.toString()` (where `pageSync` was a near-identity matrix like `matrix(1, 0, 0, 1, 6e-6, 9e-6)`) made the nav's `left: 50%` resolve to `0` instead of `viewport/2`.

**Root cause.** A non-`none` CSS `transform` makes the element establish a **containing block for its absolute- and fixed-positioned descendants**. Adding *any* transform to `.page`, even one that visually does nothing, changed what `.nav` (an absolute descendant) was positioned relative to. Combined with `.page`'s own layout, the absolute nav's `left: 50%` point snapped to 0.

**Fix.** Stopped applying `getElementTransform` sync to elements whose drawn position already matches their DOM layout position. Documented this gotcha in [`concepts/synchronization.md`](concepts/synchronization.md).

### 2.7 TypeScript errors in `liquid-glass-nav`

**Symptom.** `npx tsc --noEmit` produced 12 errors across `src/main.ts` and `src/liquid-glass.ts`.

**Root causes.**

1. Imports used explicit `.ts` extensions (`import { x } from './dom.ts'`), which TS 5 rejects unless `allowImportingTsExtensions` is on.
2. Standard TS lib definitions don't include the HTML-in-Canvas API surface (`requestPaint`, `onpaint`, `getElementTransform`, `captureElementImage`, `copyElementImageToTexture`, `texElementImage2D`, `ElementImage`, `PaintEvent`).
3. Variable `canvasRect` was declared twice in the same scope.

**Fixes.**

1. Removed the `.ts` suffixes from imports (Vite's resolver handles extensionless TS imports).
2. Created `src/html-in-canvas.d.ts` — ambient type declarations that augment the standard lib with the HTML-in-Canvas additions. Mirrors the IDL in `docs/reference/idl.md`.
3. Removed the duplicate `canvasRect` declaration.

After these changes: `tsc --noEmit` → no errors.

---

## Part 3 — Development environment issues

### 3.1 HTTP server port conflicts

**Symptom.** Attempts to start `python -m http.server 8765` sometimes succeeded but returned `curl: exit 52 / 000` on the health check.

**Root cause.** The port was already bound by a previous dev-session server that hadn't been cleanly reaped.

**Fix (workaround).** Picked a different port (`8766`) for the automation-driven testing server and documented that `python -m http.server <N>` for any free `N` is fine.

### 3.2 Browser MCP extension tabs stuck on frozen pages

**Symptom.** When a demo froze the renderer, subsequent `claude-in-chrome` operations on that tab (screenshot, `javascript_exec`, `navigate`) timed out at 30–45 seconds.

**Root cause.** The tab's renderer process was unresponsive; CDP commands couldn't complete.

**Fix.** Created a fresh tab via `tabs_create_mcp` and navigated the new tab to the target URL. The frozen tab stayed frozen but didn't block other tabs.

---

## Part 4 — Things the docs now say that they didn't before

These are the concrete additions that followed from the debugging findings:

| Doc | What was added |
|-----|----------------|
| `concepts/layoutsubtree.md` | "Children are forced to `position: static`" — a new section documenting the constraint we hit in 2.5. |
| `concepts/synchronization.md` | "Applying near-identity sync transforms has side effects" — containing-block note from 2.6. |
| `concepts/paint-event.md` | Explicit list of what does *and doesn't* trigger `paint`. Resize now clearly in the "does NOT" column. |
| `reference/api.md` | Exception names softened from specific `InvalidStateError` to generic `DOMException`. |
| `getting-started/prerequisites.md` | Real Node / package-manager floors, not invented ones. |
| `demos.md` | Unverified "infinite-canvas zoom fidelity" claim now flagged as aspiration-not-guarantee. |
| `index.md`, `overview/what-is-this.md`, `demos.md` | Prominent "HTML-in-Canvas Enabled" flag banners at the top, with the exact Chrome UI label. |

---

## Summary — what worked, what didn't

### What worked reliably on the tested Canary build

- 2D `drawElementImage` — every call, even under heavy per-frame load.
- 2D compositing (`globalCompositeOperation`, `ctx.filter`, `createPattern`, `createRadialGradient`).
- `requestPaint` as a once-per-frame kick from pointer / wheel / keyboard / `setInterval`.
- WebGL `texElementImage2D` called **once at setup** (starter `webGL.html` cube demo does this and is stable).

### What repeatedly destabilized the renderer

- WebGL `texElementImage2D` called **every paint** in a demo with a non-trivial fragment shader.
- WebGPU `copyElementImageToTexture` in a per-paint loop, even with a single source.
- CSS `@keyframes` animations on elements inside a `layoutsubtree` canvas (60 Hz snapshot invalidation).

### Lessons for future demo authors

1. **Default to 2D.** Both 2D demos in the repo (`complex-text.html`, `pie-chart.html`, `text-input.html`, our new `infinite-canvas.html`, `holographic-card.html`, `trading-terminal.html`) are reliable. The 3D/GPU demos are not, on this build.
2. **If you go WebGL, upload once.** Mimic `Examples/webGL.html`: `texElementImage2D` lives in a one-shot setup, the rAF loop only redraws geometry with the already-uploaded texture.
3. **Treat paint events as precious.** Don't trigger them more often than you need. CSS keyframes, `setInterval` tied to snapshot-invalidating mutations, continuous `requestPaint` inside `onpaint` — all anti-patterns.
4. **Don't fight `position: static`.** Canvas children can't be positioned. If you need a fixed overlay (nav, tooltip, modal) **keep it outside the canvas** and let the canvas draw the background beneath it.
5. **Don't assign a sync transform unless you need one.** If your drawn position already matches the element's DOM layout position, applying `getElementTransform` (even near-identity) can trigger unwanted containing-block semantics.
