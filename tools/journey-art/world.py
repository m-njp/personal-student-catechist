"""The road, the sky, the hills, the four memories, and the Church at the end.

Every scene is drawn for a screen 270 pixels tall. Wide layers repeat every LOOP pixels, so they
are drawn with wrap around and never show a seam.
"""
import math
import random

import palette as P
from pix import INK, Canvas, capsule, ellipse, hexc, line, mix, poly, rect

LOOP = 960
SCREEN_H = 270
GROUND_TOP = 208
# Feet stand this many rows into the ground strip.
FEET_ROW = 18


def wrap_paint(c, mask, r, inner=True, soft=False):
    c.paint({(x % c.w, y) for x, y in mask}, r, inner=inner, soft=soft)


def wrap_fill(c, mask, color):
    c.fill({(x % c.w, y) for x, y in mask}, color)


def wave(x, terms):
    return sum(a * math.sin(2 * math.pi * x * k / LOOP + p) for a, k, p in terms)


# Sky -------------------------------------------------------------------------------------------


def sky(colors):
    """Flat bands joined by a four row ordered dither, stretched across the screen."""
    c = Canvas(4, SCREEN_H)
    band = SCREEN_H / len(colors)
    bayer = ((0, 2), (3, 1))
    for y in range(SCREEN_H):
        i = min(len(colors) - 1, int(y / band))
        into = y - i * band
        for x in range(4):
            if i > 0 and into < 4 and bayer[y % 2][x % 2] >= into:
                c.set(x, y, hexc(colors[i - 1]))
            else:
                c.set(x, y, hexc(colors[i]))
    return c


def sun():
    c = Canvas(56, 56)
    for rr, col, step in ((26, hexc("#fff6d8", 70), 2), (20, hexc("#fff2c0", 120), 2), (15, hexc("#fff0b0", 255), 0)):
        for x, y in ellipse(28, 28, rr, rr):
            if step == 0 or (x + y) % step == 0:
                c.set(x, y, col)
    c.paint(ellipse(28, 28, 11, 11), (hexc("#ffffff"), hexc("#fff6c8"), hexc("#ffe590"), hexc("#ffd068")), inner=False, soft=True)
    return c


def cloud(seed, w, h):
    rng = random.Random(seed)
    c = Canvas(w + 4, h + 4)
    blobs = set()
    n = max(3, w // 10)
    for i in range(n):
        bx = 4 + (w - 8) * (i + 0.5) / n + rng.uniform(-2, 2)
        top = h * 0.55 - rng.uniform(0, h * 0.4) * math.sin(math.pi * (i + 0.5) / n)
        r = rng.uniform(h * 0.28, h * 0.42)
        blobs |= ellipse(bx, top + r * 0.4, r * 1.25, r)
    blobs |= ellipse(w / 2 + 2, h * 0.78, w / 2 - 1, h * 0.22)
    blobs = {(x, y) for x, y in blobs if y <= h * 0.95}
    ramp = (hexc("#ffffff"), hexc("#fbfaff"), hexc("#e2e2f4"), hexc("#c4c4e2"))
    c.paint(blobs, ramp, inner=False, soft=True)
    # A flat shaded underside, the way clouds read in pixel art.
    for x, y in blobs:
        if y >= h * 0.72:
            c.set(x, y, ramp[2] if y < h * 0.86 else ramp[3])
    return c


# Far mountains and the volcano -----------------------------------------------------------------


def far_layer():
    h = 120
    c = Canvas(LOOP, h)
    back = (hexc("#dde6f4"), hexc("#c3d1ea"), hexc("#a9bbdd"), hexc("#93a6cf"))
    front = (hexc("#c9d8ec"), hexc("#a6badc"), hexc("#8ea3cb"), hexc("#7a8fbd"))

    def ridge(x, base, terms):
        return base + wave(x, terms)

    for layer, ramp, base, terms in (
        (0, back, 46, [(14, 3, 0.4), (7, 7, 1.3), (3, 17, 0.2)]),
        (1, front, 30, [(10, 2, 2.1), (6, 5, 0.7), (3, 13, 1.9)]),
    ):
        tops = []
        for x in range(LOOP):
            t = ridge(x, base, terms)
            if layer == 0:
                # A tall, perfect cone, like the volcanoes on the way to many Philippine towns.
                dx = min(abs(x - 330), LOOP - abs(x - 330))
                cone = 96 - dx * 0.46 - (0 if dx > 6 else (6 - dx) * 0.4)
                t = max(t, cone)
            tops.append(round(t))
        for x in range(LOOP):
            top = h - tops[x]
            rising = tops[(x + 1) % LOOP] - tops[x - 1]
            for y in range(top, h):
                depth = y - top
                if depth < 2:
                    col = ramp[0] if rising >= 0 else ramp[1]
                elif rising > 1 and depth < 10:
                    col = ramp[1] if (x + y) % 2 else ramp[0]
                elif rising < -1:
                    col = ramp[2] if depth < 30 else ramp[1]
                else:
                    col = ramp[1]
                c.set(x, y, col)
        # Ridges and gullies as thin shade lines running down the slopes.
        rng = random.Random(7 + layer)
        for _ in range(70):
            x0 = rng.randrange(LOOP)
            top = h - tops[x0]
            length = rng.randint(6, 26)
            drift = rng.choice((-1, 1)) * 0.35
            for i in range(length):
                xx = round(x0 + i * drift) % LOOP
                yy = top + 3 + i
                if yy < h and c.get(xx, yy)[3]:
                    c.set(xx, yy, ramp[2])
    # A wisp of cloud resting on the summit.
    for x, y in ellipse(338, h - 92, 14, 3) | ellipse(350, h - 90, 9, 2.5):
        c.set(x % LOOP, y, hexc("#f4f6fc") if (x + y) % 3 else hexc("#dde3f2"))
    # Haze where the mountains meet the plain.
    for y in range(h - 14, h):
        for x in range(LOOP):
            if (x + y) % 2 == 0 or y > h - 6:
                c.set(x, y, hexc("#d9e7ef"))
    return c


# Rice terraces and palms -----------------------------------------------------------------------


def palm(c, x, base, height, lean, rng, ramp_trunk, ramp_leaf, scale=1.0):
    tx, ty = x, base
    pts = []
    for i in range(height):
        t = i / height
        pts.append((tx + lean * t * t * height * 0.35, ty - i))
    for i, (px, py) in enumerate(pts):
        col = ramp_trunk[1] if i % 3 else ramp_trunk[2]
        c.set(round(px) % c.w, round(py), col)
        c.set(round(px + 1) % c.w, round(py), ramp_trunk[2])
    crown = pts[-1]
    for k in range(7):
        a = math.radians(-170 + k * 27 + rng.uniform(-6, 6))
        length = (7 + rng.uniform(0, 3)) * scale
        for i in range(int(length)):
            t = i / length
            fx = crown[0] + math.cos(a) * i
            fy = crown[1] + math.sin(a) * i * 0.7 + (t * t) * length * 0.55
            c.set(round(fx) % c.w, round(fy), ramp_leaf[1] if i < length * 0.6 else ramp_leaf[2])
            if i % 2 == 0 and i > 1:
                c.set(round(fx) % c.w, round(fy) + 1, ramp_leaf[2])
    c.set(round(crown[0]) % c.w, round(crown[1]) + 1, ramp_trunk[3])


def mid_layer():
    h = 100
    c = Canvas(LOOP, h)
    hill = (hexc("#c6e6a2"), hexc("#a5d184"), hexc("#86b56e"), hexc("#6a985e"))
    tops = [round(46 + wave(x, [(12, 3, 1.0), (7, 5, 2.6), (3, 11, 0.3)])) for x in range(LOOP)]
    for x in range(LOOP):
        top = h - tops[x]
        rising = tops[(x + 1) % LOOP] - tops[x - 1]
        for y in range(top, h):
            d = y - top
            col = hill[1]
            if d < 2:
                col = hill[0]
            elif rising < 0 and d < 14 and (x + y) % 2 == 0:
                col = hill[2]
            # Terraces: steps that follow the hill's shape, each with a lit lip and a shaded wall.
            band = (d + (x // 37) % 2) % 7
            if d > 4 and band == 0:
                col = hill[0]
            elif d > 4 and band == 1:
                col = hill[2]
            # Water in a few paddies catches the sky.
            if d > 6 and band in (3, 4) and (x // 23 + d // 7) % 5 == 0:
                col = hexc("#cde9f2") if (x + y) % 2 else hexc("#b4dcea")
            c.set(x, y, col)
    rng = random.Random(21)
    trunk = (hexc("#c9a888"), hexc("#a98a6c"), hexc("#8a6e58"), hexc("#6e5848"))
    leaf = (hexc("#a6d082"), hexc("#7fb468"), hexc("#619658"), hexc("#4a7a4c"))
    x = 6
    while x < LOOP:
        base = h - tops[x] + rng.randint(2, 10)
        palm(c, x, base, rng.randint(12, 18), rng.choice((-1, 1)) * rng.uniform(0.2, 0.8), rng, trunk, leaf, 0.85)
        x += rng.randint(26, 70)
    # A few far houses with red roofs.
    for hx in (120, 410, 455, 700, 880):
        base = h - tops[hx] + 12
        c.paint(rect(hx, base - 5, hx + 7, base), (hexc("#fff6ea"), hexc("#f0e2d0"), hexc("#d8c4b0"), hexc("#b49c88")), inner=False)
        c.paint(poly([(hx - 1.5, base - 5), (hx + 4, base - 9.5), (hx + 9.5, base - 5)]), (hexc("#f2a088"), hexc("#d8745e"), hexc("#b25a4c"), hexc("#8c4440")), inner=False)
        c.set(hx + 2, base - 3, hexc("#8c6c5c"))
    return c


# The tree line beside the road ------------------------------------------------------------------


def leaf_cluster(c, cx, cy, rx, ry, ramp, rng, blobs=7):
    mask = set()
    for _ in range(blobs):
        bx = cx + rng.uniform(-rx * 0.6, rx * 0.6)
        by = cy + rng.uniform(-ry * 0.5, ry * 0.4)
        br = rng.uniform(min(rx, ry) * 0.45, min(rx, ry) * 0.75)
        mask |= ellipse(bx, by, br * 1.15, br)
    mask = {(x % c.w, y) for x, y in mask}
    c.paint(mask, ramp, inner=False)
    # Each blob gets a lit crown and dark underside, then leafy speckles.
    for x, y in mask:
        n = (x * 13 + y * 7) % 17
        if n == 0:
            c.set(x, y, ramp[0])
        elif n == 5 and c.get(x, y) != ramp[0]:
            c.set(x, y, ramp[2])
    for x, y in mask:
        if (x, y - 4) not in mask and (x + y) % 3 == 0:
            c.set(x, (y + 1), ramp[0])
    for x, y in mask:
        if (x, y + 3) not in mask and (x + y) % 2 == 0:
            c.set(x, y, ramp[2])
    return mask


def mango_tree(c, x, base, rng, size=1.0):
    trunk_h = round(22 * size)
    wrap_paint(c, capsule(x, base, x + 1, base - trunk_h, 2.4 * size) | capsule(x, base - trunk_h * 0.6, x + 7 * size, base - trunk_h - 4, 1.4 * size), P.TRUNK)
    wrap_paint(c, capsule(x, base - trunk_h * 0.5, x - 6 * size, base - trunk_h - 3, 1.3 * size), P.TRUNK)
    leaf_cluster(c, x, base - trunk_h - 10 * size, 18 * size, 13 * size, P.LEAF_DARK, rng, 9)
    leaf_cluster(c, x + 2, base - trunk_h - 13 * size, 14 * size, 10 * size, P.LEAF, rng, 8)
    # Ripe mangoes.
    for _ in range(4):
        mx = round(x + rng.uniform(-10, 10) * size) % c.w
        my = round(base - trunk_h - rng.uniform(2, 8) * size)
        if c.get(mx, my)[3]:
            c.set(mx, my, P.CLOTH["yellow"][1])
            c.set(mx, my + 1, P.CLOTH["orange"][1])


def acacia(c, x, base, rng):
    wrap_paint(c, capsule(x, base, x + 3, base - 26, 2.6), P.TRUNK)
    wrap_paint(c, capsule(x + 3, base - 22, x - 12, base - 34, 1.5) | capsule(x + 3, base - 24, x + 18, base - 35, 1.5), P.TRUNK)
    leaf_cluster(c, x + 3, base - 40, 30, 7, P.LEAF_DARK, rng, 11)
    leaf_cluster(c, x + 1, base - 42, 24, 5, P.LEAF, rng, 9)


def banana(c, x, base, rng):
    wrap_paint(c, capsule(x, base, x, base - 18, 2.2), (hexc("#c8d88a"), hexc("#9cb860"), hexc("#7a9648"), hexc("#566c36")))
    for k, a in enumerate((-150, -120, -60, -30, -95)):
        rad = math.radians(a)
        length = 15 + rng.uniform(-2, 3)
        mask = set()
        for i in range(int(length)):
            t = i / length
            px = x + math.cos(rad) * i
            py = base - 18 + math.sin(rad) * i + t * t * 8
            w = 2.6 * math.sin(math.pi * min(1, t * 1.2 + 0.1))
            mask |= ellipse(px, py, max(0.6, w * 0.7), max(0.6, w))
        wrap_paint(c, mask, P.PALM if k % 2 else P.LEAF)
        # The rib down the middle of each leaf.
        for i in range(2, int(length) - 1):
            t = i / length
            wrap_fill(c, {(round(x + math.cos(rad) * i), round(base - 18 + math.sin(rad) * i + t * t * 8))}, P.PALM[0])


def bamboo(c, x, base, rng):
    for k in range(5):
        bx = x + k * 3 + rng.randint(-1, 1)
        height = rng.randint(40, 58)
        lean = rng.uniform(-0.15, 0.15)
        for i in range(height):
            px = round(bx + lean * i)
            col = P.BAMBOO[1] if i % 9 else P.BAMBOO[3]
            wrap_fill(c, {(px, base - i)}, col)
            wrap_fill(c, {(px + 1, base - i)}, P.BAMBOO[2] if i % 9 else P.BAMBOO[3])
            if i % 9 == 0 and i > 12:
                side = 1 if (i // 9 + k) % 2 else -1
                for j in range(1, 6):
                    wrap_fill(c, {(px + side * j, base - i - j // 2)}, P.PALM[1] if j < 4 else P.PALM[2])
                    wrap_fill(c, {(px + side * j, base - i - j // 2 + 1)}, P.PALM[2])


def bush(c, x, base, rng, flowers=None):
    mask = leaf_cluster(c, x, base - 6, 13, 7, P.LEAF, rng, 6)
    if flowers:
        for _ in range(12):
            fx, fy = rng.choice(sorted(mask))
            if fy < base - 3:
                c.set(fx, fy, flowers[1])
                c.set((fx + 1) % c.w, fy, flowers[0])


def fence(c, x0, x1, base):
    for x in range(x0, x1, 9):
        wrap_paint(c, rect(x, base - 15, x + 1, base) | {(x, base - 16)}, P.WOOD)
    for y in (base - 12, base - 6):
        wrap_paint(c, rect(x0, y, x1, y + 1), P.WOOD_DARK, inner=False)


def near_layer():
    h = 130
    c = Canvas(LOOP, h)
    rng = random.Random(5)
    base = h - 2
    flowers_pink = P.CLOTH["pink"]
    flowers_red = P.CLOTH["red"]
    for x, kind in ((30, "mango"), (110, "banana"), (150, "bush"), (205, "bamboo"), (290, "acacia"), (360, "bush"),
                    (410, "banana"), (470, "mango"), (560, "fence"), (640, "bamboo"), (700, "bush"), (760, "acacia"),
                    (845, "banana"), (900, "mango")):
        b = base - rng.randint(0, 4)
        if kind == "mango":
            mango_tree(c, x, b, rng, rng.uniform(0.9, 1.15))
        elif kind == "banana":
            banana(c, x, b, rng)
        elif kind == "bamboo":
            bamboo(c, x, b, rng)
        elif kind == "acacia":
            acacia(c, x, b, rng)
        elif kind == "bush":
            bush(c, x, b, rng, flowers_pink if x % 2 else flowers_red)
        elif kind == "fence":
            fence(c, x - 30, x + 40, b)
            bush(c, x + 50, b, rng, flowers_pink)
    return c


# The road --------------------------------------------------------------------------------------


def ground_tile():
    w, h = 256, SCREEN_H - GROUND_TOP
    c = Canvas(w, h)
    rng = random.Random(3)
    verge_end = 12
    road_end = 42
    for y in range(4, h):
        for x in range(w):
            if y < verge_end:
                col = P.GRASS[1] if y > 5 else P.GRASS[0]
                if (x * 7 + y * 3) % 11 == 0:
                    col = P.GRASS[2]
            elif y < verge_end + 2:
                col = P.GRASS[2] if (x + y) % 2 else P.DIRT[1]
            elif y < road_end:
                col = P.DIRT[1]
                if y < verge_end + 4:
                    col = P.DIRT[2] if (x + y) % 2 == 0 else P.DIRT[1]
                # Two worn tracks along the road.
                if y in (21, 22, 33, 34):
                    col = P.DIRT[2] if (x // 3 + y) % 4 else P.DIRT[1]
                if y in (25, 30) and (x // 5) % 3 == 0:
                    col = P.DIRT[0]
            elif y < road_end + 2:
                col = P.GRASS_DEEP[1] if (x + y) % 2 else P.DIRT[2]
            else:
                col = P.GRASS_DEEP[1]
                if (x * 5 + y * 11) % 13 == 0:
                    col = P.GRASS_DEEP[2]
                if (x * 3 + y * 7) % 23 == 0:
                    col = P.GRASS_DEEP[0]
            c.set(x, y, col)
    # Blades along the far verge, so the grass edge is never a straight line.
    for x in range(w):
        top = 4 - (1 + (x * 7) % 4 if (x * 5) % 3 == 0 else 0)
        for y in range(max(0, top), 6):
            c.set(x, y, P.GRASS[0] if y < 4 else P.GRASS[1])
    # Pebbles and tufts on the road.
    for _ in range(60):
        x, y = rng.randrange(w), rng.randrange(verge_end + 4, road_end - 2)
        c.set(x, y, P.STONE[1])
        c.set((x + 1) % w, y, P.STONE[2])
        c.set(x, y - 1, P.STONE[0])
    for _ in range(8):
        x, y = rng.randrange(w), rng.randrange(verge_end + 6, road_end - 4)
        c.fill({((x + dx) % w, y + dy) for dx, dy in ((0, 0), (1, -1), (2, 0), (-1, -1))}, P.GRASS[2])
    # Small flowers in the near grass.
    for _ in range(40):
        x, y = rng.randrange(w), rng.randrange(road_end + 4, h - 2)
        col = rng.choice((P.CLOTH["white"][1], P.CLOTH["yellow"][1], P.CLOTH["pink"][1]))
        c.set(x, y, col)
    return c


def tuft(seed):
    rng = random.Random(seed)
    c = Canvas(26, 16)
    for k in range(9):
        x0 = 4 + k * 2 + rng.uniform(-1, 1)
        height = rng.randint(6, 14)
        lean = rng.uniform(-0.4, 0.4)
        for i in range(height):
            col = P.GRASS_DEEP[0] if i > height - 3 else (P.GRASS_DEEP[1] if i > 3 else P.GRASS_DEEP[2])
            c.set(round(x0 + lean * i * i / height), 15 - i, col)
    if seed % 2:
        for fx in (8, 15):
            c.paint(ellipse(fx, 4, 1.8, 1.8), P.CLOTH["yellow"], inner=False)
            c.set(fx, 4, P.CLOTH["orange"][1])
    return c


def shadow():
    c = Canvas(24, 6)
    for x, y in ellipse(12, 3, 11, 2.6):
        if (x + y) % 2 == 0 or (abs(x - 12) < 7 and abs(y - 3) < 2):
            c.set(x, y, hexc("#2a1d34", 70))
    return c


def signpost():
    c = Canvas(30, 40)
    c.paint(rect(14, 12, 15, 39), P.WOOD_DARK)
    board = rect(2, 2, 27, 19)
    c.paint(board, P.WOOD)
    for y in (7, 13):
        c.fill(rect(4, y, 25, y), P.WOOD[2])
    c.paint(rect(5, 5, 24, 16), (hexc("#fff6de"), hexc("#f6ebcf"), hexc("#ddcca8"), hexc("#b49e78")), inner=False)
    for x, y in ((3, 3), (26, 3), (3, 18), (26, 18)):
        c.set(x, y, P.METAL[2])
    c.outline()
    return c


# Small living things and effects -----------------------------------------------------------------


def butterfly(frame, ramp):
    c = Canvas(9, 7)
    if frame == 0:
        c.paint(ellipse(2.5, 2.5, 2.5, 2.2) | ellipse(6.5, 2.5, 2.5, 2.2), ramp, inner=False)
        c.paint(ellipse(3, 5, 1.6, 1.3) | ellipse(6, 5, 1.6, 1.3), ramp, inner=False)
    else:
        c.paint(ellipse(4.5, 2, 1.4, 2) , ramp, inner=False)
    c.fill(rect(4, 1, 4, 5), INK)
    return c


def bird(frame):
    c = Canvas(9, 5)
    col = hexc("#5c5878")
    pts = [(0, 1), (1, 2), (2, 2), (3, 3), (4, 3), (5, 3), (6, 2), (7, 2), (8, 1)] if frame == 0 else [(0, 3), (1, 3), (2, 2), (3, 2), (4, 3), (5, 2), (6, 2), (7, 3), (8, 3)]
    c.fill(set(pts), col)
    return c


def sparkle(frame):
    c = Canvas(11, 11)
    size = (1, 3, 5, 2)[frame]
    for i in range(-size, size + 1):
        col = P.GOLD[0] if abs(i) < 2 else P.GOLD[1]
        c.set(5 + i, 5, col)
        c.set(5, 5 + i, col)
    if size >= 3:
        for d in (-1, 1):
            c.set(5 + d, 5 + d, P.GOLD[1])
            c.set(5 + d, 5 - d, P.GOLD[1])
    c.set(5, 5, hexc("#ffffff"))
    return c


def dust(frame):
    c = Canvas(18, 12)
    rng = random.Random(frame + 40)
    r = 2 + frame * 1.2
    puff = set()
    for k in range(4):
        puff |= ellipse(9 + (k - 1.5) * (2 + frame), 8 - frame * 0.6 + rng.uniform(-1, 1), r * 0.7, r * 0.6)
    ramp = (hexc("#fffaf0", 255), hexc("#f2e6d2"), hexc("#d8c6aa"), hexc("#b8a284"))
    if frame >= 3:
        puff = {p for p in puff if (p[0] + p[1]) % 2 == 0}
        c.fill(puff, ramp[1])
    else:
        c.paint(puff, ramp, inner=False, soft=True)
    return c


def heart(frame):
    c = Canvas(9, 8)
    m = ellipse(2.5, 2.5, 2.2, 2.2) | ellipse(6.5, 2.5, 2.2, 2.2) | poly([(0.4, 3), (8.6, 3), (4.5, 7.6)])
    c.paint(m, P.CLOTH["red"] if frame == 0 else P.CLOTH["pink"], inner=False)
    c.set(2, 2, hexc("#ffffff"))
    return c


def dove(frame):
    """The dove from Lesson 1, flying: wings up, level, down, level."""
    c = Canvas(26, 20)
    white = (hexc("#ffffff"), hexc("#f8f8ff"), hexc("#d8dcf2"), hexc("#a8acd2"))
    body = ellipse(12, 11, 7, 3.4) | ellipse(18.5, 9.2, 2.8, 2.6) | poly([(4, 10), (1, 8), (0.5, 13), (5, 12.5)])
    wing_tip = {0: (10, 0.5), 1: (6, 6), 2: (9, 18), 3: (6, 7)}[frame]
    wing = poly([(9, 10), (15, 9.5), (wing_tip[0] + 3, wing_tip[1]), wing_tip])
    if frame in (0, 1, 3):
        c.paint(wing, deeper(white), inner=False)
    c.paint(body, white)
    if frame == 2:
        c.paint(wing, white)
    else:
        near = poly([(10, 10.5), (16, 10), (wing_tip[0] + 6, wing_tip[1] + 2), (wing_tip[0] + 2, wing_tip[1] + 1)])
        c.paint(near, white)
    c.set(19, 8, INK)
    c.fill({(21, 9), (22, 9), (21, 10)}, P.CLOTH["orange"][1])
    # The olive branch it carries.
    c.fill(line(20, 11, 24, 14), P.LEAF[2])
    c.fill({(22, 13), (24, 13), (23, 15)}, P.LEAF[1])
    c.outline()
    return c


def deeper(r, t=0.2):
    return tuple(mix(col, INK, t) for col in r)


# Memory 1: the wall ------------------------------------------------------------------------------

WALL_W, WALL_H = 132, 86
BRICK_W, BRICK_H = 12, 6


def wall_bricks():
    """Running bond, laid from the bottom row up."""
    bricks = []
    rows = WALL_H // BRICK_H
    for row in range(rows):
        y = WALL_H - (row + 1) * BRICK_H
        offset = 0 if row % 2 == 0 else -BRICK_W // 2
        x = offset
        while x < WALL_W:
            x0, x1 = max(0, x), min(WALL_W, x + BRICK_W)
            if x1 - x0 >= 3:
                bricks.append([x0, y, x1 - x0, BRICK_H])
            x += BRICK_W
    return bricks


def mural():
    """The dove of Lesson 1, painted on the bricks: a warm halo, golden rays, a heart, and open wings."""
    c = Canvas(WALL_W, WALL_H)
    rng = random.Random(9)
    tones = [P.BRICK, (hexc("#f49a78"), hexc("#d87256"), hexc("#b05440"), hexc("#7a3630")), (hexc("#ea8466"), hexc("#c45a42"), hexc("#9c4436"), hexc("#6e2c2a"))]
    for b in wall_bricks():
        x0, y0, bw, bh = b
        r = rng.choice(tones)
        for y in range(y0, y0 + bh):
            for x in range(x0, x0 + bw):
                col = r[1]
                if y == y0 + 1:
                    col = r[0]
                elif y == y0 + bh - 1 or x == x0 + bw - 1:
                    col = r[2]
                elif (x * 7 + y * 5) % 13 == 0:
                    col = r[2]
                c.set(x, y, col)
    cx, cy = WALL_W / 2, 40
    cream = hexc("#fff3d2")
    for x, y in ellipse(cx, cy, 25, 25):
        d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
        if d < 21 or (d < 25 and (x + y) % 2 == 0):
            c.set(x, y, cream if d < 17 else hexc("#ffe4a6"))
    for k in range(28):
        a = 2 * math.pi * k / 28
        r0, r1 = 26, 34 + (6 if k % 2 else 0)
        for i in range(r0, r1):
            x, y = round(cx + math.cos(a) * i), round(cy + math.sin(a) * i)
            if 0 <= y < WALL_H:
                c.set(x, y, P.GOLD[1] if i < r1 - 2 else P.GOLD[2])
    heart = ellipse(cx - 2.5, 23, 3, 3) | ellipse(cx + 2.5, 23, 3, 3) | poly([(cx - 5.6, 24), (cx + 5.6, 24), (cx, 30.5)])
    c.paint(heart, (hexc("#ffb0a8"), hexc("#ee7a72"), hexc("#c85456"), hexc("#94384a")), inner=False)
    c.set(round(cx - 3), 22, hexc("#ffffff"))
    white = (hexc("#ffffff"), hexc("#fbf9ff"), hexc("#dcdcf0"), hexc("#a8a8cc"))
    for side in (-1, 1):
        wing = poly([(cx + side * 4, 40), (cx + side * 16, 30), (cx + side * 34, 18), (cx + side * 40, 22), (cx + side * 36, 32), (cx + side * 26, 44), (cx + side * 10, 50)])
        c.paint(wing, white, inner=False, soft=True)
        # Rows of feathers across each wing.
        for row, (r_in, r_out) in enumerate(((10, 20), (18, 30), (26, 40))):
            for t in range(0, 12):
                a = math.radians(-35 + t * 6)
                x = cx + side * (r_in + (r_out - r_in) * t / 12)
                y = 44 - (row * 5) - t * 1.6
                c.set(round(x), round(y), white[2])
                c.set(round(x), round(y) + 1, white[3] if row == 2 else white[2])
    tail = poly([(cx - 4, 54), (cx + 4, 54), (cx + 9, 70), (cx - 9, 70)])
    c.paint(tail, white, inner=False, soft=True)
    for x in (-6, -3, 0, 3, 6):
        c.fill(line(cx + x * 0.4, 56, cx + x, 69), white[2])
    body = ellipse(cx, 47, 6.5, 10)
    c.paint(body, white, inner=False, soft=True)
    c.shade_band(body, white, "right", 2)
    head = ellipse(cx + 0.5, 35, 4.2, 4.2)
    c.paint(head, white, inner=False, soft=True)
    c.set(round(cx + 2), 34, hexc("#2a1d34"))
    c.fill({(round(cx + 5), 35), (round(cx + 6), 35), (round(cx + 5), 36)}, P.CLOTH["orange"][1])
    c.fill({(round(cx - 1), 57), (round(cx), 58), (round(cx + 1), 57)}, P.CLOTH["orange"][2])
    # Mortar shows through the paint, so it reads as a wall, not a poster.
    for b in wall_bricks():
        x0, y0, bw, bh = b
        for x in range(x0, x0 + bw):
            c.set(x, y0, mix(c.get(x, y0), MORTAR_LINE, 0.65))
        for y in range(y0, y0 + bh):
            c.set(x0, y, mix(c.get(x0, y), MORTAR_LINE, 0.65))
    return c


MORTAR_LINE = hexc("#e6d8c0")


def wall_pieces():
    color = mural()
    dots = Canvas(WALL_W, WALL_H)
    paper = hexc("#f6efe2")
    ink = hexc("#3b4878")
    mortar_rows = {b[1] for b in wall_bricks()}
    for b in wall_bricks():
        x0, y0, bw, bh = b
        for y in range(y0, y0 + bh):
            for x in range(x0, x0 + bw):
                dots.set(x, y, mix(paper, INK, 0.22) if (y == y0 or x == x0) else paper)
    # The same picture as halftone dots, the way the pupils first saw the wall in Lesson 1.
    cell = 4
    for cy in range(0, WALL_H, cell):
        for cx in range(0, WALL_W, cell):
            lum = 0
            n = 0
            for y in range(cy, min(WALL_H, cy + cell)):
                for x in range(cx, min(WALL_W, cx + cell)):
                    r, g, bb, _ = color.get(x, y)
                    lum += (0.3 * r + 0.59 * g + 0.11 * bb) / 255
                    n += 1
            radius = (1 - lum / n) * 2.6
            if radius > 0.4:
                for x, y in ellipse(cx + cell / 2, cy + cell / 2, radius, radius):
                    if 0 <= x < WALL_W and 0 <= y < WALL_H and y not in mortar_rows:
                        dots.set(x, y, ink)
    return color, dots


def wall_footing():
    c = Canvas(WALL_W + 12, 10)
    for i, x in enumerate(range(0, WALL_W + 12, 9)):
        c.paint(rect(x, 1 + i % 2, x + 8, 9), P.STONE)
    return c


def mortar_bucket():
    c = Canvas(24, 18)
    c.paint(poly([(3, 6), (17, 6), (15.5, 17), (4.5, 17)]), P.METAL)
    c.paint(ellipse(10, 6, 7, 1.8), P.MORTAR, inner=False)
    c.fill(line(3, 6, 10, 1) | line(10, 1, 17, 6), P.METAL[3])
    c.paint(poly([(15, 5), (22, 2), (23, 4), (17, 7)]), P.METAL)
    c.paint(rect(13, 4, 15, 5), P.WOOD)
    c.outline()
    return c


def ladder():
    c = Canvas(20, 72)
    for x0 in (2, 12):
        c.paint(capsule(x0 + 4, 2, x0, 70, 1.2), P.WOOD)
    for y in range(8, 68, 8):
        t = y / 70
        c.paint(rect(round(6 - 4 * t), y, round(16 - 4 * t), y + 1), P.WOOD_DARK, inner=False)
    c.outline()
    return c


# Parts the Church shares with other buildings ----------------------------------------------------


def window(c, x, y, w, h, glass=P.GLASS, frame=P.WOOD):
    c.paint(rect(x - 1, y - 1, x + w, y + h), frame)
    c.paint(rect(x, y, x + w - 1, y + h - 1), glass, inner=False)
    c.fill(rect(x + w // 2, y, x + w // 2, y + h - 1) | rect(x, y + h // 2, x + w - 1, y + h // 2), frame[2])
    c.set(x, y, glass[0])
    c.set(x + 1, y, glass[0])


def tile_roof(c, pts, ramp):
    mask = poly(pts)
    c.paint(mask, ramp)
    ys = sorted({y for _, y in mask})
    for x, y in mask:
        if (y - ys[0]) % 4 == 3:
            c.set(x, y, ramp[2])
        elif (x + (y // 4) * 2) % 5 == 0:
            c.set(x, y, ramp[2])
    return mask


# Memory 4: the globe ------------------------------------------------------------------------------

LAND = {
    "na": [(-165, 65), (-140, 70), (-100, 72), (-80, 66), (-62, 56), (-65, 45), (-80, 31), (-97, 26), (-105, 20), (-90, 15), (-80, 8), (-100, 17), (-110, 24), (-118, 33), (-125, 41), (-127, 50), (-140, 59), (-165, 60)],
    "gl": [(-55, 80), (-25, 82), (-20, 70), (-45, 60), (-55, 70)],
    "sa": [(-80, 10), (-60, 11), (-35, -5), (-40, -22), (-55, -35), (-68, -55), (-75, -50), (-72, -20), (-82, -4)],
    "eu": [(-10, 36), (0, 44), (-5, 48), (5, 55), (10, 59), (20, 70), (30, 71), (42, 66), (40, 45), (28, 40), (20, 38), (10, 44), (0, 38)],
    "uk": [(-6, 50), (2, 51), (-2, 59), (-6, 57)],
    "af": [(-17, 15), (-15, 28), (-5, 36), (10, 37), (32, 31), (43, 12), (51, 12), (40, -5), (40, -15), (32, -29), (20, -35), (13, -20), (10, 0), (-8, 4)],
    "mg": [(44, -13), (50, -15), (47, -25), (43, -22)],
    "ar": [(35, 30), (48, 30), (58, 22), (52, 15), (43, 13), (35, 25)],
    "as": [(40, 45), (40, 66), (60, 70), (80, 74), (110, 76), (140, 72), (170, 69), (180, 65), (160, 60), (140, 55), (130, 42), (122, 30), (120, 22), (108, 18), (105, 9), (100, 13), (95, 18), (90, 22), (80, 8), (72, 20), (60, 25), (50, 28), (45, 40)],
    "id": [(95, 5), (105, -6), (120, -9), (140, -7), (130, 0), (118, 4), (105, 2)],
    "jp": [(130, 31), (141, 35), (143, 45), (138, 39)],
    "au": [(114, -22), (130, -12), (142, -11), (153, -25), (150, -38), (140, -38), (130, -32), (115, -34)],
    "nz": [(172, -35), (178, -38), (170, -46), (167, -45)],
    "an": [(-180, -70), (180, -70), (180, -90), (-180, -90)],
}
PHILIPPINES = [(119, 19), (127, 14), (126.5, 6), (122, 5.5), (119.5, 10), (120, 15)]


def inside(pt, polygon):
    x, y = pt
    hit = False
    j = len(polygon) - 1
    for i in range(len(polygon)):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def world_map(w=144, h=72):
    grid = [[0] * w for _ in range(h)]
    for j in range(h):
        lat = 90 - (j + 0.5) * 180 / h
        for i in range(w):
            lon = -180 + (i + 0.5) * 360 / w
            if inside((lon, lat), PHILIPPINES):
                grid[j][i] = 2
            elif any(inside((lon, lat), p) for p in LAND.values()):
                grid[j][i] = 1
    return grid


GLOBE_FRAMES = 16
GLOBE_R = 20


def globe(frame, grid):
    c = Canvas(GLOBE_R * 2 + 4, GLOBE_R * 2 + 4)
    h, w = len(grid), len(grid[0])
    turn = 2 * math.pi * frame / GLOBE_FRAMES
    tilt = math.radians(14)
    light = (-0.55, -0.6, 0.58)
    ocean = (hexc("#c8eef8"), hexc("#7cc6e6"), hexc("#4e98c8"), hexc("#326aa0"))
    land = (hexc("#c6ec92"), hexc("#86c45e"), hexc("#5a9a4a"), hexc("#3c6e3c"))
    dry = (hexc("#f6e4a6"), hexc("#dcc07a"), hexc("#b8985a"), hexc("#86683e"))
    ice = (hexc("#ffffff"), hexc("#eef2fa"), hexc("#ccd4ea"), hexc("#a4acd0"))
    home = (hexc("#fffbe0"), hexc("#ffe066"), hexc("#f2b23a"), hexc("#c07a2a"))
    cx = cy = GLOBE_R + 2
    for y in range(c.h):
        for x in range(c.w):
            nx = (x + 0.5 - cx) / GLOBE_R
            ny = (y + 0.5 - cy) / GLOBE_R
            d = nx * nx + ny * ny
            if d > 1:
                continue
            nz = math.sqrt(1 - d)
            # Tilt the axis a little, then spin.
            ty = ny * math.cos(tilt) - nz * math.sin(tilt)
            tz = ny * math.sin(tilt) + nz * math.cos(tilt)
            lat = math.degrees(math.asin(max(-1, min(1, -ty))))
            lon = math.degrees(math.atan2(nx, tz) + turn)
            lon = (lon + 180) % 360 - 180
            gi = min(w - 1, int((lon + 180) / 360 * w))
            gj = min(h - 1, int((90 - lat) / 180 * h))
            cell = grid[gj][gi]
            if cell == 2:
                r = home
            elif cell == 1:
                r = ice if abs(lat) > 64 else (dry if 14 < abs(lat) < 32 and (lon < 60 and lon > -20 or lon > 115) else land)
            else:
                r = ocean
            lit = nx * light[0] + ny * light[1] + nz * light[2]
            if lit > 0.82:
                col = r[0]
            elif lit > 0.42:
                col = r[1] if not (lit < 0.48 and (x + y) % 2) else r[2]
            elif lit > 0.05:
                col = r[2] if not (lit < 0.1 and (x + y) % 2) else r[3]
            else:
                col = r[3]
            c.set(x, y, col)
    # A shine on the glass.
    for x, y in ((cx - 9, cy - 11), (cx - 8, cy - 11), (cx - 10, cy - 10), (cx - 11, cy - 8), (cx - 11, cy - 9)):
        c.set(x, y, hexc("#ffffff"))
    c.outline(hexc("#2a3358"))
    return c


def globe_stand():
    c = Canvas(56, 70)
    # The meridian ring sits around the globe, the stand below it.
    ring = {p for p in ellipse(28, 24, 24, 24) if p not in ellipse(28, 24, 22.2, 22.2)}
    c.paint({p for p in ring if p[0] > 26}, P.GOLD, inner=False)
    c.paint(rect(26, 47, 29, 58), P.WOOD)
    c.paint(poly([(16, 69), (40, 69), (36, 59), (20, 59)]), P.WOOD)
    c.paint(rect(14, 66, 42, 69), P.WOOD_DARK)
    c.outline()
    return c


def ring_glow(r_out, r_in, color, alpha):
    size = r_out * 2 + 2
    c = Canvas(size, size)
    for x, y in ellipse(size / 2, size / 2, r_out, r_out):
        d = math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2)
        if d < r_in:
            c.set(x, y, hexc(color, alpha))
        elif (x + y) % 2 == 0 and d < (r_in + r_out) / 2:
            c.set(x, y, hexc(color, alpha))
        elif (x % 2 == 0 and y % 2 == 0):
            c.set(x, y, hexc(color, alpha))
    return c


# The Church -----------------------------------------------------------------------------------------

CHURCH_W, CHURCH_H = 220, 178
DOOR = (96, 128, 28, 46)  # x, y, w, h of the open doorway, from the church's top left


def church():
    c = Canvas(CHURCH_W, CHURCH_H)
    base = CHURCH_H - 1
    stone = (hexc("#fff7e6"), hexc("#f2e2c4"), hexc("#d6bf98"), hexc("#a8906c"))
    trim = (hexc("#fffaf0"), hexc("#e8d6b4"), hexc("#c4aa82"), hexc("#94795a"))
    rng = random.Random(11)

    # The nave's roof behind the facade.
    tile_roof(c, [(54, base - 106), (110, base - 136), (166, base - 106)], P.ROOF_RED)

    # Bell tower on the left.
    tx0, tx1 = 14, 58
    c.paint(rect(tx0, base - 150, tx1, base), stone)
    for y in (base - 52, base - 100, base - 150):
        c.paint(rect(tx0 - 3, y - 3, tx1 + 3, y), trim)
    for (y0, y1) in ((base - 96, base - 60), (base - 146, base - 106)):
        arch = rect(tx0 + 12, y0 + 8, tx1 - 12, y1) | ellipse((tx0 + tx1) / 2 + 0.5, y0 + 9, (tx1 - tx0 - 24) / 2 + 0.5, 8)
        c.paint(arch, (hexc("#5a4664"), hexc("#3e3048"), hexc("#2e2438"), hexc("#20182a")), inner=False)
    bell_y = base - 132
    c.fill(rect(28, bell_y - 4, 44, bell_y - 3), P.WOOD_DARK[1])
    window(c, 31, base - 40, 10, 16, (hexc("#ffe8a8"), hexc("#f2b85a"), hexc("#d48c44"), hexc("#a0602c")))
    # The tower's dome and cross.
    c.paint(ellipse((tx0 + tx1) / 2 + 0.5, base - 153, 18, 13) - rect(0, base - 153, 300, 400), P.ROOF_RED)
    c.paint(rect(35, base - 176, 37, base - 165), P.GOLD)
    c.paint(rect(31, base - 172, 41, base - 170), P.GOLD)

    # The facade.
    fx0, fx1 = 66, 158
    c.paint(rect(fx0, base - 104, fx1, base), stone)
    # The pediment with its rounded shoulders.
    ped = poly([(fx0, base - 104), (fx0 + 10, base - 118), (112, base - 140), (fx1 - 10, base - 118), (fx1, base - 104)])
    c.paint(ped, stone)
    c.fill(line(fx0, base - 104, 112, base - 141) | line(112, base - 141, fx1, base - 104), trim[2])
    for y in (base - 104, base - 56):
        c.paint(rect(fx0 - 4, y - 3, fx1 + 4, y), trim)
    # Pilasters.
    for px_ in (fx0 + 2, fx0 + 22, fx1 - 28, fx1 - 8):
        c.paint(rect(px_, base - 101, px_ + 5, base - 2), trim)
    # The rose window, in stained glass.
    rose_c = (112, base - 119)
    colors = [P.CLOTH["red"][1], P.CLOTH["blue"][1], P.GOLD[1], P.CLOTH["green"][1], P.CLOTH["purple"][1], P.CLOTH["skyblue"][1]]
    c.paint(ellipse(rose_c[0] + 0.5, rose_c[1] + 0.5, 11, 11), trim)
    for x, y in ellipse(rose_c[0] + 0.5, rose_c[1] + 0.5, 9, 9):
        a = math.atan2(y - rose_c[1], x - rose_c[0])
        d = math.hypot(x - rose_c[0], y - rose_c[1])
        k = int((a + math.pi) / (2 * math.pi) * 12) % 6
        col = colors[k] if d > 3 else P.GOLD[0]
        if d > 3 and abs(math.sin(a * 6)) < 0.18:
            col = P.WOOD_DARK[2]
        c.set(x, y, col)
    # Side windows with stained glass.
    for wx in (fx0 + 10, fx1 - 18):
        arch = rect(wx, base - 92, wx + 8, base - 66) | ellipse(wx + 4.5, base - 92, 4.5, 4)
        c.paint(arch, trim)
        inner = rect(wx + 1, base - 91, wx + 7, base - 67) | ellipse(wx + 4.5, base - 91, 3.5, 3)
        for x, y in inner:
            c.set(x, y, colors[((x - wx) // 2 + (y // 3)) % len(colors)])
        c.fill(rect(wx + 4, base - 94, wx + 4, base - 67), P.WOOD_DARK[2])
    # A niche with a small statue of Mary above the door.
    c.paint(rect(106, base - 92, 118, base - 66) | ellipse(112.5, base - 92, 6.5, 5), (hexc("#cfe0ee"), hexc("#a8c4dc"), hexc("#86a4c2"), hexc("#64809e")), inner=False)
    c.paint(ellipse(112.5, base - 86, 2.2, 2.4), P.SKIN["light"], inner=False)
    c.paint(poly([(110, base - 84), (115, base - 84), (116.5, base - 68), (108.5, base - 68)]), P.CLOTH["white"], inner=False)
    c.paint(poly([(109, base - 88), (116, base - 88), (117.5, base - 70), (107.5, base - 70)]) - poly([(110, base - 84), (115, base - 84), (116.5, base - 68), (108.5, base - 68)]), P.CLOTH["skyblue"], inner=False)
    for x, y in ((112, base - 90), (110, base - 89), (114, base - 89)):
        c.set(x, y, P.GOLD[1])

    # The open doorway, warm light inside, the altar at the far end.
    dx, dy, dw, dh = DOOR
    door = rect(dx, dy + 10, dx + dw - 1, dy + dh) | ellipse(dx + dw / 2, dy + 11, dw / 2, 11)
    c.paint(rect(dx - 4, dy - 3, dx + dw + 3, dy + dh) | ellipse(dx + dw / 2, dy + 9, dw / 2 + 4, 13), trim)
    inside_light = (hexc("#fffbea"), hexc("#ffeeb4"), hexc("#ffd98a"), hexc("#f2b866"))
    for x, y in door:
        depth = (y - dy) / dh
        col = inside_light[0] if depth < 0.45 else inside_light[1]
        if (x + y) % 2 == 0 and 0.4 < depth < 0.5:
            col = inside_light[1]
        c.set(x, y, col)
    # The aisle leading in, and the altar with its cross and candles.
    ax = dx + dw // 2
    c.fill(poly([(ax - 2, dy + 26), (ax + 2, dy + 26), (ax + 9, dy + dh), (ax - 9, dy + dh)]), hexc("#e8b878"))
    c.paint(rect(ax - 6, dy + 20, ax + 5, dy + 25), P.GOLD)
    c.paint(rect(ax - 1, dy + 9, ax, dy + 19), P.GOLD, inner=False)
    c.paint(rect(ax - 3, dy + 12, ax + 2, dy + 13), P.GOLD, inner=False)
    for cx_ in (ax - 5, ax + 4):
        c.fill(rect(cx_, dy + 16, cx_, dy + 19), hexc("#ffffff"))
        c.set(cx_, dy + 15, hexc("#ff9a3a"))
    # Pews on each side of the aisle.
    for row in range(3):
        y = dy + 30 + row * 5
        spread = 4 + row * 2
        c.fill(rect(dx + 1, y, ax - spread, y + 1), P.WOOD[2])
        c.fill(rect(ax + spread, y, dx + dw - 2, y + 1), P.WOOD[2])
    # The two doors, swung wide open.
    for side in (-1, 1):
        if side < 0:
            leaf = poly([(dx - 1, dy + 6), (dx + 5, dy + 12), (dx + 5, dy + dh + 1), (dx - 1, dy + dh + 1)])
        else:
            leaf = poly([(dx + dw, dy + 6), (dx + dw - 6, dy + 12), (dx + dw - 6, dy + dh + 1), (dx + dw, dy + dh + 1)])
        c.paint(leaf, P.WOOD_DARK)
        for x, y in leaf:
            if y % 7 == 0:
                c.set(x, y, P.WOOD_DARK[2])

    # Steps.
    for i in range(3):
        c.paint(rect(dx - 18 - i * 6, base - 4 + i * 2 - 4, dx + dw + 17 + i * 6, base - 2 + i * 2 - 2), P.STONE, inner=False)
    c.paint(rect(fx0 - 8, base - 1, fx1 + 8, base), P.STONE, inner=False)

    # Lamps and bougainvillea at the corners.
    for lx in (fx0 - 2, fx1 + 2):
        c.paint(rect(lx, base - 70, lx + 1, base - 60), P.METAL[2:] + P.METAL[2:], inner=False)
        c.paint(rect(lx - 2, base - 76, lx + 3, base - 70), (hexc("#fffbe0"), hexc("#ffe9a0"), hexc("#ffd26a"), hexc("#d8a040")))
    for bx in (fx0 - 4, fx1 + 6, 190):
        mask = leaf_cluster(c, bx, base - 10, 12, 9, P.LEAF, rng, 7)
        for _ in range(26):
            x, y = rng.choice(sorted(mask))
            if c.get(x, y)[3]:
                c.set(x, y, P.CLOTH["pink"][1] if (x + y) % 3 else P.CLOTH["pink"][0])
    # The right wing of the church.
    c.paint(rect(166, base - 70, 204, base - 12), stone)
    tile_roof(c, [(162, base - 70), (185, base - 86), (208, base - 70)], P.ROOF_RED)
    arch = rect(180, base - 56, 190, base - 30) | ellipse(185.5, base - 56, 5.5, 5)
    c.paint(arch, trim)
    for x, y in rect(181, base - 55, 189, base - 31) | ellipse(185.5, base - 55, 4.5, 4):
        c.set(x, y, colors[((x - 181) // 2 + y // 3) % len(colors)])
    # The cross on top of the facade.
    c.paint(rect(111, base - 160, 113, base - 140), P.GOLD)
    c.paint(rect(106, base - 155, 118, base - 153), P.GOLD)
    # Stone urns on the cornice and scrolls curling beside the pediment.
    for ux in (fx0 - 2, fx1 + 2, fx0 + 10, fx1 - 10):
        c.paint(ellipse(ux + 0.5, base - 111, 3, 2.6) | rect(ux - 1, base - 109, ux + 2, base - 106), trim)
        c.paint(ellipse(ux + 0.5, base - 115, 1.2, 1.2), trim, inner=False)
    for side in (-1, 1):
        sx = 112 + side * 34
        for k in range(10):
            a = k * 0.62
            c.set(round(sx + side * math.cos(a) * (5 - k * 0.4)), round(base - 116 + math.sin(a) * (5 - k * 0.4)), trim[3])
    # Two small saints in niches beside the door.
    for nx, robe in ((74, P.CLOTH["brown"]), (141, P.CLOTH["red"])):
        c.paint(rect(nx, base - 46, nx + 9, base - 20) | ellipse(nx + 5, base - 46, 5, 4), (hexc("#cfe0ee"), hexc("#a8c4dc"), hexc("#86a4c2"), hexc("#64809e")), inner=False)
        c.paint(ellipse(nx + 5, base - 41, 2, 2.2), P.SKIN["light"], inner=False)
        c.paint(poly([(nx + 3, base - 38), (nx + 7, base - 38), (nx + 8.5, base - 22), (nx + 1.5, base - 22)]), robe, inner=False)
        c.paint(rect(nx - 1, base - 20, nx + 10, base - 18), trim, inner=False)
    # Lanterns hanging by the door.
    for lx in (90, 132):
        c.fill(rect(lx, base - 62, lx, base - 56), P.METAL[3])
        c.paint(poly([(lx - 2.5, base - 56), (lx + 2.5, base - 56), (lx + 1.5, base - 49), (lx - 1.5, base - 49)]), P.LIGHT)
    # Weathered stone: a few darker and lighter flecks across the walls.
    for x in range(c.w):
        for y in range(c.h):
            col = c.get(x, y)
            if col in (stone[1],) and (x * 17 + y * 31) % 29 == 0:
                c.set(x, y, stone[2])
            elif col in (stone[1],) and (x * 13 + y * 7) % 37 == 0:
                c.set(x, y, stone[0])
    c.outline()
    return c


def door_light():
    """Warm light spilling from the doors across the steps and the road."""
    dw = DOOR[2]
    c = Canvas(dw + 90, 40)
    mid = c.w / 2
    for y in range(c.h):
        half = dw / 2 + y * 1.1
        for x in range(c.w):
            if abs(x + 0.5 - mid) <= half:
                fade = y / c.h
                if fade < 0.45 or (x + y) % 2 == 0 and fade < 0.8 or (x % 2 == 0 and y % 2 == 0):
                    c.set(x, y, hexc("#ffe7a0", 120))
    return c


def rays():
    c = Canvas(200, 150)
    for k in range(9):
        a = math.radians(-160 + k * 17.5)
        for i in range(30, 140):
            w = 1 + i // 40
            for j in range(-w, w + 1):
                x = 100 + math.cos(a) * i - math.sin(a) * j
                y = 140 + math.sin(a) * i + math.cos(a) * j
                if (round(x) + round(y)) % 2 == 0:
                    c.set(round(x), round(y), hexc("#fff3c4", 140))
    return c


def build_world():
    out = {}
    out["sky-day"] = sky(["#6fb6e8", "#7cbdeb", "#89c4ed", "#97cbef", "#a5d2f0", "#b4d9f1", "#c3e0f1", "#d2e7f0", "#e1edeb"])
    out["sky-gold"] = sky(["#6f74bc", "#8a7cbc", "#a585b6", "#c38ea8", "#dc979a", "#eea48c", "#f6b684", "#f9ca8c", "#fbdca2"])
    out["sun"] = sun()
    for i, (w, h) in enumerate(((70, 24), (50, 18), (34, 12), (60, 20))):
        out[f"cloud-{i}"] = cloud(i * 17 + 3, w, h)
    out["far"] = far_layer()
    out["mid"] = mid_layer()
    out["near"] = near_layer()
    out["ground"] = ground_tile()
    for i in range(3):
        out[f"tuft-{i}"] = tuft(i)
    out["shadow"] = shadow()
    out["sign"] = signpost()
    for i in range(2):
        out[f"butterfly-{i}"] = butterfly(i, P.CLOTH["yellow"])
        out[f"butterfly-pink-{i}"] = butterfly(i, P.CLOTH["pink"])
        out[f"bird-{i}"] = bird(i)
        out[f"heart-{i}"] = heart(i)
    for i in range(4):
        out[f"sparkle-{i}"] = sparkle(i)
        out[f"dust-{i}"] = dust(i)
        out[f"dove-{i}"] = dove(i)
    color, dots = wall_pieces()
    out["wall-color"] = color
    out["wall-dots"] = dots
    out["wall-footing"] = wall_footing()
    out["bucket"] = mortar_bucket()
    out["ladder"] = ladder()
    grid = world_map()
    for i in range(GLOBE_FRAMES):
        out[f"globe-{i}"] = globe(i, grid)
    out["globe-stand"] = globe_stand()
    out["glow-small"] = ring_glow(34, 24, "#fff1b0", 90)
    out["glow-big"] = ring_glow(130, 90, "#ffe9a6", 70)
    out["church"] = church()
    out["door-light"] = door_light()
    out["rays"] = rays()
    return out


META = {
    "screenH": SCREEN_H,
    "groundTop": GROUND_TOP,
    "feetRow": FEET_ROW,
    "loop": LOOP,
    "globeFrames": GLOBE_FRAMES,
    "door": list(DOOR),
}
