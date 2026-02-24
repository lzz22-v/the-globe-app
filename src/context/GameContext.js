import React, { createContext, useState, useEffect, useRef, useContext, useCallback } from 'react';
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
    // Estados principais
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [room, setRoom] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]); 
    const [isChatActive, setIsChatActive] = useState(false); 
    const [expoPushToken, setExpoPushToken] = useState(''); 
    const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', type: 'info' });

    const socketRef = useRef(null);
    const lastTypingStatus = useRef(false);

    // Helper: Comparação segura de IDs
    const compareIds = (id1, id2) => String(id1 || '').trim() === String(id2 || '').trim();

    useEffect(() => {
        checkLogin();
        
        const notificationSub = Notifications.addNotificationReceivedListener(() => console.log("[Push] Recebida"));
        const responseSub = Notifications.addNotificationResponseReceivedListener(() => console.log("[Push] Clicada"));

        return () => {
            notificationSub.remove();
            responseSub.remove();
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    // ==========================
    // NOTIFICAÇÕES & FEEDBACK
    // ==========================
    const registerForPushNotificationsAsync = async () => {
        if (!Device.isDevice) return null;
        
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') return null;

        try {
            const token = (await Notifications.getExpoPushTokenAsync({
                projectId: '6f65bda1-7e10-4ea7-b8de-699615ef4165' 
            })).data;

            if (Platform.OS === 'android') {
                Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#7048e8',
                });
            }
            return token;
        } catch (e) { return null; }
    };

    const triggerMessageFeedback = (msg) => {
        if (!isChatActive) {
            Vibration.vibrate([0, 80, 40, 80]); 
            Notifications.scheduleNotificationAsync({
                content: {
                    title: msg.characterName || "Nova Mensagem",
                    body: msg.text,
                    data: { senderId: msg.senderId },
                },
                trigger: null, 
            });
        }
    };

    const showAlert = (title, message, type = 'info') => setCustomAlert({ visible: true, title, message, type });
    const hideAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

    // ==========================
    // AUTH LÓGICA
    // ==========================
    const checkLogin = async () => {
        try {
            const values = await AsyncStorage.multiGet(['userToken', 'username', 'userId']);
            const [[, token], [, username], [, userId]] = values;

            if (token && username && userId) {
                const userData = { token, username, id: userId.trim() };
                setUser(userData);
                registerForPushNotificationsAsync().then(t => t && setExpoPushToken(t));
            }
        } catch (e) { console.error('[Context] Erro login:', e); } 
        finally { setIsLoading(false); }
    };

    const login = async (username, password) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Credenciais inválidas');
            
            const userId = String(data.id).trim();
            await AsyncStorage.multiSet([
                ['userToken', data.token],
                ['username', data.username],
                ['userId', userId]
            ]);
            
            setUser({ token: data.token, username: data.username, id: userId });
            const pToken = await registerForPushNotificationsAsync();
            if (pToken) setExpoPushToken(pToken);
            return true;
        } catch (error) {
            showAlert("Erro de Acesso", error.message, 'error');
            return false;
        } finally { setIsLoading(false); }
    };

    const logout = async () => {
        leaveRoom();
        setUser(null);
        setRoom(null);
        setExpoPushToken('');
        await AsyncStorage.multiRemove(['userToken', 'username', 'userId', '@room_history']);
    };

    // ==========================
    // ROOM & SOCKET LÓGICA
    // ==========================
    const leaveRoom = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.removeAllListeners(); // Limpeza crucial
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setCharacters([]); 
        setMessages([]); 
        setTypingUsers([]); 
        setSocket(null);
        setRoom(null);
    }, []);

    const connectToRoom = (roomCode) => {
        return new Promise(async (resolve, reject) => {
            if (!user?.token || !roomCode) return reject(new Error("Sessão inválida"));
            
            const code = roomCode.trim().toUpperCase();
            leaveRoom(); // Garante que não há conexão pendente

            const newSocket = io(BASE_URL, {
                auth: { token: user.token },
                transports: ['websocket'],
                reconnection: true
            });

            socketRef.current = newSocket;
            setSocket(newSocket);

            const timer = setTimeout(() => {
                if (!newSocket.connected) {
                    newSocket.disconnect();
                    reject(new Error("Servidor ocupado. Tente novamente."));
                }
            }, 8000);

            // Listeners
            newSocket.on('connect', () => {
                newSocket.emit('join_room', { roomCode: code, userId: user.id });
            });

            newSocket.on('room_joined', (data) => {
                clearTimeout(timer);
                const roomInfo = { id: data.roomId, name: data.roomName, code: data.roomCode };
                setRoom(roomInfo);
                resolve(roomInfo);
            });

            newSocket.on('update_list', (list) => setCharacters(list));

            newSocket.on('receive_message', (msg) => {
                setMessages(prev => {
                    if (prev.some(m => compareIds(m._id, msg._id))) return prev;
                    return [...prev, msg];
                });
                if (!compareIds(msg.senderId, user?.id)) triggerMessageFeedback(msg);
            });

            newSocket.on('message_deleted', (id) => {
                setMessages(prev => prev.map(m => compareIds(m._id, id) ? { ...m, text: "🚫 Mensagem apagada", deleted: true } : m));
            });

            newSocket.on('chat_history', (h) => setMessages(h));

            newSocket.on('display_typing', (data) => {
                setTypingUsers(prev => prev.some(u => compareIds(u.id, data.id)) ? prev : [...prev, data]);
            });

            newSocket.on('hide_typing', (data) => {
                setTypingUsers(prev => prev.filter(u => !compareIds(u.id, data.id)));
            });

            newSocket.on('connect_error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });
    };

    // ==========================
    // AÇÕES DE JOGO
    // ==========================
    const sendMessage = (text, replyTo = null, isEpisode = false) => {
        if (!socketRef.current || !text.trim()) return;
        const activeChar = characters.find(c => compareIds(c.owner, user.id) && c.active);
        
        socketRef.current.emit('send_message', {
            text: text.trim(),
            replyTo: replyTo ? { text: replyTo.text, senderName: replyTo.characterName || replyTo.senderName } : null,
            isEpisode
        });
    };

    const sendEpisode = (num) => num && sendMessage(num.toString(), null, true);

    const sendTypingStatus = (isTyping) => {
        if (!socketRef.current || lastTypingStatus.current === isTyping) return;
        lastTypingStatus.current = isTyping;
        
        const activeChar = characters.find(c => compareIds(c.owner, user.id) && c.active);
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
            if (data.img?.startsWith('file://') || data.img?.startsWith('content://')) {
                const base64 = await FileSystem.readAsStringAsync(data.img, { encoding: 'base64' });
                payload.img = `data:image/jpeg;base64,${base64}`;
            }
        } catch (e) {}
        socketRef.current.emit('update_character', payload);
    };

    return (
        <GameContext.Provider value={{
            user, isLoading, login, register: (u, p) => fetch(`${BASE_URL}/api/users/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p })
            }).then(r => r.ok), 
            logout, connectToRoom, leaveRoom, room, characters, messages, sendMessage, sendEpisode,
            claimCharacter, releaseCharacter, deleteCharacter, createCharacter, updateCharacter,
            typingUsers, sendTypingStatus, BASE_URL, customAlert, showAlert, hideAlert,
            isChatActive, setIsChatActive, expoPushToken 
        }}>
            {children}
        </GameContext.Provider>
    );
};