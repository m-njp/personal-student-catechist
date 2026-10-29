import { describe, expect, it, vi } from "vitest";
import { BrickWallActivity, type BrickWallInit } from "./BrickWallActivity";

const init: BrickWallInit = {
  id: "wall",
  title: "Build Our Wall",
  instructions: "Place one brick.",
  question: "Who built this?",
  photo: { src: "/x.jpg", width: 736, height: 736, alt: "" },
};

function make(overrides: Partial<BrickWallInit> = {}): BrickWallActivity {
  return new BrickWallActivity({ ...init, ...overrides });
}

/** The slot the tray brick fits. Fails the test if the wall is complete. */
function nextOf(wall: BrickWallActivity): number {
  const slot = wall.nextSlot;
  if (slot === null) throw new Error("The wall is already complete.");
  return slot;
}

/** Any slot other than the one the tray brick fits. */
function wrongSlotFor(wall: BrickWallActivity): number {
  return wall.pieces.findIndex((piece) => piece.index !== wall.nextSlot);
}

/** Lays every remaining brick and returns the spot numbers in the order they were laid. */
function layAll(wall: BrickWallActivity): number[] {
  const laid: number[] = [];
  while (wall.nextSlot !== null) {
    laid.push(wall.nextSlot + 1);
    wall.place(wall.nextSlot);
  }
  return laid;
}

describe("BrickWallActivity", () => {
  describe("setup", () => {
    it("starts empty with six bricks", () => {
      const wall = make();
      expect(wall.pieces).toHaveLength(6);
      expect(wall.filledCount).toBe(0);
      expect(wall.isComplete()).toBe(false);
    });

    it("uses the piece count it is given", () => {
      expect(make({ pieceCount: 8 }).pieces).toHaveLength(8);
    });

    it.each([1, 7.5])("refuses piece count %s", (pieceCount) => {
      expect(() => make({ pieceCount })).toThrow();
    });
  });

  describe("laying order", () => {
    it("starts with the bottom course by default", () => {
      const wall = make();
      const bottom = Math.max(...wall.pieces.map((piece) => piece.y + piece.height));
      const first = wall.pieces[nextOf(wall)];
      expect(first.y + first.height).toBe(bottom);
    });

    it("follows the spot numbers a lesson lists", () => {
      expect(layAll(make({ order: [3, 6, 1, 2, 5, 4] }))).toEqual([3, 6, 1, 2, 5, 4]);
    });

    it.each([[[1, 2, 3]], [[1, 1, 2, 3, 4, 5]], [[0, 1, 2, 3, 4, 5]], [[1, 2, 3, 4, 5, 7]]])(
      "refuses the order %j",
      (order) => {
        expect(() => make({ order })).toThrow();
      },
    );
  });

  describe("placing", () => {
    it("accepts only the slot the brick fits", () => {
      const wall = make();
      expect(wall.place(wrongSlotFor(wall))).toBe(false);
      expect(wall.filledCount).toBe(0);

      const right = nextOf(wall);
      expect(wall.place(right)).toBe(true);
      expect(wall.getSnapshot().filled[right]).toBe(true);
      expect(wall.filledCount).toBe(1);
    });

    it("refuses a filled slot and slots that do not exist", () => {
      const wall = make();
      const first = nextOf(wall);
      wall.place(first);
      for (const slot of [first, -1, 6, 1.5, Number.NaN]) {
        expect(wall.place(slot)).toBe(false);
      }
      expect(wall.filledCount).toBe(1);
    });
  });

  describe("tray brick", () => {
    it("takes the number and shape of its slot", () => {
      const wall = make();
      const next = wall.getSnapshot().next;
      const piece = wall.pieces[nextOf(wall)];
      expect(next?.slot).toBe(piece.index);
      expect(next?.number).toBe(piece.index + 1);
      expect(next?.aspect).toBeCloseTo(piece.width / piece.height);
      expect(next?.size).toBeGreaterThanOrEqual(0.5);
      expect(next?.size).toBeLessThanOrEqual(1);
    });
  });

  describe("completing and resetting", () => {
    it("completes after every brick is laid", () => {
      const wall = make();
      layAll(wall);
      expect(wall.isComplete()).toBe(true);
      expect(wall.nextSlot).toBeNull();
      expect(wall.getSnapshot()).toMatchObject({ complete: true, next: null, filledCount: 6 });
    });

    it("starts the script again on reset", () => {
      const wall = make();
      const first = nextOf(wall);
      wall.place(first);
      wall.place(nextOf(wall));
      wall.reset();
      expect(wall.filledCount).toBe(0);
      expect(wall.nextSlot).toBe(first);
    });
  });

  describe("notifications", () => {
    it("notifies only when the wall changes, and keeps snapshots stable in between", () => {
      const wall = make();
      const listener = vi.fn();
      wall.subscribe(listener);
      const before = wall.getSnapshot();
      expect(wall.getSnapshot()).toBe(before);

      wall.place(wrongSlotFor(wall));
      expect(listener).not.toHaveBeenCalled();

      wall.place(nextOf(wall));
      expect(listener).toHaveBeenCalledTimes(1);
      expect(wall.getSnapshot()).not.toBe(before);
    });
  });
});
