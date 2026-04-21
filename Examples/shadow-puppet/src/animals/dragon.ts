import type { Animal, AnimalInstance } from './types';
import { getSvgImage } from './svg-cache';
import { DRAGON_BODY_SVG, DRAGON_WING_SVG } from './sprites/dragon';

class DragonInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 4000;
  public x = 0;
  public y = 0;

  constructor(_canvasW: number, _canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    // x and y are set externally by AnimalStage physics.
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const bodyImg = getSvgImage(DRAGON_BODY_SVG);
    const wingImg = getSvgImage(DRAGON_WING_SVG);
    if (!bodyImg || !wingImg) return; // still loading

    const s = this.scale;

    const bodyW = 110 * s;
    const bodyH = 80 * s;
    const wingW = 90 * s;
    const wingH = 90 * s;

    // Wing flap angle: oscillates up and down
    const flapAngle = Math.PI * 0.35 * Math.sin(this.elapsed * 0.005);

    // Dragon faces left — we flip the whole drawing horizontally
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(-1, 1); // flip to face left

    // Upper wing — pivot at right edge (body attachment point)
    ctx.save();
    ctx.rotate(-flapAngle);
    ctx.drawImage(wingImg, -wingW, -wingH / 2, wingW, wingH);
    ctx.restore();

    // Lower wing (same side, slight angle difference for depth)
    ctx.save();
    ctx.scale(-1, 1); // second flip = face right again for lower wing
    ctx.rotate(flapAngle);
    ctx.drawImage(wingImg, -wingW, -wingH / 2, wingW, wingH);
    ctx.restore();

    // Body centered
    ctx.drawImage(bodyImg, -bodyW / 2, -bodyH / 2, bodyW, bodyH);

    ctx.restore();
  }
}

export class DragonAnimal implements Animal {
  name = 'Dragon';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new DragonInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
