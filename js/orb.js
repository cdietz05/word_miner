// The Catch Orb: a glowing crystal sphere with a gold band round its middle
// and a star at its heart. It's the game's own - not any other game's ball.

let drawn = 0;

// [lit] is an orb that has just shut on a critter, glowing brighter.
export function orbSvg({ lit = false } = {})
{
  drawn += 1;
  const id = `orb-${drawn}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Catch Orb">
    <defs>
      <radialGradient id="${id}-body" cx="0.38" cy="0.32" r="0.75">
        <stop offset="0" stop-color="${lit ? '#ffffff' : '#c8fff9'}"/>
        <stop offset="0.35" stop-color="#4fe0e6"/>
        <stop offset="0.75" stop-color="#3656c8"/>
        <stop offset="1" stop-color="#241a6e"/>
      </radialGradient>
      <radialGradient id="${id}-core">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="0.5" stop-color="#fff2a0"/>
        <stop offset="1" stop-color="#ffd23f" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="44" fill="url(#${id}-body)" stroke="#161427" stroke-width="6"/>
    <path d="M 8 52 Q 50 70 92 52" fill="none" stroke="#161427" stroke-width="13" stroke-linecap="round"/>
    <path d="M 8 52 Q 50 70 92 52" fill="none" stroke="#ffc21f" stroke-width="7" stroke-linecap="round"/>
    <circle cx="50" cy="60" r="${lit ? 22 : 15}" fill="url(#${id}-core)"/>
    <path d="M 50 48 L 53.5 56 L 62 56.5 L 55.5 62 L 57.5 70 L 50 65.5 L 42.5 70 L 44.5 62 L 38 56.5 L 46.5 56 Z" fill="#fff6c2" stroke="#161427" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="34" cy="28" rx="12" ry="7" fill="#ffffff" opacity="0.75" transform="rotate(-30 34 28)"/>
  </svg>`;
}
