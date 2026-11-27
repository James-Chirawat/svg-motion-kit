"use client";
import { Prompt } from "next/font/google";

const prompt = Prompt({ weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"], subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@100;200;300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://cdn.example-analytics.com/tag.js"></script>
      </head>
      <body className={prompt.className}>{children}</body>
    </html>
  );
}
