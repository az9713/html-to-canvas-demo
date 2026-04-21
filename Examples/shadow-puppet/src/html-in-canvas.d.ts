// Ambient types for the HTML-in-Canvas proposal (WICG, behind flag in
// Chromium Canary). Standard TypeScript lib definitions don't include these
// yet. See ../../docs/reference/idl.md for the full IDL.

interface PaintEvent extends Event {
  readonly changedElements: readonly Element[];
}

interface ElementImage {
  readonly width: number;
  readonly height: number;
  close(): void;
}

interface HTMLCanvasElement {
  layoutSubtree: boolean;
  onpaint: ((this: HTMLCanvasElement, ev: PaintEvent) => any) | null;
  requestPaint(): void;
  captureElementImage(element: Element): ElementImage;
  getElementTransform(
    element: Element | ElementImage,
    drawTransform: DOMMatrix
  ): DOMMatrix;
}

interface OffscreenCanvas {
  getElementTransform(
    element: Element | ElementImage,
    drawTransform: DOMMatrix
  ): DOMMatrix;
}

interface CanvasRenderingContext2D {
  drawElementImage(
    element: Element | ElementImage,
    dx: number, dy: number,
    dwidth?: number, dheight?: number
  ): DOMMatrix;
  drawElementImage(
    element: Element | ElementImage,
    sx: number, sy: number, swidth: number, sheight: number,
    dx: number, dy: number,
    dwidth?: number, dheight?: number
  ): DOMMatrix;
}

interface OffscreenCanvasRenderingContext2D {
  drawElementImage(
    element: Element | ElementImage,
    dx: number, dy: number,
    dwidth?: number, dheight?: number
  ): DOMMatrix;
}

interface WebGLRenderingContextBase {
  texElementImage2D(
    target: GLenum, level: GLint, internalformat: GLint,
    format: GLenum, type: GLenum, element: Element | ElementImage
  ): void;
  texElementImage2D(
    target: GLenum, level: GLint, internalformat: GLint,
    width: GLsizei, height: GLsizei,
    format: GLenum, type: GLenum, element: Element | ElementImage
  ): void;
}

interface GPUQueue {
  copyElementImageToTexture(
    source: Element | ElementImage,
    destination: GPUImageCopyTextureTagged
  ): void;
  copyElementImageToTexture(
    source: Element | ElementImage,
    width: number, height: number,
    destination: GPUImageCopyTextureTagged
  ): void;
  copyElementImageToTexture(
    source: Element | ElementImage,
    sx: number, sy: number, swidth: number, sheight: number,
    destination: GPUImageCopyTextureTagged
  ): void;
}
