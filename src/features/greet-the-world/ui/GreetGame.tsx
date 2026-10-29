"use client";

import { CornersInIcon, CornersOutIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useSfx } from "@/features/storybook/useSfx";
import { useFullscreen } from "@/hooks/useFullscreen";
import type { GreetActivity } from "../GreetActivity";
import { DetectionLog } from "../detection/DetectionLog";
import { useModels } from "../detection/useCamera";
import { useGreet } from "../game/useGreet";
import { greetFonts } from "./fonts";
import { FieldHeader, type FieldStep } from "./FieldHeader";
import { GuideScreen } from "./GuideScreen";
import { Loading } from "./Loading";
import { PlayScreen } from "./PlayScreen";
import { SetupCheck } from "./SetupCheck";
import { cornerButton, look } from "./styles";
import { TeacherPanel } from "./TeacherPanel";
import { TitleScreen } from "./TitleScreen";

/** The game's frame: the fonts, the steps across the top, full screen, sound, and the teacher's corner. */
export function GreetGame({ activity }: { activity: GreetActivity }) {
  const { content } = activity;
  const store = activity.store();
  const scores = useGreet(store, (state) => state.league.scores);
  const settings = useGreet(store, (state) => state.settings);
  const fullscreen = useFullscreen();
  const [screen, setScreen] = useState<FieldStep | "title">("title");
  const [log] = useState(() => new DetectionLog());
  const needsCamera = screen === "setup" || (screen === "play" && !settings.noCamera);
  const [cameraWanted, setCameraWanted] = useState(false);
  const models = useModels(`${activity.assets}/mediapipe`, cameraWanted || needsCamera);
  const play = useSfx(activity.sounds, settings.sound);
  const camera = useMemo(() => ({ thresholds: settings.thresholds, holdMs: settings.holdMs }), [settings.thresholds, settings.holdMs]);
  const go = (next: FieldStep) => {
    if (next === "play") fullscreen.enter();
    if (next === "setup" || (next === "play" && !settings.noCamera)) setCameraWanted(true);
    setScreen(next);
  };
  let body;
  if (screen === "title") body = <TitleScreen content={content} onStep={go} />;
  else if (screen === "setup" && !models.models) body = <Loading content={content} step={models.step} failed={models.failed} onRetry={models.retry} onBack={() => setScreen("title")} />;
  else if (screen === "guide") body = <GuideScreen content={content} onPlay={() => go("play")} />;
  else if (screen === "setup" && models.models) body = <SetupCheck content={content} models={models.models} log={log} settings={camera} play={play} onContinue={() => go("guide")} />;
  else body = <PlayScreen content={content} scores={scores} models={settings.noCamera ? null : models.models} cameraLoading={!settings.noCamera && !models.models ? models : undefined} log={log} settings={camera} store={store} play={play} music={activity.music} sound={settings.sound} />;
  return <div className={fullscreen.active ? "fixed inset-0 z-50 flex min-h-0 flex-col bg-greet-cream" : "flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 lg:px-10 lg:pb-6"}>
    <div className={`${greetFonts} ${look}`}>
      {screen !== "title" && <FieldHeader content={content} step={screen} onStep={go} onHome={() => setScreen("title")} />}
      {body}
      <div className="greet-corner-tools"><TeacherPanel content={content} store={store} /><button type="button" aria-label={fullscreen.active ? content.teacher.leaveFullScreen : content.teacher.fullScreen} onClick={fullscreen.active ? fullscreen.exit : fullscreen.enter} className={cornerButton}>{fullscreen.active ? <CornersInIcon aria-hidden /> : <CornersOutIcon aria-hidden />}</button></div>
    </div>
  </div>;
}
