import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Approximate finger tip and base landmark indices for gesture classification
const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_BASES = [3, 5, 9, 13, 17];

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  public handCount = 0;
  public gesture = '—';
  private lastVideoTime = -1;

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
    this.gesture = this.classify(result.landmarks);
  }

  private classify(allLandmarks: { x: number; y: number; z: number }[][]): string {
    if (allLandmarks.length === 0) return '—';

    if (allLandmarks.length >= 2) {
      const h0 = this.classifySingleHand(allLandmarks[0]);
      const h1 = this.classifySingleHand(allLandmarks[1]);
      const bothSpread = (h0 === 'Dragon' || h0 === 'Spider') &&
                         (h1 === 'Dragon' || h1 === 'Spider');
      const bothPeace = h0 === 'Rabbit' && h1 === 'Rabbit';
      if (bothSpread) return 'Bird';
      if (bothPeace) return 'Butterfly';
    }

    return this.classifySingleHand(allLandmarks[0]);
  }

  private classifySingleHand(landmarks: { x: number; y: number; z: number }[]): string {
    const fingerUp: boolean[] = FINGER_TIPS.map((tip, i) => {
      const base = FINGER_BASES[i];
      if (i === 0) {
        return Math.abs(landmarks[tip].x - landmarks[base].x) > 0.06;
      }
      return landmarks[tip].y < landmarks[base].y - 0.04;
    });

    const upCount = fingerUp.filter(Boolean).length;

    if (upCount === 5) return 'Spider';
    if (upCount >= 4 && !fingerUp[0]) return 'Dragon';
    if (fingerUp[1] && fingerUp[2] && !fingerUp[3] && !fingerUp[4]) return 'Rabbit';
    if (fingerUp[1] && !fingerUp[2] && !fingerUp[3] && fingerUp[4]) return 'Snake';
    if (fingerUp[1] && !fingerUp[2] && !fingerUp[3] && !fingerUp[4]) return 'Wolf';
    if (fingerUp[0] && !fingerUp[1] && !fingerUp[2] && !fingerUp[3] && !fingerUp[4]) return 'Owl';
    return '—';
  }
}
