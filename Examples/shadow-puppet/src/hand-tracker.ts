import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_MCPS = [3, 5, 9, 13, 17];

type Lm = { x: number; y: number; z: number };

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  public handCount = 0;
  public gesture = '—';
  public lastLandmarks: Lm[][] = [];
  public fingerStates: boolean[][] = [];
  public handedness: string[] = [];
  private lastVideoTime = -1;
  private gestureBuffer: string[] = [];

  async init(_video: HTMLVideoElement): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
    );
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      numHands: 2,
      runningMode: 'VIDEO',
    });
  }

  detect(video: HTMLVideoElement): void {
    if (!this.landmarker) return;
    if (video.readyState < 2) return;

    const now = performance.now();
    if (now <= this.lastVideoTime) return;
    this.lastVideoTime = now;

    const result = this.landmarker.detectForVideo(video, now);
    this.handCount = result.landmarks.length;
    this.lastLandmarks = result.landmarks;
    this.handedness = result.handednesses.map(h => h[0]?.categoryName ?? 'Right');

    const rawGesture = this.classify(result.landmarks);
    this.gesture = this.smooth(rawGesture);
  }

  private smooth(raw: string): string {
    this.gestureBuffer.push(raw);
    if (this.gestureBuffer.length > 3) this.gestureBuffer.shift();
    if (this.gestureBuffer.length === 3 && this.gestureBuffer.every(g => g === raw)) return raw;
    return this.gesture;
  }

  private normalize(lm: Lm[]): Lm[] {
    const wrist = lm[0];
    const mid = lm[9];
    const palmSize = Math.hypot(mid.x - wrist.x, mid.y - wrist.y);
    const s = palmSize > 0.001 ? 1.0 / palmSize : 1.0;
    return lm.map(p => ({ x: (p.x - wrist.x) * s, y: (p.y - wrist.y) * s, z: (p.z - wrist.z) * s }));
  }

  private dist(a: Lm, b: Lm): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private classify(allLandmarks: Lm[][]): string {
    if (allLandmarks.length === 0) return '—';

    if (allLandmarks.length >= 2) {
      const r0 = this.classifySingleHand(allLandmarks[0], this.handedness[0] ?? 'Right');
      const r1 = this.classifySingleHand(allLandmarks[1], this.handedness[1] ?? 'Right');
      this.fingerStates = [r0.fingerUp, r1.fingerUp];
      const bothSpread = (r0.gesture === 'Dragon' || r0.gesture === 'Spider') &&
                         (r1.gesture === 'Dragon' || r1.gesture === 'Spider');
      const bothPeace = r0.gesture === 'Rabbit' && r1.gesture === 'Rabbit';
      if (bothSpread) return 'Bird';
      if (bothPeace) return 'Butterfly';
      return r0.gesture;
    }

    const r = this.classifySingleHand(allLandmarks[0], this.handedness[0] ?? 'Right');
    this.fingerStates = [r.fingerUp];
    return r.gesture;
  }

  private classifySingleHand(landmarks: Lm[], handed: string): { gesture: string; fingerUp: boolean[] } {
    const norm = this.normalize(landmarks);
    const wrist = norm[0];

    const extendRatio = (tipIdx: number, mcpIdx: number): number => {
      return this.dist(norm[tipIdx], wrist) / (this.dist(norm[mcpIdx], wrist) + 0.001);
    };

    const fingerUp: boolean[] = new Array(5).fill(false);

    // Thumb: handedness-aware X comparison in normalized space
    if (handed === 'Right') {
      fingerUp[0] = norm[4].x < norm[3].x - 0.1;
    } else {
      fingerUp[0] = norm[4].x > norm[3].x + 0.1;
    }

    // Fingers 1–4: extension ratio threshold
    const EXTEND_THRESHOLD = 1.6;
    fingerUp[1] = extendRatio(FINGER_TIPS[1], FINGER_MCPS[1]) > EXTEND_THRESHOLD;
    fingerUp[2] = extendRatio(FINGER_TIPS[2], FINGER_MCPS[2]) > EXTEND_THRESHOLD;
    fingerUp[3] = extendRatio(FINGER_TIPS[3], FINGER_MCPS[3]) > EXTEND_THRESHOLD;
    fingerUp[4] = extendRatio(FINGER_TIPS[4], FINGER_MCPS[4]) > EXTEND_THRESHOLD;

    // Pre-compute curl ratios for guard checks
    const curlMid   = extendRatio(FINGER_TIPS[2], FINGER_MCPS[2]);
    const curlRing  = extendRatio(FINGER_TIPS[3], FINGER_MCPS[3]);
    const curlPinky = extendRatio(FINGER_TIPS[4], FINGER_MCPS[4]);
    const curlIdx   = extendRatio(FINGER_TIPS[1], FINGER_MCPS[1]);
    const curlThumb = extendRatio(FINGER_TIPS[0], FINGER_MCPS[0]);

    const CURL_THRESHOLD = 1.2;

    const upCount = fingerUp.filter(Boolean).length;

    // Spider: all 5 fingers extended including spread thumb
    if (upCount === 5 && curlThumb > 1.3) return { gesture: 'Spider', fingerUp };

    // Dragon: 4 fingers up, thumb clearly closed
    if (upCount >= 4 && !fingerUp[0] && curlThumb < 1.3) return { gesture: 'Dragon', fingerUp };

    // Rabbit: index + middle (peace sign)
    if (fingerUp[1] && fingerUp[2] && !fingerUp[3] && !fingerUp[4]) return { gesture: 'Rabbit', fingerUp };

    // Snake: index + pinky, middle + ring explicitly down
    if (fingerUp[1] && !fingerUp[2] && !fingerUp[3] && fingerUp[4] &&
        curlMid < CURL_THRESHOLD && curlRing < CURL_THRESHOLD) return { gesture: 'Snake', fingerUp };

    // Wolf: index only, all others clearly curled
    if (fingerUp[1] && !fingerUp[2] && !fingerUp[3] && !fingerUp[4] && !fingerUp[0] &&
        curlMid < CURL_THRESHOLD && curlRing < CURL_THRESHOLD && curlPinky < CURL_THRESHOLD) {
      return { gesture: 'Wolf', fingerUp };
    }

    // Owl: thumb only, all fingers clearly curled
    if (fingerUp[0] && !fingerUp[1] && !fingerUp[2] && !fingerUp[3] && !fingerUp[4] &&
        curlIdx < CURL_THRESHOLD && curlMid < CURL_THRESHOLD &&
        curlRing < CURL_THRESHOLD && curlPinky < CURL_THRESHOLD) {
      return { gesture: 'Owl', fingerUp };
    }

    return { gesture: '—', fingerUp };
  }
}
