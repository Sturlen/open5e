<template>
  <div class="overflow-hidden text-darkness">
    <SourcesModal :show="showModal" @close="showModal = false" />
    <div
      class="grid h-screen w-screen grid-flow-col bg-white transition-all dark:bg-darkness sm:ml-0 sm:grid-cols-[14rem_1fr] sm:overflow-y-auto sm:transition-none"
      :class="showSidebar ? 'ml-0' : '-ml-56'"
    >
      <!-- Sidebar -->
      <Sidebar />

      <!-- Page central column -->
      <div
        class="content-wrapper w-screen overflow-y-auto bg-white text-darkness dark:bg-darkness dark:text-white sm:w-full"
      >
        <!-- Site Header -->

        <div class="flex h-12 align-middle">
          <sidebar-toggle @click="toggleSidebar" />
          <breadcrumb-links class="flex-grow" />
          <theme-switcher class="inline-block" />
        </div>

        <!-- Shade: fades out main content when sidebar expanded on mobile -->
        <div
          v-show="showSidebar"
          class="fixed left-0 top-0 z-48 h-full w-full bg-basalt/50 sm:hidden"
          @click="hideSidebar"
        />

        <!-- Main page content -->
        <nuxt-page
          class="main-content pt-auto mx-0 w-full px-4 py-4 pb-0 text-darkness dark:text-white sm:px-8"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import { useMainStore } from '~/store';

const showSidebar = ref(true);
const showModal = ref(false);

const crumbs = computed(() => {
  let url = '';

  return useRoute()
    .fullPath.split('/')
    .map((segment) => {
      // ignore initial & trailing slashes
      if (segment === '' || segment === '/') {
        return;
      }

      // rebuild link urls segment by segment
      url += `/${segment}`;

      // seperate segment title & query params
      const [title, queryParams] = segment.split('?');

      // extract & format the search params if on the /search route
      let searchParam = '';
      if (title === 'search' && queryParams) {
        searchParam = queryParams.split('text=')[1].split('+').join(' ');
      }

      // return a
      return {
        url,
        title: title // format crumb title
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        subtitle: searchParam,
      };
    })
    .filter((breadcrumb) => breadcrumb);
});
provide('crumbs', crumbs);
const BASE_TITLE = 'Open5e';

const title = computed(() => {
  if (crumbs.value.length === 0) {
    return BASE_TITLE;
  }
  const crumb_titles = crumbs.value.map((crumb) => crumb.title);
  const reversed_titles = [...crumb_titles].reverse();

  return reversed_titles.join(' - ') + ` - ${BASE_TITLE}`;
});
useHead({ title: title });

function toggleSidebar() {
  showSidebar.value = !showSidebar.value;
}
function hideSidebar() {
  showSidebar.value = false;
}
</script>

<style lang="scss">
@import '../assets/main';

.main-content {
  a {
    @apply text-indigo-600 hover:text-blood hover:underline dark:text-indigo-200 dark:hover:text-red;
  }
}
</style>
