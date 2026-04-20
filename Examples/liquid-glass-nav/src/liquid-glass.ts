/**
 * LiquidGlass — 2D canvas compositor for the liquid-glass demo.
 *
 * The canvas contains ONE direct child (pageEl). The nav (navEl) lives
 * OUTSIDE the canvas as a regular DOM element with position:fixed — we
 * use its on-screen bounding rect to decide where to render the frosted
 * glass zone within the canvas.
 *
 * Each paint:
 *   1. drawElementImage(pageEl) to fill the canvas, offset by scrollY.
 *   2. Clip to the nav's bounding rect and overlay a blurred + chromatically
 *      shifted copy of the page (that's the "frosted glass").
 *   3. The nav DOM renders on top via z-index, so its text and focus ring
 *      are above the frosted zone.
 */

export class LiquidGlass {
  private ctx: CanvasRenderingContext2D;

  constructor(
    private canvas: HTMLCanvasElement,
    private navEl: HTMLElement,
    private pageEl: HTMLElement,
  ) {
    this.ctx = canvas.getContext('2d')!;
  }

  init() {
    this.setupHandlers();
    this.setupPaint();
  }

  private scrollY = 0;
  private targetY = 0;

  onResize(_w: number, _h: number) {
    this.canvas.requestPaint();
  }

  private maxScroll() {
    const pageH = this.pageEl.getBoundingClientRect().height;
    const viewH = this.canvas.getBoundingClientRect().height;
    return Math.max(0, pageH - viewH);
  }

  private setupHandlers() {
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetY = Math.max(0, Math.min(this.maxScroll(), this.targetY + e.deltaY));
      this.canvas.requestPaint();
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        this.targetY = Math.min(this.maxScroll(), this.targetY + (e.key === 'PageDown' ? 600 : 60));
        e.preventDefault();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        this.targetY = Math.max(0, this.targetY - (e.key === 'PageUp' ? 600 : 60));
        e.preventDefault();
      } else if (e.key === 'Home') {
        this.targetY = 0; e.preventDefault();
      } else if (e.key === 'End') {
        this.targetY = this.maxScroll(); e.preventDefault();
      }
      this.canvas.requestPaint();
    });
  }

  private setupPaint() {
    this.canvas.onpaint = () => {
      this.scrollY += (this.targetY - this.scrollY) * 0.18;

      const W = this.canvas.width;
      const H = this.canvas.height;
      const ctx = this.ctx;
      if (!W || !H) return;

      const dpr = window.devicePixelRatio || 1;
      const pageRect = this.pageEl.getBoundingClientRect();
      const pageW = pageRect.width * dpr;
      const pageH = pageRect.height * dpr;

      ctx.reset();
      ctx.fillStyle = '#faf8f3';
      ctx.fillRect(0, 0, W, H);

      // 1. Draw the page, offset by scrollY.
      ctx.save();
      ctx.translate(0, -this.scrollY * dpr);
      ctx.drawElementImage(this.pageEl, 0, 0, pageW, pageH);
      ctx.restore();

      // 2. Frosted-glass zone at the nav's bounding rect.
      const canvasRect = this.canvas.getBoundingClientRect();
      const navRect = this.navEl.getBoundingClientRect();
      const scale = W / canvasRect.width;
      const navX = (navRect.left - canvasRect.left) * scale;
      const navY = (navRect.top - canvasRect.top) * scale;
      const navW = navRect.width * scale;
      const navH = navRect.height * scale;
      const radius = Math.min(navW, navH) * 0.5;

      // Rounded-rect clip.
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, navX, navY, navW, navH, radius);
      ctx.clip();

      // Layer 1: blurred background.
      ctx.save();
      ctx.translate(0, -this.scrollY * dpr);
      ctx.filter = 'blur(14px) saturate(1.1)';
      ctx.drawElementImage(this.pageEl, -4 * dpr, 0, pageW, pageH);
      ctx.restore();

      // Layer 2: chromatic-shifted copy (lighter blend, slight offset).
      ctx.save();
      ctx.translate(0, -this.scrollY * dpr);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25;
      ctx.filter = 'blur(18px)';
      ctx.drawElementImage(this.pageEl, 6 * dpr, 0, pageW, pageH);
      ctx.restore();

      // Layer 3: white frost overlay.
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(navX, navY, navW, navH);
      ctx.restore();

      // Layer 4: soft rim highlight.
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rimGrad = ctx.createLinearGradient(0, navY, 0, navY + navH);
      rimGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
      rimGrad.addColorStop(0.5, 'rgba(255,255,255,0.04)');
      rimGrad.addColorStop(1, 'rgba(255,255,255,0.25)');
      ctx.fillStyle = rimGrad;
      ctx.fillRect(navX, navY, navW, navH);
      ctx.restore();

      ctx.restore(); // end clip

      // Glass outline.
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = Math.max(1, 1.2 * dpr);
      ctx.beginPath();
      roundRect(ctx, navX + 0.5, navY + 0.5, navW - 1, navH - 1, radius);
      ctx.stroke();
      ctx.restore();

      // Keep easing.
      if (Math.abs(this.targetY - this.scrollY) > 0.5) {
        this.canvas.requestPaint();
      }
    };
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
