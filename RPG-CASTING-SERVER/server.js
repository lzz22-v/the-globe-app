const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const cloudinary = require('cloudinary').v2; 

const app = express();
const server = http.createServer(app);

// ==========================
// 1. CONFIGURAÇÕES
// ==========================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'jsonwebtoken_secret_key'; 
const MONGODB_URI = "mongodb+srv://luizvale132_db_user:R04cTRkJ4GgOYdPb@cluster0.flnqilb.mongodb.net/project0?retryWrites=true&w=majority";

cloudinary.config({
    cloud_name: "dmdkwgoi", 
    api_key: "685964722873423",       
    api_secret: "PDbMoEuEePM713_ZF2XMXxEZxIY"    
});

// Ajuste no CORS para ser mais permissivo
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de log
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ==========================
// 2. MODELS
// ==========================
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

const Room = mongoose.models.Room || mongoose.model('Room', new mongoose.Schema({
    roomCode: { type: String, required: true, unique: true },
    roomName: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}));

const Character = mongoose.models.Character || mongoose.model('Character', new mongoose.Schema({
    name: String,
    img: String,
    owner: { type: String, default: null }, // Guardará o ID como String
    active: { type: Boolean, default: false },
    roomId: { type: String }
}));

const Message = mongoose.models.Message || mongoose.model('Message', new mongoose.Schema({
    senderId: String,
    senderName: String,
    characterName: { type: String, default: null },
    characterImg: { type: String, default: null },
    text: String,
    roomId: String,
    roomCode: String,
    isRead: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false }, // Campo novo para suportar soft delete
    replyTo: {
        text: String,
        senderName: String
    },
    timestamp: { type: Date, default: Date.now }
}));

// ==========================
// 3. SOCKET.IO
// ==========================
const io = new Server(server, { 
    cors: { origin: "*" },
    pingTimeout: 30000,
});

// Middleware de Autenticação do Socket
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.token;
        if (!token) {
            // Guest logic (se necessário no futuro)
            socket.userId = "GUEST_" + Math.random().toString(36).substring(7);
            socket.username = "Jogador Web";
            return next();
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // --- CORREÇÃO IMPORTANTE: ID SEMPRE STRING ---
        socket.userId = String(decoded.id); 
        socket.username = decoded.username; 
        
        next();
    } catch (err) { next(); }
});

io.on("connection", (socket) => {
    console.log(`🔌 Socket Conectado: ${socket.username} (ID: ${socket.userId})`);

    // --- ENTRAR NA SALA ---
    socket.on("join_room", async (data) => {
        try {
            const cleanCode = data.roomCode ? data.roomCode.toUpperCase().trim() : null;
            if (!cleanCode) return;

            const room = await Room.findOne({ roomCode: cleanCode });
            if (!room) return;
            
            socket.join(cleanCode);
            socket.currentRoomCode = cleanCode; 
            socket.currentRoomId = room._id.toString();

            // Envia histórico e lista de personagens
            const chars = await Character.find({ roomId: socket.currentRoomId }).lean();
            const history = await Message.find({ roomCode: cleanCode })
                .sort({ timestamp: -1 }).limit(50).lean();
            
            socket.emit("room_joined", { 
                roomCode: cleanCode, 
                roomName: room.roomName, 
                userId: socket.userId,
                roomId: socket.currentRoomId 
            });
            
            // Inverte histórico para mostrar do antigo pro novo
            socket.emit("chat_history", history.reverse());
            io.to(cleanCode).emit("update_list", chars);
        } catch (e) { console.log("Erro no Join:", e) }
    });

    // --- ENVIAR MENSAGEM ---
    socket.on("send_message", async (data) => {
        const rCode = socket.currentRoomCode;
        if (!rCode || !data.text) return;
        try {
            // Busca se o usuário está usando um personagem ativo
            const activeChar = await Character.findOne({ 
                owner: socket.userId, 
                active: true, 
                roomId: socket.currentRoomId 
            });

            const msg = await Message.create({
                senderId: socket.userId,
                senderName: socket.username,
                characterName: activeChar ? activeChar.name : null,
                characterImg: activeChar ? activeChar.img : null,
                text: data.text.trim(),
                roomId: socket.currentRoomId,
                roomCode: rCode,
                replyTo: data.replyTo,
                isRead: false
            });
            
            io.to(rCode).emit("receive_message", msg);
        } catch (e) { console.log("Erro msg:", e) }
    });

    // --- LER MENSAGENS (Check duplo) ---
    socket.on("read_messages", async ({ roomCode, messageId }) => {
        try {
            // Marca como lida
            await Message.findByIdAndUpdate(messageId, { isRead: true });
            
            // Avisa a todos na sala que essa mensagem foi lida
            io.to(roomCode).emit("messages_read", { lastReadMessageId: messageId });
        } catch (e) { console.log("Erro read:", e); }
    });

    // --- DELETAR MENSAGEM ---
    socket.on("delete_message", async (messageId) => {
        try {
            const msg = await Message.findById(messageId);
            if (!msg) return;

            // Segurança: Só o dono pode apagar
            if (String(msg.senderId) === String(socket.userId)) {
                msg.text = "🚫 Mensagem apagada";
                msg.deleted = true;
                await msg.save();

                io.to(socket.currentRoomCode).emit("message_deleted", messageId);
            }
        } catch (e) { console.log("Erro delete msg:", e); }
    });

    // --- CRIAR PERSONAGEM ---
    socket.on("create_character", async (charData) => {
        try {
            if (!socket.currentRoomId) return;

            const newChar = await Character.create({
                name: charData.name,
                img: charData.img,
                roomId: socket.currentRoomId,
                active: false,
                owner: null
            });

            const chars = await Character.find({ roomId: socket.currentRoomId });
            io.to(socket.currentRoomCode).emit("update_list", chars);
        } catch (e) { console.log("Erro create char:", e); }
    });

    // --- ASSUMIR PERSONAGEM (CLAIM) ---
    socket.on("claim_character", async (charId) => {
        try {
            // Solta outros personagens desse usuário nessa sala antes
            await Character.updateMany(
                { owner: socket.userId, roomId: socket.currentRoomId }, 
                { active: false }
            );

            await Character.findByIdAndUpdate(charId, {
                owner: socket.userId,
                active: true
            });

            const chars = await Character.find({ roomId: socket.currentRoomId });
            io.to(socket.currentRoomCode).emit("update_list", chars);
        } catch (e) { console.log("Erro claim:", e); }
    });

    // --- SOLTAR PERSONAGEM (RELEASE) ---
    socket.on("release_character", async (charId) => {
        try {
            await Character.findByIdAndUpdate(charId, {
                owner: null,
                active: false
            });

            const chars = await Character.find({ roomId: socket.currentRoomId });
            io.to(socket.currentRoomCode).emit("update_list", chars);
        } catch (e) { console.log("Erro release:", e); }
    });

    // --- DELETAR PERSONAGEM ---
    socket.on("delete_character", async (charId) => {
        try {
            await Character.findByIdAndDelete(charId);
            const chars = await Character.find({ roomId: socket.currentRoomId });
            io.to(socket.currentRoomCode).emit("update_list", chars);
        } catch (e) { console.log("Erro delete char:", e); }
    });

    // --- DIGITANDO... ---
    socket.on("typing", (data) => {
        socket.to(socket.currentRoomCode).emit("display_typing", data);
    });

    socket.on("stop_typing", (data) => {
        socket.to(socket.currentRoomCode).emit("hide_typing", data);
    });

    socket.on("disconnect", () => console.log(`❌ Socket Desconectado: ${socket.username}`));
});

// ==========================
// 4. APIs REST
// ==========================

app.get('/api/test', (req, res) => {
    res.json({ status: "ok", message: "Servidor OK" });
});

app.post('/api/rooms/create', async (req, res) => {
    try {
        const { roomName, ownerId } = req.body;
        if (!roomName) return res.status(400).json({ message: "Nome da sala obrigatório." });

        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const newRoom = await Room.create({ 
            roomName, 
            roomCode, 
            ownerId: mongoose.Types.ObjectId.isValid(ownerId) ? ownerId : null 
        });
        
        res.status(201).json(newRoom);
    } catch (e) {
        console.error("Erro criar sala:", e);
        res.status(500).json({ message: "Erro interno." });
    }
});

app.post('/api/users/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashedPassword });
        res.status(201).json({ message: "Sucesso" });
    } catch (e) { res.status(400).json({ message: "Usuário já existe" }); }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }
        
        // --- CORREÇÃO: Enviar ID como String explícita ---
        const userIdStr = user._id.toString();
        
        const token = jwt.sign({ id: userIdStr, username: user.username }, JWT_SECRET);
        
        res.json({ 
            token, 
            username: user.username, 
            id: userIdStr // Evita envio de Objeto ObjectId
        });
    } catch (e) { res.status(500).json({ message: "Erro no login" }); }
});

// ==========================
// 5. INICIALIZAÇÃO
// ==========================
mongoose.connect(MONGODB_URI)
.then(() => {
    console.log("✅ Conectado ao MongoDB Atlas");
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor rodando em: http://192.168.1.68:${PORT}`);
    });
})
.catch(err => console.error(err));