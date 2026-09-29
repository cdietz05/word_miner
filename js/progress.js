// Everything the game remembers between sessions, and the rules for how it
// changes. Pure: every function takes a state and returns a new one, and
// storage lives at the very bottom (load / save), so the tests can check
// the rules without a browser.

import { WORLDS, WORLD_GOAL, playableWords } from './phonics.js';

// Gems for a word read right the first time, and after a second go. Always
// something for getting there - the point is to keep him trying.
export const GEMS_FIRST_TRY = 3;
export const GEMS_LATER = 1;
// A card pack for every this many words read right.
export const WORDS_PER_PACK = 5;
// Right in a row for a streak bonus.
export const STREAK_BONUS_EVERY = 3;
export const STREAK_BONUS_GEMS = 2;

const VERSION = 1;

export function initialState()
{
  return {
    version: VERSION,
    gems: 0,
    // word -> { right: n, wrong: n, lastSeen: turn }
    words: {},
    streak: 0,
    bestStreak: 0,
    // Words read right since the last pack.
    towardPack: 0,
    // Packs earned but not opened yet, and the special ones a finished
    // world gives, which are always rare or better.
    packs: 0,
    rarePacks: 0,
    // Worlds whose goal was met, so their reward pack is given once.
    completedWorlds: [],
    // critter id -> how many
    cards: {},
    turn: 0,
  };
}

// A word read (or not). [firstTry] is whether it was right without a
// wrong pick first; a wrong pick is recorded on its own, with correct false.
export function recordAnswer(state, word, { correct, firstTry })
{
  const next = structuredCloneish(state);
  next.turn += 1;
  const stats = next.words[word] ?? { right: 0, wrong: 0, lastSeen: 0 };
  stats.lastSeen = next.turn;

  if (!correct)
  {
    stats.wrong += 1;
    next.streak = 0;
    next.words[word] = stats;
    return { state: next, gems: 0, packEarned: false, streakBonus: false };
  }

  stats.right += 1;
  next.words[word] = stats;

  let gems = firstTry ? GEMS_FIRST_TRY : GEMS_LATER;
  let streakBonus = false;
  if (firstTry)
  {
    next.streak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.streak);
    if (next.streak % STREAK_BONUS_EVERY === 0)
    {
      gems += STREAK_BONUS_GEMS;
      streakBonus = true;
    }
  }
  else
  {
    next.streak = 0;
  }
  next.gems += gems;

  next.towardPack += 1;
  const packEarned = next.towardPack >= WORDS_PER_PACK;
  if (packEarned)
  {
    next.towardPack = 0;
    next.packs += 1;
  }
  return { state: next, gems, packEarned, streakBonus };
}

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

// A world whose goal was just met hands out one special pack, always rare
// or better - once. Returns the state with it given, and whether it was new.
export function claimWorldReward(state, world, availableSounds)
{
  if (state.completedWorlds.includes(world.id) || !isWorldComplete(state, world, availableSounds))
  {
    return { state, claimed: false };
  }
  const next = structuredCloneish(state);
  next.completedWorlds.push(world.id);
  next.rarePacks += 1;
  return { state: next, claimed: true };
}

export function addCard(state, critterId)
{
  const next = structuredCloneish(state);
  next.cards[critterId] = (next.cards[critterId] ?? 0) + 1;
  return next;
}

export function packsWaiting(state)
{
  return state.packs + state.rarePacks;
}

// Takes one pack to open - a special one first. [minRarity] is what the
// pack promises (see critters.openPack); null when there are none.
export function spendPack(state)
{
  if (state.rarePacks > 0)
  {
    const next = structuredCloneish(state);
    next.rarePacks -= 1;
    return { state: next, minRarity: 'rare' };
  }
  if (state.packs > 0)
  {
    const next = structuredCloneish(state);
    next.packs -= 1;
    return { state: next, minRarity: 'common' };
  }
  return { state, minRarity: null };
}

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

// Words he finds hard, for the Parent Corner: more wrong than right.
export function troubleWords(state)
{
  return Object.entries(state.words)
    .filter(([, stats]) => stats.wrong > 0 && stats.wrong >= stats.right)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .map(([word]) => word);
}

// A plain-data copy - the state is only ever numbers, strings, arrays and
// plain objects.
function structuredCloneish(state)
{
  return JSON.parse(JSON.stringify(state));
}

// --- storage ---------------------------------------------------------------

const STORAGE_KEY = 'word_miner_progress';

// Anything unreadable - a private window, cleared data, an old shape -
// starts fresh rather than breaking the game.
export function load(storage)
{
  try
  {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw)
    {
      return initialState();
    }
    const saved = JSON.parse(raw);
    if (saved.version !== VERSION)
    {
      return initialState();
    }
    return { ...initialState(), ...saved };
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
