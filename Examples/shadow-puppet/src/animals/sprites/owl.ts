// Owl: round fluffy body, huge facial disc, big comical eyes, ear tufts
// Single sprite, facing right. Center of gravity around (100, 130).
export const OWL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  <!-- Left wing (extends left from body) -->
  <ellipse cx="44" cy="122" rx="42" ry="18" fill="#996633" stroke="black" stroke-width="6" transform="rotate(-12,44,122)"/>
  <!-- Right wing (extends right) -->
  <ellipse cx="156" cy="122" rx="42" ry="18" fill="#996633" stroke="black" stroke-width="6" transform="rotate(12,156,122)"/>
  <!-- Main body (very round) -->
  <ellipse cx="100" cy="138" rx="58" ry="55" fill="#996633" stroke="black" stroke-width="6"/>
  <!-- Feather texture rows on body -->
  <path d="M55,148 Q68,158 82,148 Q95,158 108,148 Q121,158 134,148" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
  <path d="M58,164 Q72,174 88,164 Q102,174 118,164 Q132,172 144,164" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
  <!-- Talons/feet -->
  <path d="M80,188 Q75,195 68,198 M80,188 Q80,196 80,200 M80,188 Q85,196 90,200" fill="none" stroke="black" stroke-width="5" stroke-linecap="round"/>
  <path d="M120,188 Q115,195 108,198 M120,188 Q120,196 120,200 M120,188 Q125,196 132,200" fill="none" stroke="black" stroke-width="5" stroke-linecap="round"/>
  <!-- Head (round) -->
  <circle cx="100" cy="88" r="50" fill="#996633" stroke="black" stroke-width="6"/>
  <!-- Left ear tuft -->
  <polygon points="68,42 58,14 80,40" fill="#996633" stroke="black" stroke-width="5" stroke-linejoin="round"/>
  <polygon points="70,40 62,20 78,39" fill="#774422"/>
  <!-- Right ear tuft -->
  <polygon points="132,42 120,40 142,14" fill="#996633" stroke="black" stroke-width="5" stroke-linejoin="round"/>
  <polygon points="130,40 122,39 138,20" fill="#774422"/>
  <!-- Facial disc (cream oval) -->
  <ellipse cx="100" cy="92" rx="42" ry="40" fill="#ffe0aa" stroke="black" stroke-width="4"/>
  <!-- Left eye outer ring -->
  <circle cx="80" cy="88" r="20" fill="black" stroke="black" stroke-width="4"/>
  <!-- Left eye yellow iris -->
  <circle cx="80" cy="88" r="16" fill="#ffee44"/>
  <!-- Left eye pupil -->
  <circle cx="80" cy="88" r="8" fill="black"/>
  <!-- Left eye shine -->
  <circle cx="84" cy="84" r="4" fill="white"/>
  <!-- Right eye outer ring -->
  <circle cx="120" cy="88" r="20" fill="black" stroke="black" stroke-width="4"/>
  <!-- Right eye yellow iris -->
  <circle cx="120" cy="88" r="16" fill="#ffee44"/>
  <!-- Right eye pupil -->
  <circle cx="120" cy="88" r="8" fill="black"/>
  <!-- Right eye shine -->
  <circle cx="124" cy="84" r="4" fill="white"/>
  <!-- Small beak (downward hooked) -->
  <path d="M95,106 L100,118 L105,106 Z" fill="#cc9900" stroke="black" stroke-width="3" stroke-linejoin="round"/>
</svg>`;
