import { HandTracker } from './hand-tracker';
import { BgRenderer } from './bg-renderer';
import { AnimalStage } from './animal-stage';

// ── Flag check ──
if (!('onpaint' in HTMLCanvasElement.prototype)) {
  const warn = document.getElementById('flag-warning');
  if (warn) warn.style.display = 'block';
}

const video = document.getElementById('webcam') as HTMLVideoElement;
const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
const animalCanvas = document.getElementById('animal-canvas') as HTMLCanvasElement;
const hudCanvas = document.getElementById('hud-canvas') as HTMLCanvasElement;
const hudDiv = document.getElementById('hud')!;

// ── HUD elements ──
const hudGestureName = document.getElementById('hud-gesture-name')!;
const hudConfidenceFill = document.getElementById('hud-confidence-fill')!;

// ── Canvas sizing ──
const dpr = window.devicePixelRatio || 1;

function sizeCanvas(c: HTMLCanvasElement): void {
  c.width = Math.round(c.clientWidth * dpr);
  c.height = Math.round(c.clientHeight * dpr);
}

sizeCanvas(bgCanvas);
sizeCanvas(animalCanvas);
sizeCanvas(hudCanvas);

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

// ── Renderer init ──
const bgRenderer = new BgRenderer(bgCanvas);
await bgRenderer.init();

// ── Animal stage ──
const stage = new AnimalStage(animalCanvas);

// ── Hand tracker ──
const tracker = new HandTracker();
if (webcamReady) {
  await tracker.init(video);
}

// ── HUD canvas: 2D onpaint handler ──
const hudCtx = hudCanvas.getContext('2d')!;
(hudCanvas as any).onpaint = () => {
  hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
  // drawElementImage renders the HUD div onto the 2D canvas
  (hudCtx as any).drawElementImage(hudDiv, 0, 0, 256, 180);
};
(hudCanvas as any).requestPaint();

// ── Resize observer ──
const resizeObserver = new ResizeObserver(() => {
  sizeCanvas(bgCanvas);
  sizeCanvas(animalCanvas);
  sizeCanvas(hudCanvas);
  bgRenderer.onResize(bgCanvas.width, bgCanvas.height);
});
resizeObserver.observe(document.body);

// ── Gesture hold logic ──
let lastGesture = '—';
let gestureHoldStart: number | null = null;
let spawnLockGesture: string | null = null;
const HOLD_MS = 500;

function checkGestureHold(g: string): number {
  // Reset lock when gesture changes
  if (g !== spawnLockGesture) spawnLockGesture = null;
  // Suppress re-spawn while same gesture held
  if (spawnLockGesture !== null) return 1.0;

  if (g === '—') {
    gestureHoldStart = null;
    lastGesture = '—';
    return 0;
  }

  if (g !== lastGesture) {
    lastGesture = g;
    gestureHoldStart = Date.now();
    return 0;
  }

  if (gestureHoldStart !== null) {
    const progress = Math.min(1, (Date.now() - gestureHoldStart) / HOLD_MS);
    if (progress >= 1) {
      stage.spawn(g);
      spawnLockGesture = g;
      gestureHoldStart = null;
    }
    return progress;
  }

  return 0;
}

// ── HUD update ──
function updateHud(gesture: string, confidence: number): void {
  const label = gesture === '—' ? 'No gesture detected' : gesture;
  hudGestureName.textContent = label;
  hudConfidenceFill.style.width = `${Math.round(confidence * 100)}%`;
}

// ── Render loop ──
let frameCount = 0;
let lastTime = performance.now();

function frame(ts: number): void {
  const dt = Math.min(ts - lastTime, 100); // cap dt at 100ms
  lastTime = ts;
  frameCount++;

  // Hand detection
  if (webcamReady) tracker.detect(video);

  // Gesture hold → possible animal spawn
  const confidence = checkGestureHold(tracker.gesture);

  // Animal update
  stage.update(dt);

  // Render WebGPU background
  bgRenderer.render(ts / 1000);

  // Render animals (2D canvas)
  stage.draw();

  // HUD update every 10 frames
  if (frameCount % 10 === 0) {
    updateHud(tracker.gesture, confidence);
    (hudCanvas as any).requestPaint();
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
