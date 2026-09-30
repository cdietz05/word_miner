// The critters: who they are, what each grows into, and which one a wild
// encounter brings. All original, names and all (their pictures are
// creature_art.js), and pure, so the tests can check the odds without a
// browser.
//
// Every critter but the two legendaries belongs to a line of three: a
// baby, which is what turns up in the wild, grows into a middle form and
// then a final one as his buddy (see progress.js). A legendary is never a
// baby and never grows - it's only ever caught, and rarely.

export const TYPES = {
  grass: { label: 'Grass', icon: '🌿' },
  fire: { label: 'Fire', icon: '🔥' },
  water: { label: 'Water', icon: '💧' },
  stone: { label: 'Stone', icon: '🪨' },
  spark: { label: 'Spark', icon: '⚡' },
  frost: { label: 'Frost', icon: '❄️' },
  shadow: { label: 'Shadow', icon: '🌙' },
  sky: { label: 'Sky', icon: '☁️' },
};

// A critter's rarity follows from where it is in its line.
export const RARITIES = {
  common: { label: 'Basic', stars: 1 },
  uncommon: { label: 'Stage 1', stars: 2 },
  rare: { label: 'Stage 2', stars: 3 },
  legendary: { label: 'Legendary', stars: 4 },
};

const STAGE_RARITY = { 1: 'common', 2: 'uncommon', 3: 'rare' };

// Each line, baby first: [id, name, hp, move, damage].
const LINES = [
  ['grass', ['budlet', 'Budlet', 40, 'Sprout Bop', 10], ['leafpup', 'Leafpup', 70, 'Leaf Dash', 30], ['thornox', 'Thornox', 130, 'Thorn Stampede', 80]],
  ['fire', ['emberkit', 'Emberkit', 40, 'Warm Pounce', 10], ['flarecat', 'Flarecat', 70, 'Flame Swipe', 30], ['infernyx', 'Infernyx', 140, 'Inferno Roar', 90]],
  ['water', ['splashy', 'Splashy', 40, 'Splash', 10], ['tidefin', 'Tidefin', 70, 'Fin Slice', 30], ['tidalisk', 'Tidalisk', 140, 'Tidal Crash', 90]],
  ['stone', ['pebblo', 'Pebblo', 50, 'Pebble Toss', 10], ['rocklet', 'Rocklet', 80, 'Rock Roll', 30], ['gravlox', 'Gravlox', 150, 'Quake Slam', 80]],
  ['spark', ['zippy', 'Zippy', 40, 'Zap', 10], ['voltfox', 'Voltfox', 70, 'Volt Dash', 40], ['thunderjaw', 'Thunderjaw', 130, 'Thunder Fang', 90]],
  ['frost', ['frostpip', 'Frostpip', 40, 'Snow Puff', 10], ['chillpup', 'Chillpup', 80, 'Icy Tusk', 30], ['frostfang', 'Frostfang', 140, 'Blizzard Breath', 90]],
  ['shadow', ['glimmer', 'Glimmer', 40, 'Twinkle', 10], ['duskbat', 'Duskbat', 70, 'Night Swoop', 30], ['shadewing', 'Shadewing', 140, 'Shadow Dive', 90]],
  ['sky', ['cloudlet', 'Cloudlet', 40, 'Fluff', 10], ['breezy', 'Breezy', 70, 'Gust', 30], ['stormhawk', 'Stormhawk', 130, 'Storm Dive', 90]],
];

// [id, name, type, hp, move, damage]
const LEGENDARIES = [
  ['boulderon', 'Boulderon', 'stone', 180, 'Mountain Fall', 120],
  ['glacior', 'Glacior', 'frost', 170, 'Glacier Crash', 120],
];

function buildRoster()
{
  const roster = [];
  for (const [type, ...stages] of LINES)
  {
    stages.forEach(([id, name, hp, move, damage], index) =>
    {
      roster.push({
        id,
        name,
        type,
        stage: index + 1,
        rarity: STAGE_RARITY[index + 1],
        hp,
        move,
        damage,
        evolvesFrom: index > 0 ? stages[index - 1][0] : null,
        evolvesTo: index < stages.length - 1 ? stages[index + 1][0] : null,
      });
    });
  }
  for (const [id, name, type, hp, move, damage] of LEGENDARIES)
  {
    roster.push({ id, name, type, stage: 3, rarity: 'legendary', hp, move, damage, evolvesFrom: null, evolvesTo: null });
  }
  return roster;
}

export const CRITTERS = buildRoster();

// The three he picks his first buddy from, one of each classic kind.
export const STARTERS = ['budlet', 'emberkit', 'splashy'];

export function critterById(id)
{
  return CRITTERS.find((critter) => critter.id === id) ?? null;
}

// The baby of [critter]'s line, then each form it grows into.
export function lineOf(critter)
{
  let baby = critter;
  while (baby.evolvesFrom)
  {
    baby = critterById(baby.evolvesFrom);
  }
  const line = [baby];
  while (line[line.length - 1].evolvesTo)
  {
    line.push(critterById(line[line.length - 1].evolvesTo));
  }
  return line;
}

// How often a wild encounter is a legendary - and how often at a region's
// badge, which is a special encounter.
export const LEGENDARY_CHANCE = 0.03;
export const SPECIAL_LEGENDARY_CHANCE = 0.25;

// The critter a wild encounter brings: a baby, or now and then a legendary.
// A baby he hasn't caught yet is three times likelier than a repeat, so the
// Critter Book keeps filling, and one of [homeTypes] - the kinds at home in
// the region he's exploring - three times likelier again.
export function wildEncounter(caught, random, { homeTypes = [], special = false } = {})
{
  const chance = special ? SPECIAL_LEGENDARY_CHANCE : LEGENDARY_CHANCE;
  const pool = random() < chance
    ? CRITTERS.filter((critter) => critter.rarity === 'legendary')
    : CRITTERS.filter((critter) => critter.stage === 1);
  const weight = (critter) => ((caught[critter.id] ?? 0) === 0 ? 3 : 1) * (homeTypes.includes(critter.type) ? 3 : 1);
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

// A small seeded generator (mulberry32), so the tests can replay a
// sequence.
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
