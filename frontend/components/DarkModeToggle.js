import { useEffect, useState } from 'react';
import Icon from './ui/Icon';

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
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

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    // Directly update the DOM element
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Icon name="light_mode" variant="round" size="medium" color="#FFC107" className="transition-transform duration-300" />
      ) : (
        <Icon name="dark_mode" variant="round" size="medium" className="text-gray-600 dark:text-gray-300 transition-transform duration-300" />
      )}
    </button>
  );
}
