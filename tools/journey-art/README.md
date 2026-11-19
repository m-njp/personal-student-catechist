# A Journey to Remember art

These scripts draw every picture and sound in Lesson 05's game. They are the source: change a script and run it, rather than editing the PNG or WAV files by hand. A later run would overwrite those edits.

The art is all original and drawn in code. It shares nothing with Lesson 02's town: the people are larger, shaded with hue shifted ramps, and wrapped in soft colored outlines instead of black.

Needs Python 3 with Pillow and NumPy (`pip install pillow numpy`). From this folder:

```
python gen.py
python sounds.py
```

They write into `public/lessons/lesson-05/journey`: `atlas.png` and `atlas.json` hold every picture, and `sounds/` holds the music and sound effects.

| Script | Draws |
| --- | --- |
| `pix.py` | the drawing kit: shapes, ramps, lighting, and outlines |
| `palette.py` | every color, as four step ramps |
| `people.py` | everyone: walking, carrying, standing, blinking, waving, and cheering |
| `world.py` | the sky, hills, road, the wall, the globe, and the Church |
| `buildings.py` | the bayan's house, school, town hall, and chapel, and the bahay kubo, near life size |
| `town.py` | vehicles, stalls, the sari-sari store, animals, and the fiesta: bell, bunting, fireworks, confetti |
| `gen.py` | packs everything into the atlas, with the numbers the game needs (`meta`) |
| `sounds.py` | the walking tune, the Church's swell, and the short sounds |

## How the pictures fit the game

- The game is drawn for a screen 270 pixels tall. The road's top is `groundTop`, and feet stand `feetRow` rows into it.
- Side figures face right and are centered on column 19 of a 40 pixel wide sheet, front figures on column 20. Each sheet has 2 empty rows under the soles.
- The wide layers (`far`, `mid`, `near`) repeat every `loop` pixels with no seam.
- The wall's brick list (`meta.bricks`) is the order the bricks fall in during the replay.
- A new person is one `Look` in `people.py`. Where they stand is in `src/features/journey/render/` (`roadside.ts`, `memories.ts`, and `church.ts`).
