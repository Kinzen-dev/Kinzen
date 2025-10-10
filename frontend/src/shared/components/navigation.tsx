'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { ThemeToggle } from '@/shared/components/theme-toggle';
import { Sparkles } from 'lucide-react';

interface NavigationProps {
  className?: string;
  onMobileMenuToggle?: (isOpen: boolean) => void;
  isMobileMenuOpen?: boolean;
}

export function Navigation({
  className = '',
  onMobileMenuToggle,
  isMobileMenuOpen = false,
}: NavigationProps) {
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    onMobileMenuToggle?.(newState);
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Left side - Logo/Home */}
        <div className="flex items-center space-x-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Link
              href="/"
              className="flex items-center space-x-2 transition-opacity hover:opacity-80"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Kinzen</span>
            </Link>
          </motion.div>
        </div>

        {/* Center - Lifestyle Menu (Desktop only) */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 transform items-center md:flex">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 17 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link href="/lifestyle">
              <Button variant="ghost" className="text-lg font-medium">
                Lifestyle
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Right side - Navigation actions */}
        <div className="flex items-center space-x-2">
          {/* Theme toggle */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 17 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ThemeToggle />
          </motion.div>

          {/* Mobile hamburger menu */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 17 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="md:hidden"
          >
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu} title="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
