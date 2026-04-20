# The `paint` event

The heartbeat of an HTML-in-Canvas page. Fires after the browser finishes painting, so your handler can re-draw the canvas with current-frame snapshots.

## What it is

A new event that fires on `<canvas>` elements with `layoutsubtree` set, integrated into the [HTML rendering update](https://html.spec.whatwg.org/#update-the-rendering). The handler runs after the browser has painted and snapshotted all canvas children.

```js
canvas.onpaint = (event) => {
  // event is a PaintEvent
  // event.changedElements lists which children triggered this paint
};
```

The event interface:

```idl
interface PaintEvent : Event {
  readonly attribute FrozenArray<Element> changedElements;
};
```

## Why it exists

Before `paint`, there was no frame-accurate hook that ran **after** layout and **after** the browser had snapshotted paint output. `requestAnimationFrame` runs *before* layout; `ResizeObserver` runs *after* layout but before paint. You couldn't call something like `drawElementImage` in either of those and reliably get the current frame's content.

`paint` is the hook that runs at exactly the right moment: snapshots exist, layout is finalized, the frame hasn't shipped yet. Canvas draw commands issued here land in the current frame.

## When it fires

The browser fires `paint` on a `layoutsubtree` canvas when:

1. The snapshot of at least one of the canvas's direct children has changed since the last `paint`.
2. `canvas.requestPaint()` was called since the last rendering update.

Notably:

- CSS transforms on children do **not** trigger `paint` — transforms are ignored for drawing, so a transform-only change produces an identical snapshot.
- Changing `canvas.width` or `canvas.height` (or the canvas's CSS size) is **not** guaranteed to trigger `paint` on its own. Clearing the backing store alone does not invalidate any child's snapshot. After a canvas resize, call `canvas.requestPaint()` explicitly — every example in the repo does this inside its `ResizeObserver` callback.
- If you need `paint` after a transform change (e.g., to redraw the canvas with the new transform applied via the canvas's own `ctx.transform`), call `requestPaint()`.

## Where in the frame lifecycle

Exact integration point in [update the rendering](https://html.spec.whatwg.org/#update-the-rendering):

```
14. Run animation frame callbacks.
15. Run the ResizeObserver loop.
16. Update intersection observations.
17. Paint. (snapshots of canvas children are recorded here)
18. Fire `paint` events. ◀── your onpaint runs here
19. Commit the frame.
```

This is "Option C" in the [original design discussion](../architecture/adr/001-paint-event-timing.md). Firing after step 17 guarantees:

- Snapshots are fully recorded and readable.
- No part of the frame has committed yet, so your canvas draws land in this frame.
- DOM changes you make are applied on the *next* rendering update, not this one. This avoids reentrancy loops.

## What you can and can't do in `onpaint`

**Do:**

- Read layout (getBoundingClientRect, offsetWidth, etc.) — layout is finalized.
- Call `drawElementImage`, `texElementImage2D`, `copyElementImageToTexture` — these land in the current frame.
- Issue arbitrary 2D/WebGL/WebGPU draw commands.
- Set `element.style.transform` to synchronize DOM with drawn position — reads of the new transform by hit testing, IntersectionObserver, and a11y happen from this frame onward.
- Call `requestPaint()` to ensure another `paint` fires next frame (useful for animation loops).

**Don't:**

- Expect DOM mutations (adding/removing elements, changing text content, changing non-transform styles) to be visible in the **current** frame. They'll appear in the next one.
- Call `drawElementImage` on an element that isn't a direct canvas child in the most recent rendering update. It throws.
- Rely on `paint` firing if nothing has changed — use `requestPaint()` if you need guaranteed ticking.

## Transform changes don't trigger `paint`

This is deliberate and worth understanding. When you do:

```js
const transform = ctx.drawElementImage(element, x, y);
element.style.transform = transform.toString();
```

...the transform assignment is a DOM write that would normally cause invalidation. But since CSS transforms are ignored for canvas rendering (see [ADR 002](../architecture/adr/002-ignore-css-transforms.md)), changing the transform does **not** change the snapshot, and therefore does **not** queue another `paint` event. This avoids an infinite loop.

If your page needs to redraw (e.g., the canvas's own transform matrix changed), call `requestPaint()` explicitly.

## `requestPaint()`

Analogous to `requestAnimationFrame`, but for the `paint` event specifically.

```js
canvas.requestPaint();
```

Effects:

- Marks the canvas as dirty for the next rendering update.
- Guarantees exactly one `paint` event will fire at the next update, even if no child has changed.
- Safe to call from anywhere (including inside `onpaint`, which is how you build a continuous animation loop).
- Calling it multiple times before a single update produces one `paint` event, not many.

Typical uses:

- **Initial paint.** The first frame has no snapshot changes yet, so `paint` wouldn't otherwise fire. Call `requestPaint()` after setting `onpaint`.
- **Animation loops.** From inside `onpaint`, call `requestPaint()` again to request another tick. Or use `requestAnimationFrame` + `requestPaint()` for finer control.
- **Resize reflow.** If the canvas's `width` or `height` changes, call `requestPaint()` so your handler re-renders at the new size.
- **Transform-only changes on the canvas context.** If your `onpaint` builds a transform from mouse input that otherwise didn't invalidate anything.

## `changedElements`

The `PaintEvent` carries an array of the children whose snapshots have changed:

```js
canvas.onpaint = (event) => {
  for (const el of event.changedElements) {
    console.log('changed:', el);
  }
};
```

Use this for targeted re-renders. In a chart with 20 labels, if only one label's text changed, `changedElements` contains just that one — you can skip redrawing the others if you retain the previous frame's content.

Notes:

- Can be empty. If `paint` was fired due to `requestPaint()` only, `changedElements` is empty.
- Contains elements, not `ElementImage` snapshots. Pass them to `drawElementImage` directly.
- Order is unspecified — don't rely on sort order.

## Rendering update loops and `paint`

If your `onpaint` handler mutates layout-affecting styles on DOM content **outside** the canvas (for example, changing `document.body.style.fontSize`), the spec allows implementations to loop the rendering update to produce a consistent frame. This is rare — most `onpaint` handlers only touch the canvas and `transform` on canvas children. But if you're doing it, budget for the possibility that your handler runs multiple times per displayed frame.

The simpler rule: treat `onpaint` as a draw-only hook. DOM mutations belong in event handlers or `requestAnimationFrame`.

## Related

- [concepts/layoutsubtree.md](layoutsubtree.md) — prerequisite for any `paint` event
- [concepts/synchronization.md](synchronization.md) — the transform-sync pattern that runs inside `onpaint`
- [architecture/adr/001-paint-event-timing.md](../architecture/adr/001-paint-event-timing.md) — why `paint` fires here and not elsewhere
- [reference/api.md#paintevent](../reference/api.md#paintevent) — IDL reference
