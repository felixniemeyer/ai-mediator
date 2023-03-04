<script setup lang="ts">
import { ref, onBeforeMount } from "vue";
import axios from "axios";
import config from "../config";

const result = ref(undefined as string | undefined);

const perspective = ref("");

const loading = ref(true);

const submitted = ref(false);
const submitting = ref(false);

const loadingError = ref(undefined as undefined | string);
const submitError = ref(undefined as undefined | string);

const check = async () => {
  loading.value = true;
  try {
    const response = await axios.get(config.backendUrl + "/api/participation");
    if (response.data.perspective !== undefined) {
      submitted.value = true;
      perspective.value = response.data.perspective;
    }
    if (response.data.proposal !== undefined) {
      result.value = response.data.result;
    }
    result.value = response.data;
    loading.value = false;
    loadingError.value = undefined;
  } catch (e) {
    loadingError.value =
      "There was a problem when requesting data from the server." + e;
  }
};

onBeforeMount(check);

const submit = async () => {
  if (perspective.value == "") {
    submitError.value = "your perspective can't be empty";
  } else {
    submitting.value = true;
    try {
      const { data } = await axios.post(
        config.backendUrl + "/api/perspective",
        {
          perspective: perspective.value,
        }
      );
      result.value = data;
      submitError.value = undefined;
    } catch (e) {
      submitError.value = "Failed to send data to the server. " + e;
    }
    submitting.value = false;
  }
};
</script>

<template>
  <div v-if="loading">
    <h1>Loading...</h1>
  </div>
  <div v-if="loadingError">
    <h1>Error when loading</h1>
    <p>{{ loadingError }}</p>
    <p>try again <button @click="check">here</button></p>
  </div>
  <template v-else>
    <div v-if="submitting">
      <h1>Submitting...</h1>
    </div>
    <div v-else-if="result == undefined">
      <div v-if="submitted">
        <h1>Thank's for sharing your perspective!</h1>
        <p>
          you can still change your perspective until everyone else has
          submitted theirs and the results are ready
        </p>
        <button @click="check">check whether results are ready now</button>
      </div>
      <h1 v-else>Tell the AI your perspective on the conflict</h1>
      <textarea v-model="perspective" />
      <button @click="submit">Submit</button>
    </div>
    <div v-else>
      <h1>Here's what the AI thinks</h1>
      <p>{{ result }}</p>
      <h2>Here is what you said</h2>
      <p>{{ perspective }}</p>
    </div>
  </template>
</template>

<style></style>
