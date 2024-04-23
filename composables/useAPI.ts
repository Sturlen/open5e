import axios from 'axios';

export const useAPI = () => {
  const API_URL = useRuntimeConfig().public.apiUrl;

  const api = axios.create({
    baseURL: API_URL,
    headers: { Accept: 'application/json' },
  });

  return {
    backgrounds: (document__slug__in: string) =>
      api.get('/backgrounds', {
        params: {
          limit: 5000,
          document__slug__in,
        },
      }),
  };
};
