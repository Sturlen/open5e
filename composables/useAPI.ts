import { useQuery } from '@tanstack/vue-query';
import axios from 'axios';

export const useAPI = () => {
  const API_URL = useRuntimeConfig().public.apiUrl;

  const api = axios.create({
    baseURL: API_URL,
    headers: { Accept: 'application/json' },
  });

  return {
    backgrounds: async (sources: string[]) => {
      console.log('fetching backgrounds', sources);
      const res = await api.get('/backgrounds', {
        params: {
          limit: 5000,
          document__slug__in: sources.join(','),
        },
      });

      return res.data.results;
    },
    fetchBackground: async (slug: string) => {
      console.log('fetching background', slug);
      const res = await api.get(`/backgrounds/${slug}/`);
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

export const useBackgrounds = () => {
  const { backgrounds } = useAPI();
  return useQuery({
    queryKey: ['backgrounds', sources],
    queryFn: () => backgrounds(sources.value),
    staleTime: Infinity,
  });
};

export const useBackground = (slug: string) => {
  const { fetchBackground } = useAPI();
  return useQuery({
    queryKey: ['background', slug],
    queryFn: () => fetchBackground(slug),
    staleTime: Infinity,
  });
};
