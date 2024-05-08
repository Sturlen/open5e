import { queryOptions, useQuery } from '@tanstack/vue-query';
import axios from 'axios';

export const API_ENDPOINTS = {
  backgrounds: 'v1/backgrounds',
} as const;

export const useAPI = () => {
  const API_URL = useRuntimeConfig().public.apiUrl;

  const api = axios.create({
    baseURL: API_URL,
    headers: { Accept: 'application/json' },
  });

  return {
    findMany: async (endpoint: string, sources: string[]) => {
      console.log('fetching backgrounds', sources);
      const res = await api.get(endpoint, {
        params: {
          limit: 5000,
          document__slug__in: sources.join(','),
        },
      });

      return res.data.results;
    },
    get: async (endpoint: string, slug: string) => {
      console.log('fetching background', slug);
      const res = await api.get(`/${endpoint}/${slug}/`);
      return res.data;
    },
  };
};

function loadSourcesFromLocalStorage() {
  if (process.client) {
    const savedSources = localStorage.getItem('sources');
    return savedSources ? JSON.parse(savedSources) : [];
  } else {
    // Skip on server
    return [];
  }
}

const _sources = ref<string[]>(loadSourcesFromLocalStorage());
/** a */
export const setSources = (sources: string[]) => (_sources.value = sources);
export const sources = computed(() => _sources.value);

watch(sources, (sources) => {
  console.log('sources changed', sources);
});

export const useFindMany = (endpoint: string) => {
  const { findMany } = useAPI();
  return useQuery({
    queryKey: ['findMany', endpoint, sources],
    queryFn: () => findMany(endpoint, sources.value),
    staleTime: Infinity,
  });
};

export const useFindOne = (endpoint: string, slug: string) => {
  const { get } = useAPI();
  return useQuery({
    queryKey: ['get', endpoint],
    queryFn: () => get(endpoint, slug),
    staleTime: Infinity,
  });
};
