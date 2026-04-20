# Render an element to WebGPU

Use this guide when you want a live HTML element as a WebGPU texture — for custom compute and render pipelines, compute-shader post-processing, or WebGPU-only effects (e.g., the jelly-slider demo).

## Prerequisites

- Flag enabled (see [prerequisites](../getting-started/prerequisites.md)).
- A browser with WebGPU support — Chromium Canary qualifies on most platforms.
- Familiarity with WebGPU: adapters, devices, pipelines, bind groups, textures, queues.
- You've read [concepts/element-images.md](../concepts/element-images.md).

## The WebGPU-specific API

```idl
partial interface GPUQueue {
  void copyElementImageToTexture(
    (Element or ElementImage) source,
    GPUImageCopyTextureTagged destination);

  void copyElementImageToTexture(
    (Element or ElementImage) source,
    GPUIntegerCoordinate width, GPUIntegerCoordinate height,
    GPUImageCopyTextureTagged destination);

  void copyElementImageToTexture(
    (Element or ElementImage) source,
    float sx, float sy, float swidth, float sheight,
    GPUImageCopyTextureTagged destination);
};
```

Three overloads:

| Overload | Use |
|----------|-----|
| `source, destination` | Copy the full element at its natural size |
| `source, width, height, destination` | Copy and resize to `width × height` |
| `source, sx, sy, swidth, sheight, destination` | Copy a source sub-rect |

The `destination` is a `GPUImageCopyTextureTagged`, which identifies the destination `GPUTexture`, mip level, origin, and aspect. Standard WebGPU parameter.

## Basic recipe: HTML as a WebGPU texture

```html
<canvas id="gpu-canvas" layoutsubtree>
  <input id="slider" type="range" min="0" max="100" value="50">
</canvas>

<script type="module">
  const canvas = document.getElementById('gpu-canvas');
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'premultiplied' });

  // Create a texture sized to match the source element.
  const texture = device.createTexture({
    size: [slider.clientWidth * devicePixelRatio,
           slider.clientHeight * devicePixelRatio],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING
         | GPUTextureUsage.COPY_DST
         | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  canvas.onpaint = () => {
    device.queue.copyElementImageToTexture(slider, { texture });
    drawScene();  // your render pass that samples the texture
    canvas.requestPaint();  // continuous loop
  };
  canvas.requestPaint();
</script>
```

This uploads the slider's current paint into the WebGPU texture every frame. Your pipeline samples the texture like any other — for filtering, blending, or running it through a compute shader.

## Matching source and destination sizes

`copyElementImageToTexture` requires the destination texture to have room for the source. The simplest approach is to recreate the texture when the source resizes:

```js
let texture;

function resizeTexture(w, h) {
  texture?.destroy();
  texture = device.createTexture({
    size: [w, h],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING
         | GPUTextureUsage.COPY_DST,
  });
}

new ResizeObserver(([entry]) => {
  const box = entry.devicePixelContentBoxSize[0];
  resizeTexture(box.inlineSize, box.blockSize);
  canvas.requestPaint();
}).observe(slider, { box: 'device-pixel-content-box' });
```

If you always resize the element and texture together, copies never mismatch. If the element can change size between paints, defensively use the scaling overload to fit into a fixed texture:

```js
device.queue.copyElementImageToTexture(
  slider, textureWidth, textureHeight, { texture }
);
```

## Synchronization for interactive content

Same pattern as WebGL — compute the 2D projection of where your textured geometry appears and call `getElementTransform`:

```js
const drawMatrix = computeDrawMatrix();
const cssTransform = canvas.getElementTransform(slider, drawMatrix);
slider.style.transform = cssTransform.toString();
```

For the jelly-slider pattern (the input is rendered in place, but with a distortion shader), `drawMatrix` is effectively the identity — the shader displaces pixels but the DOM input's hit-test box stays at its natural position. `OffscreenCanvas` is also overlaid with `opacity: 0` on the actual input so pointer events work — see `Examples/webgpu-jelly-slider/index.html`.

## Texture format considerations

- **`rgba8unorm`** is the safe default for HTML content. It matches the browser's typical 8-bit-per-channel paint output.
- **sRGB formats (`rgba8unorm-srgb`)** are usually wrong — canvas output is already gamma-corrected, and sRGB sampling would double-correct. Prefer linear `rgba8unorm`.
- **HDR formats** (`rgba16float`, etc.) work for compute passes but the source pixels are still 8-bit, so you won't gain precision.

## Performance notes

- `copyElementImageToTexture` is a GPU-to-GPU copy when the element image is already on the GPU, and a CPU→GPU upload otherwise. Implementations vary.
- Re-uploading every frame is fine if the element changes every frame (e.g., a video element). If content changes rarely, check `event.changedElements` and skip the copy when possible.
- Don't create new `GPUTexture` objects every frame. Reuse one texture per source element.
- Avoid reading textures back to the CPU (`mapAsync` etc.) unless necessary — this defeats the zero-copy path.

## Using `ElementImage` with WebGPU in a worker

If the canvas is on a worker (`transferControlToOffscreen()`), the main thread captures and transfers snapshots:

```js
// Main thread:
canvas.onpaint = () => {
  const snap = canvas.captureElementImage(slider);
  worker.postMessage({ snap }, [snap]);
};

// Worker:
self.onmessage = async ({ data }) => {
  device.queue.copyElementImageToTexture(data.snap, { texture });
  renderFrame();
  data.snap.close();  // free the snapshot when done
};
```

## Checklist

- [ ] `layoutsubtree` on the canvas.
- [ ] Source element is a direct canvas child.
- [ ] Destination texture has `COPY_DST` + `TEXTURE_BINDING` usage.
- [ ] Texture size matches the source paint size.
- [ ] `requestPaint()` is called at least once.
- [ ] `getElementTransform` syncs the DOM box if the element is interactive.

## Reference implementation

`Examples/webgpu-jelly-slider/` — a full TypeScript + Vite project showing a range input rendered through a custom WebGPU jelly-distortion shader, with pointer events still working on the underlying input.

## Related

- [guides/render-to-webgl.md](render-to-webgl.md) — same task, WebGL
- [guides/use-offscreencanvas.md](use-offscreencanvas.md) — `copyElementImageToTexture` from a worker
- [concepts/element-images.md](../concepts/element-images.md) — what snapshots are
- [reference/api.md#copyelementimagetotexture](../reference/api.md#copyelementimagetotexture) — full IDL
