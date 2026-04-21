import type { Animal, AnimalInstance } from './types';
import { getSvgImage } from './svg-cache';
import { OWL_SVG } from './sprites/owl';

class OwlInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 5000;
  public x = 0;
  public y = 0;

  constructor(_canvasW: number, _canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    // x and y are set externally by AnimalStage physics.
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const img = getSvgImage(OWL_SVG);
    if (!img) return; // still loading

    const s = this.scale;

    // Slow wing bob: gentle vertical oscillation as a delta on physics y
    const bob = Math.sin(this.elapsed * 0.003) * 6 * s;
    // Slight banking tilt
    const tilt = 0.05;

    const w = 100 * s;
    const h = 100 * s;

    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.rotate(tilt);
    // Center the sprite on the owl's body center
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

export class OwlAnimal implements Animal {
  name = 'Owl';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new OwlInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
