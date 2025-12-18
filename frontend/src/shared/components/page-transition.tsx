'use client';

import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

// Simplified page transition - removed heavy Framer Motion animations
// that were causing scroll jank. Using CSS transitions instead.
export function PageTransition({ children }: PageTransitionProps) {
  return <div className="min-h-screen animate-fade-in">{children}</div>;
}
