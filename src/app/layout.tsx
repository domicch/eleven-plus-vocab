import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wocab - 11+ Vocabulary Learning",
  description: "Master essential vocabulary words for your 11+ exam with Wocab. Interactive flashcards and quizzes featuring Dale the Shiba Inu!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Android Chrome icons */}
        <link rel="icon" type="image/png" sizes="192x192" href={`${process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : ''}/android-chrome-192x192.png`} />
        <link rel="icon" type="image/png" sizes="512x512" href={`${process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : ''}/android-chrome-512x512.png`} />
        {/* Apple touch icons */}
        <link rel="apple-touch-icon" sizes="180x180" href={`${process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : ''}/apple-touch-icon.png`} />
        {/* Standard favicon */}
        <link rel="icon" type="image/x-icon" href={`${process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : ''}/favicon.ico`} />
        {/* Web app manifest */}
        <link rel="manifest" href={`${process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : ''}/site.webmanifest`} />
        <meta name="theme-color" content="#3B82F6" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
