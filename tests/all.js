import { test, equal, ok, report } from './harness.js';
import { SOUND_KEYS, RECORD_ONLY, SOUND_HINTS, WORLDS, WORLD_GOAL, parseWord, isPlayable, playableWords, pickChoices } from '../js/phonics.js';
import * as progress from '../js/progress.js';
import { CRITTERS, TYPES, RARITIES, STARTERS, critterById, lineOf, wildEncounter, seededRandom } from '../js/critters.js';
import { creatureSvg, BODY_PLANS, PALETTES } from '../js/creature_art.js';
import { soundSpan } from '../js/trim.js';
import { grownUpQuestion } from '../js/gate.js';
import { VOICE_SPELLINGS, soundSource } from '../js/voice_sounds.js';
import { SPEEDS, LETTER_SOUNDS, englishVoices, chooseVoice, speechRate, loadSettings, saveSettings, defaultSettings } from '../js/settings.js';

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

// Reads [count] made-up words right, first try or not.
function readWords(state, count, firstTry = false)
{
  let next = state;
  for (let i = 0; i < count; i++)
  {
    next = progress.recordAnswer(next, `w${i}`, { correct: true, firstTry }).state;
  }
  return next;
}

test('a wild critter every five words read right', () =>
{
  let state = progress.initialState();
  const ready = [];
  for (let i = 0; i < 10; i++)
  {
    const result = progress.recordAnswer(state, `w${i}`, { correct: true, firstTry: false });
    ready.push(result.encounterReady);
    state = result.state;
  }
  equal(ready, [false, false, false, false, true, false, false, false, false, true]);
  equal(state.encounters, 2);
  equal(state.orbs, 0);
});

test('a miss earns no orb and breaks the streak', () =>
{
  let state = progress.recordAnswer(progress.initialState(), 'cat', { correct: true, firstTry: true }).state;
  const result = progress.recordAnswer(state, 'hat', { correct: false, firstTry: false });
  equal(result.state.orbs, 1);
  equal(result.state.streak, 0);
  equal(result.encounterReady, false);
});

test('three first tries in a row charge a holo card, and the next catch uses it', () =>
{
  let state = progress.initialState();
  const charged = [];
  for (const word of ['cat', 'hat', 'map'])
  {
    const result = progress.recordAnswer(state, word, { correct: true, firstTry: true });
    charged.push(result.holoCharged);
    state = result.state;
  }
  equal(charged, [false, false, true]);
  ok(state.holoCharged, 'charged');
  equal(state.bestStreak, 3);

  const caught = progress.catchCritter(state, 'zippy');
  ok(caught.holo && caught.isNewHolo && caught.isNew, 'holo catch');
  equal(caught.state.holo.zippy, 1);
  equal(caught.state.caught.zippy, 1);
  ok(!caught.state.holoCharged, 'charge used up');
  const plain = progress.catchCritter(caught.state, 'zippy');
  ok(!plain.holo && !plain.isNew, 'next catch is plain');
  equal(plain.state.holo.zippy, 1);
});

test('a second go after a miss is still a right answer, but not a first try', () =>
{
  let state = progress.initialState();
  state = progress.recordAnswer(state, 'cat', { correct: true, firstTry: true }).state;
  state = progress.recordAnswer(state, 'hat', { correct: true, firstTry: true }).state;
  const result = progress.recordAnswer(state, 'map', { correct: true, firstTry: false });
  ok(!result.holoCharged, 'no charge after a second go');
  equal(result.state.streak, 0);
  equal(result.state.words.map.right, 1);
});

test('his first catch becomes his buddy; later ones do not', () =>
{
  let state = progress.catchCritter(progress.initialState(), 'emberkit').state;
  equal(state.buddy, 'emberkit');
  state = progress.catchCritter(state, 'splashy').state;
  equal(state.buddy, 'emberkit');
});

test('only a critter he has caught can be his buddy', () =>
{
  const state = progress.catchCritter(progress.initialState(), 'emberkit').state;
  equal(progress.chooseBuddy(state, 'thornox').buddy, 'emberkit');
  const caught = progress.catchCritter(state, 'splashy').state;
  equal(progress.chooseBuddy(caught, 'splashy').buddy, 'splashy');
});

test('a buddy evolves after enough words, twice, into its line', () =>
{
  let state = progress.catchCritter(progress.initialState(), 'budlet').state;
  const evolutions = [];
  for (let i = 0; i < progress.EVOLVE_XP[1] + progress.EVOLVE_XP[2] + 10; i++)
  {
    const result = progress.recordAnswer(state, `w${i}`, { correct: true, firstTry: false });
    if (result.evolution)
    {
      evolutions.push([i + 1, result.evolution.from, result.evolution.to]);
    }
    state = result.state;
  }
  equal(evolutions, [
    [progress.EVOLVE_XP[1], 'budlet', 'leafpup'],
    [progress.EVOLVE_XP[1] + progress.EVOLVE_XP[2], 'leafpup', 'thornox'],
  ]);
  equal(state.buddy, 'thornox');
  equal(state.caught.leafpup, 1);
  equal(state.caught.thornox, 1);
  equal(state.caught.budlet, 1, 'the baby card stays in the book');
  equal(progress.buddyGrowth(state).needed, null);
});

test('a wrong answer does not grow the buddy', () =>
{
  let state = progress.catchCritter(progress.initialState(), 'budlet').state;
  state = progress.recordAnswer(state, 'cat', { correct: false, firstTry: false }).state;
  equal(progress.buddyGrowth(state).xp, 0);
});

test('growth is kept per critter, so swapping buddies loses nothing', () =>
{
  let state = progress.catchCritter(progress.initialState(), 'budlet').state;
  state = progress.catchCritter(state, 'zippy').state;
  state = readWords(state, 5);
  state = progress.chooseBuddy(state, 'zippy');
  state = readWords(state, 3);
  equal(progress.buddyGrowth(state).xp, 3);
  state = progress.chooseBuddy(state, 'budlet');
  equal(progress.buddyGrowth(state), { critter: critterById('budlet'), xp: 5, needed: progress.EVOLVE_XP[1] });
});

test('no buddy, no growth - and nothing breaks', () =>
{
  const result = progress.recordAnswer(progress.initialState(), 'cat', { correct: true, firstTry: true });
  equal(result.evolution, null);
  equal(progress.buddyGrowth(result.state), null);
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

test('a finished region gives its special encounter once, and it comes first', () =>
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
  equal(progress.encountersWaiting(state), 3, 'two for ten words, one for the region');
  const first = progress.spendEncounter(state);
  equal(first.kind, 'special');
  equal(progress.spendEncounter(first.state).kind, 'wild');
});

test('no encounters waiting spends nothing', () =>
{
  equal(progress.spendEncounter(progress.initialState()).kind, null);
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

function memoryStorage()
{
  const store = new Map();
  return { store, getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
}

test('saved progress comes back, and a bad save starts fresh', () =>
{
  const storage = memoryStorage();
  let state = progress.catchCritter(progress.initialState(), 'budlet').state;
  state = progress.recordAnswer(state, 'cat', { correct: true, firstTry: true }).state;
  progress.save(storage, state);
  equal(progress.load(storage), state);
  storage.store.set('word_miner_progress', '{not json');
  equal(progress.load(storage), progress.initialState());
  storage.store.set('word_miner_progress', JSON.stringify({ version: 99, words: { cat: {} } }));
  equal(progress.load(storage), progress.initialState());
});

test('a Word Miner save keeps his reading, and its cards and packs carry over', () =>
{
  const storage = memoryStorage();
  const words = { cat: { right: 3, wrong: 1, lastSeen: 12 }, hat: { right: 1, wrong: 0, lastSeen: 9 } };
  storage.setItem('word_miner_progress', JSON.stringify({
    version: 1,
    gems: 57,
    words,
    streak: 2,
    bestStreak: 6,
    towardPack: 3,
    packs: 2,
    rarePacks: 1,
    completedWorlds: ['meadow'],
    cards: { mossy: 2, emberkit: 1, thunderpup: 1, glacior: 1 },
    turn: 40,
  }));
  const state = progress.load(storage);
  equal(state.version, 2);
  equal(state.words, words);
  equal([state.streak, state.bestStreak, state.turn], [2, 6, 40]);
  equal(state.completedWorlds, ['meadow']);
  equal([state.orbs, state.encounters, state.specialEncounters], [3, 2, 1]);
  equal(state.caught, { emberkit: 1, glacior: 1 }, 'critters no longer in the game are dropped');
  equal(state.buddy, null);
  equal(state.gems, undefined);
});

// --- critters -----------------------------------------------------------------------

test('eight lines of three, one of each type, plus two legendaries', () =>
{
  equal(CRITTERS.length, 26);
  equal(new Set(CRITTERS.map((critter) => critter.id)).size, 26);
  equal(new Set(CRITTERS.map((critter) => critter.name)).size, 26);
  for (const type of Object.keys(TYPES))
  {
    const babies = CRITTERS.filter((critter) => critter.type === type && critter.stage === 1);
    equal(babies.length, 1, type);
    const line = lineOf(babies[0]);
    equal(line.map((critter) => critter.stage), [1, 2, 3], type);
    ok(line.every((critter) => critter.type === type), `${type} line changes type`);
    equal(line.map((critter) => critter.rarity), ['common', 'uncommon', 'rare'], type);
    ok(line[1].hp > line[0].hp && line[2].hp > line[1].hp, `${type} does not get stronger`);
  }
  const legendaries = CRITTERS.filter((critter) => critter.rarity === 'legendary');
  equal(legendaries.map((critter) => critter.id), ['boulderon', 'glacior']);
  ok(legendaries.every((critter) => !critter.evolvesFrom && !critter.evolvesTo), 'legendaries stand alone');
});

test('every line is linked both ways', () =>
{
  for (const critter of CRITTERS)
  {
    if (critter.evolvesTo)
    {
      equal(critterById(critter.evolvesTo).evolvesFrom, critter.id, critter.id);
    }
    if (critter.evolvesFrom)
    {
      equal(critterById(critter.evolvesFrom).evolvesTo, critter.id, critter.id);
    }
    ok(RARITIES[critter.rarity], `${critter.id} rarity`);
  }
});

test('the starters are three babies of different types', () =>
{
  const starters = STARTERS.map(critterById);
  ok(starters.every((critter) => critter.stage === 1), 'babies');
  equal(new Set(starters.map((critter) => critter.type)).size, 3);
});

test('the wild only holds babies, and now and then a legendary', () =>
{
  const rng = random();
  let legendary = 0;
  for (let i = 0; i < 4000; i++)
  {
    const critter = wildEncounter({}, rng);
    ok(critter.stage === 1 || critter.rarity === 'legendary', critter.id);
    if (critter.rarity === 'legendary')
    {
      legendary += 1;
    }
  }
  ok(legendary > 40 && legendary < 250, `${legendary} legendaries in 4000`);
});

test('a special encounter is a legendary far more often', () =>
{
  const rng = random();
  let legendary = 0;
  for (let i = 0; i < 2000; i++)
  {
    if (wildEncounter({}, rng, { special: true }).rarity === 'legendary')
    {
      legendary += 1;
    }
  }
  ok(legendary > 350 && legendary < 650, `${legendary} legendaries in 2000`);
});

test('a critter not caught yet is likelier than a repeat', () =>
{
  const babies = CRITTERS.filter((critter) => critter.stage === 1);
  const caught = {};
  for (const critter of babies.slice(1))
  {
    caught[critter.id] = 1;
  }
  const missing = babies[0].id;
  const rng = random();
  let got = 0;
  let babyPulls = 0;
  for (let i = 0; i < 4000; i++)
  {
    const critter = wildEncounter(caught, rng);
    if (critter.stage === 1)
    {
      babyPulls += 1;
      if (critter.id === missing)
      {
        got += 1;
      }
    }
  }
  // Evenly it would be 1 in 8; weighted three to one it's 3 in 10.
  ok(got / babyPulls > 0.22, `missing critter came up ${got} of ${babyPulls}`);
});

test('the critters at home in a region turn up there more', () =>
{
  const rng = random();
  let home = 0;
  let pulls = 0;
  for (let i = 0; i < 4000; i++)
  {
    const critter = wildEncounter({}, rng, { homeTypes: ['grass', 'sky'] });
    if (critter.stage === 1)
    {
      pulls += 1;
      if (critter.type === 'grass' || critter.type === 'sky')
      {
        home += 1;
      }
    }
  }
  // Two types of eight, weighted three to one: 6 in 12.
  ok(home / pulls > 0.42, `home types came up ${home} of ${pulls}`);
});

test('every region has critters at home there, of real types', () =>
{
  for (const world of WORLDS)
  {
    ok(world.critterTypes.length > 0 && world.critterTypes.every((type) => TYPES[type]), world.id);
  }
});

// --- critter pictures ----------------------------------------------------------------

test('every critter has a body plan and draws as an SVG', () =>
{
  for (const critter of CRITTERS)
  {
    ok(BODY_PLANS[critter.id], `${critter.id} has no body plan`);
    const svg = creatureSvg(critter);
    ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), critter.id);
    ok(!svg.includes('NaN') && !svg.includes('undefined'), `${critter.id} has a broken number or colour`);
    ok(svg.includes(`aria-label="${critter.name}"`), `${critter.id} label`);
  }
  equal(Object.keys(BODY_PLANS).sort(), CRITTERS.map((critter) => critter.id).sort(), 'a plan for a critter that does not exist');
  ok(Object.keys(TYPES).every((type) => PALETTES[type]), 'a type with no colours');
});

test('babies are drawn round and big-eyed, final forms fierce', () =>
{
  for (const critter of CRITTERS)
  {
    const plan = BODY_PLANS[critter.id][0];
    if (critter.stage === 1)
    {
      equal(plan, 'baby', critter.id);
    }
    else
    {
      ok(plan !== 'baby', `${critter.id} is drawn as a baby`);
    }
  }
});

test('a picture keeps its ids to itself, so two on a page do not clash', () =>
{
  const one = creatureSvg(critterById('infernyx'), { uid: 'a' });
  const two = creatureSvg(critterById('infernyx'), { uid: 'b' });
  ok(one.includes('id="body-a"') && two.includes('id="body-b"'), 'ids');
  ok(!one.includes('-b"'), 'one uses the other one\'s ids');
  equal(creatureSvg(critterById('infernyx'), { uid: 'a' }), one, 'always drawn the same');
});

test('a silhouette is one dark shape, with no face to give it away', () =>
{
  for (const critter of CRITTERS)
  {
    const svg = creatureSvg(critter, { silhouette: true });
    ok(!svg.includes('url(#'), `${critter.id} silhouette uses a gradient`);
    ok(!svg.includes('#fffdf2') && !svg.includes('#ffffff'), `${critter.id} silhouette shows its eyes`);
    ok(svg.includes('An unknown critter'), `${critter.id} silhouette names it`);
  }
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

// --- the grown-ups' check ------------------------------------------------------------

test('the grown-ups question is a times table from 3 to 9, with its answer', () =>
{
  const rng = random();
  for (let i = 0; i < 300; i++)
  {
    const { text, answer } = grownUpQuestion(rng);
    const [a, b] = text.split(' × ').map(Number);
    ok(a >= 3 && a <= 9 && b >= 3 && b <= 9, text);
    equal(answer, a * b, text);
  }
});

// --- voice settings -----------------------------------------------------------------

const VOICES = [
  { name: 'Thomas', lang: 'fr-FR', voiceURI: 'fr.thomas' },
  { name: 'Daniel', lang: 'en-GB', voiceURI: 'en.daniel' },
  { name: 'Samantha', lang: 'en-US', voiceURI: 'en.samantha' },
  { name: 'Fred', lang: 'en-US', voiceURI: 'en.fred' },
  { name: 'Karen', lang: 'en_AU', voiceURI: 'en.karen' },
  { name: 'Samantha', lang: 'en-US', voiceURI: 'en.samantha' },
];

test('the voice list is English only, US first, each once', () =>
{
  equal(englishVoices(VOICES).map((voice) => voice.voiceURI), ['en.fred', 'en.samantha', 'en.daniel', 'en.karen']);
});

test('the chosen voice is used, and Samantha until one is chosen', () =>
{
  equal(chooseVoice(VOICES, 'en.daniel').name, 'Daniel');
  equal(chooseVoice(VOICES, null).name, 'Samantha');
});

test('a chosen voice the iPad no longer has falls back instead of failing', () =>
{
  equal(chooseVoice(VOICES, 'en.gone').name, 'Samantha');
  equal(chooseVoice(VOICES.filter((voice) => voice.name !== 'Samantha'), 'en.gone').name, 'Fred');
  equal(chooseVoice([{ name: 'Thomas', lang: 'fr-FR', voiceURI: 'fr.thomas' }], null), null);
});

test('slower is slower', () =>
{
  ok(speechRate({ speed: 'slower' }) < speechRate({ speed: 'normal' }));
  equal(speechRate({ speed: 'nonsense' }), SPEEDS.normal.rate);
});

test('settings come back as saved, and anything odd falls back to the defaults', () =>
{
  const store = new Map();
  const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  equal(loadSettings(storage), defaultSettings());
  equal(defaultSettings().letterSounds, 'recordings', 'the recordings until a grown-up picks the voice');
  saveSettings(storage, { voice: 'en.daniel', speed: 'slower', letterSounds: 'voice' });
  equal(loadSettings(storage), { voice: 'en.daniel', speed: 'slower', letterSounds: 'voice' });
  store.set('word_miner_settings', JSON.stringify({ voice: 42, speed: 'warp', letterSounds: 'kazoo' }));
  equal(loadSettings(storage), { voice: null, speed: 'normal', letterSounds: 'recordings' });
  store.set('word_miner_settings', JSON.stringify({ voice: 'en.daniel', speed: 'slower' }));
  equal(loadSettings(storage).letterSounds, 'recordings', 'a save from before the choice existed');
  store.set('word_miner_settings', '{broken');
  equal(loadSettings(storage), defaultSettings());
});

// --- letter sounds from the voice -------------------------------------------------------

test('every letter sound has a voice spelling, or is marked as one the voice cannot make', () =>
{
  equal(Object.keys(VOICE_SPELLINGS).sort(), [...SOUND_KEYS].sort());
  for (const key of SOUND_KEYS)
  {
    const spelling = VOICE_SPELLINGS[key];
    ok(spelling === null || (typeof spelling === 'string' && spelling.length > 0), key);
  }
  ok(Object.keys(LETTER_SOUNDS).includes('recordings') && Object.keys(LETTER_SOUNDS).includes('voice'));
});

test('a grown-up recording always wins; the voice comes next when chosen, then the bundled one', () =>
{
  const bundled = new Set(['a', 'i', 'c', 't']);
  const recorded = new Set(['t']);
  equal(soundSource('t', { source: 'voice', bundled, recorded }), 'recorded');
  equal(soundSource('t', { source: 'recordings', bundled, recorded }), 'recorded');
  equal(soundSource('c', { source: 'voice', bundled, recorded }), 'voice');
  equal(soundSource('c', { source: 'recordings', bundled, recorded }), 'bundled');
});

test('a sound the voice cannot make falls back to the recording', () =>
{
  equal(VOICE_SPELLINGS.i, null);
  equal(soundSource('i', { source: 'voice', bundled: new Set(['i']), recorded: new Set() }), 'bundled');
});

test('with the voice, b can be played before anyone records it', () =>
{
  const bundled = new Set(SOUND_KEYS.filter((key) => !RECORD_ONLY.includes(key)));
  const none = new Set();
  equal(soundSource('b', { source: 'recordings', bundled, recorded: none }), null);
  equal(soundSource('b', { source: 'voice', bundled, recorded: none }), 'voice');
});

report();
