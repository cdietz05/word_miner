// The game: every screen, and what happens when it's tapped.
//
// Screens are drawn with innerHTML and one click handler per screen that
// reads data-action off whatever was tapped. The rules - what a word earns,
// when a region opens, which critter turns up, when a buddy grows - live in
// progress.js, phonics.js and critters.js; this file only calls them and
// shows the result.

import { SOUND_KEYS, RECORD_ONLY, SOUND_HINTS, WORLDS, playableWords, pickChoices } from './phonics.js';
import * as progress from './progress.js';
import { CRITTERS, STARTERS, TYPES, critterById, wildEncounter } from './critters.js';
import { Sounds, say, wait, configureVoice, deviceVoices } from './audio.js';
import { VOICE_SPELLINGS } from './voice_sounds.js';
import { SPEEDS, LETTER_SOUNDS, englishVoices, chooseVoice, speechRate, loadSettings, saveSettings } from './settings.js';
import { loadRecordings, saveRecording, deleteRecording, startRecording } from './recorder.js';
import { cardHtml, critterPicture } from './cards.js';
import { orbSvg } from './orb.js';
import { grownUpQuestion } from './gate.js';

const app = document.getElementById('app');
const overlay = document.getElementById('overlay');
const sounds = new Sounds();

let state = progress.load(localStorage);
let settings = loadSettings(localStorage);
let session = null;
// Off only in preview mode (see the bottom of this file), whose made-up
// progress must never overwrite his real progress.
let saving = true;
let idleTimer = null;

// The first few rounds of a visit say what to do; after that he knows.
const TALKATIVE_ROUNDS = 3;
const IDLE_HINT_MS = 9000;

// Each region's sky, top to bottom, and the letters on its tile on the map.
const SCENES = {
  meadow: ['#5fb8ff', '#c9f29b'],
  forest: ['#2f6b4f', '#9fd08a'],
  desert: ['#f0a04b', '#ffe3a3'],
  snow: ['#8fbfe8', '#f2f9ff'],
  caves: ['#2a2150', '#6a58b0'],
  jungle: ['#1f7a6a', '#9fe0b0'],
  volcano: ['#3a0d18', '#d4562a'],
  sky: ['#6ab0ff', '#fff0c9'],
  night: ['#1b2340', '#3a3f7a'],
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

function applySettings(next)
{
  settings = next;
  configureVoice({ voiceURI: settings.voice, rate: speechRate(settings) });
  sounds.source = settings.letterSounds;
  if (saving)
  {
    saveSettings(localStorage, settings);
  }
}

function commit(next)
{
  state = next;
  if (saving)
  {
    progress.save(localStorage, state);
  }
}

function setScene(scene)
{
  const [top, bottom] = SCENES[scene] ?? SCENES.meadow;
  document.documentElement.style.setProperty('--sky-top', top);
  document.documentElement.style.setProperty('--sky-bottom', bottom);
}

function sceneBackground(scene)
{
  const [top, bottom] = SCENES[scene] ?? SCENES.meadow;
  return `linear-gradient(${top}, ${bottom})`;
}

function clearIdle()
{
  if (idleTimer)
  {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function closeOverlay()
{
  overlay.onclick = null;
  overlay.hidden = true;
  overlay.innerHTML = '';
}

// --- start ---------------------------------------------------------------------

// Sound on the iPad can only start from a tap, so the game opens on one big
// button; tapping it unlocks the sound and loads the letter sounds.
function renderStart()
{
  setScene('meadow');
  app.innerHTML = `
    <div class="start">
      <div>
        <h1 class="title">WORD<br>CATCHER</h1>
        <div class="hero">${STARTERS.map((id) => critterPicture(critterById(id))).join('')}</div>
        <div><button class="pill go play-button" data-action="begin">▶ PLAY</button></div>
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
    event.target.closest('button').textContent = '...';
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
    if (state.buddy)
    {
      renderHome();
      say('Welcome back, catcher! Where shall we explore?');
    }
    else
    {
      renderStarters();
    }
  };
}

// --- his first critter ---------------------------------------------------------

// Three babies to pick from, the way every critter adventure starts. The
// one he picks is his first catch and his buddy.
function renderStarters()
{
  clearIdle();
  setScene('meadow');
  let chosen = null;
  app.innerHTML = `
    <div class="starters">
      <div class="overlay-text">Pick your first critter!</div>
      <div class="starter-row">
        ${STARTERS.map((id) => `<button class="starter" data-action="starter" data-id="${id}" aria-label="${critterById(id).name}">${critterPicture(critterById(id))}</button>`).join('')}
      </div>
      <div class="starter-name" id="starter-name"></div>
      <div id="starter-go"></div>
    </div>`;
  say('Pick your first critter! Tap one to meet it.');
  app.onclick = async (event) =>
  {
    const target = event.target.closest('[data-action]');
    if (!target)
    {
      return;
    }
    sounds.unlock();
    if (target.dataset.action === 'starter')
    {
      chosen = critterById(target.dataset.id);
      app.querySelectorAll('.starter').forEach((button) => button.classList.toggle('chosen', button === target));
      document.getElementById('starter-name').textContent = `${chosen.name} ${TYPES[chosen.type].icon}`;
      document.getElementById('starter-go').innerHTML = `<button class="pill go" data-action="pick">✓ Pick ${chosen.name}</button>`;
      sounds.tap();
      say(`${chosen.name}, the ${TYPES[chosen.type].label.toLowerCase()} critter!`);
    }
    else if (target.dataset.action === 'pick' && chosen)
    {
      app.onclick = null;
      const caught = progress.catchCritter(state, chosen.id);
      commit(progress.chooseBuddy(caught.state, chosen.id));
      sounds.fanfare();
      confetti();
      await showCardReveal(chosen, {
        isNew: caught.isNew,
        holo: caught.holo,
        line: `${chosen.name} is your buddy!`,
        speech: `${chosen.name} is your buddy! Read words together and ${chosen.name} will grow.`,
      });
      // showCardReveal leaves the card up for whoever called it to take
      // down - here, nothing comes after it.
      closeOverlay();
      renderHome();
      say('Pick a place to explore!');
    }
  };
}

// --- home: the region map -------------------------------------------------------

function renderHome()
{
  clearIdle();
  app.onchange = null;
  session = null;
  setScene('meadow');
  const available = sounds.available();
  const open = progress.unlockedWorldIds(state, available);
  const waiting = progress.encountersWaiting(state);
  const book = progress.bookCounts(state);

  app.innerHTML = `
    <div class="topbar">
      <span class="screen-title">WORD CATCHER</span>
      <span class="spacer"></span>
      ${state.holoCharged ? '<span class="holo-charge">✨ HOLO READY</span>' : ''}
      <button class="icon-button" data-action="grown-ups" aria-label="Grown-ups">⚙️</button>
    </div>
    <div class="home-body">
      ${buddyPanel()}
      <div class="home-actions">
        ${waiting > 0 ? `<button class="pill wild wild-ready" data-action="encounter">❗ Wild critter!${waiting > 1 ? ` (${waiting})` : ''}</button>` : ''}
        <button class="pill" data-action="book">📖 Critter Book ${book.caught} / ${book.total}</button>
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
        say('Finish the place before this one to open it!');
        return;
      }
      startWorld(target.dataset.world);
    }
    else if (action === 'book')
    {
      renderBook();
    }
    else if (action === 'encounter')
    {
      await showEncounters([]);
      renderHome();
    }
    else if (action === 'buddy')
    {
      const growth = progress.buddyGrowth(state);
      if (growth)
      {
        sounds.tap();
        say(growth.needed === null
          ? `${growth.critter.name} is all grown up!`
          : `Read words to help ${growth.critter.name} grow!`);
      }
    }
    else if (action === 'grown-ups')
    {
      showGrownUpGate();
    }
    else if (action === 'starters')
    {
      renderStarters();
    }
  };
}

// His buddy, how far it's grown, and a glimpse of what it grows into - a
// shadow, until he's seen it.
function buddyPanel()
{
  const growth = progress.buddyGrowth(state);
  if (!growth)
  {
    return `
      <div class="buddy-panel">
        <div class="buddy-info">
          <div class="buddy-name">No buddy yet!</div>
          <button class="pill go" data-action="starters">Pick your first critter</button>
        </div>
      </div>`;
  }
  const { critter, xp, needed } = growth;
  let note = 'All grown up! 💪';
  let percent = 100;
  if (needed !== null)
  {
    const next = critterById(critter.evolvesTo);
    const seen = (state.caught[next.id] ?? 0) > 0;
    percent = Math.min(100, Math.round((xp / needed) * 100));
    const left = needed - xp;
    note = `${critterPicture(next, { silhouette: !seen })} Grows in ${left} word${left === 1 ? '' : 's'}!`;
  }
  return `
    <div class="buddy-panel">
      <button class="buddy-art" data-action="buddy" aria-label="${critter.name}">${critterPicture(critter)}</button>
      <div class="buddy-info">
        <div class="buddy-name">${critter.name} <small>${TYPES[critter.type].icon} your buddy</small></div>
        <div class="grow-bar"><span style="width: ${percent}%"></span></div>
        <div class="grow-note">${note}</div>
      </div>
    </div>`;
}

function worldTile(world, isOpen, available)
{
  const learned = progress.wordsLearned(state, world, available);
  const goal = progress.worldGoal(world, available);
  const complete = learned >= goal;
  const percent = goal > 0 ? Math.round((learned / goal) * 100) : 0;
  const local = CRITTERS.find((critter) => critter.type === world.critterTypes[0] && critter.stage === 1);
  return `
    <button class="world ${isOpen ? '' : 'locked'}" data-action="world" data-world="${world.id}"
      style="background: ${sceneBackground(world.scene)}" aria-label="${world.name}">
      <span class="peek">${critterPicture(local)}</span>
      ${complete ? '<span class="done">🏅</span>' : ''}
      <span class="focus">${MAP_LETTERS[world.id]}</span>
      <span class="name">${world.name}</span>
      ${isOpen ? `<span class="bar"><span style="width: ${percent}%"></span></span>` : ''}
    </button>`;
}

// The grown-ups' corner is behind a times-table question (see gate.js):
// the answer typed on a number pad, a wrong one swapped for a new question.
function showGrownUpGate()
{
  let question = grownUpQuestion(Math.random);
  let typed = '';
  overlay.hidden = false;
  const draw = (wrong = false) =>
  {
    overlay.innerHTML = `
      <div class="gate ${wrong ? 'shake-once' : ''}">
        <div class="overlay-text">GROWN-UPS ONLY</div>
        <div class="gate-question">${question.text} = <span class="gate-answer">${typed || '?'}</span></div>
        <div class="keypad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => `<button class="key" data-key="${digit}">${digit}</button>`).join('')}
          <button class="key" data-key="back" aria-label="Delete">⌫</button>
          <button class="key" data-key="0">0</button>
          <button class="key go" data-key="go" aria-label="Enter">✓</button>
        </div>
        <button class="pill" data-key="cancel">Back to the game</button>
      </div>`;
  };
  draw();
  overlay.onclick = (event) =>
  {
    const key = event.target.closest('[data-key]')?.dataset.key;
    if (!key)
    {
      return;
    }
    if (key === 'cancel')
    {
      closeOverlay();
      return;
    }
    if (key === 'back')
    {
      typed = typed.slice(0, -1);
      draw();
      return;
    }
    if (key === 'go')
    {
      if (Number(typed) === question.answer)
      {
        closeOverlay();
        renderParent();
        return;
      }
      question = grownUpQuestion(Math.random);
      typed = '';
      draw(true);
      return;
    }
    if (typed.length < 3)
    {
      typed += key;
      draw();
    }
  };
}

// --- play --------------------------------------------------------------------

function startWorld(worldId)
{
  const world = WORLDS.find((candidate) => candidate.id === worldId);
  session = { world, previous: null, rounds: 0 };
  setScene(world.scene);
  nextRound();
  if (world.id === 'sky')
  {
    say('In this place, the e at the end is magic. It is quiet, and it makes the other vowel say its name!');
  }
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
    say('Tap each letter to hear its sound.');
  }
  armIdleHint();
}

// Nothing tapped for a while: point at the next letter and say so, once.
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
      say('Tap the glowing letter!');
    }
    else if (session.phase === 'blend')
    {
      say('Tap Blend to hear all the sounds!');
    }
    else if (session.phase === 'choose')
    {
      say('Say the sounds fast, then tap the picture. Tap the speaker to hear the sounds again.');
    }
  }, IDLE_HINT_MS);
}

function orbMeter()
{
  return Array.from({ length: progress.ORBS_PER_ENCOUNTER }, (_, i) => (i < state.orbs
    ? `<span class="slot full">${orbSvg()}</span>`
    : '<span class="slot"></span>')).join('');
}

function renderPlay()
{
  const { world, word } = session;
  const available = sounds.available();
  const learned = progress.wordsLearned(state, world, available);
  const goal = progress.worldGoal(world, available);
  const percent = goal > 0 ? Math.min(100, Math.round((learned / goal) * 100)) : 0;
  const buddy = state.buddy ? critterById(state.buddy) : null;

  app.innerHTML = `
    <div class="topbar">
      <button class="icon-button" data-action="home" aria-label="Map">🏠</button>
      <div class="world-progress" aria-label="Progress in this place"><span style="width: ${percent}%"></span></div>
      <span class="spacer"></span>
      <span id="holo-slot">${state.holoCharged ? '<span class="holo-charge">✨ HOLO</span>' : ''}</span>
      <div class="orb-meter" id="orb-meter" aria-label="Orbs until the next wild critter">${orbMeter()}</div>
    </div>
    <div class="play" id="play">
      <div class="word-row" id="word-row">
        ${word.tiles.map((tile, i) => tileHtml(tile, i)).join('')}
        <div class="reveal">${word.picture}</div>
      </div>
      <div class="actions" id="actions">${actionsHtml()}</div>
      ${buddy ? `<div class="play-buddy" id="play-buddy">${critterPicture(buddy)}</div>` : ''}
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
      onTile(Number(target.dataset.index));
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
  // Where this letter flies when the word bursts.
  const dx = `${Math.round((index - (session.word.tiles.length - 1) / 2) * 40 + (Math.random() * 30 - 15))}vw`;
  const spin = `${Math.round(Math.random() * 360 - 180)}deg`;
  return `
    <button class="${classes.join(' ')}" data-action="tile" data-index="${index}" style="--dx: ${dx}; --spin: ${spin}">
      <span class="letter">${tile.text}</span>
    </button>`;
}

function actionsHtml()
{
  const replay = '<button class="icon-button" data-action="replay" aria-label="Hear the sounds again">🔊</button>';
  if (session.phase === 'blend')
  {
    return `${replay}<button class="pill gold blend-button" data-action="blend">✨ Blend!</button>`;
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
  sounds.tap();
  const element = document.querySelector(`.tile[data-index="${index}"]`);
  element?.classList.add('pop');
  setTimeout(() => element?.classList.remove('pop'), 180);
  if (tile.sound === null)
  {
    sounds.chime();
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
    // Any letter can be heard again once they all have been.
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
      setTimeout(() => say('Now tap Blend to hear all the sounds!'), 600);
    }
  }
  refreshPlay();
}

// The word's sounds, each once, slowly and clearly, left to right, each
// letter lighting up as its sound plays - the way a finger slides under a
// word being sounded out. Putting them together is his job: the letter
// recordings are never run together, since stitched-up sounds can't flow
// like a real word. The real word comes from the voice, once he's picked
// (see onChoice).
async function soundOut(word)
{
  for (let index = 0; index < word.tiles.length; index++)
  {
    const tile = word.tiles[index];
    const element = document.querySelector(`.tile[data-index="${index}"]`);
    element?.classList.add('sounding');
    if (tile.sound === null)
    {
      await wait(350);
    }
    else
    {
      await sounds.play(tile.sound);
      await wait(350);
    }
    element?.classList.remove('sounding');
  }
}

async function onBlend()
{
  if (session.busy)
  {
    return;
  }
  session.busy = true;
  await soundOut(session.word);
  session.choices = pickChoices(session.word, session.world.words, Math.random);
  session.phase = 'choose';
  session.busy = false;
  refreshPlay();
  if (session.rounds < TALKATIVE_ROUNDS)
  {
    say('Now say the sounds fast. Which picture is it?');
  }
}

async function replaySounds()
{
  if (session.busy)
  {
    return;
  }
  session.busy = true;
  await soundOut(session.word);
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
      await say('Not quite. Listen again, and say them fast.');
      await soundOut(word);
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
  sounds.burst();
  floatOrb();
  cheer();
  await say(`${word.word}!`);

  if (result.holoCharged)
  {
    banner(`${progress.HOLO_STREAK} IN A ROW! ✨ HOLO READY`);
    sounds.sparkle();
    await say(`${progress.HOLO_STREAK} in a row! The next critter you catch will be a shiny holo card!`);
  }

  const reward = progress.claimWorldReward(state, world, sounds.available());
  if (reward.claimed)
  {
    commit(reward.state);
    sounds.fanfare();
    confetti();
    banner(`🏅 ${world.name.toUpperCase()} BADGE!`);
    const last = WORLDS[WORLDS.length - 1].id === world.id;
    await say(last
      ? `Amazing! You finished ${world.name}! You're a master catcher! A special critter is coming!`
      : `Amazing! You finished ${world.name}! You got a badge, a new place is open, and a special critter is coming!`);
  }

  await wait(600);
  if (result.evolution)
  {
    await showEvolution(critterById(result.evolution.from), critterById(result.evolution.to));
  }
  if (result.encounterReady || reward.claimed)
  {
    await showEncounters(world.critterTypes);
  }
  if (session !== round)
  {
    return;
  }
  session.previous = word.word;
  session.rounds += 1;
  setScene(world.scene);
  nextRound();
}

function floatOrb()
{
  const play = document.getElementById('play');
  if (!play)
  {
    return;
  }
  const float = document.createElement('div');
  float.className = 'float-orb';
  float.innerHTML = orbSvg();
  play.appendChild(float);
  setTimeout(() => float.remove(), 1400);
  sounds.chime();
  const meter = document.getElementById('orb-meter');
  if (meter)
  {
    meter.innerHTML = orbMeter();
  }
  const holo = document.getElementById('holo-slot');
  if (holo)
  {
    holo.innerHTML = state.holoCharged ? '<span class="holo-charge">✨ HOLO</span>' : '';
  }
}

function cheer()
{
  const buddy = document.getElementById('play-buddy');
  if (!buddy)
  {
    return;
  }
  buddy.classList.remove('cheer');
  void buddy.offsetWidth;
  buddy.classList.add('cheer');
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
  const colors = ['#ffd23f', '#5ff2e0', '#4fd66a', '#ff5d8f', '#7fbcff', '#b7a4ff'];
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

// --- wild encounters --------------------------------------------------------------

// Every waiting wild critter, one after another; resolves when he's caught
// them all. [homeTypes] are the kinds at home where he's reading.
async function showEncounters(homeTypes)
{
  while (progress.encountersWaiting(state) > 0)
  {
    const spent = progress.spendEncounter(state);
    commit(spent.state);
    await runEncounter(spent.kind === 'special', homeTypes);
  }
  closeOverlay();
}

// One encounter: the critter appears, he taps the orb to throw it, it
// rocks three times, and click - caught. Always caught: this is his reward,
// not a test.
function runEncounter(special, homeTypes)
{
  return new Promise((resolve) =>
  {
    const critter = wildEncounter(state.caught, Math.random, { homeTypes, special });
    const legendary = critter.rarity === 'legendary';
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="overlay-text">${legendary ? '⚡ A LEGENDARY critter! ⚡' : special ? '🏅 A special critter!' : `A wild ${critter.name}!`}</div>
      <div class="encounter ${special || legendary ? 'special' : ''}" id="encounter">
        <div class="ground"></div>
        <div class="wild" id="wild">${critterPicture(critter)}</div>
        <button class="throw-orb" id="throw" aria-label="Throw the orb">${orbSvg({ lit: state.holoCharged })}</button>
      </div>
      <div class="overlay-text" id="encounter-hint">${state.holoCharged ? '✨ Holo orb! ✨ ' : ''}Tap the orb!</div>`;
    if (legendary)
    {
      sounds.fanfare();
    }
    else
    {
      sounds.sparkle();
    }
    say(legendary
      ? `Whoa! It's ${critter.name}, a legendary critter! Tap the orb to catch it!`
      : `A wild ${critter.name} appeared! Tap the orb to catch it!`);

    const orb = document.getElementById('throw');
    orb.onclick = async () =>
    {
      orb.onclick = null;
      sounds.unlock();
      document.getElementById('encounter-hint').textContent = '';
      orb.classList.add('thrown');
      sounds.whoosh();
      await wait(600);
      const encounter = document.getElementById('encounter');
      encounter.insertAdjacentHTML('beforeend', '<div class="catch-flash"></div>');
      document.getElementById('wild').classList.add('caught');
      orb.classList.remove('thrown');
      orb.classList.add('landed');
      await wait(700);
      for (let i = 0; i < 3; i++)
      {
        orb.classList.remove('wobble');
        void orb.offsetWidth;
        orb.classList.add('wobble');
        sounds.wobble();
        await wait(850);
      }
      orb.classList.remove('wobble');
      orb.classList.add('shut');
      sounds.click();
      await wait(300);
      const caught = progress.catchCritter(state, critter.id);
      commit(caught.state);
      sounds.fanfare();
      confetti();
      await showCardReveal(critter, {
        isNew: caught.isNew || caught.isNewHolo,
        holo: caught.holo,
        line: `Gotcha! You caught ${critter.name}!`,
        speech: caught.holo
          ? `Gotcha! You caught ${critter.name}, on a shiny holo card!`
          : caught.isNew ? `Gotcha! You caught ${critter.name}! A new one for your book!` : `Gotcha! Another ${critter.name}!`,
        more: progress.encountersWaiting(state) > 0,
      });
      resolve();
    };
  });
}

// A card, big and tiltable, with a line above it; resolves on the button.
// The card is still up when it resolves - so a run of catches doesn't
// flash the screen behind between them - and the caller must close the
// overlay (closeOverlay) once it has nothing more to show there.
function showCardReveal(critter, { isNew = false, holo = false, line, speech, more = false })
{
  return new Promise((resolve) =>
  {
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="overlay-text">${line}</div>
      <div class="flip-in">${cardHtml(critter, { big: true, isNew, holo })}</div>
      <div class="overlay-buttons">
        <button class="pill ${more ? 'wild' : 'go'}" data-action="done">${more ? '❗ Next wild critter' : '▶ Keep going!'}</button>
      </div>`;
    tiltable(overlay.querySelector('.card.big'));
    sounds.sparkle();
    say(speech);
    overlay.onclick = (event) =>
    {
      if (event.target.closest('[data-action="done"]'))
      {
        overlay.onclick = null;
        resolve();
      }
    };
  });
}

// --- evolving ---------------------------------------------------------------------

// His buddy grows: "What? It's evolving!", the two forms flicker in white
// faster and faster, a flash, and there's the new one. Then its card.
async function showEvolution(from, to)
{
  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="overlay-text" id="evolve-text">What? ${from.name} is evolving!</div>
    <div class="evolve-stage" id="evolve-stage">
      <div class="form old">${critterPicture(from)}</div>
      <div class="form new hidden">${critterPicture(to)}</div>
    </div>`;
  const stage = document.getElementById('evolve-stage');
  const oldForm = stage.querySelector('.form.old');
  const newForm = stage.querySelector('.form.new');
  await say(`What? ${from.name} is evolving!`);
  stage.classList.add('flicker');
  sounds.shimmer(3);
  let gap = 420;
  let showingNew = false;
  while (gap > 60)
  {
    showingNew = !showingNew;
    oldForm.classList.toggle('hidden', showingNew);
    newForm.classList.toggle('hidden', !showingNew);
    await wait(gap);
    gap *= 0.8;
  }
  oldForm.classList.add('hidden');
  newForm.classList.remove('hidden');
  overlay.insertAdjacentHTML('beforeend', '<div class="catch-flash"></div>');
  stage.classList.remove('flicker');
  stage.classList.add('done');
  sounds.fanfare();
  confetti();
  document.getElementById('evolve-text').textContent = `${from.name} evolved into ${to.name}!`;
  await say(`${from.name} evolved into ${to.name}!`);
  await wait(500);
  await showCardReveal(to, {
    isNew: (state.caught[to.id] ?? 0) === 1,
    line: `${to.name} is your buddy now!`,
    speech: `${to.name}! ${to.move}!`,
  });
  closeOverlay();
}

// A big card follows his finger: it tilts toward it, and on a foil card the
// foil's rainbow and sparkle slide with it, the way a real one catches the
// light as it's turned. Let go and it settles back, and the foil goes back
// to drifting on its own.
function tiltable(card)
{
  if (!card)
  {
    return;
  }
  const move = (event) =>
  {
    const box = card.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    card.classList.add('touching');
    card.style.setProperty('--foil-x', `${Math.round(x * 100)}%`);
    card.style.setProperty('--foil-y', `${Math.round(y * 100)}%`);
    card.style.transform = `perspective(900px) rotateY(${((x - 0.5) * 24).toFixed(1)}deg) rotateX(${((0.5 - y) * 24).toFixed(1)}deg)`;
  };
  const settle = () =>
  {
    card.classList.remove('touching');
    card.style.transform = '';
  };
  card.addEventListener('pointerdown', move);
  card.addEventListener('pointermove', move);
  card.addEventListener('pointerup', settle);
  card.addEventListener('pointerleave', settle);
  card.addEventListener('pointercancel', settle);
}

// --- the Critter Book ---------------------------------------------------------------

// Every critter, line by line - baby, middle, final - then the legendaries,
// then a holo slot for each.
function renderBook()
{
  clearIdle();
  setScene('night');
  const book = progress.bookCounts(state);
  const lines = CRITTERS.filter((critter) => critter.rarity !== 'legendary');
  const legendaries = CRITTERS.filter((critter) => critter.rarity === 'legendary');
  const slot = (critter, holo) =>
  {
    const count = holo ? state.holo[critter.id] ?? 0 : state.caught[critter.id] ?? 0;
    const isBuddy = !holo && state.buddy === critter.id;
    return `<button class="${isBuddy ? 'buddy-mark' : ''}" data-action="card" data-id="${critter.id}" data-holo="${holo ? 1 : 0}">${cardHtml(critter, { count, unknown: count === 0, holo })}</button>`;
  };
  app.innerHTML = `
    <div class="topbar">
      <button class="icon-button" data-action="home" aria-label="Map">🏠</button>
      <span class="screen-title">CRITTER BOOK ${book.caught} / ${book.total}</span>
      <span class="spacer"></span>
    </div>
    <div class="book-body">
      <div class="book-grid">${lines.map((critter) => slot(critter, false)).join('')}</div>
      <h2>⚡ Legendary</h2>
      <div class="book-grid">${legendaries.map((critter) => slot(critter, false)).join('')}</div>
      <h2>✨ Holo cards ${book.holo} / ${book.total}</h2>
      <div class="book-grid">${CRITTERS.map((critter) => slot(critter, true)).join('')}</div>
    </div>`;
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
    const holo = target.dataset.holo === '1';
    const owned = holo ? state.holo[critter.id] ?? 0 : state.caught[critter.id] ?? 0;
    if (owned === 0)
    {
      if (holo)
      {
        say('Read three words in a row right the first time, and your next catch will be a holo card!');
      }
      else if (critter.evolvesFrom)
      {
        say(`Help ${critterById(critter.evolvesFrom).name} grow to find this one!`);
      }
      else if (critter.rarity === 'legendary')
      {
        say('A legendary critter! It hardly ever shows up. Keep reading!');
      }
      else
      {
        say('Catch this one in the wild!');
      }
      return;
    }
    showBigCard(critter, holo);
  };
}

function showBigCard(critter, holo = false)
{
  const isBuddy = state.buddy === critter.id;
  overlay.hidden = false;
  overlay.innerHTML = `
    ${cardHtml(critter, { big: true, holo, count: holo ? state.holo[critter.id] : state.caught[critter.id] })}
    <div class="overlay-buttons">
      ${isBuddy ? '' : `<button class="pill gold" data-action="buddy">⭐ Make ${critter.name} my buddy</button>`}
      <button class="pill" data-action="close">Close</button>
    </div>`;
  tiltable(overlay.querySelector('.card.big'));
  say(`${critter.name}. ${critter.move}!`);
  overlay.onclick = (event) =>
  {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close')
    {
      closeOverlay();
    }
    else if (action === 'buddy')
    {
      commit(progress.chooseBuddy(state, critter.id));
      closeOverlay();
      sounds.fanfare();
      say(`${critter.name} is your buddy now!`);
      renderBook();
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
  setScene('night');
  const available = sounds.available();
  const totalRight = Object.values(state.words).reduce((sum, stats) => sum + stats.right, 0);
  const wordsRead = Object.values(state.words).filter((stats) => stats.right > 0).length;
  const trouble = progress.troubleWords(state);
  const book = progress.bookCounts(state);

  app.innerHTML = `
    <div class="topbar">
      <button class="icon-button" data-action="home" aria-label="Back to the game">🏠</button>
      <span class="screen-title">GROWN-UPS</span>
    </div>
    <div class="parent">
      <h2>How it works</h2>
      <p>He taps each letter to hear its sound, taps Blend to hear them all again in a row, says them fast himself,
      then picks the picture that matches - and the voice says the word. Every word read right earns a Catch Orb; five orbs and a wild critter appears to catch. His buddy
      critter grows with every word and evolves twice, into bigger and fiercer forms. Three words in a row right the
      first time makes his next catch a holo card. Reading enough different words in a place earns its badge and
      opens the next one.</p>

      <h2>Letter sounds</h2>
      <p>The game plays these sounds as he taps each letter. It comes with free recordings of all of them except
      <strong>b</strong> - record that one and the words with a b in them join the game. You can record over any
      sound you'd like in your own voice: tap Record, say just the sound (<em>"b"</em>, not <em>"buh"</em> - as short
      as you can), and tap Stop. It trims the silence itself.</p>
      <p id="letter-sounds">Letter sounds come from:
        ${Object.entries(LETTER_SOUNDS).map(([key, option]) => `<button class="small-button ${settings.letterSounds === key ? 'chosen' : ''}" data-action="letter-sounds" data-source="${key}">${option.label}</button>`).join(' ')}
      </p>
      <p>${settings.letterSounds === 'voice'
        ? `The iPad's voice reads a spelling for each sound (tap ▶ to hear one). Sounds you can hold, like <em>m</em>
          and <em>s</em>, come out clean; the others, like <em>b</em> and <em>t</em>, come out with an "uh" after them
          ("buh"). It can't say the <em>i</em> in <em>pig</em> at all, so that one stays a recording. Your own
          recordings are always used first.`
        : 'Recordings of a real voice saying each sound. Your own recordings are always used first.'}</p>
      <div class="sound-list">
        ${SOUND_KEYS.map((key) => soundRow(key, available)).join('')}
      </div>

      <h2 id="voice">Voice</h2>
      <p>The voice that reads the instructions and words aloud. (The letter sounds above are recordings, so they
      stay the same.) These are the voices on this iPad; more can be downloaded in the iPad's Settings, under
      Accessibility, Spoken Content, Voices.</p>
      ${voiceControls()}

      <h2>How he's doing</h2>
      <div class="stat-grid">
        <div class="stat">Words read right: <strong>${totalRight}</strong></div>
        <div class="stat">Different words: <strong>${wordsRead}</strong></div>
        <div class="stat">Best streak: <strong>${state.bestStreak}</strong></div>
        <div class="stat">Critters: <strong>${book.caught} / ${book.total}</strong>, holo <strong>${book.holo}</strong></div>
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
      for the game. Fonts: Andika (SIL) and Fredoka (Milena Brandão), both under the SIL Open Font License.
      Everything else - the critters, orbs and words - was made for this game.</p>
    </div>`;

  app.onchange = (event) =>
  {
    if (event.target.dataset.setting === 'voice')
    {
      applySettings({ ...settings, voice: event.target.value });
      say("Hi, catcher! Let's read some words!");
    }
  };
  // The voice list can arrive a moment after the page loads.
  if ('speechSynthesis' in window && englishVoices(deviceVoices()).length === 0)
  {
    window.speechSynthesis.onvoiceschanged = () =>
    {
      window.speechSynthesis.onvoiceschanged = null;
      if (app.querySelector('.parent'))
      {
        renderParent();
      }
    };
  }

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
      if (state.buddy)
      {
        renderHome();
      }
      else
      {
        renderStarters();
      }
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
    else if (action === 'test-voice')
    {
      say("Hi, catcher! Let's read some words!");
    }
    else if (action === 'letter-sounds')
    {
      applySettings({ ...settings, letterSounds: target.dataset.source });
      renderParent();
      setTimeout(() => document.getElementById('letter-sounds')?.scrollIntoView(), 50);
    }
    else if (action === 'speed')
    {
      applySettings({ ...settings, speed: target.dataset.speed });
      renderParent();
      say("Let's read some words!");
    }
    else if (action === 'reset')
    {
      if (window.confirm('Reset all progress - words, critters and badges? This cannot be undone.'))
      {
        commit(progress.initialState());
        renderParent();
      }
    }
  };
}

function voiceControls()
{
  const voices = englishVoices(deviceVoices());
  if (voices.length === 0)
  {
    return '<p><em>This device has no English voices to choose from.</em></p>';
  }
  const current = chooseVoice(deviceVoices(), settings.voice);
  return `
    <div class="voice-controls">
      <select class="voice-select" data-setting="voice" aria-label="Voice">
        ${voices.map((voice) => `<option value="${voice.voiceURI}" ${current && voice.voiceURI === current.voiceURI ? 'selected' : ''}>${voice.name} (${voice.lang})</option>`).join('')}
      </select>
      <button class="small-button" data-action="test-voice">▶ Test</button>
    </div>
    <p>Speed:
      ${Object.entries(SPEEDS).map(([key, speed]) => `<button class="small-button ${settings.speed === key ? 'chosen' : ''}" data-action="speed" data-speed="${key}">${speed.label}</button>`).join(' ')}
    </p>`;
}

function soundRow(key, available)
{
  const recorded = sounds.hasRecording(key);
  const has = available.has(key);
  const needed = !has && RECORD_ONLY.includes(key);
  const from = has ? sounds.sourceOf(key) : null;
  let status = needed ? 'Needed - record it to add its words' : 'Missing';
  if (from === 'recorded')
  {
    status = 'Your recording';
  }
  else if (from === 'voice')
  {
    status = `The iPad's voice, reading "${VOICE_SPELLINGS[key]}"`;
  }
  else if (from === 'bundled')
  {
    status = settings.letterSounds === 'voice' ? "Built in - the voice can't say this one" : 'Built in';
  }
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
    window.alert("The microphone isn't available. Check that Word Catcher is allowed to use it in Settings.");
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
configureVoice({ voiceURI: settings.voice, rate: speechRate(settings) });
sounds.source = settings.letterSounds;
// Checking a screen's layout on a device or simulator, without playing
// through to it: ?preview=home, starters, play, choose, book, encounter
// (&throw=1), evolve, gate, card (&id= a critter, &holo=1) or parent (&section=voice)
// opens straight on that screen with made-up progress that is never saved,
// and shows any error on screen. Nothing in the game links here.
const params = new URLSearchParams(window.location.search);
const preview = params.get('preview');
if (preview)
{
  window.addEventListener('error', (event) =>
  {
    document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;bottom:0;left:0;right:0;background:#b00;color:#fff;z-index:99;margin:0;padding:8px;white-space:pre-wrap">${event.message}\n${event.filename}:${event.lineno}</pre>`);
  });
  saving = false;
  // The letter sounds aren't loaded without the start button's tap; the
  // screens only need to know which there would be, so each gets a stand-in
  // with no sound in it.
  for (const key of SOUND_KEYS.filter((sound) => !RECORD_ONLY.includes(sound)))
  {
    sounds.buffers.set(key, null);
  }
  let sample = progress.initialState();
  for (const id of ['budlet', 'emberkit', 'splashy', 'zippy', 'glimmer', 'cloudlet', 'glacior'])
  {
    sample = progress.catchCritter(sample, id).state;
  }
  sample.holoCharged = true;
  sample = progress.catchCritter(sample, 'emberkit').state;
  sample = progress.chooseBuddy(sample, 'budlet');
  for (const word of WORLDS[0].words.slice(0, 7))
  {
    sample = progress.recordAnswer(sample, word.word, { correct: true, firstTry: true }).state;
  }
  sample.encounters = 1;
  state = sample;
  if (preview === 'home')
  {
    renderHome();
  }
  else if (preview === 'starters')
  {
    renderStarters();
  }
  else if (preview === 'play' || preview === 'choose')
  {
    startWorld(params.get('world') ?? 'meadow');
    if (preview === 'choose')
    {
      session.word.tiles.forEach((_, i) => session.heard.add(i));
      session.choices = pickChoices(session.word, session.world.words, Math.random);
      session.phase = 'choose';
      refreshPlay();
    }
  }
  else if (preview === 'book' || preview === 'collection')
  {
    renderBook();
  }
  else if (preview === 'encounter')
  {
    renderHome();
    showEncounters(['grass']);
    // &throw=1 throws the orb too, to see the catch play out.
    if (params.get('throw'))
    {
      setTimeout(() => document.getElementById('throw')?.click(), 1500);
    }
  }
  else if (preview === 'evolve')
  {
    renderHome();
    const from = critterById(params.get('id') ?? 'leafpup');
    showEvolution(critterById(from.evolvesFrom) ?? from, from);
  }
  else if (preview === 'parent')
  {
    renderParent();
    const section = params.get('section');
    if (section)
    {
      setTimeout(() => document.getElementById(section)?.scrollIntoView(), 300);
    }
  }
  else if (preview === 'gate')
  {
    renderHome();
    showGrownUpGate();
  }
  else if (preview === 'card')
  {
    renderBook();
    showBigCard(critterById(params.get('id') ?? 'glacior'), params.get('holo') === '1');
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
