import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/index';
import { getToken, getRefreshToken, clearTokens } from '@/shared/lib/api-client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

// Token expiration check (1 hour = 3600000 ms)
const TOKEN_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

function isTokenExpired(tokenTimestamp: number): boolean {
  return Date.now() - tokenTimestamp > TOKEN_EXPIRY_TIME;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      logout: () => {
        clearTokens();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      initializeAuth: async () => {
        try {
          const token = getToken();
          const refreshToken = getRefreshToken();
          const tokenTimestamp = localStorage.getItem('tokenTimestamp');

          // Check if we have tokens
          if (!token || !refreshToken) {
            set({ isLoading: false, isAuthenticated: false, user: null });
            return;
          }

          // Check if token is expired
          if (tokenTimestamp && isTokenExpired(parseInt(tokenTimestamp))) {
            // Try to refresh the token
            try {
              const response = await fetch('http://localhost:3001/api/v1/auth/refresh', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
              });

              if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('tokenTimestamp', Date.now().toString());

                // Get user info
                const userResponse = await fetch('http://localhost:3001/api/v1/auth/me', {
                  headers: {
                    Authorization: `Bearer ${data.accessToken}`,
                  },
                });

                if (userResponse.ok) {
                  const user = await userResponse.json();
                  set({ user, isAuthenticated: true, isLoading: false });
                } else {
                  throw new Error('Failed to get user info');
                }
              } else {
                throw new Error('Token refresh failed');
              }
            } catch (error) {
              console.error('Token refresh failed:', error);
              clearTokens();
              set({ isLoading: false, isAuthenticated: false, user: null });
            }
          } else {
            // Token is still valid, get user info
            try {
              const response = await fetch('http://localhost:3001/api/v1/auth/me', {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const user = await response.json();
                set({ user, isAuthenticated: true, isLoading: false });
              } else {
                throw new Error('Failed to get user info');
              }
            } catch (error) {
              console.error('Failed to get user info:', error);
              clearTokens();
              set({ isLoading: false, isAuthenticated: false, user: null });
            }
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          clearTokens();
          set({ isLoading: false, isAuthenticated: false, user: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
