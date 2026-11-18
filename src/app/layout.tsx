import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TopLiveCam — Live Character Studio",
  description: "Private real-time AI character transformation studio."
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
