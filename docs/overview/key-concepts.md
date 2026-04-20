# Key Concepts

Every term used in the HTML-in-Canvas docs, defined to stand alone. Scan this page once and the rest of the docs will read smoothly.

---

**Canvas child** — A direct DOM child of a `<canvas>` that has `layoutsubtree` set. Only direct children are eligible to be drawn via `drawElementImage()`; grandchildren can only be drawn as part of their parent element. Example: in `<canvas layoutsubtree><div>...</div></canvas>`, the `<div>` is a canvas child.

**Canvas coordinates** — The integer pixel grid of the canvas backing store. Distinct from CSS pixels — a `300×150` CSS canvas with `devicePixelRatio=2` has a `600×300` canvas coordinate grid. `drawElementImage()` positions elements in canvas coordinates, not CSS pixels.

**Current Transformation Matrix (CTM)** — The 2D affine transform currently applied to a 2D canvas context, accumulated from calls to `translate()`, `rotate()`, `scale()`, `transform()`, and `setTransform()`. Applied to the destination rect when `drawElementImage()` draws.

**Developer trial (dev trial)** — The current release stage of the API: behind `chrome://flags/#canvas-draw-element` in Chromium Canary. Behaviour and IDL may change. Not shipping in any stable channel.

**`drawElementImage()`** — The 2D canvas method that samples a canvas child (or an `ElementImage`) into the canvas backing store and returns a CSS transform matrix. Name pattern: `drawElementImage(element, dx, dy)` or with explicit size/source rect. See [reference/api.md](../reference/api.md#drawelementimage).

**Element image** — A paint-ready snapshot of an element's rendering, as recorded by the browser just before the `paint` event. The thing that actually gets drawn when you call `drawElementImage()`.

**`ElementImage`** — The transferable interface that wraps an element image and can be `postMessage()`'d to a worker for use in `OffscreenCanvas`. Produced by `HTMLCanvasElement.captureElementImage(element)`.

**Fallback content** — Historically, content inside `<canvas>` used by assistive technology when canvas painting is opaque to the AT. With `layoutsubtree`, children are **live** content — they participate in layout and are first-class DOM nodes — not just fallback. This is a significant departure from the classic canvas model.

**Hit testing** — The browser process that determines which element a user-input event (click, pointer, touch) targets. Under `layoutsubtree`, hit testing uses the element's **DOM** position (after any CSS transforms), not its drawn position — which is why [synchronization](../concepts/synchronization.md) matters.

**`layoutsubtree`** — The boolean HTML attribute that opts a `<canvas>` into the HTML-in-Canvas model. Setting it makes direct children participate in layout, establishes a stacking context and containing block on each child, and applies paint containment. See [concepts/layoutsubtree.md](../concepts/layoutsubtree.md).

**`OffscreenCanvas`** — The existing Web Platform interface for a canvas that isn't tied to a `<canvas>` element and can be transferred to a Worker. HTML-in-Canvas extends `OffscreenCanvas` via `ElementImage` so workers can draw live DOM.

**`paint` event** — The new event on `<canvas>` that fires during the rendering update when any canvas child's snapshot has changed (or when `requestPaint()` was called). Your `onpaint` handler runs canvas drawing commands that will appear in the current frame. DOM mutations in this handler apply to the **next** frame.

**`PaintEvent`** — The event interface delivered to `onpaint`. Exposes `changedElements`, a `FrozenArray<Element>` of the canvas children whose snapshots triggered the event.

**Paint containment** — The CSS containment value applied to `layoutsubtree` canvas children. It guarantees that overflow is clipped to the element's border box and that the element is its own stacking context and containing block. Prevents descendants from leaking paint outside the snapshot rect.

**Paint order** — The CSS-defined order in which elements are painted when a browser renders the rendering tree. See [CSS Position 4 § Painting Order](https://drafts.csswg.org/css-position-4/#painting-order). `drawElementImage()` honours paint order within a drawn element's subtree.

**Rendering update** — The per-frame sequence defined in the [HTML Standard § update the rendering](https://html.spec.whatwg.org/#update-the-rendering). The `paint` event is integrated into this sequence — specifically, immediately after the browser's Paint step.

**`requestPaint()`** — A method on `<canvas>` that causes the `paint` event to fire exactly once on the next rendering update, even if no canvas child has changed. Analogous to `requestAnimationFrame()`. Required after resizes or transform-only changes, since those don't trigger `paint` automatically.

**Snapshot** — Informal term for an element image. A byte-for-byte capture of what the element would have painted, recorded just before the `paint` event fires.

**Sync (synchronization)** — The practice of applying `element.style.transform = returned_matrix.toString()` after calling `drawElementImage()`, so that the DOM position of the element matches its drawn position. Required for hit testing, focus rings, and assistive tech to line up with what the user sees. See [concepts/synchronization.md](../concepts/synchronization.md).

**`texElementImage2D()`** — The WebGL equivalent of `drawElementImage()`. Copies the element image into the currently bound 2D texture. Six overloads (see [reference/api.md](../reference/api.md#texelementimage2d)). WebGL 1 and WebGL 2.

**`copyElementImageToTexture()`** — The WebGPU equivalent: copies an element image into a `GPUTexture` via `GPUQueue`.

**Update the rendering** — See **rendering update**.

**WICG** — Web Incubator Community Group. The W3C community where early web platform proposals are developed. This project lives at [github.com/WICG/html-in-canvas](https://github.com/WICG/html-in-canvas).
