import type { Animal, AnimalInstance } from './types';

class RabbitInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 4500;

  constructor(private canvasW: number, private canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    const t = this.elapsed / this.duration;
    const x = -60 * s + (this.canvasW + 120 * s) * t;
    const groundY = this.canvasH * 0.75;
    const hopCount = 5;
    const withinHop = (t * hopCount) % 1;
    const hopPhase = Math.sin(Math.PI * withinHop);
    const y = groundY - this.canvasH * 0.15 * hopPhase;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 12 * s;
    ctx.shadowColor = '#a080ff';

    // Body (squish on ground)
    ctx.fillStyle = '#d0c0e8';
    ctx.beginPath();
    ctx.ellipse(0, -18 * s, 14 * s, 16 * (0.85 + 0.15 * hopPhase) * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left ear
    ctx.save();
    ctx.translate(-5 * s, -33 * s);
    ctx.rotate(-0.15);
    ctx.fillStyle = '#d0c0e8';
    ctx.beginPath();
    ctx.ellipse(0, -12 * s, 4 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0a0b0';
    ctx.beginPath();
    ctx.ellipse(0, -12 * s, 2 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right ear
    ctx.save();
    ctx.translate(5 * s, -33 * s);
    ctx.rotate(0.1);
    ctx.fillStyle = '#d0c0e8';
    ctx.beginPath();
    ctx.ellipse(0, -12 * s, 4 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0a0b0';
    ctx.beginPath();
    ctx.ellipse(0, -12 * s, 2 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.fillStyle = '#d0c0e8';
    ctx.beginPath();
    ctx.arc(-6 * s, -4 * s + hopPhase * 8 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6 * s, -4 * s + hopPhase * 8 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1a0a20';
    ctx.beginPath();
    ctx.arc(8 * s, -22 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#f090a0';
    ctx.beginPath();
    ctx.arc(12 * s, -19 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-14 * s, -16 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class RabbitAnimal implements Animal {
  name = 'Rabbit';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new RabbitInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
