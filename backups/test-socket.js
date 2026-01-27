// test-socket.js

const io = require("socket.io-client");

// 🔑 COLE O SEU TOKEN JWT COMPLETO AQUI
const SEU_TOKEN_VALIDO = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzIxMmU5M2Q0OTZhYzdhNTBjMjBjOSIsInVzZXJuYW1lIjoibHVkd2lnX3NzX21vdW5zaWVyIiwiaWF0IjoxNzY0ODg5NzE3LCJleHAiOjE3Njc0ODE3MTd9.ZfjQoUgmEit07ahQ3O72-XGVsLJlgY8fgJmRtDcVVoo"; 

const socket = io("http://localhost:3000", {
    auth: {
        token: SEU_TOKEN_VALIDO 
    }
});

socket.on("connect", () => {
  console.log("✅ Cliente conectou ao servidor e foi autenticado!");
    
    // Tenta entrar na sala IO73LS
    socket.emit("join_room", { roomCode: "IO73LS" }); 
});

socket.on("connect_error", (err) => {
  console.log("❌ Erro de conexão (após token):", err.message);
});
// ...