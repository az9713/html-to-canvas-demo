import type { Animal, AnimalInstance } from './types';
import { getSvgImage } from './svg-cache';
import { RABBIT_SVG } from './sprites/rabbit';

class RabbitInstance implements AnimalInstance {
  private elapsed = 0;
  private readonly duration = 4500;
  public x = 0;
  public y = 0;

  constructor(_canvasW: number, private canvasH: number, private scale: number) {}

  update(dt: number): boolean {
    this.elapsed += dt;
    // x and y are set externally by AnimalStage physics.
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const img = getSvgImage(RABBIT_SVG);
    if (!img) return; // still loading

    const s = this.scale;
    const hopCount = 5;
    // Use elapsed to drive hop phase independently of horizontal position
    const hopT = (this.elapsed / this.duration) * hopCount;
    const withinHop = hopT % 1;
    const hopPhase = Math.sin(Math.PI * withinHop);

    // y is the physics base; hop lifts the rabbit upward as a delta
    const drawY = this.y - this.canvasH * 0.15 * hopPhase;

    const w = 100 * s;
    const h = 100 * s;

    // Squish on ground: compress vertically when hopPhase is low
    const squishY = 0.85 + 0.15 * hopPhase;

    ctx.save();
    ctx.translate(this.x, drawY);
    ctx.scale(1, squishY);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }
}

export class RabbitAnimal implements Animal {
  name = 'Rabbit';
  spawn(canvasW: number, canvasH: number): AnimalInstance {
    return new RabbitInstance(canvasW, canvasH, Math.min(canvasW, canvasH) / 800);
  }
}
