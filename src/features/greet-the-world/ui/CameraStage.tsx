"use client";

import { CheckIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { readNumberToken, readToken } from "@/lib/tokens";
import { fill, type GreetContent, type Reading } from "../content";
import type { CameraLoop, CameraView } from "../detection/CameraLoop";
import { tracking } from "../detection/config";
import { LandmarkSmoother } from "../detection/LandmarkSmoother";
import { POSE, type Landmarks } from "../detection/geometry";
import type { Models } from "../detection/models";
import { KeyButton } from "./KeyButton";
import { SIGN_ICONS } from "./signs";

interface CameraStageProps {
  content: GreetContent;
  models: Models;
  loop: CameraLoop | null;
  view: CameraView | null;
  onVideo: (video: HTMLVideoElement | null) => void;
  /** The signs the card asks for. Each gets a meter on every player's tag. */
  targets: readonly Reading[];
  /** The name under each player's number: their group, or Player 1 and 2 in setup. */
  names: readonly [string, string];
  /** Sides that have answered this card, so their tag says so. */
  answered?: readonly boolean[];
}

const SIDES = ["greet-tag-blue", "greet-tag-orange"];
const FACE_SIGNS = new Set<Reading>(["happy", "surprised"]);
const HAND_SIGNS = new Set<Reading>(["thumbsUp", "thumbsDown", "pointingUp", "victory", "openPalm", "twoOpenPalms", "fist", "pointingDown"]);
/** The camera starts reading a sign's meter as "getting close" from this level. */
const NEAR = 0.4;

/** MediaPipe draws points from 0 to 1 across its canvas; ours are mirrored and stretched by the aspect. */
const normal = (points: Landmarks, aspect: number) => points.map((point) => ({ x: point.x / aspect, y: point.y, z: 0, visibility: point.visibility }));

/**
 * The mirrored camera, filling its space. Each player gets a thin outline in their side's color, plus their
 * hands or face when the card asks for one, so the class sees exactly what is being read. Over each head, a
 * numbered tag has a meter per answer sign: a light bar for how close the player is, and a solid bar that
 * fills while they hold it. Everything that follows the players moves with the loop's frames, not React.
 */
export function CameraStage({ content, models, loop, view, onVideo, targets, names, answered }: CameraStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tags = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!loop || !canvas || !context) return;
    const drawing = new models.DrawingUtils(context);
    const colors = [readToken("--color-greet-blue"), readToken("--color-greet-orange")];
    const line = readNumberToken("--greet-outline");
    const joint = readNumberToken("--greet-joint");
    const tip = readNumberToken("--greet-tip");
    const center = readToken("--color-greet-cream");
    const smoother = new LandmarkSmoother(readNumberToken("--greet-track-ease-ms"), tracking.staleMs);
    const ratio = Math.min(window.devicePixelRatio || 1, readNumberToken("--greet-canvas-ratio"));
    // The face's own points are left out of the body outline; the face is drawn on its own when it is read.
    const bodyLines = models.lines.body.filter(({ start, end }) => start >= POSE.leftShoulder && end >= POSE.leftShoulder);
    const showHands = targets.some((reading) => HAND_SIGNS.has(reading));
    const showFace = targets.some((reading) => FACE_SIGNS.has(reading));
    const chips = tags.current.map((tag) => targets.map((reading) => tag?.querySelector<HTMLElement>(`[data-sign="${reading}"]`) ?? null));
    const box = canvas.parentElement;
    let width = box?.clientWidth ?? 0;
    let height = box?.clientHeight ?? 0;
    let tagSizes = tags.current.map(tag => ({ width: tag?.offsetWidth ?? 0, height: tag?.offsetHeight ?? 0 }));
    const resize = new ResizeObserver(() => {
      width = box?.clientWidth ?? 0; height = box?.clientHeight ?? 0;
      tagSizes = tags.current.map(tag => ({ width: tag?.offsetWidth ?? 0, height: tag?.offsetHeight ?? 0 }));
    });
    if (box) resize.observe(box);
    tags.current.forEach(tag => { if (tag) resize.observe(tag); });
    const statuses = tags.current.map(tag => tag?.querySelector<HTMLElement>("[data-status]"));
    const counts = tags.current.map(tag => tag?.querySelector<HTMLElement>("[data-hands]"));

    const stop = loop.onFrame((frame) => {
      if (!box || !width || !height) return;
      // The canvas covers exactly the part of the video on screen, which is cropped evenly on two sides.
      const wide = width / height > frame.aspect;
      const shownWidth = wide ? width : height * frame.aspect;
      const shownHeight = wide ? width / frame.aspect : height;
      const left = (width - shownWidth) / 2;
      const top = (height - shownHeight) / 2;
      if (canvas.width !== Math.round(shownWidth * ratio) || canvas.height !== Math.round(shownHeight * ratio)) {
        canvas.width = Math.round(shownWidth * ratio);
        canvas.height = Math.round(shownHeight * ratio);
      }
      Object.assign(canvas.style, { width: `${shownWidth}px`, height: `${shownHeight}px`, left: `${left}px`, top: `${top}px` });
      context.clearRect(0, 0, canvas.width, canvas.height);

      const keys = new Set<string>();
      tags.current.forEach((tag, i) => {
        const player = frame.players[i];
        if (!tag) return;
        if (!player) {
          tag.style.visibility = "hidden";
          return;
        }
        const color = colors[i];
        const bodyKey = i + ":body";
        keys.add(bodyKey);
        const pose = smoother.read(bodyKey, player.body.pose, frame.timestamp, frame.visibility);
        const shoulders = player.body.width;
        const seen = ({ start, end }: { start: number; end: number }) =>
          Math.min(pose[start]?.visibility ?? 0, pose[end]?.visibility ?? 0) >= frame.visibility;
        const bodyPoints = normal(pose, frame.aspect);
        const connections = bodyLines.filter(seen);
        drawing.drawConnectors(bodyPoints, connections, { color, lineWidth: line * ratio });
        const joints = new Set(connections.flatMap(edge => [edge.start, edge.end]));
        drawing.drawLandmarks(bodyPoints.filter((_, index) => joints.has(index)), { color, fillColor: center, radius: joint * ratio, lineWidth: line * ratio });
        if (showHands) {
          for (const [h, hand] of player.hands.entries()) {
            const key = i + ":hand:" + player.handWrists[h];
            keys.add(key);
            const points = normal(smoother.read(key, hand, frame.timestamp, frame.visibility), frame.aspect);
            drawing.drawConnectors(points, models.lines.hand, { color, lineWidth: line * ratio });
            drawing.drawLandmarks(points, { color, fillColor: center, radius: joint * ratio, lineWidth: line * ratio });
            drawing.drawLandmarks(points.filter((_, index) => [0, 4, 8, 12, 16, 20].includes(index)), { color, fillColor: color, radius: tip * ratio, lineWidth: 0 });
          }
        }
        if (showFace && player.face) {
          const key = i + ":face";
          keys.add(key);
          const points = normal(smoother.read(key, player.face, frame.timestamp, frame.visibility), frame.aspect);
          drawing.drawConnectors(points, models.lines.face, { color, lineWidth: line * ratio });
          drawing.drawConnectors(points, models.lines.lips, { color, lineWidth: line * ratio });
        }

        // Just above the head: the nose, lifted by most of a shoulder width, kept inside the frame.
        const head = pose[POSE.nose];
        const nose = head.visibility >= frame.visibility ? head : { x: player.body.center.x, y: player.body.center.y - 0.6 * shoulders };
        const x = Math.min(Math.max(left + (nose.x / frame.aspect) * shownWidth, tagSizes[i].width / 2), width - tagSizes[i].width / 2);
        const y = Math.min(height, Math.max(tagSizes[i].height, top + (nose.y - 0.9 * shoulders) * shownHeight));
        tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        tag.style.visibility = "visible";
        tag.dataset.state = answered?.[i] ? "done" : "playing";

        const progress = Math.max(0, ...targets.map(reading => player.hold[reading]));
        if (statuses[i]) statuses[i]!.textContent = answered?.[i] ? content.quiz.answered : progress >= 1 ? content.ui.accepted : progress > 0 ? content.ui.holding : content.ui.live;
        if (counts[i]) counts[i]!.textContent = fill(content.ui.hands, { n: player.openPalms });
        targets.forEach((reading, t) => {
          const chip = chips[i]?.[t];
          if (!chip) return;
          const level = player.shown[reading];
          const hold = player.hold[reading];
          chip.dataset.state = hold >= 1 ? "accepted" : hold > 0 ? "on" : level >= NEAR ? "near" : "off";
          chip.style.setProperty("--level", String(level));
          chip.style.setProperty("--hold", String(hold));
        });
      });
      smoother.retain(keys);
    });

    return () => {
      resize.disconnect();
      smoother.clear();
      drawing.close();
      stop();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [loop, models, targets, answered, content]);

  return (
    <div className="greet-camera">
      <video ref={onVideo} muted playsInline className="greet-camera-video greet-mirror" />
      <canvas ref={canvasRef} aria-hidden className="greet-camera-overlay" />
      {names.map((name, i) => (
        <div
          key={SIDES[i]}
          ref={(element) => {
            tags.current[i] = element;
          }}
          className={`greet-tag ${SIDES[i]}`}
        >
          <span className="greet-tag-badge">{i + 1}</span>
          <span className="greet-tag-body">
            <strong>
              {name}
              <CheckIcon aria-hidden weight="bold" className="greet-tag-check" />
            </strong>
            <span className="greet-tag-status" data-status />
            {targets.includes("twoOpenPalms") && <span className="greet-tag-status" data-hands>{fill(content.ui.hands, { n: 0 })}</span>}
            <span className="greet-tag-signs">
              {targets.map((reading) => {
                const Sign = SIGN_ICONS[reading];
                return (
                  <span key={reading} data-sign={reading} className="greet-tag-sign" title={content.readings[reading].label}>
                    <Sign aria-hidden weight="fill" />
                    <span className="greet-tag-meter">
                      <span className="greet-tag-level" />
                      <span className="greet-tag-held" />
                    </span>
                  </span>
                );
              })}
            </span>
          </span>
        </div>
      ))}
      {view?.status === "running" && (!view.locked || view.players.length < 2 || view.players.some(player => !player.found)) && (
        <p className="greet-camera-status" role="status">
          {content.ui.searching}
        </p>
      )}
      {view?.status === "error" && view.error && (
        <div role="alert" className="greet-camera-message">
          <p>{content.camera[view.error]}</p>
          <KeyButton tone="play" onClick={() => void loop?.start()}>
            {content.camera.retry}
          </KeyButton>
        </div>
      )}
      {(!view || view.status === "starting") && (
        <div className="greet-camera-message" role="status">
          <VideoCameraIcon aria-hidden />
          <p>{content.camera.waiting}</p>
        </div>
      )}
    </div>
  );
}
