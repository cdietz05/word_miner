// The creature cards: who they are, how packs hand them out, and the pixel
// art for each one. All original - names, art and all - and pure, so the
// tests can check the packs and the art without a browser.

export const TYPES = {
  grass: { label: 'Grass', icon: '🌿', palette: ['#1b2a12', '#2f6b1f', '#4fa336', '#8fd46a', '#d8f5b8', '#ffffff', '#15210d', '#e0e84a'] },
  fire: { label: 'Fire', icon: '🔥', palette: ['#2a0f08', '#9c2d12', '#e0552a', '#ff9a4d', '#ffd9a8', '#ffffff', '#240a04', '#ffd23f'] },
  water: { label: 'Water', icon: '💧', palette: ['#0b1c33', '#1d5796', '#3b8fe0', '#7cc2ff', '#cfeaff', '#ffffff', '#08142a', '#5ff2e0'] },
  stone: { label: 'Stone', icon: '🪨', palette: ['#1c1c1f', '#55565c', '#86878f', '#b7b8bf', '#e2e2e6', '#ffffff', '#141416', '#c9a15a'] },
  spark: { label: 'Spark', icon: '⚡', palette: ['#2b2205', '#9a7a0c', '#e8c21a', '#ffe768', '#fff6c2', '#ffffff', '#221a02', '#fffbe3'] },
  frost: { label: 'Frost', icon: '❄️', palette: ['#10283a', '#4d8db3', '#8ccbe8', '#c7ecff', '#f2fbff', '#ffffff', '#0c2030', '#e9f7ff'] },
  shadow: { label: 'Shadow', icon: '🌙', palette: ['#120b1c', '#3d2466', '#6a44a8', '#a283dd', '#dccdf7', '#ffffff', '#0d0716', '#ff6fb5'] },
  sky: { label: 'Sky', icon: '☁️', palette: ['#162033', '#5e79a8', '#9db7e0', '#d4e3fa', '#ffffff', '#ffffff', '#101829', '#ffe36e'] },
};

export const RARITIES = {
  common: { label: 'Common', stars: 1, weight: 70 },
  uncommon: { label: 'Uncommon', stars: 2, weight: 22 },
  rare: { label: 'Rare', stars: 3, weight: 7 },
  legendary: { label: 'Legendary', stars: 4, weight: 1 },
};

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legendary'];

// [id, name, type, rarity, hp, move, damage]
const LIST = [
  ['mossy', 'Mossy', 'grass', 'common', 40, 'Leaf Tap', 10],
  ['leafpup', 'Leafpup', 'grass', 'common', 50, 'Sprout Hop', 20],
  ['budbug', 'Budbug', 'grass', 'uncommon', 70, 'Petal Spin', 30],
  ['thornox', 'Thornox', 'grass', 'rare', 110, 'Vine Crash', 60],
  ['emberkit', 'Emberkit', 'fire', 'common', 40, 'Hot Pounce', 20],
  ['cinderpaw', 'Cinderpaw', 'fire', 'common', 50, 'Ash Puff', 10],
  ['flarebat', 'Flarebat', 'fire', 'uncommon', 70, 'Flame Flap', 30],
  ['magmoth', 'Magmoth', 'fire', 'rare', 120, 'Lava Wing', 70],
  ['splashy', 'Splashy', 'water', 'common', 40, 'Splash', 10],
  ['bubbler', 'Bubbler', 'water', 'common', 50, 'Bubble Pop', 20],
  ['tidefin', 'Tidefin', 'water', 'uncommon', 70, 'Wave Kick', 30],
  ['krakoo', 'Krakoo', 'water', 'rare', 110, 'Ink Storm', 60],
  ['pebblo', 'Pebblo', 'stone', 'common', 60, 'Pebble Toss', 10],
  ['rocklet', 'Rocklet', 'stone', 'common', 50, 'Rock Roll', 20],
  ['gravlox', 'Gravlox', 'stone', 'uncommon', 80, 'Gravel Slam', 30],
  ['boulderon', 'Boulderon', 'stone', 'legendary', 160, 'Mountain Fall', 100],
  ['zippy', 'Zippy', 'spark', 'common', 40, 'Zap', 20],
  ['voltbug', 'Voltbug', 'spark', 'common', 40, 'Buzz', 10],
  ['buzzlet', 'Buzzlet', 'spark', 'uncommon', 60, 'Spark Dash', 40],
  ['thunderpup', 'Thunderpup', 'spark', 'rare', 100, 'Thunder Bark', 70],
  ['frostpip', 'Frostpip', 'frost', 'common', 40, 'Snow Puff', 10],
  ['chillpup', 'Chillpup', 'frost', 'common', 50, 'Icy Nip', 20],
  ['icycub', 'Icycub', 'frost', 'uncommon', 80, 'Hail Hug', 30],
  ['glacior', 'Glacior', 'frost', 'legendary', 150, 'Glacier Crash', 100],
  ['duskbat', 'Duskbat', 'shadow', 'common', 40, 'Night Swoop', 20],
  ['glimmer', 'Glimmer', 'shadow', 'common', 40, 'Twinkle', 10],
  ['hootle', 'Hootle', 'shadow', 'uncommon', 70, 'Moon Hoot', 30],
  ['shadewing', 'Shadewing', 'shadow', 'rare', 110, 'Shadow Dive', 60],
  ['cloudlet', 'Cloudlet', 'sky', 'common', 40, 'Fluff', 10],
  ['breezy', 'Breezy', 'sky', 'common', 50, 'Gust', 20],
  ['windwhirl', 'Windwhirl', 'sky', 'uncommon', 70, 'Twister', 30],
  ['stormhawk', 'Stormhawk', 'sky', 'rare', 120, 'Storm Dive', 70],
];

export const CRITTERS = LIST.map(([id, name, type, rarity, hp, move, damage]) => ({ id, name, type, rarity, hp, move, damage }));

export function critterById(id)
{
  return CRITTERS.find((critter) => critter.id === id) ?? null;
}

// One card from a pack. Each rarity comes up by its weight, and within it
// a card he doesn't have yet is three times likelier than a repeat, so the
// binder keeps filling. [minRarity] is for the world-complete pack, which
// is always rare or better.
export function openPack(cards, random, { minRarity = 'common' } = {})
{
  const allowed = RARITY_ORDER.slice(RARITY_ORDER.indexOf(minRarity));
  const totalWeight = allowed.reduce((sum, rarity) => sum + RARITIES[rarity].weight, 0);
  let roll = random() * totalWeight;
  let rarity = allowed[allowed.length - 1];
  for (const candidate of allowed)
  {
    roll -= RARITIES[candidate].weight;
    if (roll < 0)
    {
      rarity = candidate;
      break;
    }
  }

  const pool = CRITTERS.filter((critter) => critter.rarity === rarity);
  const weight = (critter) => ((cards[critter.id] ?? 0) === 0 ? 3 : 1);
  const total = pool.reduce((sum, critter) => sum + weight(critter), 0);
  let pick = random() * total;
  for (const critter of pool)
  {
    pick -= weight(critter);
    if (pick < 0)
    {
      return critter;
    }
  }
  return pool[pool.length - 1];
}

// --- random numbers ----------------------------------------------------------

// A small seeded generator (mulberry32), so a critter's art is the same
// every time it's drawn, and the tests can replay a sequence.
export function seededRandom(seed)
{
  let a = seed >>> 0;
  return function next()
  {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text)
{
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
  {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// --- pixel art -----------------------------------------------------------------

// Palette slots, the same for every type.
const EMPTY = -1;
const OUTLINE = 0;
const SHADE = 1;
const BODY = 2;
const LIGHT = 3;
const BELLY = 4;
const EYE = 5;
const PUPIL = 6;
const ACCENT = 7;

const SIZE = 16;

// A critter's picture as a 16 x 16 grid of palette slots (EMPTY for
// transparent), mirrored left to right like most creature designs. Built
// the same way for every critter - a round body, feet, eyes and a belly -
// with its type's own feature on top (a sprout, a flame, fins, spikes,
// antennae, ice, pointed ears, wings), and its name seeding the shape so
// each one is its own.
export function critterSprite(critter)
{
  const random = seededRandom(hashString(critter.id));
  const grid = Array.from({ length: SIZE }, () => new Array(SIZE).fill(EMPTY));
  const set = (row, col, value) =>
  {
    if (row >= 0 && row < SIZE && col >= 0 && col < SIZE)
    {
      grid[row][col] = value;
      grid[row][SIZE - 1 - col] = value;
    }
  };
  const get = (row, col) => (row >= 0 && row < SIZE && col >= 0 && col < SIZE ? grid[row][col] : EMPTY);

  // Body: an oval, a little rough at the edge, sometimes with a head on top.
  const rx = 4.6 + random() * 1.8;
  const ry = 3.8 + random() * 1.4;
  const cy = 9.6 + random() * 0.8;
  const hasHead = random() < 0.55;
  const headRx = rx * (0.6 + random() * 0.2);
  const headCy = cy - ry + 0.6;
  for (let row = 0; row < SIZE; row++)
  {
    for (let col = 0; col < SIZE / 2; col++)
    {
      const x = col + 0.5 - SIZE / 2;
      const y = row + 0.5;
      let inside = (x / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
      if (hasHead)
      {
        inside = inside || (x / headRx) ** 2 + ((y - headCy) / (headRx * 0.85)) ** 2 <= 1;
      }
      if (inside)
      {
        set(row, col, BODY);
      }
    }
  }
  const top = grid.findIndex((row) => row.includes(BODY));
  const bottom = SIZE - 1 - [...grid].reverse().findIndex((row) => row.includes(BODY));

  // Feet.
  const footCol = 4 + Math.floor(random() * 2);
  for (let row = bottom; row <= Math.min(SIZE - 2, bottom + 1); row++)
  {
    set(row, footCol, BODY);
    set(row, footCol + 1, BODY);
  }

  typeFeature(critter.type, set, get, top, random);

  // Rare and legendary critters wear a gem on the forehead, like ore in the
  // rock - the special ones should look special.
  const special = critter.rarity === 'rare' || critter.rarity === 'legendary';

  // Shading: the top edge catches the light, the bottom edge is in shade.
  for (let row = 0; row < SIZE; row++)
  {
    for (let col = 0; col < SIZE / 2; col++)
    {
      if (grid[row][col] !== BODY)
      {
        continue;
      }
      if (get(row - 1, col) === EMPTY)
      {
        set(row, col, LIGHT);
      }
      else if (get(row + 1, col) === EMPTY || row >= bottom)
      {
        set(row, col, SHADE);
      }
    }
  }

  // Belly.
  const bellyRx = rx * 0.5;
  const bellyRy = ry * 0.45;
  const bellyCy = cy + ry * 0.35;
  for (let row = 0; row < SIZE; row++)
  {
    for (let col = 0; col < SIZE / 2; col++)
    {
      const x = col + 0.5 - SIZE / 2;
      if (grid[row][col] === BODY && (x / bellyRx) ** 2 + ((row + 0.5 - bellyCy) / bellyRy) ** 2 <= 1)
      {
        set(row, col, BELLY);
      }
    }
  }

  // Eyes, a third of the way down the body - never so close to the middle
  // that the two run together into one. Three kinds: round, tall, sleepy.
  const eyeRow = Math.round(top + (bottom - top) * (hasHead ? 0.28 : 0.34));
  const eyeCol = rx < 5.4 ? 4 : 4 + (random() < 0.5 ? 0 : 1);
  const eyeStyle = Math.floor(random() * 3);
  if (eyeStyle === 2)
  {
    set(eyeRow + 1, eyeCol, PUPIL);
    set(eyeRow + 1, eyeCol + 1, PUPIL);
  }
  else
  {
    set(eyeRow, eyeCol, EYE);
    set(eyeRow, eyeCol + 1, PUPIL);
    set(eyeRow + 1, eyeCol, EYE);
    set(eyeRow + 1, eyeCol + 1, PUPIL);
    if (eyeStyle === 1)
    {
      set(eyeRow - 1, eyeCol, EYE);
      set(eyeRow - 1, eyeCol + 1, EYE);
    }
  }

  // A mouth: a dot, a smile, or a little fang.
  const mouthStyle = Math.floor(random() * 3);
  if (mouthStyle === 0)
  {
    set(eyeRow + 3, 7, PUPIL);
  }
  else if (mouthStyle === 1)
  {
    set(eyeRow + 3, 6, PUPIL);
    set(eyeRow + 4, 7, PUPIL);
  }
  else
  {
    set(eyeRow + 3, 7, PUPIL);
    set(eyeRow + 4, 7, EYE);
  }

  // Rosy cheeks, sometimes.
  if (random() < 0.45 && get(eyeRow + 2, eyeCol - 1) !== EMPTY)
  {
    set(eyeRow + 2, eyeCol - 1, ACCENT);
  }

  if (special)
  {
    set(top + 1, 7, ACCENT);
    set(top + 2, 7, EYE);
  }

  // Outline: every empty cell touching the critter.
  const outline = [];
  for (let row = 0; row < SIZE; row++)
  {
    for (let col = 0; col < SIZE; col++)
    {
      if (grid[row][col] !== EMPTY)
      {
        continue;
      }
      const touches = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
        .some(([r, c]) => get(r, c) !== EMPTY && get(r, c) !== OUTLINE);
      if (touches)
      {
        outline.push([row, col]);
      }
    }
  }
  for (const [row, col] of outline)
  {
    grid[row][col] = OUTLINE;
  }

  return { size: SIZE, grid, palette: TYPES[critter.type].palette };
}

// The type's own feature, drawn onto the left half (set mirrors it).
function typeFeature(type, set, get, top, random)
{
  switch (type)
  {
    case 'grass':
      // A sprout on top.
      set(top - 1, 7, ACCENT);
      set(top - 2, 7, ACCENT);
      set(top - 3, 6, ACCENT);
      set(top - 3, 5, ACCENT);
      break;
    case 'fire':
      // A flickering tuft.
      for (let col = 4; col <= 7; col++)
      {
        const height = 1 + Math.floor(random() * 3);
        for (let h = 1; h <= height; h++)
        {
          set(top - h, col, h === height ? ACCENT : BODY);
        }
      }
      break;
    case 'water':
      // A fin on top and one at each side.
      set(top - 1, 7, ACCENT);
      set(top - 2, 7, ACCENT);
      set(top - 1, 6, ACCENT);
      set(top + 5, 1, ACCENT);
      set(top + 6, 1, ACCENT);
      set(top + 6, 0, ACCENT);
      break;
    case 'stone':
      // Blocky ears, one of two shapes.
      set(top - 1, 4, BODY);
      set(top - 2, 4, BODY);
      if (random() < 0.5)
      {
        set(top - 1, 3, BODY);
      }
      else
      {
        set(top - 3, 4, BODY);
      }
      break;
    case 'spark':
      // Zigzag antennae.
      set(top - 1, 5, ACCENT);
      set(top - 2, 4, ACCENT);
      set(top - 3, 5, ACCENT);
      set(top - 4, 4, ACCENT);
      break;
    case 'frost':
      // An icy crest.
      set(top - 1, 7, ACCENT);
      set(top - 2, 7, ACCENT);
      set(top - 3, 7, ACCENT);
      set(top - 1, 5, ACCENT);
      set(top - 2, 5, ACCENT);
      break;
    case 'shadow':
      // Tall pointed ears - or short round ones.
      set(top - 1, 3, BODY);
      set(top - 1, 4, BODY);
      if (random() < 0.6)
      {
        set(top - 2, 3, BODY);
        set(top - 3, 3, ACCENT);
      }
      else
      {
        set(top - 2, 4, ACCENT);
      }
      break;
    case 'sky':
      // A wing at each side, joined to the body.
      for (let row = top + 3; row <= top + 5; row++)
      {
        for (let col = 0; col <= 3; col++)
        {
          if (get(row, col) === EMPTY)
          {
            set(row, col, ACCENT);
          }
        }
      }
      set(top + 2, 1, ACCENT);
      break;
    default:
      break;
  }
}
