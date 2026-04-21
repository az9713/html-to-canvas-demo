type Lm = { x: number; y: number; z: number };

export class HandDebugPanel {
  private ctx: CanvasRenderingContext2D;
  private readonly dpr: number;

  // MediaPipe 21-landmark skeleton connections
  private static readonly CONNECTIONS: [number, number][] = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17],
  ];

  constructor(private canvas: HTMLCanvasElement) {
    this.dpr = window.devicePixelRatio || 1;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    this.canvas.width = Math.round(this.canvas.clientWidth * this.dpr);
    this.canvas.height = Math.round(this.canvas.clientHeight * this.dpr);
  }

  draw(
    video: HTMLVideoElement,
    landmarks: Lm[][],
    fingerStates: boolean[][],
    gesture: string,
  ): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const d = this.dpr;

    ctx.clearRect(0, 0, w, h);

    // Mirrored webcam feed (selfie view)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-w, 0);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // Semi-transparent overlay to darken video slightly so skeleton is visible
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, w, h);

    for (let hi = 0; hi < landmarks.length; hi++) {
      const lm = landmarks[hi];

      // Skeleton connections
      ctx.strokeStyle = 'rgba(80, 240, 80, 0.9)';
      ctx.lineWidth = 1.5 * d;
      for (const [a, b] of HandDebugPanel.CONNECTIONS) {
        // Mirror x: landmark.x is in unmirrored camera space; (1-x) mirrors for selfie view
        const ax = (1 - lm[a].x) * w;
        const ay = lm[a].y * h;
        const bx = (1 - lm[b].x) * w;
        const by = lm[b].y * h;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      // Landmark dots
      for (let i = 0; i < lm.length; i++) {
        const x = (1 - lm[i].x) * w;
        const y = lm[i].y * h;
        ctx.fillStyle = i === 0 ? '#ff5050' : '#50ff50';
        ctx.beginPath();
        ctx.arc(x, y, 3 * d, 0, Math.PI * 2);
        ctx.fill();
      }

      // Finger-state dots (5 per hand, bottom-left)
      if (fingerStates[hi]) {
        for (let f = 0; f < 5; f++) {
          const fx = (8 + f * 16) * d;
          const fy = h - (8 + hi * 18) * d;
          ctx.fillStyle = fingerStates[hi][f] ? '#60ff40' : '#602020';
          ctx.beginPath();
          ctx.arc(fx, fy, 5 * d, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Gesture label (top-left)
    ctx.fillStyle = 'rgba(210, 190, 255, 0.95)';
    ctx.font = `bold ${11 * d}px monospace`;
    ctx.fillText(gesture === '—' ? 'No gesture' : gesture, 6 * d, 14 * d);
  }
}
