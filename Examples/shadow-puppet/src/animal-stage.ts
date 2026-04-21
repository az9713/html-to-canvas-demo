import type { Animal, AnimalInstance } from './animals/types';
import { BirdAnimal } from './animals/bird';
import { RabbitAnimal } from './animals/rabbit';
import { ButterflyAnimal } from './animals/butterfly';
import { WolfAnimal } from './animals/wolf';
import { DragonAnimal } from './animals/dragon';
import { SnakeAnimal } from './animals/snake';
import { OwlAnimal } from './animals/owl';
import { SpiderAnimal } from './animals/spider';
import { preloadSvgs } from './animals/svg-cache';
import {
  BIRD_BODY_SVG,
  BIRD_WING_SVG,
  BUTTERFLY_BODY_SVG,
  BUTTERFLY_WING_SVG,
  DRAGON_BODY_SVG,
  DRAGON_WING_SVG,
  SPIDER_BODY_SVG,
  RABBIT_SVG,
  WOLF_SVG,
  OWL_SVG,
} from './animals/sprites';

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

// ── Canvas 2D particle system ──────────────────────────────────────────────

interface Particle {
  x: number;   // UV 0..1
  y: number;   // UV 0..1
  vx: number;
  vy: number;
  life: number;    // 0..1 lifecycle
  speed: number;   // lifecycle rate multiplier
  size: number;    // base radius px (before canvas scale)
  hue: number;     // HSL hue degrees
}

class ParticleSystem {
  private particles: Particle[] = [];
  private readonly count = 72;

  constructor() {
    for (let i = 0; i < this.count; i++) {
      this.particles.push(this.make(Math.random()));
    }
  }

  private make(startLife = 0): Particle {
    return {
      x: Math.random(),
      y: 1.0 - startLife * 0.8,
      vx: (Math.random() - 0.5) * 0.000035,
      vy: -(0.00006 + Math.random() * 0.00012),
      life: startLife,
      speed: 0.4 + Math.random() * 0.8,
      size: 1.5 + Math.random() * 3.0,
      hue: 210 + Math.random() * 140, // blue → cyan → purple
    };
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life += dt * 0.00022 * p.speed;
      if (p.life >= 1.0 || p.y < -0.05) {
        const fresh = this.make(0);
        Object.assign(p, fresh);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Gentle horizontal drift
      p.vx += (Math.random() - 0.5) * 0.000006;
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    for (const p of this.particles) {
      // Fade-in first 15%, fade-out last 20%
      let alpha: number;
      if (p.life < 0.15)      alpha = p.life / 0.15;
      else if (p.life > 0.80) alpha = (1.0 - p.life) / 0.20;
      else                    alpha = 1.0;

      const x = p.x * w;
      const y = p.y * h;
      const r = p.size;

      // Inner bright core
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = `hsl(${p.hue}deg, 90%, 88%)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Outer soft halo (larger radius, lower opacity)
      ctx.globalAlpha = alpha * 0.18;
      ctx.fillStyle = `hsl(${p.hue}deg, 80%, 70%)`;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ──────────────────────────────────────────────────────────────────────────

const MAX_ANIMALS = 8;
const SEPARATION_RADIUS = 120;  // pixels — min distance between animal centers
const SEPARATION_FORCE = 0.15;  // how strongly they push apart each frame
const WANDER_STRENGTH = 0.003;  // how fast wander angle changes (radians per ms)
const SPEED = 0.08;             // base speed in px/ms

interface PhysicsAnimal {
  instance: AnimalInstance;
  x: number;
  y: number;
  vx: number;
  vy: number;
  wanderAngle: number;  // angle of current wander direction
  radius: number;       // collision radius for this animal
}

export class AnimalStage {
  private ctx: CanvasRenderingContext2D;
  private active: PhysicsAnimal[] = [];
  private particles = new ParticleSystem();

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  async init(): Promise<void> {
    await preloadSvgs([
      BIRD_BODY_SVG, BIRD_WING_SVG,
      BUTTERFLY_BODY_SVG, BUTTERFLY_WING_SVG,
      DRAGON_BODY_SVG, DRAGON_WING_SVG,
      SPIDER_BODY_SVG,
      RABBIT_SVG,
      WOLF_SVG,
      OWL_SVG,
    ]);
  }

  spawn(gestureName: string): void {
    if (this.active.length >= MAX_ANIMALS) return;

    const animal = ANIMAL_MAP[gestureName];
    if (!animal) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const instance = animal.spawn(w, h);

    // Pick a random start position away from existing animals
    let x = 0;
    let y = 0;
    let attempts = 0;
    do {
      x = w * 0.1 + Math.random() * w * 0.8;
      y = h * 0.1 + Math.random() * h * 0.8;
      attempts++;
    } while (attempts < 20 && this.active.some(a => dist(a.x, a.y, x, y) < SEPARATION_RADIUS * 1.5));

    // Set initial position on the instance so first draw is correct
    instance.x = x;
    instance.y = y;

    // Random initial velocity direction
    const angle = Math.random() * Math.PI * 2;
    const speed = SPEED * (0.6 + Math.random() * 0.8);

    this.active.push({
      instance,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      wanderAngle: angle,
      radius: 60,
    });
  }

  update(dt: number): void {
    this.particles.update(dt);
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Update animation state and apply physics
    this.active = this.active.filter(pa => {
      const alive = pa.instance.update(dt);

      // Wander: slowly rotate the direction
      pa.wanderAngle += (Math.random() - 0.5) * WANDER_STRENGTH * dt;

      // Apply wander to velocity (gentle steering toward wander direction)
      const targetVx = Math.cos(pa.wanderAngle) * SPEED;
      const targetVy = Math.sin(pa.wanderAngle) * SPEED;
      pa.vx += (targetVx - pa.vx) * 0.02;
      pa.vy += (targetVy - pa.vy) * 0.02;

      // Update position
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;

      // Soft boundary: push back when near edges
      const margin = 80;
      if (pa.x < margin) pa.vx += 0.004 * dt;
      if (pa.x > w - margin) pa.vx -= 0.004 * dt;
      if (pa.y < margin) pa.vy += 0.004 * dt;
      if (pa.y > h - margin) pa.vy -= 0.004 * dt;

      // Override instance position so draw() uses physics position
      pa.instance.x = pa.x;
      pa.instance.y = pa.y;

      return alive;
    });

    // 2. Separation: push overlapping animals apart
    for (let i = 0; i < this.active.length; i++) {
      for (let j = i + 1; j < this.active.length; j++) {
        const a = this.active[i];
        const b = this.active[j];
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < SEPARATION_RADIUS && d > 0.1) {
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          const force = (SEPARATION_RADIUS - d) * SEPARATION_FORCE;
          a.vx -= nx * force * 0.01;
          a.vy -= ny * force * 0.01;
          b.vx += nx * force * 0.01;
          b.vy += ny * force * 0.01;
          // Also steer wander angles apart to prevent persistent clustering
          a.wanderAngle -= nx * 0.1;
          b.wanderAngle += nx * 0.1;
        }
      }
    }
  }

  draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    // Particles drawn first — behind all animals
    this.particles.draw(ctx, w, h);
    for (const pa of this.active) {
      ctx.save();
      pa.instance.draw(ctx);
      ctx.restore();
    }
  }
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
