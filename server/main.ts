// create a express server that handles
// post for api/session for creating a session and sending SMS invitations
// post for api/perspective  for submitting perspectives
// get for api/participation for requesting participation data

import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { model, Schema } from 'mongoose';

const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 3000;

// set up the express server
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// set up the database
mongoose.connect('mongodb://localhost:27017/perspective');

// set up the twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// set up the nodemailer client
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
  }
});

// set up the database models
const Session = model('Session', new Schema({
  name: String,
  participation: [Schema.Types.ObjectId],
}));

const Participation = model('Participant', new Schema({
  session: Schema.Types.ObjectId,
  name: String,
  constact: {
    type: String,
    value: String,
  }, 
  perspective: String,
  result: String,
}))

// set up the routes
app.post('/api/session', (req, res) => {
}); 

app.post('/api/perspective', (req, res) => {
}); 

app.get('/api/participation', (req, res) => {
}); 

// start the server
server.listen(port, () => {
  console.log(`Listening on port ${port}`);
})

