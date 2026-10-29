import * as Phaser from "phaser";
import { isLotDone, nextLot, REVEAL_STEPS, type BayanProgress } from "../BayanRules";
import type { LotId } from "../content";
import type { Near, UiState } from "../stores";
import { Frames, KEY, preloadAll } from "./assets";
import type { GameDeps } from "./createGame";
import { readTownObjects, type TilePoint, type TownObjects } from "./mapObjects";
import { SoundBoard } from "./SoundBoard";
import { Behaviors } from "./town/Behaviors";
import { Cast } from "./town/Cast";
import { Chatter } from "./town/Chatter";
import { Construction } from "./town/Construction";
import { Markers, type MarkPlan } from "./town/Markers";
import { Traffic } from "./town/Traffic";
import { PLAYER, WalkScene } from "./WalkScene";

const BUILDINGS = "buildings/";

/** Where the town opens: at the start, or at the church door when the pupil walks out. */
export interface TownStart {
  from?: "church";
}

/** The town: lots, leaders, the park, and the road. Draws what the stores hold; the Director runs the story. */
export class TownScene extends WalkScene {
  private chatter!: Chatter;
  private markers!: Markers;
  private traffic!: Traffic;
  private objects!: TownObjects;

  constructor(deps: GameDeps) {
    super("town", deps);
  }

  preload() {
    preloadAll(this, this.deps.assets);
  }

  create(start: TownStart = {}) {
    const { session, content } = this.deps;
    const frames = new Frames(this);
    this.frames = frames;
    const map = this.make.tilemap({ key: KEY.townMap });
    this.world = { width: map.widthInPixels, height: map.heightInPixels };
    const tilesets = [map.addTilesetImage("town", KEY.tilesTown), map.addTilesetImage("extra", KEY.tilesExtra)].filter(
      (tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null,
    );
    const buildingLayers = new Map<string, Phaser.Tilemaps.TilemapLayer>();
    for (const data of map.layers) {
      const layer = map.createLayer(data.name, tilesets);
      if (!layer) continue;
      if (data.name === "collisions") layer.setVisible(false);
      else if (data.name.startsWith(BUILDINGS)) buildingLayers.set(data.name.slice(BUILDINGS.length), layer);
    }

    const objects = readTownObjects(map);
    this.objects = objects;
    this.view = objects.view;
    const cast = new Cast(this, frames);
    this.cast = cast;
    // Who each person is comes from the lesson; where they stand and how they move, from the map.
    const look = (id: string) => {
      const person = content.people[id];
      if (!person) throw new Error(`The map has "${id}", but the lesson does not say who that is.`);
      return person.sprite;
    };
    cast.add({ id: PLAYER, kind: "pupil", look: look(objects.spawn.id), at: start.from === "church" ? objects.door : objects.spawn });
    const { guide, vendor } = objects;
    cast.add({ id: guide.id, kind: "guide", look: look(guide.id), at: guide, behavior: guide.behavior });
    for (const l of objects.leaders) cast.add({ id: l.id, kind: "leader", look: look(l.id), at: l, behavior: l.behavior, lot: l.lotId });
    for (const v of objects.villagers) {
      cast.add({ id: v.id, kind: "villager", look: look(v.id), at: v, behavior: v.behavior, lot: v.lotId, holds: v.holds });
    }
    for (const f of objects.townsfolk) cast.add({ id: f.id, kind: "townsfolk", look: look(f.id), at: f, behavior: f.behavior, roam: f.roam });
    cast.add({ id: vendor.id, kind: "vendor", look: look(vendor.id), at: vendor, behavior: vendor.behavior, holds: vendor.holds });
    for (const a of objects.animals) cast.add({ id: a.id, kind: "animal", look: look(a.id), at: a, behavior: a.behavior, roam: a.roam });
    for (const p of objects.plaques) cast.add({ id: p.id, kind: "plaque", look: "plaque", at: p, index: p.index });
    cast.start(this.gridEngine, map);

    const sounds = new SoundBoard(this, session.saved, session.ui, session.bus);
    this.chatter = new Chatter(this, cast, content, session.saved, session.ui, (x, y) => this.toScreen(x, y));
    this.markers = new Markers(this, cast, frames, session.saved, session.ui, (progress, ui) => this.markPlan(progress, ui));
    this.traffic = new Traffic(this, this.gridEngine, objects.lane, PLAYER, this.deps.calm);
    const behaviors = new Behaviors(this, this.gridEngine, cast, frames, objects.route);
    behaviors.start();
    const construction = new Construction(
      this,
      this.gridEngine,
      buildingLayers,
      objects,
      cast,
      behaviors,
      frames,
      sounds,
      this.chatter,
      content,
      session.saved,
      session.ui,
      session.bus,
      this.deps.palette,
      this,
    );

    const offBus = session.bus.on((event) => {
      if (event.type === "say") this.chatter.say(event.id, event.text);
      if (event.type === "reset") this.backToStart();
    });
    const offUi = session.ui.subscribe((state, previous) => {
      if (state.inside && !previous.inside) {
        sounds.play("door");
        this.scene.start("church");
      }
    });
    const showPlaques = () => this.showPlaques(session.saved.getState().progress);
    const offSaved = session.saved.subscribe(showPlaques);
    showPlaques();

    this.cleanups.push(
      () => behaviors.dispose(),
      offBus,
      offUi,
      offSaved,
      () => sounds.dispose(),
      () => this.chatter.dispose(),
      () => this.markers.dispose(),
      () => this.traffic.dispose(),
      () => construction.dispose(),
    );
    this.startWalking();
  }

  update(time: number, delta: number) {
    if (!this.cast) return;
    this.markers.update(time);
    this.chatter.update();
    this.traffic.update(delta);
    this.walk();
  }

  protected nearOf(id: string): Near | null {
    const actor = this.cast.get(id);
    if (!actor) return null;
    switch (actor.kind) {
      case "leader":
        return actor.lot ? { kind: "leader", id, lot: actor.lot } : null;
      case "guide":
        return { kind: "guide", id };
      case "townsfolk":
      case "vendor":
      case "villager":
        return { kind: "townsfolk", id, lot: actor.lot };
      case "plaque":
        // The plaques are part of the park until Stage 4 asks the class to read them.
        return this.stage() >= 4 && actor.index !== undefined ? { kind: "plaque", id, index: actor.index } : null;
      default:
        return null;
    }
  }

  /** From Stage 3: St. Peter's statue, then the church door once his card is read. */
  protected spotAt(tile: TilePoint): Near | null {
    const { door, statue } = this.objects;
    const progress = this.deps.session.saved.getState().progress;
    if (progress.stage < 3) return null;
    // The statue's own tiles count too, so tapping it walks the pupil to its foot.
    const atStatue = tile.x >= statue.x && tile.x < statue.x + statue.width && tile.y >= statue.y && tile.y < statue.y + statue.height;
    if (atStatue) return { kind: "statue", id: statue.id };
    return progress.peterSeen && tile.x === door.x && tile.y === door.y ? { kind: "door", id: door.id } : null;
  }

  private stage() {
    return this.deps.session.saved.getState().progress.stage;
  }

  /** Who to mark and where the arrow points, stage by stage. */
  private markPlan(progress: BayanProgress, ui: UiState): MarkPlan {
    const marks = new Map<string, "ask" | "done">();
    let arrow: MarkPlan["arrow"] = null;
    const leaders = this.cast.ofKind("leader");
    const leaderOf = (lot: LotId) => leaders.find((leader) => leader.lot === lot)?.id;
    switch (progress.stage) {
      case 1: {
        for (const leader of leaders) if (leader.lot) marks.set(leader.id, isLotDone(progress, leader.lot) ? "done" : "ask");
        const lot = nextLot(progress);
        const id = lot ? leaderOf(lot) : undefined;
        if (id) arrow = { actor: id };
        break;
      }
      case 2: {
        const priest = leaderOf("church");
        if (priest && progress.revealed < REVEAL_STEPS) {
          marks.set(priest, "ask");
          arrow = { actor: priest };
        }
        break;
      }
      case 3:
        if (!ui.inside) arrow = { tile: progress.peterSeen ? this.objects.door : this.objects.statue };
        break;
      case 4:
        for (const plaque of this.cast.ofKind("plaque")) {
          const index = plaque.index ?? 0;
          if (index < progress.plaquesOpen) marks.set(plaque.id, "done");
          else if (index === progress.plaquesOpen) {
            marks.set(plaque.id, "ask");
            arrow = { actor: plaque.id };
          }
        }
        break;
    }
    return { marks, arrow };
  }

  private showPlaques(progress: BayanProgress) {
    for (const plaque of this.cast.ofKind("plaque")) {
      const open = progress.stage > 4 || (progress.stage === 4 && (plaque.index ?? 0) < progress.plaquesOpen);
      plaque.sprite.setFrame(this.frames.extra(open ? "plaque-open" : "plaque"));
    }
  }

  private backToStart() {
    this.stopPlayer();
    this.gridEngine.setPosition(PLAYER, this.objects.spawn);
    this.chatter.clear();
  }
}
