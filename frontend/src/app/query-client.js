import { QueryClient } from '@tanstack/react-query';

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
            return false;
          }
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
