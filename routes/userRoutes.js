// ./routes/userRoutes.js

const express = require('express');
const router = express.Router();

// Acessa os Models e a função generateToken exportados globalmente ou injetados
// No seu setup atual do server.js, eles estão disponíveis.
const { User } = require('../server').User; 
const { generateToken } = require('../server'); // Assume que você exportou a função ou a chave

// IMPORTANTE: Como não podemos importar diretamente do server.js, vamos assumir
// que User, generateToken, bcrypt e jwt estão disponíveis via 'require' ou 'exports'
// ou que são passados como argumentos (melhor prática).
// Para este código, vamos simular que eles estão acessíveis:
// NOTE: Em uma estrutura modular real, você importaria assim:
// const User = require('../models/User'); 
// const jwt = require('jsonwebtoken');
// const JWT_SECRET = 'SUA_CHAVE_SECRETA_MUITO_FORTE_AQUI'; // Usar process.env

const JWT_SECRET = 'jsonwebtoken';
const generateToken = (id, username) => {
    return require('jsonwebtoken').sign({ id, username }, JWT_SECRET, { expiresIn: '30d' });
};


// ------------------------------------
// ROTA: POST /api/users/register
// ------------------------------------
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Nome de usuário já existe.' });
        }

        const user = await User.create({ username, password });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            token: generateToken(user._id, user.username),
            message: 'Usuário registrado com sucesso!'
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ------------------------------------
// ROTA: POST /api/users/login
// ------------------------------------
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (user && (await user.matchPassword(password))) {
            
            res.json({
                _id: user._id,
                username: user.username,
                token: generateToken(user._id, user.username),
                message: 'Login realizado com sucesso!'
            });

        } else {
            res.status(401).json({ message: 'Credenciais inválidas.' });
        }

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

module.exports = router;