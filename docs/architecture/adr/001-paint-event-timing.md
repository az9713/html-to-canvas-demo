# ADR 001: Paint event timing

**Status:** Accepted

## Context

The HTML-in-Canvas API needs a hook where author code can call `drawElementImage()` to render canvas children into the canvas backing store. That hook must:

1. Have complete, consistent snapshots of canvas children available (otherwise draw calls fail or produce stale content).
2. Allow draw calls to land in the current frame (otherwise the user sees flickering or a one-frame lag).
3. Avoid unbounded reentrancy loops when author code mutates the DOM from within the handler.
4. Work for 2D, WebGL, and WebGPU contexts — including those where synchronous flushing (`getError`, `getImageData`) is required and placeholder-based buffering is infeasible.

The browser's rendering update, defined in the [HTML Standard § update the rendering](https://html.spec.whatwg.org/#update-the-rendering), has several candidate insertion points for the new `paint` event:

- Step 14: Run animation frame callbacks.
- Step 16.2.1: Recalculate styles and update layout.
- Step 16.2.6: Deliver resize observer entries (loops back to 16.2.1 if needed).
- Step 19: Update intersection observations.
- After step 20: Paint (the browser's existing paint step) — snapshots exist after this.
- Commit: the painted output is sent to the compositor/GPU.

## Decision

Fire the `paint` event immediately after the browser's Paint step, with no looping for author-triggered re-layout. DOM mutations performed inside `paint` apply to the **next** rendering update, not the current one.

Concretely, this is "Option C" in the alternatives considered below.

## Alternatives considered

### Option A: Fire `paint` at ResizeObserver timing, looping back if needed

Fire `paint` where ResizeObserver entries are delivered (step 16.2.6), with the rendering update looping back to style/layout if `paint` handlers cause DOM changes.

**Approach to snapshots:** Either (a) run a partial synchronous Paint step to capture snapshots of canvas children eagerly, or (b) record placeholders that are replaced with actual paint at the later Paint step.

**Pros:**

- Fires earlier in the frame, potentially reducing perceived latency.
- Aligned with the existing ResizeObserver loop semantics — which some authors are familiar with.

**Cons:**

- **Partial paint is expensive.** Running Paint just for canvas children, possibly multiple times per frame, is costly.
- **Partial paint has implementation barriers.** Gecko in particular has architectural assumptions that paint runs once, at a specific phase. Potentially other engines too.
- **Placeholder-based buffering fails for WebGL.** Many WebGL APIs (`getError`, any `Get*` call) require a synchronous flush of the command buffer. If the buffer contains placeholder draws, those calls either deadlock or return inconsistent results.
- **Unbounded looping is hard to bound.** DOM changes during `paint` could trigger more changes, and there's no natural stopping point like ResizeObserver has (which relies on box-size fixpoint).

### Option B: Fire `paint` immediately after Paint, looping back if needed

Fire `paint` after the browser Paint step (so snapshots are real and complete), but if the handler mutates the DOM, loop back to re-run style/layout/paint and fire `paint` again.

**Pros:**

- Snapshots are real and consistent — same as Option C.
- Canvas drawing lands in the current frame — same as Option C.

**Cons:**

- **Multiple paint passes per frame.** Each loop iteration re-runs style recalc, layout, and paint — all of which are expensive.
- **More steps loop than in Option A.** The full Paint step is in the loop, not just style/layout.
- **Still has the unbounded-loop problem.** Arbitrary author JavaScript can mutate in ways that don't converge.

### Option C: Fire `paint` immediately after Paint, no looping

Fire `paint` after the browser Paint step. DOM mutations made during the handler apply to the **next** rendering update.

**Pros:**

- Runs `paint` exactly once per frame. Matches the browser's own paint cadence.
- Snapshots are real, complete, and already recorded — no partial paint, no placeholders.
- Canvas draws land in the current frame (the compositor commit step still follows).
- No looping overhead.
- Simpler mental model for authors — `paint` is a terminal hook, not a loop iteration.

**Cons:**

- DOM changes made during `paint` don't visibly apply until the next frame.
- Authors must design around the one-frame deferral when they intentionally modify DOM in `paint`. In practice, the common case (applying the returned transform via `element.style.transform`) is fine because hit testing reads the new transform from the next event immediately.

## Rationale

Option C is the simplest design that satisfies all four hard requirements.

- **Snapshots are complete** because Paint has already run.
- **Draws land in the current frame** because the compositor commit step follows `paint`.
- **No reentrancy loops** because the single-pass design is explicit about deferring DOM changes.
- **Works for WebGL/WebGPU** because there's no placeholder buffering — all snapshots are real.

The one downside (one-frame lag on DOM mutations inside `paint`) turns out to be a feature rather than a bug in practice: it prevents surprising interleavings between `paint` and other rendering-phase observers, and it produces a predictable author model.

## Trade-offs

- **We give up sub-frame responsiveness for DOM mutations from `paint`.** If an author calls `el.style.left = '100px'` inside `paint`, it takes effect on the next frame. In return, we get a single-pass rendering update with clear semantics.

- **We give up the theoretical optimization of partial paint.** Implementations must run Paint for the whole page before snapshotting canvas children. For canvases with heavy non-canvas content, this is a mild inefficiency — but the alternative's implementation complexity is far worse.

- **The one intentional carve-out** — drawn content in the canvas — still updates mid-frame, because `drawElementImage` and friends buffer into the canvas which commits with the current frame. This is exactly what authors want: draw commands visible this frame, DOM changes on the next.

## Consequences

- `canvas.requestPaint()` exists to let authors kick `paint` when no snapshot change would otherwise trigger it (first frame, transform-only changes, resize).
- `changedElements` is provided so authors can do targeted re-draws without re-computing everything.
- A future "auto-updating canvas" mode (see [ADR 003](003-threaded-effects.md)) can be layered on top of this model without changing the core `paint` semantics.
- Spec authors for related features (ResizeObserver, IntersectionObserver) can reason about `paint`'s interaction with their features straightforwardly: `paint` always runs after them, never before.

## References

- [HTML Standard: update the rendering](https://html.spec.whatwg.org/#update-the-rendering)
- [CSS Position 4: Painting Order](https://drafts.csswg.org/css-position-4/#painting-order)
- Original alternatives discussion in [README.md § Alternatives considered: paint event timing](../../../README.md#alternatives-considered-paint-event-timing)
