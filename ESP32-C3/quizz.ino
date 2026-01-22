#include <WiFi.h>
#include <WebSocketsClient.h>

WebSocketsClient webSocket;

// ⚙️ CONFIG
const char* ssid = "Piquizz";
const char* password = "Santony85";

const char* host = "piquizz.local"; 
const uint16_t port = 3000;

#define LED_PIN 0
#define BUTTON_PIN 1
#define BUZZER_PIN 4
#define joueur 4

bool canBuzz = true;
bool waitingRelease = false;

int lastState = HIGH;
int currentState = HIGH;

void sndBuzzer(int tmri,int tmro){
  digitalWrite(BUZZER_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
  delay(tmri);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  delay(tmro);
}

void winSound() {
  sndBuzzer(150,50);
  sndBuzzer(70,120);
  sndBuzzer(250,150);
  sndBuzzer(30,60);
  sndBuzzer(150,50);
  sndBuzzer(70,120);
  sndBuzzer(250,150);
  delay(600);
  digitalWrite(LED_PIN, HIGH);
}

// ---------------------------------------------------------
//  PARSING WINNER
// ---------------------------------------------------------
void handleWinner(const String& msg) {
  int sep = msg.indexOf(':');
  if (sep < 0) return;

  int val = msg.substring(sep + 1).toInt();

  Serial.print("Winner reçu : ");
  Serial.println(val);

  if (val == joueur) {
	Serial.println("JE SUIS LE GAGNANT !");
	//digitalWrite(LED_PIN, HIGH);
	winSound();
  } else {
	digitalWrite(LED_PIN, LOW);
  }
}

// ---------------------------------------------------------
//  PARSING QUESTION
// ---------------------------------------------------------
void handleQuestion(const String& msg) {
  int sep = msg.indexOf(':');
  if (sep < 0) return;

  String json = msg.substring(sep + 1);
  Serial.print("Question reçue : ");
  Serial.println(json);
}

// ---------------------------------------------------------
//  WEBSOCKET EVENTS
// ---------------------------------------------------------
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {

	case WStype_CONNECTED:
	  Serial.println("[WS] Connecté");
	  break;

	case WStype_DISCONNECTED:
	  Serial.println("[WS] Déconnecté");
	  break;

	case WStype_TEXT: {
	  String msg = String((char*)payload).substring(0, length);
	  //Serial.print("[WS] Message reçu : ");
	  //Serial.println(msg);

	  if (msg.startsWith("WINNER:")) {
		handleWinner(msg);
	  }

	  else if (msg == "RESTART") {
		Serial.println("RESTART → attente relâchement bouton");
		waitingRelease = true;
		canBuzz = false;
		digitalWrite(LED_PIN, LOW);
	  }

	  else if (msg == "RESTART_TIMER") {
		Serial.println("RESTART_TIMER");
		canBuzz = true;
		digitalWrite(LED_PIN, LOW);
	  }

	  else if (msg.startsWith("QUESTION:")) {
		handleQuestion(msg);
	  }

	  else if (msg.startsWith("TIMER:")) {
		//Serial.println("Timer : " + msg);
	  }

	  break;
	}
  }
}

// ---------------------------------------------------------
//  SETUP
// ---------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("Connexion WiFi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
	delay(300);
	Serial.print(".");
  }

  Serial.println("\nWiFi OK, IP : " + WiFi.localIP().toString());

  webSocket.begin(host, port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(2000);
}

// ---------------------------------------------------------
//  LOOP
// ---------------------------------------------------------
void loop() {
  webSocket.loop();

  // -----------------------------------------------------
  // 1) Si on attend que le bouton soit relâché
  // -----------------------------------------------------
  if (waitingRelease) {
	if (digitalRead(BUTTON_PIN) == LOW) {
	  Serial.println("Bouton relâché → buzzer réactivé");
	  waitingRelease = false;
	  canBuzz = true;
	}
	return; // on ignore tout tant que pas relâché
  }

  // -----------------------------------------------------
  // 2) Lecture bouton
  // -----------------------------------------------------
  currentState = digitalRead(BUTTON_PIN);

  // front montant
  if (canBuzz && lastState == LOW && currentState == HIGH) {
	delay(30); // anti-rebond

	if (digitalRead(BUTTON_PIN) == HIGH) {
	  canBuzz = false;

	  String msg = "BUZZ:" + String(joueur);
	  Serial.println("Envoi : " + msg);

	  webSocket.sendTXT(msg);
	}
  }

  lastState = currentState;
}
