// ./routes/roomRoutes.js

const express = require('express');
const router = express.Router();

// Importa o Room Model
// NOTE: Em uma estrutura modular, importaria assim: const Room = require('../models/Room');
const { Room } = require('../server'); 
// Importar o middleware de proteção, que será criado em seguida
const { protect } = require('../middleware/authMiddleware'); // Omitido por enquanto


// Função utilitária para gerar um código de 6 dígitos
const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ------------------------------------
// ROTA: POST /api/rooms/create
// (Deve ser protegida por autenticação)
// ------------------------------------
// router.post('/create', protect, async (req, res) => { // Idealmente com 'protect'
router.post('/create', async (req, res) => {
    // 🚨 ATENÇÃO: req.user.id viria do token após o middleware 'protect'
    // Como o middleware 'protect' não está implementado, estamos simulando o ownerId
    const { roomName, ownerId } = req.body; 

    if (!roomName || !ownerId) {
        return res.status(400).json({ message: 'Nome da sala e ID do proprietário são necessários.' });
    }

    try {
        let roomCode = generateRoomCode();
        let codeExists = await Room.findOne({ roomCode });

        // Garante que o código gerado seja único
        while (codeExists) {
            roomCode = generateRoomCode();
            codeExists = await Room.findOne({ roomCode });
        }

        const room = await Room.create({
            roomName,
            roomCode,
            ownerId, // O ID do usuário logado
            players: [ownerId] // Adiciona o criador como primeiro jogador
        });

        res.status(201).json({
            roomCode: room.roomCode,
            roomName: room.roomName,
            message: 'Sala criada com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao criar sala:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

module.exports = router;