// Sound: the letter sounds, the little game noises, and the voice that
// reads the instructions aloud (he's learning to read - every instruction
// has to be spoken).
//
// Web Audio rather than <audio> tags: the sounds are loaded once and play
// the instant they're asked for, which sounding out needs - a lag between
// "c" and "a" and "t" pulls the word apart. Safari only lets audio start
// from a tap, so unlock() must be called from the first one.

import { soundSpan } from './trim.js';

export class Sounds
{
  constructor()
  {
    this.context = null;
    this.buffers = new Map();
    this.recorded = new Map();
  }

  // Call from inside a tap. Safe to call on every tap.
  unlock()
  {
    if (!this.context)
    {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextClass();
    }
    if (this.context.state === 'suspended')
    {
      this.context.resume();
    }
  }

  get ready()
  {
    return this.context !== null;
  }

  // Loads the bundled clip for each key; a key that fails to load is just
  // left out (see available()).
  async load(keys)
  {
    this.unlock();
    await Promise.all(keys.map(async (key) =>
    {
      try
      {
        const response = await fetch(`sounds/${key}.m4a`);
        if (!response.ok)
        {
          return;
        }
        const data = await response.arrayBuffer();
        this.buffers.set(key, await this.context.decodeAudioData(data));
      }
      catch (error)
      {
        // Missing or undecodable - the key simply isn't available.
      }
    }));
  }

  // A parent's own recording for [key], played instead of the bundled one.
  // Trimmed to just the sound. False when there was nothing in it.
  async setRecording(key, blob)
  {
    this.unlock();
    const decoded = await this.context.decodeAudioData(await blob.arrayBuffer());
    const samples = decoded.getChannelData(0);
    const span = soundSpan(samples, decoded.sampleRate);
    if (!span)
    {
      return false;
    }
    const [start, end] = span;
    const trimmed = this.context.createBuffer(1, end - start, decoded.sampleRate);
    const out = trimmed.getChannelData(0);
    out.set(samples.subarray(start, end));
    // Fade the edges so nothing clicks, and bring it up to the same level
    // as the bundled sounds.
    const fade = Math.min(Math.round(decoded.sampleRate * 0.03), Math.floor(out.length / 2));
    let peak = 0;
    for (let i = 0; i < out.length; i++)
    {
      peak = Math.max(peak, Math.abs(out[i]));
    }
    const gain = peak > 0 ? 0.8 / peak : 1;
    for (let i = 0; i < out.length; i++)
    {
      let value = out[i] * gain;
      if (i < fade)
      {
        value *= i / fade;
      }
      else if (i >= out.length - fade)
      {
        value *= (out.length - 1 - i) / fade;
      }
      out[i] = value;
    }
    this.recorded.set(key, trimmed);
    return true;
  }

  clearRecording(key)
  {
    this.recorded.delete(key);
  }

  hasRecording(key)
  {
    return this.recorded.has(key);
  }

  // Every sound that can be played right now, bundled or recorded.
  available()
  {
    return new Set([...this.buffers.keys(), ...this.recorded.keys()]);
  }

  // Plays one sound; resolves when it ends.
  play(key, { rate = 1 } = {})
  {
    const buffer = this.recorded.get(key) ?? this.buffers.get(key);
    if (!buffer || !this.context)
    {
      return Promise.resolve();
    }
    return new Promise((resolve) =>
    {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      source.connect(this.context.destination);
      source.onended = resolve;
      source.start();
    });
  }

  // The sounds of a word one after another - with a pause between them
  // for the slow version, run together for the blend.
  async sequence(keys, { gapMs = 350, rate = 1 } = {})
  {
    for (const key of keys)
    {
      if (key === null)
      {
        continue;
      }
      await this.play(key, { rate });
      await wait(gapMs);
    }
  }

  // --- game noises, made on the spot so there are no files to load ---------

  tone(frequency, duration, { type = 'square', volume = 0.12, slideTo = null, delay = 0 } = {})
  {
    if (!this.context)
    {
      return;
    }
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo)
    {
      oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    }
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  noise(duration, { volume = 0.15, delay = 0 } = {})
  {
    if (!this.context)
    {
      return;
    }
    const length = Math.round(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++)
    {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.context.destination);
    source.start(this.context.currentTime + delay);
  }

  // A block cracking under the pickaxe.
  crack()
  {
    this.noise(0.08, { volume: 0.12 });
    this.tone(180, 0.06, { type: 'triangle', volume: 0.1 });
  }

  // A block breaking open.
  shatter()
  {
    this.noise(0.25, { volume: 0.2 });
    this.tone(140, 0.2, { type: 'triangle', volume: 0.12, slideTo: 60 });
  }

  // Right answer: a bright little rising tune.
  correct()
  {
    [523, 659, 784, 1047].forEach((frequency, i) => this.tone(frequency, 0.14, { delay: i * 0.08 }));
  }

  // Wrong answer: soft, not scolding.
  wrong()
  {
    this.tone(220, 0.18, { type: 'triangle', volume: 0.1, slideTo: 180 });
  }

  // Gems landing.
  gem()
  {
    this.tone(1318, 0.08, { volume: 0.08 });
    this.tone(1760, 0.1, { volume: 0.08, delay: 0.06 });
  }

  // A card pack opening.
  sparkle()
  {
    [880, 1175, 1397, 1760, 2093].forEach((frequency, i) => this.tone(frequency, 0.12, { type: 'sine', volume: 0.1, delay: i * 0.06 }));
  }

  // A world finished.
  fanfare()
  {
    [523, 523, 659, 784, 659, 784, 1047].forEach((frequency, i) => this.tone(frequency, 0.18, { delay: i * 0.13 }));
  }
}

// --- the voice -----------------------------------------------------------------

// Reads [text] aloud; resolves when it's done. Safari sometimes never says
// it has finished, so it gives up waiting after a while rather than
// stalling the game.
export function say(text, { rate = 0.9 } = {})
{
  if (!('speechSynthesis' in window))
  {
    return Promise.resolve();
  }
  window.speechSynthesis.cancel();
  return new Promise((resolve) =>
  {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.1;
    const voice = pickVoice();
    if (voice)
    {
      utterance.voice = voice;
    }
    const giveUp = setTimeout(resolve, 1500 + text.length * 90);
    utterance.onend = () =>
    {
      clearTimeout(giveUp);
      resolve();
    };
    utterance.onerror = () =>
    {
      clearTimeout(giveUp);
      resolve();
    };
    window.speechSynthesis.speak(utterance);
  });
}

let chosenVoice = null;

// A friendly US English voice where there is one - Samantha on the iPad.
function pickVoice()
{
  if (chosenVoice)
  {
    return chosenVoice;
  }
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((voice) => voice.lang && voice.lang.startsWith('en'));
  chosenVoice = english.find((voice) => voice.name === 'Samantha')
    ?? english.find((voice) => voice.lang === 'en-US')
    ?? english[0]
    ?? null;
  return chosenVoice;
}

export function wait(ms)
{
  return new Promise((resolve) => setTimeout(resolve, ms));
}
