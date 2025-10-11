'use client';

import { useState, ReactNode } from 'react';
import { Navigation } from '@/shared/components/navigation';
import { MobileMenuOverlay } from '@/shared/components/mobile-menu-overlay';
import { PageTransition } from '@/shared/components/page-transition';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  showPageTransition?: boolean;
}

/**
 * Reusable page layout component that ensures consistent navigation and mobile menu functionality
 * across all pages. This prevents the hamburger menu from breaking on new pages.
 *
 * Features:
 * - Automatic mobile menu state management
 * - Consistent navigation with hamburger menu
 * - Mobile menu overlay
 * - Optional page transitions
 * - Consistent background styling
 */
export function PageLayout({
  children,
  className = '',
  showPageTransition = true,
}: PageLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const content = (
    <div
      className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 ${className}`}
    >
      <Navigation onMobileMenuToggle={setIsMobileMenuOpen} isMobileMenuOpen={isMobileMenuOpen} />
      <MobileMenuOverlay isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      {children}
    </div>
  );

  if (showPageTransition) {
    return <PageTransition>{content}</PageTransition>;
  }

  return content;
}
