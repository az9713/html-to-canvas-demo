# Quickstart

Get a working HTML-in-Canvas demo running in about 10 minutes. By the end you'll have a `<canvas>` rendering a form element — with live keyboard input, a blinking cursor, and correct accessibility — drawn at a non-trivial offset.

## 0. Verify your browser

**Do this first.** The API does not exist in regular Chrome, Firefox, or Safari — if your browser doesn't have it, nothing below this step will work and the failures will look like bugs in your code.

Open any web page in your browser, open DevTools (F12), and paste this into the Console:

```js
'onpaint' in HTMLCanvasElement.prototype
```

Expected output:

```
true
```

If you see `false`, stop here. Install Chromium Canary, enable `chrome://flags/#canvas-draw-element`, relaunch, and re-run the check. Full setup: [prerequisites](prerequisites.md).

## 1. Create the HTML file

Save this as `quickstart.html` in an empty directory:

```html
<!doctype html>
<meta charset="utf-8">
<title>HTML-in-Canvas quickstart</title>

<style>
  canvas { border: 1px solid #888; width: 400px; height: 200px; }
</style>

<canvas id="canvas" layoutsubtree>
  <form id="form">
    <label for="name">Name:</label>
    <input id="name" type="text" value="Ada">
  </form>
</canvas>

<script>
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  canvas.onpaint = () => {
    ctx.reset();
    const transform = ctx.drawElementImage(form, 100, 50);
    form.style.transform = transform.toString();
  };
  canvas.requestPaint();

  new ResizeObserver(([entry]) => {
    canvas.width = entry.devicePixelContentBoxSize[0].inlineSize;
    canvas.height = entry.devicePixelContentBoxSize[0].blockSize;
  }).observe(canvas, { box: 'device-pixel-content-box' });
</script>
```

## 2. Start a local server

From the directory containing `quickstart.html`:

```bash
python3 -m http.server 8000
```

Expected output:

```
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

## 3. Open in Chromium Canary

Navigate to:

```
http://localhost:8000/quickstart.html
```

You should see a canvas with a form drawn inside it, starting 100 pixels right and 50 pixels down from the canvas's top-left. The input should be focusable, typable, and the cursor should blink.

## 4. Verify interactivity

- Click on the input — it should accept focus and show a caret.
- Type — characters should appear and the canvas should re-render each keypress.
- Tab through the page — focus should move to the input.
- Use a screen reader (VoiceOver: `Cmd+F5`, NVDA, JAWS) — the form should be announced as a form with a labelled text input.

If all four work, the API is functioning correctly.

## What happened

- **`layoutsubtree`** opted the canvas into the new model. Its child `<form>` laid out normally but was not painted to the screen — the canvas backing store is now the only place the form's pixels appear.
- **`canvas.onpaint`** ran after the browser snapshotted the form's rendering. Your handler called `drawElementImage(form, 100, 50)`, which copied the snapshot into the canvas at `(100, 50)` in canvas coordinates and returned a CSS transform that translates the form's DOM position to match.
- **`form.style.transform = transform.toString()`** applied that transform, keeping hit testing, focus rings, and AT announcements lined up with the drawn position. Without this line, clicking on the drawn form would miss.
- **`canvas.requestPaint()`** kicked off the first `paint` event — needed because there were no snapshot changes yet.
- **`ResizeObserver`** with `device-pixel-content-box` keeps the canvas backing store sized to exact device pixels, so the drawn content is crisp on HiDPI displays.

## Next steps

- [onboarding.md](onboarding.md) — the mental model, explained as a narrative
- [guides/render-to-2d-canvas.md](../guides/render-to-2d-canvas.md) — transforms, clipping, multi-element layouts
- [guides/render-to-webgl.md](../guides/render-to-webgl.md) — put HTML on a 3D cube via `texElementImage2D`
- [concepts/paint-event.md](../concepts/paint-event.md) — exactly when and why `paint` fires
- [troubleshooting/common-issues.md](../troubleshooting/common-issues.md) — if something above didn't work

## Try the shipping demos

The repo ships four progressively richer examples. From `html-in-canvas/Examples/`:

- `complex-text.html` — rotated, multi-line text with emoji, RTL, vertical CJK, inline SVG/image
- `pie-chart.html` — focusable, keyboard-navigable pie chart with DOM-rendered labels
- `text-input.html` — a full interactive form drawn into canvas
- `webGL.html` — HTML rendered onto a spinning 3D cube via WebGL
- `webgpu-jelly-slider/` — a range input with a WebGPU jelly-physics visual effect
