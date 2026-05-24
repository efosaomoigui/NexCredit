import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexCredit Admin Dashboard",
  description:
    "Risk-first digital micro-lending platform administration portal for Nigeria.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
