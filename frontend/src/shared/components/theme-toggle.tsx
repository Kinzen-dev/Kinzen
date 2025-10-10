'use client';

import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/shared/contexts/theme-context';
import { Button } from '@/shared/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      // If system mode, toggle to light first
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'light') {
      return (
        <motion.div
          key="sun"
          initial={{ rotate: -90, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          exit={{ rotate: 90, scale: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <Sun className="h-4 w-4" />
        </motion.div>
      );
    } else if (theme === 'dark') {
      return (
        <motion.div
          key="moon"
          initial={{ rotate: 90, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          exit={{ rotate: -90, scale: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <Moon className="h-4 w-4" />
        </motion.div>
      );
    } else {
      return (
        <motion.div
          key="system"
          className="relative h-4 w-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute top-0 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </motion.div>
      );
    }
  };

  const getLabel = () => {
    if (theme === 'light') {
      return 'Switch to dark mode';
    } else if (theme === 'dark') {
      return 'Switch to light mode';
    } else {
      return 'Switch to light mode';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="relative overflow-hidden"
        aria-label={getLabel()}
      >
        <motion.div layout transition={{ duration: 0.3, ease: 'easeInOut' }}>
          {getIcon()}
        </motion.div>
      </Button>
    </motion.div>
  );
}
