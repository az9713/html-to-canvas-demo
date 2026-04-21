import tgpu, { common, d, std } from 'typegpu';
import type { TgpuRoot, TgpuRenderPipeline, TgpuUniform } from 'typegpu';
import { perlin2d } from '@typegpu/noise';

const BgUniforms = d.struct({
  resolution: d.vec2f,
  time: d.f32,
  _pad: d.f32,
});

// fBm fog — single function, 4 octaves, builds on verified-working pattern
const fbmFog = (uv: d.v2f, t: number) => {
  'use gpu';
  const o1 = perlin2d.sample(uv.mul(2.0).add(d.vec2f(t * 0.12, 0.0)));
  const o2 = perlin2d.sample(uv.mul(4.5).add(d.vec2f(0.0, t * 0.17)));
  const o3 = perlin2d.sample(uv.mul(9.0).add(d.vec2f(t * 0.22, t * 0.13)));
  const o4 = perlin2d.sample(uv.mul(18.0).add(d.vec2f(t * -0.18, t * 0.10)));
  return o1 * 1.0 + o2 * 0.5 + o3 * 0.25 + o4 * 0.125;
};

// Sharp-core glow blob (same pattern as original, verified working)
const orbGlow = (uv: d.v2f, ox: number, oy: number, r: number) => {
  'use gpu';
  const diff = uv.sub(d.vec2f(ox, oy));
  const d2 = std.dot(diff, diff);
  const r2 = r * r;
  const g = r2 / (d2 + r2);
  return g * g;
};

function makeBgFragment(uniformsU: TgpuUniform<typeof BgUniforms>) {
  return tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })((input) => {
    'use gpu';
    const t = uniformsU.$.time;
    const uv = input.uv;

    // ── fBm fog in [0,1] ──
    const fog = fbmFog(uv, t) * 0.53 + 0.5;

    // ── Animated orbs (original pattern, vivid palette, faster speeds) ──
    const p1x = 0.20 + 0.15 * std.sin(t * 0.55);
    const p1y = 0.30 + 0.15 * std.cos(t * 0.43);
    const p2x = 0.80 + 0.12 * std.cos(t * 0.48);
    const p2y = 0.25 + 0.12 * std.sin(t * 0.65);
    const p3x = 0.50 + 0.18 * std.sin(t * 0.34 + 1.0);
    const p3y = 0.60 + 0.15 * std.cos(t * 0.50 + 0.5);
    const p4x = 0.15 + 0.12 * std.cos(t * 0.62);
    const p4y = 0.75 + 0.10 * std.sin(t * 0.38);
    const p5x = 0.85 + 0.10 * std.sin(t * 0.54);
    const p5y = 0.70 + 0.12 * std.cos(t * 0.44 + 1.2);
    const p6x = 0.35 + 0.14 * std.cos(t * 0.40 + 2.0);
    const p6y = 0.45 + 0.18 * std.sin(t * 0.52);

    // Smaller radii → tighter, less blurry
    const g1 = orbGlow(uv, p1x, p1y, 0.14);
    const g2 = orbGlow(uv, p2x, p2y, 0.12);
    const g3 = orbGlow(uv, p3x, p3y, 0.16);
    const g4 = orbGlow(uv, p4x, p4y, 0.11);
    const g5 = orbGlow(uv, p5x, p5y, 0.12);
    const g6 = orbGlow(uv, p6x, p6y, 0.10);

    // Vivid palette: magenta, cyan, gold, violet, teal, orange
    let color = d.vec3f(0.0, 0.0, 0.0);
    color = color.add(d.vec3f(1.00, 0.05, 0.80).mul(g1 * 1.4)); // magenta
    color = color.add(d.vec3f(0.00, 0.90, 1.00).mul(g2 * 1.2)); // cyan
    color = color.add(d.vec3f(1.00, 0.75, 0.00).mul(g3 * 1.0)); // gold
    color = color.add(d.vec3f(0.60, 0.05, 1.00).mul(g4 * 1.3)); // violet
    color = color.add(d.vec3f(0.00, 0.85, 0.65).mul(g5 * 1.1)); // teal
    color = color.add(d.vec3f(1.00, 0.35, 0.00).mul(g6 * 0.9)); // orange

    // ── Blend fog colour into the orbs ──
    // Fog tints the space between orbs with a slow purple/indigo wash
    const pulse = 0.5 + 0.5 * std.sin(t * 0.28);
    const fogColor = d.vec3f(0.35 + pulse * 0.20, 0.05, 0.70 - pulse * 0.20);
    color = color.add(fogColor.mul(fog * 0.35));

    // ── Dark navy base ──
    color = color.add(d.vec3f(0.02, 0.01, 0.05));

    // ── Spotlight cone from bottom centre ──
    const axDist = std.abs(uv.x - 0.5) * (1.8 - uv.y * 0.5);
    const spotRaw = std.clamp(1.0 - axDist * 2.6, 0.0, 1.0);
    const spot = spotRaw * spotRaw;
    // Spotlight brightens centre; warm tint
    color = color.add(d.vec3f(0.15, 0.10, 0.25).mul(spot * 0.6));

    // ── Tone-map: just clamp, no Reinhard darkening ──
    color = d.vec3f(
      std.clamp(color.x, 0.0, 1.0),
      std.clamp(color.y, 0.0, 1.0),
      std.clamp(color.z, 0.0, 1.0),
    );

    return d.vec4f(color, 1.0);
  });
}

export class BgRenderer {
  private root!: TgpuRoot;
  private pipeline!: TgpuRenderPipeline<d.Vec4f>;
  private context!: ReturnType<TgpuRoot['configureContext']>;
  private uniformsU!: TgpuUniform<typeof BgUniforms>;
  private perlinCache!: ReturnType<typeof perlin2d.staticCache>;

  constructor(private canvas: HTMLCanvasElement) {}

  async init(): Promise<void> {
    this.root = await tgpu.init({ device: {} });
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    this.context = this.root.configureContext({
      canvas: this.canvas,
      alphaMode: 'opaque',
    });

    this.uniformsU = this.root.createUniform(BgUniforms, {
      resolution: d.vec2f(this.canvas.width, this.canvas.height),
      time: 0,
      _pad: 0,
    });

    this.perlinCache = perlin2d.staticCache({
      root: this.root,
      size: d.vec2u(64, 64),
    });

    const fragmentFn = makeBgFragment(this.uniformsU);

    this.pipeline = this.root
      .pipe(this.perlinCache.inject())
      .createRenderPipeline({
        vertex: common.fullScreenTriangle,
        fragment: fragmentFn,
        targets: { format: presentationFormat },
      });
  }

  render(timeSec: number): void {
    this.uniformsU.write({
      resolution: d.vec2f(this.canvas.width, this.canvas.height),
      time: timeSec,
      _pad: 0,
    });

    this.pipeline
      .withColorAttachment({
        view: this.context,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0.02, g: 0.01, b: 0.05, a: 1 },
      })
      .draw(3);
  }

  onResize(_w: number, _h: number): void {}

  destroy(): void {
    this.perlinCache.destroy();
    this.root.destroy();
  }
}
