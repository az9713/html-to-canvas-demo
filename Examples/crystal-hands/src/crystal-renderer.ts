import tgpu, { common, d, std } from 'typegpu';
import type { TgpuRoot, TgpuRenderPipeline, TgpuUniform } from 'typegpu';
import { randf } from '@typegpu/noise';
import type { HandBone } from './hand-tracker';

// ─── Constants ───────────────────────────────────────────────────────────────

// 20 bones per hand × 2 hands = 40 max
const MAX_BONES = 40;

// Fixed HUD texture size — avoids large-texture crash documented in debugging-journal.md §2.3
const HUD_W = 256;
const HUD_H = 128;

// Bone capsule radius in NDC space
const BONE_RADIUS = 0.018;

// ─── GPU Data Types ──────────────────────────────────────────────────────────

const Uniforms = d.struct({
  resolution: d.vec2f,
  time: d.f32,
  boneCount: d.u32,
  tint: d.vec3f,
  causticIntensity: d.f32,
  absorption: d.f32,
  _pad: d.f32,     // pad struct to 16-byte alignment boundary
});

const Bone = d.struct({
  a: d.vec4f,  // xyz = NDC position, w = capsule radius
  b: d.vec4f,  // xyz = NDC position, w = unused (padding)
});

const BonesArray = d.arrayOf(Bone, MAX_BONES);

// ─── Texture Bind Group Layout ────────────────────────────────────────────────

const textureLayout = tgpu.bindGroupLayout({
  webcamTex: { texture: d.texture2d(d.f32) },
  hudTex: { texture: d.texture2d(d.f32) },
  linearSampler: { sampler: 'filtering' },
});

// ─── GPU helper functions (no closure — pure math) ───────────────────────────

// Smooth minimum via polynomial blend (k = blend width)
const smin = (a: number, b: number, k: number) => {
  'use gpu';
  const h = std.max(k - std.abs(a - b), 0.0) / k;
  return std.min(a, b) - h * h * k * 0.25;
};

// SDF: capsule between endpoints ca and cb with radius r
const sdCapsule = (p: d.v3f, ca: d.v3f, cb: d.v3f, r: number) => {
  'use gpu';
  const pa = p.sub(ca);
  const ba = cb.sub(ca);
  const h = std.saturate(std.dot(pa, ba) / std.dot(ba, ba));
  return std.length(pa.sub(ba.mul(h))) - r;
};

// Beer-Lambert: volumetric absorption
const beerLambert = (absorb: d.v3f, thickness: number) => {
  'use gpu';
  return std.exp(absorb.mul(-thickness));
};

// Schlick Fresnel
const fresnelSchlick = (cosTheta: number, f0: number) => {
  'use gpu';
  return f0 + (1.0 - f0) * std.pow(1.0 - cosTheta, 5.0);
};

// ─── Fragment shader factory ──────────────────────────────────────────────────
// Built inside init() so it closes over the actual TypeGPU uniform instances.

function makeCrystalFragment(
  uniformsU: TgpuUniform<typeof Uniforms>,
  bonesU: TgpuUniform<typeof BonesArray>,
) {
  // Scene SDF: smooth union of active bones, reading from closed-over uniforms
  const sceneSdf = (p: d.v3f) => {
    'use gpu';
    const uniforms = uniformsU.$;
    const bones = bonesU.$;
    const count = uniforms.boneCount;
    let dist = d.f32(100.0);
    for (let i = 0; i < MAX_BONES; i++) {
      if (d.u32(i) < count) {
        const bone = bones[i];
        const cd = sdCapsule(p, bone.a.xyz, bone.b.xyz, bone.a.w);
        dist = smin(dist, cd, 0.015);
      }
    }
    return dist;
  };

  // Central-difference normal from the scene SDF
  const getNormal = (p: d.v3f) => {
    'use gpu';
    const eps = 0.002;
    const nx = sceneSdf(p.add(d.vec3f(eps, 0, 0))) - sceneSdf(p.sub(d.vec3f(eps, 0, 0)));
    const ny = sceneSdf(p.add(d.vec3f(0, eps, 0))) - sceneSdf(p.sub(d.vec3f(0, eps, 0)));
    const nz = sceneSdf(p.add(d.vec3f(0, 0, eps))) - sceneSdf(p.sub(d.vec3f(0, 0, eps)));
    return std.normalize(d.vec3f(nx, ny, nz));
  };

  return tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })((input) => {
    'use gpu';

    const uniforms = uniformsU.$;
    const uv = input.uv;

    // Orthographic ray: origin at z=-2, direction +z into scene
    // NDC: map uv (0..1) to (-1..1), flip y for math convention
    const ndc = d.vec2f(uv.x * 2.0 - 1.0, -(uv.y * 2.0 - 1.0));
    const rayOrigin = d.vec3f(ndc.x, ndc.y, -2.0);
    const rayDir = d.vec3f(0.0, 0.0, 1.0);

    // Sample webcam background (mirror x for selfie orientation)
    const webcamUv = d.vec2f(1.0 - uv.x, uv.y);
    const webcam = std.textureSampleLevel(
      textureLayout.bound.webcamTex.$,
      textureLayout.bound.linearSampler.$,
      webcamUv,
      0
    );

    // ── Ray march: 64 steps, stop at SURF_DIST or MAX_DIST ───────────────────
    let totalDist = d.f32(0.0);
    let hit = d.f32(0.0);

    for (let i = 0; i < 64; i++) {
      const p = rayOrigin.add(rayDir.mul(totalDist));
      const sd = sceneSdf(p);
      totalDist = totalDist + sd;
      if (sd < 0.001) {
        hit = d.f32(1.0);
        break;
      }
      if (totalDist > 10.0) {
        break;
      }
    }

    // ── Background path: webcam + HUD ────────────────────────────────────────
    if (hit < 0.5) {
      // Mild cool color grade
      const graded = webcam.rgb.mul(d.vec3f(0.95, 0.97, 1.0));

      const hudSample = std.textureSampleLevel(
        textureLayout.bound.hudTex.$,
        textureLayout.bound.linearSampler.$,
        uv,
        0
      );
      const bgFinal = std.mix(graded, hudSample.rgb, hudSample.a);
      return d.vec4f(bgFinal, 1.0);
    }

    // ── Crystal surface path ──────────────────────────────────────────────────
    const hitPos = rayOrigin.add(rayDir.mul(totalDist));
    const normal = getNormal(hitPos);

    // View vector pointing toward camera
    const viewDir = std.normalize(rayOrigin.sub(hitPos));
    const nDotV = std.saturate(std.dot(normal, viewDir));

    // Fresnel (glass: f0 ≈ 0.04)
    const fresnel = fresnelSchlick(nDotV, 0.04);

    // Refraction: offset background sample by refracted ray's xy deflection
    const refracted = std.refract(rayDir, normal, 1.0 / 1.5);
    const refrOffset = refracted.xy.mul(0.06);
    const refrUv = d.vec2f(
      std.saturate(1.0 - uv.x + refrOffset.x),
      std.saturate(uv.y + refrOffset.y)
    );
    const refrBg = std.textureSampleLevel(
      textureLayout.bound.webcamTex.$,
      textureLayout.bound.linearSampler.$,
      refrUv,
      0
    );

    // Beer-Lambert tinted absorption
    const tint = uniforms.tint;
    const absorb = d.vec3f(1.0).sub(tint).mul(uniforms.absorption);
    const transmittance = beerLambert(absorb, 0.05);
    const interior = refrBg.rgb.mul(transmittance);

    // Reflection: env sample from reflected direction
    const reflDir = std.reflect(rayDir, normal);
    const reflUv = d.vec2f(
      std.saturate(0.5 + reflDir.x * 0.4),
      std.saturate(0.5 - reflDir.y * 0.4)
    );
    const reflEnv = std.textureSampleLevel(
      textureLayout.bound.webcamTex.$,
      textureLayout.bound.linearSampler.$,
      reflUv,
      0
    );

    // Caustic shimmer: noise seeded by UV + animated time
    randf.seed2(d.vec2f(uv.x * 31.7 + uniforms.time * 0.1, uv.y * 17.3 + uniforms.time * 0.07));
    const noise = randf.sample();
    const caustic = tint.mul(noise * uniforms.causticIntensity * 0.3 * nDotV);

    // Fresnel blend of refraction / reflection + caustic shimmer
    const crystalColor = std.mix(interior, reflEnv.rgb, fresnel).add(caustic);

    // Rim glow at glancing angles
    const rimColor = tint.mul(std.pow(1.0 - nDotV, 3.0) * 1.5);
    const finalCrystal = crystalColor.add(rimColor);

    // HUD composited on top
    const hudSample2 = std.textureSampleLevel(
      textureLayout.bound.hudTex.$,
      textureLayout.bound.linearSampler.$,
      uv,
      0
    );
    const withHud = std.mix(finalCrystal, hudSample2.rgb, hudSample2.a);

    return d.vec4f(withHud, 1.0);
  });
}

// ─── CrystalRenderer ─────────────────────────────────────────────────────────

export class CrystalRenderer {
  private canvas: HTMLCanvasElement;
  private root!: TgpuRoot;
  private pipeline!: TgpuRenderPipeline<d.Vec4f>;
  private context!: ReturnType<TgpuRoot['configureContext']>;
  private uniformsU!: TgpuUniform<typeof Uniforms>;
  private bonesU!: TgpuUniform<typeof BonesArray>;

  private webcamGpuTex!: GPUTexture;
  private hudGpuTex!: GPUTexture;
  private bindGroup!: ReturnType<TgpuRoot['createBindGroup']>;
  private hudDiv!: HTMLElement;

  // Material params
  private tintHex = '#ffb830';
  private causticIntensity = 1.5;
  private absorption = 2.5;
  private boneCount = 0;
  private currentTime = 0.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(): Promise<void> {
    this.root = await tgpu.init({ device: {} });

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    this.context = this.root.configureContext({
      canvas: this.canvas,
      alphaMode: 'premultiplied',
    });

    // Create uniform buffers
    this.uniformsU = this.root.createUniform(Uniforms, this.makeUniforms());
    this.bonesU = this.root.createUniform(BonesArray, this.neutralBones());

    // Webcam texture — sized to current canvas; recreated on resize
    const w = Math.max(this.canvas.width, 1);
    const h = Math.max(this.canvas.height, 1);
    this.webcamGpuTex = this.root.device.createTexture({
      size: [w, h, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // HUD texture — fixed small size
    this.hudGpuTex = this.root.device.createTexture({
      size: [HUD_W, HUD_H, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const sampler = this.root['~unstable'].createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    this.bindGroup = this.root.createBindGroup(textureLayout, {
      webcamTex: this.webcamGpuTex.createView(),
      hudTex: this.hudGpuTex.createView(),
      linearSampler: sampler,
    });

    // Build fragment shader, closed over the uniform instances
    const fragmentFn = makeCrystalFragment(this.uniformsU, this.bonesU);

    this.pipeline = this.root.createRenderPipeline({
      vertex: common.fullScreenTriangle,
      fragment: fragmentFn,
      targets: { format: presentationFormat },
    });

    this.hudDiv = document.getElementById('hud')!;

    // onpaint: capture HUD div → GPU texture at fixed 256×128
    // Do NOT call requestPaint() here — drives repaints from rAF only
    (this.canvas as any).onpaint = () => {
      (this.root.device.queue as any).copyElementImageToTexture(
        this.hudDiv,
        HUD_W, HUD_H,
        { texture: this.hudGpuTex }
      );
    };
    (this.canvas as any).requestPaint();
  }

  updateBones(bones: HandBone[]): void {
    this.boneCount = Math.min(bones.length, MAX_BONES);
    this.bonesU.write(this.buildBonesData(bones));
    // Also update boneCount in uniforms immediately
    this.uniformsU.write(this.makeUniforms());
  }

  render(timeSec: number): void {
    this.currentTime = timeSec;

    // Upload webcam frame to GPU — direct from HTMLVideoElement (no createImageBitmap)
    const video = document.getElementById('webcam') as HTMLVideoElement;
    if (video.readyState >= 2 && video.videoWidth > 0) {
      const w = Math.min(video.videoWidth, this.webcamGpuTex.width);
      const h = Math.min(video.videoHeight, this.webcamGpuTex.height);
      this.root.device.queue.copyExternalImageToTexture(
        { source: video, flipY: false },
        { texture: this.webcamGpuTex },
        [w, h]
      );
    }

    // Write time-dependent uniforms
    this.uniformsU.write(this.makeUniforms());

    this.pipeline
      .withColorAttachment({
        view: this.context,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      })
      .with(this.bindGroup)
      .draw(3);
  }

  onResize(width: number, height: number): void {
    const w = Math.max(width, 1);
    const h = Math.max(height, 1);

    this.webcamGpuTex.destroy();
    this.webcamGpuTex = this.root.device.createTexture({
      size: [w, h, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const sampler = this.root['~unstable'].createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });
    this.bindGroup = this.root.createBindGroup(textureLayout, {
      webcamTex: this.webcamGpuTex.createView(),
      hudTex: this.hudGpuTex.createView(),
      linearSampler: sampler,
    });
  }

  setTint(hexColor: string): void {
    this.tintHex = hexColor;
  }

  setCausticIntensity(value: number): void {
    this.causticIntensity = value;
  }

  setAbsorption(value: number): void {
    this.absorption = value;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private parseTint(): d.Infer<typeof d.vec3f> {
    const hex = this.tintHex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return d.vec3f(r, g, b);
  }

  private makeUniforms(): d.Infer<typeof Uniforms> {
    return {
      resolution: d.vec2f(this.canvas.width, this.canvas.height),
      time: this.currentTime,
      boneCount: this.boneCount,
      tint: this.parseTint(),
      causticIntensity: this.causticIntensity,
      absorption: this.absorption,
      _pad: 0,
    };
  }

  private neutralBones(): d.Infer<typeof BonesArray> {
    const arr: d.Infer<typeof BonesArray> = [];
    for (let i = 0; i < MAX_BONES; i++) {
      arr.push({
        a: d.vec4f(0, 0, -999, 0),  // far away, zero radius — safe SDF
        b: d.vec4f(0, 0, -999, 0),
      });
    }
    return arr;
  }

  private buildBonesData(bones: HandBone[]): d.Infer<typeof BonesArray> {
    const arr: d.Infer<typeof BonesArray> = [];
    const active = Math.min(bones.length, MAX_BONES);

    for (let i = 0; i < active; i++) {
      const b = bones[i];
      arr.push({
        a: d.vec4f(b.ax, b.ay, b.az, BONE_RADIUS),
        b: d.vec4f(b.bx, b.by, b.bz, 0),
      });
    }
    for (let i = active; i < MAX_BONES; i++) {
      arr.push({
        a: d.vec4f(0, 0, -999, 0),
        b: d.vec4f(0, 0, -999, 0),
      });
    }
    return arr;
  }
}
