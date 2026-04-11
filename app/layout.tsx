import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SmartCart | AI Meal & Grocery Planner",
  description:
    "SmartCart builds budget-conscious dinner plans and grocery lists around your pantry, time, and dietary needs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-stone-50 font-body text-ink antialiased">{children}</body>
    </html>
  );
}
