# Prerequisites

What you need before you can experiment with HTML-in-Canvas.

## Chromium Canary (or any Chromium build with the flag)

The API is gated behind a Chromium feature flag. Other engines do not yet implement it.

Download: [google.com/chrome/canary](https://www.google.com/chrome/canary/)

Verify version:

```bash
# macOS
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --version

# Windows (cmd)
"C:\Users\%USERNAME%\AppData\Local\Google\Chrome SxS\Application\chrome.exe" --version

# Linux
google-chrome-canary --version
```

Any Canary build from 2025 onward should include the flag. If the flag is not present in your build, update Canary.

## Enable the flag

1. In Canary, navigate to `chrome://flags/#canvas-draw-element`.
2. Change the dropdown from **Default** to **HTML-in-Canvas Enabled**. (The Chrome UI spells the option exactly that way — "HTML-in-Canvas Enabled".)
3. Click **Relaunch** at the bottom of the window.

Verify the flag is active by running this in DevTools:

```js
'onpaint' in HTMLCanvasElement.prototype
// → true
```

If it returns `false`, the flag didn't activate. Double-check the flag value and restart Canary.

## A local web server

`drawElementImage()` cannot sample cross-origin content, and `file://` pages have quirky origin behaviour. Serve the examples from HTTP instead.

Any static server works. Two quick options:

```bash
# Python 3
python3 -m http.server 8000

# Node
npx http-server -p 8000
```

Then open `http://localhost:8000/`.

## Node.js + a JS package manager (only for the WebGPU demo)

The WebGPU jelly-slider example uses TypeScript and Vite. To build or modify it, you need Node.js and any npm-compatible package manager (npm, pnpm, or yarn all work — the project ships a `package-lock.json`, so npm is the default).

The project's `package.json` doesn't declare an `engines` field, but Vite 6 (the bundled build tool) requires Node 18 or newer. Any recent LTS version will work.

Verify:

```bash
node --version     # v18.x or newer
npm --version      # any recent version
```

From the demo directory:

```bash
cd Examples/webgpu-jelly-slider
npm install        # or: pnpm install / yarn
npm run dev        # or: pnpm dev / yarn dev
```

The other examples (`complex-text.html`, `pie-chart.html`, `text-input.html`, `webGL.html`) are plain HTML and need no build step.

## Hardware

For the WebGPU demo, your machine needs:

- A GPU that supports WebGPU (most 2017+ machines do)
- Chrome flag `chrome://flags/#enable-unsafe-webgpu` enabled on Linux, or any platform where WebGPU is not yet default

Check WebGPU availability:

```js
'gpu' in navigator && await navigator.gpu.requestAdapter() !== null
// → true if WebGPU is available
```

## What you don't need

- No Chromium build from source. The flag ships in Canary.
- No polyfill. There isn't one.
- No special CSS or bundler setup for the basic examples.
