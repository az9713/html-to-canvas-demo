import type { Animal, AnimalInstance } from './types';
import { getSvgImage } from './svg-cache';
import { BUTTERFLY_BODY_SVG, BUTTERFLY_WING_SVG } from './sprites/butterfly';

class ButterflyInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 5000;
  public x = 0;
  public y = 0;

  constructor(_canvasW: number, private canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    // x and y are set externally by AnimalStage physics.
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const bodyImg = getSvgImage(BUTTERFLY_BODY_SVG);
    const wingImg = getSvgImage(BUTTERFLY_WING_SVG);
    if (!bodyImg || !wingImg) return; // still loading

    const s = this.scale;
    // Gentle y-wobble applied as a delta on top of the physics y position
    const yWobble = this.canvasH * 0.07 * Math.sin(2 * Math.PI * 0.8 * this.elapsed / 1000);
    const drawX = this.x;
    const drawY = this.y + yWobble;

    // flapAngle: how far wings are rotated out from center
    // 0 = wings horizontal (fully open), positive = wings folded up
    const flapT = Math.abs(Math.sin(this.elapsed * 0.006));
    const flapAngle = Math.PI * 0.5 * (1 - flapT); // 0 when open, PI/2 when closed

    const wingW = 80 * s;
    const wingH = 80 * s;
    const bodyW = 28 * s;
    const bodyH = 60 * s;

    // Left wing — pivot at right edge center of wing image (body attachment)
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(flapAngle);
    ctx.drawImage(wingImg, -wingW, -wingH / 2, wingW, wingH);
    ctx.restore();

    // Right wing (mirrored left)
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(-1, 1);
    ctx.rotate(flapAngle);
    ctx.drawImage(wingImg, -wingW, -wingH / 2, wingW, wingH);
    ctx.restore();

    // Body on top of wings, centered
    ctx.drawImage(bodyImg, drawX - bodyW / 2, drawY - bodyH / 2, bodyW, bodyH);
  }
}

export class ButterflyAnimal implements Animal {
  name = 'Butterfly';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new ButterflyInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
