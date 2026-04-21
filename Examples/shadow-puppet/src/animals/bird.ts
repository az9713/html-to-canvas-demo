import type { Animal, AnimalInstance } from './types';

class BirdInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 4000;
  private x = 0;
  private y = 0;

  constructor(private canvasW: number, private canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    const t = this.elapsed / this.duration;
    this.x = -100 * this.scale + (this.canvasW + 200 * this.scale) * t;
    this.y = this.canvasH * 0.55 - this.canvasH * 0.35 * Math.sin(Math.PI * t);
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    const flapMag = 0.5 + 0.5 * Math.abs(Math.sin(this.elapsed * 0.008));

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowBlur = 15 * s;
    ctx.shadowColor = '#60a0ff';
    ctx.fillStyle = '#5aa0ff';

    // Left wing
    ctx.beginPath();
    ctx.moveTo(-4 * s, 0);
    ctx.bezierCurveTo(-20 * s, -28 * s * flapMag, -45 * s, -20 * s * flapMag, -38 * s, 0);
    ctx.bezierCurveTo(-25 * s, 4 * s, -12 * s, 3 * s, -4 * s, 0);
    ctx.fill();
    // Wing outline
    ctx.strokeStyle = '#3080e0';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();

    // Right wing (mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.beginPath();
    ctx.moveTo(-4 * s, 0);
    ctx.bezierCurveTo(-20 * s, -28 * s * flapMag, -45 * s, -20 * s * flapMag, -38 * s, 0);
    ctx.bezierCurveTo(-25 * s, 4 * s, -12 * s, 3 * s, -4 * s, 0);
    ctx.fillStyle = '#5aa0ff';
    ctx.fill();
    ctx.strokeStyle = '#3080e0';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = '#5aa0ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#5aa0ff';
    ctx.beginPath();
    ctx.arc(22 * s, -4 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlight
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(24 * s, -5 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a2040';
    ctx.beginPath();
    ctx.arc(24 * s, -5 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f0a050';
    ctx.beginPath();
    ctx.moveTo(27 * s, -4 * s);
    ctx.lineTo(34 * s, -3 * s);
    ctx.lineTo(27 * s, -1 * s);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

export class BirdAnimal implements Animal {
  name = 'Bird';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new BirdInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
