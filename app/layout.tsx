import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ISC Connect | Your UTM student companion", template: "%s | ISC Connect" },
  description:
    "Inform. Connect. Support. Your international student companion at the University of Technology, Mauritius.",
  manifest: "/manifest.webmanifest",
  icons: { icon: { url: "/icon.svg", type: "image/svg+xml" }, apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#23335C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
