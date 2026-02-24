import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration, Platform } from 'react-native'; 
import * as Notifications from 'expo-notifications'; 
import * as Device from 'expo-device'; 
import * as FileSystem from 'expo-file-system/legacy'; 
import API_URL from '../utils/api.js'; 

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const GameContext = createContext();
export const useGame = () => useContext(GameContext);
const BASE_URL = API_URL; 

export const GameProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [room, setRoom] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]); 
    const [isChatActive, setIsChatActive] = useState(false); 
    const [expoPushToken, setExpoPushToken] = useState(''); 
    
    const [customAlert, setCustomAlert] = useState({
        visible: false, title: '', message: '', type: 'info' 
    });

    const socketRef = useRef(null);

    useEffect(() => {
        checkLogin();
        const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
            console.log("[Push] Notificação recebida");
        });
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            console.log("[Push] Usuário clicou na notificação");
        });

        return () => {
            if (notificationSubscription) notificationSubscription.remove();
            if (responseSubscription) responseSubscription.remove();
        };
    }, []);

    const registerForPushNotificationsAsync = async () => {
        let token;
        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') return;
            try {
                token = (await Notifications.getExpoPushTokenAsync({
                    projectId: '6f65bda1-7e10-4ea7-b8de-699615ef4165' 
                })).data;
            } catch (error) {
                console.log("[Push] Erro token:", error);
            }
        }
        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#7048e8',
            });
        }
        return token;
    };

    const triggerMessageFeedback = (msg) => {
        if (!isChatActive) {
            Vibration.vibrate([0, 100, 50, 100]); 
            if (msg) {
                Notifications.scheduleNotificationAsync({
                    content: {
                        title: msg.characterName || "Nova Mensagem",
                        body: msg.text,
                        data: { senderId: msg.senderId },
                    },
                    trigger: null, 
                });
            }
        }
    };

    const showAlert = (title, message, type = 'info') => setCustomAlert({ visible: true, title, message, type });
    const hideAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

    const checkLogin = async () => {
        try {
            const [token, username, userId] = await Promise.all([
                AsyncStorage.getItem('userToken'),
                AsyncStorage.getItem('username'),
                AsyncStorage.getItem('userId')
            ]);
            if (token && username && userId) {
                const userData = { token, username, id: String(userId).trim() };
                setUser(userData);
                registerForPushNotificationsAsync().then(t => {
                    if (t) setExpoPushToken(t);
                });
            }
        } catch (e) { console.log('[Context] Erro login:', e); } finally { setIsLoading(false); }
    };

    const login = async (username, password) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Credenciais inválidas');
            
            const rawId = data.user?.id || data.user?._id || data.id || data._id;
            const newUserId = String(rawId).trim();
            const token = data.token;
            const finalUsername = data.username || data.user?.username;

            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('username', finalUsername);
            await AsyncStorage.setItem('userId', newUserId);
            
            setUser({ token, username: finalUsername, id: newUserId });
            const pToken = await registerForPushNotificationsAsync();
            if (pToken) setExpoPushToken(pToken);
            return true;
        } catch (error) {
            showAlert("Erro de Acesso", error.message, 'error');
            return false;
        } finally { setIsLoading(false); }
    };

    const register = async (username, password) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro no registro");
            return true;
        } catch (error) {
            showAlert("Erro", error.message, 'error');
            return false;
        } finally { setIsLoading(false); }
    };

    const logout = async () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setUser(null);
        setRoom(null);
        setExpoPushToken('');
        await AsyncStorage.multiRemove(['userToken', 'username', 'userId', '@room_history']);
    };

    const saveRoomToHistory = async (roomData) => {
        try {
            const existingHistory = await AsyncStorage.getItem('@room_history');
            let history = existingHistory ? JSON.parse(existingHistory) : [];
            const rCode = roomData.roomCode || roomData.code;
            const rName = roomData.roomName || roomData.name;
            history = history.filter(item => item.code !== rCode);
            history.unshift({ name: rName, code: rCode });
            if (history.length > 5) history.pop();
            await AsyncStorage.setItem('@room_history', JSON.stringify(history));
        } catch (e) { console.log("Erro histórico:", e); }
    };

    const leaveRoom = () => {
        if (socketRef.current) {
            socketRef.current.emit('leave_room', { roomCode: room?.code || room?.roomCode });
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setCharacters([]); 
        setMessages([]); 
        setTypingUsers([]); 
        setSocket(null);
    };

    const connectToRoom = (roomCode) => {
        return new Promise(async (resolve, reject) => {
            if (!user?.token || !user?.id || !roomCode) return reject(new Error("Sessão incompleta."));
            const code = roomCode.trim().toUpperCase();
            if (socketRef.current) socketRef.current.disconnect();

            let tokenParaEnviar = expoPushToken || await registerForPushNotificationsAsync();
            if (tokenParaEnviar) setExpoPushToken(tokenParaEnviar);

            const newSocket = io(BASE_URL, {
                auth: { token: user.token },
                transports: ['websocket'],
                reconnection: true
            });

            socketRef.current = newSocket;
            setSocket(newSocket);

            const connectionTimeout = setTimeout(() => {
                if (!newSocket.connected) {
                    newSocket.disconnect();
                    reject(new Error("Tempo de conexão esgotado."));
                }
            }, 10000);

            newSocket.on('connect', () => { 
                newSocket.emit('join_room', { roomCode: code, userId: user.id, pushToken: tokenParaEnviar }); 
            });
            
            newSocket.on('room_joined', (data) => {
                clearTimeout(connectionTimeout);
                const roomInfo = { id: data.roomId, name: data.roomName, code: data.roomCode };
                setRoom(roomInfo);
                saveRoomToHistory(data);
                resolve(roomInfo);
            });

            newSocket.on('update_list', (list) => setCharacters(list));

            newSocket.on('receive_message', (msg) => {
                setMessages(prev => {
                    if (prev.find(m => String(m._id) === String(msg._id))) return prev;
                    return [...prev, msg];
                });
                if (String(msg.senderId).trim() !== String(user?.id).trim()) triggerMessageFeedback(msg);
            });

            newSocket.on('message_deleted', (messageId) => {
                setMessages(prev => prev.map(m => 
                    String(m._id) === String(messageId) 
                    ? { ...m, text: "🚫 Mensagem apagada", deleted: true } 
                    : m
                ));
            });

            newSocket.on('chat_history', (history) => setMessages(history));

            newSocket.on('display_typing', (data) => {
                setTypingUsers(prev => {
                    if (prev.find(u => String(u.id) === String(data.id))) return prev;
                    return [...prev, data];
                });
            });

            newSocket.on('hide_typing', (data) => {
                setTypingUsers(prev => prev.filter(u => String(u.id) !== String(data.id)));
            });

            newSocket.on('error', (err) => { 
                clearTimeout(connectionTimeout);
                showAlert("Erro", err.message || "Erro desconhecido", 'error'); 
                reject(err); 
            });
        });
    };

    // ALTERADO: Adicionado suporte para isEpisode
    const sendMessage = (text, replyTo = null, isEpisode = false) => {
        if (!socketRef.current || !user?.id) return;
        const activeChar = characters.find(c => String(c.owner).trim() === String(user.id).trim() && c.active);
        
        socketRef.current.emit('send_message', {
            text: text.trim(),
            characterName: activeChar ? activeChar.name : null,
            characterImg: activeChar ? activeChar.img : null,
            replyTo: replyTo ? { text: replyTo.text, senderName: replyTo.characterName || replyTo.senderName } : null,
            isEpisode: isEpisode // Envia a flag para o servidor
        });
    };

    // NOVO: Função auxiliar para enviar apenas o número do episódio
    const sendEpisode = (episodeNumber) => {
        if (!episodeNumber) return;
        sendMessage(episodeNumber.toString(), null, true);
    };

    const markAsRead = (messageId) => {
        const roomCode = room?.code || room?.roomCode;
        if (socketRef.current && user?.id && messageId && roomCode) {
            socketRef.current.emit('read_messages', { roomCode, userId: user.id, messageId });
        }
    };

    const deleteMessage = (id) => { 
        if (socketRef.current) socketRef.current.emit('delete_message', id); 
    };
    
    const sendTypingStatus = (isTyping) => {
        if (!socketRef.current || !user?.id || !room?.code) return;
        const activeChar = characters.find(c => String(c.owner).trim() === String(user.id).trim() && c.active);

        socketRef.current.emit(isTyping ? 'typing' : 'stop_typing', { 
            id: user.id,
            name: activeChar ? activeChar.name : user.username
        });
    };

    const claimCharacter = (id) => socketRef.current?.emit('claim_character', id);
    const releaseCharacter = (id) => socketRef.current?.emit('release_character', id);
    const deleteCharacter = (id) => socketRef.current?.emit('delete_character', id);
    const createCharacter = (data) => socketRef.current?.emit('create_character', data);
    
    const updateCharacter = async (id, data) => {
        if (!socketRef.current) return;
        let payload = { charId: id, ...data };
        try {
            const isLocalFile = data.img && (data.img.startsWith('file://') || data.img.startsWith('content://'));
            if (isLocalFile) {
                const base64 = await FileSystem.readAsStringAsync(data.img, { encoding: 'base64' });
                payload.img = `data:image/jpeg;base64,${base64}`;
            }
            socketRef.current.emit('update_character', payload);
        } catch (error) {
            socketRef.current.emit('update_character', payload);
        }
    };

    return (
        <GameContext.Provider value={{
            user, isLoading, login, register, logout, connectToRoom, 
            leaveRoom, room, characters, messages, sendMessage, sendEpisode, deleteMessage,
            claimCharacter, releaseCharacter, deleteCharacter, createCharacter,
            updateCharacter, typingUsers, sendTypingStatus, markAsRead, BASE_URL,
            customAlert, showAlert, hideAlert, isChatActive, setIsChatActive,
            expoPushToken 
        }}>
            {children}
        </GameContext.Provider>
    );
};