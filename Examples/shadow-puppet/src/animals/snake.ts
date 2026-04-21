import type { Animal, AnimalInstance } from './types';

class SnakeInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 5000;

  constructor(private canvasW: number, private canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    const headX = -60 * s + (this.canvasW + 120 * s) * (this.elapsed / this.duration);
    const headY = this.canvasH * 0.80;
    const segCount = 12;
    const segSpacing = 9 * s;

    ctx.save();
    ctx.shadowBlur = 8 * s;
    ctx.shadowColor = '#70d030';

    // Draw segments from tail to head
    for (let i = segCount - 1; i >= 0; i--) {
      const segX = headX - i * segSpacing;
      const segY = headY + Math.sin(this.elapsed * 0.004 - i * 0.5) * 18 * s;
      const segR = (8 - i * 0.4) * s;

      // Interpolate color from tail (#1a3010) to head (#2a5020)
      const blend = i / (segCount - 1); // 1 at tail, 0 at head
      const r = Math.round(0x30 + (0x60 - 0x30) * (1 - blend));
      const g = Math.round(0x90 + (0xb0 - 0x90) * (1 - blend));
      const b = Math.round(0x20 + (0x40 - 0x20) * (1 - blend));
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      ctx.beginPath();
      ctx.arc(segX, segY, Math.max(segR, 1), 0, Math.PI * 2);
      ctx.fill();
    }

    // Head (slightly larger, distinct colour)
    ctx.fillStyle = '#70c040';
    ctx.beginPath();
    ctx.arc(headX, headY, 8 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eye — white dot with black pupil
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(headX + 6 * s, headY - 3 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0808';
    ctx.beginPath();
    ctx.arc(headX + 6 * s, headY - 3 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // Tongue — flicker when sin value is above threshold
    if (Math.sin(this.elapsed * 0.05) > 0.7) {
      ctx.strokeStyle = '#cc2020';
      ctx.lineWidth = 1.5 * s;
      ctx.lineCap = 'round';
      const tongueBase = headX + 14 * s;
      const tongueLen = 8 * s;
      const angleUp = -Math.PI / 12;   // +15 degrees (upward fork)
      const angleDown = Math.PI / 12;  // -15 degrees (downward fork)
      ctx.beginPath();
      ctx.moveTo(tongueBase, headY);
      ctx.lineTo(tongueBase + Math.cos(angleUp) * tongueLen, headY + Math.sin(angleUp) * tongueLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tongueBase, headY);
      ctx.lineTo(tongueBase + Math.cos(angleDown) * tongueLen, headY + Math.sin(angleDown) * tongueLen);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class SnakeAnimal implements Animal {
  name = 'Snake';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new SnakeInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
