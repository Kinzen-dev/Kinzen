export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Portfolio',
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Modern Portfolio Application',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
} as const;

