# The `layoutsubtree` attribute

The opt-in switch that transforms `<canvas>` children from fallback content into live, drawable DOM.

## What it is

A boolean HTML attribute on `HTMLCanvasElement`:

```html
<canvas layoutsubtree>...</canvas>
```

Setting it changes the canvas from the legacy model (children are invisible, used only as accessibility fallback) to the HTML-in-Canvas model (children are fully laid-out, hit-testable, and snapshottable).

## What problem it solves

Historically, `<canvas>` children were invisible and only surfaced to assistive technology. The browser never drew them, laid them out, or ran paint invalidations against them. That worked for the canvas-is-a-bitmap use case but made it impossible to layer real HTML into a canvas rendering.

`layoutsubtree` is the switch that flips a canvas from "bitmap + fallback" into "bitmap + live subtree". Opting in is required because the new model has costs: the browser now runs layout, hit testing, and paint snapshotting on children that used to be inert.

## What it does

Setting `layoutsubtree` on a `<canvas>` has four effects, each applied only to the **direct** children of the canvas:

| Effect | What it means |
|--------|--------------|
| Layout participation | Children lay out normally, as if they were ordinary block descendants. |
| Stacking context | Each direct child establishes its own stacking context, so z-index and blend operations are local. |
| Containing block | Each direct child is a containing block for all its descendants — `position: absolute` descendants are relative to the child, not the canvas or the page. |
| Paint containment | Overflow (layout and ink) is clipped to the child's border box. |

The children are **visible as far as the DOM is concerned**, but the browser **does not paint them to the screen**. Their pixels appear only where `drawElementImage()` (or the WebGL/WebGPU equivalent) puts them.

## Who counts as a "child"

Only **direct** element children of the canvas are drawable. Grandchildren are not eligible for `drawElementImage()` — they're painted as part of their parent's snapshot.

```html
<canvas layoutsubtree>
  <!-- ✅ draw this directly -->
  <div class="label">Hello</div>

  <!-- ✅ draw this directly -->
  <form>
    <!-- ❌ NOT directly drawable — painted as part of the form's snapshot -->
    <input>
  </form>
</canvas>
```

If you need to draw several elements independently, make each a direct child. If you need them to move together, wrap them in a shared direct-child container.

## Interactions with existing canvas features

**Fallback content.** With `layoutsubtree`, children are no longer fallback. They are live content. If the browser doesn't support canvas rendering at all, the children render normally (unchanged classic behaviour). If the browser supports canvas but not `layoutsubtree`, the attribute is ignored and children render as normal fallback.

**`getContext()`.** No change. 2D, WebGL, WebGL2, and WebGPU all work — each provides its own `*ElementImage*` API. `OffscreenCanvas` works via `captureElementImage()`.

**`captureStream()`.** Works. The canvas backing store includes the drawn elements. This enables media-export use cases.

**`toDataURL()` / `toBlob()` / `getImageData()`.** All work normally on the canvas backing store. However, reading pixels from a canvas into which cross-origin-tainted content was drawn is still origin-restricted — see [privacy model](privacy-model.md).

**Hit testing.** Children are hit-tested in their **DOM** position, not their drawn position. This is why [synchronization](synchronization.md) exists — you apply the returned transform to the DOM element to keep its hit-test box aligned with the drawn pixels.

## Requirements for `drawElementImage()` to succeed

The element passed to `drawElementImage()` (or its WebGL/WebGPU equivalent) must satisfy all of:

1. The canvas has `layoutsubtree` set in the **most recent rendering update**.
2. The element is a **direct child** of the canvas in the most recent rendering update.
3. The element has **generated boxes** (not `display: none`) in the most recent rendering update.
4. At least one `paint` event has fired since the element became eligible (an initial snapshot has been recorded).

If any requirement fails, `drawElementImage()` throws.

Requirement 4 is the reason for `requestPaint()` — on the very first frame, nothing has changed, so the browser wouldn't otherwise fire `paint`, and you'd have no way to draw the element.

## Removing and restoring `layoutsubtree`

Toggling the attribute is supported but not free. Removing it:

- Returns children to the classic fallback model on the next rendering update.
- Discards the recorded snapshots. Subsequent `drawElementImage()` calls throw until `layoutsubtree` is re-enabled and a new `paint` fires.

Unless you have a reason to dynamically opt in and out, set `layoutsubtree` declaratively in markup.

## Sizing and the canvas coordinate grid

`layoutsubtree` doesn't change the sizing model of the canvas itself. You still have two sizes:

- **Element size** — the CSS width/height of the `<canvas>` on the page.
- **Backing store size** — `canvas.width` and `canvas.height` attributes in integer pixels.

On HiDPI displays, the element size is typically smaller than the backing store size. `drawElementImage` positions elements in **backing store coordinates**, not CSS pixels.

Use a `ResizeObserver` with `device-pixel-content-box` to keep the backing store sized to exact device pixels and avoid blur:

```js
new ResizeObserver(([entry]) => {
  const box = entry.devicePixelContentBoxSize[0];
  canvas.width = box.inlineSize;
  canvas.height = box.blockSize;
}).observe(canvas, { box: 'device-pixel-content-box' });
```

See [guides/size-canvas-correctly.md](../guides/size-canvas-correctly.md) for the full story.

## Common gotchas

- **Forgetting the attribute.** `drawElementImage` throws if `layoutsubtree` wasn't set at the last rendering update. Browsers generally give a helpful error message; if you see "element is not a direct child of a layoutsubtree canvas", this is the likely cause.
- **Adding children after the first draw.** Works, but until a `paint` event fires for the new child, it can't be drawn. Call `requestPaint()` after adding children to schedule one.
- **Trying to draw a grandchild.** Doesn't work. Promote the element to a direct child of the canvas, or draw its parent.
- **Expecting to absolutely-position a canvas child (see below).** Canvas children are forced into static positioning. Use the workaround below.

## Direct children are forced to `position: static`

Observed in the Canary build behind `chrome://flags/#canvas-draw-element` (HTML-in-Canvas Enabled): **every direct child of a `<canvas layoutsubtree>` has its computed `position` forced to `static`**, regardless of what the CSS says. This is not explicit in the current explainer but is consistent with the "each child is its own containing block with paint containment" semantics.

What this breaks:

- `position: absolute` with `top`/`left`/etc. on a direct child → ignored.
- `position: fixed` on a direct child → ignored.
- Any layout pattern that relies on positioning a canvas child relative to the canvas (fixed navs, tooltips, overlays).

Verify in DevTools:

```js
const el = document.querySelector('canvas[layoutsubtree] > .your-child');
getComputedStyle(el).position;  // → "static" even if CSS says "absolute"
```

**Workaround — put the floating element outside the canvas.** If you need a fixed header, overlay, or tooltip that visually sits on top of canvas content, make it a sibling of the canvas (or a child of `document.body`) with `position: fixed` and a higher `z-index`. The canvas can still sample its single direct child; the overlay renders normally. Keyboard focus, accessibility, and pointer events all work as they would on any fixed DOM element.

```html
<div class="viewport">
  <canvas layoutsubtree style="position: fixed; inset: 0;">
    <div class="page">...the content you want to render...</div>
  </canvas>
  <nav class="overlay">
    <!-- position: fixed; z-index: 2; — lives OUTSIDE the canvas -->
  </nav>
</div>
```

See [`Examples/liquid-glass-nav/`](../../Examples/liquid-glass-nav/) for a working example of this pattern — a fixed nav bar that sits on top of a canvas rendering a scrolling article.

## Related

- [concepts/paint-event.md](paint-event.md) — when the browser snapshots and fires `paint`
- [concepts/synchronization.md](synchronization.md) — keeping the DOM box aligned with the drawn pixels
- [reference/api.md#htmlcanvaselement-layoutsubtree](../reference/api.md#htmlcanvaselementlayoutsubtree) — IDL reference
