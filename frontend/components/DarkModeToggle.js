import { useEffect, useState } from 'react';

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark, mounted]);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#2C2C2E] animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <span className="text-yellow-500 text-lg sm:text-xl transition-transform duration-300 rotate-0">
          <i className="fas fa-sun" />
        </span>
      ) : (
        <span className="text-gray-600 dark:text-gray-300 text-lg sm:text-xl transition-transform duration-300 rotate-0">
          <i className="fas fa-moon" />
        </span>
      )}
    </button>
  );
}
