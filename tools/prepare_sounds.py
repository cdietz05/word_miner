# Turns the downloaded phoneme recordings (sounds/source/*.mp3) into the
# short, even clips the game plays (sounds/*.m4a).
#
# Each source file is a second or two of room hiss with the sound itself
# somewhere inside it. For sounding out a word the sounds are played one
# after another, so the hiss and the dead air around each one would make
# the word fall apart. This keeps only the sound: it finds where the
# loudness rises clear of the hiss, keeps that stretch with a little room
# either side, fades the edges so nothing clicks, and brings every clip to
# the same peak so no sound is quieter than the rest.
#
# Uses macOS's afconvert for decoding and AAC encoding (AAC plays natively
# in Safari on the iPad) and numpy for the rest.
#
#   python3 tools/prepare_sounds.py

import glob
import os
import subprocess
import tempfile
import wave

import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RATE = 22050
WINDOW = 0.01          # seconds per loudness reading
LEAD = 0.03            # kept before the sound starts
TAIL = 0.06            # kept after it ends
FADE_IN = 0.01
FADE_OUT = 0.04
PEAK = 0.8             # of full scale
QUIET_GAP = 0.08       # this long below the threshold ends the sound


def trim(samples):
    win = int(RATE * WINDOW)
    rms = np.array([np.sqrt((samples[i:i + win] ** 2).mean()) for i in range(0, len(samples) - win, win)])
    floor = np.percentile(rms, 10)
    # Clear of the hiss, and a real part of the sound rather than its
    # faintest edge.
    threshold = max(floor * 3.0, rms.max() * 0.12)
    # The one stretch of sound around the loudest moment: out from the peak
    # until it has stayed below the threshold for QUIET_GAP. A stray click
    # or breath elsewhere in the file - the quiet "th" had several - is not
    # part of it.
    above = rms > threshold
    gap = int(QUIET_GAP / WINDOW)
    first = last = int(rms.argmax())
    while first > 0 and above[max(0, first - gap):first].any():
        first -= 1
    while last < len(rms) - 1 and above[last + 1:last + 1 + gap].any():
        last += 1
    start = max(0, int((first * WINDOW - LEAD) * RATE))
    end = min(len(samples), int(((last + 1) * WINDOW + TAIL) * RATE))
    clip = samples[start:end].copy()

    fade_in = int(FADE_IN * RATE)
    fade_out = int(FADE_OUT * RATE)
    clip[:fade_in] *= np.linspace(0.0, 1.0, fade_in)
    clip[-fade_out:] *= np.linspace(1.0, 0.0, fade_out)
    return clip * (PEAK / np.abs(clip).max())


def main():
    sources = sorted(glob.glob(os.path.join(ROOT, 'sounds', 'source', '*.mp3')))
    with tempfile.TemporaryDirectory() as tmp:
        for source in sources:
            key = os.path.splitext(os.path.basename(source))[0]
            raw = os.path.join(tmp, key + '.wav')
            subprocess.run(['afconvert', '-f', 'WAVE', '-d', f'LEI16@{RATE}', '-c', '1', source, raw], check=True)
            with wave.open(raw) as w:
                samples = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768.0

            clip = trim(samples)

            trimmed = os.path.join(tmp, key + '_trim.wav')
            with wave.open(trimmed, 'wb') as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(RATE)
                w.writeframes((clip * 32767).astype(np.int16).tobytes())
            out = os.path.join(ROOT, 'sounds', key + '.m4a')
            subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', trimmed, out], check=True)
            print(f'{key:4} {len(samples) / RATE:.2f}s -> {len(clip) / RATE:.2f}s')


if __name__ == '__main__':
    main()
