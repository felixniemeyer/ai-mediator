<!-- eslint-disable prettier/prettier -->
<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";
import config from "../config";

type ContactType = "email" | "phone";

interface Participant {
  name: string;
  contactType: ContactType | undefined;
  contact: string;
}

const emptyParticipant: Participant = {
  name: "",
  contactType: "email",
  contact: "",
};

const mistakes = ref([] as string[]);

function addParticipant() {
  participants.value.push({ ...emptyParticipant });
}

// reactive list of participants
const participants = ref([] as Participant[]);
for (let i = 0; i < 2; i++) {
  addParticipant();
}

const removeParticipant = (index: number) => {
  participants.value.splice(index, 1);
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
      sessionName: session.value.name,
      participants: participants.value,
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

function validateFormAndCreateSession() {
  mistakes.value = [];
  let contactsOk = true;
  let namesOk = true;
  participants.value.forEach((participant) => {
    if (participant.name == "") {
      namesOk = false;
    }
    // Determine wether it's email or phone.
    if (participant.contact.includes("@")) {
      participant.contactType = "email";
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!validEmail.test(participant.contact)) {
        participant.contactType = undefined;
        contactsOk = false;
      }
    } else {
      participant.contactType = "phone";
      const validPhone = /^\+?\d{7,}$/;
      if (!validPhone.test(participant.contact)) {
        participant.contactType = undefined;
        contactsOk = false;
      }
    }
  });
  if (!contactsOk) {
    mistakes.value.push(
      "The contact details don't look like valid email adresses or phone number. We are sending out secret invitation links to every participant. We don't use that contact information in any other way. Please provide a valid email address or phone number."
    );
  }
  if (!namesOk) {
    mistakes.value.push("Please enter a name for every participant.");
  }
  if (participants.value.length < 2) {
    mistakes.value.push("You need at least two participants.");
  }
  // check that all names are distinct
  const names = participants.value.map((p) => p.name);
  const distinctNames = new Set(names);
  if (names.length !== distinctNames.size) {
    mistakes.value.push(
      "To avoid confusion, all participant names need to be distinct. Maybe use nick names."
    );
  }
  if(session.value.name == "") {
    mistakes.value.push("Please enter a name for the session.");
  }
  if (mistakes.value.length < 0) {
    createSession();
  }
}
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
    <p class="mistake">Error: {{ error }}</p>
  </div>
  <div v-else>
    <h2>Start a new mediation session</h2>
    <p>Enter contact details of the participants</p>
    <div v-for="(participant, i) in participants" :key="i">
      <input type="text" v-model="participant.name" placeholder="name" />
      <input
        type="contact"
        v-model="participant.contact"
        placeholder="mail or phone"
      />
      <button @click="removeParticipant(i)">Remove</button>
    </div>
    <p>
      <button @click="addParticipant">Add participant</button>
    </p>
    <p>
      <input type="text" v-model="session.name" placeholder="Session name" />
    </p>
    <div v-if="mistakes.length > 0">
      <p v-for="(mistake, i) in mistakes" :key="i" class="mistake">
        {{ mistake }}
      </p>
    </div>
    <button @click="validateFormAndCreateSession">
      {{ mistakes.length > 0 ? "Try again to c" : "C" }}reate session and send
      invitations
    </button>
  </div>
</template>

<style>
.mistake {
  color: #f42;
}
</style>
