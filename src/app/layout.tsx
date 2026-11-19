import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { site } from "@/content/site";
import { monoFont, pixelFont, sansFont, serifFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: site.name,
  description: `Classroom lessons for ${site.grade} ${site.name}.`,
  icons: { icon: { url: "/logo.svg", type: "image/svg+xml" } },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${sansFont.variable} ${monoFont.variable} ${serifFont.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
