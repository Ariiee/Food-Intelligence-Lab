import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ThreeDBackground from "../components/ThreeDBackground";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Food Intelligence Lab | AI Food Spectroscopy & Nutritional Intelligence",
  description: "Advanced multi-spectral machine learning system predicting organic nutrition, heavy metal toxicity, and grading food quality using custom decision engines.",
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="en" className="dark h-full">
        <head>
          <link 
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" 
            rel="stylesheet" 
          />
        </head>
        <body 
          className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans mesh-gradient-bg min-h-screen text-foreground antialiased selection:bg-accent-green selection:text-black relative`}
        >
          <ThreeDBackground />
          <div className="relative z-10">
            {children}
          </div>
        </body>
      </html>
    );
}

