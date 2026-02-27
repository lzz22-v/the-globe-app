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

    const compareIds = (id1, id2) => String(id1 || '').trim() === String(id2 || '').trim();

    // ==========================
    // HELPERS DE IMAGEM
    // ==========================
    const getFullImageUrl = (img) => {
        if (!img) return "https://via.placeholder.com/150/1a1a1a/7048e8?text=RPG";
        if (img.startsWith('data:') || img.startsWith('http') || img.includes('cloudinary')) {
            return img;
        }
        const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
        const cleanImg = img.startsWith('/') ? img : `/${img}`;
        return `${cleanBase}${cleanImg}`;
    };

    const processLocalImage = async (imgUri) => {
        if (!imgUri) return null;
        if (imgUri.startsWith('data:') || imgUri.startsWith('http')) return imgUri;
        try {
            const base64 = await FileSystem.readAsStringAsync(imgUri, { encoding: 'base64' });
            return `data:image/jpeg;base64,${base64}`;
        } catch (e) {
            console.error("[Context] Erro ao processar imagem local:", e);
            return imgUri; 
        }
    };

    useEffect(() => {
        checkLogin();
        const notificationSub = Notifications.addNotificationReceivedListener(() => {});
        const responseSub = Notifications.addNotificationResponseReceivedListener(() => {});
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

    const markAsRead = useCallback(() => {
        Notifications.dismissAllNotificationsAsync();
        // Avisar o servidor que as mensagens foram lidas
        if (socketRef.current && room) {
            socketRef.current.emit('mark_as_read', { roomCode: room.code, userId: user.id });
        }
    }, [room, user]);

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
            await AsyncStorage.multiSet([['userToken', data.token], ['username', data.username], ['userId', userId]]);
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
        await AsyncStorage.multiRemove(['userToken', 'username', 'userId']);
    };

    // ==========================
    // ROOM & SOCKET LÓGICA
    // ==========================
    const leaveRoom = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
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
            leaveRoom();
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

            newSocket.on('connect', () => {
                newSocket.emit('join_room', { roomCode: code, userId: user.id });
            });

            newSocket.on('room_joined', (data) => {
                clearTimeout(timer);
                const roomInfo = { id: data.roomId, name: data.roomName, code: data.roomCode };
                setRoom(roomInfo);
                resolve(roomInfo);
            });

            newSocket.on('update_list', (list) => {
                setCharacters(list.map(char => ({
                    ...char,
                    img: getFullImageUrl(char.img)
                })));
            });

            newSocket.on('receive_message', (msg) => {
                setMessages(prev => (prev.some(m => compareIds(m._id, msg._id)) ? prev : [...prev, msg]));
                if (!compareIds(msg.senderId, user?.id)) triggerMessageFeedback(msg);
            });

            newSocket.on('message_deleted', (id) => {
                setMessages(prev => prev.map(m => compareIds(m._id, id) ? { ...m, text: "🚫 Mensagem apagada", deleted: true } : m));
            });

            // --- ADICIONADO: OUvinte de Leitura ---
            newSocket.on('messages_marked_read', ({ userId }) => {
                setMessages(prev => prev.map(m => (!compareIds(m.senderId, userId) ? { ...m, isRead: true } : m)));
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
        socketRef.current.emit('send_message', {
            text: text.trim(),
            replyTo: replyTo ? { text: replyTo.text, senderName: replyTo.characterName || replyTo.senderName } : null,
            isEpisode
        });
    };

    const deleteMessage = (messageId) => {
        if (!socketRef.current) return;
        socketRef.current.emit('delete_message', messageId);
    };

    const sendEpisode = (num) => num && sendMessage(num.toString(), null, true);

    const rollDice = (sides, bonus = 0) => {
        if (!socketRef.current) return;
        const activeChar = characters.find(c => compareIds(c.owner, user.id) && c.active);
        socketRef.current.emit('roll_dice', {
            sides: parseInt(sides),
            bonus: parseInt(bonus),
            characterName: activeChar ? activeChar.name : user.username
        });
    };

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
    
    const createCharacter = async (data) => {
        if (!socketRef.current) return;
        const tempId = `temp-${Date.now()}`;
        const optimisticChar = {
            _id: tempId,
            name: data.name,
            img: data.img,
            active: false,
            owner: null,
            isOptimistic: true 
        };
        setCharacters(prev => [...prev, optimisticChar]);
        try {
            const processedImg = await processLocalImage(data.img);
            socketRef.current.emit('create_character', {
                ...data,
                img: processedImg || "https://via.placeholder.com/150"
            });
        } catch (err) {
            console.error("Erro no createCharacter:", err);
        }
    };
    
    const updateCharacter = async (id, data) => {
        if (!socketRef.current) return;
        try {
            const processedImg = await processLocalImage(data.img);
            socketRef.current.emit('update_character', { charId: id, ...data, img: processedImg });
        } catch (err) {
            socketRef.current.emit('update_character', { charId: id, ...data });
        }
    };

    return (
        <GameContext.Provider value={{
            user, isLoading, login, register: (u, p) => fetch(`${BASE_URL}/api/users/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p })
            }).then(r => r.ok), 
            logout, connectToRoom, leaveRoom, room, characters, messages, sendMessage, sendEpisode,
            rollDice, claimCharacter, releaseCharacter, deleteCharacter, createCharacter, updateCharacter,
            typingUsers, sendTypingStatus, BASE_URL, customAlert, showAlert, hideAlert,
            isChatActive, setIsChatActive, expoPushToken, markAsRead,
            deleteMessage 
        }}>
            {children}
        </GameContext.Provider>
    );
};