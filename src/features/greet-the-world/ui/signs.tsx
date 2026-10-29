import {
  BrainIcon,
  HandFistIcon,
  HandPalmIcon,
  HandPeaceIcon,
  HandPointingIcon,
  HandsPrayingIcon,
  SmileyIcon,
  SmileyNervousIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  type IconProps,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";
import type { Reading } from "../content";

/** Phosphor has a hand pointing up only, so point down is the same hand turned over. */
function PointingDownIcon({ className = "", ...props }: IconProps) {
  return <HandPointingIcon {...props} className={`${className} greet-flip`} />;
}

function TwoPalmsIcon({ size = "1em", weight = "regular", ...props }: IconProps) {
  return <svg {...props} width={size} height={size} viewBox="0 0 512 256" fill="currentColor">
    <g transform="translate(256 0) scale(-1 1)"><HandPalmIcon size={256} weight={weight} /></g>
    <HandPalmIcon x={256} size={256} weight={weight} />
  </svg>;
}

/** One picture per sign, used on the cards, the camera tags, the guide, and the setup check. */
export const SIGN_ICONS: Readonly<Record<Reading, ComponentType<IconProps>>> = {
  thumbsUp: ThumbsUpIcon,
  thumbsDown: ThumbsDownIcon,
  pointingUp: HandPointingIcon,
  victory: HandPeaceIcon,
  openPalm: HandPalmIcon,
  fist: HandFistIcon,
  pointingDown: PointingDownIcon,
  twoOpenPalms: TwoPalmsIcon,
  handsOnHead: BrainIcon,
  praying: HandsPrayingIcon,
  happy: SmileyIcon,
  surprised: SmileyNervousIcon,
};
