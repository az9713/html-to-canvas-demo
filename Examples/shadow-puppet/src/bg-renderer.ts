import tgpu, { common, d, std } from 'typegpu';
import type { TgpuRoot, TgpuRenderPipeline, TgpuUniform } from 'typegpu';

const BgUniforms = d.struct({
  resolution: d.vec2f,
  time: d.f32,
  _pad: d.f32,
});

// Soft glow blob: inverse-square falloff, double-squared for tight core
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

    // 6 animated orbs in UV space (0..1), gentle drift via sin/cos of time
    const p1x = 0.20 + 0.12 * std.sin(t * 0.28);
    const p1y = 0.30 + 0.12 * std.cos(t * 0.21);
    const p2x = 0.80 + 0.10 * std.cos(t * 0.23);
    const p2y = 0.25 + 0.10 * std.sin(t * 0.33);
    const p3x = 0.50 + 0.15 * std.sin(t * 0.17 + 1.0);
    const p3y = 0.55 + 0.12 * std.cos(t * 0.25 + 0.5);
    const p4x = 0.15 + 0.10 * std.cos(t * 0.31);
    const p4y = 0.72 + 0.08 * std.sin(t * 0.19);
    const p5x = 0.85 + 0.08 * std.sin(t * 0.27);
    const p5y = 0.68 + 0.10 * std.cos(t * 0.22 + 1.2);
    const p6x = 0.35 + 0.12 * std.cos(t * 0.20 + 2.0);
    const p6y = 0.45 + 0.15 * std.sin(t * 0.26);

    // Glow intensities per orb (radii in UV units)
    const g1 = orbGlow(uv, p1x, p1y, 0.30);
    const g2 = orbGlow(uv, p2x, p2y, 0.25);
    const g3 = orbGlow(uv, p3x, p3y, 0.28);
    const g4 = orbGlow(uv, p4x, p4y, 0.22);
    const g5 = orbGlow(uv, p5x, p5y, 0.24);
    const g6 = orbGlow(uv, p6x, p6y, 0.20);

    // Orb colors: deep purple, midnight blue, teal, indigo, violet, cyan
    let color = d.vec3f(0.0, 0.0, 0.0);
    color = color.add(d.vec3f(0.40, 0.10, 0.80).mul(g1 * 0.9)); // purple
    color = color.add(d.vec3f(0.10, 0.20, 0.90).mul(g2 * 0.8)); // blue
    color = color.add(d.vec3f(0.05, 0.55, 0.75).mul(g3 * 0.7)); // teal
    color = color.add(d.vec3f(0.30, 0.05, 0.70).mul(g4 * 0.8)); // indigo
    color = color.add(d.vec3f(0.55, 0.10, 0.85).mul(g5 * 0.7)); // violet
    color = color.add(d.vec3f(0.05, 0.70, 0.80).mul(g6 * 0.6)); // cyan

    // Reinhard tone-map to avoid blowout, then add dark navy base
    const mapped = color.mul(1.0 / (std.length(color) * 0.4 + 1.0));
    const final = mapped.add(d.vec3f(0.02, 0.01, 0.05));

    return d.vec4f(final, 1.0);
  });
}

export class BgRenderer {
  private root!: TgpuRoot;
  private pipeline!: TgpuRenderPipeline<d.Vec4f>;
  private context!: ReturnType<TgpuRoot['configureContext']>;
  private uniformsU!: TgpuUniform<typeof BgUniforms>;

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

    const fragmentFn = makeBgFragment(this.uniformsU);

    this.pipeline = this.root.createRenderPipeline({
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

  onResize(_w: number, _h: number): void {
    // resolution is written each frame via render(); no GPU texture to resize
  }

  destroy(): void {
    this.root.destroy();
  }
}
