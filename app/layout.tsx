import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "inLast5Mins",
  description: "FIFA 2026 X trend drafts and publishing assistant"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
