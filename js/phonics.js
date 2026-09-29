// The words, the worlds they live in, and how each word is sounded out.
//
// Pure data and functions - nothing here touches the page - so the tests
// (tests/) can check every word without a browser.

// Every sound the game can play. Each one is a clip in sounds/<key>.m4a,
// except the ones in RECORD_ONLY, which a parent records in the Parent
// Corner (see recorder.js). Long vowels are "<vowel>_e" - the sound a vowel
// makes when a silent e at the end of the word makes it say its name.
export const SOUND_KEYS = [
  'a', 'e', 'i', 'o', 'u',
  'a_e', 'e_e', 'i_e', 'o_e', 'u_e',
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z',
  'sh', 'ch', 'th', 'ng',
];

// The free recordings the game ships with have no "b". Until a parent
// records one, words with a "b" in them are left out rather than played
// with a wrong sound.
export const RECORD_ONLY = ['b'];

// What each sound is called on the Parent Corner's recording list, with a
// word to say it from.
export const SOUND_HINTS = {
  a: 'a as in cat', e: 'e as in bed', i: 'i as in pig', o: 'o as in hot', u: 'u as in sun',
  a_e: 'a as in cake', e_e: 'ee as in bee', i_e: 'i as in kite', o_e: 'o as in bone', u_e: 'u as in cube',
  b: 'b as in bat', c: 'c / k as in cat', d: 'd as in dog', f: 'f as in fan', g: 'g as in gum',
  h: 'h as in hat', j: 'j as in jet', l: 'l as in leg', m: 'm as in map', n: 'n as in net',
  p: 'p as in pig', qu: 'qu as in quack', r: 'r as in red', s: 's as in sun', t: 't as in top',
  v: 'v as in van', w: 'w as in web', x: 'x as in box', y: 'y as in yes', z: 'z as in zip',
  sh: 'sh as in ship', ch: 'ch as in chop', th: 'th as in bath', ng: 'ng as in ring',
};

// Letters written two ways that make one sound: the tile shows what's
// written, the sound is the plain one.
const SAME_SOUND = { k: 'c', ck: 'c', ss: 's', ll: 'l', ff: 'f', zz: 'z', gg: 'g' };

// A word is written as its tiles, dot-separated, one tile per sound -
// "c.a.t", "sh.i.p", "d.u.ck". A tile can carry a mark:
//   a+   a long vowel (made long by a silent e later in the word)
//   e~   silent - the tile is shown but has no sound
//   s=z  says a different sound from its letters ("rose" says z)
export function parseWord(spec, picture)
{
  const tiles = spec.split('.').map((token) =>
  {
    if (token.endsWith('~'))
    {
      return { text: token.slice(0, -1), sound: null };
    }
    if (token.endsWith('+'))
    {
      const vowel = token.slice(0, -1);
      return { text: vowel, sound: `${vowel}_e` };
    }
    const [text, said] = token.split('=');
    return { text, sound: said ?? SAME_SOUND[text] ?? text };
  });
  return { word: tiles.map((tile) => tile.text).join(''), tiles, picture };
}

function words(list)
{
  return list.map(([spec, picture]) => parseWord(spec, picture));
}

// The worlds, in the order they unlock - the usual phonics order: one short
// vowel at a time, then all of them mixed with the double-letter endings,
// then sh / ch / th / ng, then magic e. Each world's picture is what the
// player picks to show they read the word, so every word needs one that
// can't be mistaken for another in the same world.
export const WORLDS = [
  {
    id: 'meadow',
    name: 'Grassy Meadow',
    focus: 'short a',
    biome: 'grass',
    words: words([
      ['c.a.t', '🐱'], ['h.a.t', '🎩'], ['b.a.t', '🦇'], ['r.a.t', '🐀'], ['m.a.p', '🗺️'],
      ['c.a.p', '🧢'], ['c.a.n', '🥫'], ['m.a.n', '👨'], ['v.a.n', '🚐'], ['p.a.n', '🍳'],
      ['h.a.m', '🍖'], ['b.a.g', '👜'], ['c.a.b', '🚕'], ['s.a.d', '😢'], ['n.a.p', '😴'],
      ['t.a.g', '🏷️'], ['r.a.m', '🐏'],
    ]),
  },
  {
    id: 'forest',
    name: 'Birch Forest',
    focus: 'short i',
    biome: 'forest',
    words: words([
      ['p.i.g', '🐷'], ['d.i.g', '⛏️'], ['z.i.p', '🤐'], ['l.i.p', '👄'], ['f.i.n', '🦈'],
      ['p.i.n', '📌'], ['s.i.x', '6️⃣'], ['k.i.d', '🧒'], ['s.i.t', '🪑'], ['w.i.n', '🏆'],
      ['b.i.n', '🗑️'], ['m.i.x', '🥣'],
    ]),
  },
  {
    id: 'desert',
    name: 'Sandy Desert',
    focus: 'short o',
    biome: 'sand',
    words: words([
      ['d.o.g', '🐶'], ['l.o.g', '🪵'], ['f.o.g', '🌫️'], ['h.o.t', '🥵'], ['p.o.t', '🍲'],
      ['h.o.p', '🐇'], ['f.o.x', '🦊'], ['b.o.x', '📦'], ['r.o.d', '🎣'], ['c.o.p', '👮'],
      ['s.o.b', '😭'], ['j.o.g', '🏃'], ['m.o.m', '👩'], ['o.x', '🐂'], ['d.o.t', '🔴'],
    ]),
  },
  {
    id: 'snow',
    name: 'Snowy Peaks',
    focus: 'short u',
    biome: 'snow',
    words: words([
      ['s.u.n', '☀️'], ['r.u.n', '🏃'], ['c.u.p', '☕'], ['b.u.g', '🐛'], ['h.u.g', '🤗'],
      ['b.u.s', '🚌'], ['n.u.t', '🥜'], ['h.u.t', '🛖'], ['c.u.b', '🐻'], ['t.u.b', '🛁'],
      ['p.u.p', '🐕'], ['y.u.m', '😋'], ['u.p', '⬆️'],
    ]),
  },
  {
    id: 'caves',
    name: 'Deep Caves',
    focus: 'short e',
    biome: 'stone',
    words: words([
      ['b.e.d', '🛏️'], ['r.e.d', '🟥'], ['n.e.t', '🥅'], ['h.e.n', '🐔'], ['p.e.n', '🖊️'],
      ['t.e.n', '🔟'], ['l.e.g', '🦵'], ['w.e.b', '🕸️'], ['j.e.t', '✈️'], ['w.e.t', '💦'],
      ['e.gg', '🥚'], ['y.e.s', '✅'], ['g.e.m', '💎'], ['e.l.f', '🧝'],
    ]),
  },
  {
    id: 'jungle',
    name: 'Jungle Ruins',
    focus: 'ck, ll, ss endings',
    biome: 'jungle',
    words: words([
      ['d.u.ck', '🦆'], ['s.o.ck', '🧦'], ['r.o.ck', '🪨'], ['l.o.ck', '🔒'], ['b.e.ll', '🔔'],
      ['d.o.ll', '🪆'], ['h.i.ll', '⛰️'], ['k.i.ss', '💋'], ['p.a.ck', '🎒'], ['l.i.ck', '👅'],
      ['p.u.ck', '🏒'],
    ]),
  },
  {
    id: 'lava',
    name: 'Lava Lands',
    focus: 'sh, ch, th, ng',
    biome: 'lava',
    words: words([
      ['sh.i.p', '🚢'], ['sh.o.p', '🛍️'], ['f.i.sh', '🐟'], ['d.i.sh', '🍽️'], ['sh.e.ll', '🐚'],
      ['ch.o.p', '🪓'], ['ch.i.ck', '🐤'], ['l.u.n.ch', '🍱'], ['b.a.th', '🛁'], ['m.a.th', '➗'],
      ['p.a.th', '🛤️'], ['w.i.sh', '🌠'], ['c.a.sh', '💵'], ['r.i.ng', '💍'], ['k.i.ng', '👑'],
      ['s.i.ng', '🎤'], ['s.o.ng', '🎵'],
    ]),
  },
  {
    id: 'sky',
    name: 'Sky Islands',
    focus: 'magic e',
    biome: 'sky',
    words: words([
      ['c.a+.k.e~', '🎂'], ['l.a+.k.e~', '🏞️'], ['b.i+.k.e~', '🚲'], ['k.i+.t.e~', '🪁'], ['f.i+.v.e~', '5️⃣'],
      ['n.i+.n.e~', '9️⃣'], ['b.o+.n.e~', '🦴'], ['r.o+.p.e~', '🪢'], ['h.o+.m.e~', '🏠'], ['n.o+.s=z.e~', '👃'],
      ['c.u+.b.e~', '🧊'], ['c.o+.n.e~', '🍦'], ['r.o+.s=z.e~', '🌹'], ['v.a+.s.e~', '🏺'], ['w.a+.v.e~', '🌊'],
      ['h.o+.l.e~', '🕳️'],
    ]),
  },
];

// How many different words a world wants read right before the next one
// opens - all of them, for a world that has fewer than this to play.
export const WORLD_GOAL = 10;

export function worldById(id)
{
  return WORLDS.find((world) => world.id === id) ?? null;
}

// Whether a word can be sounded out with the sounds the game has right now
// - see RECORD_ONLY.
export function isPlayable(word, availableSounds)
{
  return word.tiles.every((tile) => tile.sound === null || availableSounds.has(tile.sound));
}

export function playableWords(world, availableSounds)
{
  return world.words.filter((word) => isPlayable(word, availableSounds));
}

// The pictures to pick from: the word's own and [count - 1] others from
// [pool], in a random order. Never two of the same picture, so there's
// only ever one right answer.
export function pickChoices(target, pool, random, count = 3)
{
  const others = pool.filter((word) => word.picture !== target.picture && word.word !== target.word);
  const distinct = [];
  for (const word of shuffle(others, random))
  {
    if (!distinct.some((chosen) => chosen.picture === word.picture))
    {
      distinct.push(word);
    }
    if (distinct.length === count - 1)
    {
      break;
    }
  }
  return shuffle([target, ...distinct], random);
}

export function shuffle(list, random)
{
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--)
  {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
