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
// 1. CONFIGURAÇÕES & SEGURANÇA
// ==========================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jsonwebtoken_secret_key'; 
const MONGODB_URI = process.env.MONGODB_URI;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME || "dmdkwgoi", 
    api_key: process.env.CLOUDINARY_KEY || "685964722873423",       
    api_secret: process.env.CLOUDINARY_SECRET || "PDbMoEuEePM713_ZF2XMXxEZxIY"    
});

app.use(cors());
// Limite de 10mb é o equilíbrio ideal para evitar crash de RAM no servidor
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * HELPER: Upload com Compressão Inteligente
 * Reduz o peso da imagem no servidor do Cloudinary antes de gerar o link.
 */
const uploadToCloudinary = async (base64Data) => {
    try {
        if (!base64Data || typeof base64Data !== 'string') return null;
        if (base64Data.startsWith('http')) return base64Data;

        const res = await cloudinary.uploader.upload(base64Data, {
            folder: "rpg_characters",
            transformation: [
                { width: 600, height: 600, crop: "limit" }, // Redimensiona se for gigante
                { quality: "auto:low" }, // Compressão automática otimizada
                { fetch_format: "auto" } // Converte para formatos leves como WebP
            ]
        });
        return res.secure_url;
    } catch (err) {
        console.error("❌ Erro Cloudinary:", err.message);
        return null; 
    }
};

// ==========================
// 2. MODELS (Com Otimização de Busca)
// ==========================
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true }
});

const RoomSchema = new mongoose.Schema({
    roomCode: { type: String, required: true, unique: true, index: true },
    roomName: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const CharacterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    img: { type: String, default: "https://via.placeholder.com/150" },
    owner: { type: String, default: null, index: true },
    active: { type: Boolean, default: false },
    roomId: { type: String, index: true }
});

const MessageSchema = new mongoose.Schema({
    senderId: String,
    senderName: String,
    characterName: { type: String, default: null },
    characterImg: { type: String, default: null },
    text: String,
    roomId: String,
    roomCode: { type: String, index: true },
    deleted: { type: Boolean, default: false },
    isEpisode: { type: Boolean, default: false },
    replyTo: { text: String, senderName: String },
    timestamp: { type: Date, default: Date.now, index: true }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
const Character = mongoose.models.Character || mongoose.model('Character', CharacterSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

// ==========================
// 3. SOCKET.IO (Estabilidade de Longa Duração)
// ==========================
const io = new Server(server, { 
    cors: { origin: "*" },
    pingTimeout: 60000, // Dá mais tempo para uploads em internet oscilante
    maxHttpBufferSize: 1e7 // Limite de 10mb para pacotes socket
});

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.token;
        if (!token) {
            socket.userId = `GUEST_${Math.random().toString(36).substring(7)}`;
            socket.username = "Viajante";
            return next();
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = String(decoded.id); 
        socket.username = decoded.username; 
        next();
    } catch (err) { next(); }
});

const emitUpdateList = async (roomId, roomCode) => {
    try {
        const chars = await Character.find({ roomId }).select('-__v').lean();
        io.to(roomCode).emit("update_list", chars);
    } catch (e) { console.error("Emit List Error:", e); }
};

io.on("connection", (socket) => {

    socket.on("join_room", async (data) => {
        try {
            const cleanCode = data.roomCode?.toUpperCase().trim();
            if (!cleanCode) return;

            const room = await Room.findOne({ roomCode: cleanCode }).lean();
            if (!room) return;
            
            socket.join(cleanCode);
            socket.currentRoomCode = cleanCode; 
            socket.currentRoomId = room._id.toString();

            const [chars, history] = await Promise.all([
                Character.find({ roomId: socket.currentRoomId }).lean(),
                Message.find({ roomCode: cleanCode }).sort({ timestamp: -1 }).limit(40).lean()
            ]);
            
            socket.emit("room_joined", { 
                roomCode: cleanCode, 
                roomName: room.roomName, 
                userId: socket.userId,
                roomId: socket.currentRoomId 
            });
            
            socket.emit("chat_history", history.reverse());
            io.to(cleanCode).emit("update_list", chars);
        } catch (e) { console.error("Join Error:", e); }
    });

    socket.on("update_character", async ({ charId, name, img }) => {
        try {
            let updateData = { name };
            if (img && img.includes('base64')) {
                const finalImg = await uploadToCloudinary(img);
                if (finalImg) updateData.img = finalImg;
            }

            await Character.findByIdAndUpdate(charId, updateData);
            if (socket.currentRoomId) await emitUpdateList(socket.currentRoomId, socket.currentRoomCode);
        } catch (e) { console.error("Update Char Error:", e); }
    });

    socket.on("send_message", async (data) => {
        if (!socket.currentRoomCode || !data.text) return;
        try {
            const activeChar = await Character.findOne({ 
                owner: socket.userId, 
                active: true, 
                roomId: socket.currentRoomId 
            }, 'name img').lean();

            const msg = await Message.create({
                senderId: socket.userId,
                senderName: socket.username,
                characterName: activeChar?.name || null,
                characterImg: activeChar?.img || null,
                text: data.text.trim(),
                roomId: socket.currentRoomId,
                roomCode: socket.currentRoomCode,
                replyTo: data.replyTo,
                isEpisode: !!data.isEpisode 
            });
            io.to(socket.currentRoomCode).emit("receive_message", msg);
        } catch (e) { console.error("Msg Error:", e); }
    });

    socket.on("create_character", async (charData) => {
        try {
            if (!socket.currentRoomId) return;
            const uploadedImg = await uploadToCloudinary(charData.img);

            await Character.create({
                name: charData.name,
                img: uploadedImg || "https://via.placeholder.com/150",
                roomId: socket.currentRoomId,
                active: false,
                owner: null
            });
            await emitUpdateList(socket.currentRoomId, socket.currentRoomCode);
        } catch (e) { console.error("Create Char Error:", e); }
    });

    socket.on("claim_character", async (charId) => {
        try {
            await Character.updateMany(
                { owner: socket.userId, roomId: socket.currentRoomId }, 
                { active: false }
            );
            await Character.findByIdAndUpdate(charId, { owner: socket.userId, active: true });
            await emitUpdateList(socket.currentRoomId, socket.currentRoomCode);
        } catch (e) { console.error("Claim Error:", e); }
    });

    socket.on("release_character", async (charId) => {
        try {
            await Character.findByIdAndUpdate(charId, { owner: null, active: false });
            await emitUpdateList(socket.currentRoomId, socket.currentRoomCode);
        } catch (e) { console.error("Release Error:", e); }
    });

    socket.on("delete_character", async (charId) => {
        try {
            await Character.findByIdAndDelete(charId);
            await emitUpdateList(socket.currentRoomId, socket.currentRoomCode);
        } catch (e) { console.error("Delete Char Error:", e); }
    });

    socket.on("delete_message", async (messageId) => {
        try {
            const msg = await Message.findOneAndUpdate(
                { _id: messageId, senderId: socket.userId },
                { text: "🚫 Mensagem apagada", deleted: true },
                { new: true }
            );
            if (msg) io.to(socket.currentRoomCode).emit("message_deleted", messageId);
        } catch (e) { console.error("Delete Msg Error:", e); }
    });

    socket.on("typing", (data) => {
        if (socket.currentRoomCode) {
            socket.to(socket.currentRoomCode).emit("display_typing", { id: String(data.id), name: data.name });
        }
    });

    socket.on("stop_typing", (data) => {
        if (socket.currentRoomCode) {
            socket.to(socket.currentRoomCode).emit("hide_typing", { id: String(data.id) });
        }
    });

    socket.on("disconnect", () => {});
});

// ==========================
// 4. APIs REST (Registro/Login)
// ==========================
app.get('/', (req, res) => res.send("RPG Server Online 🚀 - v2.4.0"));

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
    } catch (e) { res.status(500).json({ message: "Erro ao criar sala." }); }
});

app.post('/api/users/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username: username.trim(), password: hashedPassword });
        res.status(201).json({ message: "Sucesso" });
    } catch (e) { res.status(400).json({ message: "Usuário já existe" }); }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: username.trim() });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }
        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username: user.username, id: user._id });
    } catch (e) { res.status(500).json({ message: "Erro no login" }); }
});

// ==========================
// 5. INICIALIZAÇÃO
// ==========================
async function startServer() {
    try {
        mongoose.set('strictQuery', false);
        if (!MONGODB_URI) throw new Error("MONGODB_URI não definida!");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB Atlas Conectado");

        server.listen(PORT, () => {
            console.log(`🚀 Servidor Ekaterina v2.4 rodando na porta ${PORT}`);
        });
    } catch (err) {
        console.error("❌ Erro fatal:", err.message);
        process.exit(1);
    }
}

startServer();