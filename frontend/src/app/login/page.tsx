'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';
import { Navigation } from '@/shared/components/navigation';
import { MobileMenuOverlay } from '@/shared/components/mobile-menu-overlay';
import { PageTransition } from '@/shared/components/page-transition';
import { useAuth } from '@/shared/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <Navigation onMobileMenuToggle={setIsMobileMenuOpen} isMobileMenuOpen={isMobileMenuOpen} />
        <MobileMenuOverlay isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  // Don't render login form if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <Navigation onMobileMenuToggle={setIsMobileMenuOpen} isMobileMenuOpen={isMobileMenuOpen} />
        <MobileMenuOverlay isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
          <LoginForm />
          <p className="mt-4 text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </main>
      </div>
    </PageTransition>
  );
}
