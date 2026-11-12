"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fill, type GreetContent, type Reading } from "../content";
import type { CameraLoop } from "../detection/CameraLoop";
import type { Thresholds } from "../detection/config";
import type { DetectionLog } from "../detection/DetectionLog";
import type { Models } from "../detection/models";

interface DetectorPanelProps {
  content: GreetContent; models: Models; loop: CameraLoop | null;
  log: DetectionLog; thresholds: Thresholds; targets: readonly Reading[];
}

/** Hidden until opened; diagnostics contain numbers only. */
export function DetectorPanel({ content, models, loop, log, thresholds, targets }: DetectorPanelProps) {
  const [open, setOpen] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  const rate = useRef<HTMLSpanElement>(null);
  const cells = useRef(new Map<Reading, HTMLTableCellElement>());
  const events = useSyncExternalStore(log.subscribe, log.getSnapshot, log.getSnapshot);
  useEffect(() => {
    if (!open || !loop) return;
    return loop.onFrame(frame => {
      const player = frame.player;
      const lock = player ? "tracking" : loop.getSnapshot().locked ? "recovering" : "searching";
      if (rate.current) rate.current.textContent = `${models.delegate} / ${Math.round(frame.fps)} fps / ${Math.round(frame.inferenceMs)} ms inference / ${Math.round(frame.resultAgeMs)} ms age / ${lock}`;
      for (const target of targets) {
        const cell = cells.current.get(target);
        if (cell) cell.textContent = player ? `${(player.raw[target] ?? 0).toFixed(2)} / ${player.shown[target].toFixed(2)} / ${Math.round(player.hold[target] * 100)}%` : "-";
      }
    });
  }, [open, loop, models.delegate, targets]);
  return <details ref={details} className="greet-detector" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{content.ui.diagnostics}</summary>
    {open && <div className="greet-detector-panel">
      <div className="greet-tool-row">
        <span ref={rate}>{models.delegate}</span>
        <button type="button" className="greet-tool" onClick={() => log.download(thresholds)}>{content.setup.log}</button>
        <button type="button" className="greet-tool" onClick={() => { if (details.current) details.current.open = false; }}>{content.quiz.closeDetails}</button>
      </div>
      <p>{content.quiz.rawLegend}</p>
      <table><thead><tr><th /><th>{content.quiz.rawColumns}</th></tr></thead>
        <tbody>{targets.map(target => <tr key={target}><th>{content.readings[target].label}</th>
          <td ref={element => { if (element) cells.current.set(target, element); else cells.current.delete(target); }}>-</td>
        </tr>)}</tbody>
      </table>
      <ol>{events.slice(-10).map(event => <li key={event.n}>{fill(content.setup.events[event.what], {
        player: content.player, reading: event.reading ? content.readings[event.reading].label : "", detail: event.detail ?? "",
      })}</li>)}</ol>
    </div>}
  </details>;
}
