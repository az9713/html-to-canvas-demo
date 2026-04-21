import type { Animal, AnimalInstance } from './types';

class OwlInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 5000;

  constructor(private canvasW: number, private canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    const x = -80 * s + (this.canvasW + 160 * s) * (this.elapsed / this.duration);
    const y = this.canvasH * 0.45;

    // Wing flap: slow period ~2s
    const wingPhase = (this.elapsed % 2000) / 2000;
    const wingAngle = Math.sin(Math.PI * wingPhase) * 0.4;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.05); // slight banking tilt
    ctx.shadowBlur = 10 * s;
    ctx.shadowColor = '#c0a050';

    // Wings (drawn before body so body overlaps)
    // Left wing
    ctx.save();
    ctx.rotate(-wingAngle);
    ctx.fillStyle = '#a07040';
    ctx.beginPath();
    ctx.ellipse(-18 * s, 0, 16 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.fillStyle = '#a07040';
    ctx.beginPath();
    ctx.ellipse(18 * s, 0, 16 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = '#a07040';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face disk (lighter)
    ctx.fillStyle = '#c09870';
    ctx.beginPath();
    ctx.arc(0, -2 * s, 14 * s, 0, Math.PI * 2);
    ctx.fill();

    // Left eye
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.arc(-5 * s, -4 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0c840';
    ctx.beginPath();
    ctx.arc(-5 * s, -4 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0808';
    ctx.beginPath();
    ctx.arc(-5 * s, -4 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.arc(5 * s, -4 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0c840';
    ctx.beginPath();
    ctx.arc(5 * s, -4 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0808';
    ctx.beginPath();
    ctx.arc(5 * s, -4 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Beak (small diamond)
    ctx.fillStyle = '#c09040';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-3 * s, 3 * s);
    ctx.lineTo(0, 6 * s);
    ctx.lineTo(3 * s, 3 * s);
    ctx.closePath();
    ctx.fill();

    // Feather row along bottom of body (5 bezier bumps)
    ctx.fillStyle = '#a07040';
    const featherY = 16 * s;
    const featherLeft = -12 * s;
    const featherRight = 12 * s;
    const featherStep = (featherRight - featherLeft) / 4;
    ctx.beginPath();
    ctx.moveTo(featherLeft, featherY);
    for (let i = 0; i < 5; i++) {
      const bx = featherLeft + i * featherStep;
      ctx.quadraticCurveTo(bx + featherStep * 0.5, featherY + 6 * s, bx + featherStep, featherY);
    }
    ctx.lineTo(featherRight, featherY - 2 * s);
    ctx.lineTo(featherLeft, featherY - 2 * s);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

export class OwlAnimal implements Animal {
  name = 'Owl';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new OwlInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
