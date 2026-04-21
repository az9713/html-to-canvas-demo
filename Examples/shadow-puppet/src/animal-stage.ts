import type { Animal, AnimalInstance } from './animals/types';
import { BirdAnimal } from './animals/bird';
import { RabbitAnimal } from './animals/rabbit';
import { ButterflyAnimal } from './animals/butterfly';
import { WolfAnimal } from './animals/wolf';
import { DragonAnimal } from './animals/dragon';
import { SnakeAnimal } from './animals/snake';
import { OwlAnimal } from './animals/owl';
import { SpiderAnimal } from './animals/spider';

const ANIMAL_MAP: Record<string, Animal> = {
  Bird: new BirdAnimal(),
  Butterfly: new ButterflyAnimal(),
  Dragon: new DragonAnimal(),
  Spider: new SpiderAnimal(),
  Rabbit: new RabbitAnimal(),
  Owl: new OwlAnimal(),
  Wolf: new WolfAnimal(),
  Snake: new SnakeAnimal(),
};

export class AnimalStage {
  private ctx: CanvasRenderingContext2D;
  private active: AnimalInstance[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  spawn(gestureName: string): void {
    const animal = ANIMAL_MAP[gestureName];
    if (!animal) return;
    this.active.push(animal.spawn(this.canvas.width, this.canvas.height));
  }

  update(dt: number): void {
    this.active = this.active.filter(a => a.update(dt));
  }

  draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const a of this.active) {
      ctx.save();
      a.draw(ctx);
      ctx.restore();
    }
  }
}
