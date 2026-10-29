import type { ReactNode } from "react";
import { keyCap, keyTone } from "./styles";

interface KeyButtonProps {
  children: ReactNode;
  tone?: keyof typeof keyTone;
  onClick: () => void;
}

/** The game's button: a key cap. */
export function KeyButton({ children, tone = "plain", onClick }: KeyButtonProps) {
  return (
    <button type="button" onClick={onClick} className={`${keyCap} ${keyTone[tone]}`}>
      {children}
    </button>
  );
}
