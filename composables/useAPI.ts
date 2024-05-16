import { queryOptions, useQuery } from '@tanstack/vue-query';
import axios from 'axios';
import * as _ from 'underscore';

export const API_ENDPOINTS = {
  backgrounds: 'v1/backgrounds',
  characters: 'v1/characters',
  sections: 'v1/sections',
  classes: 'v1/classes',
  conditions: 'v1/conditions',
  magicitems: 'v1/magicitems',
  monsters: 'v1/monsters',
  races: 'v1/races',
  feats: 'v1/feats',
  spells: 'v1/spells',
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
    queryKey: ['get', endpoint, slug],
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

export const useMonster = (slug: string) => {
  const { get } = useAPI();
  return useQuery({
    queryKey: ['get', API_ENDPOINTS.monsters, slug],
    queryFn: async () => {
      const monster = await get(API_ENDPOINTS.monsters, slug);
      monster.abilities = ability_names.map((ability) => ({
        name: ability,
        shortName: ability.slice(0, 3),
        score: monster[ability],
        modifier: formatMod(calcMod(monster[ability])),
        save: monster[`${ability}_save`],
      }));
      console.log('monster', monster);
      return monster;
    },
    staleTime: Infinity,
  });
};

export const useSpells = (charClass: string) => {
  const { findMany } = useAPI();
  return useQuery({
    queryKey: ['findMany', API_ENDPOINTS.spells, sources],
    queryFn: async () => {
      console.log('fetching spells', sources.value);
      const spells = await findMany(API_ENDPOINTS.spells, sources.value);
      const class_spells = spells
        .filter((spell) => {
          return spell.dnd_class.toLowerCase().includes(charClass);
        })
        .sort(function (a, b) {
          return a.lvl - b.lvl;
        });

      const grouped_spells = _.groupBy(class_spells, 'level_int');

      // label groups by level
      const levels = Object.getOwnPropertyNames(grouped_spells).map((key) => {
        return {
          lvl: key,
          lvlText: available_levels[parseInt(key)],
          spells: grouped_spells[key],
        };
      });

      return levels;
    },
    staleTime: Infinity,
  });
};
// Helper functions
const calcMod = (score: number) => Math.floor((score - 10) / 2);
const formatMod = (mod: number) =>
  mod >= 0 ? '+' + mod.toString() : mod.toString();

const ability_names = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;

const available_classes = ref([
  'bard',
  'cleric',
  'sorcerer',
  'wizard',
  'druid',
  'paladin',
  'warlock',
  'ranger',
]);

const available_levels = [
  'Cantrip',
  '1st-level',
  '2nd-level',
  '3rd-level',
  '4th-level',
  '5th-level',
  '6th-level',
  '7th-level',
  '8th-level',
  '9th-level',
];
