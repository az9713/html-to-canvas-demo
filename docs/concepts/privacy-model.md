# The privacy model

What the browser will and will not paint into an element image. Understanding this matters: it determines which web content can safely be sampled, and whether reading back canvas pixels taints the canvas.

## The design rule

A design requirement of HTML-in-Canvas is: **do not reveal any security- or privacy-sensitive information that author code can't already observe**, and limit new privacy exposure. Both the painted pixels and the `paint` event's invalidation signal have to uphold this.

The browser enforces the rule by **excluding** sensitive information from snapshots and from the triggers that fire `paint`.

## What is never painted

These are omitted from every element image snapshot, even if the element is on-screen:

| Excluded | Why |
|----------|-----|
| Cross-origin embedded content (`<iframe>`, `<img>`, `<video>`, etc.) that doesn't pass CORS | Otherwise author code could read pixels it has no origin access to. Same-origin iframes still paint; cross-origin content within them is excluded. |
| Cross-origin resources referenced from CSS (`url(...)` in `background-image`, `clip-path`, `mask-image`, `filter: url(...)`, etc.) | Same reason — bypass for cross-origin image reads. |
| Cross-origin SVG `<use>` references | Same reason. |
| System colors, themes, and OS preferences | Reveals user-OS configuration and enables fingerprinting. |
| Spelling and grammar markers (the squiggly underlines) | User-private text analysis results. |
| Visited-link styles (`:visited`) | Long-standing rule: `:visited` cannot be observed by script. |
| Pending autofill information not otherwise accessible to JS | Leaks credentials, addresses, etc. before the user commits them. |
| Subpixel text anti-aliasing | Reveals fine-grained OS rendering configuration. |

## What **is** painted (despite looking sensitive)

A few things that might seem privacy-sensitive at first glance but are either already observable or explicitly judged acceptable:

- **Find-in-page selection markers** and **text-fragment markers** — already observable via the `::target-text` pseudo-element and similar.
- **Scrollbar appearance** — already extractable via SVG `foreignObject`.
- **Form control (input, button, select) native appearance** — same reason.
- **Caret blink rate** — new exposure, judged acceptable (low entropy).
- **`forced-colors` palette** — already available via `@media (forced-colors)` and system color keywords.

## Implications for your code

### Reading pixels still taints the canvas for cross-origin content

If a same-origin iframe you drew contains cross-origin content, the cross-origin content is not painted (blank area), but reads via `getImageData()`, `toDataURL()`, or `toBlob()` are **not** additionally restricted beyond the standard rules. You'll read the blank area as black/transparent.

If you draw same-origin content into a canvas, pixel reads work normally.

### Invalidation is also filtered

The `paint` event fires when snapshots **change**. But the trigger must not leak information the snapshot itself wouldn't. So:

- Changes to a visited link's color don't fire `paint`.
- Changes to autofill preview content don't fire `paint`.
- Changes to spelling markers don't fire `paint`.

The practical effect: your `onpaint` handler runs when things a well-behaved author can observe change, and not otherwise.

### Same-origin iframes

Same-origin iframes render normally inside snapshots — including their DOM, their styles, their embedded images. Cross-origin iframes, and cross-origin content *within* same-origin iframes, do not paint.

### `srcset`, responsive images, and modern loading

Whatever the browser chose to paint for an `<img>` is what ends up in the snapshot — same as any other paint. No special handling.

### Video

Video frames paint into snapshots as long as CORS permits them to be read. `crossorigin="anonymous"` on a video element with a CORS-compliant source enables painting; without it, the video area is excluded (blank).

### Fonts

Web fonts paint into snapshots once loaded. Document fonts (webfonts you served) are always paintable. System fonts loaded via `font-family: system-ui` or OS fallback paint as well — the concern is the *palette* (colors, themes), not the glyph shapes.

## What a cross-origin-tainted snapshot looks like

A snapshot with excluded content has those regions rendered **transparent** (or the browser's chosen placeholder). Other content around them renders normally. The result: a snapshot of a mixed-origin page is "swiss cheese" — your content is there, the cross-origin parts aren't.

This means a page that's mostly first-party with a single cross-origin widget still produces a mostly-useful snapshot. The widget's area is blank, but everything else draws.

## Security vs. privacy

A useful distinction the specification makes:

- **Security**: does the feature let author code read data that should be inaccessible (cross-origin content, credentials, etc.)? The design rule is **no new security exposure, period**.
- **Privacy**: does the feature reveal information about the user or their system (themes, preferences, OS config)? The rule is **minimize new privacy exposure**, with a small handful of intentional carve-outs (caret blink rate, form-control chrome) justified by the interactivity use case.

## What the spec doesn't commit to yet

As of this writing, the spec defers some details:

- **Exact placeholder color for excluded regions.** Implementations may choose transparent, neutral-fill, or a pattern.
- **Behaviour under forced colors.** Forced-color mode itself is paintable, but how user-chosen high-contrast overrides interact with `layoutsubtree` is still under design.
- **Spec-level "Security Considerations" and "Privacy Considerations" sections.** The explainer has privacy issues called out; formal spec sections will land as the proposal matures.

## Related

- [`security-privacy-questionnaire.md`](../../security-privacy-questionnaire.md) — the W3C Self-Review Questionnaire for this feature
- [concepts/element-images.md](element-images.md) — what snapshots are
- [README](../../README.md#privacy-preserving-painting) — the original rationale in the explainer
