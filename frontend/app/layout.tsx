import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { RootProvider } from "./rootProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Aviator',
    description: 'Aviator - The first DeFi app on Farcaster',
    other: {
      'base:app_id': '6963ca59b8395f034ac224a2',
      'fc:miniapp': JSON.stringify({
        version: 'next',
        imageUrl: 'https://aviator-sand.vercel.app/embed-image',
        button: {
          title: `Launch Aviator`,
          action: {
            type: 'launch_miniapp',
            name: 'Aviator',
            url: 'https://aviator-sand.vercel.app',
            splashImageUrl: 'https://aviator-sand.vercel.app/splash-image',
            splashBackgroundColor: '#000000',
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sourceCodePro.variable}`}>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
