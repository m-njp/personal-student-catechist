"""Synthesizes Greet the World's background loop. Pure Python, writes one WAV file.

A bright game show groove over I-vi-IV-V in G major: kick and hats, a bouncing bass, chord stabs on the
off beats, and a short pentatonic tune. It loops cleanly, and sits under the voices in the room.
Released under CC0 like the rest of the lesson's own art.
"""
import math
import os
import random
import struct
import sys
import wave

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "lessons", "lesson-04", "greet-the-world", "sounds")
RATE = 22050
BPM = 124
BEAT = 60 / BPM
BARS = 8
TAU = 2 * math.pi
NOTES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def freq(note):
    return 440.0 * 2 ** ((NOTES[note[0]] + 12 * (int(note[1:]) + 1) - 69) / 12)


def triangle(phase):
    p = phase % 1.0
    return 4 * p - 1 if p < 0.5 else 3 - 4 * p


def add(track, start, length, voice):
    """Mixes a voice(t) into the track from `start` seconds for `length` seconds."""
    first = int(start * RATE)
    for i in range(int(length * RATE)):
        if first + i < len(track):
            track[first + i] += voice(i / RATE)


def note(pitch, volume, wave_shape, length, release=0.05):
    f = freq(pitch)
    return lambda t: volume * wave_shape(f * t) * min(1.0, t / 0.005) * max(0.0, min(1.0, (length - t) / release))


def main():
    random.seed(4)
    track = [0.0] * int(RATE * BEAT * 4 * BARS)
    chords = [["G3", "B3", "D4"], ["E3", "G3", "B3"], ["C3", "E3", "G3"], ["D3", "F3", "A3"]]
    roots = ["G2", "E2", "C2", "D2"]
    tune = ["B4", "D5", "E5", "D5", "B4", "A4", "G4", "A4"]

    for bar in range(BARS):
        chord = chords[(bar // 2) % 4]
        root = roots[(bar // 2) % 4]
        start = bar * 4 * BEAT
        for beat in range(4):
            at = start + beat * BEAT
            # Kick on every beat: a falling sine thump.
            add(track, at, 0.18, lambda t: 0.9 * math.sin(TAU * (55 + 90 * math.exp(-t * 30)) * t) * math.exp(-t * 18))
            # Hats on the off beats.
            add(track, at + BEAT / 2, 0.05, lambda t: 0.12 * (random.random() * 2 - 1) * math.exp(-t * 70))
            # Bass bounces root and octave on eighths.
            for half in range(2):
                octave = root if half == 0 else root[0] + str(int(root[1:]) + 1)
                add(track, at + half * BEAT / 2, BEAT / 2, note(octave, 0.35, triangle, BEAT / 2 - 0.02))
            # Chord stabs on the off beat of 2 and 4.
            if beat in (1, 3):
                for pitch in chord:
                    add(track, at + BEAT / 2, 0.16, note(pitch, 0.12, lambda p: math.sin(TAU * p), 0.16, 0.08))
        # The tune plays in the second bar of each chord, so the loop breathes.
        if bar % 2 == 1:
            for step, pitch in enumerate(tune):
                add(track, start + step * BEAT / 2, BEAT / 2, note(pitch, 0.18, lambda p: 0.6 * triangle(p) + 0.4 * math.sin(TAU * p), BEAT / 2 - 0.03))

    peak = max(abs(sample) for sample in track) or 1.0
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, "music.wav"), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(b"".join(struct.pack("<h", int(sample / peak * 0.8 * 32767)) for sample in track))
    print(os.path.join(OUT, "music.wav"))


if __name__ == "__main__":
    main()
