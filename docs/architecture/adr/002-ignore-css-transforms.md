# ADR 002: Ignore CSS transforms when drawing canvas children

**Status:** Accepted

## Context

When an author calls `ctx.drawElementImage(element, dx, dy)`, the method needs to decide which pixels to sample from the source element. The element has a painted output; it may also have a CSS `transform` (or the element ancestor chain may). Should that transform be honored when sampling?

There are three ways it could work:

1. **Honor the element's own `transform`.** Sample the transformed output.
2. **Honor ancestor transforms but not the element's own.** Similar to how `getBoundingClientRect` works for some purposes.
3. **Ignore transforms entirely for drawing.** Sample the un-transformed, pre-layout-transform content.

The decision matters because `drawElementImage` **returns** a CSS transform as an aid to synchronization — authors typically assign it straight back to `element.style.transform`. If draws are transform-sensitive, applying the returned transform to the element would change how the *next* draw samples it, creating a feedback loop.

## Decision

CSS transforms on canvas children (both the element itself and its ancestors, for purposes of drawing) are **ignored** when `drawElementImage`, `texElementImage2D`, or `copyElementImageToTexture` samples the element.

Transforms on the element continue to affect:

- Hit testing (the transformed box receives events).
- Accessibility position (AT sees the transformed location).
- `getBoundingClientRect()` (CSS-standard behaviour).
- IntersectionObserver boxes.

So authors can — and should — apply the returned transform to `element.style.transform` without creating a feedback loop.

## Alternatives considered

### Option A: Honor transforms for drawing

Sample the element as it would appear on screen, including its CSS transform.

**Pros:**

- "The element is drawn wherever I put it" is a simple mental model.
- Lets authors compose DOM transforms and canvas transforms without API-specific sync.

**Cons:**

- **Feedback loop.** The author assigns the returned transform to `element.style.transform`, which changes the effective draw transform, which changes the returned transform on the next frame, and the element walks across the screen until floating-point precision breaks.
- **Two sources of truth for positioning.** Authors would need to coordinate `ctx.translate` on the context with `transform` on the element. Misalignments in either would compound.
- **Existing transforms on ancestors confuse the picture.** An element inside a `<div style="transform: translateX(10px)">` would be drawn 10px offset from where the author expects, with no easy way to undo it.

### Option B: Honor ancestor transforms but not element's own

Sample the element's own box (no transform), but respect ancestor transforms in the sampling coordinate space.

**Pros:**

- Avoids the self-transform feedback loop.
- Lets authors use ancestor transforms for "environment" layout.

**Cons:**

- **Partial breakage of the feedback loop.** Authors are tempted to assign the returned transform to an ancestor, which reintroduces the loop at a different level.
- **Asymmetric semantics.** "My transform is ignored but my parent's isn't" is hard to reason about and harder to debug.
- **Implementation complexity.** Splitting transform application between "sampled" and "ignored" categories is fragile.

### Option C: Ignore all transforms for drawing (chosen)

Sample the element's pre-layout-transform paint output — the box as it sits in the CSS flow after layout, before any `transform` property is applied at any level.

**Pros:**

- No feedback loop possible. Assigning the returned matrix to the source element has no effect on subsequent draws.
- Clean author model: "transforms are for the DOM; canvas positioning is for the canvas."
- Simple implementation: snapshot the un-transformed paint output; compose with canvas CTM at draw time.
- Makes the returned transform self-consistent and idempotent.

**Cons:**

- Authors who want "this element, transformed, drawn into canvas" have to apply the DOM transform via the canvas context instead (e.g., `ctx.translate`, `ctx.rotate`).
- Docs need to explain this clearly — it's not intuitive on first read.

## Rationale

Option C is the only option that breaks the feedback loop cleanly. Options A and B require authors to actively prevent the loop, which they will forget, and the resulting bugs will be extremely confusing ("the element drifts across the screen over time").

The cost of Option C — having to express transforms in the canvas context rather than via CSS — is small. The 2D canvas API already exposes `translate`, `rotate`, `scale`, and `transform` for exactly this purpose. For 3D contexts, transforms are typically expressed as matrices anyway.

The win is a simple, correct, composable API where the sync pattern is literally two lines:

```js
const t = ctx.drawElementImage(el, x, y);
el.style.transform = t.toString();
```

No mental model required beyond that.

## Trade-offs

- **Transform-based effects on drawn elements must be done on the canvas context.** An author who wants "spin this element while drawn" uses `ctx.rotate` plus `ctx.drawElementImage`, not `el.style.transform = rotate(...)`.
- **Returned sync transform includes the canvas CTM.** The element gets moved to where the canvas's current transform put it, not where the element would be if the canvas wasn't there.
- **Documentation burden.** This is the single biggest source of confusion for new users. The docs must flag it prominently.

## Consequences

- Transform-only mutations on canvas children don't invalidate the snapshot, so `paint` does **not** fire as a result. This is consistent with "transforms don't affect drawing."
- The math for the returned transform (see [concepts/synchronization.md](../../concepts/synchronization.md)) accounts for CTM, scale, and transform-origin — not the source element's own CSS transform.
- The "focus ring" use case (`ctx.drawFocusIfNeeded`) is straightforward: the focus ring is drawn on the canvas at the drawn position, not at the element's CSS position.
- Workers doing rendering need the same semantics — `OffscreenCanvas.drawElementImage` and the worker-side `getElementTransform` both use the un-transformed snapshot.

## References

- Original rationale in [README.md § Proposed solution / drawElementImage / Transforms](../../../README.md#2-drawelementimage-and-webglwebgpu-equivalents)
- [concepts/synchronization.md](../../concepts/synchronization.md)
