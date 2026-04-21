import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface HandBone {
  ax: number; ay: number; az: number;
  bx: number; by: number; bz: number;
}

// 20 bone connections between the 21 MediaPipe hand landmarks
const BONE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],         // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],          // index
  [0, 9], [9, 10], [10, 11], [11, 12],     // middle
  [0, 13], [13, 14], [14, 15], [15, 16],   // ring
  [0, 17], [17, 18], [18, 19], [19, 20],   // pinky
];

// Approximate finger tip and base landmark indices for gesture classification
const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_BASES = [3, 5, 9, 13, 17];

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  public bones: HandBone[] = [];
  public handCount = 0;
  public gesture = '—';

  // Track last timestamp to guard against duplicate calls
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
    // Guard: MediaPipe requires strictly increasing timestamps
    if (now <= this.lastVideoTime) return;
    this.lastVideoTime = now;

    const result = this.landmarker.detectForVideo(video, now);

    this.bones = [];
    this.handCount = result.landmarks.length;

    for (const landmarks of result.landmarks) {
      // Build bones for this hand
      for (const [a, b] of BONE_CONNECTIONS) {
        const lA = landmarks[a];
        const lB = landmarks[b];
        // MediaPipe x,y in [0,1] from top-left. Convert to NDC: ndcX = x*2-1, ndcY = -(y*2-1)
        // Z is relative depth from MediaPipe (roughly -0.1 to +0.1 range); scale to ~0.2
        this.bones.push({
          ax: lA.x * 2 - 1,
          ay: -(lA.y * 2 - 1),
          az: lA.z * 0.2,
          bx: lB.x * 2 - 1,
          by: -(lB.y * 2 - 1),
          bz: lB.z * 0.2,
        });
      }
    }

    // Gesture: use first detected hand
    if (result.landmarks.length > 0) {
      this.gesture = this.classifyGesture(result.landmarks[0]);
    } else {
      this.gesture = '—';
    }
  }

  private classifyGesture(landmarks: { x: number; y: number; z: number }[]): string {
    // Determine which fingers are extended
    // A finger is "up" when its tip y is significantly above its base y
    // (in image space, smaller y = higher on screen)
    const fingerUp: boolean[] = FINGER_TIPS.map((tip, i) => {
      const base = FINGER_BASES[i];
      if (i === 0) {
        // Thumb: compare x distance (horizontal spread) instead of y
        return Math.abs(landmarks[tip].x - landmarks[base].x) > 0.06;
      }
      return landmarks[tip].y < landmarks[base].y - 0.04;
    });

    const upCount = fingerUp.filter(Boolean).length;

    if (upCount >= 4) return 'Spread';
    if (upCount === 0) return 'Fist';

    // Peace: index and middle up, others down
    if (fingerUp[1] && fingerUp[2] && !fingerUp[3] && !fingerUp[4]) return 'Peace';

    // Point: only index up
    if (fingerUp[1] && !fingerUp[2] && !fingerUp[3] && !fingerUp[4]) return 'Point';

    // Thumbs up: only thumb extended
    if (fingerUp[0] && !fingerUp[1] && !fingerUp[2] && !fingerUp[3] && !fingerUp[4]) return 'Thumbs up';

    return `${upCount} fingers`;
  }
}
