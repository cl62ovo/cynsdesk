import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://the-things-i-kept.liminfei080602.chatgpt.site"),
  title: "Cynthia 的桌面",
  description:
    "Cynthia 用来收藏生活碎片的一张手绘桌面。",
  openGraph: {
    title: "Cynthia's Desk",
    description: "A little box of things I didn't want to lose.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Cynthia's hand-drawn desk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cynthia's Desk",
    description: "A little box of things I didn't want to lose.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
