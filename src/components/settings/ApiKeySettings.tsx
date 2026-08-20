'use client';

import { useEffect, useRef, useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { cx } from '@/lib/cx';
import {
  getUserGeminiApiKey,
  setUserGeminiApiKey,
  clearUserGeminiApiKey,
} from '@/lib/user-gemini-key';

/**
 * "Bring your own API key" control. Deliberately a small hand-built
 * popover rather than pulling in a dialog/popover library — this is the
 * only place in the app that needs one, and the accessibility surface
 * (Escape to close, click-outside to close) is small enough to own
 * directly rather than take on a new dependency for.
 *
 * The key is read/written entirely through src/lib/user-gemini-key.ts
 * (localStorage only) — this component never sends it anywhere itself;
 * that happens per-request from the chat page / Hero via the header
 * helper in that same file.
 */
export function ApiKeySettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Same pattern as ThemeToggle: reading localStorage can only happen
  // client-side, so this is an intentional one-time post-mount sync
  // rather than something to restructure around the lint rule.
  useEffect(() => {
    const existing = getUserGeminiApiKey();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(existing ?? '');
    setHasStoredKey(existing !== null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      clearUserGeminiApiKey();
      setHasStoredKey(false);
    } else {
      setUserGeminiApiKey(trimmed);
      setHasStoredKey(true);
    }
    setSavedJustNow(true);
    setTimeout(() => setSavedJustNow(false), 2000);
  }

  function handleClear() {
    clearUserGeminiApiKey();
    setValue('');
    setHasStoredKey(false);
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={
          hasStoredKey ? 'Your API key is set — manage it' : 'Use your own Gemini API key'
        }
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="relative"
      >
        <KeyRound className="h-5 w-5" aria-hidden="true" />
        {hasStoredKey ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-(--clay-success)"
          />
        ) : null}
      </Button>

      {isOpen ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Bring your own Gemini API key"
          className={cx(
            'absolute top-full right-0 z-30 mt-2 w-80 rounded-(--clay-radius-lg) bg-(--clay-surface) p-5',
            'shadow-[var(--clay-shadow-out)]',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-(--clay-text)">
              Use your own Gemini key
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setIsOpen(false)}
              className="text-(--clay-text-muted) transition-colors hover:text-(--clay-text)"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-2 text-sm text-(--clay-text-muted)">
            Optional. Stored only in this browser, never sent to our database — used directly from
            your device on each request.
          </p>

          <div className="mt-4">
            <TextInput
              label="Gemini API key"
              hideLabel
              type="password"
              placeholder="AIzaSy…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
            />
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-(--clay-primary) underline underline-offset-2"
          >
            Get a free key from Google AI Studio
          </a>

          <div className="mt-4 flex items-center gap-2">
            <Button size="md" onClick={handleSave} className="flex-1">
              {savedJustNow ? 'Saved' : 'Save'}
            </Button>
            {hasStoredKey ? (
              <Button variant="secondary" size="md" onClick={handleClear}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
