# Word Miner

A phonics game for a six-year-old learning to read, built to live on an
iPad's home screen. He sounds out a word block by block, blends it, picks the
matching picture, and breaks the block open for gems. Every five words earns a
pack of critter cards to collect.

## How a word is played

1. The word appears as a row of stone blocks, one per sound (`c` `a` `t`,
   `sh` `i` `p`, `c` `a` `k` `e`).
2. He taps each block, left to right, and hears its sound.
3. He taps the pickaxe, and the sounds play once slowly, then run together.
4. He picks the picture that matches from three. Right the first time is 3
   gems; after a miss it's 1, and after two misses the right picture points
   itself out.

Every instruction is spoken aloud, since he's learning to read. The letters
are set in Andika, a typeface designed for early readers.

## The worlds

They open one after another, in the usual phonics order. Each opens once 10
different words in the one before it are read right.

| World | Sounds |
|---|---|
| Grassy Meadow | short a |
| Birch Forest | short i |
| Sandy Desert | short o |
| Snowy Peaks | short u |
| Deep Caves | short e |
| Jungle Ruins | ck, ll, ss endings |
| Lava Lands | sh, ch, th, ng |
| Sky Islands | magic e |

Finishing a world gives a special pack that's always rare or better.

Rare cards are holofoil - a rainbow foil picture window with sparkle - and
legendary ones are foil all over with a gold edge. Held up big, a card
tilts under his finger and the foil shimmers with it.

## Grown-ups' corner

Tap the gear on the map and answer the times-table question it asks (a quick
check that keeps him out). It has:

- **Letter sounds.** The bundled recordings have no "b", so words with a b
  stay out of the game until you record one here. Any other sound can be
  re-recorded in your own voice too; the game trims the silence itself.
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
screen and works offline; his progress is saved on the iPad.

## Working on it

Plain HTML, CSS and JavaScript modules - no build step. Serve the folder and
open it:

```sh
python3 -m http.server 8000
```

- `sh tools/test.sh` runs the tests (with the JavaScript engine built into
  macOS - nothing to install) and checks the offline file list.
- `?preview=home`, `play`, `choose`, `collection`, `pack`, `gate`, `card`
  (`&id=` a critter) or `parent` (`&section=voice`) opens
  straight on a screen with made-up progress that is never saved, for checking
  a layout on a device.
- `python3 tools/prepare_sounds.py` re-trims `sounds/source/` into `sounds/`.
- `python3 tools/make_art.py` redraws the block textures and icons.
- When anything changes, bump `VERSION` in `sw.js` so iPads pick it up.

| Where | What |
|---|---|
| `js/phonics.js` | The words, the worlds, and how each word is sounded out |
| `js/progress.js` | Gems, streaks, packs, unlocking worlds, choosing the next word |
| `js/critters.js` | The 32 critter cards, pack odds, and their pixel art |
| `js/audio.js` | Letter sounds, game noises and the spoken instructions |
| `js/settings.js` | The grown-ups' voice and speed settings |
| `js/recorder.js` | Parent recordings, kept on the iPad |
| `js/main.js` | Every screen |

## Credits

- Letter sounds: ["English Phonemes" by margo_heston](https://freesound.org/people/margo_heston/packs/12249/)
  on Freesound, [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/),
  trimmed and levelled for the game (`tools/prepare_sounds.py`). The originals
  are in `sounds/source/`.
- Fonts: [Andika](https://software.sil.org/andika/) by SIL and
  [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by
  CodeMan38, both under the SIL Open Font License.
- Everything else - the critters, the blocks and the word lists - was made for
  this game.

Because the letter sounds are licensed for non-commercial use only, the game
must stay free.
