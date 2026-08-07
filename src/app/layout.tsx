import type { Metadata } from "next";
import { DM_Mono, Figtree } from "next/font/google";
import "./globals.css";

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "spots",
  description: "Annotate Spotify playlists and share notes with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmMono.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#121212] font-mono text-white">
        {children}
      </body>
    </html>
  );
}
