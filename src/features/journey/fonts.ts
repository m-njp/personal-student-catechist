import { Pixelify_Sans } from "next/font/google";

/** A Journey to Remember's font: a clear pixel face that matches the art and reads from across a room. */
export const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--nf-pixelify",
  display: "swap",
});
