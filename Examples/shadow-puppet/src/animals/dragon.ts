import type { Animal, AnimalInstance } from './types';

class DragonInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 4000;

  constructor(private canvasW: number, private canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    const t = this.elapsed / this.duration;
    const x = this.canvasW + 60 * s - (this.canvasW + 120 * s) * t;
    const y = -40 * s + this.canvasH * 0.8 * t + this.canvasH * 0.15 * Math.sin(Math.PI * t);

    ctx.save();
    ctx.translate(x, y);
    // Flip to face left
    ctx.scale(-1, 1);
    ctx.shadowBlur = 18 * s;
    ctx.shadowColor = '#6090ff';

    // Tail: chain of 5 shrinking circles behind body
    for (let i = 4; i >= 0; i--) {
      const tailX = -(30 * s + i * 5 * s);
      const tailY = Math.sin(this.elapsed * 0.005 + i) * 3 * s;
      const tailR = (5 - i * 0.7) * s;
      ctx.fillStyle = '#5a7ab0';
      ctx.beginPath();
      ctx.arc(tailX, tailY, Math.max(tailR, 0.5 * s), 0, Math.PI * 2);
      ctx.fill();
    }

    // Left wing
    ctx.fillStyle = 'rgba(80,120,200,0.9)';
    ctx.strokeStyle = 'rgba(140,180,255,0.7)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(-8 * s, -4 * s);
    ctx.quadraticCurveTo(-50 * s, -50 * s, -55 * s, -5 * s);
    ctx.quadraticCurveTo(-35 * s, 10 * s, -8 * s, 4 * s);
    ctx.fill();
    ctx.stroke();

    // Right wing (mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(80,120,200,0.9)';
    ctx.strokeStyle = 'rgba(140,180,255,0.7)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(-8 * s, -4 * s);
    ctx.quadraticCurveTo(-50 * s, -50 * s, -55 * s, -5 * s);
    ctx.quadraticCurveTo(-35 * s, 10 * s, -8 * s, 4 * s);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = '#5a7ab0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 28 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(26 * s, 0, 11 * s, 0, Math.PI * 2);
    ctx.fill();

    // Left horn
    ctx.beginPath();
    ctx.moveTo(22 * s, -10 * s);
    ctx.lineTo(19 * s, -22 * s);
    ctx.lineTo(25 * s, -11 * s);
    ctx.closePath();
    ctx.fill();

    // Right horn
    ctx.beginPath();
    ctx.moveTo(28 * s, -10 * s);
    ctx.lineTo(31 * s, -22 * s);
    ctx.lineTo(33 * s, -11 * s);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ff4000';
    ctx.beginPath();
    ctx.arc(28 * s, -3 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (open arc)
    ctx.strokeStyle = '#6090c0';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(36 * s, 4 * s, 5 * s, 0.1, 1.0);
    ctx.stroke();

    // Fire (3 overlapping arcs)
    const savedAlpha = ctx.globalAlpha;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ff6020';
    const fireRadii = [6 * s, 5 * s, 4 * s];
    const fireOffsets = [0, 4 * s, 8 * s];
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(42 * s + fireOffsets[i], 4 * s, fireRadii[i], 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = savedAlpha;

    ctx.restore();
  }
}

export class DragonAnimal implements Animal {
  name = 'Dragon';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new DragonInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
