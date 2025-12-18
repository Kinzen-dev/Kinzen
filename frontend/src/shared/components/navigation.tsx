'use client';

import Link from 'next/link';
import { Menu, Sparkles } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ThemeToggle } from '@/shared/components/theme-toggle';

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
    <header
      className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Left side - Logo/Home */}
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex items-center space-x-2 transition-transform hover:scale-105 active:scale-95"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Kinzen</span>
          </Link>
        </div>

        {/* Center - Menu Items (Desktop only) */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 transform items-center space-x-2 md:flex">
          <Link href="/lifestyle">
            <Button variant="ghost" className="text-lg font-medium transition-transform hover:scale-105 active:scale-95">
              Lifestyle
            </Button>
          </Link>
          <Link href="/games">
            <Button variant="ghost" className="text-lg font-medium transition-transform hover:scale-105 active:scale-95">
              Games
            </Button>
          </Link>
        </div>

        {/* Right side - Navigation actions */}
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {/* Mobile hamburger menu */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu} title="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
