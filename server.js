// Create dictionaries for tracking hosts, clients, and rooms
let hosts = {};
let clients = {};
let rooms = {};

////////////
// Setup express web server and listen on port 3000
let express = require('express');
let app = express();
let port = Number(process.env.PORT || 3000);
let server = app.listen(port);
let mysql = require('mysql');
var db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "gesture_grimoire"
});

app.use(express.json());

const cors = require('cors');
app.use(cors());

// database mysql
async function setupDB() {
  db.connect(function (err) {
    if (err) throw err;
    console.log("Connected to mysql!");
  });

  /* EXEMPLE -select-
  const resultGet = await getFromTable("spell", "name, target_is_self");  //variables : (table, column, where) (si tu ne mets pas de colonnes, tu les selectes toutes)
  console.log("///", resultGet);
  const resultGetAll = await getFromTable("spell");  //variables : (table, column, where) (si tu ne mets pas de colonnes, tu les selectes toutes)
  console.log("///", resultGetAll);
  const resultGetOne = await getFromTable("spell", '*', 'id = 1');  //variables : (table, column, where) (tu DOIS mettre une colonne, quitte à mettre '*', sinon le where ne fonctionnera pas.)
  console.log("///", resultGetOne);*/

  /* EXEMPLE -insert-
  const resultInsert = await insertIntoTable("player", "color, hp, shield", "'pink', '88', '43'");  //variables : (table, columns, values)
  console.log("///", resultInsert);*/

  /* EXEMPLE -update- 
  const resultUpdate = await updateTable("player", "color", "'blue'", "hp = 88"); //variables : (table, column, newvalue, where)
  console.log("///", resultUpdate);*/

}

function getFromTable(table, column = '*', where = '') {
  if(where != '') {where = ' WHERE ' + where}
  var req = "SELECT " + column + " FROM " + table + where;

  return new Promise((resolve, reject) => {
    db.query(req, (err, result) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(result);
      }
    });
  });
}

// Create an API endpoint for getFromTable
app.post('/api/getFromTable', async (req, res) => {
  const { table, column, where } = req.body;

  try {
    const result = await getFromTable(table, column, where);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

app.post('/api/insertData', async (req, res) => {
  const { table, columns, values } = req.body;

  try {
    const result = await insertIntoTable(table, columns, values);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to insert data.' });
  }
});

function insertIntoTable(table, columns, values) {
  var req = "INSERT INTO " + table + "(" + columns + ") VALUES (" + values + ")";

  return new Promise((resolve, reject) => {
    db.query(req, (err, result) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(result);
      }
    });
  });
}

app.post('/api/updateTable', async (req, res) => {
  const { table, column, newvalue, where } = req.body;

  try {
      const result = await updateTable(table, column, newvalue, where);
      res.json({ success: true, result });
  } catch (err) {
      console.error(`Error updating table: ${err}`);
      res.status(500).json({ success: false, error: err.message });
  }
});

function updateTable(table, column, newvalue, where) {
  var req = "UPDATE " + table + " SET " + column + " = " + newvalue + " WHERE " + where;

  return new Promise((resolve, reject) => {
    db.query(req, (err, result) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(result);
      }
    });
  });
}


app.use(express.static('public'));
console.log("My socket server is running on port " + port);

////////////
// Start socket.io
let socket = require('socket.io');

// Connect it to the web server
let io = socket(server);
setupDB();  // connect to db

////////////
// Setup a connection
io.sockets.on('connection', newConnection);
function newConnection(socket) {

  // Inform incoming connection of its ID
  console.log('\n' + socket.id + ' is attempting connection...');
  socket.emit('id', socket.id);

  // Process a request to join.
  socket.on('join', function (data) {

    // If request is from a client...
    if (data.name == 'client') {

      console.log("Verifying client...");

      // If the roomId field is not null
      if (data.roomId != null) {

        // Search existing roomIds for a match
        console.log("Searching for existing room ID...");
        if (rooms[data.roomId] != null) {

          // Add client to room with all connected clients 
          socket.join(data.name);

          // Add client and corresponding data to clients dictionary 
          // by socket ID
          clients[socket.id] = {
            type: data.name,
            roomId: data.roomId
          }

          // Add client to its own room and to host room by room ID
          socket.join([socket.id, data.roomId]);
          console.log('Client added to room ' + data.roomId + '.\tNumber of clients: ' + Object.keys(clients).length);

          // Send match confirmation back to client
          socket.emit("found", { status: true });
        }
        else {
          // Notify client of failure to match
          socket.emit("found", { status: false });
        }
      }
    }
    else if (data.name == 'host') {
      // If the attempted connection is from a host...

      // Store a transmitted room ID if it exists, otherwise
      // generate a random gemstone name as room ID.
      let roomId = null;
      if (data.roomId === null || data.roomId === 'undefined') {
        roomId = makeIdFromList();
      }
      else {
        roomId = data.roomId;
      }

      // Add client and corresponding data to devices dictionary 
      // by socket ID
      let hostData = {
        type: data.name,
        roomId: roomId
      };

      hosts[socket.id] = hostData;
      rooms[roomId] = socket.id;

      // Add host to "host" room, its own room by room ID, and to a room 
      // with its clients by room ID.
      socket.join([data.name, 'host:' + hostData.roomId, hostData.roomId]);

      // Send clients room ID back to host
      socket.emit("hostConnect", hostData);

      console.log('Host added with room ID of ' + hostData.roomId + '.\tNumber of hosts: ' + Object.keys(hosts).length);
    }
    else {
      console.log('warning: data type not recognized.')
    }
  })

  //// Process device disconnects.
  socket.on('disconnect', function () {
    console.log('\n' + socket.id + ' has been disconnected!');

    if (clients[socket.id] != null) {
      // If the device is a client, delete it
      delete clients[socket.id];
      console.log('Client removed.\tNumber of clients: ' + Object.keys(clients).length);

      // Notify hosts that client has disconnected.
      socket.in('host').emit('clientDisconnect', { id: socket.id });
    }
    else if (hosts[socket.id] != null) {
      // If the device is a host, delete it
      let roomId = hosts[socket.id].roomId;
      delete hosts[socket.id];
      console.log('Host with ID ' + roomId + ' removed.\tHumber of hosts: ' + Object.keys(hosts).length);

      // Remove corresponding room
      let key = getKeyByValue(rooms, socket.id);
      if (key != null) {
        delete rooms[key];
      }

      // TODO: add handling for all clients connected to host when host
      // is disconnected.
    }
  })

  //// Process client connects.
  socket.on('clientConnect', onClientConnect);

  function onClientConnect(data) {
    if (rooms[data.roomId] != null) {
      console.log('clientConnect message received from ' + socket.id + ' for room ' + data.roomId + ".");
      socket.in('host:' + data.roomId).emit('clientConnect', { id: socket.id, roomId: data.roomId });
    }
  }

  //// Reroute data sent between clients and hosts
  socket.on('sendData', sendData);

  function sendData(data) {
    let packet = { ...data };
    packet.id = socket.id;

    // If room ID is valid...
    if (rooms[data.roomId] != null) {
      if (clients[socket.id] != null) {
        // And if device is a client, send to corresponding host
        socket.in('host:' + data.roomId).emit('receiveData', packet);
      }
      else if (hosts[socket.id] != null) {
        // And if device is a host, send to corresponding clients
        socket.broadcast.in(data.roomId).emit('receiveData', packet);
      }
    }
  }
}

////////////
// Utility Functions
function searchRoomId(roomId_, array_) {
  for (let i = 0; i < array_.length; i++) {
    if (array_[i].roomId == roomId_) {
      return {
        item: array_[i],
        index: i
      };
    }
  }
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

////////////
// Gemstone room ID generator
const roomNames =
  ["agate",
    "amber",
    "amethyst",
    "barite",
    "beryl",
    "bloodstone",
    "coral",
    "crystal",
    "diamond",
    "emerald",
    "fluorite",
    "garnet",
    "goldstone",
    "jade",
    "jasper",
    "moonstone",
    "onyx",
    "opal",
    "pearl",
    "peridot",
    "quahog",
    "quartz",
    "ruby",
    "sapphire",
    "sardonyx",
    "sunstone",
    "tigereye",
    "topaz",
    "turquoise",
    "zircon"]

const roomIds = randomNoRepeats(roomNames);

function randomNoRepeats(array) {
  let copy = array.slice(0);
  return function () {
    if (copy.length < 1) { copy = array.slice(0); }
    let index = Math.floor(Math.random() * copy.length);
    let item = copy[index];
    copy.splice(index, 1);
    return { id: item, length: copy.length };
  };
}

function makeIdFromList() {
  for (let i = 0; i < roomNames.length; i++) {
    let text = roomIds().id;
    let room = searchRoomId(text, hosts);
    if (room == null) {
      return text;
    }
  }
  console.log(hosts.length + " hosts detected. No names available.");
  return null;
}