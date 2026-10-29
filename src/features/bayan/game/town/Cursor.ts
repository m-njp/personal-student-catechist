import type * as Phaser from "phaser";
import { TILE } from "../assets";
import type { GamePalette } from "../createGame";
import { DEPTH } from "../depth";
import type { TilePoint } from "../mapObjects";

/** A wall flashes its X at most this often while a key is held against it. */
const BUMP_GAP_MS = 400;
const BUMP_MS = 650;

/**
 * Shows where the pupil can and cannot go: with a mouse, an outline on the tile under the pointer,
 * green where they can walk and coral with an X where they cannot; and on any device, a red X that
 * pops on a blocked tile they tap or walk into.
 */
export class Cursor {
  private readonly hover: Phaser.GameObjects.Graphics;
  private lastBump = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly palette: GamePalette,
  ) {
    this.hover = scene.add.graphics().setDepth(DEPTH.hoverTile).setVisible(false);
  }

  /** The tile under a mouse pointer, or nothing for touch and while the pupil cannot move. */
  show(tile: TilePoint | null, blocked: boolean): void {
    this.hover.clear();
    if (!tile) {
      this.hover.setVisible(false);
      return;
    }
    const color = blocked ? this.palette.blocked : this.palette.walkable;
    this.hover.lineStyle(1, color, 0.9);
    this.hover.strokeRect(tile.x * TILE + 0.5, tile.y * TILE + 0.5, TILE - 1, TILE - 1);
    if (blocked) cross(this.hover, tile, color, 0.9);
    this.hover.setVisible(true);
  }

  /** A red X on a tile the pupil cannot enter. */
  bump(tile: TilePoint): void {
    const now = this.scene.time.now;
    if (now - this.lastBump < BUMP_GAP_MS) return;
    this.lastBump = now;
    const mark = this.scene.add.graphics().setDepth(DEPTH.bump);
    mark.fillStyle(this.palette.blocked, 0.25);
    mark.fillRect(tile.x * TILE, tile.y * TILE, TILE, TILE);
    mark.lineStyle(2, this.palette.blocked, 1);
    cross(mark, tile, this.palette.blocked, 1);
    this.scene.tweens.add({ targets: mark, alpha: 0, delay: BUMP_MS / 2, duration: BUMP_MS / 2, onComplete: () => mark.destroy() });
  }
}

function cross(g: Phaser.GameObjects.Graphics, tile: TilePoint, color: number, alpha: number) {
  const inset = 4;
  const x0 = tile.x * TILE + inset;
  const y0 = tile.y * TILE + inset;
  const x1 = (tile.x + 1) * TILE - inset;
  const y1 = (tile.y + 1) * TILE - inset;
  g.lineStyle(2, color, alpha);
  g.lineBetween(x0, y0, x1, y1);
  g.lineBetween(x1, y0, x0, y1);
}
