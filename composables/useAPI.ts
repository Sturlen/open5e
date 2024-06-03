import { useQuery } from '@tanstack/vue-query';
import axios from 'axios';
import { groupBy } from '~/functions/groupBy';

// TODO: remove underscore and use groupBy custom function
// TODO: remove console logs
// TODO: remove unused imports
// TODO: remove debug json on monsters

export const API_ENDPOINTS = {
  backgrounds: 'v1/backgrounds',
  characters: 'v1/characters',
  classes: 'v1/classes',
  conditions: 'v1/conditions',
  documents: 'v1/documents',
  feats: 'v1/feats',
  magicitems: 'v1/magicitems',
  monsters: 'v1/monsters',
  races: 'v1/races',
  search: 'v2/search',
  sections: 'v1/sections',
  spells: 'v1/spells',
} as const;

/** Provides the base functions to easily fetch data from the Open5e API. */
export const useAPI = () => {
  const API_URL = useRuntimeConfig().public.apiUrl;

  const api = axios.create({
    baseURL: API_URL,
    headers: { Accept: 'application/json' },
  });

  return {
    findMany: async (
      endpoint: string,
      sources: string[],
      params: Record<string, any> = {}
    ) => {
      const res = await api.get(endpoint, {
        params: {
          limit: 5000,
          document__slug__in: sources.join(','),
          ...params,
        },
      });

      return res.data.results as Record<string, any>[];
    },
    get: async (...parts: string[]) => {
      const route = '/' + parts.join('/');
      const res = await api.get(route);
      return res.data as Record<string, any>;
    },
  };
};

export const useFindMany = (endpoint: string) => {
  const { findMany } = useAPI();
  const { sources } = useSourcesList();
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

export const useSections = (...categories: string[]) => {
  const { data: sections, isPending } = useFindMany(API_ENDPOINTS.sections);
  const filtered_sections = computed(() =>
    sections.value?.filter((section) => categories.includes(section.parent))
  );
  return { data: filtered_sections, isPending };
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
      return monster;
    },
  });
};

export const useSpells = (charClass: string) => {
  const { findMany } = useAPI();
  const { sources } = useSourcesList();
  return useQuery({
    queryKey: ['findMany', API_ENDPOINTS.spells, sources],
    queryFn: async () => {
      const spells = await findMany(API_ENDPOINTS.spells, sources.value);
      const class_spells = spells
        .filter((spell) => {
          return spell.dnd_class.toLowerCase().includes(charClass);
        })
        .sort(function (a, b) {
          return a.lvl - b.lvl;
        });

      const grouped_spells = groupBy(class_spells, 'level_int');

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
  });
};

export const useAllSpells = () => {
  const { findMany } = useAPI();
  const { sources } = useSourcesList();
  return useQuery({
    queryKey: ['allSpells', API_ENDPOINTS.spells, sources],
    queryFn: async () => {
      const spells = await findMany(API_ENDPOINTS.spells, sources.value);
      return spells;
    },
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

// TODO: make get into UseArticle, and use for all one page article routes.

export type MonsterFilter = {
  name?: string;
  challengeLow?: number;
  challengeHigh?: number;
  hpLow?: number;
  hpHigh?: number;
  size?: string;
  type?: string;
};

const EMPTY_FILTER = {};

export const monster_filters = ref<MonsterFilter>(EMPTY_FILTER);

export function clearMonsterFilters() {
  monster_filters.value = EMPTY_FILTER;
}

export const useMonsters = (
  filter: globalThis.Ref<MonsterFilter> = ref({})
) => {
  const { findMany } = useAPI();
  const { sources } = useSourcesList();
  return useQuery({
    queryKey: ['monsters', API_ENDPOINTS.monsters, sources],
    queryFn: async () => {
      const monsters = await findMany(API_ENDPOINTS.monsters, sources.value);

      return monsters;
    },
  });
};

export const filterMonsters = (
  monsters: Record<string, any>[],
  filter: MonsterFilter
) => {
  const _mons = monsters;
  const { challengeHigh, challengeLow, hpHigh, hpLow, name, size, type } =
    filter;

  return _mons
    .filter((monster) =>
      name ? monster.name.toLowerCase().includes(name.toLowerCase()) : true
    )
    .filter((monster) =>
      inRange(monster.cr, challengeLow ?? 0, challengeHigh ?? Infinity)
    )
    .filter((monster) =>
      inRange(monster.hit_points, hpLow ?? 0, hpHigh ?? Infinity)
    )
    .filter((monster) =>
      size ? monster.size.toLowerCase().includes(size.toLowerCase()) : true
    )
    .filter((monster) =>
      type ? monster.type.toLowerCase().includes(type.toLowerCase()) : true
    );
};

function inRange(value: number, low: number, high: number) {
  return low <= value && value <= high;
}

/**
 * Returns a new array of items sorted by the given field
 */
export function sortByField(
  items: Record<string, any>[],
  field: string,
  direction: 'ascending' | 'descending' = 'ascending'
) {
  const isAscending = direction === 'ascending';
  return [...items].sort((a, b) => {
    if (a[field] < b[field]) {
      return isAscending ? -1 : 1;
    }
    if (a[field] > b[field]) {
      return isAscending ? 1 : -1;
    }
    return 0;
  });
}

export const MONSTER_CHALLENGE_RATINGS_LIST = [
  '0',
  '1/8',
  '1/4',
  '1/2',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
] as const;

export const MONSTER_CHALLENGE_RATINGS_MAP = [
  ['0', 0],
  ['1/8', 0.125],
  ['1/4', 0.25],
  ['1/2', 0.5],
  ['1', 1],
  ['2', 2],
  ['3', 3],
  ['4', 4],
  ['5', 5],
  ['6', 6],
  ['7', 7],
  ['8', 8],
  ['9', 9],
  ['10', 10],
  ['11', 11],
  ['12', 12],
  ['13', 13],
  ['14', 14],
  ['15', 15],
  ['16', 16],
  ['17', 17],
  ['18', 18],
  ['19', 19],
  ['20', 20],
  ['21', 21],
  ['22', 22],
  ['23', 23],
  ['24', 24],
  ['25', 25],
  ['26', 26],
  ['27', 27],
  ['28', 28],
  ['29', 29],
  ['30', 30],
] as const;

export const MONSTER_SIZES_LIST = [
  'Tiny',
  'Small',
  'Medium',
  'Large',
  'Huge',
  'Gargantuan',
] as const;

export const MONSTER_TYPES_LIST = [
  'Aberration',
  'Beast',
  'Celestial',
  'Construct',
  'Dragon',
  'Elemental',
  'Fey',
  'Fiend',
  'Giant',
  'Humanoid',
  'Monstrosity',
  'Ooze',
  'Plant',
  'Undead',
] as const;

export type MagicItemsFilter = {
  name?: string;
  rarity?: string;
  type?: string;
  isAttunementRequired?: boolean;
};

export const useMagicItems = (filters: MagicItemsFilter = {}) => {
  const { findMany } = useAPI();
  const { sources } = useSourcesList();
  const { data } = useQuery({
    queryKey: ['findMany', API_ENDPOINTS.magicitems, sources],
    queryFn: async () => {
      const magicItems = await findMany(
        API_ENDPOINTS.magicitems,
        sources.value
      );
      return magicItems;
    },
  });

  const filtered_items = computed(() => {
    const items = data.value ?? [];

    return items
      .filter((item) => {
        return item.name
          .toLowerCase()
          .includes(filters.name?.toLowerCase() ?? '');
      })
      .filter((item) => {
        return item.rarity
          .toLowerCase()
          .includes(filters.rarity?.toLowerCase() ?? '');
      })
      .filter((item) =>
        filters.type
          ? item.type.toLowerCase() === filters.type.toLowerCase()
          : true
      )
      .filter((item) =>
        filters.rarity
          ? item.rarity.toLowerCase() === filters.rarity.toLowerCase()
          : true
      )
      .filter((item) =>
        filters.isAttunementRequired != null
          ? (filters.isAttunementRequired &&
              item.requires_attunement === 'requires attunement') ||
            item.requires_attunement === ''
          : true
      );
  });

  return { data: filtered_items };
};

export const MAGIC_ITEMS_RARITES = [
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary',
] as const;

export const MAGIC_ITEMS_TYPES = [
  'Armor',
  'Potion',
  'Ring',
  'Rod',
  'Scroll',
  'Staff',
  'Wand',
  'Weapon',
  'Wondrous Item',
] as const;

export const useDocuments = () => {
  const { findMany } = useAPI();
  return useQuery({
    queryKey: ['findMany', API_ENDPOINTS.documents],
    queryFn: () => findMany(API_ENDPOINTS.documents, []),
  });
};

export const useSearch = (queryRef: Ref<string>) => {
  const { findMany } = useAPI();
  return useQuery({
    queryKey: ['search', queryRef],
    queryFn: () =>
      queryRef.value
        ? findMany(`${API_ENDPOINTS.search}`, [], {
            schema: 'v1',
            query: queryRef.value,
          })
        : [],
  });
};

export const useQueryParam = (paramName: string) =>
  computed(() => useRoute().query[paramName]);
