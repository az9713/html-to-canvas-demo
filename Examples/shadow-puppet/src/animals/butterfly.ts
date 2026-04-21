import type { Animal, AnimalInstance } from './types';

class ButterflyInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 5000;

  constructor(private canvasW: number, private canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    const speed = this.canvasW / this.duration;
    const x = -80 * s + speed * this.elapsed;
    const centerY = this.canvasH * 0.38;
    const y = centerY + this.canvasH * 0.07 * Math.sin(2 * Math.PI * 0.8 * this.elapsed / 1000);
    const flapT = Math.abs(Math.sin(this.elapsed * 0.006));
    const wingSpread = flapT * 36 * s;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 10 * s;
    ctx.shadowColor = '#c090ff';

    // Left forewing
    ctx.fillStyle = 'rgba(150,100,220,0.85)';
    ctx.strokeStyle = 'rgba(200,160,255,0.5)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(0, -6 * s);
    ctx.bezierCurveTo(
      -wingSpread * 0.3, -wingSpread * 0.9,
      -wingSpread, -wingSpread * 0.4,
      -wingSpread * 0.8, 2 * s
    );
    ctx.bezierCurveTo(-wingSpread * 0.5, 8 * s, -4 * s, 4 * s, 0, -6 * s);
    ctx.fill();
    ctx.stroke();

    // Left hindwing
    ctx.fillStyle = 'rgba(200,140,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, 2 * s);
    ctx.bezierCurveTo(
      -wingSpread * 0.4, 4 * s,
      -wingSpread * 0.7, wingSpread * 0.5,
      -wingSpread * 0.4, 14 * s
    );
    ctx.bezierCurveTo(-wingSpread * 0.2, 18 * s, -4 * s, 12 * s, 0, 2 * s);
    ctx.fill();

    // Right wings (mirrored)
    ctx.save();
    ctx.scale(-1, 1);

    ctx.fillStyle = 'rgba(150,100,220,0.85)';
    ctx.strokeStyle = 'rgba(200,160,255,0.5)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(0, -6 * s);
    ctx.bezierCurveTo(
      -wingSpread * 0.3, -wingSpread * 0.9,
      -wingSpread, -wingSpread * 0.4,
      -wingSpread * 0.8, 2 * s
    );
    ctx.bezierCurveTo(-wingSpread * 0.5, 8 * s, -4 * s, 4 * s, 0, -6 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(200,140,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, 2 * s);
    ctx.bezierCurveTo(
      -wingSpread * 0.4, 4 * s,
      -wingSpread * 0.7, wingSpread * 0.5,
      -wingSpread * 0.4, 14 * s
    );
    ctx.bezierCurveTo(-wingSpread * 0.2, 18 * s, -4 * s, 12 * s, 0, 2 * s);
    ctx.fill();

    ctx.restore();

    // Body (drawn on top of wings)
    ctx.fillStyle = '#6040a0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left antenna
    ctx.strokeStyle = '#6040a0';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(-2 * s, -13 * s);
    ctx.quadraticCurveTo(-8 * s, -24 * s, -6 * s, -28 * s);
    ctx.stroke();
    ctx.fillStyle = '#6040a0';
    ctx.beginPath();
    ctx.arc(-6 * s, -28 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Right antenna
    ctx.strokeStyle = '#6040a0';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(2 * s, -13 * s);
    ctx.quadraticCurveTo(8 * s, -24 * s, 6 * s, -28 * s);
    ctx.stroke();
    ctx.fillStyle = '#6040a0';
    ctx.beginPath();
    ctx.arc(6 * s, -28 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class ButterflyAnimal implements Animal {
  name = 'Butterfly';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new ButterflyInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
