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
  /** The group name, or Player during setup. */
  name: string;
  /** Whether this card has been answered. */
  answered?: boolean;
}

const FACE_SIGNS = new Set<Reading>(["happy", "surprised"]);
const HAND_SIGNS = new Set<Reading>(["thumbsUp", "thumbsDown", "pointingUp", "victory", "openPalm", "twoOpenPalms", "fist", "pointingDown"]);
/** The camera starts reading a sign's meter as "getting close" from this level. */
const NEAR = 0.4;

/** MediaPipe draws points from 0 to 1 across its canvas; ours are mirrored and stretched by the aspect. */
const normal = (points: Landmarks, aspect: number) => points.map((point) => ({ x: point.x / aspect, y: point.y, z: 0, visibility: point.visibility }));

/** The one player's landmarks, answer meters, and standing guide, drawn without per-frame React updates. */
export function CameraStage({ content, models, loop, view, onVideo, targets, name, answered }: CameraStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!loop || !canvas || !context) return;
    const drawing = new models.DrawingUtils(context);
    const color = readToken("--color-greet-blue");
    const line = readNumberToken("--greet-outline");
    const joint = readNumberToken("--greet-joint");
    const tip = readNumberToken("--greet-tip");
    const center = readToken("--color-greet-cream");
    const ink = readToken("--color-greet-night");
    const smoother = new LandmarkSmoother(readNumberToken("--greet-track-ease-ms"), tracking.staleMs);
    const ratio = Math.min(window.devicePixelRatio || 1, readNumberToken("--greet-canvas-ratio"));
    // The face's own points are left out of the body outline; the face is drawn on its own when it is read.
    const bodyLines = models.lines.body.filter(({ start, end }) => start >= POSE.leftShoulder && end >= POSE.leftShoulder);
    const showHands = targets.some((reading) => HAND_SIGNS.has(reading));
    const showFace = targets.some((reading) => FACE_SIGNS.has(reading));
    const tag = tagRef.current;
    const chips = targets.map(reading => tag?.querySelector<HTMLElement>(`[data-sign="${reading}"]`) ?? null);
    const box = canvas.parentElement;
    let width = box?.clientWidth ?? 0;
    let height = box?.clientHeight ?? 0;
    let tagSize = { width: tag?.offsetWidth ?? 0, height: tag?.offsetHeight ?? 0 };
    const resize = new ResizeObserver(() => {
      width = box?.clientWidth ?? 0; height = box?.clientHeight ?? 0;
      tagSize = { width: tag?.offsetWidth ?? 0, height: tag?.offsetHeight ?? 0 };
    });
    if (box) resize.observe(box);
    if (tag) resize.observe(tag);
    const status = tag?.querySelector<HTMLElement>("[data-status]");
    const count = tag?.querySelector<HTMLElement>("[data-hands]");

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
      {
        const player = frame.player;
        if (!tag) return;
        if (!player) {
          tag.style.visibility = "hidden";
          smoother.clear();
          // The outline guides a player in front of a running camera, never behind a message.
          const snapshot = loop.getSnapshot();
          if (snapshot.status !== "running" || snapshot.player?.found) return;
          // Draw the last shoulder position in the same mirrored coordinates as the video.
          const spot = frame.guide ?? { center: { x: frame.aspect / 2, y: 0.5 }, width: 0.25 };
          const x = spot.center.x / frame.aspect * canvas.width;
          const y = spot.center.y * canvas.height;
          const shoulder = spot.width * canvas.height;
          context.save();
          context.strokeStyle = center; context.lineWidth = line * ratio;
          context.setLineDash([joint * ratio * 3, joint * ratio * 2]);
          context.beginPath(); context.arc(x, y - shoulder * 0.7, shoulder * 0.3, 0, Math.PI * 2);
          context.moveTo(x - shoulder / 2, y); context.lineTo(x + shoulder / 2, y);
          context.moveTo(x, y); context.lineTo(x, y + shoulder * 1.5);
          context.moveTo(x - shoulder / 2, y); context.lineTo(x - shoulder * 0.65, y + shoulder);
          context.moveTo(x + shoulder / 2, y); context.lineTo(x + shoulder * 0.65, y + shoulder);
          const feet = Math.min(canvas.height - joint * ratio, y + shoulder * 2.4);
          const hips = Math.min(feet - shoulder * 0.3, y + shoulder * 1.5);
          context.moveTo(x - shoulder * 0.5, feet); context.lineTo(x, hips);
          context.lineTo(x + shoulder * 0.5, feet);
          context.strokeStyle = ink; context.lineWidth = (line + joint) * ratio; context.stroke();
          context.strokeStyle = center; context.lineWidth = line * ratio; context.stroke(); context.restore();
          return;
        }
        const bodyKey = "body";
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
            const key = "hand:" + player.handWrists[h];
            keys.add(key);
            const points = normal(smoother.read(key, hand, frame.timestamp, frame.visibility), frame.aspect);
            drawing.drawConnectors(points, models.lines.hand, { color, lineWidth: line * ratio });
            drawing.drawLandmarks(points, { color, fillColor: center, radius: joint * ratio, lineWidth: line * ratio });
            drawing.drawLandmarks(points.filter((_, index) => [0, 4, 8, 12, 16, 20].includes(index)), { color, fillColor: color, radius: tip * ratio, lineWidth: 0 });
          }
        }
        if (showFace && player.face) {
          const key = "face";
          keys.add(key);
          const points = normal(smoother.read(key, player.face, frame.timestamp, frame.visibility), frame.aspect);
          drawing.drawConnectors(points, models.lines.face, { color, lineWidth: line * ratio });
          drawing.drawConnectors(points, models.lines.lips, { color, lineWidth: line * ratio });
        }

        // Just above the head: the nose, lifted by most of a shoulder width, kept inside the frame.
        const head = pose[POSE.nose];
        const nose = head.visibility >= frame.visibility ? head : { x: player.body.center.x, y: player.body.center.y - 0.6 * shoulders };
        const x = Math.min(Math.max(left + (nose.x / frame.aspect) * shownWidth, tagSize.width / 2), width - tagSize.width / 2);
        const y = Math.min(height, Math.max(tagSize.height, top + (nose.y - 0.9 * shoulders) * shownHeight));
        tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        tag.style.visibility = "visible";
        tag.dataset.state = answered ? "done" : "playing";

        const progress = Math.max(0, ...targets.map(reading => player.hold[reading]));
        if (status) status.textContent = answered ? content.quiz.answered : progress >= 1 ? content.ui.accepted : progress > 0 ? content.ui.holding : content.ui.live;
        if (count) count.textContent = fill(content.ui.hands, { n: player.openPalms });
        targets.forEach((reading, t) => {
          const chip = chips[t];
          if (!chip) return;
          const level = player.shown[reading];
          const hold = player.hold[reading];
          chip.dataset.state = hold >= 1 ? "accepted" : hold > 0 ? "on" : level >= NEAR ? "near" : "off";
          chip.style.setProperty("--level", String(level));
          chip.style.setProperty("--hold", String(hold));
        });
      }
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
      <div ref={tagRef} className="greet-tag">
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
      {view?.status === "running" && !view.player?.found && (
        <p className="greet-camera-status" role="status">
          {content.camera.guide[view.guidance ?? "center"]}
        </p>
      )}
      {view?.status === "running" && (
        <button type="button" className="greet-camera-reset" onClick={() => loop?.relock()}>{content.setup.findAgain}</button>
      )}
      {view?.status === "error" && view.error && (
        <div role="alert" className="greet-camera-message">
          <p>{content.camera[view.error]}</p>
          <KeyButton tone="plain" onClick={() => void loop?.start()}>
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
