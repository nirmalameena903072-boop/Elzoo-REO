import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fraunces = localFont({
  src: "./fonts/fraunces.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
  fallback: ["Iowan Old Style", "Georgia", "serif"],
  preload: true,
});

const inter = localFont({
  src: "./fonts/inter.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Volud — your table is the interface", template: "%s · Volud" },
  description:
    "Volud turns every table into a point of sale — Alsa's kitchen, staff and floor, in one glass system.",
  applicationName: "Volud",
  authors: [{ name: "Volud" }],
  openGraph: { type: "website", siteName: "Volud", title: "Volud — QR ordering, live kitchen, real reviews" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A0B0D",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-ink-900 text-cream-0 antialiased">
        <div className="mesh-bg" aria-hidden="true" />
        <div className="orb orb-accent" aria-hidden="true" />
        <div className="orb orb-ember" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
