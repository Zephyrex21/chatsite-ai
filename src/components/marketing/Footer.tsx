export function Footer() {
  return (
    <footer className="relative z-10 border-t border-(--clay-text-muted)/10 px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="font-display text-lg font-semibold text-(--clay-text)">ChatSite</p>
          <p className="mt-1 text-sm text-(--clay-text-muted)">
            Paste a URL, get a grounded AI chat about that page.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm text-(--clay-text-muted)">
          <a href="#features" className="transition-colors hover:text-(--clay-text)">
            Features
          </a>
          <a
            href="https://github.com/Zephyrex21/chatsite-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-(--clay-text)"
          >
            GitHub
          </a>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-(--clay-text-muted)">
        © {new Date().getFullYear()} ChatSite. Built with Next.js and Gemini.
      </p>
    </footer>
  );
}
