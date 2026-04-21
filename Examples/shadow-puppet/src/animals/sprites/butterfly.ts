// Butterfly body: elongated oval with antennae
// Pivot: center of body (100, 100)
export const BUTTERFLY_BODY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  <!-- Body elongated oval -->
  <ellipse cx="100" cy="105" rx="14" ry="52" fill="#220044" stroke="black" stroke-width="6"/>
  <!-- Body highlight stripe -->
  <ellipse cx="100" cy="105" rx="5" ry="36" fill="#6622cc" opacity="0.6"/>
  <!-- Left antenna -->
  <path d="M94,55 Q78,28 72,18" fill="none" stroke="black" stroke-width="5" stroke-linecap="round"/>
  <circle cx="72" cy="18" r="7" fill="#ff6600" stroke="black" stroke-width="4"/>
  <!-- Right antenna -->
  <path d="M106,55 Q122,28 128,18" fill="none" stroke="black" stroke-width="5" stroke-linecap="round"/>
  <circle cx="128" cy="18" r="7" fill="#ff6600" stroke="black" stroke-width="4"/>
</svg>`;

// Butterfly wing: large fan/teardrop with decorative spots
// Pivot at RIGHT edge center (200, 100) — wing extends leftward
// This single wing is used for both left and right (right side gets ctx.scale(-1,1))
export const BUTTERFLY_WING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  <!-- Forewing (upper): pivots at right center -->
  <path d="M200,95 C170,40 90,8 18,28 C50,70 120,85 200,95 Z" fill="#ff6600" stroke="black" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- Hindwing (lower): smaller, rounder -->
  <path d="M200,105 C165,130 95,168 30,162 C62,130 130,115 200,105 Z" fill="#ff8800" stroke="black" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- Decorative spots on forewing -->
  <circle cx="90" cy="52" r="12" fill="white" stroke="black" stroke-width="3"/>
  <circle cx="130" cy="40" r="8" fill="white" stroke="black" stroke-width="3"/>
  <circle cx="58" cy="72" r="9" fill="white" stroke="black" stroke-width="3"/>
  <!-- Spot on hindwing -->
  <circle cx="88" cy="145" r="10" fill="white" stroke="black" stroke-width="3"/>
  <circle cx="120" cy="135" r="7" fill="white" stroke="black" stroke-width="3"/>
  <!-- Wing vein lines -->
  <line x1="200" y1="95" x2="30" y2="45" stroke="black" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
  <line x1="200" y1="100" x2="25" y2="95" stroke="black" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
  <line x1="200" y1="105" x2="42" y2="148" stroke="black" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
</svg>`;
