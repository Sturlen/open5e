import { queryOptions, useQuery } from '@tanstack/vue-query';
import axios from 'axios';

export const API_ENDPOINTS = {
  backgrounds: 'v1/backgrounds',
  characters: 'v1/characters',
  sections: 'v1/sections',
  classes: 'v1/classes',
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

      return res.data.results as Record<string, any>[];
    },
    get: async (endpoint: string, slug: string) => {
      console.log('fetching background', slug);
      const res = await api.get(`/${endpoint}/${slug}/`);
      return res.data as Record<string, any>;
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

export const useSubclass = (className: string, subclass: string) => {
  const { get } = useAPI();

  return useQuery({
    queryKey: ['get', className, subclass],
    queryFn: async () => {
      const _class = await get(API_ENDPOINTS.classes, className);
      const archetype = _class.archetypes.find((a: any) => a.slug === subclass);
      if (!archetype) {
        showError({
          statusCode: 404,
          statusMessage: `Archetype ${subclass} not found for class ${className}`,
        });
        throw new Error(
          `Archetype ${subclass} not found for class ${className}`
        );
      }
      return archetype;
    },
    staleTime: Infinity,
  });
};

export const useSections = (category: string) => {
  const { findMany } = useAPI();
  return useQuery({
    queryKey: ['findMany', category, sources],
    queryFn: async () => {
      const sections = await findMany(API_ENDPOINTS.sections, sources.value);
      return sections.filter((section) => section.parent === category);
    },
    staleTime: Infinity,
  });
};
