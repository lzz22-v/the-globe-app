// src/context/GameContext.js (VERSÃO FINAL ALINHADA AO BACKEND)

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../hooks/useSocket'; 
import API_URL from '../utils/api'; // Não usado diretamente, mas mantido

const GameContext = createContext();
export const useGame = () => useContext(GameContext);

export function GameProvider({ children }) {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [roomCode, setRoomCode] = useState(null);
    const [playerId, setPlayerId] = useState(1); 
    const [isLoading, setIsLoading] = useState(true);

    // 🚨 NOVOS ESTADOS PARA RECEBER DADOS DO SOCKET.IO (BACKEND)
    const [characters, setCharacters] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    
    const { socket, connectSocket, disconnectSocket } = useSocket();

    // Lógica de carregamento de autenticação (mantida)
    useEffect(() => {
        async function loadAuthState() {
            try {
                const storedToken = await AsyncStorage.getItem('token');
                const storedUser = await AsyncStorage.getItem('user');
                
                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error("Erro ao carregar estado inicial:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadAuthState();
    }, []);

    // 🚨 Lógica de Conexão e Escuta dos Eventos do Jogo
    const reqJoinRoomSocket = (code) => {
        if (!token || !user) {
            console.error("Usuário não autenticado para conexão Socket.");
            return;
        }

        // 1. Desconecta o anterior e Conecta o novo Socket
        // O `useSocket` deve lidar com isso, mas garantimos uma limpeza
        disconnectSocket(); 
        const newSocket = connectSocket(token, code);
        
        // 2. Ouve eventos de conexão
        newSocket.on('connect_error', (err) => {
            console.error("Erro de Conexão Socket:", err);
            setRoomCode(null); 
        });

        // 3. Ouve a confirmação de entrada na sala (Evento do Backend)
        // O backend envia 'room_joined' logo após fazer socket.join(roomCode)
        newSocket.on('room_joined', (data) => {
            console.log(`[Socket] Entrou na sala: ${data.roomName}`);
            setRoomCode(data.roomCode); 
            // O backend ainda usa playerId numérico (1, 2, etc.), mantemos isso por enquanto
            if(data.playerId) setPlayerId(data.playerId); 
        });

        // 4. Escuta ATUALIZAÇÃO DE PERSONAGENS (emitUpdatedList no backend)
        newSocket.on('update_list', (data) => {
            console.log(`[Socket] Personagens atualizados: ${data.length}`);
            setCharacters(data);
        });

        // 5. Escuta HISTÓRICO DE CHAT (emitChatHistory no backend)
        newSocket.on('chat_history', (messages) => {
            console.log(`[Socket] Histórico de chat recebido.`);
            setChatMessages(messages);
        });

        // 6. Escuta NOVA MENSAGEM DE CHAT (send_message no backend)
        newSocket.on('receive_message', (msg) => {
            setChatMessages(prev => [...prev, msg]);
        });
        
        // 7. Ouve Erros de Sala
        newSocket.on('room_error', (msg) => {
            alert(msg);
            setRoomCode(null); // Volta para seleção
        });
        
        // Emite o evento 'join_room' que seu backend espera, passando o código e o ID do usuário
        newSocket.emit('join_room', { roomCode: code, userId: user._id });

        // Define myId para Player 1.
        setPlayerId(1); 
    };
    
    // 🚨 LIMPEZA: O useEffect que limpa os listeners quando a sala é fechada
    // Se o roomCode mudar para null (sair da sala), remove os listeners
    useEffect(() => {
        if (!roomCode && socket) {
            // Remove todos os listeners específicos do jogo para evitar bugs
            socket.off('room_joined');
            socket.off('update_list');
            socket.off('chat_history');
            socket.off('receive_message');
            socket.off('room_error');
            // Limpa os estados dos dados
            setCharacters([]);
            setChatMessages([]);
        }
    }, [roomCode, socket]);

    const value = {
        token, setToken, 
        user, setUser,   
        roomCode, setRoomCode, 
        playerId, setPlayerId,
        isLoading,
        socket, 
        reqJoinRoomSocket, 
        disconnectSocket,
        // 🚨 EXPORTA OS ESTADOS DOS DADOS
        characters,
        chatMessages
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}