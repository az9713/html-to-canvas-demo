/**
 * DOM for the liquid-glass navigation demo.
 *
 * Architecture:
 *   <div class="root">
 *     <canvas layoutsubtree>        ← fills viewport, ONE direct child
 *       <div class="page">          ← article body (position: static enforced)
 *         …hero, article, gradients…
 *       </div>
 *     </canvas>
 *     <nav class="nav">             ← lives OUTSIDE the canvas, normal DOM,
 *                                     position: fixed. z-index above canvas.
 *       <a>Work</a><a>Studio</a>…
 *     </nav>
 *   </div>
 *
 * Why the nav is outside: layoutsubtree forces position:static on direct
 * canvas children, which breaks the standard "fixed nav" pattern. Keeping
 * the nav as a sibling DOM element (not a canvas child) preserves:
 *   - Focusable keyboard-navigable menu items (native HTML)
 *   - Screen-reader-friendly landmarks (<nav> at document scope)
 *   - Normal CSS positioning and hover states
 *
 * The canvas still does the hard part: sampling the page via
 * drawElementImage and rendering a frosted-glass zone within it.
 */

export interface DemoDom {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  pageEl: HTMLElement;
  navEl: HTMLElement;
}

export function buildDemoDom(): DemoDom {
  const root = document.createElement('div');
  root.className = 'demo-root';

  const canvas = document.createElement('canvas');
  canvas.id = 'demo-canvas';
  canvas.setAttribute('layoutsubtree', '');
  canvas.setAttribute('aria-label', 'Liquid glass demo canvas');

  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = /* html */`
    <header class="page-hero">
      <div class="hero-gradient" aria-hidden="true"></div>
      <div class="hero-copy">
        <div class="eyebrow">Journal · Issue 07</div>
        <h1>Materials that feel<br/>like objects again</h1>
        <p>On the craft of translating physical intuition into pixels.</p>
      </div>
    </header>

    <section class="stripe">
      <div style="background:#ff4e8a"></div>
      <div style="background:#ff9040"></div>
      <div style="background:#ffd93d"></div>
      <div style="background:#59d685"></div>
      <div style="background:#59b6ff"></div>
      <div style="background:#a86eff"></div>
      <div style="background:#e066b3"></div>
    </section>

    <section class="prose">
      <p>
        A well-made interface communicates not just what a user can do, but
        what kind of thing the interface <em>is</em>. For decades that meant
        borrowing from physical metaphors — buttons, folders, paper — because
        that was the only way to make a screen feel intentional.
      </p>
      <p>
        The web has historically been bad at one category of metaphor:
        <strong>materials</strong>. Light through frosted glass, the subtle
        refraction of a magnifier, the way chrome picks up color from its
        environment — these aren't decorations. They're load-bearing signals
        about hierarchy and focus.
      </p>

      <figure class="card">
        <div class="card-media" aria-hidden="true">
          <div class="orb orb-a"></div>
          <div class="orb orb-b"></div>
          <div class="orb orb-c"></div>
        </div>
        <figcaption>
          <strong>Figure 1 — Orbs.</strong> Three spheres render with a
          soft gradient. Their interaction with the glass above is where
          the material claim is tested.
        </figcaption>
      </figure>

      <p>
        The bar at the top of this page is an HTML <code>&lt;nav&gt;</code>.
        The menu links are real <code>&lt;a&gt;</code> elements. Focus them
        with <kbd>Tab</kbd>, follow with <kbd>Enter</kbd>, screen readers
        announce them. The frosted glass underneath is the canvas: it samples
        this article content via <code>drawElementImage</code>, applies a
        blur and chromatic shift, and draws it behind the nav.
      </p>

      <p>
        Scroll the content (mouse wheel, arrows). Watch the glass refract
        the colorful content as it passes underneath.
      </p>

      <h2>Why this matters</h2>
      <p>
        Native platforms have shipped glass materials for years. On the web
        they've been either (a) faked with blurred DOM copies (expensive,
        brittle) or (b) not rendered at all, because cross-origin paint
        restrictions blocked the naïve approach.
      </p>
      <p>
        With <code>drawElementImage</code>, the canvas can sample any direct
        child it owns — including this article — and composite it with any
        2D canvas operations without ever touching the DOM's accessibility
        tree.
      </p>

      <h2>What stays unchanged</h2>
      <ul>
        <li>Keyboard focus order.</li>
        <li>Screen-reader announcements.</li>
        <li>Link targets, <code>mailto:</code>/<code>tel:</code> URIs.</li>
        <li>Browser find-in-page (<kbd>Ctrl+F</kbd>/<kbd>⌘+F</kbd>).</li>
        <li>IME composition, spellcheck, autofill.</li>
      </ul>

      <p style="opacity:.7">
        Keep scrolling — the content continues past where the glass reaches,
        on purpose. The refraction updates per frame, driven by
        <code>requestPaint()</code> from the scroll handler.
      </p>
    </section>
  `;

  canvas.appendChild(page);

  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = /* html */`
    <a class="brand" href="#top" aria-label="Glass &amp; Co home">
      Glass<span aria-hidden="true">·</span>co
    </a>
    <ul>
      <li><a href="#work">Work</a></li>
      <li><a href="#studio">Studio</a></li>
      <li><a href="#journal" aria-current="page">Journal</a></li>
      <li><a href="#contact">Contact</a></li>
      <li><button type="button" class="cta">Try it</button></li>
    </ul>
  `;

  root.appendChild(canvas);
  root.appendChild(nav);

  return { root, canvas, pageEl: page, navEl: nav };
}
