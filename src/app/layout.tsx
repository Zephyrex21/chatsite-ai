import type { Metadata } from 'next';
import './globals.css';

// NOTE: Typography is finalized in Phase 5 (claymorphism UI build). Using the
// system font stack for now keeps builds fast and network-independent —
// no external font CDN call at build time.

export const metadata: Metadata = {
  title: 'ChatSite — Chat With Any Website',
  description: 'Paste a URL, get a grounded AI chat about that page.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
