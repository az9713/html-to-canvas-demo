# What is HTML-in-Canvas?

> **⚠️ A special version of Chrome is required.** This API is behind a flag in **Chromium Canary**. Open `chrome://flags/#canvas-draw-element` and set it to **HTML-in-Canvas Enabled**, then relaunch. Regular Chrome, Firefox, and Safari do not support the API at all. Verify with `'onpaint' in HTMLCanvasElement.prototype` in DevTools. See [prerequisites](../getting-started/prerequisites.md).

A Web Platform API that lets JavaScript draw real, live HTML elements — text, forms, images, SVG — into a `<canvas>` while preserving accessibility, hit testing, and DOM semantics.

## The problem

Canvas is fast and flexible, but it has no native understanding of HTML. Today, if you want styled text, a form control, an image, an emoji run, or an RTL paragraph inside a canvas, you have three bad choices:

1. Reimplement HTML layout on top of `fillText` and `drawImage` — accessibility, i18n, and text shaping suffer.
2. Rasterize with `foreignObject` + `drawImage` — brittle, loses interactivity, has cross-origin restrictions.
3. Overlay HTML absolutely-positioned above the canvas — breaks WebGL/WebGPU composition, can't be used as a shader input.

Charts, creative tools, games, and 3D applications all hit this wall. The result is either degraded content or degraded accessibility.

## The mental model

Think of a canvas that opts in with `layoutsubtree` as having **two realities** for each child element:

- A **DOM reality**: the element participates in layout, accessibility, focus, and hit testing, but is never painted to the screen by the browser.
- A **canvas reality**: the element's pixels are sampled by `drawElementImage()` (or `texElementImage2D` / `copyElementImageToTexture`) into the canvas backing store, using the canvas's current transform.

Your job as a developer is to keep the two realities lined up. The browser gives you a `paint` event, a CSS transform from `drawElementImage()`, and a placeholder snapshot mechanism (`ElementImage`) to make that job tractable.

```
  ┌──────────────────────────────────────────────────────┐
  │ <canvas layoutsubtree>                               │
  │                                                      │
  │   DOM children:                                      │
  │     <form> <label> <input> ...                       │
  │     (laid out, focusable, AT-visible, not painted)   │
  │                                                      │
  │   Canvas backing store:                              │
  │     2D / WebGL / WebGPU pixels                       │
  │     drawn by your onpaint handler                    │
  │     from child elements via draw*Image() calls       │
  └──────────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
    user interaction            your JS renders
    (click, focus, AT)           during `paint` event
```

## The three primitives

The API introduces a **small surface** with three building blocks:

| Primitive | What it does |
|-----------|--------------|
| `layoutsubtree` attribute | Opts a `<canvas>` into the two-reality model and contains its children |
| `drawElementImage()` / `texElementImage2D()` / `copyElementImageToTexture()` | Samples a child's pixels into the 2D / WebGL / WebGPU context |
| `paint` event + `requestPaint()` | Gives the author a hook to re-render in sync with DOM paint |

A fourth primitive, `ElementImage` + `captureElementImage()`, lets you transfer a snapshot to a worker-thread `OffscreenCanvas`.

See [key concepts](key-concepts.md) for exact definitions of every term.

## How a frame is produced

The lifecycle of a single frame on a `layoutsubtree` canvas:

1. Browser runs its normal rendering update — style, layout, animation callbacks, intersection observers.
2. Browser paints all non-canvas content. Canvas children are laid out but **not** drawn to the screen.
3. Browser records a **snapshot** of each canvas child's painted output (privacy-filtered — see [privacy model](../concepts/privacy-model.md)).
4. Browser fires `paint` on any `layoutsubtree` canvas whose children's snapshots have changed, or any canvas on which you called `requestPaint()`.
5. Your `onpaint` handler runs. You call `drawElementImage()` (or the WebGL/WebGPU equivalent) to sample children into the canvas.
6. The canvas backing store commits. The frame ships.

DOM mutations made **during** `paint` are applied on the **next** frame, never the current one. This is deliberate — see [ADR 001](../architecture/adr/001-paint-event-timing.md).

## What this is NOT

- **Not a screenshotter.** `drawElementImage` is invalidation-driven, privacy-filtered, and can't sample cross-origin iframes or visited-link styles. Use `html2canvas` or server-side rendering if you want full-fidelity captures.
- **Not a replacement for overlays.** Positioning an `<iframe>` or DOM subtree above a WebGL canvas is still the right tool when you don't need the pixels inside the shader.
- **Not transform-reactive.** CSS transforms on drawn elements are **ignored** for painting — the element's pre-transform box is sampled. Transforms still affect hit testing and accessibility. See [ADR 002](../architecture/adr/002-ignore-css-transforms.md).
- **Not available in stable browsers.** As of 2026, behind a flag in Chromium only. No WebKit or Gecko implementation yet.

## Where to go next

- [key-concepts.md](key-concepts.md) — vocabulary you'll see across the docs
- [getting-started/quickstart.md](../getting-started/quickstart.md) — enable the flag, run a demo
- [concepts/layoutsubtree.md](../concepts/layoutsubtree.md) — what opting in actually does to your DOM
- [concepts/paint-event.md](../concepts/paint-event.md) — the rendering lifecycle in detail
