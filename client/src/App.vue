<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <header>
    <h1>
      <RouterLink to="/">
        <img alt="chat therapy logo" class="logo" src="/icon.svg" />
        AI mediator
      </RouterLink>
    </h1>
    <div class='content'>
      <RouterView />
    </div>
  </header>
</template>

<style scoped>
h1 * {
  vertical-align: middle;
  color: #fff;
  text-decoration: none;
}
h1 a:visited {
  color: #fff;
}

.logo {
  width: 5rem;
  height: 5rem;
  margin: 1rem; 
}

.content {
  background-color: #fff2;
  padding: 1rem;
  border-radius: 1rem;
}
</style>

<style>
a {
  color: #7af;
}
a:visited {
  color: #d6f;
}

textarea,
input,
button {
  font-size: 1rem;
  padding: 0.3rem;
}

button {
  cursor: pointer;
}

textarea,
input {
  margin-right: 0.2rem;
  background-color: #000;
  border-radius: 0.3rem;
  border: none;
  color: #fff;
}
</style>
