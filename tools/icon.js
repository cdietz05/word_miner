// Prints the game's icon as SVG: the Catch Orb on a night sky, with a few
// sparkles. tools/make_icons.sh turns it into the PNGs in icons/.

import { orbSvg } from '../js/orb.js';

const sparkle = (x, y, size) => `<path d="M ${x} ${y - size} Q ${x} ${y} ${x + size} ${y} Q ${x} ${y} ${x} ${y + size} Q ${x} ${y} ${x - size} ${y} Q ${x} ${y} ${x} ${y - size} Z" fill="#fff6c2"/>`;

print(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="sky" cx="0.5" cy="0.4" r="0.8">
      <stop offset="0" stop-color="#4b3fb0"/>
      <stop offset="1" stop-color="#141a3a"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#sky)"/>
  <circle cx="512" cy="530" r="330" fill="#5ff2e0" opacity="0.18"/>
  ${sparkle(190, 200, 46)}${sparkle(850, 250, 34)}${sparkle(820, 830, 50)}${sparkle(170, 800, 28)}
  ${orbSvg().replace('<svg ', '<svg x="172" y="190" width="680" height="680" ')}
</svg>`);
