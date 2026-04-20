# HTML-in-Canvas

> **⚠️ A special version of Chrome is required.** The demos, examples, and code in these docs only run in **Chromium Canary** (or another Chromium build that ships the flag) with `chrome://flags/#canvas-draw-element` set to **HTML-in-Canvas Enabled**. They will NOT work in regular Chrome, Firefox, or Safari.
>
> Steps:
>
> 1. Download [Chromium Canary](https://www.google.com/chrome/canary/).
> 2. In Canary, open `chrome://flags/#canvas-draw-element`.
> 3. Change the dropdown from **Default** to **HTML-in-Canvas Enabled**.
> 4. Click **Relaunch**.
>
> Verify in DevTools:
>
> ```js
> 'onpaint' in HTMLCanvasElement.prototype
> // → true means the flag is active
> ```
>
> If you see `false`, the flag is off. See [prerequisites](getting-started/prerequisites.md).

A proposed Web Platform API for drawing live HTML elements into `<canvas>` — in 2D, WebGL, and WebGPU contexts — without sacrificing accessibility, interactivity, or layout fidelity.

This site is the developer documentation for the WICG explainer. For spec discussion and issue tracking, see the [WICG/html-in-canvas](https://github.com/WICG/html-in-canvas) repository.

---

## Documentation

| Section | What's inside |
|---------|--------------|
| [Overview](overview/what-is-this.md) | What the API is, the problem it solves, and the mental model |
| [Getting Started](getting-started/quickstart.md) | Enable the flag, run your first demo in under 10 minutes |
| [Concepts](concepts/layoutsubtree.md) | Deep dives: `layoutsubtree`, the `paint` event, element images, synchronization, and the privacy model |
| [Guides](guides/render-to-2d-canvas.md) | Task-oriented how-tos for 2D, WebGL, WebGPU, and `OffscreenCanvas` |
| [Reference](reference/api.md) | Complete API reference and raw WebIDL |
| [Architecture](architecture/design-goals.md) | Design goals, Architecture Decision Records |
| [Demos](demos.md) | Live demos you can run in Canary — starter and advanced |
| [Troubleshooting](troubleshooting/common-issues.md) | Common failures and their fixes |
| [Debugging journal](debugging-journal.md) | Bugs we hit building the advanced demos and how we fixed them |

---

## New here?

Start with [what-is-this](overview/what-is-this.md) to build the mental model, then the [onboarding guide](getting-started/onboarding.md) for a narrative walkthrough.

Already using canvas and want to add live HTML? Skip to the [quickstart](getting-started/quickstart.md).

## Status

The APIs are implemented **behind a flag** in Chromium Canary. They are **not yet shipped**, the IDL is not stable, and behaviour may change as the spec evolves. Do not ship production sites that depend on these APIs.

Enable the flag at `chrome://flags/#canvas-draw-element`.

## Feedback

File issues and design questions at [github.com/WICG/html-in-canvas/issues](https://github.com/WICG/html-in-canvas/issues/new). The working group is especially interested in:

- Content that works vs. fails
- Accessibility interactions
- Performance characteristics for your use case
