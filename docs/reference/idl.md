# Raw WebIDL

The complete, authoritative IDL for HTML-in-Canvas. If the human-readable reference and this file disagree, this file wins.

## HTMLCanvasElement additions

```idl
partial interface HTMLCanvasElement {
  [CEReactions, Reflect] attribute boolean layoutSubtree;

  attribute EventHandler onpaint;

  void requestPaint();

  ElementImage captureElementImage(Element element);

  DOMMatrix getElementTransform(
    (Element or ElementImage) element,
    DOMMatrix drawTransform
  );
};
```

## OffscreenCanvas additions

```idl
partial interface OffscreenCanvas {
  DOMMatrix getElementTransform(
    (Element or ElementImage) element,
    DOMMatrix drawTransform
  );
};
```

## CanvasDrawElementImage mixin

Included by both `CanvasRenderingContext2D` and `OffscreenCanvasRenderingContext2D`.

```idl
interface mixin CanvasDrawElementImage {
  DOMMatrix drawElementImage(
    (Element or ElementImage) element,
    unrestricted double dx, unrestricted double dy);

  DOMMatrix drawElementImage(
    (Element or ElementImage) element,
    unrestricted double dx, unrestricted double dy,
    unrestricted double dwidth, unrestricted double dheight);

  DOMMatrix drawElementImage(
    (Element or ElementImage) element,
    unrestricted double sx, unrestricted double sy,
    unrestricted double swidth, unrestricted double sheight,
    unrestricted double dx, unrestricted double dy);

  DOMMatrix drawElementImage(
    (Element or ElementImage) element,
    unrestricted double sx, unrestricted double sy,
    unrestricted double swidth, unrestricted double sheight,
    unrestricted double dx, unrestricted double dy,
    unrestricted double dwidth, unrestricted double dheight);
};

CanvasRenderingContext2D includes CanvasDrawElementImage;
OffscreenCanvasRenderingContext2D includes CanvasDrawElementImage;
```

## WebGLRenderingContext additions

```idl
partial interface WebGLRenderingContext {
  void texElementImage2D(
    GLenum target, GLint level, GLint internalformat,
    GLenum format, GLenum type,
    (Element or ElementImage) element);

  void texElementImage2D(
    GLenum target, GLint level, GLint internalformat,
    GLsizei width, GLsizei height,
    GLenum format, GLenum type,
    (Element or ElementImage) element);

  void texElementImage2D(
    GLenum target, GLint level, GLint internalformat,
    GLfloat sx, GLfloat sy, GLfloat swidth, GLfloat sheight,
    GLenum format, GLenum type,
    (Element or ElementImage) element);

  void texElementImage2D(
    GLenum target, GLint level, GLint internalformat,
    GLfloat sx, GLfloat sy, GLfloat swidth, GLfloat sheight,
    GLsizei width, GLsizei height,
    GLenum format, GLenum type,
    (Element or ElementImage) element);
};
```

## GPUQueue additions

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

## PaintEvent

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

## ElementImage

```idl
[Exposed=(Window,Worker), Transferable]
interface ElementImage {
  readonly attribute double width;
  readonly attribute double height;
  undefined close();
};
```

## Stability

This IDL is **not stable**. The feature is in developer trial behind the `chrome://flags/#canvas-draw-element` flag. Expect breaking changes. Track the canonical IDL at [github.com/WICG/html-in-canvas/blob/main/README.md](https://github.com/WICG/html-in-canvas/blob/main/README.md#idl-changes).
