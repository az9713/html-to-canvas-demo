// Bird body: plump oval body, round head with big eye and orange beak
// Pivot: center of the image (used for body placement)
export const BIRD_BODY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  <!-- Plump body -->
  <ellipse cx="90" cy="125" rx="50" ry="38" fill="#4db8ff" stroke="black" stroke-width="6" stroke-linejoin="round"/>
  <!-- Round head -->
  <circle cx="152" cy="85" r="32" fill="#4db8ff" stroke="black" stroke-width="6"/>
  <!-- Eye white -->
  <circle cx="162" cy="76" r="12" fill="white" stroke="black" stroke-width="4"/>
  <!-- Eye pupil -->
  <circle cx="165" cy="74" r="6" fill="#1a2040"/>
  <!-- Eye shine -->
  <circle cx="168" cy="71" r="2.5" fill="white"/>
  <!-- Orange beak -->
  <polygon points="175,80 198,88 175,98" fill="#ff8c00" stroke="black" stroke-width="4" stroke-linejoin="round"/>
  <!-- Tail feathers -->
  <polygon points="42,115 8,108 15,130 42,135" fill="#2299ee" stroke="black" stroke-width="5" stroke-linejoin="round"/>
  <polygon points="42,128 5,128 12,148 42,143" fill="#2299ee" stroke="black" stroke-width="5" stroke-linejoin="round"/>
</svg>`;

// Bird wing: teardrop/delta shape, pivot at right edge (attachment to body)
// The wing extends leftward from pivot at (200, 100)
export const BIRD_WING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  <!-- Wing teardrop shape — pivot at right center (200,100), extends left -->
  <path d="M200,100 C160,60 80,30 20,70 C60,95 100,98 200,100 Z" fill="#4db8ff" stroke="black" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- Wing tip accent -->
  <path d="M200,100 C160,140 80,165 20,130 C60,105 100,102 200,100 Z" fill="#2299ee" stroke="black" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- Feather lines -->
  <line x1="200" y1="100" x2="60" y2="68" stroke="black" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="200" y1="100" x2="40" y2="80" stroke="black" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="200" y1="100" x2="40" y2="100" stroke="black" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;
