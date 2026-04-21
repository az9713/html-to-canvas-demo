// Rabbit: plump round body, tall ears, big eyes, pink nose, fluffy tail
// Single sprite — entire animal fits in viewBox, center around (100,130)
export const RABBIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  <!-- Fluffy tail pom-pom (behind body) -->
  <circle cx="28" cy="148" r="18" fill="white" stroke="black" stroke-width="5"/>
  <!-- Body (plump oval) -->
  <ellipse cx="105" cy="145" rx="58" ry="50" fill="#f5f0e8" stroke="black" stroke-width="6"/>
  <!-- Left ear outer -->
  <ellipse cx="72" cy="52" rx="16" ry="40" fill="#f5f0e8" stroke="black" stroke-width="6" transform="rotate(-8,72,52)"/>
  <!-- Left ear inner (pink) -->
  <ellipse cx="72" cy="52" rx="8" ry="28" fill="#ffaabb" transform="rotate(-8,72,52)"/>
  <!-- Right ear outer -->
  <ellipse cx="118" cy="46" rx="16" ry="42" fill="#f5f0e8" stroke="black" stroke-width="6" transform="rotate(6,118,46)"/>
  <!-- Right ear inner (pink) -->
  <ellipse cx="118" cy="46" rx="8" ry="30" fill="#ffaabb" transform="rotate(6,118,46)"/>
  <!-- Head (round) -->
  <circle cx="138" cy="108" r="40" fill="#f5f0e8" stroke="black" stroke-width="6"/>
  <!-- Left front leg -->
  <ellipse cx="80" cy="185" rx="14" ry="18" fill="#f5f0e8" stroke="black" stroke-width="5"/>
  <!-- Right front leg -->
  <ellipse cx="120" cy="187" rx="14" ry="18" fill="#f5f0e8" stroke="black" stroke-width="5"/>
  <!-- Eye left (big) -->
  <circle cx="124" cy="100" r="14" fill="white" stroke="black" stroke-width="4"/>
  <circle cx="127" cy="98" r="7" fill="#1a0a20"/>
  <circle cx="130" cy="95" r="2.5" fill="white"/>
  <!-- Eye right -->
  <circle cx="155" cy="97" r="14" fill="white" stroke="black" stroke-width="4"/>
  <circle cx="158" cy="95" r="7" fill="#1a0a20"/>
  <circle cx="161" cy="92" r="2.5" fill="white"/>
  <!-- Pink nose -->
  <ellipse cx="158" cy="118" rx="8" ry="6" fill="#ff88aa" stroke="black" stroke-width="3"/>
  <!-- Mouth lines -->
  <path d="M158,124 Q148,132 142,130" fill="none" stroke="black" stroke-width="3" stroke-linecap="round"/>
  <path d="M158,124 Q168,132 172,130" fill="none" stroke="black" stroke-width="3" stroke-linecap="round"/>
  <!-- Whiskers left -->
  <line x1="148" y1="118" x2="112" y2="112" stroke="black" stroke-width="2" stroke-linecap="round"/>
  <line x1="148" y1="122" x2="110" y2="122" stroke="black" stroke-width="2" stroke-linecap="round"/>
  <!-- Whiskers right -->
  <line x1="168" y1="118" x2="196" y2="112" stroke="black" stroke-width="2" stroke-linecap="round"/>
  <line x1="168" y1="122" x2="198" y2="122" stroke="black" stroke-width="2" stroke-linecap="round"/>
</svg>`;
