// ./socketHandlers.js

const { Room } = require('./server'); // Acessar o Room Model

// Variável para armazenar dados de jogo ativos em memória (para o estado atual)
const activeGameRooms = {}; 

/**
 * Inicializa a estrutura de dados global (pode ser um mock ou carregar do Redis/Mongoose)
 * @param {object} io - Instância do Socket.io Server
 */
function initializeGameData(io) {
    // Retorna uma estrutura básica, que pode ser expandida
    return activeGameRooms;
}

/**
 * Lógica para um usuário entrar em uma sala
 */
async function handleJoinRoom(socket, io, data, gameData) {
    const { roomCode, userId } = data;
    
    // 1. Verifica se a sala existe no MongoDB
    const room = await Room.findOne({ roomCode, isActive: true });
    
    if (!room) {
        return socket.emit('room_error', 'Sala não encontrada ou inativa.');
    }

    // 2. Adiciona o usuário à sala do Socket.io
    socket.join(roomCode);
    socket.roomCode = roomCode; // Armazena o código no socket para uso futuro

    // 3. Atualiza a lista de jogadores no BD (Se o usuário não estiver lá)
    if (!room.players.includes(userId)) {
        room.players.push(userId);
        await room.save();
    }

    // 4. Envia confirmação de entrada e dados iniciais
    socket.emit('room_joined', { roomCode: room.roomCode, roomName: room.roomName, playerId: room.players.length });
    
    // 5. Envia dados iniciais do jogo (Mock)
    const initialCharacters = [{ id: 1, name: "Guerreiro", health: 100 }, { id: 2, name: "Mago", health: 80 }];
    const chatHistory = [{ sender: "Sistema", message: `Bem-vindo(a) à sala ${roomCode}.`, timestamp: Date.now() }];
    
    socket.emit('update_list', initialCharacters);
    socket.emit('chat_history', chatHistory);

    // 6. Notifica outros na sala
    socket.to(roomCode).emit('playerJoined', { user: { _id: userId, username: 'Novo Jogador' } });
}

/**
 * Lógica para enviar uma mensagem de chat
 */
function handleSendMessage(socket, io, msg) {
    const { roomCode, text, sender } = msg;

    if (!roomCode) return; // Garante que está em uma sala

    const message = {
        sender: sender, 
        text: text,
        timestamp: Date.now(),
        // Você pode salvar isso no banco de dados (Ex: Message Model)
    };

    // Envia a mensagem para todos na sala (incluindo o remetente)
    io.to(roomCode).emit('receive_message', message);
}

/**
 * Lógica para desconexão do cliente
 */
function handleDisconnect(socket, io, gameData) {
    const roomCode = socket.roomCode;
    console.log(`Cliente desconectado: ${socket.id} da sala: ${roomCode}`);

    if (roomCode) {
        // Notifica outros na sala que o jogador saiu
        io.to(roomCode).emit('playerLeft', { user: { username: socket.id } });
        // Lógica adicional de limpeza de sala
    }
}


module.exports = {
    handleJoinRoom,
    handleSendMessage,
    handleDisconnect,
    initializeGameData
};