# Render an element to a 2D canvas

Use this guide when you want to draw an HTML element into a `CanvasRenderingContext2D`, with transforms, scaling, or partial source rectangles.

## Prerequisites

- Chromium Canary with `chrome://flags/#canvas-draw-element` enabled — see [prerequisites](../getting-started/prerequisites.md).
- You've read the [quickstart](../getting-started/quickstart.md) at least once, so the basic pattern is familiar.

## The basic recipe

```js
canvas.onpaint = () => {
  ctx.reset();                                              // 1. clear + reset CTM
  const transform = ctx.drawElementImage(element, dx, dy);  // 2. draw
  element.style.transform = transform.toString();           // 3. sync
};
canvas.requestPaint();                                      // 4. kick
```

The four lines at the heart of every 2D `layoutsubtree` page. Each is explained below.

## Step 1: Reset the context

`ctx.reset()` clears the backing store and resets the current transformation matrix. Call it at the start of every `onpaint` unless you explicitly want content retained across frames.

The alternative — `ctx.clearRect(0, 0, canvas.width, canvas.height)` — clears pixels but leaves the CTM intact. If you mutated the CTM last frame (with `ctx.rotate`, `ctx.translate`, etc.) and don't want that carried over, use `ctx.reset()`.

## Step 2: Draw the element

### Basic placement

```js
ctx.drawElementImage(element, dx, dy);
```

Draws the element at `(dx, dy)` in canvas coordinates, at its natural size (border-box dimensions scaled by `devicePixelRatio`).

### Scaling the drawn output

```js
ctx.drawElementImage(element, dx, dy, dwidth, dheight);
```

Stretches the element to fit into `dwidth × dheight` canvas pixels. Useful for scaling labels or responsive layouts where the canvas size doesn't match the element's natural size.

### Sampling a sub-region

```js
ctx.drawElementImage(element, sx, sy, swidth, sheight, dx, dy);
ctx.drawElementImage(element, sx, sy, swidth, sheight, dx, dy, dwidth, dheight);
```

Takes a sub-rectangle of the source element and draws it. Like `drawImage`, useful for sprite-sheet-style effects or cropping out a known section of an element.

All dimensions are `double` (unrestricted). Negative values are allowed and flip the drawn content.

## Step 3: Synchronize

```js
element.style.transform = transform.toString();
```

The returned `DOMMatrix` encodes the transform the browser would use to align the element's DOM box with the drawn pixels. See [concepts/synchronization.md](../concepts/synchronization.md) for the full math.

Skip this step only if the element is `inert` and has no interactive or assistive-tech role.

## Step 4: Kick the paint loop

```js
canvas.requestPaint();
```

Necessary once, after setting `onpaint`, because the first frame has no snapshot changes to trigger `paint` automatically.

If your content animates, call `requestPaint()` from inside `onpaint` to schedule the next frame.

## Applying context transforms

Everything on the 2D context works normally — the CTM applies to the destination rect of `drawElementImage`:

```js
canvas.onpaint = () => {
  ctx.reset();
  ctx.rotate(Math.PI / 12);                       // 15 degrees
  ctx.translate(80 * devicePixelRatio, -20 * devicePixelRatio);

  const transform = ctx.drawElementImage(element, 0, 0);
  element.style.transform = transform.toString();
};
```

This is the pattern from `Examples/complex-text.html` — the element is drawn rotated 15° and translated, and the returned transform does the inverse work on the DOM side so hit testing still lands correctly.

Notes:

- `ctx.rotate`, `ctx.scale`, `ctx.translate`, `ctx.transform`, `ctx.setTransform` all apply.
- `ctx.save()` / `ctx.restore()` work normally to bracket transforms.
- The returned `DOMMatrix` already accounts for the CTM — don't compose it with the CTM yourself.

## Drawing multiple elements

Each `drawElementImage` call is independent. Typical pattern for a chart:

```js
canvas.onpaint = () => {
  ctx.reset();

  for (const label of canvas.children) {
    const { x, y } = computePosition(label);
    const transform = ctx.drawElementImage(label, x, y);
    label.style.transform = transform.toString();
  }
};
```

Each returned transform is applied to its own element. The CTM accumulates across `drawElementImage` calls unless you reset between them.

If you want independent transforms per element without affecting subsequent draws, use `ctx.save()` / `ctx.restore()`:

```js
for (const label of canvas.children) {
  ctx.save();
  ctx.rotate(label.dataset.angle);
  ctx.drawElementImage(label, x, y);
  ctx.restore();
}
```

## Partial redraws with `changedElements`

If you have many elements and only one changed, use `event.changedElements` to skip redrawing the rest:

```js
canvas.onpaint = (event) => {
  // Only redraw changed elements. Requires you to retain the canvas state
  // rather than calling ctx.reset() each frame.
  for (const el of event.changedElements) {
    // Clear that element's region first.
    ctx.clearRect(el._lastX, el._lastY, el._lastW, el._lastH);
    const t = ctx.drawElementImage(el, el.dataset.x, el.dataset.y);
    el.style.transform = t.toString();
  }
};
```

This is an optimization. For most pages, redraw-everything is fast enough and much simpler.

## Interleaving with other 2D canvas drawing

`drawElementImage` is just another draw command. You can mix element draws with paths, fills, strokes, gradients, images:

```js
canvas.onpaint = () => {
  ctx.reset();

  // Background gradient.
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#ccc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Canvas-native wedges.
  for (const wedge of wedges) {
    ctx.fillStyle = wedge.color;
    ctx.fill(wedge.path);
  }

  // HTML labels on top.
  for (const label of canvas.children) {
    const t = ctx.drawElementImage(label, label.dataset.x, label.dataset.y);
    label.style.transform = t.toString();
  }
};
```

This is the pie chart pattern (`Examples/pie-chart.html`). Canvas-native paths for the wedges, HTML-in-canvas for the text labels — each tool is used for what it's best at.

## Verification

For a drawing to be "correct":

- [ ] The element's pixels appear in the canvas at the expected position.
- [ ] Clicking on the drawn pixels focuses or interacts with the element.
- [ ] Tab-ordering and focus rings line up.
- [ ] A screen reader (VoiceOver / NVDA / JAWS) announces the element correctly.

If any of those fail, start with [troubleshooting](../troubleshooting/common-issues.md).

## Troubleshooting for 2D rendering

**Element is drawn but clicking it misses.** You forgot step 3 (sync). Assign `element.style.transform = transform.toString()`.

**Element is drawn blurry.** Canvas backing store isn't sized to device pixels. Set up the `ResizeObserver` with `device-pixel-content-box` — see [size-canvas-correctly](size-canvas-correctly.md).

**Nothing draws on the first frame.** You haven't called `canvas.requestPaint()`. The first frame has no snapshot change to trigger `paint`.

**`drawElementImage` throws.** One of four causes: `layoutsubtree` isn't set, the element isn't a direct child, the element is `display: none`, or no `paint` has ever fired for it. Check all four.

**Animation stutters.** Your `onpaint` isn't rescheduled. Call `requestPaint()` at the end of `onpaint` to keep the loop going, or use `requestAnimationFrame(() => canvas.requestPaint())`.

## Related

- [guides/render-to-webgl.md](render-to-webgl.md) — same idea, in a WebGL context
- [guides/render-to-webgpu.md](render-to-webgpu.md) — same idea, in a WebGPU context
- [guides/size-canvas-correctly.md](size-canvas-correctly.md) — making sure output isn't blurry
- [concepts/paint-event.md](../concepts/paint-event.md) — when `onpaint` runs
- [reference/api.md#drawelementimage](../reference/api.md#drawelementimage) — full signature table
