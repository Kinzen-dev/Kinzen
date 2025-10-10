'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { ThemeProvider } from '@/shared/contexts/theme-context';
import { AuthProvider } from '@/shared/components/auth-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="kinzen-ui-theme">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            offset={80}
            toastOptions={{
              style: {
                marginTop: '20px',
              },
              className: 'toast-notification',
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
