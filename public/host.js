/*
p5.multiplayer - HOST

This 'host' sketch is intended to be run in desktop browsers. 
It connects to a node server via socket.io, from which it receives
rerouted input data from all connected 'clients'.

Navigate to the project's 'public' directory.
Run http-server -c-1 to start server. This will default to port 8080.
Run http-server -c-1 -p80 to start server on open port 80.

*/

////////////
// Network Settings
// const serverIp      = 'https://yourservername.herokuapp.com';
// const serverIp      = 'https://yourprojectname.glitch.me';

const serverIp = '127.0.0.1';
const serverPort = '3000';
const local = true;   // true if running locally, false
// if running on remote server

// Global variables here. ---->

const velScale = 10;
const debug = true;
let game;

let player1;
let player2;

let spriteW, spriteH, spriteX, spriteY;

function preload() {
  setupHost();

  player1 = loadImage('img/wizard1.png');
  player2 = loadImage('img/wizard2.png');
  
  this.bg_img = loadImage('img/gesture_grimoire_bg.jpg');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  spriteW = 50; // Width of the sprites
  spriteH = 50; // Height of the sprites
  spriteX = [width / 4, (3 * width) / 4];
  spriteY = [height / 2, height / 2];

  game = new Game(width, height);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  image(this.bg_img, 0, 0, windowWidth, windowHeight);

  if (isHostConnected(display = true)) {
    // Host/Game draw here. --->

    // Display player IDs in top left corner
    game.printPlayerIds(5, 20);

    // Update and draw game objects
    game.draw();

    // Display server address
    displayAddress();
  }
}

function onClientConnect(data) {
  // Client connect logic here. --->
  console.log(data.id + ' has connected.');

  if (!game.players[data.id]) {
    const playerIndex = game.numPlayers;
    const x = spriteX[playerIndex % spriteX.length];
    const y = spriteY[playerIndex % spriteY.length];
    game.add(data.id, x, y, spriteW, spriteH);

  }
}

function onClientDisconnect(data) {
  // Client disconnect logic here. --->

  if (game.checkId(data.id)) {
    game.remove(data.id);
  }
}

function onReceiveData(data) {
  // Input data processing here. --->
  console.log(data);

  if (data.type === 'joystick') {
    processJoystick(data);
  }
  else if (data.type === 'button') {
    processButton(data);
  }
  else if (data.type === 'playerColor') {
    game.setColor(data.id, data.r * 255, data.g * 255, data.b * 255);
  }
  else if (data.type === 'potentialSpell') {
    processSpell(data);
  }
}

// This is included for testing purposes to demonstrate that
// messages can be sent from a host back to all connected clients
function mousePressed() {
  sendData('timestamp', { timestamp: millis() });
}

////////////
// Input processing
function processJoystick(data) {

  game.setVelocity(data.id, data.joystickX * velScale, -data.joystickY * velScale);

  if (debug) {
    console.log(data.id + ': {' +
      data.joystickX + ',' +
      data.joystickY + '}');
  }
}

function processButton(data) {
  game.players[data.id].val = data.button;
  
  game.createRipple(data.id, 300, 1000);

  if (debug) {
    console.log(data.id + ': ' +
      data.button);
  }
}



async function processSpell(data) {
  QueryFirstCon = 'pos_gauche = ' + data['Left'];
  QuerySecondCon = ' AND pos_droite = ' + data['Right'];
  QueryBuild = QueryFirstCon + QuerySecondCon;

  try {
    // Send a POST request to the server to fetch data
    const response = await fetch('http://127.0.0.1:3000/api/getFromTable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table: 'spell',
        column: '*',
        where: QueryBuild,
      }),
    });

    // Parse the JSON response
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      console.log("Spell Found!\n");
      console.log(result.data);
      game.createRipple(data.id, 300, 1000);
      console.log("roo^;l",data);

    } else {
      console.log("This spell does not exist!");
    }
  } catch (err) {
    console.error('Something went wrong chief! :', err);
  }
}

async function savePlayerData(player, id) {
  console.log(player);
  if (player) {
    const playerData = {
      id: id,
      color: `${red(player.color)},${green(player.color)},${blue(player.color)}`,
      hp: player.hp || 100, // Default HP if not set
      shield: player.shield || 50, // Default shield if not set
    };

    try {
      const response = await fetch('http://127.0.0.1:3000/api/insertPlayerData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: 'player',
          columns: 'id, color, hp, shield',
          values: `'${playerData.id}', '${playerData.color}', ${playerData.hp}, ${playerData.shield}`,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('Player data saved successfully:', playerData);
      } else {
        console.error('Failed to save player data:', result.error);
      }
    } catch (err) {
      console.error('Error saving player data:', err);
    }
  }
}