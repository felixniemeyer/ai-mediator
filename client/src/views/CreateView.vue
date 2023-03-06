<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";
import config from "../config";

type ContactType = "email" | "phone";

interface Person {
  name: string;
  contactType: ContactType | undefined;
  contact: string;
}

const emptyPerson: Person = {
  name: "",
  contactType: undefined,
  contact: "",
};

function addPerson() {
  persons.value.push({ ...emptyPerson });
}

// reactive list of persons
const persons = ref([] as Person[]);
for (let i = 0; i < 2; i++) {
  addPerson();
}

const removePerson = (index: number) => {
  persons.value.splice(index, 1);
};

const session = ref({
  name: "",
});

const sending = ref(false);
const ready = ref(false);
const error = ref(undefined as string | undefined);

// send request to server for createSession
const createSession = async () => {
  sending.value = true;
  try {
    const response = await axios.post(config.backendUrl + "/session", {
      participants: persons.value,
    });
    if (response.status === 200) {
      ready.value = true;
    }
  } catch (error) {
    console.error(error);
  } finally {
    sending.value = false;
  }
  sending.value = false;
};
</script>

<template>
  <div v-if="sending">
    <h2>Sending request to server...</h2>
  </div>
  <div v-else-if="ready">
    <h2>Session created!</h2>
    <p>
      Everyone should have received an inviation to explain their perspective.
    </p>
    <p>You are done here and can close this tab.</p>
    <p>
      <RouterLink to="/">Go back to home</RouterLink>
    </p>
  </div>
  <div v-else-if="error">
    <h2>An error occured</h2>
    <p>Error: {{ error }}</p>
  </div>
  <div v-else>
    <h2>Start a new mediation session</h2>
    <p>Enter contact details of the participants</p>
    <div v-for="(person, i) in persons" :key="i">
      <input type="text" v-model="person.name" placeholder="name" />
      <input
        type="contact"
        v-model="person.contact"
        placeholder="mail or phone"
      />
      <button @click="removePerson(i)">Remove</button>
    </div>
    <p>
      <button @click="addPerson">Add person</button>
    </p>
    <p>
      <input type="text" v-model="session.name" placeholder="Session name" />
    </p>
    <p>
      <button @click="createSession">Create session and send invitations</button>
    </p>
  </div>
</template>

<style>
</style>
