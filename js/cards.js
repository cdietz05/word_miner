// Critter cards, as HTML with the critter's picture drawn in (see
// creature_art.js). The foil on holo, stage 2 and legendary cards is all in
// styles.css.

import { RARITIES, TYPES, critterById } from './critters.js';
import { creatureSvg } from './creature_art.js';

// Every picture on the page needs its own ids for its gradients and glow.
let drawn = 0;

export function critterPicture(critter, { silhouette = false } = {})
{
  drawn += 1;
  return creatureSvg(critter, { uid: `${critter.id}-${drawn}`, silhouette });
}

// A card's markup. [unknown] is the Critter Book's slot for one not caught
// yet - its shape in shadow and a question mark, so there's something to
// look forward to. [holo] is the holo version of the card.
export function cardHtml(critter, { count = 0, big = false, unknown = false, isNew = false, holo = false } = {})
{
  const type = TYPES[critter.type];
  const rarity = RARITIES[critter.rarity];
  const classes = ['card', `type-${critter.type}`, critter.rarity, big ? 'big' : '', unknown ? 'unknown' : '', holo ? 'holo' : ''].join(' ');
  const stars = '★'.repeat(rarity.stars);
  if (unknown)
  {
    return `
      <div class="${classes}" data-critter="${critter.id}">
        <div class="card-top"><span class="card-name">???</span><span class="card-hp">${type.icon}</span></div>
        <div class="card-art">${critterPicture(critter, { silhouette: true })}</div>
        <div class="card-stars">${holo ? '✨ HOLO' : stars}</div>
      </div>`;
  }
  const from = critter.evolvesFrom ? critterById(critter.evolvesFrom) : null;
  return `
    <div class="${classes}" data-critter="${critter.id}">
      ${count > 1 ? `<span class="count">x${count}</span>` : ''}
      ${isNew ? '<span class="new-badge">NEW</span>' : ''}
      <div class="card-top"><span class="card-name">${critter.name}</span><span class="card-hp"><span class="hp-number">HP ${critter.hp} </span>${type.icon}</span></div>
      <div class="card-stage">${rarity.label.toUpperCase()}${from ? ` <span>grows from ${from.name}</span>` : ''}</div>
      <div class="card-art">${critterPicture(critter)}</div>
      <div class="card-move"><span>${critter.move}</span><span>${critter.damage}</span></div>
      <div class="card-stars">${holo ? '<span class="holo-tag">✨ HOLO</span>' : ''}${stars}</div>
    </div>`;
}
