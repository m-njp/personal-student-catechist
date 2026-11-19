"""Life along the road and around the plaza: vehicles, stalls, the sari-sari store, animals, and the
pieces of the fiesta at the end.
"""
import math
import random

import palette as P
from pix import INK, Canvas, capsule, ellipse, hexc, line, mix, poly, rect

SCREEN_W, SCREEN_H = 480, 270


def deeper(r, t=0.2):
    return tuple(mix(c, INK, t) for c in r)


def ramp4(*h):
    return tuple(hexc(x) for x in h)


DARK = ramp4("#6a5470", "#4e3c58", "#3a2c44", "#281e30")
TIRE = ramp4("#5c5468", "#3a3446", "#2a2534", "#1a1622")
CHROME = ramp4("#ffffff", "#dfe4ee", "#aab2c6", "#767e98")
SKINS = [P.SKIN["tan"], P.SKIN["brown"], P.SKIN["light"], P.SKIN["deep"]]
HAIRS = [P.HAIR["black"], P.HAIR["brown"], P.HAIR["black"], P.HAIR["gray"]]


def wheel(c, cx, cy, r, frame):
    c.paint(ellipse(cx, cy, r, r), TIRE)
    c.paint(ellipse(cx, cy, r * 0.55, r * 0.55), CHROME, inner=False)
    a0 = frame * math.pi / 4
    for k in range(4):
        a = a0 + k * math.pi / 2
        c.fill(line(cx, cy, cx + math.cos(a) * r * 0.5, cy + math.sin(a) * r * 0.5), CHROME[3])
    c.set(round(cx), round(cy), CHROME[2])


def passenger(c, x, y, k):
    skin = SKINS[k % 4]
    hair = HAIRS[k % 4]
    c.paint(ellipse(x, y, 3.2, 3.4), skin, inner=False)
    c.paint({p for p in ellipse(x, y - 1, 3.4, 3.2) if p[1] <= y - 1}, hair, inner=False)
    c.set(round(x + 1), round(y), P.EYE)
    c.paint(rect(x - 3, y + 3, x + 3, y + 7), P.CLOTH[["red", "blue", "yellow", "green", "pink"][k % 5]], inner=False)


def jeepney(frame):
    """A passenger jeepney facing right, painted bright, with people inside."""
    c = Canvas(150, 76)
    base = 66
    # Cab and passenger body.
    body = rect(6, 22, 112, base - 6)
    c.paint(body, CHROME)
    c.paint(rect(4, 14, 114, 22), P.CLOTH["white"])
    c.paint(rect(28, 5, 94, 13), P.CLOTH["yellow"])
    c.paint(rect(31, 7, 91, 11), P.CLOTH["white"], inner=False)
    c.paint(rect(2, 12, 116, 14), CHROME, inner=False)
    # Window openings, with passengers.
    for k, wx in enumerate(range(12, 100, 18)):
        c.paint(rect(wx, 25, wx + 14, 40), DARK, inner=False)
        passenger(c, wx + 7, 32, k + frame * 0)
        c.fill(rect(wx - 2, 24, wx - 1, 41), CHROME[2])
    # Bright stripes and painted scrolls along the side.
    for y, name in ((44, "red"), (47, "yellow"), (50, "blue")):
        c.fill(rect(7, y, 111, y + 2), P.CLOTH[name][1])
    for x in range(14, 106, 16):
        c.fill({(x, 54), (x + 1, 53), (x + 2, 53), (x + 3, 54), (x + 4, 55), (x + 5, 55)}, P.CLOTH["red"][2])
    # The long hood, grille, and lamp.
    hood = poly([(110, 34), (134, 38), (140, 42), (140, base - 6), (110, base - 6)])
    c.paint(hood, CHROME)
    c.fill(rect(112, 44, 139, 45), P.CLOTH["red"][1])
    c.paint(rect(136, 46, 141, base - 8), CHROME)
    for y in range(47, base - 8, 2):
        c.fill(rect(137, y, 140, y), CHROME[3])
    c.paint(ellipse(138, 41, 2, 2), ramp4("#ffffe6", "#fff2a6", "#e8c868", "#b89040"), inner=False)
    # Windshield and the driver.
    c.paint(rect(98, 24, 110, 38), P.GLASS, inner=False)
    passenger(c, 104, 31, 3)
    c.paint({p for p in ellipse(104, 28.5, 3.6, 2) if p[1] <= 28}, P.CLOTH["yellow"], inner=False)
    c.fill(line(112, 14, 120, 2), CHROME[3])
    c.set(121, 2, P.CLOTH["red"][1])
    # Fenders, bumper, and the step at the back.
    c.paint(rect(2, base - 7, 144, base - 4), CHROME)
    c.paint(rect(0, 44, 5, base - 6), CHROME)
    for wx in (28, 118):
        c.paint({p for p in ellipse(wx, base - 4, 12, 9) if p[1] <= base - 5}, deeper(CHROME, 0.25))
        wheel(c, wx, base - 1, 9, frame)
    c.outline()
    return c


def tricycle():
    c = Canvas(72, 54)
    base = 50
    blue = P.CLOTH["blue"]
    c.paint(rect(4, 10, 40, 14), P.CLOTH["white"])
    c.paint(rect(6, 14, 8, 30) | rect(36, 14, 38, 30), CHROME, inner=False)
    c.paint(poly([(2, 30), (42, 30), (44, base - 6), (4, base - 6)]), blue)
    c.fill(rect(4, 36, 42, 37), P.CLOTH["yellow"][1])
    c.paint(rect(10, 18, 34, 30), DARK, inner=False)
    passenger(c, 22, 23, 2)
    # The motorcycle and its rider.
    c.paint(poly([(42, 34), (62, 32), (66, 40), (44, 42)]), P.CLOTH["red"])
    c.fill(line(62, 32, 66, 22), CHROME[3])
    c.fill(rect(63, 22, 68, 22), CHROME[3])
    passenger(c, 54, 22, 1)
    c.paint({p for p in ellipse(54, 20, 3.8, 3) if p[1] <= 20}, P.CLOTH["white"], inner=False)
    for wx in (14, 62):
        wheel(c, wx, base - 5, 6, 0)
    c.outline()
    return c


def sorbetes_cart():
    """A sorbetes cart, painted in bright panels, with three lids and a hand bell."""
    c = Canvas(56, 56)
    base = 54
    panels = [P.CLOTH["pink"], P.CLOTH["yellow"], P.CLOTH["skyblue"]]
    c.paint(rect(4, 22, 46, 44), P.CLOTH["white"])
    for k, pr in enumerate(panels):
        x0 = 6 + k * 13
        c.paint(rect(x0, 24, x0 + 11, 42), pr, inner=False)
        c.fill({(x0 + 3, 30), (x0 + 4, 29), (x0 + 6, 29), (x0 + 7, 30), (x0 + 5, 33), (x0 + 5, 36)}, pr[3])
    for k in range(3):
        cx = 11 + k * 13
        c.paint(ellipse(cx, 20, 5.5, 2.2), CHROME)
        c.paint(ellipse(cx, 17.6, 2, 1.4), CHROME, inner=False)
    c.paint(rect(46, 26, 54, 28), P.WOOD)
    c.paint(poly([(51, 22), (54, 22), (55, 26), (50, 26)]), P.GOLD, inner=False)
    wheel(c, 12, base - 6, 6, 0)
    wheel(c, 38, base - 6, 6, 1)
    c.outline()
    return c


def fishball_cart():
    c = Canvas(60, 72)
    base = 70
    for k in range(6):
        a0, a1 = -math.pi + k * math.pi / 6, -math.pi + (k + 1) * math.pi / 6
        pts = [(30, 6), (30 + math.cos(a0) * 28, 18 + math.sin(a0) * 4), (30 + math.cos(a1) * 28, 18 + math.sin(a1) * 4)]
        c.paint(poly(pts + [(30 + math.cos(a1) * 28, 20), (30 + math.cos(a0) * 28, 20)]), P.CLOTH["red"] if k % 2 else P.CLOTH["white"], inner=False)
    c.paint(rect(29, 18, 30, 40), CHROME, inner=False)
    c.paint(rect(6, 40, 54, 58), P.WOOD)
    c.fill(rect(7, 46, 53, 46), P.WOOD[2])
    c.paint(ellipse(22, 40, 10, 3), CHROME)
    for k in range(5):
        c.paint(ellipse(17 + k * 2.5, 39, 1.3, 1.3), P.CLOTH["orange"], inner=False)
    c.paint(rect(38, 32, 42, 40), P.GLASS, inner=False)
    for x in (39, 40, 41):
        c.fill(rect(x, 28, x, 33), P.WOOD[0])
    c.paint(rect(46, 34, 48, 40), P.CLOTH["red"], inner=False)
    c.paint(rect(50, 35, 52, 40), P.CLOTH["brown"], inner=False)
    wheel(c, 14, base - 6, 6, 0)
    wheel(c, 46, base - 6, 6, 2)
    c.outline()
    return c


def candle_stall(frame):
    c = Canvas(56, 40)
    base = 39
    c.paint(rect(2, 18, 53, 22), P.CLOTH["maroon"])
    c.paint(rect(4, 22, 6, base) | rect(49, 22, 51, base), P.WOOD_DARK, inner=False)
    colors = [P.CLOTH["red"], P.CLOTH["yellow"], P.CLOTH["white"], P.CLOTH["green"], P.CLOTH["purple"]]
    for k in range(10):
        x = 6 + k * 4.6
        h = 7 + (k * 3) % 5
        c.paint(rect(x, 18 - h, x + 2, 17), colors[k % 5], inner=False)
        flicker = (k + frame) % 2
        c.fill({(round(x + 1), 17 - h - 1), (round(x + 1), 17 - h - 2 - flicker)}, P.LIGHT[1 + flicker])
    c.fill(rect(3, 19, 52, 19), P.GOLD[1])
    c.outline()
    return c


def balloons(frame):
    c = Canvas(40, 64)
    rng = random.Random(4)
    colors = [P.CLOTH["red"], P.CLOTH["yellow"], P.CLOTH["blue"], P.CLOTH["green"], P.CLOTH["pink"], P.CLOTH["orange"], P.CLOTH["purple"]]
    centers = [(10, 12), (20, 8), (30, 12), (14, 22), (25, 21), (8, 30), (32, 28)]
    for k, (x, y) in enumerate(centers):
        dx = math.sin(frame * math.pi + k) * 1
        c.fill(line(x + dx, y + 5, 20, 62), P.CLOTH["white"][2])
    for k, (x, y) in enumerate(centers):
        dx = round(math.sin(frame * math.pi + k) * 1)
        c.paint(ellipse(x + dx, y, 4.5, 5.2), colors[k], inner=False)
        c.set(x + dx - 2, y - 3, hexc("#ffffff"))
        c.set(x + dx, y + 5, colors[k][2])
    rng.random()
    c.outline()
    return c


def store_inside():
    c = Canvas(80, 34)
    c.fill(rect(0, 0, 79, 33), hexc("#4a3a40"))
    goods = [P.CLOTH["red"], P.CLOTH["yellow"], P.CLOTH["blue"], P.CLOTH["green"], P.CLOTH["orange"], P.CLOTH["white"], P.CLOTH["pink"]]
    for row, y in enumerate((6, 16, 26)):
        c.fill(rect(0, y + 4, 79, y + 5), P.WOOD[2])
        for k, x in enumerate(range(2, 78, 5)):
            g = goods[(k + row * 3) % len(goods)]
            c.paint(rect(x, y - 2 + (k % 2), x + 3, y + 3), g, inner=False)
    return c


def store():
    """A sari-sari store: a tin roof, a sign, a screened window, and snacks hung in strips."""
    c = Canvas(136, 108)
    base = 107
    c.paint(rect(2, 26, 133, base), P.WOOD)
    for x in range(6, 132, 5):
        c.fill(rect(x, 27, x, base - 1), P.WOOD[2])
    hole = rect(26, 44, 105, 77)
    for x, y in hole:
        c.p[x, y] = (0, 0, 0, 0)
    c.paint(rect(24, 42, 107, 43) | rect(24, 78, 107, 79) | rect(24, 42, 25, 79) | rect(106, 42, 107, 79), P.WOOD_DARK, inner=False)
    c.paint(rect(20, 80, 111, 86), P.WOOD_DARK)
    # Snack sachets hanging in long strips.
    strips = [P.CLOTH["red"], P.CLOTH["yellow"], P.CLOTH["blue"], P.CLOTH["green"], P.CLOTH["orange"]]
    for k, x in enumerate(range(30, 104, 9)):
        for j in range(5):
            c.paint(rect(x, 45 + j * 4, x + 4, 47 + j * 4), strips[(k + j) % 5], inner=False)
    c.paint(rect(30, 12, 105, 25), P.CLOTH["cream"])
    c.paint(rect(32, 14, 103, 23), P.CLOTH["red"], inner=False)
    c.paint(rect(36, 16, 99, 21), P.CLOTH["cream"], inner=False)
    roof = poly([(-1, 30), (8, 22), (128, 22), (137, 30)])
    c.paint(roof, P.METAL)
    for x in range(0, 136, 4):
        c.fill(rect(x, 23, x, 29), P.METAL[2])
    c.paint(rect(112, 50, 128, base), P.WOOD_DARK)
    c.paint(ellipse(126, 78, 1, 1), P.GOLD, inner=False)
    # Crates of bottles by the door.
    c.paint(rect(4, base - 14, 22, base), P.CLOTH["yellow"])
    for x in range(6, 21, 3):
        c.paint(rect(x, base - 19, x + 1, base - 14), P.GLASS, inner=False)
    c.outline()
    # The wire screen goes on last, so the outline never fills the window.
    for x in range(26, 106, 3):
        for y in range(62, 78):
            if (x + y) % 3 == 0 and c.p[x, y][3] == 0:
                c.p[x, y] = P.METAL[2][:3] + (140,)
    return c


def laundry(frame):
    c = Canvas(96, 60)
    for x in (2, 92):
        c.paint(rect(x, 6, x + 1, 59), P.WOOD_DARK)
    pts = [(3 + t, 9 + math.sin(math.pi * t / 89) * 6) for t in range(0, 90)]
    c.fill({(round(x), round(y)) for x, y in pts}, P.CLOTH["white"][3])
    clothes = [("shirt", P.CLOTH["red"]), ("towel", P.CLOTH["yellow"]), ("shirt", P.CLOTH["blue"]), ("dress", P.CLOTH["pink"]), ("towel", P.CLOTH["white"]), ("shirt", P.CLOTH["green"])]
    for k, (kind, col) in enumerate(clothes):
        t = 8 + k * 14
        y = round(9 + math.sin(math.pi * t / 89) * 6)
        sway = round(math.sin(frame * math.pi + k) * 1)
        if kind == "shirt":
            m = poly([(t - 5, y), (t + 5, y), (t + 7 + sway, y + 4), (t + 4 + sway, y + 5), (t + 4 + sway, y + 14), (t - 4 + sway, y + 14), (t - 4 + sway, y + 5), (t - 7 + sway, y + 4)])
        elif kind == "dress":
            m = poly([(t - 3, y), (t + 3, y), (t + 6 + sway, y + 16), (t - 6 + sway, y + 16)])
        else:
            m = poly([(t - 4, y), (t + 4, y), (t + 4 + sway, y + 12), (t - 4 + sway, y + 12)])
        c.paint(m, col)
        c.set(t - 2, y, P.WOOD[1])
        c.set(t + 2, y, P.WOOD[1])
    c.outline()
    return c


def lamp(lit):
    c = Canvas(18, 84)
    c.paint(rect(8, 14, 9, 83), DARK)
    c.paint(rect(5, 80, 12, 83), DARK)
    c.paint(rect(4, 12, 13, 14), DARK)
    glow = P.LIGHT if lit else ramp4("#fff6e0", "#f0e2c0", "#d0bc96", "#a8946c")
    c.paint(poly([(5, 2), (12, 2), (11, 12), (6, 12)]), glow)
    c.paint(rect(4, 0, 13, 2), DARK)
    c.outline()
    return c


def banderitas(frame, width=300):
    """A string of fiesta flags, sagging between two posts."""
    c = Canvas(width, 34)
    colors = [P.CLOTH["red"], P.CLOTH["yellow"], P.CLOTH["blue"], P.CLOTH["green"], P.CLOTH["pink"], P.CLOTH["orange"], P.CLOTH["white"]]
    def sag(x):
        return 3 + math.sin(math.pi * x / (width - 1)) * 12
    c.fill({(x, round(sag(x))) for x in range(width)}, P.WOOD_DARK[2])
    for k, x in enumerate(range(4, width - 6, 11)):
        y = sag(x + 4)
        flap = math.sin(frame * math.pi + k * 0.9) * 1.5
        col = colors[k % len(colors)]
        c.paint(poly([(x, y), (x + 8, y), (x + 4 + flap, y + 10)]), col, inner=False)
        c.set(x + 2, round(y) + 1, col[0])
    return c


def bench():
    c = Canvas(40, 18)
    c.paint(rect(2, 6, 37, 8), P.WOOD)
    c.paint(rect(2, 2, 37, 3), P.WOOD)
    for x in (5, 33):
        c.paint(rect(x, 2, x + 1, 17), P.WOOD_DARK)
    c.outline()
    return c


def fruit_stand():
    c = Canvas(60, 50)
    base = 49
    c.paint(poly([(0, 6), (60, 6), (56, 14), (4, 14)]), P.CLOTH["green"])
    for x in range(4, 58, 6):
        c.fill(rect(x, 7, x + 2, 13), P.CLOTH["white"][1])
    c.paint(rect(6, 14, 7, 30) | rect(52, 14, 53, 30), P.WOOD_DARK, inner=False)
    c.paint(rect(4, 30, 55, 36), P.WOOD)
    c.paint(rect(8, 36, 10, base) | rect(49, 36, 51, base), P.WOOD_DARK, inner=False)
    for k in range(6):
        c.paint(ellipse(10 + k * 4, 28, 2.2, 2.6), P.CLOTH["yellow"] if k % 2 else P.CLOTH["orange"], inner=False)
    for k in range(3):
        c.paint(capsule(34 + k * 3, 24, 37 + k * 3, 29, 1.3), P.CLOTH["yellow"], inner=False)
    c.paint(ellipse(48, 27, 4.5, 3.6), P.CLOTH["green"], inner=False)
    c.outline()
    return c


# Animals --------------------------------------------------------------------------------------

DOG = ramp4("#e2b484", "#c08a58", "#986640", "#6c462e")
CARABAO = ramp4("#8c8496", "#6a6274", "#4e4858", "#34303e")


def dog(pose, frame):
    """A friendly askal: run (four frames), sit (tail wags), bark."""
    c = Canvas(32, 24)
    base = 22
    if pose == "sit":
        c.paint(ellipse(14, 15, 6, 6) | rect(10, 15, 18, base - 1), DOG)
        c.paint(capsule(17, 16, 19, base - 1, 1.4), DOG)
        c.paint(capsule(9, 18, 7, base - 1, 1.6), DOG)
        tail = (3, 14) if frame == 0 else (4, 18)
        c.paint(capsule(8, 18, *tail, 1.2), DOG)
        head = (19, 9)
    else:
        ph = frame * math.pi / 2
        body = ellipse(14, 13, 8, 4.5)
        c.paint(body, DOG)
        for k, (hx, off) in enumerate(((9, 0), (19, math.pi))):
            sw = math.sin(ph + off) * 3
            c.paint(capsule(hx, 15, hx + sw, base - 1, 1.4), deeper(DOG, 0.1) if k else DOG)
        tail_up = -2 if pose == "bark" else math.sin(ph) * 2
        c.paint(capsule(6, 11, 2, 7 + tail_up, 1.2), DOG)
        head = (22, 9 - (1 if pose == "bark" else 0))
    c.paint(ellipse(head[0], head[1], 4.2, 3.8) | ellipse(head[0] + 4, head[1] + 1.5, 2.6, 2), DOG)
    c.paint(poly([(head[0] - 3, head[1] - 2), (head[0] - 1, head[1] - 6), (head[0] + 1, head[1] - 2)]), deeper(DOG, 0.2), inner=False)
    c.set(head[0] + 1, head[1] - 1, P.EYE)
    c.set(head[0] + 6, head[1] + 1, P.EYE)
    c.fill({(head[0] - 2, head[1] + 3), (head[0] - 1, head[1] + 4)}, P.CLOTH["white"][1])
    if pose == "bark":
        c.fill({(head[0] + 5, head[1] + 3), (head[0] + 6, head[1] + 3)}, P.MOUTH)
    c.paint(rect(head[0] - 3, head[1] + 3, head[0] - 1, head[1] + 4), P.CLOTH["red"], inner=False)
    c.outline()
    return c


def chicken(frame, rooster=False):
    c = Canvas(18, 18)
    body = ramp4("#fff6e6", "#f0e2c8", "#d0bc9c", "#a89272") if not rooster else ramp4("#e88a52", "#c46a3a", "#9a4e2c", "#6e3420")
    peck = frame == 1
    c.paint(ellipse(8, 11, 5, 4), body)
    tail = P.CLOTH["green"] if rooster else body
    c.paint(poly([(3, 10), (0, 5), (2, 4), (5, 9)]), tail, inner=False)
    hx, hy = (13, 11) if peck else (12, 6)
    c.paint(ellipse(hx, hy, 2.4, 2.4), body, inner=False)
    c.fill({(hx + 3, hy), (hx + 2, hy + 1)} if not peck else {(hx + 2, hy + 2), (hx + 3, hy + 3)}, P.CLOTH["yellow"][2])
    c.fill({(hx - 1, hy - 3), (hx, hy - 3), (hx + 1, hy - 2)}, P.CLOTH["red"][1])
    c.set(hx + 1, hy - 1 if not peck else hy, P.EYE)
    c.fill(line(7, 15, 7, 17) | line(10, 15, 10, 17), P.CLOTH["yellow"][2])
    c.outline()
    return c


def carabao(frame):
    c = Canvas(64, 40)
    base = 38
    ph = frame * math.pi / 2
    for k, (lx, off) in enumerate(((14, 0), (20, math.pi), (42, math.pi), (48, 0))):
        sw = math.sin(ph + off) * 2.5
        c.paint(capsule(lx, 24, lx + sw, base - 1, 2.4), deeper(CARABAO, 0.15) if k % 2 else CARABAO)
    c.paint(ellipse(31, 20, 21, 10), CARABAO)
    c.paint(capsule(10, 18, 6, 30, 1.2), CARABAO)
    c.paint(ellipse(54, 17, 6, 6) | ellipse(59, 21, 4, 3.5), CARABAO)
    # The wide, curving horns.
    for k in range(10):
        t = k / 9
        c.set(round(52 - t * 6), round(12 - math.sin(t * math.pi) * 4), P.STONE[1])
        c.set(round(56 + t * 4), round(12 - math.sin(t * math.pi) * 4), P.STONE[1])
    c.set(56, 16, P.EYE)
    c.outline()
    return c


def cat(frame):
    c = Canvas(20, 12)
    fur = ramp4("#f8c08a", "#e09858", "#b87440", "#84502e")
    c.paint(ellipse(10, 7 - frame * 0.5, 7, 3.6 + frame * 0.3), fur)
    c.paint(ellipse(15, 6, 3, 3), fur, inner=False)
    c.fill({(14, 3), (16, 3)}, fur[2])
    c.fill({(14, 6), (16, 6)}, INK)
    c.paint(capsule(4, 8, 8, 10, 1), fur, inner=False)
    c.outline()
    return c


def ball():
    c = Canvas(9, 9)
    c.paint(ellipse(4.5, 4.5, 3.5, 3.5), P.CLOTH["red"])
    c.fill(line(2, 4, 7, 4), P.CLOTH["white"][1])
    c.set(3, 2, hexc("#ffffff"))
    c.outline()
    return c


# The fiesta at the end ------------------------------------------------------------------------


def bell(frame):
    """The church bell swinging: left, middle left, middle right, right."""
    c = Canvas(26, 26)
    angle = (-22, -8, 8, 22)[frame]
    a = math.radians(angle)
    px, py = 13, 3
    pts = [(-5, 4), (5, 4), (8, 16), (-8, 16)]
    rot = [(px + x * math.cos(a) - y * math.sin(a), py + x * math.sin(a) + y * math.cos(a)) for x, y in pts]
    c.paint(poly(rot) | ellipse(px - 4 * math.sin(a), py + 4 * math.cos(a), 5, 3), P.GOLD)
    clap = (px - 18 * math.sin(a * 0.4), py + 18 * math.cos(a * 0.4))
    c.paint(ellipse(clap[0], clap[1], 1.8, 1.8), P.GOLD, inner=False)
    c.fill(rect(4, 1, 22, 2), P.WOOD_DARK[1])
    c.outline()
    return c


def firework(colors, frame):
    c = Canvas(56, 56)
    cx = cy = 28
    if frame == 0:
        c.fill(ellipse(cx, cy, 2, 2), colors[0])
        return c
    radius = [0, 7, 13, 18, 22, 25][frame]
    count = 22
    for k in range(count):
        a = 2 * math.pi * k / count
        for trail in range(4):
            rr = radius - trail * 2.4
            if rr <= 0:
                continue
            x = round(cx + math.cos(a) * rr)
            y = round(cy + math.sin(a) * rr + (frame ** 2) * 0.18)
            col = colors[min(2, trail // 2 + (1 if frame >= 4 else 0))]
            if frame == 5 and (k + trail) % 2:
                continue
            # The head of each spark is a bold 2 by 2 dot, the trail single pixels.
            if trail == 0 and frame < 5:
                c.fill({(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)}, col)
            else:
                c.set(x, y, col)
    if frame <= 2:
        c.fill(ellipse(cx, cy, 2.5 - frame * 0.5, 2.5 - frame * 0.5), hexc("#ffffff"))
    return c


def confetti(k):
    colors = [P.CLOTH["red"], P.CLOTH["yellow"], P.CLOTH["blue"], P.CLOTH["green"], P.CLOTH["pink"], P.CLOTH["white"]]
    c = Canvas(4, 4)
    col = colors[k % len(colors)]
    shape = rect(0, 1, 3, 2) if k % 2 else rect(1, 0, 2, 3)
    c.fill(shape, col[1])
    c.set(1, 1, col[0])
    return c


def vignette():
    """Dithered dark corners, so a memory reads like an old photograph."""
    c = Canvas(SCREEN_W, SCREEN_H)
    ink = hexc("#3a2a3e", 70)
    for y in range(SCREEN_H):
        for x in range(SCREEN_W):
            dx = max(0, 1 - min(x, SCREEN_W - 1 - x) / 44)
            dy = max(0, 1 - min(y, SCREEN_H - 1 - y) / 30)
            d = max(dx, dy)
            if d <= 0:
                continue
            threshold = ((x % 4) * 4 + (y % 4)) / 16 if (x + y) % 2 else ((x % 2) * 2 + (y % 2)) / 4
            if d * d > threshold:
                c.p[x, y] = ink
    return c


def plaza(width=320):
    c = Canvas(width, 22)
    for y in range(22):
        for x in range(width):
            row = y // 6
            edge = y % 6 == 5 or (x + row * 7) % 14 == 0
            col = P.STONE[2] if edge else (P.STONE[1] if (x // 14 + row) % 3 else P.STONE[0])
            fade = y < 3 and (x + y) % 2
            if not fade:
                c.p[x, y] = col
    return c


def build_town():
    out = {}
    for f in range(2):
        out[f"jeepney-{f}"] = jeepney(f)
        out[f"candles-{f}"] = candle_stall(f)
        out[f"balloons-{f}"] = balloons(f)
        out[f"laundry-{f}"] = laundry(f)
        out[f"banderitas-{f}"] = banderitas(f)
        out[f"hen-{f}"] = chicken(f)
        out[f"rooster-{f}"] = chicken(f, True)
        out[f"cat-{f}"] = cat(f)
        out[f"dog-sit-{f}"] = dog("sit", f)
    for f in range(4):
        out[f"dog-run-{f}"] = dog("run", f)
        out[f"carabao-{f}"] = carabao(f)
        out[f"bell-{f}"] = bell(f)
    out["dog-bark"] = dog("bark", 0)
    out["tricycle"] = tricycle()
    out["sorbetes"] = sorbetes_cart()
    out["fishball"] = fishball_cart()
    out["store"] = store()
    out["store-inside"] = store_inside()
    out["lamp"] = lamp(False)
    out["lamp-lit"] = lamp(True)
    out["bench"] = bench()
    out["fruit-stand"] = fruit_stand()
    out["ball"] = ball()
    out["plaza"] = plaza()
    out["vignette"] = vignette()
    palettes = {
        "gold": (hexc("#ffffff"), hexc("#ffe596"), hexc("#f2a83a")),
        "pink": (hexc("#ffffff"), hexc("#ffb6c8"), hexc("#e05a8a")),
        "blue": (hexc("#ffffff"), hexc("#bfe6ff"), hexc("#5aa0e8")),
    }
    for name, cols in palettes.items():
        for f in range(6):
            out[f"firework-{name}-{f}"] = firework(cols, f)
    for k in range(6):
        out[f"confetti-{k}"] = confetti(k)
    return out
