import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cynthia 的桌面",
  description:
    "Cynthia 用来收藏生活碎片的一张手绘桌面。",
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
