import React from 'react';

interface State { hasError: boolean; }

/** Final UI containment boundary. It never resets or mutates user data automatically. */
export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Smoke Lab UI crash contained:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const de = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('de');
    return (
      <main className="min-h-screen w-full bg-[#F4F3EF] text-[#191B1C] flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-5">
          <span className="text-[11px] font-semibold tracking-[0.24em] uppercase">SMOKE LAB</span>
          <h1 className="font-display text-4xl tracking-[-0.03em]">
            {de ? 'Smoke Lab konnte nicht sicher laden.' : 'Smoke Lab could not load safely.'}
          </h1>
          <p className="text-sm text-[#747779] leading-relaxed">
            {de
              ? 'Deine lokalen Daten wurden nicht automatisch gelöscht oder zurückgesetzt. Lade die App neu. Wenn der Fehler wiederkommt, behalte dein letztes JSON-Backup.'
              : 'Your local data was not automatically deleted or reset. Reload the app. If the error returns, keep your latest JSON backup.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[#191B1C] px-5 py-3 text-sm font-semibold text-[#F2F1ED]"
          >
            {de ? 'App neu laden' : 'Reload app'}
          </button>
        </div>
      </main>
    );
  }
}
