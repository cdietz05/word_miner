// Everything the game remembers between sessions, and the rules for how it
// changes. Pure: every function takes a state and returns a new one, and
// storage lives at the very bottom (load / save), so the tests can check
// the rules without a browser.

import { WORLDS, WORLD_GOAL, playableWords } from './phonics.js';
import { CRITTERS, critterById } from './critters.js';

// A Catch Orb for every word read right; this many and a wild critter
// appears. Always something for getting there - the point is to keep him
// trying.
export const ORBS_PER_ENCOUNTER = 5;
// Right the first time, this many in a row, and the next critter he catches
// comes on a holo card.
export const HOLO_STREAK = 3;
// How many words his buddy has to see read right, at each stage, before it
// grows into the next form.
export const EVOLVE_XP = { 1: 15, 2: 25 };

const VERSION = 2;

export function initialState()
{
  return {
    version: VERSION,
    // word -> { right: n, wrong: n, lastSeen: turn }
    words: {},
    streak: 0,
    bestStreak: 0,
    // Orbs toward the next wild critter.
    orbs: 0,
    // Wild critters waiting to be caught, and the special ones a region's
    // badge brings, likelier to be legendary.
    encounters: 0,
    specialEncounters: 0,
    // Whether the next catch comes on a holo card.
    holoCharged: false,
    // Regions whose goal was met, so their badge is given once.
    completedWorlds: [],
    // critter id -> how many caught (or grown), and how many of those holo
    caught: {},
    holo: {},
    // The critter he reads with, which grows as he does, and how much each
    // critter has grown at its stage.
    buddy: null,
    xp: {},
    turn: 0,
  };
}

// A word read (or not). [firstTry] is whether it was right without a
// wrong pick first; a wrong pick is recorded on its own, with correct false.
// On a right answer he gets an orb, his buddy grows - into its next form,
// once it has grown enough - and a run of first tries charges a holo card.
export function recordAnswer(state, word, { correct, firstTry })
{
  const next = copy(state);
  next.turn += 1;
  const stats = next.words[word] ?? { right: 0, wrong: 0, lastSeen: 0 };
  stats.lastSeen = next.turn;

  if (!correct)
  {
    stats.wrong += 1;
    next.streak = 0;
    next.words[word] = stats;
    return { state: next, encounterReady: false, holoCharged: false, evolution: null };
  }

  stats.right += 1;
  next.words[word] = stats;

  let holoCharged = false;
  if (firstTry)
  {
    next.streak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.streak);
    if (next.streak % HOLO_STREAK === 0 && !next.holoCharged)
    {
      next.holoCharged = true;
      holoCharged = true;
    }
  }
  else
  {
    next.streak = 0;
  }

  next.orbs += 1;
  const encounterReady = next.orbs >= ORBS_PER_ENCOUNTER;
  if (encounterReady)
  {
    next.orbs = 0;
    next.encounters += 1;
  }

  const evolution = growBuddy(next);
  return { state: next, encounterReady, holoCharged, evolution };
}

// One word's growth for his buddy, in place on a fresh copy. When it has
// grown enough at its stage it becomes the next form in its line: that
// form's card goes in his Critter Book and it's his buddy from then on.
// Returns { from, to } when that happened, else null.
function growBuddy(state)
{
  const buddy = state.buddy ? critterById(state.buddy) : null;
  if (!buddy)
  {
    return null;
  }
  state.xp[buddy.id] = (state.xp[buddy.id] ?? 0) + 1;
  const needed = EVOLVE_XP[buddy.stage];
  if (!buddy.evolvesTo || needed === undefined || state.xp[buddy.id] < needed)
  {
    return null;
  }
  const grown = critterById(buddy.evolvesTo);
  state.buddy = grown.id;
  state.caught[grown.id] = (state.caught[grown.id] ?? 0) + 1;
  state.xp[grown.id] = state.xp[grown.id] ?? 0;
  return { from: buddy.id, to: grown.id };
}

// How far his buddy is toward its next form: null with no buddy; [needed]
// null once it's in its final form.
export function buddyGrowth(state)
{
  const buddy = state.buddy ? critterById(state.buddy) : null;
  if (!buddy)
  {
    return null;
  }
  const needed = buddy.evolvesTo ? EVOLVE_XP[buddy.stage] : null;
  return { critter: buddy, xp: state.xp[buddy.id] ?? 0, needed };
}

// Makes [critterId] his buddy - only one he's caught.
export function chooseBuddy(state, critterId)
{
  if ((state.caught[critterId] ?? 0) === 0)
  {
    return state;
  }
  const next = copy(state);
  next.buddy = critterId;
  return next;
}

// A critter caught: into the Critter Book, on a holo card if one was
// charged (which uses the charge up). His very first catch becomes his
// buddy.
export function catchCritter(state, critterId)
{
  const next = copy(state);
  const isNew = (next.caught[critterId] ?? 0) === 0;
  const holo = next.holoCharged;
  const isNewHolo = holo && (next.holo[critterId] ?? 0) === 0;
  next.caught[critterId] = (next.caught[critterId] ?? 0) + 1;
  if (holo)
  {
    next.holo[critterId] = (next.holo[critterId] ?? 0) + 1;
    next.holoCharged = false;
  }
  if (!next.buddy)
  {
    next.buddy = critterId;
  }
  return { state: next, holo, isNew, isNewHolo };
}

export function encountersWaiting(state)
{
  return state.encounters + state.specialEncounters;
}

// Takes one waiting encounter - a special one first. [kind] is 'special',
// 'wild', or null when there are none.
export function spendEncounter(state)
{
  if (state.specialEncounters > 0)
  {
    const next = copy(state);
    next.specialEncounters -= 1;
    return { state: next, kind: 'special' };
  }
  if (state.encounters > 0)
  {
    const next = copy(state);
    next.encounters -= 1;
    return { state: next, kind: 'wild' };
  }
  return { state, kind: null };
}

// How many different critters he's caught, and holo cards.
export function bookCounts(state)
{
  return {
    caught: CRITTERS.filter((critter) => (state.caught[critter.id] ?? 0) > 0).length,
    holo: CRITTERS.filter((critter) => (state.holo[critter.id] ?? 0) > 0).length,
    total: CRITTERS.length,
  };
}

// --- regions ---------------------------------------------------------------

// How many different words of [world] have been read right.
export function wordsLearned(state, world, availableSounds)
{
  return playableWords(world, availableSounds).filter((word) => (state.words[word.word]?.right ?? 0) > 0).length;
}

// How many a world wants - WORLD_GOAL, or every word it has, if fewer.
export function worldGoal(world, availableSounds)
{
  return Math.min(WORLD_GOAL, playableWords(world, availableSounds).length);
}

export function isWorldComplete(state, world, availableSounds)
{
  return wordsLearned(state, world, availableSounds) >= worldGoal(world, availableSounds);
}

// The first world is always open; each after it opens once the one before
// is complete.
export function unlockedWorldIds(state, availableSounds)
{
  const open = [];
  for (const world of WORLDS)
  {
    open.push(world.id);
    if (!isWorldComplete(state, world, availableSounds))
    {
      break;
    }
  }
  return open;
}

// A region whose goal was just met gives its badge and a special
// encounter - once. Returns the state with it given, and whether it was new.
export function claimWorldReward(state, world, availableSounds)
{
  if (state.completedWorlds.includes(world.id) || !isWorldComplete(state, world, availableSounds))
  {
    return { state, claimed: false };
  }
  const next = copy(state);
  next.completedWorlds.push(world.id);
  next.specialEncounters += 1;
  return { state: next, claimed: true };
}

// --- words -----------------------------------------------------------------

// Which word comes next. Words he hasn't read yet come first, then the ones
// he's got wrong more than right, then the rest - never the word just
// played, so nothing repeats back to back.
export function nextWord(state, words, random, previous = null)
{
  const candidates = words.filter((word) => word.word !== previous || words.length === 1);
  const weight = (word) =>
  {
    const stats = state.words[word.word];
    if (!stats || stats.right === 0)
    {
      return 6;
    }
    if (stats.wrong > stats.right)
    {
      return 4;
    }
    // Longer since it was seen, a little likelier.
    return 1 + Math.min(2, (state.turn - stats.lastSeen) / 10);
  };
  const total = candidates.reduce((sum, word) => sum + weight(word), 0);
  let pick = random() * total;
  for (const word of candidates)
  {
    pick -= weight(word);
    if (pick < 0)
    {
      return word;
    }
  }
  return candidates[candidates.length - 1];
}

// Words he finds hard, for the grown-ups' corner: more wrong than right.
export function troubleWords(state)
{
  return Object.entries(state.words)
    .filter(([, stats]) => stats.wrong > 0 && stats.wrong >= stats.right)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .map(([word]) => word);
}

// A plain-data copy - the state is only ever numbers, strings, booleans,
// arrays and plain objects.
function copy(state)
{
  return JSON.parse(JSON.stringify(state));
}

// --- storage ---------------------------------------------------------------

// The key from when the game was Word Miner, kept so his progress carries
// over.
const STORAGE_KEY = 'word_miner_progress';

// A save from Word Miner (version 1) into this game: his reading - the
// words, streaks and finished regions - carries over whole. Its card-pack
// rewards become encounters, and any card of a critter still in the game
// stays in his book. Cards of critters that are gone, and the gems -
// nothing to spend them on now - are left behind.
export function migrate(saved)
{
  if (!saved || typeof saved !== 'object')
  {
    return initialState();
  }
  if (saved.version === VERSION)
  {
    return { ...initialState(), ...saved };
  }
  if (saved.version !== 1)
  {
    return initialState();
  }
  const next = initialState();
  next.words = saved.words ?? {};
  next.streak = saved.streak ?? 0;
  next.bestStreak = saved.bestStreak ?? 0;
  next.turn = saved.turn ?? 0;
  next.completedWorlds = saved.completedWorlds ?? [];
  next.orbs = Math.min(ORBS_PER_ENCOUNTER - 1, saved.towardPack ?? 0);
  next.encounters = saved.packs ?? 0;
  next.specialEncounters = saved.rarePacks ?? 0;
  for (const [id, count] of Object.entries(saved.cards ?? {}))
  {
    if (critterById(id) && count > 0)
    {
      next.caught[id] = count;
    }
  }
  return next;
}

// Anything unreadable - a private window, cleared data, an unknown shape -
// starts fresh rather than breaking the game.
export function load(storage)
{
  try
  {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : initialState();
  }
  catch (error)
  {
    return initialState();
  }
}

export function save(storage, state)
{
  try
  {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  catch (error)
  {
    // Storage full or blocked - the game still plays, it just won't
    // remember this session.
  }
}
