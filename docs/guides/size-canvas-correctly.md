# Size the canvas correctly

Use this guide when drawn content looks blurry, scales wrong under browser zoom, or breaks on HiDPI displays.

## The two canvas sizes

Every `<canvas>` has two independent sizes:

| Size | Controlled by | Unit |
|------|--------------|------|
| **Element size** | CSS `width` / `height` (or `style.width`, `style.height`) | CSS pixels |
| **Backing store size** | HTML attributes `width` and `height`, or `canvas.width` / `canvas.height` | Integer pixels |

The browser scales backing store pixels to fit the element size. If the backing store is smaller than the element size, content is upscaled (blurry). If it's larger, content is downsampled (crisper but slower).

For sharp rendering, the **backing store must match device pixels**, not CSS pixels.

## The problem for HTML-in-Canvas

`drawElementImage` positions elements in **backing store coordinates**. If the backing store is CSS-pixel-sized and you draw at `(100, 0)`, the element appears 100 CSS pixels in. If the backing store is device-pixel-sized on a 2× display, drawing at `(100, 0)` means 50 CSS pixels in.

You need to either:

- Size the backing store to device pixels, and compute draw offsets in device pixels (recommended), or
- Size the backing store to CSS pixels and accept blur on HiDPI displays (fine for prototypes, bad for production).

## The correct pattern

Use a `ResizeObserver` with `box: 'device-pixel-content-box'`. This gives you the element's content size in **exact device pixels**, accounting for `devicePixelRatio`, page zoom, and system scaling.

```js
new ResizeObserver(([entry]) => {
  const box = entry.devicePixelContentBoxSize[0];
  canvas.width = box.inlineSize;
  canvas.height = box.blockSize;
  canvas.requestPaint();
}).observe(canvas, { box: 'device-pixel-content-box' });
```

Everything in the shipping `Examples/*.html` uses this pattern. It:

- Sizes the backing store to exact device pixels.
- Updates on zoom, DPR changes, and element resize.
- Triggers a repaint after resize (required — a resize alone doesn't fire `paint`).

## Why not just use `devicePixelRatio`?

The naive version is:

```js
// ❌ Don't do this for HTML-in-Canvas.
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
```

Problems:

- `clientWidth` rounds to CSS pixels, losing sub-pixel precision. Multiplying by `devicePixelRatio` and rounding again compounds the error.
- `devicePixelRatio` doesn't account for browser zoom on some platforms; at 110% zoom you may need more pixels.
- Fractional DPRs (1.25, 1.5, 1.75) are common and produce fractional backing store sizes — which must round, and picking the wrong rounding direction causes persistent subpixel misalignment.

`device-pixel-content-box` avoids all of this by letting the browser tell you the exact integer pixel count.

## Compensating in draw calls

With a device-pixel-sized backing store, coordinates in `drawElementImage` are device pixels. To place an element at a specific CSS-pixel offset:

```js
ctx.drawElementImage(el, xCSS * devicePixelRatio, yCSS * devicePixelRatio);
```

For transforms applied via `ctx.translate`, the same rule — multiply CSS-pixel offsets by `devicePixelRatio`:

```js
ctx.translate(80 * devicePixelRatio, -20 * devicePixelRatio);
```

The complex-text example uses exactly this pattern.

If you'd rather work in CSS pixels, you can set the CTM to `scale(devicePixelRatio, devicePixelRatio)` at the start of every `onpaint`:

```js
canvas.onpaint = () => {
  ctx.reset();
  ctx.scale(devicePixelRatio, devicePixelRatio);
  // Now you can pass CSS-pixel coordinates.
  ctx.drawElementImage(el, 100, 0);
  // ...
};
```

This is a taste decision. Either works; pick one per canvas.

## Handling `devicePixelRatio` changes

When the user drags the window between displays with different pixel densities, `devicePixelRatio` changes. The `ResizeObserver` above catches this (because `device-pixel-content-box` changes) — no extra listener needed.

If you're using the scale-to-CSS-pixels approach, be aware that `devicePixelRatio` at the time of the `scale` call may be different from when you computed positions earlier. Compute and apply the scale inside `onpaint` to always use the current value.

## When you don't need device pixels

If your canvas is never zoomed, never moved between displays, and quality doesn't matter (e.g., dev-only prototype), you can simply set `canvas.width` and `canvas.height` to CSS-pixel values and ignore DPR. Don't ship this, but it's fine to debug with.

## Avoid these sizing patterns

**CSS `width: auto`, backing store unset.** Canvas defaults to 300×150 CSS pixels and 300×150 backing store. On HiDPI, drawing is upscaled and blurry.

**CSS sizing only, no `width`/`height` attributes.** Same as above — backing store defaults to 300×150 regardless of CSS size.

**Backing store set once at page load.** Breaks on zoom, display change, responsive layouts.

**Backing store larger than needed.** Wastes GPU memory and bandwidth. Don't use `canvas.width = 4096` "for safety" — size to what the element is actually showing.

## Verification

Create a test page with:

```html
<canvas id="c" style="width: 200px; height: 100px;" layoutsubtree>
  <div id="d">Quality test</div>
</canvas>
<div style="font: 16px sans-serif;">Quality test</div>
```

Use the pattern above. Zoom the browser to 150%. The canvas text and the non-canvas text should be **equally crisp**. If the canvas text is blurry, your sizing is wrong.

## Checklist

- [ ] Canvas has explicit CSS size (via style or the `width`/`height` attributes' rendering).
- [ ] `ResizeObserver` with `{ box: 'device-pixel-content-box' }` is set up.
- [ ] Observer updates `canvas.width` and `canvas.height` from `devicePixelContentBoxSize[0]`.
- [ ] Observer calls `canvas.requestPaint()` after resize.
- [ ] Draw coordinates are multiplied by `devicePixelRatio` (or you use `ctx.scale(dpr, dpr)` at the start of `onpaint`).

## Related

- [guides/render-to-2d-canvas.md](render-to-2d-canvas.md) — where these sizing rules apply
- [MDN: ResizeObserverEntry.devicePixelContentBoxSize](https://developer.mozilla.org/docs/Web/API/ResizeObserverEntry/devicePixelContentBoxSize)
- [MDN: Window.devicePixelRatio](https://developer.mozilla.org/docs/Web/API/Window/devicePixelRatio)
