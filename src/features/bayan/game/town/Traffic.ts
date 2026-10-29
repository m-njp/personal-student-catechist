import type { GridEngine } from "grid-engine";
import * as Phaser from "phaser";
import { KEY, TILE, VEHICLE } from "../assets";
import { standingDepth } from "../depth";
import type { TileRect } from "../mapObjects";

/** Pixels a second: an unhurried drive through town. */
const SPEED = 34;
const STOP_MS = 2500;
const EVERY_MS: readonly [number, number] = [6000, 12_000];
/** How close ahead the pupil may stand before the jeepney waits for them. */
const SAFE_GAP = TILE;

/**
 * A jeepney that drives through town on the road now and then, stops at the waiting shed, and waits
 * if the pupil is standing in its way. With reduced motion it stays parked at the stop.
 */
export class Traffic {
  private readonly jeepney: Phaser.GameObjects.Sprite;
  private state: "away" | "driving" | "stopped" = "away";
  private timer: Phaser.Time.TimerEvent | null = null;
  private readonly start: number;
  private readonly end: number;
  private readonly stopAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gridEngine: GridEngine,
    private readonly lane: TileRect & { stop: number },
    private readonly pupil: string,
    calm: boolean,
  ) {
    if (!scene.anims.exists("jeepney")) {
      scene.anims.create({ key: "jeepney", frames: scene.anims.generateFrameNumbers(KEY.vehicles, { start: 0, end: 1 }), frameRate: 5, repeat: -1 });
    }
    this.start = lane.x * TILE - VEHICLE.width;
    this.end = (lane.x + lane.width) * TILE;
    this.stopAt = lane.stop * TILE;
    const y = lane.y * TILE + lane.height * TILE - VEHICLE.height;
    this.jeepney = scene.add.sprite(calm ? this.stopAt : this.start, y, KEY.vehicles, 0).setOrigin(0);
    this.jeepney.setDepth(standingDepth(y + VEHICLE.height));
    if (calm) return;
    this.jeepney.setVisible(false);
    this.later(Phaser.Math.Between(1500, 4000), () => this.depart());
  }

  /** Called every frame: drives on, unless the pupil is just ahead. */
  update(deltaMs: number): void {
    if (this.state !== "driving") return;
    const front = this.jeepney.x + VEHICLE.width;
    const at = this.gridEngine.getPosition(this.pupil);
    const onRoad = at.y >= this.lane.y && at.y < this.lane.y + this.lane.height;
    const ahead = at.x * TILE - front;
    if (onRoad && ahead > -VEHICLE.width && ahead < SAFE_GAP) {
      this.jeepney.anims.pause();
      return;
    }
    this.jeepney.anims.resume();
    const before = this.jeepney.x;
    this.jeepney.x += (SPEED * deltaMs) / 1000;
    if (before < this.stopAt && this.jeepney.x >= this.stopAt) {
      this.jeepney.x = this.stopAt;
      this.state = "stopped";
      this.jeepney.anims.pause();
      this.later(STOP_MS, () => {
        this.state = "driving";
      });
    }
    if (this.jeepney.x > this.end) {
      this.state = "away";
      this.jeepney.setVisible(false).anims.stop();
      this.later(Phaser.Math.Between(...EVERY_MS), () => this.depart());
    }
  }

  dispose(): void {
    this.timer?.remove();
  }

  private depart() {
    this.jeepney.setX(this.start).setVisible(true).play("jeepney");
    this.state = "driving";
  }

  private later(ms: number, fn: () => void) {
    this.timer?.remove();
    this.timer = this.scene.time.delayedCall(ms, fn);
  }
}
