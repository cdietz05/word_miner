// Drawing critter cards on the page. The card itself is HTML; its picture
// is a small canvas each card fills in from critters.critterSprite.

import { RARITIES, TYPES, critterSprite } from './critters.js';

// A card's markup. [unknown] is the binder's face-down slot for a card not
// found yet - a dark outline and a question mark, so there's something to
// look forward to.
export function cardHtml(critter, { count = 0, big = false, unknown = false, isNew = false } = {})
{
  const type = TYPES[critter.type];
  const rarity = RARITIES[critter.rarity];
  const classes = ['card', `type-${critter.type}`, critter.rarity, big ? 'big' : '', unknown ? 'unknown' : ''].join(' ');
  const stars = '★'.repeat(rarity.stars);
  if (unknown)
  {
    return `
      <div class="${classes}" data-critter="${critter.id}">
        <div class="card-top"><span>???</span><span class="card-hp">${type.icon}</span></div>
        <div class="card-art"><canvas width="16" height="16" data-sprite="${critter.id}" data-silhouette="1"></canvas></div>
        <div class="card-stars">${stars}</div>
      </div>`;
  }
  return `
    <div class="${classes}" data-critter="${critter.id}">
      ${count > 1 ? `<span class="count">x${count}</span>` : ''}
      ${isNew ? '<span class="new-badge">NEW</span>' : ''}
      <div class="card-top"><span class="card-name">${critter.name}</span><span class="card-hp">HP ${critter.hp} ${type.icon}</span></div>
      <div class="card-art"><canvas width="16" height="16" data-sprite="${critter.id}"></canvas></div>
      <div class="card-move"><span>${critter.move}</span><span>${critter.damage}</span></div>
      <div class="card-stars">${stars}</div>
    </div>`;
}

// Fills in every card picture under [root].
export function drawSprites(root, critterById)
{
  root.querySelectorAll('canvas[data-sprite]').forEach((canvas) =>
  {
    const critter = critterById(canvas.dataset.sprite);
    if (critter)
    {
      drawSprite(canvas, critterSprite(critter), canvas.dataset.silhouette === '1');
    }
  });
}

// One sprite onto a 16 x 16 canvas; the page scales it up without smoothing.
// A silhouette is the shape alone, in one dark colour.
export function drawSprite(canvas, sprite, silhouette = false)
{
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < sprite.size; row++)
  {
    for (let col = 0; col < sprite.size; col++)
    {
      const value = sprite.grid[row][col];
      if (value < 0)
      {
        continue;
      }
      context.fillStyle = silhouette ? '#11131a' : sprite.palette[value];
      context.fillRect(col, row, 1, 1);
    }
  }
}
