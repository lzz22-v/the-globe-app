import React, { createContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const GameContext = createContext();

const PORT = '3000';
const PC_IP = '192.168.1.68'; 
const BASE_URL = Platform.OS === 'android' && !Platform.isPad && PC_IP === 'localhost' 
    ? `http://10.0.2.2:${PORT}` 
    : `http://${PC_IP}:${PORT}`;

export const GameProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [room, setRoom] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]); 
    
    const [customAlert, setCustomAlert] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info' 
    });

    const socketRef = useRef(null);

    useEffect(() => {
        checkLogin();
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const showAlert = (title, message, type = 'info') => {
        setCustomAlert({ visible: true, title, message, type });
    };

    const hideAlert = () => {
        setCustomAlert(prev => ({ ...prev, visible: false }));
    };

    const checkLogin = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const username = await AsyncStorage.getItem('username');
            const userId = await AsyncStorage.getItem('userId');

            if (token && username && userId) {
                setUser({ token, username, id: String(userId).trim() });
            }
        } catch (e) {
            console.log('[Context] Erro checkLogin:', e);
        } finally {
            setIsLoading(false);
        }
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
            if (!response.ok) throw new Error(data.message || "Erro ao registrar");
            
            showAlert("Sucesso", "Conta criada! Faça login para continuar.", 'info');
            return true;
        } catch (error) {
            showAlert("Erro no Registro", error.message, 'error');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (username, password) => {
        setIsLoading(true);
        await logout(); 

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch(`${BASE_URL}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Erro no login');

            const newUserId = String(data.id || data._id).trim();

            await AsyncStorage.setItem('userToken', data.token);
            await AsyncStorage.setItem('username', data.username);
            await AsyncStorage.setItem('userId', newUserId);

            setUser({ token: data.token, username: data.username, id: newUserId });
            return true;
        } catch (error) {
            showAlert("Erro de Login", error.message, 'error');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            await AsyncStorage.clear();
            setUser(null);
            setSocket(null);
            setRoom(null);
            setCharacters([]);
            setMessages([]);
            setTypingUsers([]);
        } catch (e) {
            console.log("[Context] Erro no logout:", e);
        }
    };

    // --- NOVA FUNÇÃO PARA SAIR DA SALA ---
    const leaveRoom = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setRoom(null);
        setCharacters([]);
        setMessages([]);
        setTypingUsers([]);
        setSocket(null);
    };

    const connectToRoom = (roomCode) => {
        if (!user?.token) return;
        if (socketRef.current) socketRef.current.disconnect();

        const newSocket = io(BASE_URL, {
            auth: { token: user.token },
            transports: ['websocket'],
            forceNew: true
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join_room', { roomCode });
        });

        newSocket.on('room_joined', (data) => {
            setRoom({ id: data.roomId, name: data.roomName, code: data.roomCode });
        });

        newSocket.on('update_list', (list) => setCharacters(list));
        newSocket.on('receive_message', (msg) => setMessages(prev => [...prev, msg]));
        newSocket.on('chat_history', (history) => setMessages(history));

        newSocket.on('message_deleted', (messageId) => {
            setMessages(prev => prev.map(m => 
                m._id === messageId ? { ...m, deleted: true, text: '' } : m
            ));
        });

        newSocket.on('messages_read', ({ lastReadMessageId }) => {
            setMessages(prev => prev.map(msg => {
                if (String(msg._id) === String(lastReadMessageId)) {
                    return { ...msg, isRead: true };
                }
                return msg;
            }));
        });

        newSocket.on('display_typing', (data) => {
            setTypingUsers(prev => {
                if (prev.find(u => String(u.id) === String(data.id))) return prev;
                return [...prev, data];
            });
        });

        newSocket.on('hide_typing', (data) => {
            setTypingUsers(prev => prev.filter(u => String(u.id) !== String(data.id)));
        });
    };

    const sendMessage = (text, replyTo = null) => {
        if (!socketRef.current || !user) return;
        const activeChar = characters.find(
            c => String(c.owner).trim() === String(user.id).trim() && c.active === true
        );
        const messageData = {
            text,
            characterName: activeChar ? activeChar.name : null,
            characterImg: activeChar ? activeChar.img : null,
            replyTo: replyTo ? {
                text: replyTo.text,
                senderName: replyTo.characterName || replyTo.senderName
            } : null
        };
        socketRef.current.emit('send_message', messageData);
    };

    const markAsRead = (messageId) => {
        if (!socketRef.current || !user || !messageId || !room?.code) return;
        socketRef.current.emit('read_messages', { 
            roomCode: room.code, 
            userId: user.id, 
            messageId: messageId 
        });
    };

    const deleteMessage = (messageId) => {
        if (!socketRef.current) return;
        socketRef.current.emit('delete_message', messageId);
    };

    const sendTypingStatus = (isTyping) => {
        if (!socketRef.current || !user) return;
        if (isTyping) {
            const activeChar = characters.find(c => String(c.owner).trim() === String(user.id).trim() && c.active);
            const displayName = activeChar ? activeChar.name : user.username;
            socketRef.current.emit('typing', { id: user.id, name: displayName });
        } else {
            socketRef.current.emit('stop_typing', { id: user.id });
        }
    };

    const claimCharacter = (charId) => {
        if (socketRef.current) socketRef.current.emit('claim_character', charId);
    };

    const releaseCharacter = (charId) => {
        if (socketRef.current) socketRef.current.emit('release_character', charId);
    };

    const deleteCharacter = (charId) => {
        if (socketRef.current) socketRef.current.emit('delete_character', charId);
    };

    const createCharacter = (charData) => {
        if (socketRef.current) socketRef.current.emit('create_character', charData);
    };

    return (
        <GameContext.Provider value={{
            user, isLoading, login, register, logout, connectToRoom, leaveRoom,
            room, characters, messages, sendMessage, deleteMessage,
            claimCharacter, releaseCharacter, deleteCharacter, createCharacter,
            typingUsers, sendTypingStatus, markAsRead, BASE_URL,
            customAlert, showAlert, hideAlert 
        }}>
            {children}
        </GameContext.Provider>
    );
};