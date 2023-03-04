// create a express server that handles
// post for session for creating a session and sending SMS invitations
// post for perspective  for submitting perspectives
// get for participation for requesting participation data

import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import cors from 'cors';

import { Configuration, OpenAIApi } from 'openai';

import fs from 'fs'; 

const frontEndUrl = process.env.FRONT_END_URL || 'https://localhost:5173/';

const app = express();

const server = http.createServer(app);

app.use(cors());

// check if sessions folder exists and create it if not
if (!fs.existsSync('./sessions')) {
  fs.mkdirSync('./sessions');
}

const port = process.env.PORT || 3000;

console.log('running on port', port) 


const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// set up the express server
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// set up the twilio client
// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID, 
//   process.env.TWILIO_AUTH_TOKEN
// );

// set up the nodemailer client
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
  }
});

function sessionFile(sessionId: string) {
  return sessionDir(sessionId) + '/meta.json';
}

const sessionDir = (sessionId: string) => {
  return './sessions/' + sessionId;
}

function participantFile(sessionId: string, secretKey: string) {
  return participantDir(sessionId, secretKey) + '/meta.json';
}

const participantDir = (sessionId: string, secretKey: string) => {
  return sessionDir(sessionId) + '/' + secretKey;
}

function perspectiveFile(sessionId: string, secretKey: string) {
  return participantDir(sessionId, secretKey) + '/perspective.json';
}

function answerFile(sessionId: string, secretKey: string) {
  return participantDir(sessionId, secretKey) + '/answer.json';
}

// create random key
function randomKey() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// set up the routes
app.post('/session', async (req, res) => {
  // generate session id
  console.log(req.body);
  const session = {
    id: randomKey(),
    ...req.body,
  }

  // create direcoties and files
  try {
    await fs.promises.mkdir(sessionDir(session.id))
  } catch (e) {
    console.error('failed to create session directory:', e);
    res.status(500).send('error creating session');
    return;
  }

  try {
    await Promise.all(
      session.participants.map(async (participant: any) => {
        const secretKey = randomKey();
        participant.secretKey = secretKey;
        await fs.promises.mkdir(participantDir(session.id, secretKey))
        await fs.promises.writeFile(participantFile(session.id, secretKey), JSON.stringify(participant))
        sendEmailOrSMS(session, participant) 
      })
    )
  } catch (err) {
    console.error('failed to create at least one participant directory or file:', err);
    session.creationError = err; 
    res.status(500).send('error creating session');
    return;
  }

  await fs.promises.writeFile(
    sessionFile(session.id), 
    JSON.stringify(session)
  );

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
    // twilioClient.messages.create({
    //   to: participant.phone,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   body: text
    // }).catch((error) => {
    //   throw(new Error('could not send SMS:' + error));
    // })
  }
}


app.post('/perspective', async (req, res) => {
  // TBD: memory lock
  // TBD: check if session is already closed

  const sessionId = req.body.sessionId;
  const secretKey = req.body.secretKey;
  const perspective = req.body.perspective;

  // load meta information from file
  fs.readFile(sessionFile(sessionId), (err, data) => {
    if (err) {
      console.error('failed to read session file:', err);
      res.status(500).send('error reading session file');
      return;
    } else {
      const session = JSON.parse(data.toString());
      // check that secret key is valid
      const participant = session.participants.find((participant: any) => participant.secretKey === secretKey);
      if (participant) {
        // write perspective to file
        fs.writeFile(perspectiveFile(sessionId, secretKey), perspective, (err) => {
          if (err) {
            console.error('failed to write perspective file:', err);
            res.status(500).send('error writing perspective file');
          } else {
            // check if all perspectives have been submitted
            Promise.all(session.participants.map((participant: any) => {
                // check if file exists
                new Promise((resolve, reject) => {
                  fs.readFile(perspectiveFile(sessionId, secretKey), (err, data) => {
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
              res.send({ status: 'complete' });
            }).catch(() => {
              res.send({ status: 'ok' });
            })
          }
        })
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
    prompts = [{"role": "mediator", "content": "Please present your viewpoints on the issue at hand."}];
    
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
      fs.writeFile(answerFile(session.id, participant.secretKey), JSON.stringify(response.data), (err) => {
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
  fs.readFile(sessionDir(sessionId), (err, data) => {
    if(err) {
      res.send({ status: 'err', msg: 'could not find session' });
    } else {
      const session = JSON.parse(data.toString());
      // check that secret key is valid
      const participant = session.participants.find((participant: any) => participant.secretKey === secretKey);
      if (participant) {
        // load all perspectives from fs
        Promise.allSettled([
          fs.promises.readFile(perspectiveFile(sessionId, secretKey)), 
          fs.promises.readFile(answerFile(sessionId, secretKey))
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
