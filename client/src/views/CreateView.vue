<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";
import config from "../config";

enum ContactType {
  email,
  phone,
}

interface Person {
  name: string;
  contactType: ContactType;
  email: string;
  phone: string;
}

const emptyPerson: Person = {
  name: "",
  contactType: ContactType.phone,
  email: "",
  phone: "",
};

const addPerson = () => {
  persons.value.push({ ...emptyPerson });
};

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
    const response = await axios.post(config.BACKEND_URL + "/api/createSession", {
      persons: persons.value,
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
  <h2>Start a new session</h2>
  <div v-if="sending">
    <p>Sending request to server...</p>
  </div>
  <div v-else-if="ready">
    <p>Session created!</p>
    <p>
      Everyone should have received an inviation to explain their perspective.
    </p>
  </div>
  <div v-else-if="error">
    <p>Error: {{ error }}</p>
  </div>
  <div v-else>
    <p>Enter contact details of the participants</p>
    <ul>
      <li v-for="(person, i) in persons" :key="i">
        <input type="text" v-model="person.name" placeholder="Name" />
        <select v-model="person.contactType">
          <option :value="ContactType.email">Email</option>
          <option :value="ContactType.phone">Phone</option>
        </select>
        <input
          v-if="person.contactType == ContactType.email"
          type="email"
          v-model="person.email"
          placeholder="Email address"
        />
        <input
          v-else
          type="email"
          v-model="person.phone"
          placeholder="Phone number"
        />
        <button @click="removePerson(i)">Remove</button>
      </li>
      <li class="add-person">
        <button @click="addPerson">Add person</button>
      </li>
    </ul>
    <input type="text" v-model="session.name" placeholder="Session name" />
    <p>
      send invitations to the participants:
      <button @click="createSession">Create session</button>
    </p>
  </div>
</template>

<style>
.add-person {
  text-align: center;
}
</style>
