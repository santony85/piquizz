const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// EJS
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Questions
const questions = JSON.parse(fs.readFileSync("question.json", "utf8"));
let question = {};
let players = [
  "Joueur 1",
  "Joueur 2",
  "Joueur 3",
  "Joueur 4",
  "Joueur 5"
];

let userquestion = [
  { categorie: "geographie", question: "Quelle est la capitale de l'Espagne ?", reponse: "Madrid" },
  { categorie: "geographie", question: "Quel pays possède la plus longue côte maritime ?", reponse: "Canada" },
  { categorie: "geographie", question: "Quel est le plus grand lac d'Afrique ?", reponse: "Lac Victoria" }
];

let isFirst = false;
let isStart = false;

function getRandomQuestion() {
  const index = Math.floor(Math.random() * questions.length);
  return questions[index];
}

// --- Pages ---
app.get("/", (req, res) => {
  question = getRandomQuestion();
  isFirst = false;
  console.log("ici");
  res.render("index", { players, question });
  // 🔥 Envoi propre aux ESP32 et navigateurs 
  broadcast(`QUESTION:${JSON.stringify(question)}`); 
  broadcast("RESTART");  
});

app.get("/anim", (req, res) => {
  res.render("anim", { players, question, userq: userquestion });
});

app.get("/newpart", (req, res) => {
  res.render("newpart");
});

app.post("/addpart", (req, res) => {
  players[0] = req.body.j1;
  players[1] = req.body.j2;
  players[2] = req.body.j3;
  players[3] = req.body.j4;
  players[4] = req.body.j5;
  broadcast(`PLAYERS:${JSON.stringify(players)}`);
  res.render("anim", { players, question, userq: userquestion });
});

app.get("/newquestion", (req, res) => {
  res.render("newquestion");
});

app.post("/addquestion", (req, res) => {
  userquestion.push(req.body);
  broadcast(`USERQ:${JSON.stringify(userquestion)}`);
  res.render("newquestion");
});

// --- WebSocket helpers ---
function broadcast(msg) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// --- WebSocket server ---
wss.on("connection", (ws, req) => {
    
  const ip = req.socket.remoteAddress;
  console.log("Client WS connecté :", ip);

  // On peut envoyer l'état initial
  ws.send(`QUESTION:${JSON.stringify(question)}`);
  ws.send(`PLAYERS:${JSON.stringify(players)}`);
  ws.send(`USERQ:${JSON.stringify(userquestion)}`);

  ws.on("message", (message) => {
    const msg = message.toString();
    console.log("WS message reçu :", msg);

    // BUZZ:2
    if (msg.startsWith("BUZZ:")) {
      const joueur = msg.split(":")[1];

      if (!isFirst && isStart) {
        isFirst = true;
        isStart = false;
        console.log("Winner :", joueur);
        broadcast(`WINNER:${joueur}`);
      }
      return;
    }

    // ANIM:NEXT
    if (msg === "ANIM:NEXT") {
      isFirst = false;
      isStart = false;
      question = getRandomQuestion();
      broadcast(`QUESTION:${JSON.stringify(question)}`);
      broadcast("RESTART");
      return;
    }

    // ANIM:CONTINUE   
    if (msg === "ANIM:CONTINUE") {
      isFirst = false;
      isStart = true;
      broadcast("RESTART_TIMER");
      return;
    }

    // USERQ:INDEX
    if (msg.startsWith("USERQ:")) {
      const index = parseInt(msg.split(":")[1], 10);
      if (!isNaN(index) && userquestion[index]) {
        const q = userquestion[index];
        broadcast(`QUESTION:${JSON.stringify(q)}`);
        userquestion.splice(index, 1);
        broadcast(`USERQ:${JSON.stringify(userquestion)}`);
      }
      return;
    }

    // TIMER:xxx
    if (msg.startsWith("TIMER:")) {
      console.log(msg);
      if(msg === "TIMER:0")isStart = false;
      broadcast(msg); // on rebroadcast tel quel
      return;
    }
  });

  ws.on("close", () => {
    console.log("Client WS déconnecté :", ip);
  });
});

server.listen(3000, () => {
  console.log("Serveur WebSocket Piquizz sur http://localhost:3000");
});
