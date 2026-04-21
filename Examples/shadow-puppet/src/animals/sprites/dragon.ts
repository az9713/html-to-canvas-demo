// Dragon body: serpentine neck, head with horns, spines along back
// Faces RIGHT (head at right side). Pivot: center of image.
export const DRAGON_BODY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  <!-- Tail (behind body) -->
  <path d="M18,110 Q30,130 50,115 Q60,108 55,100" fill="none" stroke="#cc2200" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M18,110 Q30,130 50,115 Q60,108 55,100" fill="none" stroke="black" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
  <!-- Tail spike -->
  <polygon points="10,100 18,110 22,95" fill="#cc2200" stroke="black" stroke-width="4" stroke-linejoin="round"/>
  <!-- Body (elongated oval) -->
  <ellipse cx="105" cy="108" rx="68" ry="36" fill="#cc2200" stroke="black" stroke-width="6" stroke-linejoin="round"/>
  <!-- Dorsal spines -->
  <polygon points="60,75 68,90 76,75 84,90 92,75 100,90 108,75" fill="#ffcc00" stroke="black" stroke-width="4" stroke-linejoin="round"/>
  <!-- Neck -->
  <ellipse cx="162" cy="90" rx="24" ry="20" fill="#cc2200" stroke="black" stroke-width="6"/>
  <!-- Head -->
  <ellipse cx="165" cy="66" rx="28" ry="22" fill="#cc2200" stroke="black" stroke-width="6"/>
  <!-- Left horn -->
  <polygon points="148,48 140,18 156,45" fill="#ffcc00" stroke="black" stroke-width="4" stroke-linejoin="round"/>
  <!-- Right horn -->
  <polygon points="172,46 176,16 182,47" fill="#ffcc00" stroke="black" stroke-width="4" stroke-linejoin="round"/>
  <!-- Snout extension -->
  <ellipse cx="188" cy="70" rx="16" ry="12" fill="#cc2200" stroke="black" stroke-width="5"/>
  <!-- Nostril -->
  <ellipse cx="194" cy="68" rx="4" ry="3" fill="#880000"/>
  <!-- Eye (green with slit) -->
  <circle cx="160" cy="58" r="13" fill="#ffcc00" stroke="black" stroke-width="4"/>
  <ellipse cx="160" cy="58" rx="5" ry="10" fill="#005500"/>
  <ellipse cx="160" cy="58" rx="2" ry="9" fill="black"/>
  <!-- Eye shine -->
  <circle cx="163" cy="54" r="3" fill="white" opacity="0.7"/>
  <!-- Teeth (bottom jaw) -->
  <polygon points="178,76 182,82 186,76" fill="white" stroke="black" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="185,73 188,79 191,73" fill="white" stroke="black" stroke-width="2" stroke-linejoin="round"/>
  <!-- Flame breath -->
  <ellipse cx="200" cy="74" rx="14" ry="10" fill="#ff6600" stroke="#ffcc00" stroke-width="3" opacity="0.85"/>
  <!-- Belly scale pattern -->
  <path d="M55,120 Q70,128 85,120 Q100,128 115,120 Q130,128 145,120" fill="none" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
</svg>`;

// Dragon wing: large bat-style wing with membrane lines
// Pivot at RIGHT edge center (200, 100) — wing extends leftward
export const DRAGON_WING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  <!-- Main wing membrane — pivots at right center -->
  <path d="M200,100 C175,50 130,10 60,5 C40,30 55,65 100,82 C130,92 170,95 200,100 Z" fill="#991100" stroke="black" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- Lower membrane -->
  <path d="M200,100 C175,145 125,175 62,188 C50,165 70,140 105,122 C140,108 172,104 200,100 Z" fill="#bb2200" stroke="black" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- Wing finger bones (membrane spars) -->
  <line x1="200" y1="100" x2="65" y2="12" stroke="black" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
  <line x1="200" y1="100" x2="108" y2="30" stroke="black" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
  <line x1="200" y1="100" x2="148" y2="42" stroke="black" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
  <line x1="200" y1="100" x2="68" y2="182" stroke="black" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
  <line x1="200" y1="100" x2="110" y2="168" stroke="black" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
  <!-- Gold accent trim -->
  <path d="M200,100 C175,50 130,10 60,5" fill="none" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
</svg>`;
