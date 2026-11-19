"""Synthesizes A Journey to Remember's music and sounds: soft chiptune tones that suit the pixel art.

Run from this folder: python sounds.py
Writes WAV files into public/lessons/lesson-05/journey/sounds/.
"""
import os
import wave

import numpy as np

RATE = 22050
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "public", "lessons", "lesson-05", "journey", "sounds"))
NOTES = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}


def freq(note):
    """'A4', 'C#5', 'Bb3' to hertz."""
    name, octave = note[:-1], int(note[-1])
    semis = NOTES[name[0]] + (1 if "#" in name else 0) - (1 if "b" in name else 0)
    return 440.0 * 2 ** ((semis + (octave - 4) * 12) / 12)


def t_axis(seconds):
    return np.arange(int(RATE * seconds)) / RATE


def envelope(n, attack=0.01, release=0.2, sustain=1.0):
    env = np.ones(n) * sustain
    a = max(1, int(RATE * attack))
    r = max(1, int(RATE * release))
    env[:a] = np.linspace(0, 1, a)
    if r < n:
        env[-r:] *= np.linspace(1, 0, r)
    return env


def tone(f, seconds, kind="triangle", attack=0.01, release=0.15, vibrato=0.0):
    t = t_axis(seconds)
    phase = 2 * np.pi * f * t + vibrato * np.sin(2 * np.pi * 5.5 * t)
    if kind == "sine":
        w = np.sin(phase)
    elif kind == "square":
        # A soft, rounded square: a few odd harmonics only.
        w = np.sin(phase) + np.sin(3 * phase) / 3 + np.sin(5 * phase) / 6
        w /= 1.3
    elif kind == "pulse":
        w = np.sin(phase) + 0.5 * np.sin(2 * phase) + 0.25 * np.sin(3 * phase)
        w /= 1.6
    else:
        w = 2 / np.pi * np.arcsin(np.sin(phase))
    return w * envelope(len(t), attack, release)


def bell(f, seconds, decay=1.6):
    t = t_axis(seconds)
    partials = ((1, 1.0), (2.0, 0.5), (2.76, 0.35), (5.4, 0.18), (8.9, 0.08))
    w = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * decay * (1 + m * 0.4)) for m, a in partials)
    return w * envelope(len(t), 0.002, 0.05)


def noise(seconds, decay=30.0, lowpass=0.2):
    rng = np.random.default_rng(4)
    t = t_axis(seconds)
    w = rng.uniform(-1, 1, len(t))
    out = np.zeros_like(w)
    acc = 0.0
    for i, v in enumerate(w):
        acc += (v - acc) * lowpass
        out[i] = acc
    return out * np.exp(-t * decay)


def place(buffer, sound, at):
    i = int(at * RATE)
    end = min(len(buffer), i + len(sound))
    buffer[i:end] += sound[: end - i]


def echo(w, delay=0.18, feedback=0.35, times=3):
    out = np.concatenate([w, np.zeros(int(RATE * delay * times))])
    for k in range(1, times + 1):
        d = int(RATE * delay * k)
        out[d:d + len(w)] += w * feedback ** k
    return out


def save(name, w, peak=0.8):
    os.makedirs(OUT, exist_ok=True)
    w = w / (np.max(np.abs(w)) or 1) * peak
    data = (w * 32767).astype("<i2")
    with wave.open(os.path.join(OUT, name), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(data.tobytes())


def music():
    """A light walking tune in F major, eight bars that loop cleanly."""
    bpm = 96
    beat = 60 / bpm
    bars = 8
    total = bars * 4 * beat
    out = np.zeros(int(RATE * total) + RATE)
    chords = [("F3", "A3", "C4"), ("C3", "E3", "G3"), ("D3", "F3", "A3"), ("Bb2", "D3", "F3"),
              ("F3", "A3", "C4"), ("Bb2", "D3", "F3"), ("G3", "Bb3", "D4"), ("C3", "E3", "G3")]
    melody = [
        ("A4", 1), ("C5", 1), ("F5", 1.5), ("E5", 0.5),
        ("D5", 1), ("C5", 1), ("G4", 2),
        ("A4", 1), ("F4", 1), ("D5", 1.5), ("C5", 0.5),
        ("Bb4", 1), ("A4", 1), ("F4", 2),
        ("A4", 1), ("C5", 1), ("F5", 1), ("G5", 1),
        ("F5", 1), ("D5", 1), ("Bb4", 2),
        ("G4", 1), ("Bb4", 1), ("D5", 1.5), ("C5", 0.5),
        ("A4", 1), ("G4", 1), ("C5", 2),
    ]
    for bar, chord in enumerate(chords):
        start = bar * 4 * beat
        root = chord[0]
        for k in range(4):
            note = root if k % 2 == 0 else chord[2]
            place(out, tone(freq(note) / 2, beat * 0.9, "triangle", 0.005, 0.12) * 0.55, start + k * beat)
        # Soft broken chords on the off beats, like footsteps.
        for k in range(8):
            note = chord[k % 3]
            place(out, tone(freq(note) * 2, beat * 0.4, "sine", 0.004, 0.18) * 0.12, start + k * beat / 2)
        for k in range(4):
            place(out, noise(0.06, 60, 0.6) * (0.08 if k % 2 else 0.05), start + k * beat + beat / 2)
    at = 0.0
    for note, length in melody:
        place(out, tone(freq(note), length * beat * 0.95, "pulse", 0.01, 0.2, vibrato=0.02) * 0.32, at)
        at += length * beat
    return out[: int(RATE * total)]


def ending():
    """A slow, warm swell for the Church: a held chord with a bell on top."""
    seconds = 9.0
    out = np.zeros(int(RATE * seconds))
    for note in ("F3", "A3", "C4", "F4", "A4"):
        place(out, tone(freq(note), seconds, "sine", 1.8, 2.5, vibrato=0.03) * 0.22, 0)
        place(out, tone(freq(note) * 1.003, seconds, "triangle", 2.4, 2.5) * 0.08, 0)
    for i, note in enumerate(("C5", "F5", "A5", "C6")):
        place(out, bell(freq(note), 3.0, 1.2) * 0.25, 1.0 + i * 0.5)
    return out


def main():
    save("music.wav", music(), 0.7)
    save("ending.wav", ending(), 0.7)
    # A rising shimmer as a memory comes back.
    memory = np.zeros(int(RATE * 1.0))
    for i, n in enumerate(("C5", "E5", "G5", "B5", "D6", "G6")):
        place(memory, tone(freq(n), 0.5, "sine", 0.005, 0.4) * 0.5, i * 0.07)
    save("memory.wav", echo(memory), 0.6)
    ask = np.zeros(int(RATE * 0.5))
    place(ask, tone(freq("G5"), 0.12, "pulse", 0.004, 0.08), 0)
    place(ask, tone(freq("C6"), 0.22, "pulse", 0.004, 0.15), 0.11)
    save("ask.wav", ask, 0.5)
    reveal = np.zeros(int(RATE * 2.0))
    for i, n in enumerate(("C5", "E5", "G5", "C6")):
        place(reveal, bell(freq(n), 1.6, 2.0) * (0.6 if i < 3 else 0.9), i * 0.09)
    place(reveal, tone(freq("E6"), 0.9, "sine", 0.01, 0.6) * 0.15, 0.36)
    save("reveal.wav", reveal, 0.75)
    pop = tone(freq("A5"), 0.12, "sine", 0.002, 0.1) * np.exp(-t_axis(0.12) * 20) + noise(0.12, 45, 0.3) * 0.5
    save("pop.wav", pop, 0.55)
    thud = tone(110, 0.2, "sine", 0.002, 0.15) * np.exp(-t_axis(0.2) * 18) + noise(0.2, 25, 0.12) * 0.7
    save("brick.wav", thud, 0.6)
    save("bell.wav", echo(bell(freq("F4"), 3.5, 0.9), 0.3, 0.25, 2), 0.7)
    sparkle = np.zeros(int(RATE * 1.0))
    for i, n in enumerate(("E6", "G6", "C7", "G6", "E7")):
        place(sparkle, tone(freq(n), 0.25, "sine", 0.002, 0.2) * 0.4, i * 0.06)
    save("sparkle.wav", sparkle, 0.4)
    town_sounds()
    print("sounds written to", OUT)


def filtered(seconds, decay, lowpass, seed):
    rng = np.random.default_rng(seed)
    t = t_axis(seconds)
    w = rng.uniform(-1, 1, len(t))
    out = np.zeros_like(w)
    acc = 0.0
    for i, v in enumerate(w):
        acc += (v - acc) * lowpass
        out[i] = acc
    return out * np.exp(-t * decay)


def glide(f0, f1, seconds, kind="square"):
    t = t_axis(seconds)
    f = np.linspace(f0, f1, len(t))
    phase = 2 * np.pi * np.cumsum(f) / RATE
    w = np.sin(phase) if kind == "sine" else np.sign(np.sin(phase)) * 0.6 + np.sin(phase) * 0.4
    return w * envelope(len(t), 0.005, seconds * 0.4)


def town_sounds():
    # Two soft footsteps on a dirt road, so they alternate left and right.
    for k in range(2):
        step = filtered(0.09, 55, 0.18 + k * 0.05, 10 + k) + tone(90 + k * 15, 0.09, "sine", 0.001, 0.06) * 0.4
        save(f"step-{k}.wav", step, 0.35)
    # A hammer on wood, three quick taps.
    hammer = np.zeros(int(RATE * 0.6))
    for i in range(3):
        place(hammer, tone(680, 0.06, "square", 0.001, 0.05) * np.exp(-t_axis(0.06) * 60) + filtered(0.06, 70, 0.5, 20 + i) * 0.6, i * 0.17)
    save("hammer.wav", hammer, 0.5)
    # A low rumble as a building rises out of the ground.
    rumble = filtered(1.2, 1.2, 0.03, 30) * envelope(int(RATE * 1.2), 0.25, 0.5)
    save("rise.wav", rumble, 0.6)
    # The jeepney's two note horn, and its engine putting past.
    horn = np.zeros(int(RATE * 0.7))
    for at in (0, 0.28):
        place(horn, (tone(440, 0.22, "square", 0.005, 0.05) + tone(554, 0.22, "square", 0.005, 0.05)) * 0.5, at)
    save("horn.wav", horn, 0.5)
    engine = np.zeros(int(RATE * 2.4))
    for i in range(int(2.4 * 14)):
        place(engine, filtered(0.05, 40, 0.08, 40 + i % 3) * (0.6 + 0.4 * np.sin(i / 34 * np.pi)), i / 14)
    save("engine.wav", engine * envelope(len(engine), 0.4, 0.8), 0.5)
    # A dog's woof: a short bark that drops in pitch.
    bark = np.zeros(int(RATE * 0.5))
    for at in (0, 0.22):
        place(bark, glide(520, 260, 0.13, "square") * 0.6 + filtered(0.13, 25, 0.25, 50) * 0.4, at)
    save("bark.wav", bark, 0.5)
    # A hen's cluck.
    cluck = np.zeros(int(RATE * 0.45))
    for i, f in enumerate((880, 760, 980)):
        place(cluck, glide(f, f * 0.7, 0.07, "square") * 0.5, i * 0.12)
    save("cluck.wav", cluck, 0.35)
    # The sorbetes vendor's hand bell.
    ring = np.zeros(int(RATE * 1.2))
    for i in range(4):
        place(ring, bell(freq("A6"), 0.5, 5.0) * 0.6, i * 0.12)
    save("handbell.wav", ring, 0.4)
    # A ball bouncing back across the road.
    boing = np.zeros(int(RATE * 0.9))
    for i, at in enumerate((0, 0.3, 0.5, 0.62)):
        place(boing, glide(300, 180, 0.09, "sine") * (1 - i * 0.2), at)
    save("bounce.wav", boing, 0.45)
    # Birds chirping by the road.
    chirp = np.zeros(int(RATE * 0.8))
    for i in range(4):
        place(chirp, glide(2600 + i * 200, 3400, 0.06, "sine") * 0.5, i * 0.13 + (0.05 if i % 2 else 0))
    save("chirp.wav", chirp, 0.25)
    # A firework: a rising whistle, then a soft burst and crackle.
    fw = np.zeros(int(RATE * 1.8))
    place(fw, glide(600, 1800, 0.6, "sine") * 0.25, 0)
    place(fw, filtered(0.6, 6, 0.2, 60) * 0.9, 0.62)
    for i in range(12):
        place(fw, filtered(0.02, 120, 0.7, 70 + i) * 0.4, 0.75 + i * 0.07)
    save("firework.wav", fw, 0.5)
    # Clapping and cheering from the whole crowd.
    claps = np.zeros(int(RATE * 2.6))
    rng = np.random.default_rng(80)
    for i in range(70):
        place(claps, filtered(0.03, 90, 0.6, 90 + i) * rng.uniform(0.3, 0.8), rng.uniform(0, 2.2))
    swell = filtered(2.6, 0.6, 0.05, 99) * envelope(len(claps), 0.3, 1.2) * 0.4
    save("cheer.wav", claps + swell, 0.6)
    # A bright fanfare for every right answer and for reaching the Church.
    fan = np.zeros(int(RATE * 1.8))
    for i, (n, d) in enumerate((("C5", 0.12), ("E5", 0.12), ("G5", 0.12), ("C6", 0.5))):
        at = sum(x[1] for x in (("C5", 0.12), ("E5", 0.12), ("G5", 0.12))[:i])
        place(fan, tone(freq(n), d + 0.1, "pulse", 0.005, 0.12) * 0.5, at)
        place(fan, tone(freq(n) / 2, d + 0.1, "triangle", 0.005, 0.12) * 0.3, at)
    place(fan, bell(freq("C6"), 1.2, 2.2) * 0.4, 0.36)
    save("fanfare.wav", fan, 0.6)
    # A soft rush as a memory begins.
    whoosh = filtered(0.9, 1.0, 0.12, 120) * envelope(int(RATE * 0.9), 0.35, 0.5)
    save("whoosh.wav", whoosh, 0.4)


if __name__ == "__main__":
    main()
