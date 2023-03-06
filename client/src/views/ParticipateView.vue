<script setup lang="ts">
import { ref, onBeforeMount } from "vue";
import axios from "axios";
import config from "../config";
import { useRoute } from "vue-router";
const route = useRoute();

const participantName = ref("");
const sessionName = ref("");
const answer = ref("");
const perspective = ref("");
const submittedPerspective = ref("");

const loading = ref(true);
const loadingError = ref(undefined as undefined | string);

const submitting = ref(false);
const submittingError = ref(undefined as undefined | string);

const check = async () => {
  loading.value = true;
  try {
    const path = `/session/${route.params.sessionId}/participation/${route.params.participationKey}`;
    const response = await axios.get(config.backendUrl + path);
    submittedPerspective.value = response.data.perspective;
    perspective.value = response.data.perspective;
    answer.value = response.data.answer;
    participantName.value = response.data.participantName;
    sessionName.value = response.data.sessionName;
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
    submittingError.value = "your perspective can't be empty";
  } else {
    submitting.value = true;
    try {
      const { data } = await axios.post(config.backendUrl + "/perspective", {
        sessionId: route.params.sessionId,
        secretKey: route.params.participationKey,
        perspective: perspective.value,
      });
      submittingError.value = undefined;
      if (data.status == "complete") {
        loading.value = true;
        setTimeout(() => {
          check();
        }, 1000);
      }
    } catch (e) {
      submittingError.value = "Failed to send data to the server. " + e;
    }
    submitting.value = false;
  }
};
</script>

<template>
  <div v-if="loading">
    <h3>Loading session...</h3>
  </div>
  <div v-else-if="loadingError">
    <h3>{{ loadingError }}</h3>
  </div>
  <div v-else-if="answer">
    <h3>Here's what the AI thinks</h3>
    <p>
      Hi {{ participantName }}, thank you for participating in the mediation
      session <i> {{ sessionName }} </i>. Here is your answer:
    </p>
    <p>{{ answer }}</p>
    <h3>Here is your perspective again</h3>
    <p>{{ submittedPerspective }}</p>
  </div>
  <div v-else-if="submitting">
    <h3>Submitting perspective...</h3>
  </div>
  <div v-else>
    <template v-if="submittedPerspective">
      <h3>Thanks for submitting your perspective</h3>
      <p>
        Hi {{ participantName }}, thanks for submitting your perspective on the
        mediation session <i> {{ sessionName }} </i>.
      </p>
      <p>
        We are now waiting for the other participants to submit their
        perspectives.
      </p>
      <button @click="check">Check again</button>
      <p>
        You can still change your perspective and resubmit until everyone has
        submitted their perspectives.
      </p>
    </template>
    <template v-else>
      <h3>Tell the AI your perspective on the conflict</h3>
      Hi {{ participantName }}, welcome to the mediation session
      {{ sessionName }}. Please describe your perspective on the conflict.
    </template>
    <textarea v-model="perspective" />
    <button @click="submit">
      {{ submittedPerspective ? "Res" : "S" }}ubmit
    </button>
  </div>
</template>

<style>
textarea {
  display: block;
  margin: 1rem 0;
  width: calc(100% - 0.5rem);
  box-sizing: border-box;
}
</style>
