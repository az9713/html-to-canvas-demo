import tgpu, { common, d, std } from 'typegpu';
import type { TgpuRoot, TgpuRenderPipeline, TgpuUniform } from 'typegpu';
import { perlin2d } from '@typegpu/noise';

const BgUniforms = d.struct({
  resolution: d.vec2f,
  time: d.f32,
  _pad: d.f32,
});

// Primary fog: rightward drift, medium speed
const fogA = (uv: d.v2f, t: number) => {
  'use gpu';
  const o1 = perlin2d.sample(uv.mul(2.0).add(d.vec2f(t * 0.12, 0.0)));
  const o2 = perlin2d.sample(uv.mul(4.5).add(d.vec2f(0.0, t * 0.17)));
  const o3 = perlin2d.sample(uv.mul(9.0).add(d.vec2f(t * 0.22, t * 0.13)));
  const o4 = perlin2d.sample(uv.mul(18.0).add(d.vec2f(t * -0.18, t * 0.10)));
  return o1 * 1.0 + o2 * 0.5 + o3 * 0.25 + o4 * 0.125;
};

// Secondary fog: counter-drift, different UV offset for color variation
const fogB = (uv: d.v2f, t: number) => {
  'use gpu';
  const o1 = perlin2d.sample(uv.mul(2.8).add(d.vec2f(t * -0.09, t * 0.07)));
  const o2 = perlin2d.sample(uv.mul(6.0).add(d.vec2f(t * 0.15, 0.0)));
  const o3 = perlin2d.sample(uv.mul(12.0).add(d.vec2f(0.0, t * -0.14)));
  return (o1 * 1.0 + o2 * 0.5 + o3 * 0.25) * 0.571;
};

function makeBgFragment(uniformsU: TgpuUniform<typeof BgUniforms>) {
  return tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })((input) => {
    'use gpu';
    const t = uniformsU.$.time;
    const uv = input.uv;

    // Both fog layers normalised to [0, 1]
    const fA = fogA(uv, t) * 0.53 + 0.5;
    const fB = fogB(uv, t) * 0.53 + 0.5;

    // Slow colour cycling — completes a full swing every ~20 s
    const pulse = 0.5 + 0.5 * std.sin(t * 0.31);
    const pulse2 = 0.5 + 0.5 * std.cos(t * 0.21);

    // Vivid colour palette: purple, cyan, magenta
    const purple  = d.vec3f(0.55, 0.05, 1.00);
    const cyan    = d.vec3f(0.00, 0.90, 1.00);
    const magenta = d.vec3f(1.00, 0.08, 0.75);
    const darkBg  = d.vec3f(0.01, 0.005, 0.03);

    // Build colour from fog layers + palette
    let color = darkBg;
    color = color.add(purple.mul(fA * 0.80));
    color = color.add(cyan.mul(fB * 0.60 * (0.65 + pulse * 0.35)));
    // Hot spots where both fog layers peak → magenta flash
    const hotspot = std.clamp(fA * fB - 0.10, 0.0, 1.0);
    color = color.add(magenta.mul(hotspot * (0.55 + pulse2 * 0.45)));

    // Crepuscular spotlight cone from bottom centre — wider & brighter
    const axDist = std.abs(uv.x - 0.5) * (1.6 - uv.y * 0.5);
    const spotRaw = std.clamp(1.0 - axDist * 2.4, 0.0, 1.0);
    const spot = spotRaw * spotRaw * spotRaw;

    // Radial vignette: bright centre, dark edges
    const vigLen = std.length(uv.sub(d.vec2f(0.5, 0.5)));
    const vignette = std.clamp(1.0 - vigLen * 0.65, 0.08, 1.0);

    // Apply luminance shaping
    color = color.mul(vignette * (0.25 + spot * 1.1));

    // Warm gold tint inside the spotlight cone
    color = color.add(d.vec3f(0.22, 0.14, 0.00).mul(spot * 0.9));

    // Reinhard tone-map to prevent blowout
    color = color.mul(1.0 / (std.length(color) * 0.32 + 1.0));

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
        clearValue: { r: 0.01, g: 0.005, b: 0.03, a: 1 },
      })
      .draw(3);
  }

  onResize(_w: number, _h: number): void {}

  destroy(): void {
    this.perlinCache.destroy();
    this.root.destroy();
  }
}
