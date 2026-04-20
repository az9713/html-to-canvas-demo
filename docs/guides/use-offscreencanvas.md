# Use `OffscreenCanvas` in a Worker

Use this guide when you want to draw HTML into a canvas controlled by a worker thread — to move rendering cost off the main thread, or to enable threaded effects.

## Prerequisites

- Flag enabled (see [prerequisites](../getting-started/prerequisites.md)).
- Familiarity with `OffscreenCanvas`, `transferControlToOffscreen`, and `Worker`.
- You've read [concepts/element-images.md](../concepts/element-images.md) — snapshots are the key.

## The one-sentence version

Workers can't see the DOM, so you snapshot elements on the main thread with `canvas.captureElementImage()`, `postMessage` the resulting `ElementImage` to the worker, and the worker draws it into its `OffscreenCanvas`.

## Architecture

```
Main thread                          Worker thread
───────────────                      ─────────────
<canvas layoutsubtree>               (OffscreenCanvas)

paint event fires
  ↓
canvas.captureElementImage(form)  ──postMessage──→  ctx.drawElementImage(snap, ...)
                                                    const t = /* returned matrix */
form.style.transform = ...  ←──postMessage────────  self.postMessage({ transform: t })
```

The main thread owns the DOM and the `paint` event. The worker owns the canvas pixels. `ElementImage` bridges the two.

## Basic recipe

```html
<canvas id="canvas" layoutsubtree style="width: 400px; height: 200px;">
  <form id="form">
    <label for="name">Name:</label>
    <input id="name">
  </form>
</canvas>

<script>
  // Worker code as a string so the demo is self-contained.
  const workerCode = `
    let ctx;
    self.onmessage = (e) => {
      if (e.data.canvas) {
        ctx = e.data.canvas.getContext('2d');
      }
      if (e.data.size) {
        ctx.canvas.width = e.data.size.w;
        ctx.canvas.height = e.data.size.h;
      }
      if (e.data.snap) {
        ctx.reset();
        const transform = ctx.drawElementImage(e.data.snap, 100, 0);
        self.postMessage({ transform: transform });
        e.data.snap.close();
      }
    };
  `;

  const worker = new Worker(URL.createObjectURL(new Blob([workerCode])));

  const canvas = document.getElementById('canvas');
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage({ canvas: offscreen }, [offscreen]);

  canvas.onpaint = () => {
    const snap = canvas.captureElementImage(form);
    worker.postMessage({ snap }, [snap]);
  };

  worker.onmessage = ({ data }) => {
    if (data.transform) {
      form.style.transform = data.transform.toString();
    }
  };

  new ResizeObserver(([entry]) => {
    const box = entry.devicePixelContentBoxSize[0];
    worker.postMessage({ size: { w: box.inlineSize, h: box.blockSize } });
    canvas.requestPaint();
  }).observe(canvas, { box: 'device-pixel-content-box' });

  canvas.requestPaint();
</script>
```

## Walkthrough

**Main thread, setup.** `transferControlToOffscreen()` detaches the canvas from the main thread. After this, you cannot call `getContext()` on the main-thread `<canvas>` — its pixel ownership has moved.

**Main thread, every frame.** `onpaint` fires with a fresh snapshot available. `captureElementImage(form)` produces an `ElementImage`. Transferring it to the worker via `postMessage(msg, [snap])` is zero-copy.

**Worker, every frame.** Receives the snapshot. Calls `drawElementImage(snap, ...)` on its `OffscreenCanvasRenderingContext2D` (or passes to `texElementImage2D` for WebGL or `copyElementImageToTexture` for WebGPU).

**Worker, sync transform.** `drawElementImage` returns the CSS transform that should be applied to the DOM element. The worker has no DOM — it posts the transform back.

**Main thread, apply transform.** Receives the transform. Sets `form.style.transform`. Hit testing, a11y, focus rings align with the drawn pixels.

**Don't forget `snap.close()`.** Closing releases GPU-backed memory. Do it in the worker after drawing.

## Avoiding the transform round-trip

Two `postMessage` calls per frame (snapshot out, transform back) is acceptable for most pages but not great for tight animation loops. Alternatives:

### Static position

If the draw position never changes, the transform doesn't either. Compute it once on the main thread — you can call `canvas.captureElementImage` + a dummy draw on any 2D context to derive it, or just apply a known translate/scale — and assign it once.

### Compute transform on main thread, send to worker

If the draw position depends on main-thread state (scroll, pointer, animation clock), compute the CSS transform on the main thread (using `canvas.getElementTransform(element, drawMatrix)`) and set `element.style.transform` at the same time you `postMessage` the `ElementImage`. The worker just draws.

```js
canvas.onpaint = () => {
  // Main thread knows where to draw.
  const drawMatrix = new DOMMatrix().translate(100, 0);

  // Apply DOM transform here.
  const cssTransform = canvas.getElementTransform(form, drawMatrix);
  form.style.transform = cssTransform.toString();

  // Hand off rendering to the worker.
  const snap = canvas.captureElementImage(form);
  worker.postMessage({ snap, drawMatrix }, [snap]);
};
```

This is one-way communication and fits lock-step main→worker architectures.

## WebGL or WebGPU in the worker

The worker's `OffscreenCanvas` supports `getContext('webgl2')` and `getContext('webgpu')`. `texElementImage2D` and `copyElementImageToTexture` both accept `ElementImage`, so the pattern is identical — just replace the 2D draw call.

```js
// Worker, WebGL path:
ctx = offscreen.getContext('webgl2');
// ... in message handler ...
ctx.texElementImage2D(
  ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, snap
);
```

## Gotchas

- **Don't forget to transfer.** `postMessage({ snap })` without the `[snap]` transfer list throws — `ElementImage` is `Transferable`, not `Cloneable`.
- **`captureElementImage` must run on the main thread.** It reads the element's current snapshot from the browser's paint output, which only exists on the main thread.
- **Workers have no DOM.** Never try to pass an `Element` to a worker. It's not serializable.
- **`close()` leaks.** Holding hundreds of un-closed `ElementImage` objects in the worker keeps their backing GPU memory alive. Always `close()` after drawing.
- **Canvas resize.** After `transferControlToOffscreen`, the main-thread canvas's `width`/`height` attributes are no longer meaningful. Set the size via a message to the worker, which sets its `OffscreenCanvas`'s `width`/`height`.
- **`requestPaint` runs on the main thread canvas.** That's still correct — the event fires on the main thread, which captures snapshots and forwards them.

## Performance

- **Transfer, don't copy.** The `[snap]` transfer list ensures zero-copy hand-off.
- **Budget postMessages.** Each `postMessage` has a fixed cost (often >0.1ms). If you're firing 120Hz + multiple snapshots per frame, batch them.
- **Close snapshots eagerly.** A backlog of snapshots in the worker's mailbox is both memory and scheduling pressure.

## Checklist

- [ ] `layoutsubtree` on the main-thread `<canvas>`.
- [ ] `transferControlToOffscreen()` called exactly once.
- [ ] Worker receives the `OffscreenCanvas` via the first `postMessage`.
- [ ] Main-thread `onpaint` creates and transfers `ElementImage` snapshots.
- [ ] Worker calls `drawElementImage` / `texElementImage2D` / `copyElementImageToTexture`.
- [ ] Worker calls `snap.close()` after use.
- [ ] Transform is applied to the DOM element (via round-trip or pre-computation).

## Reference implementation

The `OffscreenCanvas Example` section of the main [README.md](../../README.md#offscreencanvas-example) has the full pattern. Adapt from there.

## Related

- [concepts/element-images.md](../concepts/element-images.md) — `ElementImage` lifecycle
- [concepts/synchronization.md](../concepts/synchronization.md) — keeping DOM and drawn positions aligned
- [reference/api.md](../reference/api.md#htmlcanvaselementcaptureelementimage) — IDL
