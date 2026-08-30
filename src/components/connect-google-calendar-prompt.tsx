// A compact, calendar-page version of the same connect flow as the full
// card in Settings (kept there too) — surfaced where people actually look
// for it instead of only in Settings.
export function ConnectGoogleCalendarPrompt() {
  return (
    <a
      href="/api/auth/google-calendar"
      className="flex items-center gap-2 rounded-xl border border-dashed border-border-strong px-3 py-2 text-sm font-medium text-accent hover:bg-surface-2"
    >
      📅 Connect Google Calendar to see your personal events here too
    </a>
  );
}
