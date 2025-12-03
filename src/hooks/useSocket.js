// src/hooks/useSocket.js 

import { useState } from 'react';
import io from 'socket.io-client';
import API_URL from '../utils/api'; 

/**
 * Hook para gerenciar a instância do Socket.io.
 * A conexão é feita sob demanda, não no carregamento.
 */
export function useSocket() {
    const [socket, setSocket] = useState(null);

    const connectSocket = (token, roomCode) => {
        // Desconecta um socket existente antes de criar um novo
        if (socket) {
            socket.disconnect();
        }

        console.log(`[Socket] Conectando a sala ${roomCode} em ${API_URL}`);
        
        const newSocket = io(API_URL, {
            // Passamos o token e o código da sala via query
            query: {
                token: token,
                room: roomCode
            },
            transports: ['websocket'],
            autoConnect: true,
        });

        setSocket(newSocket);
        return newSocket;
    };
    
    const disconnectSocket = () => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }
    };

    // Retorna a instância do socket e as funções de controle
    return { socket, connectSocket, disconnectSocket };
}