"""The buildings of the bayan and the bahay kubo, drawn near life size.

An adult is about 50 pixels tall, so doors are about 44 to 48 pixels and a floor about 50.
"""
import random

import palette as P
from pix import INK, Canvas, ellipse, hexc, line, mix, poly, rect


def deeper(r, t=0.2):
    return tuple(mix(c, INK, t) for c in r)


def tiles(c, mask, ramp):
    """Clay roof tiles: rows of curved tiles, each with its own lit edge."""
    c.paint(mask, ramp)
    ys = sorted({y for _, y in mask})
    top = ys[0]
    for x, y in mask:
        row = (y - top) // 4
        if (y - top) % 4 == 3:
            c.set(x, y, ramp[2])
        elif (x + row * 3) % 6 == 0:
            c.set(x, y, ramp[2])
        elif (x + row * 3) % 6 == 1 and (y - top) % 4 == 0:
            c.set(x, y, ramp[0])


def stone_blocks(c, x0, y0, x1, y1, ramp, w=10, h=6):
    c.paint(rect(x0, y0, x1, y1), ramp)
    for y in range(y0 + 1, y1, h):
        c.fill(rect(x0 + 1, y, x1 - 1, y), ramp[2])
        offset = (w // 2) if ((y - y0) // h) % 2 else 0
        for x in range(x0 + offset, x1, w):
            c.fill(rect(x, y, x, min(y1 - 1, y + h - 1)), ramp[2])
            c.set(x + 1, y + 1, ramp[0])


def planks(c, x0, y0, x1, y1, ramp, step=4):
    c.paint(rect(x0, y0, x1, y1), ramp)
    for x in range(x0 + step, x1, step):
        c.fill(rect(x, y0 + 1, x, y1 - 1), ramp[2])
        c.set(x + 1, y0 + 1 + (x * 7) % max(1, y1 - y0 - 2), ramp[0])


def arch_mask(x0, y0, x1, y1):
    w = x1 - x0
    return rect(x0, y0 + w / 2, x1, y1) | ellipse(x0 + w / 2 + 0.5, y0 + w / 2 + 0.5, w / 2 + 0.5, w / 2 + 0.5)


def glass_window(c, x0, y0, x1, y1, frame=P.WOOD, glass=P.GLASS, bars=True):
    c.paint(rect(x0 - 1, y0 - 1, x1 + 1, y1 + 1), frame)
    c.paint(rect(x0, y0, x1, y1), glass, inner=False)
    for x, y in rect(x0, y0, x1, y1):
        if (x - y) % 7 == 0 and y < y0 + (y1 - y0) // 2:
            c.set(x, y, glass[0])
    if bars:
        mid = (x0 + x1) // 2
        c.fill(rect(mid, y0, mid, y1), frame[2])
        c.fill(rect(x0, (y0 + y1) // 2, x1, (y0 + y1) // 2), frame[2])


def grille(c, x0, y0, x1, y1):
    """Iron window grilles, curling at the top."""
    c.paint(rect(x0 - 1, y0 - 1, x1 + 1, y1 + 1), P.STONE)
    c.paint(rect(x0, y0, x1, y1), (hexc("#5a4664"), hexc("#3e3048"), hexc("#2e2438"), hexc("#20182a")), inner=False)
    for x in range(x0 + 1, x1, 3):
        c.fill(rect(x, y0, x, y1), P.METAL[2])
    for y in (y0 + 2, y1 - 2):
        c.fill(rect(x0, y, x1, y), P.METAL[2])


def plant_pot(c, x, base, rng, flower=None):
    c.paint(poly([(x - 3, base - 6), (x + 3, base - 6), (x + 2, base), (x - 2, base)]), P.BRICK)
    mask = set()
    for _ in range(6):
        mask |= ellipse(x + rng.uniform(-3, 3), base - 9 + rng.uniform(-3, 2), 2.6, 2.2)
    c.paint(mask, P.LEAF, inner=False)
    if flower:
        for _ in range(4):
            fx, fy = rng.choice(sorted(mask))
            c.set(fx, fy, flower[1])


def house():
    """A bahay na bato: a stone ground floor, a wooden upper floor with sliding capiz windows."""
    c = Canvas(118, 128)
    base = 127
    rng = random.Random(1)
    stone_blocks(c, 6, base - 58, 111, base, P.STONE)
    door = arch_mask(46, base - 46, 71, base)
    c.paint(rect(43, base - 49, 74, base) & (arch_mask(43, base - 49, 74, base)), P.STONE)
    c.paint(door, P.WOOD_DARK)
    c.fill(rect(58, base - 30, 58, base - 1), P.WOOD_DARK[3])
    for y in range(base - 30, base - 2, 6):
        for x in (50, 54, 62, 66):
            c.set(x, y, P.GOLD[2])
    for wx in (14, 86):
        grille(c, wx, base - 46, wx + 17, base - 24)
    c.paint(rect(2, base - 60, 115, base - 57), P.WOOD_DARK)
    planks(c, 2, base - 102, 115, base - 60, P.WOOD)
    capiz = (hexc("#fffef6"), hexc("#f8f2de"), hexc("#e2d8bc"), hexc("#b8aa88"))
    for wx in (7, 44, 81):
        c.paint(rect(wx - 1, base - 97, wx + 30, base - 70), P.WOOD_DARK)
        for gy in range(base - 96, base - 72, 4):
            for gx in range(wx, wx + 29, 4):
                c.paint(rect(gx, gy, gx + 2, gy + 2), capiz, inner=False)
        c.fill(rect(wx + 14, base - 96, wx + 15, base - 71), P.WOOD_DARK[2])
        # The ventanilla below each window, with its little balusters.
        c.paint(rect(wx - 1, base - 69, wx + 30, base - 63), P.WOOD_DARK)
        for bx in range(wx + 1, wx + 29, 3):
            c.fill(rect(bx, base - 68, bx, base - 64), P.WOOD[0])
    tiles(c, poly([(-1, base - 102), (20, base - 124), (97, base - 124), (118, base - 102)]), P.ROOF_RED)
    c.paint(rect(18, base - 126, 99, base - 124), deeper(P.ROOF_RED, 0.1), inner=False)
    for x in (30, 87):
        plant_pot(c, x, base, rng, P.CLOTH["red"])
    plant_pot(c, 104, base - 62, rng, P.CLOTH["pink"])
    c.outline()
    return c


def school():
    c = Canvas(152, 100)
    base = 99
    wall = (hexc("#fff8e6"), hexc("#f6ead0"), hexc("#ddcca8"), hexc("#b29e7c"))
    green = P.CLOTH["green"]
    c.paint(rect(0, base - 5, 151, base), P.STONE)
    c.paint(rect(3, base - 64, 148, base - 5), wall)
    c.paint(rect(3, base - 16, 148, base - 5), green)
    for x in range(6, 146, 8):
        c.set(x, base - 12, green[0])
    for wx in (9, 33, 99, 123):
        c.paint(rect(wx, base - 52, wx + 19, base - 22), green)
        c.paint(rect(wx + 2, base - 50, wx + 17, base - 24), P.GLASS, inner=False)
        for y in range(base - 49, base - 24, 3):
            c.fill(rect(wx + 2, y, wx + 17, y), P.GLASS[2])
        c.fill(rect(wx + 1, base - 21, wx + 20, base - 20), green[2])
    # Double doors with a sign above.
    c.paint(rect(62, base - 50, 89, base - 5), green)
    c.paint(rect(64, base - 48, 75, base - 6), P.WOOD)
    c.paint(rect(76, base - 48, 87, base - 6), P.WOOD)
    for dx in (69, 81):
        c.paint(rect(dx - 2, base - 44, dx + 2, base - 34), P.GLASS, inner=False)
    c.paint(rect(56, base - 63, 95, base - 54), P.CLOTH["navy"])
    for y in (base - 61, base - 57):
        c.fill(rect(60, y, 91, y), P.CLOTH["white"][1])
    tiles(c, poly([(-2, base - 64), (16, base - 84), (135, base - 84), (153, base - 64)]), P.ROOF_RED)
    # The school bell on its frame.
    c.paint(rect(70, base - 99, 71, base - 84) | rect(80, base - 99, 81, base - 84) | rect(70, base - 99, 81, base - 98), P.WOOD_DARK)
    c.paint(poly([(73, base - 96), (78, base - 96), (79.5, base - 88), (71.5, base - 88)]), P.GOLD)
    c.outline()
    return c


def hall():
    """The town hall: an arcade below, a balcony above, and a clock in the pediment."""
    c = Canvas(142, 134)
    base = 133
    white = P.PLASTER
    col = (hexc("#ffffff"), hexc("#fbf4e6"), hexc("#ddcfb4"), hexc("#b2a084"))
    for i in range(3):
        c.paint(rect(4 + i * 4, base - 3 - i * 3, 137 - i * 4, base - i * 3), P.STONE, inner=False)
    c.paint(rect(12, base - 62, 129, base - 9), white)
    for k in range(5):
        x = 17 + k * 22
        c.paint(arch_mask(x, base - 52, x + 15, base - 9), (hexc("#6a5470"), hexc("#4e3c58"), hexc("#3a2c44"), hexc("#281e30")), inner=False)
        c.paint(rect(x - 4, base - 58, x - 1, base - 9), col)
    c.paint(rect(126, base - 58, 129, base - 9), col)
    c.paint(rect(8, base - 66, 133, base - 62), P.STONE)
    c.paint(rect(12, base - 106, 129, base - 66), white)
    for k in range(5):
        x = 17 + k * 22
        glass_window(c, x + 1, base - 98, x + 13, base - 76)
        c.fill(rect(x - 2, base - 104, x - 2, base - 68), white[2])
    c.paint(rect(30, base - 74, 111, base - 72), P.METAL)
    for x in range(31, 111, 3):
        c.fill(rect(x, base - 72, x, base - 67), P.METAL[2])
    c.paint(rect(6, base - 110, 135, base - 106), P.STONE)
    c.paint(poly([(10, base - 110), (70.5, base - 132), (131, base - 110)]), white)
    c.paint(ellipse(71, base - 119, 6, 6), P.CLOTH["white"])
    c.fill(line(70, base - 119, 70, base - 123) | line(70, base - 119, 73, base - 119), INK)
    c.outline()
    return c


def flag(frame):
    """The Philippine flag on a tall pole, waving in three frames."""
    c = Canvas(40, 140)
    c.paint(rect(2, 4, 3, 139), P.METAL)
    c.paint(ellipse(2.5, 3, 2, 2), P.GOLD, inner=False)
    c.paint(rect(0, 134, 6, 139), P.STONE, inner=False)
    import math
    for x in range(4, 37):
        t = (x - 4) / 32
        dy = round(math.sin(t * 5 + frame * 2.1) * 1.8 * t)
        for y in range(7, 28):
            yy = y + dy
            col = P.FLAG_BLUE[1] if y < 17 else P.FLAG_RED[1]
            if x - 4 < 11 * (1 - abs(y - 17) / 11):
                col = P.CLOTH["white"][1]
            shade = math.sin(t * 5 + frame * 2.1)
            if shade < -0.5:
                col = mix(col, INK, 0.15)
            elif shade > 0.6:
                col = mix(col, hexc("#ffffff"), 0.12)
            c.set(x, yy, col)
        if x == 8:
            c.fill({(7, 17 + dy), (8, 17 + dy), (8, 16 + dy), (7, 18 + dy)}, P.GOLD[1])
    c.outline()
    return c


def chapel():
    c = Canvas(94, 126)
    base = 125
    wall = (hexc("#fbf6ee"), hexc("#efe6d6"), hexc("#d4c6ac"), hexc("#a8977c"))
    c.paint(rect(8, base - 66, 85, base), wall)
    c.paint(poly([(4, base - 66), (46.5, base - 94), (89, base - 66)]), wall)
    c.paint(rect(36, base - 112, 57, base - 90), wall)
    c.paint(poly([(34, base - 112), (46.5, base - 120), (59, base - 112)]), P.ROOF_RED)
    c.fill(rect(41, base - 108, 52, base - 96), hexc("#3e3048"))
    c.paint(poly([(43, base - 101), (50, base - 101), (51, base - 96), (42, base - 96)]), P.GOLD, inner=False)
    c.paint(rect(45, base - 126, 47, base - 119), P.GOLD)
    c.paint(rect(42, base - 124, 50, base - 123), P.GOLD)
    door = arch_mask(34, base - 44, 59, base)
    c.paint(door, P.CLOTH["blue"])
    c.fill(rect(46, base - 30, 46, base - 1), P.CLOTH["blue"][3])
    amber = (hexc("#ffe8a8"), hexc("#f2b85a"), hexc("#d48c44"), hexc("#a0602c"))
    for wx in (15, 68):
        c.paint(arch_mask(wx, base - 52, wx + 10, base - 24), P.WOOD)
        c.paint(arch_mask(wx + 1, base - 51, wx + 9, base - 25), amber, inner=False)
    c.paint(ellipse(47, base - 76, 6, 6), P.GLASS)
    c.fill(line(47, base - 81, 47, base - 71) | line(42, base - 76, 52, base - 76), P.WOOD_DARK[2])
    c.paint(rect(2, base - 3, 91, base), P.STONE, inner=False)
    c.outline()
    return c


def kubo():
    c = Canvas(106, 104)
    base = 103
    for x in (12, 38, 64, 90):
        c.paint(rect(x, base - 30, x + 3, base), P.BAMBOO)
        for y in range(base - 26, base, 8):
            c.set(x + 1, y, P.BAMBOO[3])
    c.paint(rect(5, base - 34, 100, base - 29), P.BAMBOO)
    for x in range(6, 100, 3):
        c.set(x, base - 32, P.BAMBOO[2])
    wall = rect(10, base - 66, 95, base - 35)
    for x, y in wall:
        k = ((x // 3) + (y // 3)) % 2
        c.set(x, y, P.NIPA[1] if k else P.NIPA[2])
        if (x + y) % 6 == 0:
            c.set(x, y, P.NIPA[0])
    c.paint(rect(8, base - 67, 10, base - 34) | rect(95, base - 67, 97, base - 34), P.BAMBOO, inner=False)
    c.paint(rect(20, base - 60, 40, base - 44), P.WOOD_DARK)
    c.paint(rect(21, base - 59, 39, base - 45), (hexc("#6a4c3c"), hexc("#4e3628"), hexc("#3a281e"), hexc("#281a14")), inner=False)
    c.paint(poly([(19, base - 61), (41, base - 61), (46, base - 69), (24, base - 69)]), P.NIPA)
    c.fill(line(40, base - 44, 44, base - 66), P.BAMBOO[2])
    c.paint(rect(60, base - 62, 76, base - 35), P.WOOD_DARK)
    c.fill(rect(68, base - 61, 68, base - 36), P.WOOD_DARK[3])
    # A bamboo ladder up to the door.
    for x in (62, 74):
        c.fill(line(x, base - 34, x + 4, base), P.BAMBOO[2])
    for y in range(base - 28, base, 7):
        c.fill(line(63 + (y - base + 34) * 0.12, y, 75 + (y - base + 34) * 0.12, y), P.BAMBOO[1])
    roof = poly([(0, base - 62), (53, base - 103), (106, base - 62)])
    c.paint(roof, P.NIPA)
    for x, y in roof:
        if (x * 3 + y) % 7 == 0:
            c.set(x, y, P.NIPA[2])
        elif (x * 5 + y * 2) % 11 == 0:
            c.set(x, y, P.NIPA[0])
    for x in range(1, 105, 2):
        c.set(x, base - 61, P.NIPA[3])
    c.paint(rect(48, base - 104, 58, base - 101), P.BAMBOO, inner=False)
    c.outline()
    return c


def pole():
    c = Canvas(136, 5)
    c.paint(rect(1, 1, 134, 3), P.BAMBOO)
    for x in range(8, 134, 13):
        c.fill(rect(x, 1, x, 3), P.BAMBOO[3])
    c.outline()
    return c


def build_buildings():
    out = {"house": house(), "school": school(), "hall": hall(), "chapel": chapel(), "kubo": kubo(), "pole": pole()}
    for i in range(3):
        out[f"flag-{i}"] = flag(i)
    return out
