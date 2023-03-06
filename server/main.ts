// create a express server that handles
// post for session for creating a session and sending SMS invitations
// post for perspective  for submitting perspectives
// get for participation for requesting participation data
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import cors from 'cors';

import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';

import fs from 'fs'; 

const frontEndUrl = process.env.FRONT_END_URL;

const app = express();

const server = http.createServer(app);

app.use(cors());

// check if sessions folder exists and create it if not
if (!fs.existsSync('./sessions')) {
  fs.mkdirSync('./sessions');
}

const port = process.env.PORT || 3000;

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
  return participantDir(sessionId, secretKey) + '/perspective.txt';
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
    isSecret: true
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
    console.log("http://localhost:5173/session/" + session.id + "/participant/" + participant.secretKey)
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

  console.log(req.body);

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
            Promise.all(session.participants.map((participant: any) =>
                new Promise((resolve, reject) => {
                  fs.readFile(perspectiveFile(sessionId, participant.secretKey), (err, data) => {
                    if (err) {
                      reject(false);
                    } else {
                      resolve([participant.secretKey, data])
                    }
                  }
                )})
              )
            ).then((perspectives) => {
              const dict = {} as {[key: string]: string}
              perspectives.forEach((tuple) => {
                dict[tuple[0]] = tuple[1].toString();
              }) 
              console.log('dict', dict);
              consultChatGPT(session, dict);
              res.send({ status: 'complete' });
            }).catch(() => {
              res.send({ status: 'ok' });
            })
          }
        })
      } else {
        console.error('invalid secret key');
        res.status(500).send('invalid secret key');
      }
    }
  }); 
});

function consultChatGPT(session: any, perspectives: {[secretKey: string]: string}) {
  // load all perspectives from fs
  const participants = session.participants
  participants.forEach((participant: any, i: number) => {
    const name = participant.name;

    const nameList = participants.map((participant: any) => participant.name);

    let frame = `Hey ChatGPT, there are ${participants.length} people who have a conflict. Their names are (${nameList.join(', ')}). Everyone has his own perspective on the conflict. Please read their versions of the truth and give ${name} some suggestions on how to deal with the situation in a constructive way.`
    if(session.isSecret) {
      frame += ` You are the only one who knows all the perspectives which the participants have stated in secret.`
    }

    let messages = [{"role": "system", "content": frame}] as ChatCompletionRequestMessage[]

    let perspectivesString = `Here are the other poeples' perspectives:`

    console.log(perspectives)
    for(let j = 1; j < participants.length; j++) {
      const index = (i + j) % participants.length;
      const otherParticipant = participants[index];
      const otherPerspective = perspectives[otherParticipant.secretKey];
      perspectivesString += `${otherParticipant.name}: ${otherPerspective}`
    }

    messages.push({"role": "system", "content": perspectivesString})

    messages.push({"role": "system", "content": `Here comes ${name}'s perspective:`})

    const perspective = perspectives[participant.secretKey];
    messages.push({
      "role": 'user',
      "content": perspective
    })

    messages.push({"role": "system", "content": `Please give ${name} some suggestions on how to deal with the situation in a constructive way or what to reflect about.`})

    openai.createChatCompletion({
      model: "gpt-3.5-turbo-0301",
      messages: messages,
    }).then((response) => {
      console.log(response.data);
      try {
        const answer = response.data.choices[0].message?.content;
        fs.writeFile(answerFile(session.id, participant.secretKey), JSON.stringify(response.data), (err) => {
          if (err) {
            console.log(err);
          }
        })
      } catch (e) {
        console.error('something went wrong when parsing the response from openai', e);
      }
    }).catch((error) => {
      console.log('error calling openai: ', error);
    })
  });
}

app.get('/session/:sessionId/participation/:secretKey', (req, res) => {
  const sessionId = req.params.sessionId;
  const secretKey = req.params.secretKey;

  // load meta information from file
  fs.readFile(sessionFile(sessionId), (err, data) => {
    if(err) {
      res.send({ status: 'err', msg: 'could not find session' + err });
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
          const perspective = results[0].status === 'fulfilled' ? results[0].value.toString() : undefined;
          const answer = results[1].status === 'fulfilled' ? results[1].value.toString() : undefined;
          res.send({ 
            participantName: participant.name,
            sessionName: session.name,
            perspective, 
            answer
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
