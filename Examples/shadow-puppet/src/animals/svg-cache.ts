const cache = new Map<string, HTMLImageElement>();

export function preloadSvgs(svgStrings: string[]): Promise<void> {
  const pending: Promise<void>[] = [];
  for (const svg of svgStrings) {
    if (cache.has(svg)) continue;
    const img = new Image();
    const p = new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // fail silently, draw() guards
    });
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    cache.set(svg, img);
    pending.push(p);
  }
  return Promise.all(pending).then(() => undefined);
}

export function getSvgImage(svg: string): HTMLImageElement | null {
  const img = cache.get(svg);
  return img?.complete ? img : null;
}
