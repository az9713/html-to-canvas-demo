# Render an element to WebGL

Use this guide when you want a live HTML element as a WebGL texture — for example, to display DOM content on a 3D surface or apply custom shader effects.

## Prerequisites

- Flag enabled (see [prerequisites](../getting-started/prerequisites.md)).
- Familiarity with WebGL 1 or WebGL 2 — buffers, shaders, textures, draw calls.
- You've read the [2D guide](render-to-2d-canvas.md) for the base pattern.

## The WebGL-specific API

`WebGLRenderingContext.texElementImage2D()` — uploads an element's snapshot to the currently bound `TEXTURE_2D`. Four overloads:

```idl
void texElementImage2D(GLenum target, GLint level, GLint internalformat,
                       GLenum format, GLenum type,
                       (Element or ElementImage) element);

void texElementImage2D(GLenum target, GLint level, GLint internalformat,
                       GLsizei width, GLsizei height,
                       GLenum format, GLenum type,
                       (Element or ElementImage) element);

void texElementImage2D(GLenum target, GLint level, GLint internalformat,
                       GLfloat sx, GLfloat sy, GLfloat swidth, GLfloat sheight,
                       GLenum format, GLenum type,
                       (Element or ElementImage) element);

void texElementImage2D(GLenum target, GLint level, GLint internalformat,
                       GLfloat sx, GLfloat sy, GLfloat swidth, GLfloat sheight,
                       GLsizei width, GLsizei height,
                       GLenum format, GLenum type,
                       (Element or ElementImage) element);
```

Overloads by use:

| Overload | Use |
|----------|-----|
| No size args | Texture is created at the element's natural size |
| `width, height` | Uploads scaled into a fixed-size texture |
| `sx, sy, swidth, sheight` | Source sub-rect of the element |
| Source rect + dest size | Both |

A related method `copyElementImageToTexture` exists as a companion — see the IDL in [reference/api.md](../reference/api.md). `texElementImage2D` is the primary method.

## Basic recipe: HTML as a texture

```html
<canvas id="gl-canvas" layoutsubtree>
  <div id="source" inert>Hello from HTML-in-canvas!</div>
</canvas>

<script>
  const canvas = document.getElementById('gl-canvas');
  const gl = canvas.getContext('webgl2');

  // Create and bind a texture.
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // (shader setup elided — see Examples/webGL.html for full code)

  canvas.onpaint = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texElementImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      gl.RGBA, gl.UNSIGNED_BYTE, source
    );

    // Linear filtering produces better text rendering than mipmaps.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Your normal draw loop here.
    drawScene(gl, programInfo, buffers, tex);
  };
  canvas.requestPaint();
</script>
```

The `inert` attribute on the source element opts it out of interactivity — useful when the 3D transform would make hit testing impractical anyway. For interactive content, omit `inert` and use `getElementTransform()` to keep the DOM box aligned with the rendered 3D projection.

## Texture filtering for text

**Use `LINEAR`, not mipmaps, when drawing text.** Mipmap minification destroys text legibility — each downsample stage blurs, and text that's crisp at full size becomes illegible even at slight minifications.

```js
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
```

If you need smaller display sizes without loss, render the source element at the smaller size rather than scaling down in the shader.

## Flipping Y

WebGL's texture origin is bottom-left. CSS's paint origin is top-left. If your HTML appears upside-down, enable Y-flip:

```js
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
```

Set this **before** `texElementImage2D`. Like all `pixelStorei` state, the setting is sticky — it persists until you change it, and applies to every subsequent upload in the same context.

## Synchronizing with `getElementTransform`

The DOM box still needs to be kept aligned with where the element appears on screen. In WebGL, that's the projected location of the textured geometry. Compute it as a `DOMMatrix` and pass it to `getElementTransform`:

```js
const drawMatrix = new DOMMatrix();
// Fill drawMatrix with the 2D projection of your element's quad
// into canvas coordinates. For a screen-space billboard, this is
// just translate + scale; for a 3D face, project the quad corners.

const cssTransform = canvas.getElementTransform(source, drawMatrix);
source.style.transform = cssTransform.toString();
```

For the case of a spinning cube, the user will perceive the HTML content at the cube's current screen-space position. Each frame, compute that position and update the transform.

For screen-space billboards (common case), `drawMatrix` is effectively a CSS-pixel-to-canvas-pixel translation and scale — no different from the 2D case.

## Performance tips

- **Re-upload only on change.** Check `event.changedElements` — if your source element isn't in it, skip the `texElementImage2D` call and re-use the existing texture.
- **Reuse textures.** Don't `createTexture()` every frame. Create once, re-upload into the same texture each paint.
- **Avoid unnecessary `bindTexture` calls** if you already have the right texture bound.
- **Power-of-two sizing** isn't required in WebGL2. For WebGL1 with `NPOT` sizes, use `CLAMP_TO_EDGE` and `LINEAR`/`NEAREST` (no mipmaps) as shown above.

## Checklist

- [ ] `layoutsubtree` on the canvas.
- [ ] Source element is a direct canvas child.
- [ ] Initial `canvas.requestPaint()` call.
- [ ] `gl.UNPACK_FLIP_Y_WEBGL` set if needed.
- [ ] Filtering set to `LINEAR` for text content.
- [ ] `getElementTransform` used to sync DOM box if content is interactive.

## Reference implementation

See `Examples/webGL.html` and `Examples/webGLSetup.js` in this repo for a complete working example: HTML content rendered onto all six faces of a spinning 3D cube.

## Related

- [guides/render-to-webgpu.md](render-to-webgpu.md) — the same task in WebGPU
- [concepts/synchronization.md](../concepts/synchronization.md) — `getElementTransform` in detail
- [reference/api.md#texelementimage2d](../reference/api.md#texelementimage2d) — full IDL
