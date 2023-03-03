// create a express server that handles
// post for api/session for creating a session and sending SMS invitations
// post for api/perspective  for submitting perspectives
// get for api/participation for requesting participation data

import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import nodemailer from 'nodemailer';

import { Configuration, OpenAIApi, ChatCompletion } from 'openai';

import fs from 'fs'; 

const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 3000;

const frontEndUrl = process.env.FRONT_END_URL || 'http://localhost:5173';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// set up the express server
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// set up the twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// set up the nodemailer client
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
  }
});

// create random key
function randomKey() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// set up the routes
app.post('/session', (req, res) => {
  // generate session id
  const session = {
    id: randomKey(),
    ...req.body,
  }
  const errors = [];

  // create new folder for session
  fs.mkdir('./sessions/' + session.id, (err) => {
    if (err) {
      errors.push(err);
      console.log(err);
    }
  })

  // for every participant
  session.participants.forEach((participant: any) => {
    // generate secret key
    const secretKey = randomKey();

    // create new folder for participant
    fs.mkdir('./sessions/' + session.id + '/' + secretKey, (err) => {
      if (err) {
        errors.push(err);
        console.log(err);
      }
    })

    // save meta file for participant
    fs.writeFile('./sessions/' + session.id + '/' + secretKey + '/meta.json', JSON.stringify(participant), (err) => {
      if (err) {
        errors.push(err);
        console.log(err);
      }
    })

    participant.secretKey = secretKey;

    // send email or SMS
    sendEmailOrSMS(session, participant) 
  });

  // write meta information to file
  fs.writeFile('./sessions/' + session.id + '/meta.json', session, (err) => {
    if (err) {
      console.log(err);
    }
  })

  res.send({ sessionId: session.id });
}); 

const onlyLog = true
function sendEmailOrSMS(session: any, participant: any) {
  const text = `Hi ${participant.name}, you have been invited to participate in a perspective taking session. Please click on the following link to participate: ${frontEndUrl}/session/${session.id}/${participant.secretKey}`

  if(onlyLog) {
    console.log("Should send email and SMS here but we are only Logging")
  } else if (participant.contactType === 'email') {
    const mailOptions = {
      from: 'ai-mediator@gmail.com',
      to: participant.email,
      subject: 'Invitation to participate in a perspective taking session',
      text
    };
    // send email
    transporter.sendMail(mailOptions, (error, info) => {
      console.log("mail sent", info);
      if (error) {
        throw(new Error('could not send email:' + error));
      }
    });
  } else {
    // send SMS
    twilioClient.messages.create({
      to: participant.phone,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: text
    }).catch((error) => {
      throw(new Error('could not send SMS:' + error));
    })
  }
}

app.post('/perspective', (req, res) => {
  // TBD: memory lock
  // TBD: check if session is already closed

  const sessionId = req.body.sessionId;
  const secretKey = req.body.secretKey;
  const perspective = req.body.perspective;

  // load meta information from file
  fs.readFile('./sessions/' + sessionId + '/meta.json', (err, data) => {
    if(err) {
      res.send({ status: 'err', msg: 'could not find session' });
    } else {
      const session = JSON.parse(data.toString());
      // check that secret key is valid
      const participant = session.participants.find((participant: any) => participant.secretKey === secretKey);
      if (participant) {
        // write perspective to file
        fs.writeFile('./sessions/' + sessionId + '/' + secretKey + '/perspective.json', perspective, (err) => {
          if (err) {
            res.send({ status: 'err', msg: 'could not store perspective' });
          }
        })
        // check if all perspectives have been submitted
        Promise.all(session.participants.map((participant: any) => {
            // check if file exists
            new Promise((resolve, reject) => {
              fs.readFile('./sessions/' + sessionId + '/' + secretKey + '/perspective.json', (err, data) => {
                if (err) {
                  reject(false);
                } else {
                  resolve([participant.secretKey, data])
                }
              }
            )})
          })
        ).then((perspectives) => {
          const dict = {}
          perspectives.forEach((tuple) => {
            perspectives[tuple[0]] = tuple[1];
          }) 
          consultChatGPT(session, dict);
        })
        res.send({ status: 'ok' });
      } else {
        res.send({ status: 'err', msg: 'invalid secret key' });
      }
    }
  }); 
});

function consultChatGPT(session: any, perspectives: {[secretKey: string]: string}) {
  // load all perspectives from fs
  const participants = session.participants
  participants.forEach((participant: any, i: number) => {
    const name = participant.name;
    const perspective = perspectives[name];

    const nameList = participants.map((participant: any) => participant.name);
    let messageToChatGPT = `You are the mediator in a conflict involving ${participants.length} people named: (${nameList.join(', ')}). Please give participant 0 named ${name} some suggestions on how to deal with the situation.`

    if(session.isSecret) {
      // messageToChatGPT += " You are the only one who knows all the perspectives which the participants have stated in secret."
    }
    let prompts = [{"role": "system", "content": messageToChatGPT}];
    let prompts = [{"role": "mediator", "content": "Please present your viewpoints on the issue at hand."}];
    
    // Add person that should be adressed opinion first.
    prompts.push({
      "role": `participant 0 named ${name}`,
      "content": perspective
    })
    
    // Add remaining perspectives in rotating order
    for(let j = 0; j < participants.length; j++) {
      const index = (i + 1 + j) % participants.length;
      const otherParticipant = participants[index];
      const otherPerspective = perspectives[otherParticipant.secretKey];
      prompts.push({
        "role": `participant ${index} named ${otherParticipant.name}`,
        "content": otherPerspective
      })
    }

    console.log(prompts);
    

    openai.createCompletion({
      model: "gpt-3.5-turbo",
      prompt: prompts,
      // max_tokens: 3000,
      // temperature: 0.9,
      // top_p: 1,
      // frequency_penalty: 0.0,
      // presence_penalty: 0.6,
      // stop: nameList, 
    }).then((response) => {
      console.log(response.data);
      fs.writeFile('./sessions/' + session.id + '/' + participant.secretKey + '/answer.json', JSON.stringify(response.data), (err) => {
        if (err) {
          console.log(err);
        }
      })
    })

  });
}

app.get('/session/:sessionId/results/:secretKey', (req, res) => {
  const sessionId = req.params.sessionId;
  const secretKey = req.params.secretKey;

  // load meta information from file
  fs.readFile('./sessions/' + sessionId + '/meta.json', (err, data) => {
    if(err) {
      res.send({ status: 'err', msg: 'could not find session' });
    } else {
      const session = JSON.parse(data.toString());
      // check that secret key is valid
      const participant = session.participants.find((participant: any) => participant.secretKey === secretKey);
      if (participant) {
        // load all perspectives from fs
        Promise.allSettled([
          fs.promises.readFile('./sessions/' + sessionId + '/' + secretKey + '/perspective.json'), 
          fs.promises.readFile('./sessions/' + sessionId + '/' + secretKey + '/answer.json')
        ]).then((results) => {
          res.send({ 
            perspective: results[0], 
            answer: results[1]
          });
        })
      } else {
        res.send({ status: 'err', msg: 'invalid secret key' });
      }
    }
  });

}); 

// start the server
server.listen(port, () => {
  console.log(`Listening on port ${port}`);
})
