import localFont from "next/font/local";

const display = localFont({ src: "../../../styles/fonts/greet/BebasNeue-Regular.woff2", variable: "--nf-greet-display", display: "swap", weight: "400" });
const body = localFont({
  src: [
    { path: "../../../styles/fonts/greet/IBMPlexSans-Regular.ttf", weight: "400" },
    { path: "../../../styles/fonts/greet/IBMPlexSans-SemiBold.ttf", weight: "600" },
  ],
  variable: "--nf-greet-body", display: "swap",
});
const mono = localFont({ src: "../../../styles/fonts/greet/SpaceMono-Regular.ttf", variable: "--nf-greet-mono", display: "swap", weight: "400" });

export const greetFonts = `${display.variable} ${body.variable} ${mono.variable}`;
