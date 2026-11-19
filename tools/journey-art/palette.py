"""A Journey to Remember's colors: a warm golden hour palette with hue shifted ramps.

Shadows lean toward purple and highlights toward yellow, so nothing looks gray or muddy.
Each ramp is (highlight, base, shade, dark).
"""
from pix import ramp, hexc

SKIN = {
    "light": ramp("#ffe0c2", "#f6c19a", "#dd9878", "#b06a5a"),
    "tan": ramp("#f7c891", "#e0a46c", "#bd7c50", "#8c5440"),
    "brown": ramp("#d9996a", "#b8764c", "#925638", "#68392c"),
    "deep": ramp("#a8704c", "#86543a", "#663c2c", "#462620"),
}

HAIR = {
    "black": ramp("#5e5674", "#383048", "#272035", "#1a1424"),
    "brown": ramp("#a8764e", "#7c5236", "#5c3a28", "#3e261e"),
    "gray": ramp("#f0ecf6", "#c8c2d6", "#9c96b0", "#6e6886"),
    "blond": ramp("#fae6a4", "#e6c06c", "#c0923e", "#8c6430"),
    "auburn": ramp("#d27a52", "#a8513a", "#7e382c", "#552424"),
}

CLOTH = {
    "white": ramp("#ffffff", "#f1ede6", "#cdc6d8", "#9890ae"),
    "cream": ramp("#fff6de", "#f0e2bf", "#d0bb92", "#9e8a66"),
    "navy": ramp("#5868a0", "#3b4878", "#2a3358", "#1b2140"),
    "red": ramp("#f57e64", "#dc4d3e", "#ad3534", "#782430"),
    "yellow": ramp("#ffe596", "#f5c453", "#d6963a", "#9e5f2c"),
    "green": ramp("#9cd474", "#68ad52", "#477f45", "#2c5638"),
    "blue": ramp("#7ab8ec", "#4b8ccc", "#33649e", "#22426e"),
    "purple": ramp("#bd8ad4", "#9259ac", "#6a3c84", "#462656"),
    "pink": ramp("#ffb6c8", "#ec86a6", "#c45f84", "#8a3e5e"),
    "orange": ramp("#ffb870", "#ee8a42", "#c4662e", "#8a4224"),
    "teal": ramp("#78d4c4", "#3fae9e", "#2c827a", "#1d5552"),
    "khaki": ramp("#ead19a", "#c9a96a", "#a2804c", "#715636"),
    "denim": ramp("#7d9ad0", "#5672ae", "#3e5488", "#2a385e"),
    "gray": ramp("#a8acc4", "#7c809c", "#5a5d78", "#3c3e56"),
    "black": ramp("#605874", "#3e384e", "#2c2738", "#1c1826"),
    "brown": ramp("#c08a5e", "#95643f", "#704a30", "#4a3022"),
    "maroon": ramp("#c45a6a", "#94394e", "#6c283c", "#481a2a"),
    "skyblue": ramp("#bfe6ff", "#8ccaf2", "#62a2d2", "#40729e"),
}

EYE = hexc("#2a1d34")
EYE_HI = hexc("#ffffff")
BLUSH = hexc("#f08a8a")
MOUTH = hexc("#a8424e")
SOCK = CLOTH["white"]
SHOE = ramp("#6e5a6c", "#4a3a4c", "#352837", "#221a26")
SANDAL = ramp("#c69468", "#9a6a46", "#744c32", "#4e3222")

# Nature and buildings.
GRASS = ramp("#b4e07a", "#7fbf55", "#5a9a47", "#3b6e3c")
GRASS_DEEP = ramp("#8cc464", "#5f9c48", "#457a3e", "#2e5536")
LEAF = ramp("#9ed06a", "#62a24e", "#447c42", "#2c5636")
LEAF_DARK = ramp("#6aa456", "#477e46", "#33603e", "#223f30")
PALM = ramp("#b8dc6e", "#7cb24e", "#558840", "#365e34")
TRUNK = ramp("#c49468", "#94683f", "#6e4a30", "#4a3022")
BAMBOO = ramp("#eadf8c", "#c8bc5a", "#9c9040", "#6e6430")
NIPA = ramp("#f0d48a", "#d6b064", "#b08844", "#7c5e30")
DIRT = ramp("#ecc896", "#d6a874", "#b48558", "#86603e")
STONE = ramp("#e4ddd2", "#bdb3a6", "#958a80", "#6a6060")
BRICK = ramp("#f08c6a", "#cf6448", "#a84a3a", "#76302c")
MORTAR = ramp("#f4ead8", "#ddd0ba", "#bba98e", "#8a7a64")
PLASTER = ramp("#fff6e2", "#f2e2c2", "#d8c39c", "#a8916e")
WALL_BLUE = ramp("#cfe6f0", "#a8cfe0", "#80aac4", "#5a7c9a")
WALL_GREEN = ramp("#d8ecc0", "#b4d69a", "#8ab276", "#5e8456")
WALL_PINK = ramp("#ffdcd0", "#f2b8a8", "#cc9084", "#9a6664")
ROOF_RED = ramp("#f08a62", "#c85a44", "#9c4038", "#6c2a2c")
ROOF_BLUE = ramp("#7c9ac8", "#566fa4", "#3e5080", "#2a3458")
ROOF_GREEN = ramp("#8cbc84", "#5e9468", "#43704e", "#2c4c3a")
WOOD = ramp("#d8a874", "#ae7c4e", "#865a38", "#5c3c28")
WOOD_DARK = ramp("#9c6c4a", "#744c34", "#563626", "#3a221a")
GOLD = ramp("#fff2a0", "#f8cf58", "#d89c3a", "#a06428")
GLASS = ramp("#d6f2ff", "#9ed4f0", "#6aa4d0", "#46769e")
METAL = ramp("#e8ecf4", "#b4bccc", "#868ea4", "#5c6278")
WATER = ramp("#bfeaf6", "#86cde8", "#5aa4cc", "#3c78a0")
LIGHT = ramp("#fffbe0", "#ffe9a0", "#ffd26a", "#f0a850")
FLAG_BLUE = ramp("#5a7ad8", "#2f53b4", "#223e8a", "#182a60")
FLAG_RED = ramp("#f0605a", "#d23a3a", "#a42a30", "#741e26")
