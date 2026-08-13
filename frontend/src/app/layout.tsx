import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Blood Hub | AI Emergency Donor Dispatch & Registry",
  description: "AI-powered emergency blood donor locator with real-time donor matching and automated alert dispatches.",
  keywords: ["blood donation", "emergency blood", "donor registry", "AI blood hub", "blood match"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
