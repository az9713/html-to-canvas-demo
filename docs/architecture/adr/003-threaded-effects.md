# ADR 003: Threaded-effect support strategy

**Status:** Proposed (deferred — current API ships without threaded-effect support; plausible future extension)

## Context

Modern browsers perform scrolling and compositor-driven animations on a dedicated thread for smoothness. On-thread effects update at the display refresh rate regardless of main-thread load.

For HTML-in-Canvas, this creates a gap: canvas drawing happens in author JavaScript on the main thread. If the page scrolls at 120Hz but the main thread is busy, the canvas doesn't re-render — the DOM moves smoothly but the canvas contents lag.

Closing this gap — making canvases part of threaded scrolling and animation — is desirable but architecturally heavy. We need to decide how (and whether) to ship it in v1.

## Decision

**v1 ships without dedicated threaded-effect support.** Authors who need threaded effects today use `OffscreenCanvas` in a worker, with the main thread posting snapshots per frame. This works for animations and scrolling that are measurable on the main thread (can be captured and shipped in time).

**A future "auto-updating canvas" mode is a plausible extension.** It is not part of v1, but the current API does not preclude it.

## Alternatives considered

### Option A: Worker-thread snapshots with synchronous JS-on-scroll

Send canvas-child snapshots to a worker, which renders them into `OffscreenCanvas`. On scroll/animation updates, call into JavaScript synchronously on the compositor thread to give authors a re-render opportunity.

**Pros:**

- Most flexibility — author code can do arbitrary re-rendering per compositor tick.
- Could enable effects that stay in sync with the smallest input-to-pixel latency.

**Cons:**

- **Synchronous JS on the compositor thread is architecturally hostile.** Threaded-scroll architectures in Chromium and Firefox deliberately isolate the compositor from script execution. Re-allowing script here breaks a hard safety and performance invariant.
- **Would require major engine work across Blink, Gecko, and WebKit.**
- **Harmful defaults.** A slow script on the compositor thread would degrade scrolling globally on the page.

### Option B: Auto-updating canvas mode (proposed for future)

`drawElementImage` records a **placeholder** representing "the latest rendering of this element." The canvas retains a command buffer. On threaded scroll and animation updates, the compositor replays the command buffer against the current placeholders — no main-thread script needed.

**Pros:**

- **Zero main-thread cost per frame.** The compositor does the work.
- **Effects stay perfectly in sync with native scrolling/animations.** No lag, no JS schedule needed.
- **Viable for 2D canvas.** Command buffer replay + placeholder substitution is implementable.
- **Plausibly viable for WebGPU** with small API additions (e.g., placeholder texture handles).

**Cons:**

- **Not viable for WebGL 1/2 as designed.** Many WebGL APIs require synchronous flushing (`getError`, `readPixels`, etc.) — if the command buffer contains placeholders, these calls deadlock or return inconsistent data.
- **Behavioral difference between 2D/WebGPU and WebGL.** Would make the mode feel fragmented.
- **Semantic questions.** How do placeholders interact with `getImageData`? With `captureStream`? With `toDataURL`? All of these synchronously require real pixels.
- **Retention cost.** The command buffer and placeholders have to stay alive indefinitely; invalidating them without breaking in-flight scrolls is tricky.

### Option C: Accept current worker-based pattern, ship no compositor integration

Keep the v1 API as specified. Authors who need threaded effects use `OffscreenCanvas` + a worker. The main thread captures and posts snapshots at `paint` time; the worker renders. Scrolling and animations that don't involve the canvas stay smooth; scrolling/animations that **do** involve canvas re-rendering are bound by main-thread cadence.

**Pros:**

- Ships now.
- No new invariants for engines to uphold.
- Existing `OffscreenCanvas` patterns work for many cases.

**Cons:**

- Pure threaded effects (scroll-linked canvas animations at 120Hz) aren't possible without main-thread script in the loop.

## Rationale

We chose Option C for v1 — accept the current worker-based limitation — because:

- **It unblocks shipping.** Waiting for Option B before shipping would delay the entire feature for the benefit of a narrower use case.
- **It leaves Option B open.** The v1 API doesn't make any commitment that would prevent a future auto-updating mode from being layered on top. `drawElementImage` is already a command-buffer-friendly API; adding a placeholder/auto-replay mode would be additive.
- **It rules out Option A.** Synchronous script on the compositor thread is not a direction we want the web platform to go, and the cost of shipping this API with that invariant would outweigh the benefit.

Option B remains the most promising direction for future work, targeted initially at 2D and WebGPU (WebGL does not support the required semantics). If and when implementations express interest and the semantic questions around synchronous APIs are resolved, the mode can be added via an opt-in (e.g., a `mode` option on `layoutsubtree` or a separate canvas context attribute).

## Trade-offs

- **No scroll-linked effects at compositor rate for canvas.** Pages that want these today should consider alternative architectures (e.g., render to a layer above or below the canvas, use CSS-only effects, or use WebGL/WebGPU with scroll input fed to the shader).
- **Author expectations.** Developers familiar with compositor-driven effects on HTML elements may expect the same guarantees for canvas content. We need to be clear in docs that canvas re-raster is main-thread-bound in v1.
- **Future-proofing.** The `paint` event, `ElementImage`, and the `draw*Image` APIs are all compatible with a future command-buffer-replay mode. No existing surface locks us out.

## Consequences

- The [design goals doc](../design-goals.md) lists "no threaded effects in v1" as an accepted trade-off.
- Worker-based `OffscreenCanvas` remains the recommended pattern for offloading canvas work.
- A future ADR will document the auto-updating canvas mode when (and if) it reaches implementation consensus.
- WebGL's architectural limitations around synchronous flushing mean the future mode will likely be 2D/WebGPU-only, with WebGL kept on the "JS-in-the-loop" model indefinitely.

## References

- Original discussion in [README.md § Alternatives considered: supporting threaded effects](../../../README.md#alternatives-considered-supporting-threaded-effects-with-worker-threads)
- [README.md § Future considerations: auto-updating canvas](../../../README.md#future-considerations-supporting-threaded-effects-with-an-auto-updating-canvas)
- [guides/use-offscreencanvas.md](../../guides/use-offscreencanvas.md) — current best pattern for offloading
