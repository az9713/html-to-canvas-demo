// Spider body only — legs are drawn separately with Canvas 2D IK.
// The image is centered on (100, 100) with:
//   - Abdomen centered at (100, 125) radius ~55
//   - Cephalothorax centered at (100, 52) radius ~35
// The draw() method will position/size this to match the old body drawing regions.
export const SPIDER_BODY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  <!-- Abdomen (large round) -->
  <circle cx="100" cy="130" r="58" fill="#222233" stroke="black" stroke-width="7"/>
  <!-- Abdomen purple highlights (hour-glass pattern) -->
  <ellipse cx="100" cy="130" rx="22" ry="36" fill="#6622cc" opacity="0.5"/>
  <!-- Abdomen sheen -->
  <ellipse cx="85" cy="112" rx="18" ry="12" fill="white" opacity="0.1"/>
  <!-- Silk spinnerets -->
  <ellipse cx="100" cy="182" rx="10" ry="8" fill="#333344" stroke="black" stroke-width="4"/>
  <!-- Cephalothorax (smaller, front segment) -->
  <circle cx="100" cy="52" r="38" fill="#222233" stroke="black" stroke-width="7"/>
  <!-- Cephalothorax sheen -->
  <ellipse cx="88" cy="40" rx="14" ry="10" fill="white" opacity="0.12"/>
  <!-- Pedicel (waist connecting the two body parts) -->
  <ellipse cx="100" cy="92" rx="12" ry="10" fill="#222233" stroke="black" stroke-width="5"/>
  <!-- 8 eyes: 2 rows of 4 across the front of cephalothorax -->
  <!-- Front row (4 eyes): larger principal eyes in center -->
  <circle cx="78" cy="42" r="7" fill="#ff4400" stroke="black" stroke-width="3"/>
  <circle cx="91" cy="36" r="9" fill="#ff6600" stroke="black" stroke-width="3"/>
  <circle cx="109" cy="36" r="9" fill="#ff6600" stroke="black" stroke-width="3"/>
  <circle cx="122" cy="42" r="7" fill="#ff4400" stroke="black" stroke-width="3"/>
  <!-- Back row (4 eyes): smaller secondary eyes -->
  <circle cx="76" cy="56" r="5" fill="#cc2200" stroke="black" stroke-width="2.5"/>
  <circle cx="89" cy="52" r="6" fill="#cc2200" stroke="black" stroke-width="2.5"/>
  <circle cx="111" cy="52" r="6" fill="#cc2200" stroke="black" stroke-width="2.5"/>
  <circle cx="124" cy="56" r="5" fill="#cc2200" stroke="black" stroke-width="2.5"/>
  <!-- Eye shine dots -->
  <circle cx="93" cy="34" r="2.5" fill="white" opacity="0.7"/>
  <circle cx="111" cy="34" r="2.5" fill="white" opacity="0.7"/>
  <!-- Chelicerae (fangs) -->
  <path d="M88,70 Q82,82 86,90" fill="none" stroke="black" stroke-width="6" stroke-linecap="round"/>
  <path d="M112,70 Q118,82 114,90" fill="none" stroke="black" stroke-width="6" stroke-linecap="round"/>
  <circle cx="86" cy="91" r="5" fill="#440088" stroke="black" stroke-width="3"/>
  <circle cx="114" cy="91" r="5" fill="#440088" stroke="black" stroke-width="3"/>
</svg>`;
