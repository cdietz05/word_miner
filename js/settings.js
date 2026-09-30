// The grown-ups' settings: which voice reads the game aloud, how fast, and
// whether the letter sounds come from the recordings or from that voice
// (see voice_sounds.js).
// Kept apart from his progress, so resetting his progress leaves them alone.
// Pure apart from load / save, which take the storage to use - the voices
// are passed in as plain objects ({ name, lang, voiceURI }), so the tests
// can hand it any list.

export const SPEEDS = {
  slower: { label: 'Slower', rate: 0.72 },
  normal: { label: 'Normal', rate: 0.9 },
};

// Where the letter sounds come from.
export const LETTER_SOUNDS = {
  recordings: { label: 'The recordings' },
  voice: { label: "The iPad's voice" },
};

// The voice used until a grown-up picks one: Samantha, the iPad's own
// friendly US voice, or failing that any US one.
const PREFERRED_VOICE = 'Samantha';

export function defaultSettings()
{
  return { voice: null, speed: 'normal', letterSounds: 'recordings' };
}

// Every English voice on the device, US ones first, each once, by name.
export function englishVoices(voices)
{
  const seen = new Set();
  const english = voices.filter((voice) =>
  {
    if (!voice.lang || !voice.lang.toLowerCase().startsWith('en') || seen.has(voice.voiceURI))
    {
      return false;
    }
    seen.add(voice.voiceURI);
    return true;
  });
  const isUs = (voice) => voice.lang.replace('_', '-').toLowerCase() === 'en-us';
  return english.sort((a, b) =>
  {
    if (isUs(a) !== isUs(b))
    {
      return isUs(a) ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

// The voice to speak with: the one chosen, if the device still has it,
// else the preferred one, else the first English voice. Null when the
// device has no English voice at all - the browser's default is used.
export function chooseVoice(voices, chosenVoiceURI)
{
  const english = englishVoices(voices);
  return english.find((voice) => voice.voiceURI === chosenVoiceURI)
    ?? english.find((voice) => voice.name === PREFERRED_VOICE)
    ?? english[0]
    ?? null;
}

export function speechRate(settings)
{
  return (SPEEDS[settings.speed] ?? SPEEDS.normal).rate;
}

// --- storage ---------------------------------------------------------------

const STORAGE_KEY = 'word_miner_settings';

export function loadSettings(storage)
{
  try
  {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object')
    {
      return defaultSettings();
    }
    return {
      voice: typeof saved.voice === 'string' ? saved.voice : null,
      speed: SPEEDS[saved.speed] ? saved.speed : 'normal',
      letterSounds: LETTER_SOUNDS[saved.letterSounds] ? saved.letterSounds : 'recordings',
    };
  }
  catch (error)
  {
    return defaultSettings();
  }
}

export function saveSettings(storage, settings)
{
  try
  {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
  catch (error)
  {
    // Storage blocked - the setting holds for this visit only.
  }
}
