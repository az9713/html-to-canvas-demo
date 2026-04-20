# Common issues

The failures developers actually hit, in rough order of frequency. Each issue has a symptom (as you'd notice it), a cause, a fix, and an escalation path if the fix doesn't work.

---

## Nothing is drawn on the canvas

**Cause:** Most often, one of: (a) `layoutsubtree` isn't set, (b) you forgot to call `canvas.requestPaint()` on first load, or (c) `onpaint` isn't assigned before `requestPaint()` fires.

**Fix:**

1. Verify the attribute in HTML: `<canvas layoutsubtree>`. The attribute is boolean — its mere presence enables it.
2. Verify the handler is set before the first paint opportunity:

   ```js
   canvas.onpaint = (event) => { /* ... */ };
   canvas.requestPaint();
   ```

3. Verify the flag is actually on: `'onpaint' in HTMLCanvasElement.prototype` should be `true`. If not, `chrome://flags/#canvas-draw-element` didn't activate.

**If that doesn't work:** Add `console.log` inside `onpaint`. If it never fires, `requestPaint` isn't reaching it — possibly due to a different canvas being observed (wrong `document.getElementById`) or the handler being attached to a replaced DOM node.

---

## `drawElementImage` throws `InvalidStateError`

**Cause:** One of the four preconditions failed:

| Precondition | Check |
|--------------|-------|
| `layoutsubtree` was set at the last rendering update | Inspect the canvas element's attributes |
| The element is a direct child of the canvas | Check the DOM tree — grandchildren don't count |
| The element has generated boxes (not `display: none`) | Inspect computed styles |
| A `paint` event has fired for this element at least once | Did you call `requestPaint()` on initial load? |

**Fix:** Work through the table. The most common issue is the fourth — new elements added dynamically don't have snapshots yet. After adding an element, call `canvas.requestPaint()` and wait for the event before calling `drawElementImage` on it.

**If that doesn't work:** The error message typically names which precondition failed. Paste it into an issue with a minimal reproduction.

---

## Drawn content is blurry

**Cause:** Canvas backing store is sized in CSS pixels on an HiDPI display.

**Fix:** Use `ResizeObserver` with `device-pixel-content-box` — see [size-canvas-correctly](../guides/size-canvas-correctly.md):

```js
new ResizeObserver(([entry]) => {
  const box = entry.devicePixelContentBoxSize[0];
  canvas.width = box.inlineSize;
  canvas.height = box.blockSize;
  canvas.requestPaint();
}).observe(canvas, { box: 'device-pixel-content-box' });
```

Also multiply your draw offsets by `devicePixelRatio`:

```js
ctx.translate(80 * devicePixelRatio, -20 * devicePixelRatio);
```

Or use `ctx.scale(devicePixelRatio, devicePixelRatio)` at the start of `onpaint` to work in CSS-pixel coordinates.

**If that doesn't work:** Zoom to 100%. Some browser zoom levels (especially fractional ones) interact with DPR in ways that fractional rounding in the backing store can't fully hide. If 100% zoom is crisp but 110% is blurry, this is a browser rendering artifact, not your code.

---

## Clicking on the drawn element doesn't focus it

**Cause:** You forgot the synchronization step. The element's DOM box is at its layout position, but the pixels are at the drawn position, so click hit testing misses.

**Fix:** Assign the returned transform to the element:

```js
const transform = ctx.drawElementImage(form, 100, 50);
form.style.transform = transform.toString();  // ← this line
```

Don't forget `.toString()` — a raw `DOMMatrix` serializes inconsistently.

**If that doesn't work:** Verify the transform is non-null. If `drawElementImage` throws or the element isn't actually drawn, no transform is returned and hit testing falls through to the DOM layout position (which is where it would be without any of this).

---

## Element appears drawn but blinking cursor / focus ring appears somewhere else

**Cause:** Partial sync. You applied the transform once but haven't re-applied it on subsequent `onpaint` events. If the draw position changes each frame (scroll, animation, user input), the DOM box falls out of sync.

**Fix:** Apply the transform **every** paint, not just once:

```js
canvas.onpaint = () => {
  ctx.reset();
  const t = ctx.drawElementImage(form, computeX(), computeY());
  form.style.transform = t.toString();
};
```

---

## Hit testing drifts over time (element "walks" across the screen)

**Cause:** You're applying CSS transforms to the element that then feed back into the calculation. This should not happen with the current spec (transforms are ignored for drawing), but can occur if you're computing your own draw offset from `getBoundingClientRect()`, which *does* include the transform.

**Fix:** Derive draw positions from unchanged sources (data model, layout position before any transform, computed angles, etc.). Don't use `getBoundingClientRect` or `offsetLeft` on an element whose transform you're currently modifying.

---

## `paint` event fires continuously and destroys performance

**Cause:** Your `onpaint` handler is mutating DOM in a way that invalidates a snapshot, triggering another `paint`, in a loop.

**Fix:** `onpaint` should be draw-only in most cases. Limit DOM mutation to:

- `element.style.transform` on canvas children (ignored for drawing, safe).
- Reading layout (safe).

If you need to mutate DOM based on paint output, move that logic to an event handler (click, input, etc.) rather than `onpaint`. Or use `requestAnimationFrame` + explicit `requestPaint()` to control the cadence.

**If that doesn't work:** Open DevTools Performance, profile a few seconds, and check which specific mutation is invalidating the snapshot. Most often it's an unexpected style or class change that propagates into a child of the canvas.

---

## `changedElements` is always empty

**Cause:** You're calling `requestPaint()` to trigger the event, but the trigger for `requestPaint()`-initiated paints is empty — there were no actual snapshot changes to report.

**Fix:** This is expected behavior. If you need to know whether this frame has real changes vs. a manual `requestPaint`, check `event.changedElements.length > 0`.

---

## `texElementImage2D` works but output is upside-down

**Cause:** WebGL's texture origin is bottom-left; HTML's origin is top-left.

**Fix:** Before `texElementImage2D`:

```js
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
```

`pixelStorei` state is sticky — set it once before the first upload and it persists across subsequent uploads in the same context until you change it.

---

## Text in WebGL is blurry or illegible at small sizes

**Cause:** Mipmap filtering destroys text. The first downsample tier is already too blurry for readable text.

**Fix:** Use `LINEAR` filtering explicitly — no mipmaps:

```js
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
```

**If that doesn't work:** Render the source element at a smaller size rather than downscaling in the shader. Draw at 0.5× CSS pixels (via CSS `zoom`, `transform: scale`, or `font-size`) and sample 1:1.

---

## Cross-origin content (image, iframe) doesn't appear in the snapshot

**Cause:** Working as designed. Cross-origin content is excluded from snapshots to prevent pixel-readback of restricted data. See [privacy model](../concepts/privacy-model.md).

**Fix:** Serve the resource with a CORS header (`Access-Control-Allow-Origin: *` or matching) and set `crossorigin="anonymous"` on the `<img>` or `<video>`. Same-origin content works unconditionally.

**If that doesn't work:** Check that the CORS response headers actually arrive (Network tab). If they do and the content still doesn't paint, file a bug with a minimal reproduction.

---

## Memory keeps growing when using `OffscreenCanvas` in a worker

**Cause:** You're transferring `ElementImage` snapshots to the worker but not calling `snap.close()` after use. The pixel data stays alive.

**Fix:** Inside the worker, close each snapshot after drawing:

```js
self.onmessage = (e) => {
  ctx.drawElementImage(e.data.snap, 100, 0);
  e.data.snap.close();  // ← free the snapshot
};
```

---

## `canvas.captureElementImage` returns but `postMessage` throws

**Cause:** You forgot the transfer list. `ElementImage` is `Transferable`, not `Cloneable` — it must be transferred, not cloned.

**Fix:**

```js
worker.postMessage({ snap }, [snap]);  // ✓ transfer
// worker.postMessage({ snap });  // ✗ throws
```

---

## Interactive form elements drawn into canvas don't respond to keyboard

**Cause:** Either the element is `inert`, or it isn't focused (clicks aren't hitting it due to missing sync).

**Fix:** Check that the element doesn't have `inert` set. Then verify the click-to-focus issue — see [clicking on the drawn element doesn't focus it](#clicking-on-the-drawn-element-doesnt-focus-it).

---

## My change to the source element doesn't appear in the canvas

**Cause:** The source element is a grandchild of the canvas rather than a direct child. Direct children are drawable via `drawElementImage`; grandchildren are baked into their parent's snapshot and invalidated along with the parent.

**Fix:** Promote the element to be a direct child of the `<canvas>`, or accept that it redraws only when its containing parent changes.

---

## I can't find the flag in `chrome://flags`

**Cause:** Old Canary build, or using a Chromium channel that doesn't include this flag.

**Fix:** Update Chromium Canary to a recent build. The flag ships in current Canary; older or non-Canary builds may not include it.

**If that doesn't work:** Verify with `'onpaint' in HTMLCanvasElement.prototype` in DevTools. If `false`, the implementation isn't present in your build regardless of the flag state.

---

## Still stuck?

File a bug or design issue at [github.com/WICG/html-in-canvas/issues](https://github.com/WICG/html-in-canvas/issues/new). Include:

- Chrome Canary version (`chrome://version`)
- Minimal reproduction (an HTML file under ~30 lines is ideal)
- What you expected vs. what happened
- Any console errors

The working group actively triages issues.

## Related

- [getting-started/quickstart.md](../getting-started/quickstart.md) — verify the basic case works first
- [guides/size-canvas-correctly.md](../guides/size-canvas-correctly.md) — sizing-related blur
- [concepts/privacy-model.md](../concepts/privacy-model.md) — why some content doesn't paint
- [concepts/synchronization.md](../concepts/synchronization.md) — the sync pattern and its math
