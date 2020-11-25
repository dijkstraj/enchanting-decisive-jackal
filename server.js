const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static("public"));

app.get("/state/" + process.env.SECRET, (request, response) => {
  response.json(state);
});

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

const state = {};

const broadcastMessage = (room, type, message) => {
  console.log('broadcasting', room, type, message);
  Object.values(state[room])
    .map(p => p.sockets)
    .forEach(ss => ss.forEach(s => {
      console.log('emitting', room, type, message);
      s.emit(type, message);
    }));  
};

const broadcastConnect = (room, nickname) => {
  broadcastMessage(room, 'joined the fray', nickname);
};

const broadcastDisconnect = (room, nickname) => {
  broadcastMessage(room, 'left the building', nickname);
};

const broadcastMoodUpdate = (room, nickname, x, y) => {
  broadcastMessage(room, 'update the mood', {name: nickname, x, y});
};

io.on('connection', (socket) => {
  const room = socket.handshake.query.room;
  const nickname = socket.handshake.query.nickname;

  console.log('a user connected', room, nickname);
  if (!state[room]) {
    state[room] = {};
  }
  if (!state[room][nickname]) {
    state[room][nickname] = {
      x: Math.random(),
      y: Math.random(),
      sockets: new Set()
    };
    broadcastConnect(room, nickname);
  }
  broadcastMoodUpdate(room, nickname, state[room][nickname].x, state[room][nickname].y);
  state[room][nickname].sockets.add(socket);

  socket.on('disconnect', () => {
    console.log('disconnected', room, nickname);
    state[room][nickname].sockets.delete(socket);
    if (state[room][nickname].sockets.size === 0) {
      console.log('lost', room, nickname);
      delete state[room][nickname];
      broadcastDisconnect(room, nickname);  
    }
  });
  socket.on('mood update', (msg) => {
    console.log('mood update!', msg);
    state[room][nickname].x = msg.x;
    state[room][nickname].y = msg.y;
    broadcastMoodUpdate(room, nickname, state[room][nickname].x, state[room][nickname].y);
  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
