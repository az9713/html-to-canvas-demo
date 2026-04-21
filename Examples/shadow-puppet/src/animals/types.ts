export interface AnimalInstance {
  /** Advance state by dt milliseconds. Returns false when the animal is done (off-screen). */
  update(dt: number): boolean;
  /** Draw onto a 2D canvas context. Context transform is identity (canvas pixels). */
  draw(ctx: CanvasRenderingContext2D): void;
}

export interface Animal {
  name: string;
  /** Spawn a new instance. canvasW/H are physical pixel dimensions. */
  spawn(canvasW: number, canvasH: number): AnimalInstance;
}
