import { HandTracker } from './hand-tracker';
import { CrystalRenderer } from './crystal-renderer';
import { updateHud } from './ui';

// ── Flag check ──
if (!('onpaint' in HTMLCanvasElement.prototype)) {
  const warn = document.getElementById('flag-warning');
  if (warn) warn.style.display = 'block';
}

const video = document.getElementById('webcam') as HTMLVideoElement;
const canvas = document.getElementById('c') as HTMLCanvasElement;

// ── Webcam setup ──
let webcamReady = false;
try {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
  });
  video.srcObject = stream;
  await new Promise<void>((resolve) => {
    video.addEventListener('loadeddata', () => resolve(), { once: true });
  });
  webcamReady = true;
} catch (err) {
  console.warn('Webcam not available:', err);
}

// ── Initial canvas sizing ──
const dpr = window.devicePixelRatio || 1;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

// ── Renderer ──
const renderer = new CrystalRenderer(canvas);
await renderer.init();

// ── Resize observer ──
const resizeObserver = new ResizeObserver(() => {
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  renderer.onResize(canvas.width, canvas.height);
});
resizeObserver.observe(canvas);

// ── Hand tracker ──
const tracker = new HandTracker();
if (webcamReady) {
  await tracker.init(video);
}

// ── Controls wiring ──
document.getElementById('ctrl-tint')!.addEventListener('input', (e) => {
  renderer.setTint((e.target as HTMLInputElement).value);
});

document.getElementById('ctrl-caustic')!.addEventListener('input', (e) => {
  renderer.setCausticIntensity(parseFloat((e.target as HTMLInputElement).value));
});

document.getElementById('ctrl-absorb')!.addEventListener('input', (e) => {
  renderer.setAbsorption(parseFloat((e.target as HTMLInputElement).value));
});

// ── Render loop ──
let frameCount = 0;
let fpsAccum = 0;
let lastTime = performance.now();

function frame(ts: number): void {
  const dt = ts - lastTime;
  lastTime = ts;
  frameCount++;

  // Accumulate FPS over 10 frames
  if (dt > 0) fpsAccum += 1000 / dt;

  // Run MediaPipe hand detection
  if (webcamReady) {
    tracker.detect(video);
  }

  // Push detected bones to GPU
  renderer.updateBones(tracker.bones);

  // Update HUD HTML every 10 frames
  if (frameCount % 10 === 0) {
    updateHud(fpsAccum / 10, tracker.handCount, tracker.gesture);
    fpsAccum = 0;
  }

  // Render crystal frame
  renderer.render(ts / 1000);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
