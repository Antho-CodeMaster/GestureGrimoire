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

let playerRight;
let playerLeft;

let spriteW, spriteH, spriteX, spriteY;

function preload() {
  setupHost();

  playerRight = loadImage('img/wizard1.png');
  playerLeft = loadImage('img/wizard2.png');

  this.bg_img = loadImage('img/gesture_grimoire_bg.jpg');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  spriteW = [
    28 * windowWidth / 100 - 50,
    28 * windowWidth / 100 + 20,
  ];
  spriteH = [
    65 * windowHeight / 100 - 20,
    65 * windowHeight / 100 + 20,
  ];
  spriteX = [
    (25 * windowWidth / 100),
    windowWidth - (25 * windowWidth / 100)
  ];
  spriteY = [
    (windowHeight - (spriteH[0] / 1.5)) - (0.25 * windowHeight / 100) - 15,
    (windowHeight - (spriteH[1] / 1.5)) - (0.25 * windowHeight / 100)
  ];

  game = new Game(width, height, getGameId(), getGameRoomId());
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

  for (let id in game.players) {
    let x = (game.players[id]['position']['x']) - (game.players[id]['width'] / 4);
    let y = game.players[id]['position']['y'] - (game.players[id]['height'] / 2) - 40;
    hostHealthBar(x, y, game.players[id]['hp'], game.players[id]['shield']);
  }
}

async function hostHealthBar(posX, posY, hp, shield){
  //barre de vie
  fill(0, 255, 0);
  rect(posX,posY - 35, (spriteW[0] / 2) * hp/100, 30,8);

  //barre shield
  fill(200, 50, 50);
  rect(posX,posY, map(hp + shield, 0, 100, 0,  (spriteW[0] / 2) * shield/100), 10,8);
}

function onClientConnect(data) {
  // Client connect logic here. --->
  console.log(data.id + ' has connected.');
  getSpellList();

  if (!game.players[data.id]) {
    const playerIndex = game.numPlayers;
    // const x = spriteX[playerIndex % spriteX.length];
    // const y = spriteY[playerIndex % spriteY.length];
    if (game.numPlayers == 0)
      game.add(data.id, spriteX[0], spriteY[0], spriteW[0], spriteH[0]);
    else if (game.numPlayers == 1)
      game.add(data.id, spriteX[1], spriteY[1], spriteW[1], spriteH[1]);
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

/*&function processButton(data) {
  game.players[data.id].val = data.button;
  
  game.createRipple(data.id, 300, 1000);

  if (debug) {
    console.log(data.id + ': ' +
      data.button);
  }
}*/

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

      game.createRipple(data['id'], 800, 800)
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
      const response = await fetch('http://127.0.0.1:3000/api/insertData', {
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

function castSpell(spell, playerId) {
  const attackerId = playerId; // ID of the player casting the spell
  const targetId = getOpponentId(attackerId); // Determine the opponent's ID

  if (game.players[targetId]) {
    applyDamage(game.players[targetId], spell);

    appendGameHistory(attackerId, spell);
  }
}

function getOpponentId(attackerId) {
  const playerIds = Object.keys(game.players);
  return playerIds.find(id => id !== attackerId);
}

function applyDamage(target, spell) {
  let updatedHp = target.hp;
  let updatedShield = target.shield;

  // Calculate damage to shield and health
  if (updatedShield > 0) {
    updatedShield -= spell.attack;
    if (updatedShield < 0) {
      updatedHp += updatedShield; // Apply overflow damage to health
      updatedShield = 0;
    }
  } else {
    updatedHp -= spell.attack;
  }

  // Ensure HP doesn't drop below 0
  if (updatedHp < 0) updatedHp = 0;

  // Update local game state
  target.hp = updatedHp;
  target.shield = updatedShield;

  // Optionally handle death logic
  if (updatedHp <= 0) {
    console.log(`Player ${target.id} has been defeated!`);
    saveGame(getOpponentId(target.id), target.id);
  }

  // Log for debugging
  console.log(`Target ${target.id} updated locally. HP: ${updatedHp}, Shield: ${updatedShield}`);

  // Call to update database (non-blocking)
  updatePlayerStats(target.id, updatedHp, updatedShield);

  // Optionally send updated stats to clients /*
  sendData('updatePlayerStats', {
    id: target.id,
    hp: updatedHp,
    shield: updatedShield,
  });
}

function updatePlayerStats(playerId, hp, shield) {
  const whereCondition = `id = '${playerId}'`;

  // Execute both updates
  Promise.all([
    updateStat('player', 'hp', hp, whereCondition),
    updateStat('player', 'shield', shield, whereCondition),
  ])
    .then(() => {
      console.log(`Player ${playerId} stats successfully updated in the database.`);
    })
    .catch((err) => {
      console.error(`Failed to update player ${playerId} stats in the database: ${err}`);
    });
}

function updateStat(table, column, value, whereCondition) {
  return fetch('http://127.0.0.1:3000/api/updateTable', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      table: table,
      column: column,
      newvalue: value,
      where: whereCondition,
    }),
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  });
}

async function appendGameHistory(attackerId, spell) {
  if (game) {
    const gameHistData = {
      id_game: game.id,
      playerId: attackerId,
      spellId: spell.id,
    };
    console.log("Game history saving...\n", gameHistData);

    try {
      const response = await fetch('http://127.0.0.1:3000/api/insertData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: 'gamehistory',
          columns: 'id_game, id_player, spell',
          values: `'${gameHistData.id_game}', '${gameHistData.playerId}', ${gameHistData.spellId}`,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('Game history saved successfully:', gameHistData);
      } else {
        console.error('Failed to save game history data:', result.error);
      }
    } catch (err) {
      console.error('Error saving game history data:', err);
    }
  }
}

async function createGameSave(id, roomId) {
  const gameData = {
    id: id,
    roomId: roomId,
    score: 0,
  };
  console.log("Creating game save...\n", gameData);

  try {
    const response = await fetch('http://127.0.0.1:3000/api/insertData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table: 'game',
        columns: 'id, roomId, score',
        values: `'${gameData.id}', '${gameData.roomId}', ${gameData.score}`,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log('Game data saved successfully:', gameData);
    } else {
      console.error('Failed to create game save:', result.error);
    }
  } catch (err) {
    console.error('Error creating game save:', err);
  }
}

function saveGame(winnerId, opponentId) {
  const whereCondition = `id = '${game.id}'`;

  // Execute both updates
  Promise.all([
    updateStat('game', 'winner', `'${winnerId}'`, whereCondition),
    updateStat('game', 'opponent', `'${opponentId}'`, whereCondition),
  ])
    .then(() => {
      console.log(`Game ${game.id} stats successfully updated in the database.`);
    })
    .catch((err) => {
      console.error(`Failed to update game ${game.id} stats in the database: ${err}`);
    });
}

async function getSpellList(){
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
        where: '',
      }),
    });

    // Parse the JSON response
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      console.log("Spells Found!\n", result.data);
      sendData('spellList',{
        data: result.data,
      });
    } else {
      console.log("No spells found in database! You'll have to rely on plain old science!");
    }
  } catch (err) {
    console.error('Something went wrong chief! :', err);
  }
}
