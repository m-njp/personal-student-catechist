"""Draws every picture in A Journey to Remember and packs them into one atlas.

Run from this folder: python gen.py
Writes public/lessons/lesson-05/journey/atlas.png and atlas.json.
"""
import json
import os

from PIL import Image

from buildings import build_buildings
from people import CAST, PUPIL, SIZES, build_people, height_of
from town import build_town
from world import META, build_world, wall_bricks

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "public", "lessons", "lesson-05", "journey")
ATLAS_W = 2048
GAP = 1


def pack(sprites):
    """Shelf packing, tallest first, so rows waste little space."""
    order = sorted(sprites, key=lambda n: (-sprites[n].h, n))
    x = y = shelf = 0
    places = {}
    for name in order:
        s = sprites[name]
        if x + s.w > ATLAS_W:
            x, y, shelf = 0, y + shelf + GAP, 0
        places[name] = (x, y, s.w, s.h)
        x += s.w + GAP
        shelf = max(shelf, s.h)
    atlas = Image.new("RGBA", (ATLAS_W, y + shelf), (0, 0, 0, 0))
    for name, (px, py, _, _) in places.items():
        atlas.alpha_composite(sprites[name].im, (px, py))
    return atlas, places


def main():
    sprites = {}
    sprites.update(build_people())
    sprites.update(build_world())
    sprites.update(build_buildings())
    sprites.update(build_town())
    atlas, places = pack(sprites)
    os.makedirs(OUT, exist_ok=True)
    atlas.save(os.path.join(OUT, "atlas.png"), optimize=True)
    kid = SIZES[PUPIL.size]
    meta = dict(META)
    # Rows from the bottom of a kid's sprite to the top of the shoulder, where the bamboo pole rests.
    meta["poleRise"] = 3 + 2 + kid["legs"] + kid["torso"] + 2
    meta["bricks"] = wall_bricks()
    meta["heights"] = {name: height_of(look) for name, look in CAST.items()}
    with open(os.path.join(OUT, "atlas.json"), "w", encoding="utf-8") as f:
        json.dump({"frames": {n: list(p) for n, p in sorted(places.items())}, "meta": meta}, f, separators=(",", ":"))
    print(f"atlas {atlas.width}x{atlas.height}, {len(places)} pictures")


if __name__ == "__main__":
    main()
