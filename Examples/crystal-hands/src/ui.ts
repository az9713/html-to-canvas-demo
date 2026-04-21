export function updateHud(fps: number, handCount: number, gesture: string): void {
  const fpsEl = document.getElementById('hud-fps');
  const handsEl = document.getElementById('hud-hands');
  const gestureEl = document.getElementById('hud-gesture');

  if (fpsEl) fpsEl.textContent = `${fps.toFixed(0)} fps`;
  if (handsEl) {
    handsEl.textContent =
      handCount === 0 ? 'No hands detected' :
      handCount === 1 ? '1 hand' : '2 hands';
  }
  if (gestureEl) gestureEl.textContent = gesture;
}
