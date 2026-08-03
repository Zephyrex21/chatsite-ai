import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Providers } from './providers';

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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-(--clay-bg) font-sans">
        <Providers>{children}</Providers>
        {/* Both are no-ops in local dev and only actually report data once
            deployed on Vercel — safe to include unconditionally. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
