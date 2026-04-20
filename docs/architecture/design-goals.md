# Design goals

The constraints, priorities, and trade-offs that shape HTML-in-Canvas. If you're evaluating a proposed extension or an alternative approach, check it against these first.

## Primary goals

### 1. Enable rich HTML content inside canvas renderings

The feature exists to solve a concrete problem: complex text, styled content, form controls, images, and SVG are hard or impossible to render well inside `<canvas>` today. The primary goal is to eliminate that pain for chart libraries, creative tools, 3D scenes, and media-export use cases.

The API must support:

- Styled, laid-out text with bidi, complex scripts, emoji, vertical writing modes.
- Form controls that remain interactive (focus, keyboard, IME).
- Inline images and SVG.
- Composition with arbitrary 2D canvas drawing, WebGL shaders, and WebGPU pipelines.

### 2. Preserve accessibility and semantics

Canvas has historically been an accessibility dead zone. Opt-in canvases must have **better** accessibility than the status quo, not worse:

- Children drawn into canvas are live DOM — they appear in the accessibility tree naturally.
- Fallback content is no longer a parallel description authors must remember to keep in sync — the drawn content **is** the accessible content.
- Focus, hit testing, and assistive-tech interaction work without explicit author code beyond `element.style.transform` sync.

### 3. No new security exposure

`drawElementImage` and adjacent APIs must not reveal anything to author JavaScript that isn't already observable. The hard requirement is:

- No cross-origin image reads via canvas pixel extraction.
- No OS fingerprinting via themes or system colors.
- No leakage of private browser state (visited links, autofill previews, spelling markers).
- No side channels through `paint`-event timing or invalidation.

See [concepts/privacy-model.md](../concepts/privacy-model.md) for the enforcement details.

### 4. Minimize new privacy exposure

Beyond security, privacy leakage is minimized. A small number of new signals (caret blink rate, form-control native chrome, find-in-page markers) are accepted as necessary for interactivity; each was judged individually and the set is explicitly frozen.

### 5. Work across 2D, WebGL, and WebGPU

The same core concept — element images — is usable in all three rendering contexts. Each context gets a context-appropriate method (`drawElementImage`, `texElementImage2D`, `copyElementImageToTexture`), but the underlying snapshot is the same and the invalidation event (`paint`) is shared.

### 6. Support worker-thread rendering via `OffscreenCanvas`

Workers can't see the DOM, so the snapshot mechanism must be transferable. `ElementImage` provides this — captured on the main thread, transferred to a worker, drawn into an `OffscreenCanvas`.

## Non-goals

### Not a full-fidelity screenshot tool

`drawElementImage` is privacy-filtered and invalidation-driven. It can't sample cross-origin iframes or visited-link styles. If you need to capture a full page verbatim for export to PDF or archival, use a server-side renderer or `html2canvas` — this API is a poor fit.

### Not a replacement for overlaying HTML on canvas

Absolutely-positioning an HTML subtree above a WebGL canvas is still the right tool when you need the HTML in front of the canvas, don't need it as a shader input, and don't need it composited into a 3D scene. This API is for the cases where overlays don't work.

### Not a transform-reactive rendering system

If you want the browser to re-render with a new transform and feed that into your shader, that's a different API. `drawElementImage` treats CSS transforms on the source element as author-controlled sync metadata, ignored for the draw itself.

### Not shipped in stable browsers

The API is in dev trial. Not for production use. Spec, IDL, and behaviour may change.

## Non-negotiable constraints

| Constraint | Why |
|------------|-----|
| Children must be direct DOM children | Makes the "what's drawable" story clear and implementable |
| Paint event fires after the browser Paint step | Ensures snapshots are fully recorded and draw commands land in the current frame |
| CSS transforms on children ignored for drawing | Prevents feedback loops between sync and draw |
| `ElementImage` is Transferable | Enables worker-thread `OffscreenCanvas` without copying pixels |
| Layout containment on children (stacking context, containing block, paint containment) | Bounds the snapshot region and prevents overflow leaks |

## Trade-offs we accepted

### One `paint` per frame, not real-time

`paint` fires on the frame's rendering update, not synchronously with every DOM change. Pages that need continuous animation must call `requestPaint()` to keep the loop going. This is the price of frame-accurate, consistent snapshots.

### No threaded effects yet

Canvas re-raster following threaded scroll or animation isn't supported in v1. Current worker-based patterns require JavaScript on the main thread to capture the snapshot. [ADR 003](adr/003-threaded-effects.md) covers the explored alternative and what's deferred to a future version.

### Extra author work for synchronization

Applying `element.style.transform = returned_matrix.toString()` is boilerplate. We chose to expose the mechanism to authors rather than auto-applying it, because (a) authors may want custom sync (e.g., skip for `inert` content) and (b) auto-applying would introduce timing questions (before or after `onpaint`?).

### Some platform info leaks for interactivity

Caret blink rate, form-control appearance, and `forced-colors` palette are new exposures. Each was judged acceptable for the interactivity gains; the alternative (drawing placeholder boxes for form controls) would make the feature useless for interactive canvas content.

## Open design questions

### Threaded effects ("auto-updating canvas")

Future work. Goal: canvas re-rasters in sync with threaded scrolling and animations, without blocking on main-thread script. Viable for 2D, plausible for WebGPU. See [ADR 003](adr/003-threaded-effects.md).

### Exact excluded-region rendering

The spec is flexible about what excluded (cross-origin, autofill, etc.) regions look like in snapshots. Implementations may use transparent, a neutral fill, or a pattern. Converging on a single behaviour is a future task.

### Paint-event batching semantics

If many canvases all need `paint`, the current spec fires them all in one rendering update. Whether rendering updates can loop to reach a stable point (analogous to `ResizeObserver`) is an implementation latitude question still under discussion.

## Related

- [architecture/adr/001-paint-event-timing.md](adr/001-paint-event-timing.md)
- [architecture/adr/002-ignore-css-transforms.md](adr/002-ignore-css-transforms.md)
- [architecture/adr/003-threaded-effects.md](adr/003-threaded-effects.md)
- [concepts/privacy-model.md](../concepts/privacy-model.md)
- [../security-privacy-questionnaire.md](../../security-privacy-questionnaire.md)
