"""Small pixel drawing kit: shapes are sets of pixels, painted with a four step color ramp.

A ramp is (highlight, base, shade, dark). Light comes from the top left, so a shape's top and left
edges catch the highlight and its bottom and right edges fall into shade. Outlines are a darker,
purple shifted copy of the color they wrap, never plain black, which keeps the look soft and warm.
"""
import math

from PIL import Image

INK = (42, 29, 52, 255)


def hexc(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def ramp(*hexes):
    return tuple(hexc(h) for h in hexes)


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (a[3],)


def outline_of(c):
    return mix(c, INK, 0.62)


# Shapes. Each returns a set of (x, y) pixel coordinates; a pixel is in when its center is.

def ellipse(cx, cy, rx, ry):
    out = set()
    for y in range(math.floor(cy - ry) - 1, math.ceil(cy + ry) + 1):
        for x in range(math.floor(cx - rx) - 1, math.ceil(cx + rx) + 1):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1.0:
                out.add((x, y))
    return out


def rect(x0, y0, x1, y1):
    return {(x, y) for y in range(round(y0), round(y1) + 1) for x in range(round(x0), round(x1) + 1)}


def capsule(x0, y0, x1, y1, r):
    out = set()
    vx, vy = x1 - x0, y1 - y0
    length2 = vx * vx + vy * vy or 1e-9
    for y in range(math.floor(min(y0, y1) - r) - 1, math.ceil(max(y0, y1) + r) + 1):
        for x in range(math.floor(min(x0, x1) - r) - 1, math.ceil(max(x0, x1) + r) + 1):
            px, py = x + 0.5, y + 0.5
            t = max(0.0, min(1.0, ((px - x0) * vx + (py - y0) * vy) / length2))
            dx, dy = px - (x0 + vx * t), py - (y0 + vy * t)
            if dx * dx + dy * dy <= r * r:
                out.add((x, y))
    return out


def poly(points):
    out = set()
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    for y in range(math.floor(min(ys)), math.ceil(max(ys)) + 1):
        for x in range(math.floor(min(xs)), math.ceil(max(xs)) + 1):
            px, py = x + 0.5, y + 0.5
            inside = False
            j = len(points) - 1
            for i in range(len(points)):
                xi, yi = points[i]
                xj, yj = points[j]
                if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                    inside = not inside
                j = i
            if inside:
                out.add((x, y))
    return out


def line(x0, y0, x1, y1):
    out = set()
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(int(steps) + 1):
        t = i / steps
        out.add((round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t)))
    return out


def shift(mask, dx, dy):
    return {(x + dx, y + dy) for x, y in mask}


def flip(mask, axis_x):
    return {(round(2 * axis_x - x - 1), y) for x, y in mask}


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.p = self.im.load()

    def inside(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def get(self, x, y):
        return self.p[x, y] if self.inside(x, y) else (0, 0, 0, 0)

    def set(self, x, y, c):
        if self.inside(x, y) and c[3] > 0:
            if c[3] < 255:
                base = self.p[x, y]
                if base[3] > 0:
                    a = c[3] / 255
                    c = tuple(round(base[i] * (1 - a) + c[i] * a) for i in range(3)) + (255,)
            self.p[x, y] = c

    def fill(self, mask, c):
        for x, y in mask:
            self.set(x, y, c)

    def paint(self, mask, r, inner=True, soft=False):
        """Fills a shape with its ramp, lit from the top left. `inner` draws a dark edge where it overlaps earlier paint."""
        hi, base, sh, dk = r
        for x, y in mask:
            right = (x + 1, y) not in mask
            down = (x, y + 1) not in mask
            left = (x - 1, y) not in mask
            up = (x, y - 1) not in mask
            c = base
            if right or down:
                c = sh
            elif (left or up) and not soft:
                c = hi
            if inner:
                for nx, ny, edge in ((x + 1, y, right), (x, y + 1, down), (x - 1, y, left), (x, y - 1, up)):
                    if edge and self.get(nx, ny)[3] > 0:
                        c = dk
                        break
            self.set(x, y, c)

    def shade_band(self, mask, r, side="right", width=2):
        """A second, wider shade along one side, for round forms."""
        hi, base, sh, dk = r
        xs = {}
        for x, y in mask:
            xs.setdefault(y, []).append(x)
        for y, row in xs.items():
            edge = max(row) if side == "right" else min(row)
            for x in row:
                if abs(x - edge) < width and (x, y) in mask and self.get(x, y) == base:
                    self.set(x, y, sh)

    def outline(self, color=None):
        """Wraps everything in a soft outline made from the color it borders."""
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.p[x, y][3] > 0:
                    continue
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    c = self.get(nx, ny)
                    if c[3] > 0:
                        add.append((x, y, color or outline_of(c)))
                        break
        for x, y, c in add:
            self.p[x, y] = c

    def paste(self, other, ox, oy):
        for y in range(other.h):
            for x in range(other.w):
                c = other.p[x, y]
                if c[3] > 0:
                    self.set(x + ox, y + oy, c)

    def dither(self, mask, c, phase=0):
        for x, y in mask:
            if (x + y + phase) % 2 == 0:
                self.set(x, y, c)

    def flipped(self):
        out = Canvas(self.w, self.h)
        out.im = self.im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        out.p = out.im.load()
        return out
