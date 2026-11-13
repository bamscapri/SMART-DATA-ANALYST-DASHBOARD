import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ThemeMode } from '../../utils/theme';

interface ThemeSwitcherProps {
  compact?: boolean;
  showLabels?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  compact = false,
  showLabels = false
}) => {
  const { themeMode, setThemeMode } = useTheme();

  const options: { id: ThemeMode; label: string; title: string; icon: React.ReactNode }[] = [
    {
      id: 'light',
      label: 'Siang',
      title: 'Light Mode (Brown Cream)',
      icon: <Sun className="w-3.5 h-3.5" />
    },
    {
      id: 'dark',
      label: 'Malam',
      title: 'Dark Mode (Dark Brown)',
      icon: <Moon className="w-3.5 h-3.5" />
    },
    {
      id: 'system',
      label: 'Sistem',
      title: 'System Default (Ikuti Perangkat)',
      icon: <Monitor className="w-3.5 h-3.5" />
    }
  ];

  return (
    <div
      role="group"
      aria-label="Pengaturan Tema Tampilan"
      className="inline-flex items-center p-0.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] transition-theme"
    >
      {options.map(opt => {
        const active = themeMode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setThemeMode(opt.id)}
            aria-label={opt.title}
            aria-pressed={active}
            title={opt.title}
            className={`flex items-center gap-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-theme cursor-pointer ${
              compact ? 'px-2 py-1' : 'px-2.5 py-1'
            } ${
              active
                ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/60'
            }`}
          >
            {opt.icon}
            {showLabels ? (
              <span>{opt.label}</span>
            ) : (
              <span className="hidden xl:inline">{opt.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
