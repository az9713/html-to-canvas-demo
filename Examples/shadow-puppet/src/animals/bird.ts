import type { Animal, AnimalInstance } from './types';
import { getSvgImage } from './svg-cache';
import { BIRD_BODY_SVG, BIRD_WING_SVG } from './sprites/bird';

class BirdInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 4000;
  public x = 0;
  public y = 0;

  constructor(_canvasW: number, _canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    // x and y are set externally by AnimalStage physics; we only track elapsed for animation.
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scale;
    const bodyImg = getSvgImage(BIRD_BODY_SVG);
    const wingImg = getSvgImage(BIRD_WING_SVG);
    if (!bodyImg || !wingImg) return; // still loading

    const bodyW = 80 * s;
    const bodyH = 60 * s;
    const wingW = 70 * s;
    const wingH = 50 * s;
    // flapAngle: 0 = fully down, PI*0.45 = up
    const flapAngle = Math.PI * 0.45 * Math.abs(Math.sin(this.elapsed * 0.008));

    // Left wing — pivot is the right edge of the wing image (body-attachment side)
    ctx.save();
    ctx.translate(this.x - 18 * s, this.y);
    ctx.rotate(-flapAngle);
    ctx.drawImage(wingImg, -wingW, -wingH / 2, wingW, wingH);
    ctx.restore();

    // Right wing (mirror left)
    ctx.save();
    ctx.translate(this.x + 18 * s, this.y);
    ctx.scale(-1, 1);
    ctx.rotate(-flapAngle);
    ctx.drawImage(wingImg, -wingW, -wingH / 2, wingW, wingH);
    ctx.restore();

    // Body (centered on this.x, this.y)
    ctx.drawImage(bodyImg, this.x - bodyW / 2, this.y - bodyH / 2, bodyW, bodyH);
  }
}

export class BirdAnimal implements Animal {
  name = 'Bird';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new BirdInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
