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
// 1. CONFIGURAÇÕES (DINÂMICAS)
// ==========================
// O Render define a porta automaticamente. Em local, usa 3000.
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jsonwebtoken_secret_key'; 
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://luizvale132_db_user:R04cTRkJ4GgOYdPb@cluster0.flnqilb.mongodb.net/project0?retryWrites=true&w=majority";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME || "dmdkwgoi", 
    api_key: process.env.CLOUDINARY_KEY || "685964722873423",       
    api_secret: process.env.CLOUDINARY_SECRET || "PDbMoEuEePM713_ZF2XMXxEZxIY"    
});

// Ajuste no CORS para aceitar conexões do App
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==========================
// 2. MODELS (MANTIDOS)
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
    owner: { type: String, default: null },
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
    deleted: { type: Boolean, default: false },
    replyTo: {
        text: String,
        senderName: String
    },
    timestamp: { type: Date, default: Date.now }
}));

// ==========================
// 3. SOCKET.IO (CONFIGURAÇÃO PARA NUVEM)
// ==========================
const io = new Server(server, { 
    cors: {
        origin: "*", // Permite conexões de qualquer lugar (necessário para o APK)
        methods: ["GET", "POST"]
    },
    pingTimeout: 30000,
});

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.token;
        if (!token) {
            socket.userId = "GUEST_" + Math.random().toString(36).substring(7);
            socket.username = "Jogador Web";
            return next();
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = String(decoded.id); 
        socket.username = decoded.username; 
        next();
    } catch (err) { next(); }
});

io.on("connection", (socket) => {
    console.log(`🔌 Conectado: ${socket.username}`);

    socket.on("join_room", async (data) => {
        try {
            const cleanCode = data.roomCode ? data.roomCode.toUpperCase().trim() : null;
            if (!cleanCode) return;
            const room = await Room.findOne({ roomCode: cleanCode });
            if (!room) return;
            
            socket.join(cleanCode);
            socket.currentRoomCode = cleanCode; 
            socket.currentRoomId = room._id.toString();

            const chars = await Character.find({ roomId: socket.currentRoomId }).lean();
            const history = await Message.find({ roomCode: cleanCode })
                .sort({ timestamp: -1 }).limit(50).lean();
            
            socket.emit("room_joined", { 
                roomCode: cleanCode, 
                roomName: room.roomName, 
                userId: socket.userId,
                roomId: socket.currentRoomId 
            });
            
            socket.emit("chat_history", history.reverse());
            io.to(cleanCode).emit("update_list", chars);
        } catch (e) { console.log("Erro no Join:", e) }
    });

    socket.on("send_message", async (data) => {
        const rCode = socket.currentRoomCode;
        if (!rCode || !data.text) return;
        try {
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

    socket.on("read_messages", async ({ roomCode, messageId }) => {
        try {
            await Message.findByIdAndUpdate(messageId, { isRead: true });
            io.to(roomCode).emit("messages_read", { lastReadMessageId: messageId });
        } catch (e) { console.log("Erro read:", e); }
    });

    socket.on("delete_message", async (messageId) => {
        try {
            const msg = await Message.findById(messageId);
            if (msg && String(msg.senderId) === String(socket.userId)) {
                msg.text = "🚫 Mensagem apagada";
                msg.deleted = true;
                await msg.save();
                io.to(socket.currentRoomCode).emit("message_deleted", messageId);
            }
        } catch (e) { console.log("Erro delete msg:", e); }
    });

    socket.on("create_character", async (charData) => {
        try {
            if (!socket.currentRoomId) return;
            await Character.create({
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

    socket.on("claim_character", async (charId) => {
        try {
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

    socket.on("release_character", async (charId) => {
        try {
            await Character.findByIdAndUpdate(charId, { owner: null, active: false });
            const chars = await Character.find({ roomId: socket.currentRoomId });
            io.to(socket.currentRoomCode).emit("update_list", chars);
        } catch (e) { console.log("Erro release:", e); }
    });

    socket.on("delete_character", async (charId) => {
        try {
            await Character.findByIdAndDelete(charId);
            const chars = await Character.find({ roomId: socket.currentRoomId });
            io.to(socket.currentRoomCode).emit("update_list", chars);
        } catch (e) { console.log("Erro delete char:", e); }
    });

    socket.on("typing", (data) => {
        socket.to(socket.currentRoomCode).emit("display_typing", data);
    });

    socket.on("stop_typing", (data) => {
        socket.to(socket.currentRoomCode).emit("hide_typing", data);
    });

    socket.on("disconnect", () => console.log(`❌ Desconectado`));
});

// ==========================
// 4. APIs REST
// ==========================
app.get('/', (req, res) => res.send("RPG Server Online 🚀")); // Rota para o Render não dar erro de Health Check

app.post('/api/rooms/create', async (req, res) => {
    try {
        const { roomName, ownerId } = req.body;
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newRoom = await Room.create({ 
            roomName, 
            roomCode, 
            ownerId: mongoose.Types.ObjectId.isValid(ownerId) ? ownerId : null 
        });
        res.status(201).json(newRoom);
    } catch (e) { res.status(500).json({ message: "Erro interno." }); }
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
        const userIdStr = user._id.toString();
        const token = jwt.sign({ id: userIdStr, username: user.username }, JWT_SECRET);
        res.json({ token, username: user.username, id: userIdStr });
    } catch (e) { res.status(500).json({ message: "Erro no login" }); }
});

// ==========================
// 5. INICIALIZAÇÃO (IMPORTANTE)
// ==========================
mongoose.connect(MONGODB_URI)
.then(() => {
    console.log("✅ MongoDB Atlas Conectado");
    // Removido o IP fixo '192.168...' para funcionar na nuvem
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
})
.catch(err => console.error("Erro ao conectar no MongoDB:", err));