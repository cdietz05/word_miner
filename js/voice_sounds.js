// Letter sounds from the iPad's own reading voice, as the alternative to
// the recordings (the grown-ups pick which in their corner; see
// settings.js). A reading voice reads words, not sounds, so it can't be
// asked for "the sound of c" - it's given a spelling it reads as that
// sound. Pure, so the tests can check every sound has one.
//
// Each spelling was checked against the Mac's Samantha, the same voice as
// the iPad's default, by measuring what it actually says: a vowel's
// resonances (its first two formants) against the same vowel inside a real
// word, and that each spelling comes out as one sound rather than being
// read letter by letter.
//   - "ahh" matches the a in cat; "ehhh" the e in bed; "ah" the o in hot;
//     "uh" the u in cup. (The obvious "eh" is read as the letter A.)
//   - Magic-e vowels are just the letter names.
//   - Sounds that can be held - m, s, f, n, l, r, v, z, sh - come out clean.
//   - Sounds that can't be held - b, c, d, g, p, t, j, h, w, y, qu, ch, th -
//     only come out with an "uh" after them ("buh"). Phonics teaching tries
//     to avoid that "uh"; a grown-up's own recording of those is better.
//   - The short i of pig has no spelling that works: "ih" is read as the
//     start of "eye", and the rest pick up a y, m or n. null here means the
//     voice can't make the sound, and the recording is used instead.

export const VOICE_SPELLINGS = {
  a: 'ahh', e: 'ehhh', i: null, o: 'ah', u: 'uh',
  a_e: 'A', e_e: 'E', i_e: 'I', o_e: 'O', u_e: 'U',
  b: 'buh', c: 'kuh', d: 'duh', f: 'fff', g: 'guh', h: 'huh', j: 'juh', l: 'lll', m: 'mmm', n: 'nnn',
  p: 'puh', qu: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzzz',
  sh: 'shhh', ch: 'chuh', th: 'thuh', ng: 'ng',
};

// Where each letter sound comes from right now: a grown-up's own recording
// always, if there is one; then, with the voice chosen, the voice, for a
// sound it can make; else the bundled recording. Null when there's none -
// the sound can't be played, and words that need it wait.
export function soundSource(key, { source, bundled, recorded })
{
  if (recorded.has(key))
  {
    return 'recorded';
  }
  if (source === 'voice' && VOICE_SPELLINGS[key])
  {
    return 'voice';
  }
  if (bundled.has(key))
  {
    return 'bundled';
  }
  return null;
}
