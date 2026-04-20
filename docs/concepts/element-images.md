# Element images and `ElementImage`

The paint-ready snapshots that actually get drawn into canvas — and the transferable interface that carries them across threads.

## What an element image is

An element image is the browser's record of what a canvas child would have painted, captured at the end of the browser's Paint step and just before the `paint` event fires. It's conceptually a privacy-filtered bitmap (see [privacy model](privacy-model.md)), but implementations may back it with a retained display list for efficiency.

You don't construct element images directly for the common case. `drawElementImage(element, ...)` looks up the current snapshot for `element` automatically.

You **do** construct them explicitly when you need to transfer a snapshot across threads — that's what the `ElementImage` interface is for.

## The `ElementImage` interface

```idl
[Exposed=(Window,Worker), Transferable]
interface ElementImage {
  readonly attribute double width;
  readonly attribute double height;
  undefined close();
};
```

Three key properties:

- **Transferable.** You can `postMessage()` an `ElementImage` to a `Worker` (including one holding an `OffscreenCanvas`) and the snapshot moves without copying the pixel data.
- **Exposed in both `Window` and `Worker`.** Workers can draw element images into `OffscreenCanvas`.
- **`close()` frees resources.** Call it when you're done with the snapshot, just like `ImageBitmap.close()`. Drawing into a canvas does not auto-close.

The `width` and `height` are in canvas coordinate units, matching the element's border box at the time of capture.

## How element images are produced

Two producers:

**Implicit, via `drawElementImage(element, ...)`.** When you pass an `Element` to `drawElementImage`, the browser looks up the most recent snapshot. During a `paint` event, this is the current frame's snapshot. Outside a `paint` event, it's the previous frame's snapshot. If no snapshot has ever been recorded (the `layoutsubtree` canvas has never fired `paint`), the call throws.

**Explicit, via `canvas.captureElementImage(element)`.** Returns an `ElementImage` you can pass to `postMessage` or pass back to `drawElementImage` later. Only callable on the main thread (since only the main thread has a DOM and snapshots).

```js
const snapshot = canvas.captureElementImage(form);
// snapshot is an ElementImage
worker.postMessage({ snapshot }, [snapshot]);
// after transfer, `snapshot.width` / `snapshot.height` are still readable,
// but the pixel data has moved to the worker
```

## Drawing an `ElementImage`

Every `draw*Image` method that accepts an `Element` also accepts an `ElementImage`:

- `ctx.drawElementImage(snapshot, dx, dy, ...)` — 2D context
- `gl.texElementImage2D(target, level, fmt, ..., snapshot)` — WebGL / WebGL2
- `queue.copyElementImageToTexture(snapshot, destination)` — WebGPU

On a worker's `OffscreenCanvas`, only the `ElementImage` form works — the worker has no DOM, so it can't receive an `Element`.

## The two states of a snapshot

Visualizing the lifecycle:

```
Main thread frame N:
  ... browser Paint step ...
  ┌─────────────────────────────┐
  │ Snapshot recorded for each  │  ◀── element images now available
  │ layoutsubtree canvas child  │
  └─────────────────────────────┘
  paint event fires

    onpaint handler runs:
      drawElementImage(form, ...)   ◀── uses frame N's snapshot
      captureElementImage(form)     ◀── also frame N's snapshot
      worker.postMessage(snap, [snap])

  Frame N commits.

Main thread frame N+1:
  Snapshot for the form may change if form changed.
  Otherwise, frame N's snapshot is still the "latest".

  If user code calls drawElementImage(form) outside of onpaint,
  they get frame N's snapshot (the previous frame's).
```

The practical rules:

- **Inside `onpaint`:** `drawElementImage` uses the current frame's snapshot.
- **Outside `onpaint`:** uses the most recent *previous* frame's snapshot.
- **An explicit `ElementImage`** is always pinned to the frame in which it was captured (until you `close()` it).

## Why a separate snapshot type?

You might wonder why the API doesn't just take an `Element` everywhere. Two reasons:

1. **Workers don't have a DOM.** An `OffscreenCanvas` running in a worker can't accept an `Element` — there isn't one. It needs a transferable handle.
2. **Frame pinning.** An `ElementImage` captured at frame N is **stable**. You can hold it across multiple frames and draw it at frame N+5 and still get frame-N pixels. If you just held a reference to the `Element`, its snapshot would update each frame, so multi-frame effects (ghosting, trails, motion blur) would be hard to author.

## Closing an `ElementImage`

Pixel data is often backed by GPU memory. Call `close()` when done:

```js
const snap = canvas.captureElementImage(form);
// ... use it ...
snap.close();
```

After `close()`:

- `width` and `height` remain readable.
- Drawing with it throws.
- The backing memory is reclaimed.

Closing is particularly important in worker scenarios where you receive a stream of snapshots and keep only the latest.

## Typical patterns

### One-shot capture and send

```js
canvas.onpaint = () => {
  const snap = canvas.captureElementImage(form);
  worker.postMessage({ snap }, [snap]);
};
```

### Reusable snapshot on the main thread

```js
let cachedSnapshot = null;

canvas.onpaint = () => {
  if (!cachedSnapshot || event.changedElements.includes(form)) {
    cachedSnapshot?.close();
    cachedSnapshot = canvas.captureElementImage(form);
  }
  // Draw the cached snapshot multiple times (e.g., reflection, shadow).
  ctx.drawElementImage(cachedSnapshot, 50, 50);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.translate(0, cachedSnapshot.height);
  ctx.scale(1, -1);
  ctx.drawElementImage(cachedSnapshot, 50, 50); // reflection
  ctx.restore();
};
```

### Retained multi-frame ghosts (trails effect)

```js
const trail = [];

canvas.onpaint = () => {
  // Capture current frame.
  const snap = canvas.captureElementImage(ball);
  trail.push(snap);
  if (trail.length > 8) trail.shift().close();

  // Draw oldest to newest with increasing alpha.
  ctx.reset();
  trail.forEach((s, i) => {
    ctx.globalAlpha = (i + 1) / trail.length;
    ctx.drawElementImage(s, ball.offsetLeft, ball.offsetTop);
  });
};
```

## Performance notes

- Each `paint` event records snapshots for every `layoutsubtree` canvas with changes. The cost scales with the sum of changed children's paint complexity.
- `captureElementImage` does not re-paint — it clones the existing snapshot's backing representation (cheap).
- Transferring an `ElementImage` is zero-copy by design; don't implement your own pixel copy.
- Holding many snapshots alive keeps their backing memory alive. `close()` eagerly.

## Related

- [concepts/paint-event.md](paint-event.md) — when snapshots are recorded
- [concepts/privacy-model.md](privacy-model.md) — what's excluded from snapshots
- [guides/use-offscreencanvas.md](../guides/use-offscreencanvas.md) — the worker+OffscreenCanvas flow
- [reference/api.md#elementimage](../reference/api.md#elementimage) — IDL reference
