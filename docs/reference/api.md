# API reference

Complete reference for every interface, method, attribute, and event introduced by HTML-in-Canvas. All signatures match the current IDL; see [reference/idl.md](idl.md) for the raw WebIDL.

## Table of contents

- [`HTMLCanvasElement.layoutSubtree`](#htmlcanvaselementlayoutsubtree)
- [`HTMLCanvasElement.onpaint`](#htmlcanvaselementonpaint)
- [`HTMLCanvasElement.requestPaint()`](#htmlcanvaselementrequestpaint)
- [`HTMLCanvasElement.captureElementImage()`](#htmlcanvaselementcaptureelementimage)
- [`HTMLCanvasElement.getElementTransform()`](#htmlcanvaselementgetelementtransform)
- [`OffscreenCanvas.getElementTransform()`](#offscreencanvasgetelementtransform)
- [`CanvasRenderingContext2D.drawElementImage()`](#drawelementimage)
- [`OffscreenCanvasRenderingContext2D.drawElementImage()`](#drawelementimage)
- [`WebGLRenderingContext.texElementImage2D()`](#texelementimage2d)
- [`GPUQueue.copyElementImageToTexture()`](#copyelementimagetotexture)
- [`PaintEvent`](#paintevent)
- [`ElementImage`](#elementimage)

---

## HTMLCanvasElement.layoutSubtree

HTML attribute `layoutsubtree` / IDL property `layoutSubtree`. Opts the canvas into the HTML-in-Canvas model.

| Field | Value |
|-------|-------|
| Type | `boolean` |
| Default | `false` |
| Reflects | HTML attribute `layoutsubtree` |

When `true`, direct children of the canvas are laid out, participate in hit testing and accessibility, and are snapshottable for drawing into the canvas. See [concepts/layoutsubtree.md](../concepts/layoutsubtree.md).

**HTML:**

```html
<canvas layoutsubtree>...</canvas>
```

**IDL:**

```idl
[CEReactions, Reflect] attribute boolean layoutSubtree;
```

**JS:**

```js
canvas.layoutSubtree = true;
canvas.layoutSubtree;  // → true
```

---

## HTMLCanvasElement.onpaint

Event handler property for the [`paint` event](#paintevent).

| Field | Value |
|-------|-------|
| Type | `EventHandler` |
| Default | `null` |
| Event fired | `PaintEvent` |

Assign a function to receive `paint` events. See [concepts/paint-event.md](../concepts/paint-event.md).

```js
canvas.onpaint = (event) => { /* ... */ };
```

Equivalent:

```js
canvas.addEventListener('paint', (event) => { /* ... */ });
```

---

## HTMLCanvasElement.requestPaint()

Requests that a `paint` event fire on this canvas at the next rendering update.

| Field | Value |
|-------|-------|
| Returns | `void` |
| Throws | Never |

```js
canvas.requestPaint();
```

**Behaviour:**

- Exactly one `paint` event fires next update, even if no child has changed.
- Multiple calls before the next update are coalesced into one event.
- Safe to call from any context, including inside `onpaint`.

**Common uses:**

- Kick the first paint on initial page load.
- Continuous animation loops from inside `onpaint`.
- Force a redraw after the canvas is resized or the context transform changes.

---

## HTMLCanvasElement.captureElementImage()

Records a snapshot of a direct child's current paint as an `ElementImage` suitable for transfer to a worker.

| Parameter | Type | Description |
|-----------|------|-------------|
| `element` | `Element` | A direct child of this canvas |

| Returns | `ElementImage` |
|---------|-----------------|

**Throws** a `DOMException` when:

- `element` is not a direct child of this canvas.
- The canvas did not have `layoutsubtree` set in the most recent rendering update.
- No snapshot has been recorded yet for `element`.

The exact `DOMException.name` is not fixed by the current explainer; `InvalidStateError` is the likely choice. Treat any rejected call as "preconditions not met — see [concepts/layoutsubtree.md](../concepts/layoutsubtree.md)".

```js
const snap = canvas.captureElementImage(form);
worker.postMessage({ snap }, [snap]);
```

See [concepts/element-images.md](../concepts/element-images.md).

---

## HTMLCanvasElement.getElementTransform()

Computes the CSS transform that aligns `element`'s DOM box with a given draw transform. Useful for WebGL/WebGPU contexts where the draw transform is not positional.

| Parameter | Type | Description |
|-----------|------|-------------|
| `element` | `Element or ElementImage` | The element whose transform to compute |
| `drawTransform` | `DOMMatrix` | The transform used to draw the element in canvas grid coordinates |

| Returns | `DOMMatrix` — CSS transform to apply |
|---------|---------------------------------------|

```js
const css = canvas.getElementTransform(element, drawMatrix);
element.style.transform = css.toString();
```

See [concepts/synchronization.md](../concepts/synchronization.md) for the formula.

---

## OffscreenCanvas.getElementTransform()

Same semantics as [`HTMLCanvasElement.getElementTransform()`](#htmlcanvaselementgetelementtransform), but available on worker-side `OffscreenCanvas`. The `element` argument is typically an `ElementImage` since workers have no DOM.

```js
// Inside a worker
const css = offscreenCanvas.getElementTransform(snap, drawMatrix);
self.postMessage({ transform: css });
```

---

## drawElementImage

Available on `CanvasRenderingContext2D` and `OffscreenCanvasRenderingContext2D` via the `CanvasDrawElementImage` mixin. Four overloads:

### `drawElementImage(element, dx, dy)`

Draw at natural size.

| Parameter | Type | Description |
|-----------|------|-------------|
| `element` | `Element or ElementImage` | Source — must be a direct canvas child or an `ElementImage` |
| `dx` | `unrestricted double` | Destination x in canvas coordinates |
| `dy` | `unrestricted double` | Destination y in canvas coordinates |

### `drawElementImage(element, dx, dy, dwidth, dheight)`

Draw scaled to fit a destination rect.

### `drawElementImage(element, sx, sy, swidth, sheight, dx, dy)`

Draw a source sub-rect at natural size.

### `drawElementImage(element, sx, sy, swidth, sheight, dx, dy, dwidth, dheight)`

Draw a source sub-rect scaled to fit a destination rect.

### Returns (all overloads)

`DOMMatrix` — the CSS transform to apply to `element.style.transform` for DOM-to-drawn-position alignment. Does not apply automatically.

### Throws (all overloads)

Throws a `DOMException` when any of these are true:

- `element` is an `Element` and not a direct child of a `layoutsubtree` canvas in the last rendering update.
- `element` is `display: none` in the last rendering update.
- No snapshot has been recorded for `element` yet.
- `element` is a closed `ElementImage`.

The exact `DOMException.name` is not fixed by the current explainer; implementations are expected to use `InvalidStateError` or a closely-related name.

### Transform behaviour

- The current transformation matrix (CTM) applies to the destination rect.
- CSS transforms on the **source element** are **ignored** for drawing purposes. See [ADR 002](../architecture/adr/002-ignore-css-transforms.md).
- Overflowing content (layout and ink) is clipped to the source element's border box (paint containment).

### Default size

If `dwidth`/`dheight` are omitted, the element is drawn at a size that matches its on-screen CSS size, scaled into canvas coordinates. Concretely: `clientWidth × scale`, where `scale` depends on the canvas's backing-store-to-CSS ratio.

---

## texElementImage2D

Available on `WebGLRenderingContext` (both WebGL 1 and 2). Uploads an element image into the currently bound `TEXTURE_2D`. Four overloads:

### `texElementImage2D(target, level, internalformat, format, type, element)`

Upload at the element's natural size. Matches `texImage2D` shape.

### `texElementImage2D(target, level, internalformat, width, height, format, type, element)`

Upload scaled to `width × height`.

### `texElementImage2D(target, level, internalformat, sx, sy, swidth, sheight, format, type, element)`

Upload a source sub-rect at natural size.

### `texElementImage2D(target, level, internalformat, sx, sy, swidth, sheight, width, height, format, type, element)`

Upload a source sub-rect scaled to `width × height`.

### Parameters (common)

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | `GLenum` | Texture target, e.g. `gl.TEXTURE_2D` |
| `level` | `GLint` | Mipmap level |
| `internalformat` | `GLint` | e.g. `gl.RGBA` |
| `format` | `GLenum` | e.g. `gl.RGBA` |
| `type` | `GLenum` | e.g. `gl.UNSIGNED_BYTE` |
| `element` | `Element or ElementImage` | Source |

### Returns

`void`. Check GL errors with `gl.getError()` after the call.

### Notes

- `gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)` is usually needed since HTML origin is top-left.
- For text legibility, use `LINEAR` filtering and avoid mipmaps.
- See [guides/render-to-webgl.md](../guides/render-to-webgl.md).

---

## copyElementImageToTexture

Available on `GPUQueue`. Uploads an element image into a WebGPU texture. Three overloads:

### `copyElementImageToTexture(source, destination)`

Copy at natural size.

### `copyElementImageToTexture(source, width, height, destination)`

Copy scaled to `width × height`.

### `copyElementImageToTexture(source, sx, sy, swidth, sheight, destination)`

Copy a source sub-rect at natural size.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `Element or ElementImage` | Source |
| `destination` | `GPUImageCopyTextureTagged` | Destination texture and region |
| `width` / `height` | `GPUIntegerCoordinate` | Scaled destination size (overload 2) |
| `sx, sy, swidth, sheight` | `float` | Source sub-rect (overload 3) |

### Notes

- Destination texture must have `GPUTextureUsage.COPY_DST`.
- Prefer `rgba8unorm` over sRGB formats — canvas output is already gamma-corrected.
- See [guides/render-to-webgpu.md](../guides/render-to-webgpu.md).

---

## PaintEvent

The event delivered to `onpaint` handlers.

```idl
[Exposed=Window]
interface PaintEvent : Event {
  constructor(DOMString type, optional PaintEventInit eventInitDict);
  readonly attribute FrozenArray<Element> changedElements;
};

dictionary PaintEventInit : EventInit {
  sequence<Element> changedElements = [];
};
```

| Member | Type | Description |
|--------|------|-------------|
| `type` | `DOMString` | Always `"paint"` |
| `changedElements` | `FrozenArray<Element>` | Canvas children whose snapshots changed since the previous `paint` event. Empty if `paint` was fired only in response to `requestPaint()` |

The event is **not cancelable** and does **not bubble** (it's dispatched to the canvas only).

### Firing conditions

Browser fires `paint` during the rendering update if either of:

- Any direct canvas child's snapshot changed.
- `requestPaint()` was called since the previous rendering update.

CSS transforms on children do not trigger `paint` (transforms are ignored for drawing). Resizing the canvas backing store also does not itself invalidate snapshots — call `requestPaint()` after a resize if you need to redraw.

### Timing

Fires immediately after the browser's Paint step in [update the rendering](https://html.spec.whatwg.org/#update-the-rendering), before the frame commits. See [ADR 001](../architecture/adr/001-paint-event-timing.md).

---

## ElementImage

A transferable, closable snapshot of an element's paint output.

```idl
[Exposed=(Window,Worker), Transferable]
interface ElementImage {
  readonly attribute double width;
  readonly attribute double height;
  undefined close();
};
```

| Member | Type | Description |
|--------|------|-------------|
| `width` | `double` | Snapshot width in canvas coordinates |
| `height` | `double` | Snapshot height in canvas coordinates |
| `close()` | method | Frees backing memory. After close, drawing with this image throws |

### Producing

- `HTMLCanvasElement.captureElementImage(element)` — main thread only

### Consuming

- `CanvasRenderingContext2D.drawElementImage(image, ...)`
- `OffscreenCanvasRenderingContext2D.drawElementImage(image, ...)` — works on worker
- `WebGLRenderingContext.texElementImage2D(..., image)`
- `GPUQueue.copyElementImageToTexture(image, ...)`

### Transferring

`ElementImage` is transferable — pass it to `postMessage(msg, [image])` for zero-copy hand-off.

```js
worker.postMessage({ image }, [image]);  // transfer, not clone
```

After transfer, `width` and `height` remain readable, but drawing with the image on the original side throws — the pixels have moved.

### Lifetime

Backed by GPU or shared memory. Call `close()` when done to free resources. Implementations may hold references to snapshots internally while `paint` handlers are active; `close()` merely releases the author's handle.

---

## Common error conditions

The explainer does not yet fix exact `DOMException.name` values for these failures. Expect `InvalidStateError` or a similar name; catch generically and test `err instanceof DOMException`.

| Failure | Where | Cause |
|---------|-------|-------|
| Element not a direct child of a `layoutsubtree` canvas | `drawElementImage`, `captureElementImage`, `texElementImage2D`, `copyElementImageToTexture` | The `element` arg is not a direct child, or `layoutsubtree` was not set in the most recent rendering update |
| No snapshot available | Same | First frame hasn't fired `paint` yet — call `requestPaint()` before drawing |
| Element is `display: none` | Same | Element must have generated boxes |
| `ElementImage` has been closed | Drawing APIs | `close()` was called before this draw |

---

## See also

- [reference/idl.md](idl.md) — raw IDL
- [concepts/layoutsubtree.md](../concepts/layoutsubtree.md) — attribute semantics
- [concepts/paint-event.md](../concepts/paint-event.md) — event timing
- [concepts/element-images.md](../concepts/element-images.md) — snapshot lifecycle
