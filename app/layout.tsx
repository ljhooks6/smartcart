import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "MealCaddie | Meal & Grocery Planning Helper",
  description:
    "MealCaddie helps plan, organize, and shop for calmer weeks around your pantry, budget, time, and dietary needs.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MealCaddie",
  },
  icons: {
    apple: "/og-image.png",
    icon: "/og-image.png",
  },
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
