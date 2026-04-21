import type { Animal, AnimalInstance } from './types';
import { getSvgImage } from './svg-cache';
import { WOLF_SVG } from './sprites/wolf';

class WolfInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 3500;
  public x = 0;
  public y = 0;

  constructor(_canvasW: number, _canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    // x and y are set externally by AnimalStage physics.
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const img = getSvgImage(WOLF_SVG);
    if (!img) return; // still loading

    const s = this.scale;

    // Galloping bounce: slight vertical bob applied as a delta on physics y
    const bounce = Math.abs(Math.sin(this.elapsed * 0.010)) * 4 * s;

    const w = 110 * s;
    const h = 90 * s;

    // Wolf sprite faces right; center horizontally, feet at y with bounce offset
    ctx.drawImage(img, this.x - w / 2, this.y - h + bounce, w, h);
  }
}

export class WolfAnimal implements Animal {
  name = 'Wolf';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new WolfInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
