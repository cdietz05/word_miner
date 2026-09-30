# Word Catcher

A phonics game for a six-year-old learning to read, built to live on an
iPad's home screen. He sounds out a word letter by letter, blends it, and
picks the matching picture. Every word read right earns a Catch Orb, and five
orbs bring a wild critter to catch. His buddy critter grows with every word,
evolving from a cute baby into a fierce final form.

## How a word is played

1. The word appears as a row of letter stones, one per sound (`c` `a` `t`,
   `sh` `i` `p`, `c` `a` `k` `e`).
2. He taps each letter, left to right, and hears its sound.
3. He taps Blend, and the sounds play again in a row, slowly, each letter
   lighting up as it plays. Then he's asked to say them fast himself -
   blending is the skill he's learning, so the game never does it for him.
   (The letter recordings are never run together: stitched-up sounds can't
   flow like a real word.)
4. He picks the picture that matches from three, and the voice says the word
   the way it's really spoken. After two misses the right picture points
   itself out. Every right answer earns an orb - the point is to keep him
   trying.

Every instruction is spoken aloud, since he's learning to read. The letters
are set in Andika, a typeface designed for early readers.

## Critters

- **His first critter.** He starts by picking one of three babies - Budlet
  (grass), Emberkit (fire) or Splashy (water). It's his buddy.
- **Evolving.** His buddy grows with every word he reads right. After 15 words
  a baby evolves into its middle form, and after 25 more into its final form -
  cute and round, then sleek, then big and fierce. Each new form's card goes
  in his Critter Book. He can make any critter he's caught his buddy, and
  each one keeps its own growth.
- **Wild encounters.** Five orbs and a wild critter appears. He taps the orb
  to throw it, it rocks three times, and it's caught - always. The wild only
  holds babies (the kinds at home in the place he's reading are likelier),
  plus a small chance of one of the two legendaries.
- **Holo cards.** Three words in a row right the first time charges his next
  catch: it comes on a holo card, which fills a separate holo slot in the
  book.
- **The Critter Book.** Eight lines of three - grass, fire, water, stone,
  spark, frost, shadow, sky - and two legendaries: 26 critters, and a holo
  card of each to find as well. Final forms have a foil picture window;
  legendaries are foil all over with a gold edge; holo cards are foil all
  over with a light sweeping across them. Held up big, a card tilts under his
  finger and the foil shimmers with it.

## The places

They open one after another, in the usual phonics order. Each opens once 10
different words in the one before it are read right, which also earns that
place's badge and a special encounter, likelier to be legendary.

| Place | Sounds |
|---|---|
| Sunny Meadow | short a |
| Whispering Woods | short i |
| Sandy Desert | short o |
| Snowy Peaks | short u |
| Crystal Caves | short e |
| Jungle River | ck, ll, ss endings |
| Volcano Valley | sh, ch, th, ng |
| Sky Islands | magic e |

## Grown-ups' corner

Tap the gear on the map and answer the times-table question it asks (a quick
check that keeps him out). It has:

- **Letter sounds.** The bundled recordings have no "b", so words with a b
  stay out of the game until you record one here. Any other sound can be
  re-recorded in your own voice too; the game trims the silence itself.
- **Where letter sounds come from.** The recordings (the default), or the
  iPad's own voice reading a spelling for each sound ("mmm" for m, "ahh" for
  the a in cat). Sounds you can hold come out clean from the voice; the rest
  come out with an "uh" after them ("buh"), and it can't say the i in pig at
  all, so that one stays a recording. The voice can say b, so words with a b
  play without recording one. Your own recordings are always used first.
  How each spelling was chosen is in `js/voice_sounds.js`.
- **Voice.** Pick any English voice on the iPad for the spoken instructions
  and words, and a Slower or Normal speed. (The letter sounds are recordings,
  so they don't change.) More voices can be downloaded in the iPad's Settings,
  under Accessibility, Spoken Content, Voices.
- **Progress,** including the words he finds hardest.
- **Reset,** and the credits.

## Putting it on the iPad

It's hosted on GitHub Pages at **https://cdietz05.github.io/word_miner/**
(`.nojekyll` makes Pages serve the files as they are). Every change merged
into `main` is live a minute or so later.

Open the site in Safari, tap Share, then **Add to Home Screen**. It opens full
screen and works offline; his progress is saved on the iPad. The game was
called Word Miner at first; progress saved then carries over - his words,
streaks and finished places, and any critters still in the game.

## Working on it

Plain HTML, CSS and JavaScript modules - no build step. Serve the folder and
open it:

```sh
python3 -m http.server 8000
```

- `sh tools/test.sh` runs the tests (with the JavaScript engine built into
  macOS - nothing to install) and checks the offline file list.
- `?preview=home`, `starters`, `play`, `choose`, `book`, `encounter`
  (`&throw=1` throws the orb), `evolve` (`&id=` the form it evolves into),
  `gate`, `card` (`&id=` a critter, `&holo=1`) or `parent`
  (`&section=voice`) opens straight on a screen with made-up progress that is
  never saved, for checking a layout on a device.
- `sh tools/make_icons.sh` redraws the icons from `tools/icon.js`.
- `python3 tools/prepare_sounds.py` re-trims `sounds/source/` into `sounds/`.
- When anything changes, bump `VERSION` in `sw.js` so iPads pick it up.

| Where | What |
|---|---|
| `js/phonics.js` | The words, the places, and how each word is sounded out |
| `js/progress.js` | Orbs, holo charge, buddy growth and evolving, unlocking places, choosing the next word |
| `js/critters.js` | The 26 critters, their evolution lines, and what turns up in the wild |
| `js/creature_art.js` | Every critter's picture, drawn as SVG |
| `js/cards.js` | Critter cards |
| `js/orb.js` | The Catch Orb |
| `js/audio.js` | Letter sounds, game noises and the spoken instructions |
| `js/settings.js` | The grown-ups' voice, speed and letter-sound settings |
| `js/voice_sounds.js` | Letter sounds from the iPad's voice, and which source each sound plays from |
| `js/recorder.js` | Parent recordings, kept on the iPad |
| `js/main.js` | Every screen |

## Credits

- Letter sounds: ["English Phonemes" by margo_heston](https://freesound.org/people/margo_heston/packs/12249/)
  on Freesound, [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/),
  trimmed and levelled for the game (`tools/prepare_sounds.py`). The originals
  are in `sounds/source/`.
- Fonts: [Andika](https://software.sil.org/andika/) by SIL and
  [Fredoka](https://fonts.google.com/specimen/Fredoka) by Milena Brandão,
  both under the SIL Open Font License.
- Everything else - the critters, the orbs and the word lists - was made for
  this game.

Because the letter sounds are licensed for non-commercial use only, the game
must stay free.
