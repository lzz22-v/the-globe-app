// src/screens/RoomSelectScreen.js

import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    ActivityIndicator, 
    ScrollView 
} from 'react-native';
import { useGame } from '../context/GameContext'; 
import API_URL from '../utils/api'; 

export default function RoomSelectScreen() {
    // Funções e estados do contexto
    const { 
        user, // 🚨 ESSENCIAL: Contém o user._id que precisamos enviar
        token, 
        reqJoinRoomSocket, 
        setPlayerId, 
        disconnectSocket 
    } = useGame(); 

    // Estados locais para a lógica da sala
    const [joinCode, setJoinCode] = useState('');
    const [roomError, setRoomError] = useState('');
    const [loading, setLoading] = useState(false);

    const [newRoomName, setNewRoomName] = useState('');
    const [creationSuccess, setCreationSuccess] = useState('');
    const [creationError, setCreationError] = useState('');

    // --- Lógica de Criação de Sala (REST API) ---
    const reqCreateRoom = async () => {
        if (!token) return;
        setCreationError('');
        setCreationSuccess('');
        
        const roomName = newRoomName.trim();
        if (!roomName) return setCreationError('Dê um nome para a sala.');

        setLoading(true);
        try {
            // 🚨 CORREÇÃO 1: Adicionado o prefixo '/api' para bater com o backend
            const response = await fetch(`${API_URL}/api/rooms/create`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                // 🚨 CORREÇÃO 2: Adicionado ownerId (user._id) no body, conforme seu backend
                body: JSON.stringify({ 
                    roomName, 
                    ownerId: user._id // O backend espera isso
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao criar sala.');
            }

            setCreationSuccess(`Sala criada! Código: ${data.roomCode}`);
            setNewRoomName('');

        } catch (err) {
            setCreationError(err.message);
        } finally {
            setLoading(false);
        }
    };


    // --- Lógica de Entrar na Sala (SOCKET.IO) ---
    const reqJoinRoom = (code) => {
        setRoomError('');
        // Pega o código do input ou de um parâmetro opcional (se for criação bem sucedida)
        const roomCodeToJoin = (code || joinCode).trim().toUpperCase();
        
        if (!roomCodeToJoin) {
            return setRoomError('Insira um código para entrar.');
        }

        // Antes de tentar reconectar, garante que qualquer socket anterior seja fechado
        disconnectSocket();
        
        // Chama a função do Contexto que inicializa o Socket.io e navega
        reqJoinRoomSocket(roomCodeToJoin);
    };

    // --- Lógica de Logout ---
    const handleLogout = () => {
        // Limpa o estado no contexto e no AsyncStorage para deslogar
        setPlayerId(null);
        disconnectSocket();
    };

    return (
        <ScrollView style={styles.fullScreenContainer} contentContainerStyle={styles.contentContainer}>
            <View style={styles.logoutContainer}>
                 <Text style={styles.welcomeText}>Bem-vindo, {user?.username || 'Viajante'}</Text>
                 <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                     <Text style={styles.logoutButtonText}>Sair</Text>
                 </TouchableOpacity>
            </View>

            {/* --- SEÇÃO DE ENTRAR EM SALA --- */}
            <View style={styles.authBox}>
                <Text style={styles.title}>Entrar em uma Sala</Text>
                
                {roomError ? <Text style={styles.errorMessage}>{roomError}</Text> : <View style={styles.errorMessagePlaceholder} />}

                <TextInput
                    style={styles.input}
                    placeholder="Código da Sala (Ex: DEV001)"
                    placeholderTextColor="#aaa"
                    value={joinCode}
                    onChangeText={setJoinCode}
                    autoCapitalize="characters"
                />
                
                <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={() => reqJoinRoom()}
                >
                    <Text style={styles.buttonText}>Entrar</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.separator} />

            {/* --- SEÇÃO DE CRIAR NOVA SALA --- */}
            <View style={styles.authBox}>
                <Text style={styles.title}>Criar Nova Sala</Text>
                
                {creationError ? <Text style={styles.errorMessage}>{creationError}</Text> : null}
                {creationSuccess ? <Text style={styles.successMessage}>{creationSuccess}</Text> : null}

                <TextInput
                    style={styles.input}
                    placeholder="Nome da Sala"
                    placeholderTextColor="#aaa"
                    value={newRoomName}
                    onChangeText={setNewRoomName}
                />
                
                <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={reqCreateRoom}
                    disabled={loading}
                >
                    {loading 
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.buttonText}>Criar Sala</Text>
                    }
                </TouchableOpacity>

                {creationSuccess && (
                    <TouchableOpacity 
                        style={styles.secondaryButton} 
                        // Simplifica a extração do código para ser mais robusto
                        onPress={() => {
                            const code = creationSuccess.split(': ')[1];
                            if (code) reqJoinRoom(code);
                        }} 
                    >
                        <Text style={styles.secondaryButtonText}>Entrar na Sala Criada</Text>
                    </TouchableOpacity>
                )}

            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a', 
    },
    contentContainer: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 20,
    },
    logoutContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        maxWidth: 400,
    },
    welcomeText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
        backgroundColor: '#cc0000', 
    },
    logoutButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    authBox: {
        backgroundColor: '#2d2d2d', 
        padding: 30,
        borderRadius: 15,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        color: '#7048e8', 
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        padding: 12,
        marginBottom: 15,
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#444',
        color: 'white',
        borderRadius: 8,
        fontSize: 16,
    },
    primaryButton: {
        width: '100%',
        padding: 12,
        marginVertical: 5,
        borderRadius: 8,
        backgroundColor: '#7048e8', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButton: {
        width: '100%',
        padding: 12,
        marginVertical: 10,
        borderRadius: 8,
        backgroundColor: '#4d4d4d', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    errorMessage: {
        color: '#e74c3c', 
        marginBottom: 15,
        fontSize: 14,
        minHeight: 20,
        textAlign: 'center',
    },
    successMessage: {
        color: '#2ecc71', 
        marginBottom: 15,
        fontSize: 14,
        minHeight: 20,
        textAlign: 'center',
    },
    errorMessagePlaceholder: {
        minHeight: 20,
        marginBottom: 15,
    },
    separator: {
        width: '90%',
        maxWidth: 400,
        height: 1,
        backgroundColor: '#444',
        marginVertical: 20,
    }
});