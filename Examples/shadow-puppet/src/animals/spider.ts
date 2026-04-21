import type { Animal, AnimalInstance } from './types';
import { getSvgImage } from './svg-cache';
import { SPIDER_BODY_SVG } from './sprites/spider';

class SpiderInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 5000;
  public x = 0;
  public y = 0;

  // Leg angles for right side (radians from positive x-axis, pointing right/down)
  private readonly legAngles = [0.8, 1.1, 1.4, 1.8];

  constructor(_canvasW: number, _canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    // x and y are set externally by AnimalStage physics.
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    // Skittering x-wobble and y-jitter applied as deltas on the physics position
    const drawX = this.x + Math.sin(this.elapsed * 0.003) * 20 * s;
    const drawY = this.y + Math.sin(this.elapsed * 0.007) * 4 * s;
    const upperLen = 14 * s;
    const lowerLen = 12 * s;

    ctx.save();
    ctx.translate(drawX, drawY);

    // Draw 8 legs (4 per side) — Canvas 2D IK
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

    // Replace body drawing with SVG sprite.
    // The SVG has abdomen centered at (100,130) and cephalothorax at (100,52) in a 200x200 viewBox.
    // We map that to canvas space: abdomen sits at (0,0), cephalothorax at (0,-attachY*2).
    // Draw the sprite so its center maps to (0, -9*s) which is midway between the two body parts.
    const bodyImg = getSvgImage(SPIDER_BODY_SVG);
    if (bodyImg) {
      const bodyW = 52 * s;
      const bodyH = 52 * s;
      ctx.drawImage(bodyImg, -bodyW / 2, -bodyH * 0.65, bodyW, bodyH);
    }

    ctx.restore();
  }
}

export class SpiderAnimal implements Animal {
  name = 'Spider';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new SpiderInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
