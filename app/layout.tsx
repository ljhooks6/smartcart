import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mealcaddie.vercel.app"),
  title: "MealCaddie | Meal & Grocery Planning Helper",
  description:
    "MealCaddie helps plan, organize, and shop for calmer weeks around your pantry, budget, time, and dietary needs.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "MealCaddie | Pick the meals. Carry less of the week.",
    description:
      "Plan dinner, organize groceries, and come back to your week without starting over.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "MealCaddie | Pick the meals. Carry less of the week.",
    description:
      "Plan dinner, organize groceries, and come back to your week without starting over.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MealCaddie",
  },
  icons: {
    apple: "/app-icon.png",
    icon: "/favicon.svg",
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
