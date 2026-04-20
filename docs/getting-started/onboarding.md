# Onboarding: zero to confident in ~30 minutes

This guide assumes you've used `<canvas>` before and written a little JavaScript, but nothing else. By the end you'll understand why HTML-in-Canvas exists, how it works, and how to reason about the tricky parts.

## If you've used X, this is like Y but...

**If you've used `foreignObject` in SVG:** HTML-in-Canvas is what `foreignObject` always should have been — real HTML rendered into a pixel context, with interactivity, accessibility, cross-origin safety, and a frame-accurate update event.

**If you've used `html2canvas` or similar rasterizers:** this is similar in spirit but in-browser, real-time, and without the DOM walk. It samples the browser's actual paint output, not a re-implementation.

**If you've used `CanvasRenderingContext2D.drawImage(video)`:** it's the same shape as that — "sample this live source into my canvas" — but the source is a live, accessible DOM subtree instead of a video frame.

**If you've used React Native or Flutter:** you know the pattern where layout is one thing and rendering is another, driven by a declarative tree. Here, layout is still the browser's job and the DOM is still real; only the **rendering** is redirected into the canvas.

## The core problem

Imagine you're writing a chart library. You want a pie chart with labels. Each label is a multi-line block of styled text, perhaps with localized currency, perhaps bidirectional, perhaps with an icon. You want the label positioned at a calculated angle — possibly rotated to match the wedge.

Your options today:

1. **Use `fillText` and friends.** Now you have to reimplement text shaping, line breaking, bidi, complex script handling, emoji rendering, accessibility. Each one is a rabbit hole. Your chart ends up with second-class text compared to the rest of the page.

2. **Use absolutely-positioned HTML overlays.** Fine for a 2D canvas, but unusable when the canvas is part of a WebGL scene (can't be a texture), and hard to keep pixel-aligned with transforms.

3. **Use `foreignObject` + `drawImage`.** Works sometimes, but it's slow, breaks on cross-origin styles, and has always been a sharp edge.

The chart library authors of the world have been working around this for a decade. The proposal is: what if the browser just drew the HTML for you?

## The two realities

When you set `layoutsubtree` on a `<canvas>`, each direct child of that canvas enters a new state. It exists in two realities at once:

- In the **DOM reality**, the child is laid out, is focusable, appears in accessibility trees, and receives pointer events. The browser does everything it normally would for a DOM node, except paint it to the screen.
- In the **canvas reality**, the child's painted pixels are available for you to sample into the canvas backing store via `drawElementImage()` (or `texElementImage2D` for WebGL, or `copyElementImageToTexture` for WebGPU).

Keeping the two realities lined up is your job. The API gives you three tools:

| Tool | What it does |
|------|--------------|
| The `paint` event | Tells you when the DOM reality's painted output has changed, so you can re-draw the canvas reality |
| The returned CSS transform from `drawElementImage()` | Lets you move the DOM reality's hit-test and a11y box to match where you drew it |
| `ElementImage` | Lets you transfer a snapshot to a worker's `OffscreenCanvas` |

That's it. The rest is machinery in service of those three things.

## A narrative: the form-in-canvas demo

Let's walk through what happens on a representative frame of `text-input.html`, where a form is drawn at offset `(canvas.width/25, canvas.height/25)`.

**Frame N-1.** The page first loads. The canvas has `layoutsubtree` set. The form lays out at its normal position, but the browser's painter sees that the canvas has `layoutsubtree` and **skips** painting the form to the screen. The canvas is blank.

**Frame N.** Your code calls `canvas.requestPaint()`. The browser notes this and continues the rendering update. Just before painting would normally occur, the browser records an `ElementImage` snapshot of the form — exactly what it would have painted.

The browser then fires `paint` on your canvas. Your handler runs:

```js
ctx.reset();
const transform = ctx.drawElementImage(form, x, y);
form.style.transform = transform.toString();
```

`drawElementImage` copies the snapshot into the canvas backing store at `(x, y)` with the current transformation matrix applied. It returns a `DOMMatrix` — the CSS transform that, when applied to `form.style.transform`, moves the form's DOM box so that hit testing lands on the pixels you just drew.

You apply that transform to the form. The DOM mutation isn't visible in this frame — any layout change made inside `paint` is deferred to the next rendering update. But hit testing, focus, and a11y will use the updated transform immediately, so the realities stay aligned.

The frame ships to the screen.

**Frame N+1.** User clicks the input. The browser does hit testing against the form's transformed DOM box. It lands on the `<input>`. Focus moves. A caret starts blinking.

The blinking caret is a paint change on the form. The browser detects it, fires `paint` again with `changedElements` containing the form. Your handler runs, redraws, life continues.

**Frame N+10.** User types "A". The input's value changes. The browser re-lays out (trivial change — text is fixed-width in the input), re-snapshots, fires `paint`. You redraw. The "A" is now visible in the canvas.

This is the loop. The `paint` event is the heartbeat. Your `onpaint` handler is the renderer. Everything else is details.

## Three surprising design decisions, explained

### Why are CSS transforms on the element ignored when drawing?

If `form.style.transform = 'translate(100px, 0)'` affected how `drawElementImage` drew the form, you'd have a cycle: the API returns a transform, you apply it, that changes how the next draw samples the form, you'd get a different transform back, and you'd never converge.

So: **transforms are ignored for drawing, but honored for hit testing**. You can apply whatever transform you want to keep the DOM box aligned with the drawn position, and it won't feed back into the next draw. See [ADR 002](../architecture/adr/002-ignore-css-transforms.md).

### Why does `paint` fire after the browser's Paint step?

Earlier drafts considered firing `paint` during animation-frame callbacks or at ResizeObserver timing. Both had deep problems: partial paint trees, reentrant loops, WebGL synchronisation deadlocks.

Firing `paint` **after** the browser has fully painted the rest of the page means the snapshot is complete and consistent. DOM mutations in your `paint` handler are safely deferred to the next frame. You get one well-defined spot per frame to do canvas work. See [ADR 001](../architecture/adr/001-paint-event-timing.md).

### Why is `requestPaint()` separate from `requestAnimationFrame()`?

They run at different points in the rendering update. `requestAnimationFrame` callbacks run *before* layout; `paint` fires *after* layout and snapshotting. Inside `paint`, snapshots are available, so `drawElementImage` can draw the most recent frame's content. Inside `rAF`, snapshots don't exist yet — you'd only get last frame's data.

`requestPaint()` is the "kick the paint loop" primitive. `requestAnimationFrame` is still there for the usual reasons — animation state, physics, etc.

## A mental checklist for any HTML-in-Canvas page

Every `layoutsubtree` canvas needs these five things, in roughly this order:

1. **Set `layoutsubtree` on the `<canvas>`.** Without it, children are still hidden (canvas children are normally fallback-only) and `drawElementImage` will throw.
2. **Structure children so each logical "drawable" is a direct child.** You can only draw direct children. If you want to draw a grouped block, wrap it in a `<div>` that's a direct child, and let its descendants be the grouped content.
3. **Install a `ResizeObserver` with `device-pixel-content-box`.** Without this, the canvas backing store is sized in CSS pixels and everything renders blurry on HiDPI.
4. **Write an `onpaint` handler that:**
   - Resets the context (`ctx.reset()` in 2D, or the equivalent setup for WebGL/WebGPU).
   - Calls `drawElementImage` / `texElementImage2D` / `copyElementImageToTexture` for each element you want visible.
   - Applies the returned transform to `element.style.transform`.
5. **Call `canvas.requestPaint()` at least once.** The first frame has no snapshot changes to trigger `paint`, so you have to kick it.

If any one of these is missing, you'll see nothing, blurry output, broken hit testing, or infinite loops. See [troubleshooting](../troubleshooting/common-issues.md).

## Where to go next

- **Try the examples.** The shipping demos in `Examples/` are the fastest way to get intuition.
- **Read [concepts/layoutsubtree.md](../concepts/layoutsubtree.md)** for a precise description of what opting in does.
- **Read [concepts/synchronization.md](../concepts/synchronization.md)** for the math and practicalities of keeping DOM and canvas in sync.
- **Skim [reference/api.md](../reference/api.md)** once so you know what's there. You won't memorize it — you'll come back.
- **File an issue.** The working group actively wants feedback. See [github.com/WICG/html-in-canvas/issues](https://github.com/WICG/html-in-canvas/issues).
