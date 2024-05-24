<template>
  <section class="container">
    <div class="filter-header-wrapper">
      <h1 class="filter-header">Magic Item List</h1>
      <FilterButton @showFilters="displayFilters = !displayFilters" />
    </div>
    <MagicItemFilterBox v-model="magic_items_filters" v-if="displayFilters" />
    <div class="flex w-full italic text-blood">
      Displaying {{ filteredItems.length }} magic items
    </div>
    <hr class="color-blood mx-auto" />
    <div class="three-column" v-if="magic_items">
      <p v-if="!items.length">Loading...</p>
      <div v-else aria-live="assertive" aria-atomic="true">
        <p v-if="!itemListLength">No results</p>
      </div>
      <div>
        <div
          v-for="(letter, key) in magic_items_by_letter"
          :key="letter[0].name.charAt(0)"
          class="letter-list"
        >
          <h3>
            {{ key.toUpperCase() }}
          </h3>
          <ul class="list--items">
            <li v-for="item in letter" :key="item.name">
              <nuxt-link
                tag="a"
                :params="{ id: item.slug }"
                :to="`/magic-items/${item.slug}`"
              >
                {{ item.name }}
              </nuxt-link>
              <source-tag
                v-if="item.document__slug && item.document__slug !== 'wotc-srd'"
                class=""
                :title="item.document__title"
                :text="item.document__slug"
              />
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import FilterButton from '~/components/FilterButton.vue';
import SourceTag from '~/components/SourceTag.vue';
import { useMainStore } from '~/store';

const store = useMainStore();
const displayFilters = ref(false);
const filters = reactive({
  attunement: false,
  name: null,
  rarity: null,
  type: null,
});
const magic_items_filters = ref({
  name: null,
  rarity: null,
  type: null,
  isAttunementRequired: null,
});
const itemRarities = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'];
const itemTypes = [
  'Armor',
  'Potion',
  'Ring',
  'Rod',
  'Scroll',
  'Staff',
  'Wand',
  'Weapon',
  'Wondrous Item',
];
const items = computed(() => {
  return [...store.allMagicItems].sort((a, b) => a.slug.localeCompare(b.slug));
});

function clearFilters() {
  filters.attunement = false;
  filters.name = null;
  filters.rarity = null;
  filters.type = null;
}
function filterByAttunement(itemsToFilter) {
  if (filters.attunement == false) {
    return itemsToFilter;
  } else {
    return itemsToFilter.filter((item) => {
      return item.requires_attunement == 'requires attunement';
    });
  }
}
function filterByName(itemsToFilter) {
  if (filters.name == null) {
    return itemsToFilter;
  } else {
    return itemsToFilter.filter((item) =>
      item.name.toLowerCase().includes(filters.name.toLowerCase())
    );
  }
}
function filterByRarity(itemsToFilter) {
  if (filters.rarity == null) {
    return itemsToFilter;
  } else {
    return itemsToFilter.filter(
      (item) => item.rarity.toLowerCase() == filters.rarity.toLowerCase()
    );
  }
}
function filterByType(itemsToFilter) {
  if (filters.type == null) {
    return itemsToFilter;
  } else {
    return itemsToFilter.filter(
      (item) => item.type.toLowerCase() == filters.type.toLowerCase()
    );
  }
}

const filteredItems = computed(() => {
  let allItems = items.value;
  let nameFiltered = filterByName(allItems);
  let rareFiltered = filterByRarity(nameFiltered);
  let typeFiltered = filterByType(rareFiltered);
  let attuneFiltered = filterByAttunement(typeFiltered);
  return attuneFiltered;
});

const itemsByLetter = computed(() => {
  let letters = {};
  for (let i = 0; i < filteredItems.value.length; i++) {
    let firstLetter = filteredItems.value[i].name.charAt(0).toLowerCase();
    if (!(firstLetter in letters)) {
      letters[firstLetter] = [];
    }
    letters[firstLetter].push(filteredItems.value[i]);
  }
  return letters;
});
const itemListLength = computed(() => {
  return Object.keys(itemsByLetter.value).length;
});

const { data: magic_items } = useMagicItems();

const magic_items_by_letter = computed(() => {
  return (magic_items.value ?? []).reduce((acc, item) => {
    const firstLetter = item.name.charAt(0).toLowerCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(item);
    return acc;
  }, {});
});
</script>

<style scoped lang="scss">
.letter-list {
  break-inside: avoid-column;

  &:first-child h3 {
    margin-top: 0;
  }
}
</style>
