# Synchronization: keeping DOM and canvas aligned

The single most common source of subtle bugs: the element is drawn in one place, but hit testing, focus rings, and assistive tech still think it's somewhere else. Here's what to do about it.

## The problem in one sentence

`drawElementImage` moves an element's **pixels** into the canvas, but the element's **DOM box** — the rectangle the browser uses for hit testing, focus rings, IntersectionObserver, scroll, and accessibility — stays wherever normal CSS layout put it.

If you draw a form at `(100, 50)` in the canvas but its DOM box is still at `(0, 0)`, clicking on the drawn form misses. Focus rings surround empty space. Screen readers announce an invisible form.

## The solution in one sentence

`drawElementImage` returns a `DOMMatrix`. Assign `element.style.transform = matrix.toString()` and the DOM box moves to match the drawn pixels.

## Minimum viable pattern

```js
canvas.onpaint = () => {
  const transform = ctx.drawElementImage(element, x, y);
  element.style.transform = transform.toString();
};
```

Two lines. That's it, for the common case.

## Why the returned transform is non-obvious

If you're drawing at `(x, y)` in canvas coordinates with no rotation and no scaling, you might expect the returned transform to be a simple `translate(x, y)`. It isn't, because of three confounders:

1. **Canvas coordinates are in device pixels; CSS transforms apply in CSS pixels.** On an HiDPI display with `devicePixelRatio = 2`, drawing at canvas `(100, 0)` corresponds to CSS `(50, 0)` on screen.
2. **The element's `transform-origin` shifts how `translate` is interpreted.** The returned matrix compensates.
3. **The context's current transformation matrix (CTM) — rotations, scales, skews you've applied via `ctx.rotate()` etc. — all contribute.** The returned matrix is the composite.

The full formula the browser uses internally is:

```
T_origin⁻¹ · S_cssToGrid⁻¹ · T_draw · S_cssToGrid · T_origin
```

where:

- `T_draw` = the effective draw transform — for `drawElementImage`, `CTM · translate(dx, dy) · scale(destScale)`.
- `T_origin` = translation by the element's computed `transform-origin`.
- `S_cssToGrid` = scale from CSS pixels to canvas grid pixels (roughly `devicePixelRatio` unless the canvas is stretched).

You almost never need to compute this yourself. `drawElementImage` returns the result. But if you're drawing into WebGL/WebGPU and building your own matrix, `canvas.getElementTransform(element, drawTransform)` does the same composition for you.

## `getElementTransform()` for 3D contexts

3D APIs take a general `DOMMatrix` for the draw transform rather than positional arguments, so the helper exists:

```idl
DOMMatrix getElementTransform(
  (Element or ElementImage) element,
  DOMMatrix drawTransform
);
```

Exposed on both `HTMLCanvasElement` and `OffscreenCanvas`.

Pass the transform you used to draw the element (in canvas grid coordinates — typically a composition of projection, view, model, etc. flattened to 2D), and the method returns the CSS transform that keeps the DOM box aligned.

Example from the WebGL demo pattern:

```js
// You've drawn `element` into the canvas using a 3D projection.
// `drawMatrix` is a 4×4 reduced to a 2D-projected DOMMatrix for the element's plane.
const cssTransform = canvas.getElementTransform(element, drawMatrix);
element.style.transform = cssTransform.toString();
```

For the 3D cube case (where the element appears on one face), you compute the 2D projection of the face's screen-space rectangle and pass that. Exact projection math depends on your scene.

## Worker-thread synchronization

When the canvas is controlled by a Worker via `OffscreenCanvas`, the sync flow adds one hop:

```
Main thread                  Worker thread
────────────                 ─────────────
onpaint fires
captureElementImage(form)
postMessage(snap, [snap])  ──→
                               drawElementImage(snap, x, y)
                               returns DOMMatrix
                         ←──  postMessage({transform})
form.style.transform =
  data.transform.toString()
```

Two key points:

1. The worker's `drawElementImage` still returns a `DOMMatrix` — the math is the same.
2. You have to `postMessage` the transform back to the main thread and apply it there. The worker has no DOM.

If the element's position is static (always drawn at a fixed offset), the main thread can pre-compute and apply the transform itself, and the worker doesn't need to postMessage it back. See [guides/use-offscreencanvas.md](../guides/use-offscreencanvas.md).

## What the transform actually affects

Applying the returned transform affects, in priority order:

| Affected | Notes |
|----------|-------|
| Hit testing (click, pointer, touch) | Fires against the transformed DOM box |
| Focus rings | Drawn around the transformed box (or use `ctx.drawFocusIfNeeded`) |
| Accessibility tree position | Announced as the transformed location |
| IntersectionObserver | Reports intersections of the transformed box |
| Scroll-into-view | Scrolls to the transformed box |
| CSS `:hover` | Triggered when the cursor is over the transformed box |

What it does **not** affect:

- The snapshot passed to `drawElementImage` — transforms are [ignored for drawing](../architecture/adr/002-ignore-css-transforms.md).
- `getBoundingClientRect()` — this *does* see the transform (standard CSS behaviour).
- The layout of siblings — CSS transform doesn't affect flow layout.

## Focus rings

Canvas already has `ctx.drawFocusIfNeeded(path, element)` for drawing a focus ring at a canvas path. With `layoutsubtree`, you can use the same API against a `Path2D` describing the element's drawn location. The pie chart demo does exactly this:

```js
if (document.activeElement === label) {
  focusedPath = path; // a Path2D matching the drawn wedge
}
// ... after all drawing ...
if (focusedPath) {
  ctx.drawFocusIfNeeded(focusedPath, document.activeElement);
}
```

## Common mistakes

- **Not calling `toString()`.** `element.style.transform` needs a string. A raw `DOMMatrix` assigns as `"[object DOMMatrix]"` in older implementations and fails silently in newer ones.
- **Applying the transform to the wrong element.** The transform returned by `drawElementImage(X, ...)` is for `X`. Applying it to `X`'s parent or child shifts the wrong thing.
- **Forgetting to update the transform when the draw position changes.** If your draw position depends on scroll, pointer, or animation, assigning `transform` once at setup is not enough — reassign every `onpaint`.
- **Combining your own transform with the returned one.** If you want to chain effects (the DOM box should have both the canvas-sync transform *and* a `rotate(5deg)`), compose them:

  ```js
  const sync = ctx.drawElementImage(el, x, y);
  el.style.transform = sync.toString() + ' rotate(5deg)';
  // or: el.style.transform = new DOMMatrix(sync).rotateSelf(5).toString();
  ```

  Note: the additional transform affects hit testing but not drawing.

## Applying a near-identity sync transform has side effects

Assigning *any* non-`none` value to `style.transform` on an element — including a matrix that is visually indistinguishable from the identity, such as `matrix(1, 0, 0, 1, 6e-6, 9e-6)` — turns that element into a **containing block for its absolute- and fixed-positioned descendants**. This is standard CSS behaviour, not specific to HTML-in-Canvas, but it bites hard here because `getElementTransform` often returns near-identity matrices in simple cases.

What can go wrong:

- A descendant with `left: 50%` was resolving relative to one ancestor; after the sync, it resolves against this element instead. If the element's layout width differs from the original ancestor's, the descendant's position jumps.
- Stacking context changes — descendants with `z-index` might re-layer.
- Fixed-position descendants can snap to the sync'd element's box rather than the viewport.

We hit this building the liquid-glass-nav demo: applying `pageEl.style.transform = pageSync.toString()` (near-identity) caused a sibling nav's `left: 50%` positioning to shift from `viewport/2` to `0`.

**When to skip the sync assignment:**

- Your drawn position already matches the element's CSS layout position (no CTM, drew at `(0, 0)`, no scroll offset).
- The element is `inert` or otherwise non-interactive — no hit testing to align.
- You manage positioning via canvas coordinates and have no absolute/fixed descendants.

**When to keep the sync:**

- Whenever users interact with the drawn content and the drawn position differs from the CSS layout position.
- Don't skip it for interactive elements just because the matrix looks like identity — the subpixel offset is often the correct answer.

## When you can skip sync

If the element is `inert` (not focusable, not interactive, not read by AT), and you don't care about pointer events on it, you can skip the transform assignment. The WebGL cube demo does this:

```html
<div id="draw_element" inert>
  ... content we only want to render, not interact with ...
</div>
```

This is rare. Most content that's worth drawing is content you want to interact with — that's the whole reason `layoutsubtree` exists. Default to syncing unless you have a reason not to.

## Related

- [concepts/layoutsubtree.md](layoutsubtree.md) — why the DOM box exists independently of drawn pixels
- [concepts/paint-event.md](paint-event.md) — where the sync pattern runs
- [architecture/adr/002-ignore-css-transforms.md](../architecture/adr/002-ignore-css-transforms.md) — why transforms don't feed back into drawing
- [reference/api.md](../reference/api.md#htmlcanvaselementgetelementtransform) — IDL for the 3D helper
