// Wolf: prowling wolf facing right — pointy ears, long snout, bushy tail
// Single sprite, center roughly at (100, 130)
export const WOLF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  <!-- Bushy tail (behind body, sweeping up-left) -->
  <path d="M45,125 Q20,110 10,82 Q22,75 32,88 Q40,100 50,118" fill="#888899" stroke="black" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Tail tip (lighter bushy tuft) -->
  <circle cx="12" cy="78" r="14" fill="#ccccdd" stroke="black" stroke-width="5"/>
  <!-- Rear legs -->
  <rect x="52" y="152" width="16" height="36" rx="6" fill="#888899" stroke="black" stroke-width="5"/>
  <rect x="72" y="155" width="16" height="36" rx="6" fill="#888899" stroke="black" stroke-width="5"/>
  <!-- Rear paws -->
  <ellipse cx="60" cy="190" rx="11" ry="7" fill="#777788" stroke="black" stroke-width="4"/>
  <ellipse cx="80" cy="192" rx="11" ry="7" fill="#777788" stroke="black" stroke-width="4"/>
  <!-- Body (long oval, low slung) -->
  <ellipse cx="108" cy="148" rx="72" ry="38" fill="#888899" stroke="black" stroke-width="6"/>
  <!-- Belly lighter area -->
  <ellipse cx="108" cy="158" rx="48" ry="22" fill="#aaaabc" stroke="none"/>
  <!-- Front legs -->
  <rect x="138" y="158" width="16" height="38" rx="6" fill="#888899" stroke="black" stroke-width="5"/>
  <rect x="158" y="160" width="16" height="36" rx="6" fill="#888899" stroke="black" stroke-width="5"/>
  <!-- Front paws -->
  <ellipse cx="146" cy="197" rx="11" ry="7" fill="#777788" stroke="black" stroke-width="4"/>
  <ellipse cx="166" cy="197" rx="11" ry="7" fill="#777788" stroke="black" stroke-width="4"/>
  <!-- Neck -->
  <ellipse cx="162" cy="122" rx="26" ry="22" fill="#888899" stroke="black" stroke-width="6"/>
  <!-- Head (round with pointed snout) -->
  <ellipse cx="162" cy="96" rx="32" ry="28" fill="#888899" stroke="black" stroke-width="6"/>
  <!-- Left ear (pointy) -->
  <polygon points="138,72 130,42 152,68" fill="#888899" stroke="black" stroke-width="5" stroke-linejoin="round"/>
  <!-- Left ear inner -->
  <polygon points="140,70 134,50 150,67" fill="#cc8899"/>
  <!-- Right ear -->
  <polygon points="165,70 162,40 180,66" fill="#888899" stroke="black" stroke-width="5" stroke-linejoin="round"/>
  <!-- Right ear inner -->
  <polygon points="166,69 164,48 178,66" fill="#cc8899"/>
  <!-- Snout (elongated muzzle) -->
  <ellipse cx="187" cy="102" rx="22" ry="16" fill="#ccccdd" stroke="black" stroke-width="5"/>
  <!-- Snout seam -->
  <line x1="187" y1="102" x2="204" y2="102" stroke="black" stroke-width="3" stroke-linecap="round"/>
  <!-- Nose -->
  <ellipse cx="200" cy="96" rx="8" ry="6" fill="#222233" stroke="black" stroke-width="3"/>
  <!-- Eye (yellow, fierce) -->
  <circle cx="158" cy="88" r="12" fill="white" stroke="black" stroke-width="4"/>
  <circle cx="160" cy="88" r="8" fill="#ffee44"/>
  <ellipse cx="160" cy="88" rx="3" ry="7" fill="#1a1a22"/>
  <!-- Eye shine -->
  <circle cx="163" cy="85" r="2.5" fill="white"/>
  <!-- Fur texture marks -->
  <path d="M138,110 Q145,105 152,110" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
  <path d="M108,135 Q115,128 122,135" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
</svg>`;
