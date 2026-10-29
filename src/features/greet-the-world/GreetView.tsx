"use client";

import { LaptopIcon } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { ActivityViewProps } from "@/core/activity/ActivityRegistry";
import { readToken } from "@/lib/tokens";
import type { GreetActivity } from "./GreetActivity";

// The camera, the models, and the save need the browser, so the game never renders on the server.
const GreetGame = dynamic(() => import("./ui/GreetGame").then((module) => module.GreetGame), {
  ssr: false,
  loading: () => <p className="flex flex-1 items-center justify-center text-muted">Loading the game</p>,
});

const query = () => window.matchMedia(`(min-width: ${readToken("--greet-min-width")}) and (orientation: landscape)`);

function subscribe(onChange: () => void) {
  const list = query();
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/** A laptop or desktop in landscape. Elsewhere the game never mounts, so the camera never opens. */
function useWideScreen(): boolean {
  return useSyncExternalStore(subscribe, () => query().matches, () => false);
}

/** Lesson 04, Greet the World. */
export function GreetView({ activity }: ActivityViewProps<GreetActivity>) {
  const wide = useWideScreen();
  if (wide) return <GreetGame activity={activity} />;
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <p role="status" className="flex max-w-sm flex-col items-center gap-3 text-center text-muted">
        <LaptopIcon aria-hidden weight="duotone" className="size-12 text-ink" />
        {activity.content.notice}
      </p>
    </div>
  );
}
