import type { Animal, AnimalInstance } from './types';

class SnakeInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 5000;
  public x = 0;
  public y = 0;

  constructor(_canvasW: number, _canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    // x and y are set externally by AnimalStage physics.
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    // Head position comes from physics x/y; segment chain is derived from headX
    const headX = this.x;
    const headY = this.y;
    const segCount = 14;
    const segSpacing = 10 * s;

    ctx.save();
    ctx.shadowBlur = 12 * s;
    ctx.shadowColor = '#50cc20';

    // Draw segments from tail to head with thicker body and bold outline
    for (let i = segCount - 1; i >= 0; i--) {
      const segX = headX - i * segSpacing;
      const segY = headY + Math.sin(this.elapsed * 0.004 - i * 0.5) * 22 * s;
      // Taper: wide at mid-body, narrow at tail
      const midTaper = 1 - Math.abs(i - segCount * 0.6) / (segCount * 0.6);
      const segR = Math.max((5 + midTaper * 7) * s, 1);

      // Color gradient: tail is dark olive, mid-body bright green, scales pattern
      const blend = i / (segCount - 1); // 1=tail, 0=head
      const r = Math.round(0x28 + (0x48 - 0x28) * (1 - blend));
      const g = Math.round(0x88 + (0xcc - 0x88) * (1 - blend));
      const b = Math.round(0x10 + (0x28 - 0x10) * (1 - blend));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2 * s;

      ctx.beginPath();
      ctx.arc(segX, segY, segR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Scale diamond marks every 3rd segment (belly pattern)
      if (i % 3 === 1 && i < segCount - 1) {
        const dSize = segR * 0.55;
        ctx.fillStyle = `rgba(${r + 24},${g + 20},${b + 10},0.55)`;
        ctx.beginPath();
        ctx.moveTo(segX, segY - dSize);
        ctx.lineTo(segX + dSize * 0.7, segY);
        ctx.lineTo(segX, segY + dSize);
        ctx.lineTo(segX - dSize * 0.7, segY);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Head — larger, distinct shape
    const headR = 11 * s;
    ctx.fillStyle = '#72cc42';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    // Slightly elongated head shape
    ctx.ellipse(headX, headY, headR * 1.3, headR, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye — larger with slit pupil
    const eyeX = headX + 8 * s;
    const eyeY = headY - 5 * s;
    ctx.fillStyle = '#f0e840';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Vertical slit pupil
    ctx.fillStyle = '#0a0808';
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 1.2 * s, 3.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Forked tongue — always visible, tip flickers in speed
    const tongueFlicker = 0.8 + 0.2 * Math.sin(this.elapsed * 0.05);
    ctx.strokeStyle = '#dd1515';
    ctx.lineWidth = 2 * s;
    ctx.lineCap = 'round';
    const tongueBase = headX + headR * 1.3;
    const tongueLen = 9 * s * tongueFlicker;
    const forkLen = 5 * s * tongueFlicker;
    const forkAngleUp = -Math.PI / 10;
    const forkAngleDown = Math.PI / 10;

    // Stem
    ctx.beginPath();
    ctx.moveTo(tongueBase, headY);
    const midX = tongueBase + tongueLen * 0.6;
    ctx.lineTo(midX, headY);
    ctx.stroke();

    // Upper fork
    ctx.beginPath();
    ctx.moveTo(midX, headY);
    ctx.lineTo(midX + Math.cos(forkAngleUp) * forkLen, headY + Math.sin(forkAngleUp) * forkLen);
    ctx.stroke();

    // Lower fork
    ctx.beginPath();
    ctx.moveTo(midX, headY);
    ctx.lineTo(midX + Math.cos(forkAngleDown) * forkLen, headY + Math.sin(forkAngleDown) * forkLen);
    ctx.stroke();

    ctx.restore();
  }
}

export class SnakeAnimal implements Animal {
  name = 'Snake';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new SnakeInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
