import { NoPathFoundStrategy, type GridEngine } from "grid-engine";
import * as Phaser from "phaser";
import { KEY, type Frames } from "../assets";
import type { TilePoint } from "../mapObjects";
import type { Actor, Cast } from "./Cast";

type Range = readonly [number, number];

const PUPIL = "pupil";

/**
 * How each person and animal moves when nobody is talking to them. Every one runs their own loop,
 * with their own speed, pauses, and habits, and none start together, so the town never moves in step.
 * Pauses are long on purpose: a calm town keeps eyes on the leaders.
 * Each map object names its behavior; a new one is a new entry in `run`.
 */
export class Behaviors {
  private stopped = false;
  /** Someone the story needs to stand still, until this time. */
  private readonly holds = new Map<string, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gridEngine: GridEngine,
    private readonly cast: Cast,
    private readonly frames: Frames,
    private readonly route: readonly TilePoint[],
  ) {}

  start(): void {
    const run: Record<string, (actor: Actor) => void> = {
      leader: (a) => this.leader(a),
      builder: (a) => this.builder(a),
      playful: (a) => this.playful(a),
      wanderer: (a) => this.wanderer(a),
      shopkeeper: (a) => this.shopkeeper(a),
      vendor: (a) => this.vendor(a),
      dog: (a) => this.dog(a),
      cat: (a) => this.cat(a),
      hen: (a) => this.hen(a),
    };
    for (const actor of this.cast.actors.values()) run[actor.behavior]?.(actor);
  }

  /** Stops someone's own habits for a while, so the story can move them. */
  hold(id: string, ms: number): void {
    this.gridEngine.stopMovement(id);
    this.holds.set(id, this.scene.time.now + ms);
  }

  dispose(): void {
    this.stopped = true;
  }

  // Leaders stand at their post, breathing, shifting their weight, and glancing about.
  private leader(actor: Actor) {
    this.breathe(actor);
    this.fidget(actor, [2500, 7000]);
  }

  // Builders swing their tools and potter round their lot; once it is built they just chat nearby.
  private builder(actor: Actor) {
    this.breathe(actor);
    const loop = () => {
      if (this.busy(actor)) return this.later(800, loop);
      const working = actor.held?.visible && actor.held.alpha > 0;
      if (working && Math.random() < 0.6) {
        this.swing(actor);
        return this.later(between([3000, 6000]), loop);
      }
      this.stroll(actor, actor.roam || 1, [1.2, 1.8], () => this.later(between(working ? [3000, 7000] : [6000, 14000]), loop));
    };
    this.later(between([0, 3000]), loop);
  }

  // Paolo never walks when he can run, and every so often he chases Joy.
  private playful(actor: Actor) {
    const loop = () => {
      if (this.busy(actor)) return this.later(800, loop);
      const friend = this.cast.ofKind("townsfolk").find((other) => other.id !== actor.id && other.behavior === "wanderer");
      if (friend && Math.random() < 0.12) {
        this.gridEngine.setSpeed(actor.id, 3.5);
        this.gridEngine.follow(actor.id, friend.id, { distance: 1, closestPointIfBlocked: true });
        return this.later(between([2500, 4500]), () => {
          this.gridEngine.stopMovement(actor.id);
          this.hop(actor, 2);
          this.later(between([400, 1200]), loop);
        });
      }
      this.stroll(actor, actor.roam, [2, 3], () => this.later(between([2500, 6000]), loop));
    };
    this.later(between([0, 1500]), loop);
  }

  // Joy ambles, stops to look at things, and sometimes bounces on the spot.
  private wanderer(actor: Actor) {
    const loop = () => {
      if (this.busy(actor)) return this.later(800, loop);
      if (Math.random() < 0.1) this.hop(actor, 2);
      this.stroll(actor, actor.roam, [1.5, 2.2], () => this.later(between([3000, 8000]), loop));
    };
    this.later(between([500, 2500]), loop);
  }

  // Aling Nena minds her store, stepping out now and then to call customers.
  private shopkeeper(actor: Actor) {
    this.breathe(actor);
    this.fidget(actor, [3000, 6000]);
    const loop = () => {
      if (this.busy(actor)) return this.later(800, loop);
      this.stroll(actor, actor.roam || 1, [1.5, 2], () =>
        this.later(between([2000, 4000]), () => this.walk(actor, actor.home, 1.5, () => this.later(between([8000, 15000]), loop))),
      );
    };
    this.later(between([6000, 12000]), loop);
  }

  // Mang Ben walks his round, unhurried, and lingers at each stop.
  private vendor(actor: Actor) {
    if (this.route.length === 0) return;
    let stop = 0;
    const next = () => {
      if (this.busy(actor)) return this.later(800, next);
      stop = (stop + 1) % this.route.length;
      this.walk(actor, this.route[stop], Phaser.Math.FloatBetween(1.2, 1.6), () => this.later(between([4000, 9000]), next));
    };
    this.later(between([500, 2000]), next);
  }

  // Bantay follows the pupil, wanders off to sniff something, then races back.
  private dog(actor: Actor) {
    const heel = (speed: number) => {
      this.gridEngine.setSpeed(actor.id, speed);
      this.gridEngine.follow(actor.id, PUPIL, { distance: 1, closestPointIfBlocked: true });
    };
    const loop = () => {
      heel(4);
      this.later(between([15000, 30000]), () => {
        if (this.busy(actor)) return loop();
        this.gridEngine.stopMovement(actor.id);
        const here = this.gridEngine.getPosition(actor.id);
        const sniffAt = this.freeTileNear(here, actor.roam || 3);
        if (!sniffAt) return loop();
        this.walk(actor, sniffAt, 3, () => {
          this.sniff(actor);
          this.later(between([1500, 3000]), () => {
            heel(7);
            this.later(1800, loop);
          });
        });
      });
    };
    this.later(between([0, 1000]), loop);
  }

  // Muning naps, blinking, and only now and then gets up to find a new spot.
  private cat(actor: Actor) {
    if (!this.scene.anims.exists("cat")) {
      const [open, shut] = [this.frames.extra("cat"), this.frames.extra("cat-blink")];
      this.scene.anims.create({
        key: "cat",
        frames: [open, open, open, open, open, shut].map((frame) => ({ key: KEY.extraFrames, frame })),
        frameRate: 3,
        repeat: -1,
      });
    }
    actor.sprite.play("cat");
    const loop = () => {
      this.later(between([15000, 35000]), () => {
        if (this.busy(actor)) return loop();
        actor.sprite.stop();
        this.stroll(actor, actor.roam || 2, [1, 1.4], () => {
          actor.sprite.play("cat");
          loop();
        });
      });
    };
    loop();
  }

  // Hens peck, take a few quick steps, and peck again.
  private hen(actor: Actor) {
    const loop = () => {
      if (this.busy(actor)) return this.later(800, loop);
      if (Math.random() < 0.6) {
        this.peck(actor);
        return this.later(between([1500, 3500]), loop);
      }
      this.stroll(actor, actor.roam || 2, [1.5, 2.5], () => this.later(between([2000, 5000]), loop));
    };
    this.later(between([0, 1500]), loop);
  }

  /** Walks to a free tile near the actor's home, or just waits when there is none. */
  private stroll(actor: Actor, radius: number, speed: Range, then: () => void) {
    const to = this.freeTileNear(actor.home, radius);
    if (!to) return this.later(1000, then);
    this.walk(actor, to, Phaser.Math.FloatBetween(speed[0], speed[1]), then);
  }

  private walk(actor: Actor, to: TilePoint, speed: number, then: () => void) {
    this.gridEngine.setSpeed(actor.id, speed);
    this.gridEngine
      .moveTo(actor.id, to, { noPathFoundStrategy: NoPathFoundStrategy.CLOSEST_REACHABLE, maxPathLength: 30 })
      .subscribe({ complete: () => this.later(0, then) });
  }

  private freeTileNear(center: TilePoint, radius: number): TilePoint | null {
    for (let tries = 0; tries < 8; tries++) {
      const to = { x: center.x + between([-radius, radius]), y: center.y + between([-radius, radius]) };
      if (!this.gridEngine.isTileBlocked(to)) return to;
    }
    return null;
  }

  /** A slow, uneven rise and fall, so people standing still still look alive. */
  private breathe(actor: Actor) {
    this.scene.tweens.add({
      targets: actor.sprite,
      y: -1,
      duration: between([700, 1200]),
      delay: between([0, 1500]),
      repeatDelay: between([300, 1800]),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Every so often: turn to look the other way, glance back, or give a little hop. */
  private fidget(actor: Actor, every: Range) {
    const loop = () => {
      const roll = Math.random();
      if (!this.busy(actor)) {
        if (roll < 0.45) turn(actor);
        else if (roll < 0.7) {
          turn(actor);
          this.later(between([500, 900]), () => turn(actor));
        } else if (roll < 0.8) this.hop(actor, 1);
      }
      this.later(between(every), loop);
    };
    this.later(between(every), loop);
  }

  /** A few hammer blows: a tool with a raised frame swaps between the two. */
  private swing(actor: Actor) {
    const held = actor.held;
    const raised = `${actor.holds}-up`;
    if (!held || !actor.holds || !this.frames.hasExtra(raised)) return;
    const frames = [this.frames.extra(raised), this.frames.extra(actor.holds)];
    const blows = between([2, 4]);
    for (let i = 0; i < blows * 2; i++) this.later(i * 220, () => held.setFrame(frames[i % 2]));
  }

  private hop(actor: Actor, times: number) {
    this.scene.tweens.add({ targets: actor.container, y: actor.container.y - 3, duration: 120, yoyo: true, repeat: times - 1 });
  }

  private peck(actor: Actor) {
    this.scene.tweens.add({ targets: actor.sprite, y: 2, duration: 90, yoyo: true, repeat: between([1, 3]), repeatDelay: 120 });
  }

  private sniff(actor: Actor) {
    this.scene.tweens.add({ targets: actor.sprite, y: 1, duration: 160, yoyo: true, repeat: 4 });
  }

  private busy(actor: Actor): boolean {
    return (this.holds.get(actor.id) ?? 0) > this.scene.time.now;
  }

  private later(ms: number, fn: () => void) {
    this.scene.time.delayedCall(ms, () => {
      if (!this.stopped) fn();
    });
  }
}

function between([min, max]: Range): number {
  return Phaser.Math.Between(Math.round(min), Math.round(max));
}

function turn(actor: Actor) {
  const flip = !actor.sprite.flipX;
  actor.sprite.setFlipX(flip);
  actor.held?.setFlipX(flip);
}
