import type { Animal, AnimalInstance } from './types';

class SpiderInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 5000;

  // Leg angles for right side (radians from positive x-axis, pointing right/down)
  private readonly legAngles = [0.8, 1.1, 1.4, 1.8];

  constructor(private canvasW: number, private canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    const baseX = -80 * s + (this.canvasW + 160 * s) * (this.elapsed / this.duration);
    const x = baseX + Math.sin(this.elapsed * 0.003) * 20 * s;
    const y = this.canvasH * 0.82 + Math.sin(this.elapsed * 0.007) * 4 * s;
    const upperLen = 14 * s;
    const lowerLen = 12 * s;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 12 * s;
    ctx.shadowColor = '#9060c0';

    // Draw 8 legs (4 per side)
    ctx.strokeStyle = '#4a2060';
    ctx.lineWidth = 2 * s;
    ctx.lineCap = 'round';

    // Attachment point on cephalothorax
    const attachY = -18 * s;

    for (let i = 0; i < 4; i++) {
      const elbowBend = Math.sin(this.elapsed * 0.006 + i * Math.PI / 4) * 0.5;

      // Right leg
      const rAngle = this.legAngles[i];
      const rElbowX = Math.cos(rAngle) * upperLen;
      const rElbowY = attachY + Math.sin(rAngle) * upperLen;
      const rTipAngle = rAngle + elbowBend + 0.6;
      const rTipX = rElbowX + Math.cos(rTipAngle) * lowerLen;
      const rTipY = rElbowY + Math.sin(rTipAngle) * lowerLen;

      ctx.beginPath();
      ctx.moveTo(0, attachY);
      ctx.lineTo(rElbowX, rElbowY);
      ctx.lineTo(rTipX, rTipY);
      ctx.stroke();

      // Left leg (mirror x)
      const lAngle = Math.PI - this.legAngles[i];
      const lElbowX = Math.cos(lAngle) * upperLen;
      const lElbowY = attachY + Math.sin(lAngle) * upperLen;
      const lTipAngle = lAngle - elbowBend - 0.6;
      const lTipX = lElbowX + Math.cos(lTipAngle) * lowerLen;
      const lTipY = lElbowY + Math.sin(lTipAngle) * lowerLen;

      ctx.beginPath();
      ctx.moveTo(0, attachY);
      ctx.lineTo(lElbowX, lElbowY);
      ctx.lineTo(lTipX, lTipY);
      ctx.stroke();
    }

    // Abdomen
    ctx.fillStyle = '#7040a0';
    ctx.beginPath();
    ctx.arc(0, 0, 14 * s, 0, Math.PI * 2);
    ctx.fill();

    // Cephalothorax
    ctx.beginPath();
    ctx.arc(0, -18 * s, 9 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eyes — white dots with black pupils
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-4 * s, -20 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4 * s, -20 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a0808';
    ctx.beginPath();
    ctx.arc(-4 * s, -20 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4 * s, -20 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class SpiderAnimal implements Animal {
  name = 'Spider';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new SpiderInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
