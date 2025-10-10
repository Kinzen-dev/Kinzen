import { apiClient } from '@/lib/api-client';
import { LoginRequest, RegisterRequest, AuthResponse } from '@/types/index';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  logout: () => {
    // Clear tokens handled by api-client
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};

