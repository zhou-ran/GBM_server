import { useThemeStore } from '../../stores/themeStore';

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--control-bg)] px-3 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--control-bg-hover)]"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <span aria-hidden="true">{isDark ? '☾' : '☀'}</span>
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
