"use client";

import { ChevronDown, ChevronUp, Maximize, Minimize, RotateCcw } from "lucide-react";
import { useCallback, useState, type ComponentProps } from "react";
import type { ActivityViewProps } from "@/core/activity/ActivityRegistry";
import { Button } from "@/components/ui/Button";
import { Stage } from "@/components/ui/Stage";
import { useFullscreen } from "@/hooks/useFullscreen";
import type { BrickWallActivity } from "./BrickWallActivity";
import { Brick } from "./Brick";
import { useBrickWall } from "./useBrickWall";
import { useHalftoneRenderer } from "./useHalftoneRenderer";
import { Wall } from "./Wall";

/** The wall's dashed top and left border. */
const WALL_EDGE = 2;

function IconButton({ label, ...props }: ComponentProps<typeof Button> & { label: string }) {
  return <Button aria-label={label} title={label} className="px-0" {...props} />;
}

/** Build Our Wall: the whole activity on one screen, with a full screen mode for the TV. */
export function BrickWallView({ activity }: ActivityViewProps<BrickWallActivity>) {
  const { snapshot, place, reset } = useBrickWall(activity);
  const fullscreen = useFullscreen();
  const renderer = useHalftoneRenderer(activity.photo.src, activity.photo, activity.halftoneCells);
  const [targetSlot, setTargetSlot] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [misses, setMisses] = useState(0);

  const handlePlace = useCallback(
    (slot: number) => {
      if (place(slot)) setMisses(0);
      else setMisses((count) => count + 1);
    },
    [place],
  );

  const handleReset = useCallback(() => {
    setMisses(0);
    reset();
  }, [reset]);

  const { next } = snapshot;
  const caption = !next
    ? "The wall is complete."
    : misses > 0
      ? `Not this spot. Find spot ${next.number}.`
      : `Drag brick ${next.number} to spot ${next.number}.`;

  const floating = fullscreen.active;
  const showDetails = !(floating && collapsed);

  return (
    <div
      className={
        floating ? "fixed inset-0 z-50 flex flex-col bg-paper lg:flex-row" : "flex min-h-0 flex-1 flex-col lg:flex-row"
      }
    >
      <Stage
        aspect={activity.photo.width / activity.photo.height}
        className={floating ? "p-3 lg:p-6" : "px-4 py-3 lg:py-6 lg:pl-10 lg:pr-4"}
      >
        {(fit) => (
          <Wall
            photo={activity.photo}
            pieces={activity.pieces}
            width={fit.width - WALL_EDGE}
            height={fit.height - WALL_EDGE}
            cells={activity.halftoneCells}
            filled={snapshot.filled}
            complete={snapshot.complete}
            question={activity.question}
            targetSlot={targetSlot}
            renderer={renderer}
            onPlace={handlePlace}
          />
        )}
      </Stage>

      <aside
        aria-label="Wall controls"
        className={`flex shrink-0 flex-col gap-3 px-4 pb-4 ${
          floating
            ? `lg:absolute lg:bottom-6 lg:right-6 lg:z-10 lg:rounded-2xl lg:border lg:border-hairline lg:bg-paper lg:p-4 lg:shadow-float ${
                collapsed ? "lg:w-auto" : "lg:w-float-panel"
              }`
            : "lg:w-panel lg:justify-center lg:gap-6 lg:py-6 lg:pl-4 lg:pr-8"
        }`}
      >
        {showDetails && (
          <div className="flex flex-col gap-2">
            {/* The tray keeps its size, even when empty, so the wall never moves. */}
            <div className="h-tray shrink-0 rounded-2xl bg-wash p-3">
              <div className="flex size-full items-center justify-center [container-type:size]">
                {next && (
                  <div key={snapshot.filledCount} className="animate-pop-in">
                    <Brick brick={next} nudge={misses} onHover={setTargetSlot} onDrop={handlePlace} />
                  </div>
                )}
              </div>
            </div>
            <p className="h-5 truncate text-center text-sm text-muted lg:text-left" aria-live="polite">
              {caption}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {showDetails && (
            <Button
              variant={snapshot.complete ? "solid" : "quiet"}
              onClick={handleReset}
              className="flex-1 lg:flex-none lg:px-6"
            >
              <RotateCcw aria-hidden className="size-4" />
              {snapshot.complete ? "Build again" : "Reset"}
            </Button>
          )}
          <IconButton
            label={floating ? "Leave full screen" : "Full screen"}
            onClick={floating ? fullscreen.exit : fullscreen.enter}
          >
            {floating ? <Minimize aria-hidden className="size-4" /> : <Maximize aria-hidden className="size-4" />}
          </IconButton>
          {floating && (
            <IconButton
              label={collapsed ? "Show controls" : "Hide controls"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? <ChevronUp aria-hidden className="size-4" /> : <ChevronDown aria-hidden className="size-4" />}
            </IconButton>
          )}
        </div>
      </aside>
    </div>
  );
}
