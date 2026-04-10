import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PresentPro – AI Presentation Coach",
  description:
    "Upload your presentation video and get AI-powered feedback on speech, grammar, filler words, facial expressions, and more. Become a confident, professional presenter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
