export function Footer() {
  return (
    <footer className="relative z-10 mt-8 px-6 pt-10 pb-8 sm:px-10">
      {/* Subtle gradient divider instead of a flat border — reads softer
          against the clay-surface backdrop than a hard line would. */}
      <div
        aria-hidden="true"
        className="mx-auto h-px w-full max-w-6xl bg-gradient-to-r from-transparent via-(--clay-text-muted)/20 to-transparent"
      />

      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs text-center sm:text-left">
          <p className="font-display text-lg font-semibold text-(--clay-text)">ChatSite</p>
          <p className="mt-2 text-sm text-(--clay-text-muted)">
            Paste a URL, get a grounded AI chat about that page — nothing more to set up.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-16">
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold tracking-wide text-(--clay-text) uppercase">
              Product
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-(--clay-text-muted)">
              <a href="#how-it-works" className="transition-colors hover:text-(--clay-text)">
                How it works
              </a>
              <a href="#features" className="transition-colors hover:text-(--clay-text)">
                Features
              </a>
            </div>
          </div>

          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold tracking-wide text-(--clay-text) uppercase">
              Project
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-(--clay-text-muted)">
              <a
                href="https://github.com/Zephyrex21/chatsite-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-(--clay-text)"
              >
                Source on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-(--clay-text-muted) sm:text-left">
        © {new Date().getFullYear()} ChatSite. Built with Next.js and Gemini.
      </p>
    </footer>
  );
}
