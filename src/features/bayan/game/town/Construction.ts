import { NoPathFoundStrategy, type GridEngine } from "grid-engine";
import type * as Phaser from "phaser";
import { isBuilt, visibleBuildingLayers, type BayanProgress } from "../../BayanRules";
import { LOT_IDS, type BayanContent, type LotId } from "../../content";
import type { EventBus } from "../../events";
import type { ProgressStore, UiStore } from "../../stores";
import { KEY, TILE, type Frames } from "../assets";
import type { GamePalette } from "../createGame";
import { DEPTH, standingDepth } from "../depth";
import type { SoundBoard } from "../SoundBoard";
import type { Lot, TilePoint, TownObjects } from "../mapObjects";
import type { Behaviors } from "./Behaviors";
import type { Cast } from "./Cast";
import type { Chatter } from "./Chatter";

/** Steps of a building going up, in milliseconds. Each row of the building takes ROW. */
const BEAT = { scaffold: 500, firstRow: 900, row: 550, cheer: 300, back: 1700, built: 2300 };

/** Lets a building moment take the camera, then gives it back. */
export interface Spotlight {
  look(x: number, y: number): void;
  back(): void;
}

/**
 * Shows each lot as the saved progress says. A lot that becomes built while the town is on screen
 * goes up row by row behind scaffolding, with hammering, dust, and a cheer, and then says "built".
 * Whenever the save is (re)read, on page open or after a teacher's jump, everything is simply drawn as it is.
 */
export class Construction {
  private drawn: BayanProgress | null = null;
  private readonly flags = new Map<LotId, Phaser.GameObjects.Sprite>();
  private readonly stops: (() => void)[] = [];
  /** Everything a building moment starts, so a reset can stop it midway. */
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private readonly passing = new Set<Phaser.GameObjects.GameObject>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gridEngine: GridEngine,
    private readonly layers: Map<string, Phaser.Tilemaps.TilemapLayer>,
    private readonly objects: TownObjects,
    private readonly cast: Cast,
    private readonly behaviors: Behaviors,
    private readonly frames: Frames,
    private readonly sounds: SoundBoard,
    private readonly chatter: Chatter,
    private readonly content: BayanContent,
    private readonly saved: ProgressStore,
    private readonly ui: UiStore,
    private readonly bus: EventBus,
    private readonly palette: GamePalette,
    private readonly spotlight: Spotlight,
  ) {
    if (!scene.anims.exists("flag-wave")) {
      scene.anims.create({
        key: "flag-wave",
        frames: [
          { key: KEY.extraFrames, frame: frames.extra("flag-wave") },
          { key: KEY.extraFrames, frame: frames.extra("flag-wave-2") },
        ],
        frameRate: 3,
        repeat: -1,
      });
    }
    for (const at of objects.flags) {
      // Sorted with the people by its foot, so anyone passing in front of the pole is drawn in front.
      const flag = scene.add.sprite(at.x * TILE, at.y * TILE, KEY.extraFrames, frames.extra("flag-wave")).setOrigin(0);
      flag.setDepth(standingDepth((at.y + 3) * TILE));
      this.flags.set(at.lot, flag.setVisible(false).play("flag-wave"));
    }

    this.stops.push(
      saved.subscribe(() => this.sync()),
      ui.subscribe((state, previous) => {
        // The save is about to be replaced: stop any building moment and redraw once it is back.
        if (!state.ready && previous.ready) {
          this.stopMoments();
          this.drawn = null;
        }
        if (state.ready !== previous.ready || state.dialog !== previous.dialog) this.sync();
      }),
    );
    this.sync();
  }

  dispose(): void {
    for (const stop of this.stops) stop();
    this.stopMoments();
  }

  /** Brings the town in line with the save. Waits while someone is talking, so the class sees it happen. */
  private sync() {
    const ui = this.ui.getState();
    if (!ui.ready) return;
    const progress = this.saved.getState().progress;
    if (!this.drawn) {
      this.drawAll(progress);
      this.drawn = progress;
      return;
    }
    if (ui.dialog || progress === this.drawn) return;
    const before = this.drawn;
    this.drawn = progress;
    for (const lot of LOT_IDS) {
      const was = isBuilt(before, lot);
      const now = isBuilt(progress, lot);
      if (!was && now) this.raise(lot);
      else if (was && !now) this.drawLot(lot, false);
    }
  }

  private drawAll(progress: BayanProgress) {
    const visible = new Set(visibleBuildingLayers(progress));
    for (const [name, layer] of this.layers) {
      layer.setVisible(visible.has(name)).setAlpha(1);
      layer.forEachTile((tile) => {
        tile.setVisible(true);
        tile.setAlpha(1);
      });
    }
    for (const lot of LOT_IDS) this.drawLot(lot, isBuilt(progress, lot));
  }

  private drawLot(lot: LotId, built: boolean) {
    this.layers.get(`${lot}-site`)?.setVisible(!built).setAlpha(1);
    this.layers.get(`${lot}-built`)?.setVisible(built).setAlpha(1);
    this.placeVillagers(lot, built);
    this.flags.get(lot)?.setVisible(built).setAlpha(1);
  }

  /** Builders hold their materials by their lot until it is built, then hang about by it, empty-handed. */
  private placeVillagers(lot: LotId, built: boolean) {
    const gathers = this.objects.gathers[lot];
    this.builders(lot).forEach((villager, i) => {
      this.gridEngine.stopMovement(villager.id);
      villager.held?.setVisible(!built).setAlpha(1);
      villager.home = built ? (gathers[i] ?? villager.origin) : villager.origin;
      this.gridEngine.setPosition(villager.id, villager.home);
    });
  }

  private raise(lot: LotId) {
    const site = this.layers.get(`${lot}-site`);
    const building = this.layers.get(`${lot}-built`);
    const area = this.area(lot);
    if (!site || !building || !area) return;
    const clearSite = () => this.scene.tweens.add({ targets: site, alpha: 0, duration: 300, onComplete: () => site.setVisible(false) });
    this.build(lot, area, building, clearSite);
  }

  /**
   * The building moment: the camera goes to the lot, scaffolding goes up, the building appears row by
   * row from the ground with a hammer blow and dust on each, then the town cheers and the camera comes back.
   */
  private build(lot: LotId, area: Lot, layer: Phaser.Tilemaps.TilemapLayer, clearSite: () => void) {
    const builders = this.builders(lot);
    const center = { x: (area.x + area.width / 2) * TILE, y: (area.y + area.height / 2) * TILE };
    this.spotlight.look(center.x, center.y);
    for (const builder of builders) this.behaviors.hold(builder.id, 8000);

    const rows = this.rowsOf(layer, area);
    layer.setVisible(true).setAlpha(1);
    for (const tile of rows.flat()) tile.setVisible(false);

    const scaffold = rows.flat().map((tile) =>
      this.keep(this.scene.add.sprite(tile.pixelX, tile.pixelY, KEY.extraFrames, this.frames.extra("scaffold")).setOrigin(0).setDepth(DEPTH.scaffold).setAlpha(0)),
    );
    this.after(BEAT.scaffold, () => {
      clearSite();
      this.sounds.play("hammer");
      this.scene.tweens.add({ targets: scaffold, alpha: 1, duration: 250 });
    });

    rows.forEach((row, i) => {
      this.after(BEAT.firstRow + i * BEAT.row, () => {
        this.sounds.play("hammer", 0.5);
        this.scene.cameras.main.shake(120, 0.002);
        for (const tile of row) {
          tile.setVisible(true);
          tile.setAlpha(0);
          this.scene.tweens.add({ targets: tile, alpha: 1, duration: 300 });
          this.dust({ x: tile.x, y: tile.y });
        }
      });
    });

    const done = BEAT.firstRow + rows.length * BEAT.row;
    this.after(done, () => {
      this.scene.tweens.add({ targets: scaffold, alpha: 0, duration: 300, onComplete: () => scaffold.forEach((s) => this.drop(s)) });
      this.sounds.play("rise");
    });
    this.after(done + BEAT.cheer, () => {
      this.sounds.play("build");
      this.sounds.play("cheer", 0.5);
      this.burst(area);
      this.gather(lot);
      const flag = this.flags.get(lot);
      if (flag) {
        flag.setVisible(true).setAlpha(0);
        this.scene.tweens.add({ targets: flag, alpha: 1, duration: 500 });
      }
    });
    this.after(done + BEAT.back, () => this.spotlight.back());
    this.after(done + BEAT.built, () => this.bus.emit({ type: "built", lot }));
  }

  /** The layer's tile rows inside the area, from the ground up, skipping empty rows. */
  private rowsOf(layer: Phaser.Tilemaps.TilemapLayer, area: Lot): Phaser.Tilemaps.Tile[][] {
    const rows: Phaser.Tilemaps.Tile[][] = [];
    for (let y = area.y + area.height - 1; y >= area.y; y--) {
      const tiles = layer.getTilesWithin(area.x, y, area.width, 1).filter((tile) => tile.index !== -1);
      for (const tile of tiles) tile.setAlpha(1);
      if (tiles.length > 0) rows.push(tiles);
    }
    return rows;
  }

  /** Builders put their tools down, gather by the finished building, and cheer. */
  private gather(lot: LotId) {
    const gathers = this.objects.gathers[lot];
    const lines = this.content.lots[lot].chatter.done;
    this.builders(lot).forEach((builder, i) => {
      if (builder.held) this.scene.tweens.add({ targets: builder.held, alpha: 0, duration: 250 });
      const spot = gathers[i];
      if (spot) {
        builder.home = spot;
        this.gridEngine.moveTo(builder.id, spot, { noPathFoundStrategy: NoPathFoundStrategy.CLOSEST_REACHABLE });
      }
      if (lines[i]) this.after(300 + i * 500, () => this.chatter.say(builder.id, lines[i]));
    });
  }

  private builders(lot: LotId) {
    return this.cast.ofKind("villager").filter((villager) => villager.lot === lot);
  }

  private area(lot: LotId): Lot | undefined {
    return this.objects.lots.find((l) => l.id === lot);
  }

  private dust(at: TilePoint) {
    const puff = this.keep(
      this.scene.add
        .sprite(at.x * TILE + TILE / 2, at.y * TILE + TILE / 2, KEY.extraFrames, this.frames.extra("dust"))
        .setDepth(DEPTH.dust)
        .setScale(0.6),
    );
    this.scene.tweens.add({
      targets: puff,
      scale: 1.4,
      alpha: 0,
      y: puff.y - 6,
      duration: 700,
      onComplete: () => this.drop(puff),
    });
  }

  private burst(area: Lot) {
    const emitter = this.keep(
      this.scene.add.particles((area.x + area.width / 2) * TILE, (area.y + 1) * TILE, KEY.extraFrames, {
        frame: this.frames.extra("confetti"),
        speed: { min: 60, max: 150 },
        angle: { min: 200, max: 340 },
        gravityY: 220,
        lifespan: 1400,
        rotate: { min: 0, max: 360 },
        tint: [...this.palette.confetti],
        emitting: false,
      }),
    );
    emitter.setDepth(DEPTH.confetti);
    emitter.explode(48);
    this.after(1600, () => this.drop(emitter));
  }

  private after(ms: number, fn: () => void) {
    this.timers.push(this.scene.time.delayedCall(ms, fn));
  }

  private keep<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.passing.add(object);
    return object;
  }

  private drop(object: Phaser.GameObjects.GameObject) {
    this.passing.delete(object);
    object.destroy();
  }

  private stopMoments() {
    for (const timer of this.timers.splice(0)) timer.remove();
    for (const object of this.passing) {
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }
    this.passing.clear();
  }
}
