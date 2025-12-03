const io = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Cliente conectou ao servidor!");
});

socket.on("connect_error", (err) => {
  console.log("Erro de conexão:", err);
});
