import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/Components/ThemeProvider';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#BDE7E1] bg-white text-[#07324A] shadow-sm transition hover:border-[#0FA3A0] hover:bg-[#F2FAF6] dark:border-white/15 dark:bg-[#102538] dark:text-white dark:hover:bg-[#17324A] ${className}`}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
