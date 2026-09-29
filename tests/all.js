import { test, equal, ok, report } from './harness.js';
import { SOUND_KEYS, RECORD_ONLY, SOUND_HINTS, WORLDS, WORLD_GOAL, parseWord, isPlayable, playableWords, pickChoices } from '../js/phonics.js';
import * as progress from '../js/progress.js';
import { CRITTERS, TYPES, RARITIES, openPack, critterSprite, seededRandom } from '../js/critters.js';
import { soundSpan } from '../js/trim.js';

const everySound = new Set(SOUND_KEYS);
const shipped = new Set(SOUND_KEYS.filter((key) => !RECORD_ONLY.includes(key)));
const random = () => seededRandom(42);

// --- the words ------------------------------------------------------------------

test('every word is spelled by its tiles and sounded with real sounds', () =>
{
  for (const world of WORLDS)
  {
    for (const word of world.words)
    {
      equal(word.tiles.map((tile) => tile.text).join(''), word.word, word.word);
      for (const tile of word.tiles)
      {
        ok(tile.sound === null || everySound.has(tile.sound), `${word.word}: "${tile.sound}" is not a sound`);
      }
      ok(word.picture && word.picture.length > 0, `${word.word} has no picture`);
    }
  }
});

test('no world repeats a word or a picture, so every pick has one right answer', () =>
{
  for (const world of WORLDS)
  {
    const words = world.words.map((word) => word.word);
    const pictures = world.words.map((word) => word.picture);
    equal(new Set(words).size, words.length, `${world.id} words`);
    equal(new Set(pictures).size, pictures.length, `${world.id} pictures`);
  }
});

test('every world has enough words to play before b is recorded', () =>
{
  for (const world of WORLDS)
  {
    ok(playableWords(world, shipped).length >= 8, `${world.id} has only ${playableWords(world, shipped).length}`);
  }
});

test('every sound has a hint for the recording list', () =>
{
  for (const key of SOUND_KEYS)
  {
    ok(SOUND_HINTS[key] && SOUND_HINTS[key].includes(' as in '), key);
  }
});

test('double letters and ck say one plain sound', () =>
{
  equal(parseWord('d.u.ck', '🦆').tiles.map((tile) => tile.sound), ['d', 'u', 'c']);
  equal(parseWord('e.gg', '🥚').tiles.map((tile) => tile.sound), ['e', 'g']);
  equal(parseWord('b.e.ll', '🔔').tiles.map((tile) => tile.sound), ['b', 'e', 'l']);
  equal(parseWord('k.i.d', '🧒').tiles.map((tile) => tile.sound), ['c', 'i', 'd']);
});

test('magic e: the vowel says its name and the e is silent', () =>
{
  const cake = parseWord('c.a+.k.e~', '🎂');
  equal(cake.word, 'cake');
  equal(cake.tiles.map((tile) => tile.sound), ['c', 'a_e', 'c', null]);
  const rose = parseWord('r.o+.s=z.e~', '🌹');
  equal(rose.word, 'rose');
  equal(rose.tiles.map((tile) => tile.sound), ['r', 'o_e', 'z', null]);
});

test('a word needing an unrecorded b waits until it is recorded', () =>
{
  const bat = parseWord('b.a.t', '🦇');
  ok(!isPlayable(bat, shipped), 'bat without b');
  ok(isPlayable(bat, everySound), 'bat with b');
  ok(isPlayable(parseWord('c.a+.k.e~', '🎂'), shipped), 'a silent tile needs no sound');
});

test('picture choices: three, all different, one of them right', () =>
{
  const world = WORLDS[0];
  const rng = random();
  for (const target of world.words)
  {
    const choices = pickChoices(target, world.words, rng);
    equal(choices.length, 3, target.word);
    ok(choices.some((choice) => choice.word === target.word), `${target.word} missing`);
    equal(new Set(choices.map((choice) => choice.picture)).size, 3, `${target.word} pictures`);
  }
});

// --- progress --------------------------------------------------------------------

test('three gems first try, one after a miss, none for a miss', () =>
{
  let state = progress.initialState();
  let result = progress.recordAnswer(state, 'cat', { correct: true, firstTry: true });
  equal(result.gems, progress.GEMS_FIRST_TRY);
  state = result.state;
  result = progress.recordAnswer(state, 'hat', { correct: false, firstTry: false });
  equal(result.gems, 0);
  equal(result.state.streak, 0);
  result = progress.recordAnswer(result.state, 'hat', { correct: true, firstTry: false });
  equal(result.gems, progress.GEMS_LATER);
  equal(result.state.gems, progress.GEMS_FIRST_TRY + progress.GEMS_LATER);
});

test('three in a row earns a streak bonus', () =>
{
  let state = progress.initialState();
  const bonuses = [];
  for (const word of ['cat', 'hat', 'map'])
  {
    const result = progress.recordAnswer(state, word, { correct: true, firstTry: true });
    bonuses.push(result.streakBonus);
    state = result.state;
  }
  equal(bonuses, [false, false, true]);
  equal(state.gems, 3 * progress.GEMS_FIRST_TRY + progress.STREAK_BONUS_GEMS);
  equal(state.bestStreak, 3);
});

test('a card pack every five words read right', () =>
{
  let state = progress.initialState();
  const earned = [];
  for (let i = 0; i < 10; i++)
  {
    const result = progress.recordAnswer(state, `w${i}`, { correct: true, firstTry: false });
    earned.push(result.packEarned);
    state = result.state;
  }
  equal(earned, [false, false, false, false, true, false, false, false, false, true]);
  equal(state.packs, 2);
  equal(state.towardPack, 0);
});

test('the next world opens once the one before is complete', () =>
{
  let state = progress.initialState();
  equal(progress.unlockedWorldIds(state, shipped), ['meadow']);
  for (const word of playableWords(WORLDS[0], shipped).slice(0, WORLD_GOAL))
  {
    state = progress.recordAnswer(state, word.word, { correct: true, firstTry: true }).state;
  }
  equal(progress.unlockedWorldIds(state, shipped), ['meadow', 'forest']);
});

test('a finished world gives its special pack once, and it opens first', () =>
{
  let state = progress.initialState();
  for (const word of playableWords(WORLDS[0], shipped).slice(0, WORLD_GOAL))
  {
    state = progress.recordAnswer(state, word.word, { correct: true, firstTry: false }).state;
  }
  let claim = progress.claimWorldReward(state, WORLDS[0], shipped);
  ok(claim.claimed, 'first claim');
  state = claim.state;
  claim = progress.claimWorldReward(state, WORLDS[0], shipped);
  ok(!claim.claimed, 'claimed twice');
  equal(progress.packsWaiting(state), 3, 'two for ten words, one for the world');
  const first = progress.spendPack(state);
  equal(first.minRarity, 'rare');
  equal(progress.spendPack(first.state).minRarity, 'common');
});

test('an empty pack shelf opens nothing', () =>
{
  equal(progress.spendPack(progress.initialState()).minRarity, null);
});

test('the next word is never the one just played', () =>
{
  const words = playableWords(WORLDS[0], shipped);
  const rng = random();
  let previous = null;
  for (let i = 0; i < 200; i++)
  {
    const word = progress.nextWord(progress.initialState(), words, rng, previous);
    ok(word.word !== previous, `repeated ${previous}`);
    previous = word.word;
  }
});

test('words not read yet come up more than words already known', () =>
{
  const words = playableWords(WORLDS[0], shipped);
  let state = progress.initialState();
  const known = words.slice(0, words.length - 2);
  for (const word of known)
  {
    state = progress.recordAnswer(state, word.word, { correct: true, firstTry: true }).state;
  }
  const fresh = new Set(words.slice(-2).map((word) => word.word));
  const rng = random();
  let freshPicks = 0;
  for (let i = 0; i < 1000; i++)
  {
    if (fresh.has(progress.nextWord(state, words, rng).word))
    {
      freshPicks += 1;
    }
  }
  // Two of the words are new; picked evenly they'd come up about 1 in 7.
  ok(freshPicks > 300, `new words picked ${freshPicks} times in 1000`);
});

test('saved progress comes back, and a bad save starts fresh', () =>
{
  const store = new Map();
  const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  const state = progress.recordAnswer(progress.initialState(), 'cat', { correct: true, firstTry: true }).state;
  progress.save(storage, state);
  equal(progress.load(storage).gems, state.gems);
  store.set('word_miner_progress', '{not json');
  equal(progress.load(storage).gems, 0);
});

// --- critters -----------------------------------------------------------------------

test('32 critters, four of each type, every name different', () =>
{
  equal(CRITTERS.length, 32);
  equal(new Set(CRITTERS.map((critter) => critter.id)).size, 32);
  equal(new Set(CRITTERS.map((critter) => critter.name)).size, 32);
  for (const type of Object.keys(TYPES))
  {
    equal(CRITTERS.filter((critter) => critter.type === type).length, 4, type);
  }
  for (const critter of CRITTERS)
  {
    ok(RARITIES[critter.rarity], `${critter.id} rarity`);
  }
});

test('a special pack is always rare or better', () =>
{
  const rng = random();
  for (let i = 0; i < 500; i++)
  {
    const critter = openPack({}, rng, { minRarity: 'rare' });
    ok(critter.rarity === 'rare' || critter.rarity === 'legendary', critter.id);
  }
});

test('packs come up mostly common, rarely legendary', () =>
{
  const rng = random();
  const counts = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
  for (let i = 0; i < 5000; i++)
  {
    counts[openPack({}, rng).rarity] += 1;
  }
  ok(counts.common > counts.uncommon && counts.uncommon > counts.rare && counts.rare > counts.legendary, JSON.stringify(counts));
  ok(counts.legendary > 0, 'no legendary in 5000');
});

test('a card not owned yet is likelier than a repeat', () =>
{
  const commons = CRITTERS.filter((critter) => critter.rarity === 'common');
  const cards = {};
  for (const critter of commons.slice(1))
  {
    cards[critter.id] = 1;
  }
  const missing = commons[0].id;
  const rng = random();
  let got = 0;
  let commonPulls = 0;
  for (let i = 0; i < 4000; i++)
  {
    const critter = openPack(cards, rng);
    if (critter.rarity === 'common')
    {
      commonPulls += 1;
      if (critter.id === missing)
      {
        got += 1;
      }
    }
  }
  // Evenly it would be 1 in 16 of the commons; weighted three to one it's 1 in 6.
  ok(got / commonPulls > 0.12, `missing card came up ${got} of ${commonPulls}`);
});

test('every critter picture is 16 x 16, mirrored, and has eyes', () =>
{
  for (const critter of CRITTERS)
  {
    const sprite = critterSprite(critter);
    equal(sprite.grid.length, 16, critter.id);
    for (const row of sprite.grid)
    {
      equal(row.length, 16, critter.id);
      equal(row, [...row].reverse(), `${critter.id} is not mirrored`);
    }
    const cells = sprite.grid.flat();
    ok(cells.filter((value) => value === 6).length >= 2, `${critter.id} has no eyes`);
    ok(cells.filter((value) => value >= 0).length > 60, `${critter.id} is nearly empty`);
  }
});

test('a critter always looks the same', () =>
{
  equal(critterSprite(CRITTERS[3]), critterSprite(CRITTERS[3]));
});

// --- trimming a recording -------------------------------------------------------------

function recording(seconds, bursts, rate = 8000)
{
  const samples = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < samples.length; i++)
  {
    samples[i] = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.004;
  }
  for (const [start, end, level] of bursts)
  {
    for (let i = Math.round(start * rate); i < Math.round(end * rate); i++)
    {
      samples[i] = Math.sin(i * 0.3) * level;
    }
  }
  return samples;
}

test('a recording is trimmed to the sound, with a little room either side', () =>
{
  const rate = 8000;
  const [start, end] = soundSpan(recording(2, [[0.8, 1.1, 0.5]], rate), rate);
  ok(start / rate > 0.7 && start / rate < 0.8, `starts at ${start / rate}`);
  ok(end / rate > 1.1 && end / rate < 1.25, `ends at ${end / rate}`);
});

test('a click far from the sound is left out', () =>
{
  const rate = 8000;
  const [, end] = soundSpan(recording(2, [[0.5, 0.7, 0.5], [1.6, 1.62, 0.3]], rate), rate);
  ok(end / rate < 0.9, `ends at ${end / rate}`);
});

test('a silent recording has no sound in it', () =>
{
  equal(soundSpan(recording(1, []), 8000), null);
});

report();
