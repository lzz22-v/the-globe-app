import { useState, useCallback, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import API_URL from '../utils/api'; 

export function useSocket() {
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);

    const connectSocket = useCallback((token) => {
        if (!token) {
            console.log("[Socket] ⚠️ Tentativa de conectar sem token.");
            return;
        }

        // Se já existe uma instância, apenas reconectamos ou atualizamos o token
        if (socketRef.current) {
            console.log("[Socket] 🔄 Verificando conexão existente...");
            socketRef.current.auth = { token };
            if (!socketRef.current.connected) {
                socketRef.current.connect();
            }
            return socketRef.current;
        }

        console.log("[Socket] 🆕 Iniciando conexão em:", API_URL);

        // CONFIGURAÇÃO ATUALIZADA:
        // 1. Adicionado 'polling' antes de 'websocket' para garantir compatibilidade Android/Rede.
        // 2. Aumentado o timeout para evitar quedas prematuras em redes Wi-Fi.
        const newSocket = io(API_URL, {
            auth: { token },
            transports: ['polling', 'websocket'], 
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity, // Tenta reconectar sempre se o server cair
            reconnectionDelay: 2000,
            timeout: 20000, 
        });

        newSocket.on('connect', () => {
            console.log(`[Socket] 🟢 CONECTADO! ID: ${newSocket.id}`);
            setSocket(newSocket);
        });

        newSocket.on('connect_error', (err) => {
            // Se o erro for de transporte, ele tentará automaticamente o próximo da lista
            console.error(`[Socket] ❌ ERRO DE CONEXÃO: ${err.message}`);
        });

        newSocket.on('disconnect', (reason) => {
            console.log(`[Socket] 🔴 DESCONECTADO: ${reason}`);
            // Se foi o servidor que cortou, o Socket.io tentará reconectar sozinho
        });

        socketRef.current = newSocket;
        setSocket(newSocket);
        return newSocket;
    }, []); 
    
    const disconnectSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return { socket, connectSocket, disconnectSocket };
}