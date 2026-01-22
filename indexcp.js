const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const fs =require("fs"); 
const questions = JSON.parse( fs.readFileSync("question.json", "utf8") );

let question = {};

// use res.render to load up an ejs view file

let players = [
	"Joueur 1",
	"Joueur 2",
	"Joueur 3",
	"Joueur 4",
	"Joueur 5"       
]

let userquestion = [
	{ "categorie": "geographie", "question": "Quelle est la capitale de l'Espagne ?", "reponse": "Madrid" },
	{ "categorie": "geographie", "question": "Quel pays possède la plus longue côte maritime ?", "reponse": "Canada" },
	{ "categorie": "geographie", "question": "Quel est le plus grand lac d'Afrique ?", "reponse": "Lac Victoria" }
];

let isFirst=0;
let isStart=0;


  
function getRandomQuestion() {
	const index = Math.floor(Math.random() * questions.length);
	return questions[index];
}


// index page
app.get('/', function(req, res) {
	question = getRandomQuestion();
	isFirst=0;
	res.render('index',{players : players,question:question}); 
	io.emit("restart", "0"); 
	io.emit("question", question); 
});

// index page
app.get('/newpart', function(req, res) {
	res.render('newpart');  
});

app.post('/addpart', function(req, res) {
	console.log(req.body)
	players[0]= req.body.j1;
	players[1]= req.body.j2;
	players[2]= req.body.j3;
	players[3]= req.body.j4;
	players[4]= req.body.j5;
	io.emit("players", players);
	res.render('anim',{players : players});
});

app.get('/newquestion', function(req, res) {
	res.render('newquestion');
});

app.post('/addquestion', function(req, res) {
	console.log(req.body)
	userquestion.push(req.body);
	io.emit("userquestion", userquestion);
	res.render('newquestion');
});

app.get('/anim', function(req, res) {
	console.log(userquestion);
	res.render('anim',{players : players,question:question,userq:userquestion});
});

io.on('connection', (socket) => {
	console.log("ESP32 connecté :", socket.id);

	socket.on("message", (data) => {
		console.log("Message reçu de l'ESP32 OK:", data);
	
		if (isFirst === 0) {
			isFirst = 1;
			io.emit("winner", data);
			console.log("winner " + data);
		}
	});  
  
	socket.on("anim", (data) => {      
		console.log("Message reçu de anim:", data);  
		if(data==="next"){
			isStart=0;
			console.log("next")
			question = getRandomQuestion();  
			io.emit("question", question);  
			io.emit("restart", "0");  
		}        
		else if(data==="continue"){
			console.log("continue");
			io.emit("restartTimer");
			isStart=1;
		}
	});
	
	socket.on("userq", (data) => {
		console.log("Message reçu anim", data);
		console.log(userquestion[data]);
		io.emit("question", userquestion[data]); 
		userquestion.splice(data, 1);
		io.emit("userquestion", userquestion);
	});
	
	socket.on("timer", (data) => {
		console.log("Message reçu de timer:", data);
		io.emit("timer", data );
	});

});

server.listen(3000, () => {
	console.log("Serveur Socket.IO v2 sur http://localhost:3000");
});