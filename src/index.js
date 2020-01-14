const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage, generateLocation } = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom
} = require("./utils/user");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectioryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectioryPath));

io.on("connection", socket => {
  // A user join in.
  console.log("New websocket connection");

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });
    if (error) {
      return callback(error);
    }

    socket.join(user.room); // Only can be used in server.

    socket.emit("message", generateMessage("Ichat-App", "Welcome!"));
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Ichat-App", `${user.username} has joined!`)
      ); // like io.emit, but send message to all users except me.

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });
    callback();
    //socket.emit, io.emit, socket.broadcast.emit
    // io.to.emit, socket.broadcast.to.emit    =>    be used to send message to specific room.
  });

  socket.on("sendMessage", (message, callback) => {
    const filter = new Filter();
    const user = getUser(socket.id);

    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed!");
    }

    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  socket.on("sendLocation", (location, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocation(
        user.username,
        `https://google.com/maps?q=${location.lat},${location.long}`
      )
    );
    callback("Location shared");
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      // A user has left.
      io.to(user.room).emit(
        "message",
        generateMessage("Ichat-App", `${user.username} has left.`)
      );

      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
  });
});

server.listen(port, () => {
  console.log("Server is up on port" + port);
});
