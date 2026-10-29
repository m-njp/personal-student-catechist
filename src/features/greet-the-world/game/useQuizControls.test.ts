// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { greet } from "@/content/lessons/lesson-04/greet";
import { QuizSession } from "./QuizSession";
import { initialLeague } from "./rules";
import { useQuizControls } from "./useQuizControls";

function Controls({ session }: { session: QuizSession }) { useQuizControls(session); return null; }
const makeSession = () => new QuizSession(greet, () => initialLeague(2), vi.fn());
let root: Root;
let container: HTMLDivElement;
const render = (session: QuizSession) => act(() => root.render(createElement(Controls, { session })));
const key = (value: string, target: EventTarget = window, options: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true, ...options });
  act(() => { target.dispatchEvent(event); });
  return event;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  document.documentElement.style.setProperty("--greet-tick-ms", "100");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("teacher quiz controls", () => {
  it("routes shifted answers to Player 2", () => {
    const session = makeSession();
    session.pickMatch(0, 1);
    const answer = vi.spyOn(session, "answer");
    const mark = vi.spyOn(session, "mark");
    render(session);
    key("T", window, { shiftKey: true });
    key("F", window, { shiftKey: true });
    for (const [value, code] of [["!", "Digit1"], ["@", "Digit2"], ["#", "Digit3"]]) key(value, window, { shiftKey: true, code });
    expect(answer.mock.calls).toEqual([[true, 1], [false, 1], [0, 1], [1, 1], [2, 1]]);
    key("Y", window, { shiftKey: true }); key("N", window, { shiftKey: true });
    expect(mark.mock.calls).toEqual([[true, 1], [false, 1]]);
  });

  it("ticks at the configured cadence and releases the old session on replacement", () => {
    const first = makeSession();
    const second = makeSession();
    const tickFirst = vi.spyOn(first, "tick");
    const tickSecond = vi.spyOn(second, "tick");
    const firstAnswer = vi.spyOn(first, "answer");
    const secondAnswer = vi.spyOn(second, "answer");
    render(first);
    act(() => vi.advanceTimersByTime(300));
    expect(tickFirst).toHaveBeenCalledTimes(3);
    render(second);
    act(() => vi.advanceTimersByTime(200));
    expect(tickFirst).toHaveBeenCalledTimes(3);
    expect(tickSecond).toHaveBeenCalledTimes(2);
    key("t");
    expect(firstAnswer).not.toHaveBeenCalled();
    expect(secondAnswer).toHaveBeenCalledWith(true, 0);
    act(() => root.render(null));
    act(() => vi.advanceTimersByTime(200));
    key("t");
    expect(tickSecond).toHaveBeenCalledTimes(2);
    expect(secondAnswer).toHaveBeenCalledTimes(1);
  });

  it("maps answer, skip, pause, and next keys to the same session actions", () => {
    const session = makeSession();
    const answer = vi.spyOn(session, "answer");
    const skip = vi.spyOn(session, "skip");
    const pause = vi.spyOn(session, "pause");
    const next = vi.spyOn(session, "next");
    const mark = vi.spyOn(session, "mark");
    render(session);
    for (const value of ["t", "f", "1", "2", "3"]) expect(key(value).defaultPrevented).toBe(true);
    expect(answer.mock.calls).toEqual([[true, 0], [false, 0], [0, 0], [1, 0], [2, 0]]);
    key("y"); key("n"); key("s"); key("p"); key(" ");
    expect(mark.mock.calls).toEqual([[true, 0], [false, 0]]);
    expect(skip).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("ends the final round with Y, then shows the closing question with Space", () => {
    const session = makeSession();
    const final = vi.spyOn(session, "finishFinal");
    session.startFinal();
    render(session);
    key("y");
    expect(final).toHaveBeenCalledTimes(1);
    key(" ");
    expect(session.getSnapshot().phase).toBe("question");
  });

  it("leaves typing, editable content, modified keys, repeats, and button Space alone", () => {
    const session = makeSession();
    const answer = vi.spyOn(session, "answer");
    const next = vi.spyOn(session, "next");
    render(session);
    for (const tag of ["input", "select", "textarea", "div"]) {
      const element = document.createElement(tag);
      if (tag === "div") element.setAttribute("contenteditable", "true");
      document.body.append(element);
      expect(key("t", element).defaultPrevented).toBe(false);
    }
    for (const options of [{ repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) expect(key("t", window, options).defaultPrevented).toBe(false);
    const button = document.createElement("button");
    document.body.append(button);
    expect(key(" ", button).defaultPrevented).toBe(false);
    expect(answer).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
