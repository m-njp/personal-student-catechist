"""Everyone in A Journey to Remember, built from parts so nobody looks alike.

Side figures face right and walk in eight frames: the legs swing on two joints, the knee bends on
the forward swing, the arms swing against the legs, and the body is set on the lowest foot so it
never floats. Front figures stand facing the class, breathe, blink, wave, and cheer.
"""
import math
from dataclasses import dataclass

from palette import BLUSH, CLOTH, EYE, EYE_HI, GOLD, HAIR, METAL, MOUTH, NIPA, SANDAL, SHOE, SKIN, SOCK, TRUNK, WOOD
from pix import INK, Canvas, capsule, ellipse, hexc, line, mix, poly, rect

W = 40
WALK_FRAMES = 8


@dataclass
class Look:
    skin: str
    hair: str
    hair_color: str
    top: str
    top_kind: str = "tee"  # tee, polo, blouse, barong, blazer, cassock, dress
    bottom: str = "navy"
    bottom_kind: str = "shorts"  # shorts, pants, skirt, long
    shoes: str = "shoe"
    socks: bool = False
    size: str = "kid"  # kid, teen, adult
    extras: tuple = ()
    prop: str = ""
    accent: str = "yellow"


SIZES = {
    "kid": dict(torso=10, legs=11, upper=4.6, fore=4.4, limb=1.8),
    "teen": dict(torso=13, legs=14, upper=5.6, fore=5.2, limb=1.9),
    "adult": dict(torso=15, legs=17, upper=6.4, fore=6.0, limb=2.1),
}


def height_of(look):
    s = SIZES[look.size]
    return 15 + s["torso"] + s["legs"] + 3


def deeper(r, t=0.2):
    return tuple(mix(c, INK, t) for c in r)


def cloth(name):
    return CLOTH[name]


def shoe_ramp(look):
    return SANDAL if look.shoes == "sandal" else SHOE


def hair_ramp(look):
    return HAIR.get(look.hair_color) or CLOTH[look.hair_color]


def salakot(c, cx, cy):
    """A wide, conical farmer's hat."""
    hat = poly([(cx - 13, cy - 2), (cx, cy - 13), (cx + 13, cy - 2), (cx + 11, cy), (cx - 11, cy)])
    c.paint(hat, NIPA)
    for k in range(-10, 11, 4):
        c.fill(line(cx, cy - 12, cx + k, cy - 1), NIPA[2])
    c.paint(rect(cx - 12, cy - 1, cx + 11, cy), deeper(NIPA, 0.15), inner=False)


# Side view ------------------------------------------------------------------------------------


def leg_points(hip, angle, bend, thigh, shin):
    kx = hip[0] + math.sin(angle) * thigh
    ky = hip[1] + math.cos(angle) * thigh
    a2 = angle - bend
    return (kx, ky), (kx + math.sin(a2) * shin, ky + math.cos(a2) * shin)


def side(look, phase, pose="walk", swing=1.0):
    s = SIZES[look.size]
    h = height_of(look)
    c = Canvas(W, h + 6)
    cx = W / 2 - 1
    sole = h + 3
    legs = s["legs"]
    thigh, shin = legs * 0.52, legs * 0.5
    ph = 2 * math.pi * phase / WALK_FRAMES

    amp = math.radians(30) * swing
    a_front = amp * math.sin(ph)
    a_back = -a_front
    bend_front = math.radians(48) * max(0.0, math.cos(ph)) * swing
    bend_back = math.radians(48) * max(0.0, -math.cos(ph)) * swing

    hip0 = (cx, sole - 2 - legs)
    kf, af = leg_points(hip0, a_front, bend_front, thigh, shin)
    kb, ab = leg_points(hip0, a_back, bend_back, thigh, shin)
    dy = round((sole - 2) - max(af[1], ab[1]))

    def down(p):
        return (p[0], p[1] + dy)

    hip = down(hip0)
    kf, af, kb, ab = down(kf), down(af), down(kb), down(ab)
    shoulder_y = hip[1] - s["torso"]
    head_cy = round(shoulder_y - 6.5)
    shoulder = (cx - 0.5, shoulder_y + 2.5)

    arm_a = -math.radians(26) * math.sin(ph) * swing
    if pose == "carry":
        # The bamboo pole rests on the shoulder; both hands steady it.
        pole_y = shoulder_y - 2
        elbow_f = (shoulder[0] + 2.5, shoulder[1] + 3.5)
        hand_f = (shoulder[0] + 4.5, pole_y + 0.5)
        elbow_b = (shoulder[0] - 0.5, shoulder[1] + 3.5)
        hand_b = (shoulder[0] + 1.5, pole_y + 0.5)
    else:
        def arm(angle):
            e = (shoulder[0] + math.sin(angle) * s["upper"], shoulder[1] + math.cos(angle) * s["upper"])
            fa = angle + math.radians(18) + max(0.0, angle) * 0.6
            return e, (e[0] + math.sin(fa) * s["fore"], e[1] + math.cos(fa) * s["fore"])

        elbow_f, hand_f = arm(arm_a)
        elbow_b, hand_b = arm(-arm_a)

    skin = SKIN[look.skin]
    top = cloth(look.top)
    bottom = cloth(look.bottom)
    hair = hair_ramp(look)
    r = s["limb"]

    def draw_arm(elbow, hand, back):
        sk = deeper(skin) if back else skin
        tp = deeper(top) if back else top
        long_sleeve = look.top_kind in ("barong", "blazer", "cassock")
        whole = capsule(*shoulder, *elbow, r) | capsule(*elbow, *hand, r * 0.9)
        c.paint(whole, sk, inner=not back)
        if long_sleeve:
            c.paint(capsule(*shoulder, *elbow, r + 0.3) | capsule(*elbow, hand[0] - (hand[0] - elbow[0]) * 0.25, hand[1] - (hand[1] - elbow[1]) * 0.25, r), tp, inner=not back)
        else:
            mid = (shoulder[0] + (elbow[0] - shoulder[0]) * 0.6, shoulder[1] + (elbow[1] - shoulder[1]) * 0.6)
            c.paint(capsule(*shoulder, *mid, r + 0.35), tp, inner=not back)
        c.paint(ellipse(hand[0], hand[1], r * 0.95, r * 0.95), sk, inner=False)

    def draw_leg(knee, ankle, back):
        sk = deeper(skin) if back else skin
        bt = deeper(bottom) if back else bottom
        sh = deeper(shoe_ramp(look)) if back else shoe_ramp(look)
        whole = capsule(*hip, *knee, r + 0.2) | capsule(*knee, *ankle, r)
        kind = look.bottom_kind
        if kind in ("pants", "long"):
            c.paint(whole, bt, inner=not back)
        else:
            c.paint(whole, sk, inner=not back)
            if kind == "shorts":
                end = (hip[0] + (knee[0] - hip[0]) * 0.72, hip[1] + (knee[1] - hip[1]) * 0.72)
                c.paint(capsule(*hip, *end, r + 0.6), bt, inner=not back)
            if look.socks:
                hi = (ankle[0] - (ankle[0] - knee[0]) * 0.35, ankle[1] - (ankle[1] - knee[1]) * 0.35)
                c.paint(capsule(*hi, *ankle, r), deeper(SOCK) if back else SOCK, inner=False)
        foot = ellipse(ankle[0] + 1.4, ankle[1] + 1.4, 3.3, 1.8)
        foot = {p for p in foot if p[1] <= sole}
        c.paint(foot, sh, inner=not back)

    # Behind the body.
    draw_arm(elbow_b, hand_b, True)
    draw_leg(kb, ab, True)
    if look.hair == "long":
        c.paint(capsule(cx - 2.5, head_cy, cx - 3.5, shoulder_y + 5, 4.2), hair, inner=False)
    if "backpack" in look.extras:
        pack = ellipse(cx - 5.6, shoulder_y + 5.5, 3.4, 5.4) | rect(cx - 8, shoulder_y + 2, cx - 4, shoulder_y + 9)
        c.paint(pack, cloth(look.accent))
        c.paint(rect(cx - 9, shoulder_y + 6, cx - 7, shoulder_y + 9), deeper(cloth(look.accent), 0.1))

    # Body.
    tw = 4 if look.size == "kid" else 5
    torso = poly([(cx - tw, shoulder_y + 1), (cx - tw + 1.5, shoulder_y - 0.5), (cx + tw - 1, shoulder_y - 0.5),
                  (cx + tw, shoulder_y + 1.5), (cx + tw + 0.3, hip[1] + 1), (cx - tw - 0.2, hip[1] + 1)])
    c.paint(torso, top)
    c.shade_band(torso, top, "left", 1)
    if look.top_kind == "polo":
        c.fill({(round(cx + 1), shoulder_y), (round(cx + 2), shoulder_y), (round(cx + 2), shoulder_y + 1)}, top[0])
        c.fill({(round(cx + 3), shoulder_y + 1)}, top[2])
    if look.top_kind == "barong":
        for y in range(shoulder_y + 2, hip[1], 2):
            c.set(round(cx + 2), y, top[2])
    if look.top_kind == "blouse":
        for y in range(shoulder_y + 2, hip[1], 3):
            c.set(round(cx + (y % 2)), y, CLOTH["white"][0])
    if "backpack" in look.extras:
        c.fill(line(cx - 1, shoulder_y, cx + 1, hip[1] - 2), cloth(look.accent)[2])
    if look.bottom_kind in ("shorts", "pants"):
        c.paint(rect(cx - tw, hip[1] - 1, cx + tw, hip[1] + 2), bottom)
    draw_leg(kf, af, False)
    if look.bottom_kind == "skirt":
        sw = 1.5 * math.sin(ph) * swing
        skirt = poly([(cx - tw, hip[1] - 2), (cx + tw, hip[1] - 2), (cx + tw + 2.5 + sw, hip[1] + legs * 0.55), (cx - tw - 2.5 + sw, hip[1] + legs * 0.55)])
        c.paint(skirt, bottom)
    if look.top_kind == "cassock":
        sw = 1.6 * math.sin(ph) * swing
        robe = poly([(cx - tw, shoulder_y + 2), (cx + tw, shoulder_y + 2), (cx + tw + 3 + sw, sole - 2.5), (cx - tw - 3 + sw, sole - 2.5)])
        c.paint(robe, top)
        c.shade_band(robe, top, "right", 2)
    if look.top_kind == "dress":
        sw = 1.4 * math.sin(ph) * swing
        dress = poly([(cx - tw, hip[1] - 3), (cx + tw, hip[1] - 3), (cx + tw + 2.5 + sw, hip[1] + legs * 0.6), (cx - tw - 2.5 + sw, hip[1] + legs * 0.6)])
        c.paint(dress, top)
    if "apron" in look.extras:
        c.paint(rect(cx + 1, shoulder_y + 4, cx + tw + 1, hip[1] + 4), CLOTH["white"], inner=False)

    # Head.
    hx = cx + 1
    head = ellipse(hx, head_cy, 7, 7.5)
    c.paint(head, skin, soft=True)
    neck = rect(cx - 1, head_cy + 6, cx + 1, shoulder_y)
    c.fill({p for p in neck if c.get(*p)[3] == 0}, skin[2])
    draw_side_hair(c, look, hx, head_cy, shoulder_y, ph, swing)
    if look.hair != "headscarf":
        c.paint(ellipse(hx - 1.5, head_cy + 1.5, 1.7, 2.1), skin, inner=False)
        c.set(round(hx - 1.5), head_cy + 1, skin[3])
    ex = round(hx + 3)
    c.fill({(ex, head_cy), (ex, head_cy + 1), (ex + 1, head_cy), (ex + 1, head_cy + 1)}, EYE)
    c.set(ex + 1, head_cy, EYE_HI)
    c.fill({(ex, head_cy - 2), (ex + 1, head_cy - 2), (ex + 2, head_cy - 2)}, hair[2] if look.hair != "headscarf" else skin[3])
    c.set(round(hx + 7), head_cy + 1, skin[1])
    c.set(round(hx + 7), head_cy + 2, skin[2])
    c.fill({(ex + 1, head_cy + 4), (ex + 2, head_cy + 4)}, MOUTH)
    c.set(ex - 1, head_cy + 3, BLUSH)
    if "glasses" in look.extras:
        c.fill({(ex - 1, head_cy - 1), (ex + 2, head_cy - 1), (ex + 2, head_cy + 2), (ex - 1, head_cy + 2), (ex - 2, head_cy)}, METAL[3])
    if "mustache" in look.extras:
        c.fill({(ex + 1, head_cy + 3), (ex + 2, head_cy + 3), (ex + 3, head_cy + 3)}, hair[2])

    # In front.
    draw_arm(elbow_f, hand_f, False)
    if "lanyard" in look.extras:
        c.fill(line(cx + 1, shoulder_y + 1, cx + 2, shoulder_y + 6), cloth("blue")[2])
        c.paint(rect(cx + 1, shoulder_y + 6, cx + 3, shoulder_y + 8), cloth("white"), inner=False)
    if "towel" in look.extras:
        c.paint(rect(cx - 2, shoulder_y - 1, cx + 1, shoulder_y + 5), CLOTH["white"], inner=False)
    c.outline()
    return c


def draw_side_hair(c, look, hx, cy, shoulder_y, ph, swing):
    style = look.hair
    hair = hair_ramp(look)
    head = ellipse(hx - 0.3, cy - 0.8, 7.6, 7.6)
    if style == "headscarf":
        scarf = ellipse(hx - 0.5, cy, 8.2, 8.6) | capsule(hx - 4, cy + 2, hx - 4.5, shoulder_y + 4, 4.3)
        face = ellipse(hx + 3.2, cy + 1.5, 4.6, 5.6)
        c.paint({p for p in scarf if p not in face}, hair)
        return
    back_depth = {"short": 3, "buzz": 1, "cap": 3, "bob": 5, "long": 6, "ponytail": 3, "bun": 3, "curly": 4, "braids": 4, "salakot": 3}.get(style, 3)
    top_limit = cy - 4 if style == "buzz" else cy - 3
    cap = {(x, y) for (x, y) in head if y <= top_limit or (x <= hx - 2 and y <= cy + back_depth)}
    cap |= {(x, y) for (x, y) in head if y <= cy - 2 and hx + 1 <= x <= hx + 6 and (x + y) % 3 != 0}
    if style == "curly":
        for a in range(0, 360, 30):
            ax = hx - 0.5 + math.cos(math.radians(a)) * 7
            ay = cy - 1 + math.sin(math.radians(a)) * 7
            if ay < cy + 3 and ax < hx + 5:
                cap |= ellipse(ax, ay, 2.4, 2.4)
    if style == "ponytail":
        sway = 1.2 * math.sin(ph + 1) * swing
        cap |= capsule(hx - 6, cy - 3, hx - 10 + sway, cy + 4, 2.1)
    if style == "bun":
        cap |= ellipse(hx - 5, cy - 6, 3.2, 3.2)
    if style == "short":
        cap |= {(round(hx - 1), round(cy - 9)), (round(hx), round(cy - 9)), (round(hx), round(cy - 10))}
    if style == "braids":
        cap |= capsule(hx - 4, cy + 2, hx - 5, shoulder_y + 6, 1.6)
    c.paint(cap, hair)
    for x, y in cap:
        if (x * 7 + y * 3) % 11 == 0 and c.get(x, y) == hair[1]:
            c.set(x, y, hair[0])
    if style == "bun":
        c.set(round(hx - 3), round(cy - 4), CLOTH[look.accent][1])
    if style == "ponytail":
        c.set(round(hx - 7), round(cy - 2), CLOTH[look.accent][1])
    if style == "cap":
        dome = {p for p in ellipse(hx - 0.3, cy - 2.5, 8, 6.4) if p[1] <= cy - 3}
        c.paint(dome, CLOTH[look.accent])
        c.paint(rect(hx + 3, cy - 3, hx + 10, cy - 2), deeper(CLOTH[look.accent], 0.15))
    if style == "salakot":
        salakot(c, hx, cy - 1)


# Front view -----------------------------------------------------------------------------------


def front(look, frame, prop_override=None):
    """frame: idle-0, idle-1, blink, wave-0, wave-1, cheer-0, cheer-1."""
    s = SIZES[look.size]
    h = height_of(look)
    c = Canvas(W, h + 6)
    cx = W / 2
    sole = h + 3
    breath = 1 if frame in ("idle-1", "cheer-1") else 0
    hip_y = sole - 2 - s["legs"]
    shoulder_y = hip_y - s["torso"] + breath
    head_cy = round(shoulder_y - 6.5)
    skin = SKIN[look.skin]
    top = cloth(look.top)
    bottom = cloth(look.bottom)
    hair = hair_ramp(look)
    tw = 5 if look.size == "kid" else 6
    r = s["limb"]
    cheering = frame.startswith("cheer")
    waving = frame.startswith("wave") or cheering

    # Hair that falls behind the body.
    if look.hair == "long":
        c.paint(rect(cx - 8, head_cy - 2, cx + 7, shoulder_y + 6) | ellipse(cx, shoulder_y + 6, 8, 2), deeper(hair, 0.1), inner=False)
    if look.hair == "ponytail":
        c.paint(capsule(cx + 6, head_cy - 3, cx + 9, head_cy + 7, 2.2), deeper(hair, 0.1), inner=False)
    if look.hair == "headscarf":
        c.paint(ellipse(cx, shoulder_y + 2, 9.5, 5) | rect(cx - 9, head_cy, cx + 8, shoulder_y + 2), hair, inner=False)

    # Legs and shoes.
    for side_x in (-2.6, 2.6):
        lx = cx + side_x - 0.5
        leg = capsule(lx, hip_y, lx, sole - 2.5, r)
        if look.bottom_kind in ("pants", "long"):
            c.paint(leg, bottom)
        else:
            c.paint(leg, skin)
            if look.socks:
                c.paint(capsule(lx, sole - 5, lx, sole - 2.5, r), SOCK, inner=False)
        shoe = {p for p in ellipse(lx + side_x * 0.25, sole - 1.2, 2.8, 1.8) if p[1] <= sole}
        c.paint(shoe, shoe_ramp(look))

    # Body.
    torso = poly([(cx - tw, shoulder_y + 1.5), (cx - tw + 1.5, shoulder_y), (cx + tw - 1.5, shoulder_y), (cx + tw, shoulder_y + 1.5),
                  (cx + tw, hip_y + 1), (cx - tw, hip_y + 1)])
    if look.bottom_kind in ("shorts", "pants"):
        short_len = 4 if look.bottom_kind == "shorts" else 2
        c.paint(rect(cx - tw, hip_y - 1, cx + tw - 1, hip_y + short_len) - rect(cx - 0.5, hip_y + 2, cx - 0.5, hip_y + short_len), bottom)
    c.paint(torso, top)
    c.shade_band(torso, top, "right", 2)
    if look.bottom_kind == "skirt":
        c.paint(poly([(cx - tw, hip_y - 1), (cx + tw, hip_y - 1), (cx + tw + 2, hip_y + s["legs"] * 0.55), (cx - tw - 2, hip_y + s["legs"] * 0.55)]), bottom)
    if look.top_kind == "cassock":
        robe = poly([(cx - tw, shoulder_y + 1), (cx + tw, shoulder_y + 1), (cx + tw + 2.5, sole - 2.5), (cx - tw - 2.5, sole - 2.5)])
        c.paint(robe, top)
        c.shade_band(robe, top, "right", 2)
        for y in range(shoulder_y + 3, round(sole - 4), 2):
            c.set(round(cx - 0.5), y, top[2])
    if look.top_kind == "dress":
        c.paint(poly([(cx - tw, hip_y - 3), (cx + tw, hip_y - 3), (cx + tw + 2.5, hip_y + s["legs"] * 0.6), (cx - tw - 2.5, hip_y + s["legs"] * 0.6)]), top)
    if look.top_kind == "barong":
        for y in range(shoulder_y + 2, hip_y, 2):
            for x in (round(cx - 3), round(cx + 2)):
                c.set(x, y, top[2])
        c.fill(line(cx - 1, shoulder_y + 1, cx - 1, shoulder_y + 6), top[2])
    if look.top_kind == "blazer":
        c.fill(poly([(cx - 2.5, shoulder_y), (cx + 1.5, shoulder_y), (cx - 0.5, shoulder_y + 7)]), CLOTH["white"][1])
        c.fill(line(cx - 0.5, shoulder_y + 2, cx - 0.5, shoulder_y + 7), CLOTH["red"][1])
    if look.top_kind == "polo":
        c.fill({(round(cx - 2), shoulder_y), (round(cx - 1), shoulder_y + 1), (round(cx + 1), shoulder_y), (round(cx), shoulder_y + 1)}, top[0])
        c.fill({(round(cx - 1), shoulder_y + 2), (round(cx - 1), shoulder_y + 3)}, top[2])
    if look.top_kind == "blouse":
        for y in range(shoulder_y + 2, hip_y, 3):
            for x in range(round(cx - tw + 1), round(cx + tw), 3):
                c.set(x + (y % 2), y, CLOTH["white"][0])
    if "backpack" in look.extras:
        acc = cloth(look.accent)
        c.paint(rect(cx - tw - 1, shoulder_y + 2, cx - tw, shoulder_y + 9), deeper(acc, 0.1), inner=False)
        c.paint(rect(cx + tw - 1, shoulder_y + 2, cx + tw, shoulder_y + 9), deeper(acc, 0.1), inner=False)
        c.fill(line(cx - 4, shoulder_y, cx - 4, hip_y - 2), acc[2])
        c.fill(line(cx + 3, shoulder_y, cx + 3, hip_y - 2), acc[2])
    if "cross" in look.extras:
        c.fill({(round(cx - 1), shoulder_y + 4), (round(cx - 1), shoulder_y + 5), (round(cx - 1), shoulder_y + 6), (round(cx - 2), shoulder_y + 5), (round(cx), shoulder_y + 5)}, GOLD[1])
    if "lanyard" in look.extras:
        c.fill(line(cx - 3, shoulder_y, cx - 1, shoulder_y + 5) | line(cx + 2, shoulder_y, cx, shoulder_y + 5), cloth("blue")[2])
        c.paint(rect(cx - 2, shoulder_y + 5, cx, shoulder_y + 8), cloth("white"), inner=False)
    if "apron" in look.extras:
        c.paint(rect(cx - 4, shoulder_y + 4, cx + 3, hip_y + 4), cloth("white"))
    if "whistle" in look.extras:
        c.fill(line(cx - 3, shoulder_y, cx - 1, shoulder_y + 4) | line(cx + 2, shoulder_y, cx, shoulder_y + 4), cloth("red")[1])
        c.paint(rect(cx - 1, shoulder_y + 4, cx, shoulder_y + 5), METAL, inner=False)

    # Arms.
    long_sleeve = look.top_kind in ("barong", "blazer", "cassock")

    def arm(sx, sy, ex, ey, hx, hy):
        whole = capsule(sx, sy, ex, ey, r) | capsule(ex, ey, hx, hy, r * 0.9)
        c.paint(whole, skin)
        if long_sleeve:
            c.paint(capsule(sx, sy, ex, ey, r + 0.3) | capsule(ex, ey, hx + (ex - hx) * 0.3, hy + (ey - hy) * 0.3, r), top)
        else:
            c.paint(capsule(sx, sy, sx + (ex - sx) * 0.55, sy + (ey - sy) * 0.55, r + 0.4), top)
        c.paint(ellipse(hx, hy, r, r), skin, inner=False)

    tip = 1.8 if frame in ("wave-1", "cheer-1") else 0
    left = (cx - tw - 0.8, shoulder_y + 2.5)
    lhand = (cx - tw - 1.6, hip_y + 1)
    if cheering:
        lhand = (left[0] - 3.4 - tip, left[1] - 9.5)
        arm(*left, left[0] - 3.2, left[1] - 3.5, *lhand)
    else:
        arm(*left, left[0] - 0.6, (left[1] + lhand[1]) / 2, *lhand)
    right = (cx + tw - 0.2, shoulder_y + 2.5)
    if waving:
        arm(*right, right[0] + 3.2, right[1] - 3.5, right[0] + 3.4 + tip, right[1] - 9.5)
    else:
        arm(*right, right[0] + 0.6, (right[1] + hip_y + 1) / 2, right[0] + 0.8, hip_y + 1)

    # Head.
    c.fill(rect(cx - 1.5, head_cy + 6, cx + 0.5, shoulder_y), skin[2])
    head = ellipse(cx, head_cy, 7.5, 7.5)
    c.paint(head, skin, soft=True)
    c.shade_band(head, skin, "right", 2)
    if look.hair != "headscarf":
        for ex in (cx - 7.6, cx + 7.4):
            c.paint(ellipse(ex, head_cy + 1.5, 1.5, 2), skin, inner=False)
    draw_front_hair(c, look, cx, head_cy, shoulder_y)
    eyes_y = head_cy
    for ex in (round(cx - 4), round(cx + 2)):
        if frame == "blink":
            c.fill({(ex, eyes_y + 1), (ex + 1, eyes_y + 1)}, EYE)
        else:
            c.fill({(ex, eyes_y - 1), (ex + 1, eyes_y - 1), (ex, eyes_y), (ex + 1, eyes_y), (ex, eyes_y + 1), (ex + 1, eyes_y + 1)}, EYE)
            c.set(ex + 1, eyes_y - 1, EYE_HI)
        brow = hair[2] if look.hair != "headscarf" else skin[3]
        c.fill({(ex, eyes_y - 3), (ex + 1, eyes_y - 3)}, brow)
        c.set(ex - 1 if ex < cx else ex + 2, head_cy + 3, BLUSH)
    if "glasses" in look.extras:
        for ex in (round(cx - 4), round(cx + 2)):
            c.fill({(ex - 1, eyes_y - 2), (ex + 2, eyes_y - 2), (ex - 1, eyes_y + 2), (ex + 2, eyes_y + 2)} | line(ex - 1, eyes_y - 2, ex - 1, eyes_y + 2) | line(ex + 2, eyes_y - 2, ex + 2, eyes_y + 2), METAL[3])
        c.fill({(round(cx), eyes_y - 1), (round(cx - 1), eyes_y - 1)}, METAL[3])
    if "mustache" in look.extras:
        c.fill({(round(cx - 2), head_cy + 3), (round(cx - 1), head_cy + 3), (round(cx), head_cy + 3), (round(cx + 1), head_cy + 3)}, hair[2])
    c.set(round(cx - 1), head_cy + 2, skin[2])
    smile = {(round(cx - 2), head_cy + 4), (round(cx - 1), head_cy + 5), (round(cx), head_cy + 5), (round(cx + 1), head_cy + 4)}
    if waving:
        smile |= {(round(cx - 1), head_cy + 4), (round(cx), head_cy + 4)}
    c.fill(smile, MOUTH)
    if "towel" in look.extras:
        c.paint(rect(cx + tw - 3, shoulder_y - 1, cx + tw, shoulder_y + 7), CLOTH["white"], inner=False)

    prop = look.prop if prop_override is None else prop_override
    if prop and not cheering:
        draw_prop(c, prop, lhand[0], lhand[1], sole)
    c.outline()
    return c


def draw_front_hair(c, look, cx, cy, shoulder_y):
    style = look.hair
    hair = hair_ramp(look)
    if style == "headscarf":
        scarf = ellipse(cx, cy - 0.5, 8.6, 8.8)
        face = ellipse(cx - 0.5, cy + 1.6, 5.8, 6.2)
        c.paint({p for p in scarf if p not in face}, hair)
        c.fill(line(cx - 6, cy + 6, cx - 3, cy + 8), hair[2])
        return
    side_depth = {"short": 1, "buzz": -1, "cap": 1, "bob": 5, "long": 6, "ponytail": 2, "bun": 2, "curly": 3, "braids": 3, "salakot": 1}.get(style, 1)
    dome = ellipse(cx, cy - 1.6, 8.2, 7.6)
    cap = {(x, y) for (x, y) in dome if y <= cy - 3 or ((x <= cx - 6 or x >= cx + 5) and y <= cy + side_depth)}
    if style != "buzz":
        # A side part: the fringe sweeps from the part toward one side.
        for x in range(round(cx - 7), round(cx + 7)):
            reach = cy - 3 + (1 if (x - round(cx - 2)) % 4 in (1, 2) and x < cx + 4 else 0)
            for y in range(cy - 4, reach + 1):
                if (x, y) in ellipse(cx, cy, 8, 8):
                    cap.add((x, y))
    if style == "curly":
        for a in range(180, 361, 24):
            cap |= ellipse(cx + math.cos(math.radians(a)) * 7.4, cy - 1.5 + math.sin(math.radians(a)) * 7.2, 2.3, 2.3)
        cap |= ellipse(cx - 7.4, cy + 1.5, 2, 2.6) | ellipse(cx + 7.2, cy + 1.5, 2, 2.6)
    if style == "bun":
        cap |= ellipse(cx, cy - 9, 3.6, 3)
    if style == "short":
        cap |= {(round(cx + 1), cy - 10), (round(cx + 2), cy - 10), (round(cx + 2), cy - 11)}
    if style == "braids":
        for bx in (cx - 7.5, cx + 6.5):
            cap |= capsule(bx, cy + 2, bx, shoulder_y + 7, 1.6)
    c.paint(cap, hair)
    for x, y in cap:
        if (x * 5 + y * 3) % 9 == 0 and c.get(x, y) == hair[1]:
            c.set(x, y, hair[0])
    if style == "braids":
        for bx in (cx - 7.5, cx + 6.5):
            c.set(round(bx - 0.5), shoulder_y + 6, CLOTH[look.accent][1])
    if style == "bun":
        c.set(round(cx + 2), cy - 8, CLOTH[look.accent][1])
    if style == "cap":
        dome2 = {p for p in ellipse(cx, cy - 2.5, 8.4, 6.6) if p[1] <= cy - 3}
        c.paint(dome2, CLOTH[look.accent])
        c.paint(rect(cx - 8, cy - 3, cx + 7, cy - 2), deeper(CLOTH[look.accent], 0.2))
        c.set(round(cx), cy - 9, CLOTH["white"][1])
    if style == "salakot":
        salakot(c, cx, cy - 2)


def draw_prop(c, prop, hx, hy, sole):
    hx, hy = round(hx), round(hy)
    if prop == "pail":
        body = poly([(hx - 3.5, hy + 2), (hx + 3.5, hy + 2), (hx + 2.5, hy + 8), (hx - 2.5, hy + 8)])
        c.paint(body, METAL)
        c.fill(line(hx - 3, hy + 1, hx, hy - 1) | line(hx, hy - 1, hx + 3, hy + 1), METAL[3])
        c.fill(rect(hx - 2, hy + 3, hx + 2, hy + 3), CLOTH["skyblue"][1])
    elif prop == "hammer":
        c.paint(rect(hx, hy - 7, hx, hy + 1), WOOD, inner=False)
        c.paint(rect(hx - 2, hy - 9, hx + 2, hy - 7), METAL)
    elif prop == "brush":
        c.paint(rect(hx, hy - 6, hx, hy + 1), WOOD, inner=False)
        c.paint(rect(hx - 1, hy - 9, hx + 1, hy - 7), CLOTH["red"], inner=False)
        c.set(hx, hy - 10, CLOTH["red"][0])
    elif prop == "mic":
        c.paint(rect(hx, hy - 4, hx, hy + 1), CLOTH["black"], inner=False)
        c.paint(ellipse(hx + 0.5, hy - 5.5, 1.8, 1.8), METAL)
    elif prop == "broom":
        c.paint(rect(hx, hy - 12, hx, sole - 5), WOOD, inner=False)
        c.paint(poly([(hx - 1.5, sole - 6), (hx + 1.5, sole - 6), (hx + 3.5, sole), (hx - 3.5, sole)]), NIPA)
        for x in range(hx - 3, hx + 4, 2):
            c.set(x, sole - 1, NIPA[2])
    elif prop in ("broom-a", "broom-b"):
        # A walis tingting mid sweep, leaning one way, then the other.
        lean = -4 if prop == "broom-a" else 4
        c.fill(line(hx, hy - 10, hx + lean, sole - 4), WOOD[2])
        for k in range(-3, 4):
            c.fill(line(hx + lean, sole - 4, hx + lean + k * 1.5 + lean * 0.4, sole), NIPA[1 + (k % 2)])
    elif prop == "clipboard":
        c.paint(rect(hx - 3, hy - 6, hx + 2, hy + 1), TRUNK)
        c.paint(rect(hx - 2, hy - 5, hx + 1, hy), CLOTH["white"], inner=False)
        c.fill({(hx - 1, hy - 4), (hx, hy - 4), (hx - 1, hy - 2), (hx, hy - 2)}, CLOTH["gray"][2])
    elif prop == "flower":
        c.fill(line(hx, hy, hx, hy - 5), CLOTH["green"][2])
        c.paint(ellipse(hx + 0.5, hy - 6.5, 1.8, 1.8), CLOTH["pink"], inner=False)
        c.set(hx, hy - 7, GOLD[0])
    elif prop == "garland":
        for a in range(0, 360, 30):
            c.set(round(hx + math.cos(math.radians(a)) * 2.8), round(hy + 4 + math.sin(math.radians(a)) * 3.8), CLOTH["white"][0])
        c.set(hx, hy + 8, CLOTH["green"][1])
    elif prop == "brick":
        c.paint(rect(hx - 3, hy - 1, hx + 2, hy + 2), (hexc("#f49a78"), hexc("#d87256"), hexc("#b05440"), hexc("#7a3630")))
    elif prop == "basket":
        c.paint(ellipse(hx, hy + 3, 4, 3) - rect(hx - 5, hy - 1, hx + 5, hy + 1), NIPA)
        c.fill(line(hx - 3, hy + 1, hx, hy - 3) | line(hx, hy - 3, hx + 3, hy + 1), NIPA[2])
        c.set(hx - 1, hy + 2, CLOTH["red"][1])
        c.set(hx + 1, hy + 2, CLOTH["yellow"][1])
    elif prop == "bell":
        c.paint(poly([(hx - 1.5, hy - 4), (hx + 1.5, hy - 4), (hx + 2.5, hy), (hx - 2.5, hy)]), GOLD, inner=False)


# Who is who ------------------------------------------------------------------------------------

PUPIL = Look("tan", "short", "black", "white", "polo", "navy", "shorts", socks=True, extras=("backpack",), accent="orange")

CAST = {
    "pupil": PUPIL,
    # Lesson 2's leaders.
    "bea": Look("tan", "ponytail", "brown", "yellow", "tee", "denim", "skirt", size="teen", extras=("lanyard",), accent="red"),
    "tatay": Look("brown", "short", "black", "teal", "polo", "denim", "pants", size="adult", extras=("mustache",)),
    "nanay": Look("tan", "bun", "black", "pink", "blouse", "purple", "skirt", "sandal", size="adult", accent="yellow"),
    "principal": Look("light", "bob", "brown", "navy", "blazer", "navy", "skirt", size="adult", extras=("glasses",)),
    "president": Look("tan", "short", "gray", "cream", "barong", "black", "pants", size="adult"),
    "father": Look("light", "short", "black", "white", "cassock", "black", "long", size="adult", extras=("cross",)),
    # Lesson 3's crew, each with their gift.
    "marco": Look("tan", "cap", "black", "orange", "tee", "khaki", "shorts", socks=True, extras=("whistle",), prop="clipboard", accent="blue"),
    "ben": Look("brown", "buzz", "black", "green", "tee", "denim", "shorts", "sandal", prop="pail"),
    "ana": Look("tan", "bun", "black", "red", "tee", "denim", "pants", prop="hammer", accent="yellow"),
    "carla": Look("light", "long", "auburn", "skyblue", "tee", "pink", "skirt", prop="brush"),
    "dino": Look("brown", "curly", "black", "purple", "tee", "black", "shorts", socks=True, prop="mic"),
    "ella": Look("tan", "bob", "black", "yellow", "tee", "teal", "skirt", "sandal", extras=("apron",), prop="broom"),
    # Lesson 4: friends from all over the world.
    "amira": Look("brown", "headscarf", "purple", "teal", "tee", "navy", "pants", prop="flower"),
    "kofi": Look("deep", "curly", "black", "yellow", "tee", "khaki", "shorts", "sandal"),
    "lena": Look("light", "braids", "blond", "red", "tee", "denim", "skirt", accent="blue"),
    "hiro": Look("light", "short", "black", "blue", "tee", "gray", "pants", extras=("glasses",)),
    # Lesson 1's classmates, in school uniforms, each holding a brick.
    "mia": Look("tan", "ponytail", "black", "white", "polo", "navy", "skirt", socks=True, prop="brick", accent="red"),
    "jun": Look("brown", "short", "black", "white", "polo", "navy", "shorts", socks=True, prop="brick"),
    "joy": Look("light", "bob", "brown", "white", "polo", "navy", "skirt", socks=True, prop="brick"),
    # The town along the road.
    "lola": Look("tan", "bun", "gray", "purple", "blouse", "maroon", "skirt", "sandal", size="adult", accent="pink"),
    "lolo": Look("brown", "short", "gray", "cream", "barong", "khaki", "pants", "sandal", size="adult", extras=("mustache",)),
    "farmer": Look("brown", "salakot", "black", "blue", "tee", "khaki", "pants", "sandal", size="adult", extras=("towel",)),
    "driver": Look("tan", "cap", "black", "red", "tee", "denim", "pants", "sandal", size="adult", extras=("towel",), accent="yellow"),
    "tindera": Look("tan", "ponytail", "black", "green", "blouse", "navy", "skirt", "sandal", size="adult", extras=("apron",), accent="yellow"),
    "sorbetero": Look("brown", "cap", "black", "white", "tee", "navy", "pants", size="adult", accent="red", prop="bell"),
    "vendor": Look("light", "short", "black", "orange", "tee", "black", "pants", "sandal", size="adult", extras=("apron",)),
    "candle": Look("tan", "bob", "gray", "teal", "blouse", "purple", "skirt", "sandal", size="adult"),
    "balloon": Look("brown", "cap", "black", "yellow", "tee", "khaki", "pants", "sandal", size="adult", accent="green"),
    "nina": Look("tan", "braids", "black", "pink", "dress", "pink", "skirt", "sandal", prop="garland", accent="yellow"),
    "toto": Look("brown", "short", "black", "red", "tee", "denim", "shorts", "sandal"),
    "ate": Look("light", "long", "black", "skyblue", "blouse", "denim", "skirt", "sandal", size="teen", prop="basket"),
}

CREW = ("marco", "ben", "ana", "carla", "dino", "ella")
FRONT_FRAMES = ("idle-0", "idle-1", "blink", "wave-0", "wave-1", "cheer-0", "cheer-1")
WALKERS = ("pupil", "lola", "lolo", "ate", "toto")


def build_people():
    sprites = {}
    for name, look in CAST.items():
        for f in FRONT_FRAMES:
            sprites[f"{name}-{f}"] = front(look, f)
    for name in WALKERS:
        for i in range(WALK_FRAMES):
            sprites[f"{name}-walk-{i}"] = side(CAST[name], i)
        sprites[f"{name}-stand"] = side(CAST[name], 0, swing=0)
    for k, prop in enumerate(("broom-a", "broom-b")):
        sprites[f"lola-sweep-{k}"] = front(CAST["lola"], "idle-0" if k == 0 else "idle-1", prop)
    for name in CREW:
        for i in range(WALK_FRAMES):
            sprites[f"{name}-carry-{i}"] = side(CAST[name], i, pose="carry", swing=0.8)
        sprites[f"{name}-lift"] = side(CAST[name], 0, pose="carry", swing=0)
    return sprites
