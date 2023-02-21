<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import HelloWorld from "./components/HelloWorld.vue";
</script>

<template>
  <header>
    <div>
      <RouterLink to="/">
        <img alt="chat therapy logo" class="logo" src="@/assets/logo.jpg" />
      </RouterLink>
    </div>
    <RouterView />
  </header>
</template>

<style scoped>
router-link {
  font-size: 10.5rem;
}

.logo {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
}
</style>
