// The game: every screen, and what happens when it's tapped.
//
// Screens are drawn with innerHTML and one click handler per screen that
// reads data-action off whatever was tapped. The rules - what a word is
// worth, when a world opens, which card a pack gives - live in progress.js,
// phonics.js and critters.js; this file only calls them and shows the
// result.

import { SOUND_KEYS, RECORD_ONLY, SOUND_HINTS, WORLDS, playableWords, pickChoices } from './phonics.js';
import * as progress from './progress.js';
import { CRITTERS, critterById, openPack } from './critters.js';
import { Sounds, say, wait } from './audio.js';
import { loadRecordings, saveRecording, deleteRecording, startRecording } from './recorder.js';
import { cardHtml, drawSprites } from './cards.js';

const app = document.getElementById('app');
const overlay = document.getElementById('overlay');
const sounds = new Sounds();

let state = progress.load(localStorage);
let session = null;
// Off only in preview mode (see the bottom of this file), whose made-up
// progress must never overwrite his real progress.
let saving = true;
let idleTimer = null;

// The first few rounds of a visit say what to do; after that he knows.
const TALKATIVE_ROUNDS = 3;
const IDLE_HINT_MS = 9000;

// Each world's sky, and the big letters on its tile on the map.
const SKIES = {
  grass: ['#3a78c2', '#9fd0ff'],
  forest: ['#4f7fb0', '#c6e2b0'],
  sand: ['#d9823a', '#ffe2a0'],
  snow: ['#7aa7d6', '#eef6ff'],
  stone: ['#1d1f27', '#4a4f5e'],
  jungle: ['#2f6f5a', '#9fe0a0'],
  lava: ['#3a0d0d', '#b3471c'],
  sky: ['#6ab0ff', '#fff3c9'],
};
const MAP_LETTERS = {
  meadow: 'a',
  forest: 'i',
  desert: 'o',
  snow: 'u',
  caves: 'e',
  jungle: 'ck',
  lava: 'sh',
  sky: 'a_e',
};

function commit(next)
{
  state = next;
  if (saving)
  {
    progress.save(localStorage, state);
  }
}

function setSky(biome)
{
  const [top, bottom] = SKIES[biome] ?? SKIES.grass;
  document.documentElement.style.setProperty('--sky-top', top);
  document.documentElement.style.setProperty('--sky-bottom', bottom);
}

function clearIdle()
{
  if (idleTimer)
  {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

// --- start ---------------------------------------------------------------------

// Sound on the iPad can only start from a tap, so the game opens on one big
// button; tapping it unlocks the sound and loads the letter sounds.
function renderStart()
{
  setSky('grass');
  app.innerHTML = `
    <div class="start">
      <div>
        <h1 class="title">WORD<br>MINER</h1>
        <img class="hero" src="icons/icon-512.png" alt="">
        <div><button class="block-button green play-button" data-action="begin">▶ PLAY</button></div>
      </div>
    </div>`;
  app.onclick = async (event) =>
  {
    if (!event.target.closest('[data-action="begin"]'))
    {
      return;
    }
    app.onclick = null;
    sounds.unlock();
    event.target.closest('button').textContent = '⛏️ ...';
    await sounds.load(SOUND_KEYS.filter((key) => !RECORD_ONLY.includes(key)));
    for (const [key, blob] of await loadRecordings())
    {
      try
      {
        await sounds.setRecording(key, blob);
      }
      catch (error)
      {
        // A recording that won't decode any more is skipped.
      }
    }
    renderHome();
    say('Welcome, miner! Pick a world to dig in.');
  };
}

// --- home: the world map -----------------------------------------------------

function renderHome()
{
  clearIdle();
  session = null;
  setSky('grass');
  const available = sounds.available();
  const open = progress.unlockedWorldIds(state, available);
  const waiting = progress.packsWaiting(state);
  const owned = CRITTERS.filter((critter) => (state.cards[critter.id] ?? 0) > 0).length;

  app.innerHTML = `
    <div class="topbar">
      <span class="screen-title">WORD MINER</span>
      <span class="spacer"></span>
      <div class="counter"><span class="icon">💎</span>${state.gems}</div>
      <button class="icon-button" data-hold="parent" aria-label="Grown-ups: press and hold">⚙️</button>
    </div>
    <div class="home-body">
      <div class="home-actions">
        ${waiting > 0 ? `<button class="block-button gold pack-ready" data-action="open-pack">🎁 Open pack${waiting > 1 ? ` (${waiting})` : ''}</button>` : ''}
        <button class="block-button" data-action="collection">🃏 My cards ${owned} / ${CRITTERS.length}</button>
      </div>
      <div class="worlds">
        ${WORLDS.map((world) => worldTile(world, open.includes(world.id), available)).join('')}
      </div>
    </div>`;

  app.onclick = async (event) =>
  {
    const target = event.target.closest('[data-action]');
    if (!target)
    {
      return;
    }
    sounds.unlock();
    const action = target.dataset.action;
    if (action === 'world')
    {
      if (target.classList.contains('locked'))
      {
        sounds.wrong();
        say('Finish the world before this one to open it!');
        return;
      }
      startWorld(target.dataset.world);
    }
    else if (action === 'collection')
    {
      renderCollection();
    }
    else if (action === 'open-pack')
    {
      await showPacks();
      renderHome();
    }
  };
  wireParentHold();
}

function worldTile(world, isOpen, available)
{
  const learned = progress.wordsLearned(state, world, available);
  const goal = progress.worldGoal(world, available);
  const complete = learned >= goal;
  const percent = goal > 0 ? Math.round((learned / goal) * 100) : 0;
  return `
    <button class="world ${isOpen ? '' : 'locked'}" data-action="world" data-world="${world.id}"
      style="background-image: url('art/${world.biome}.png')" aria-label="${world.name}">
      ${complete ? '<span class="done">⭐</span>' : ''}
      <span class="focus">${MAP_LETTERS[world.id]}</span>
      <span class="name">${world.name}</span>
      ${isOpen ? `<span class="bar"><span style="width: ${percent}%"></span></span>` : ''}
    </button>`;
}

// The grown-ups' corner opens on a press-and-hold of the gear, so a tap
// from a six-year-old doesn't land there.
function wireParentHold()
{
  const gear = app.querySelector('[data-hold="parent"]');
  if (!gear)
  {
    return;
  }
  let timer = null;
  const cancel = () =>
  {
    clearTimeout(timer);
    timer = null;
  };
  gear.addEventListener('pointerdown', () =>
  {
    timer = setTimeout(() =>
    {
      timer = null;
      renderParent();
    }, 1500);
  });
  gear.addEventListener('pointerup', cancel);
  gear.addEventListener('pointerleave', cancel);
  gear.addEventListener('pointercancel', cancel);
}

// --- play --------------------------------------------------------------------

function startWorld(worldId)
{
  const world = WORLDS.find((candidate) => candidate.id === worldId);
  session = { world, previous: null, rounds: 0 };
  setSky(world.biome);
  nextRound();
  if (world.id === 'sky')
  {
    say('In this world, the e at the end is magic. It is quiet, and it makes the other vowel say its name!');
  }
}

function soundKeys(word)
{
  return word.tiles.map((tile) => tile.sound);
}

function nextRound()
{
  const words = playableWords(session.world, sounds.available());
  if (words.length === 0)
  {
    renderHome();
    return;
  }
  const word = progress.nextWord(state, words, Math.random, session.previous);
  Object.assign(session, {
    word,
    heard: new Set(),
    nextTile: 0,
    phase: 'tap',
    wrongs: 0,
    choices: null,
    busy: false,
    idleHinted: false,
  });
  renderPlay();
  if (session.rounds < TALKATIVE_ROUNDS)
  {
    say('Tap each block to hear its sound.');
  }
  armIdleHint();
}

// Nothing tapped for a while: point at the next block and say so, once.
function armIdleHint()
{
  clearIdle();
  idleTimer = setTimeout(() =>
  {
    if (!session || session.idleHinted)
    {
      return;
    }
    session.idleHinted = true;
    if (session.phase === 'tap')
    {
      say('Tap the glowing block!');
    }
    else if (session.phase === 'blend')
    {
      say('Tap the pickaxe to blend the sounds!');
    }
    else if (session.phase === 'choose')
    {
      say('Which picture is it? Tap the speaker to hear the sounds again.');
    }
  }, IDLE_HINT_MS);
}

function renderPlay()
{
  const { world, word } = session;
  const available = sounds.available();
  const learned = progress.wordsLearned(state, world, available);
  const goal = progress.worldGoal(world, available);
  const percent = goal > 0 ? Math.min(100, Math.round((learned / goal) * 100)) : 0;

  app.innerHTML = `
    <div class="topbar">
      <button class="icon-button" data-action="home" aria-label="Map">🏠</button>
      <div class="world-progress" aria-label="World progress"><span style="width: ${percent}%"></span></div>
      <span class="spacer"></span>
      <div class="pack-meter" aria-label="Words until the next card pack">
        ${Array.from({ length: progress.WORDS_PER_PACK }, (_, i) => `<span class="${i < state.towardPack ? 'full' : ''}"></span>`).join('')}
      </div>
      <div class="counter"><span class="icon">💎</span><span id="gem-count">${state.gems}</span></div>
    </div>
    <div class="play" id="play">
      <div class="word-row" id="word-row">
        ${word.tiles.map((tile, i) => tileHtml(tile, i)).join('')}
        <div class="reveal">${word.picture}</div>
      </div>
      <div class="actions" id="actions">${actionsHtml()}</div>
    </div>`;

  app.onclick = (event) =>
  {
    const target = event.target.closest('[data-action]');
    if (!target)
    {
      return;
    }
    sounds.unlock();
    armIdleHint();
    const action = target.dataset.action;
    if (action === 'home')
    {
      renderHome();
    }
    else if (action === 'tile')
    {
      onTile(Number(target.dataset.index), target);
    }
    else if (action === 'blend')
    {
      onBlend();
    }
    else if (action === 'replay')
    {
      replaySounds();
    }
    else if (action === 'choice')
    {
      onChoice(target.dataset.word, target);
    }
  };
}

function tileHtml(tile, index)
{
  const classes = ['tile'];
  if (session.heard.has(index))
  {
    classes.push('heard');
  }
  if (session.phase === 'tap' && index === session.nextTile)
  {
    classes.push('next');
  }
  if (tile.sound === null)
  {
    classes.push('silent');
  }
  // Each block cracks further as the word is worked: a crack when it's
  // heard, more once they all have been. Never so much that the letter,
  // which he still has to read, gets lost in it.
  const crack = session.phase !== 'tap' ? 2 : session.heard.has(index) ? 1 : 0;
  // Where this block flies when the word breaks open.
  const dx = `${Math.round((index - (session.word.tiles.length - 1) / 2) * 40 + (Math.random() * 30 - 15))}vw`;
  const spin = `${Math.round(Math.random() * 360 - 180)}deg`;
  return `
    <button class="tile ${classes.join(' ')}" data-action="tile" data-index="${index}" style="--dx: ${dx}; --spin: ${spin}">
      <span class="crack" style="${crack > 0 ? `background-image: url('art/crack${crack}.png')` : ''}"></span>
      <span class="letter">${tile.text}</span>
    </button>`;
}

function actionsHtml()
{
  const replay = '<button class="icon-button" data-action="replay" aria-label="Hear the sounds again">🔊</button>';
  if (session.phase === 'blend')
  {
    return `${replay}<button class="block-button gold pickaxe-button" data-action="blend">⛏️ Blend!</button>`;
  }
  if (session.phase === 'choose')
  {
    return `${replay}<div class="choices">${session.choices.map((choice) => `
      <button class="choice" data-action="choice" data-word="${choice.word}" aria-label="${choice.word}">${choice.picture}</button>`).join('')}</div>`;
  }
  return session.heard.size > 0 ? replay : '';
}

function refreshPlay()
{
  const row = document.getElementById('word-row');
  const actions = document.getElementById('actions');
  if (!row || !actions)
  {
    return;
  }
  row.innerHTML = `${session.word.tiles.map((tile, i) => tileHtml(tile, i)).join('')}<div class="reveal">${session.word.picture}</div>`;
  actions.innerHTML = actionsHtml();
}

async function playTile(index)
{
  const tile = session.word.tiles[index];
  sounds.crack();
  const element = document.querySelector(`.tile[data-index="${index}"]`);
  element?.classList.add('pop');
  setTimeout(() => element?.classList.remove('pop'), 180);
  if (tile.sound === null)
  {
    sounds.gem();
    return;
  }
  await sounds.play(tile.sound);
}

function onTile(index)
{
  if (session.busy)
  {
    return;
  }
  if (session.phase !== 'tap')
  {
    // Any block can be heard again once they all have been.
    playTile(index);
    return;
  }
  if (index < session.nextTile)
  {
    playTile(index);
    return;
  }
  if (index > session.nextTile)
  {
    // Left to right - the glowing one first.
    const next = document.querySelector(`.tile[data-index="${session.nextTile}"]`);
    next?.classList.add('pop');
    setTimeout(() => next?.classList.remove('pop'), 180);
    return;
  }
  session.heard.add(index);
  session.nextTile += 1;
  playTile(index);
  if (session.nextTile >= session.word.tiles.length)
  {
    session.phase = 'blend';
    if (session.rounds < TALKATIVE_ROUNDS)
    {
      setTimeout(() => say('Now swing the pickaxe to blend the sounds together!'), 600);
    }
  }
  refreshPlay();
}

async function onBlend()
{
  if (session.busy)
  {
    return;
  }
  session.busy = true;
  const row = document.getElementById('word-row');
  row.classList.add('blending');
  sounds.crack();
  const keys = soundKeys(session.word);
  // Once slowly, then run together - the way you'd sound it out aloud.
  await sounds.sequence(keys, { gapMs: 380 });
  await wait(250);
  await sounds.sequence(keys, { gapMs: 30 });
  session.choices = pickChoices(session.word, session.world.words, Math.random);
  session.phase = 'choose';
  session.busy = false;
  refreshPlay();
  if (session.rounds < TALKATIVE_ROUNDS)
  {
    say('Which picture is it?');
  }
}

async function replaySounds()
{
  if (session.busy)
  {
    return;
  }
  session.busy = true;
  await sounds.sequence(soundKeys(session.word), { gapMs: 300 });
  session.busy = false;
}

async function onChoice(chosen, button)
{
  if (session.busy)
  {
    return;
  }
  const { word, world } = session;
  if (chosen !== word.word)
  {
    session.wrongs += 1;
    commit(progress.recordAnswer(state, word.word, { correct: false, firstTry: false }).state);
    button.classList.add('wrong');
    sounds.wrong();
    session.busy = true;
    if (session.wrongs >= 2)
    {
      document.querySelector(`.choice[data-word="${word.word}"]`)?.classList.add('hint');
      await say(`This one says ${word.word}. Tap it!`);
    }
    else
    {
      await say('Not quite. Listen again.');
      await sounds.sequence(soundKeys(word), { gapMs: 300 });
    }
    session.busy = false;
    return;
  }

  session.busy = true;
  clearIdle();
  // He may head back to the map while this plays out; the round is then
  // over and nothing below should carry it on.
  const round = session;
  const result = progress.recordAnswer(state, word.word, { correct: true, firstTry: session.wrongs === 0 });
  commit(result.state);
  button.classList.add('right');
  sounds.correct();
  await wait(250);
  document.getElementById('word-row')?.classList.add('broken');
  sounds.shatter();
  floatGems(result.gems);
  await say(`${word.word}!`);

  if (result.streakBonus)
  {
    banner(`${state.streak} IN A ROW! +${progress.STREAK_BONUS_GEMS} 💎`);
    sounds.gem();
    await say(`${state.streak} in a row!`);
  }

  const reward = progress.claimWorldReward(state, world, sounds.available());
  if (reward.claimed)
  {
    commit(reward.state);
    sounds.fanfare();
    confetti();
    banner('WORLD COMPLETE! ⭐');
    const last = WORLDS[WORLDS.length - 1].id === world.id;
    await say(last
      ? `Amazing! You finished ${world.name}! You're a master miner!`
      : `Amazing! You finished ${world.name}! A new world is open, and you get a special card pack!`);
  }

  await wait(700);
  if (result.packEarned || reward.claimed)
  {
    await showPacks();
  }
  if (session !== round)
  {
    return;
  }
  session.previous = word.word;
  session.rounds += 1;
  setSky(world.biome);
  nextRound();
}

function floatGems(count)
{
  const play = document.getElementById('play');
  if (!play)
  {
    return;
  }
  const float = document.createElement('div');
  float.className = 'float-gems';
  float.textContent = `+${count} 💎`;
  play.appendChild(float);
  setTimeout(() => float.remove(), 1500);
  sounds.gem();
  const counter = document.getElementById('gem-count');
  if (counter)
  {
    counter.textContent = state.gems;
  }
}

function banner(text)
{
  const play = document.getElementById('play') ?? app;
  const element = document.createElement('div');
  element.className = 'banner';
  element.textContent = text;
  play.appendChild(element);
  setTimeout(() => element.remove(), 2600);
}

function confetti()
{
  const colors = ['#ffd23f', '#4fe3d0', '#5ccf5c', '#e55d5d', '#9fd0ff', '#c9b3f2'];
  for (let i = 0; i < 40; i++)
  {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 2600);
  }
}

// --- card packs ------------------------------------------------------------------

// Opens every waiting pack, one at a time; resolves when he's done.
function showPacks()
{
  return new Promise((resolve) =>
  {
    openOnePack(() =>
    {
      overlay.hidden = true;
      overlay.innerHTML = '';
      resolve();
    });
  });
}

function openOnePack(done)
{
  const spent = progress.spendPack(state);
  if (!spent.minRarity)
  {
    done();
    return;
  }
  commit(spent.state);
  const critter = openPack(state.cards, Math.random, { minRarity: spent.minRarity });
  const isNew = (state.cards[critter.id] ?? 0) === 0;
  commit(progress.addCard(state, critter.id));
  const special = spent.minRarity === 'rare';

  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="overlay-text">${special ? 'SPECIAL PACK!' : 'CARD PACK!'}<br>TAP TAP TAP!</div>
    <button class="pack ${special ? 'rare-pack' : ''}" id="pack" aria-label="Open the pack">⛏️</button>`;
  say(special ? 'A special card pack! Tap it to break it open!' : 'You got a card pack! Tap it to break it open!');

  let taps = 0;
  const pack = document.getElementById('pack');
  pack.onclick = () =>
  {
    sounds.unlock();
    taps += 1;
    sounds.crack();
    pack.classList.remove('shake');
    void pack.offsetWidth;
    pack.classList.add('shake');
    if (taps < 3)
    {
      return;
    }
    pack.onclick = null;
    pack.classList.add('burst');
    sounds.sparkle();
    setTimeout(() => revealCard(critter, isNew, done), 450);
  };
}

function revealCard(critter, isNew, done)
{
  const more = progress.packsWaiting(state) > 0;
  overlay.innerHTML = `
    <div class="flip-in">${cardHtml(critter, { big: true, isNew, count: state.cards[critter.id] })}</div>
    <div>
      ${more ? '<button class="block-button gold" data-action="next-pack">🎁 Next pack</button>' : ''}
      <button class="block-button green" data-action="close">⛏️ Keep mining!</button>
    </div>`;
  drawSprites(overlay, critterById);
  if (critter.rarity === 'rare' || critter.rarity === 'legendary')
  {
    confetti();
    sounds.fanfare();
  }
  say(isNew ? `A new card! ${critter.name}!` : `${critter.name}! You have ${state.cards[critter.id]} now.`);
  overlay.onclick = (event) =>
  {
    const target = event.target.closest('[data-action]');
    if (!target)
    {
      return;
    }
    overlay.onclick = null;
    if (target.dataset.action === 'next-pack')
    {
      openOnePack(done);
    }
    else
    {
      done();
    }
  };
}

// --- the card binder ---------------------------------------------------------------

function renderCollection()
{
  clearIdle();
  setSky('stone');
  const owned = CRITTERS.filter((critter) => (state.cards[critter.id] ?? 0) > 0).length;
  app.innerHTML = `
    <div class="topbar">
      <button class="icon-button" data-action="home" aria-label="Map">🏠</button>
      <span class="screen-title">MY CARDS ${owned} / ${CRITTERS.length}</span>
      <span class="spacer"></span>
    </div>
    <div class="collection-body">
      <div class="collection-grid">
        ${CRITTERS.map((critter) =>
        {
          const count = state.cards[critter.id] ?? 0;
          return `<button data-action="card" data-id="${critter.id}">${cardHtml(critter, { count, unknown: count === 0 })}</button>`;
        }).join('')}
      </div>
    </div>`;
  drawSprites(app, critterById);
  app.onclick = (event) =>
  {
    const target = event.target.closest('[data-action]');
    if (!target)
    {
      return;
    }
    sounds.unlock();
    if (target.dataset.action === 'home')
    {
      renderHome();
      return;
    }
    const critter = critterById(target.dataset.id);
    if ((state.cards[critter.id] ?? 0) === 0)
    {
      say('Find this one in a card pack!');
      return;
    }
    showBigCard(critter);
  };
}

function showBigCard(critter)
{
  overlay.hidden = false;
  overlay.innerHTML = `
    ${cardHtml(critter, { big: true, count: state.cards[critter.id] })}
    <button class="block-button" data-action="close">Close</button>`;
  drawSprites(overlay, critterById);
  say(`${critter.name}. ${critter.move}!`);
  overlay.onclick = (event) =>
  {
    if (event.target.closest('[data-action="close"]'))
    {
      overlay.onclick = null;
      overlay.hidden = true;
      overlay.innerHTML = '';
    }
    else if (event.target.closest('.card'))
    {
      say(critter.name);
    }
  };
}

// --- grown-ups' corner --------------------------------------------------------------

let activeRecording = null;

function renderParent()
{
  clearIdle();
  setSky('stone');
  const available = sounds.available();
  const totalRight = Object.values(state.words).reduce((sum, stats) => sum + stats.right, 0);
  const wordsRead = Object.values(state.words).filter((stats) => stats.right > 0).length;
  const trouble = progress.troubleWords(state);
  const owned = CRITTERS.filter((critter) => (state.cards[critter.id] ?? 0) > 0).length;

  app.innerHTML = `
    <div class="topbar">
      <button class="icon-button" data-action="home" aria-label="Back to the game">🏠</button>
      <span class="screen-title">GROWN-UPS</span>
    </div>
    <div class="parent">
      <h2>Letter sounds</h2>
      <p>The game plays these sounds as he taps each block. It comes with free recordings of all of them except
      <strong>b</strong> - record that one and the words with a b in them join the game. You can record over any
      sound you'd like in your own voice: tap Record, say just the sound (<em>"b"</em>, not <em>"buh"</em> - as short
      as you can), and tap Stop. It trims the silence itself.</p>
      <div class="sound-list">
        ${SOUND_KEYS.map((key) => soundRow(key, available)).join('')}
      </div>

      <h2>How he's doing</h2>
      <div class="stat-grid">
        <div class="stat">Words read right: <strong>${totalRight}</strong></div>
        <div class="stat">Different words: <strong>${wordsRead}</strong></div>
        <div class="stat">Best streak: <strong>${state.bestStreak}</strong></div>
        <div class="stat">Cards: <strong>${owned} / ${CRITTERS.length}</strong></div>
        ${WORLDS.map((world) => `<div class="stat">${world.name} (${world.focus}): <strong>${progress.wordsLearned(state, world, available)} / ${progress.worldGoal(world, available)}</strong></div>`).join('')}
      </div>
      <p>${trouble.length > 0 ? `Words he's finding hard: <strong>${trouble.slice(0, 12).join(', ')}</strong>` : 'No trouble words yet.'}</p>

      <h2>Putting it on the iPad</h2>
      <p>Open this page in Safari, tap the Share button, then <strong>Add to Home Screen</strong>. It opens full screen
      like an app and works without the internet. His progress is saved on the iPad.</p>

      <h2>Start over</h2>
      <p><button class="small-button danger" data-action="reset">Reset all progress</button></p>

      <h2>Credits</h2>
      <p>Letter sounds: <a href="https://freesound.org/people/margo_heston/packs/12249/">"English Phonemes" by margo_heston</a>
      on Freesound, <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a> - trimmed and evened out
      for the game. Fonts: Andika (SIL) and Press Start 2P (CodeMan38), both under the SIL Open Font License. Everything
      else - the critters, blocks and words - was made for this game.</p>
    </div>`;

  app.onclick = async (event) =>
  {
    const target = event.target.closest('[data-action]');
    if (!target)
    {
      return;
    }
    sounds.unlock();
    const { action, key } = target.dataset;
    if (action === 'home')
    {
      renderHome();
    }
    else if (action === 'play-sound')
    {
      sounds.play(key);
    }
    else if (action === 'record')
    {
      await toggleRecording(key, target);
    }
    else if (action === 'clear-sound')
    {
      await deleteRecording(key);
      sounds.clearRecording(key);
      renderParent();
    }
    else if (action === 'reset')
    {
      if (window.confirm('Reset all progress - gems, words and cards? This cannot be undone.'))
      {
        commit(progress.initialState());
        renderParent();
      }
    }
  };
}

function soundRow(key, available)
{
  const recorded = sounds.hasRecording(key);
  const has = available.has(key);
  const needed = !has && RECORD_ONLY.includes(key);
  const status = recorded ? 'Your recording' : has ? 'Built in' : needed ? 'Needed - record it to add its words' : 'Missing';
  const [letters, ...rest] = SOUND_HINTS[key].split(' as in ');
  return `
    <div class="sound-row ${needed ? 'needed' : ''}">
      <span class="label"><strong>${letters}</strong> as in ${rest.join(' as in ')}<span class="status">${status}</span></span>
      ${has ? `<button class="small-button" data-action="play-sound" data-key="${key}" aria-label="Play">▶</button>` : ''}
      <button class="small-button" data-action="record" data-key="${key}">Record</button>
      ${recorded ? `<button class="small-button" data-action="clear-sound" data-key="${key}" aria-label="Use the built-in sound">↺</button>` : ''}
    </div>`;
}

async function toggleRecording(key, button)
{
  if (activeRecording)
  {
    const { key: recordingKey, recording } = activeRecording;
    activeRecording = null;
    await finishRecording(recordingKey, await recording.stop());
    return;
  }
  try
  {
    const recording = await startRecording(3000);
    activeRecording = { key, recording };
    button.textContent = '■ Stop';
    button.classList.add('recording');
    // Stops on its own after three seconds.
    recording.finished.then(async (blob) =>
    {
      if (activeRecording && activeRecording.key === key)
      {
        activeRecording = null;
        await finishRecording(key, blob);
      }
    });
  }
  catch (error)
  {
    window.alert("The microphone isn't available. Check that Word Miner is allowed to use it in Settings.");
  }
}

async function finishRecording(key, blob)
{
  let kept = false;
  try
  {
    kept = await sounds.setRecording(key, blob);
  }
  catch (error)
  {
    kept = false;
  }
  if (!kept)
  {
    window.alert("That one didn't come through - try again, a little louder.");
    renderParent();
    return;
  }
  await saveRecording(key, blob);
  renderParent();
  sounds.play(key);
}

// --- off we go ---------------------------------------------------------------------

if ('serviceWorker' in navigator)
{
  navigator.serviceWorker.register('sw.js').catch(() =>
  {
    // Offline play just isn't available - the game still works online.
  });
}
if ('speechSynthesis' in window)
{
  // The voice list loads late on some devices; asking early warms it up.
  window.speechSynthesis.getVoices();
}
// Checking a screen's layout on a device or simulator, without playing
// through to it: ?preview=home, play, choose, collection, pack or parent
// opens straight on that screen with made-up progress that is never saved,
// and shows any error on screen. Nothing in the game links here.
const preview = new URLSearchParams(window.location.search).get('preview');
if (preview)
{
  window.addEventListener('error', (event) =>
  {
    document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;bottom:0;left:0;right:0;background:#b00;color:#fff;z-index:99;margin:0;padding:8px;white-space:pre-wrap">${event.message}\n${event.filename}:${event.lineno}</pre>`);
  });
  saving = false;
  // The letter sounds aren't loaded without the start button's tap; the
  // screens only need to know which there would be.
  sounds.available = () => new Set(SOUND_KEYS.filter((key) => !RECORD_ONLY.includes(key)));
  let sample = progress.initialState();
  for (const word of WORLDS[0].words.slice(0, 7))
  {
    sample = progress.recordAnswer(sample, word.word, { correct: true, firstTry: true }).state;
  }
  for (const id of ['mossy', 'emberkit', 'splashy', 'thunderpup', 'glacior', 'duskbat', 'stormhawk'])
  {
    sample = progress.addCard(sample, id);
  }
  sample.packs = 1;
  state = sample;
  if (preview === 'home')
  {
    renderHome();
  }
  else if (preview === 'play' || preview === 'choose')
  {
    startWorld(new URLSearchParams(window.location.search).get('world') ?? 'meadow');
    if (preview === 'choose')
    {
      session.word.tiles.forEach((_, i) => session.heard.add(i));
      session.choices = pickChoices(session.word, session.world.words, Math.random);
      session.phase = 'choose';
      refreshPlay();
    }
  }
  else if (preview === 'collection')
  {
    renderCollection();
  }
  else if (preview === 'pack')
  {
    renderHome();
    showPacks();
  }
  else if (preview === 'parent')
  {
    renderParent();
  }
  else
  {
    renderStart();
  }
}
else
{
  renderStart();
}
