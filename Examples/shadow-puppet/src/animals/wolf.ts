import type { Animal, AnimalInstance } from './types';

class WolfInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 3500;

  constructor(private canvasW: number, private canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    const x = -80 * s + (this.canvasW + 160 * s) * (this.elapsed / this.duration);
    const y = this.canvasH * 0.72;
    const swing = Math.sin(this.elapsed * 0.005) * 8 * s;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 12 * s;
    ctx.shadowColor = '#8090d0';
    ctx.fillStyle = '#6a7aa0';

    // Tail (drawn first, behind body)
    ctx.strokeStyle = '#6a7aa0';
    ctx.lineWidth = 5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22 * s, -12 * s);
    ctx.bezierCurveTo(
      -35 * s, -12 * s + swing,
      -45 * s, -20 * s + swing,
      -40 * s, -28 * s
    );
    ctx.stroke();

    // Gallop legs (4 legs)
    const phaseOffsets = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5];
    const legBaseX = [-10 * s, 10 * s, -6 * s, 6 * s];

    ctx.fillStyle = '#6a7aa0';
    for (let i = 0; i < 4; i++) {
      const legY = Math.abs(Math.sin(this.elapsed * 0.010 + phaseOffsets[i])) * 12 * s;
      const legHeight = 8 * s + legY;
      ctx.fillRect(legBaseX[i] - 1.5 * s, 0, 3 * s, legHeight);
    }

    // Body
    ctx.beginPath();
    ctx.ellipse(0, -12 * s, 22 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(20 * s, -18 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();

    // Left ear
    ctx.beginPath();
    ctx.moveTo(14 * s, -26 * s);
    ctx.lineTo(18 * s, -34 * s);
    ctx.lineTo(22 * s, -26 * s);
    ctx.closePath();
    ctx.fill();

    // Right ear
    ctx.beginPath();
    ctx.moveTo(20 * s, -26 * s);
    ctx.lineTo(24 * s, -34 * s);
    ctx.lineTo(28 * s, -26 * s);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#f0f0ff';
    ctx.beginPath();
    ctx.arc(24 * s, -19 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#4a5a80';
    ctx.beginPath();
    ctx.arc(28 * s, -15 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class WolfAnimal implements Animal {
  name = 'Wolf';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new WolfInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
