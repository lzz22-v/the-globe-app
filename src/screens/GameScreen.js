// src/screens/GameScreen.js

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useGame } from '../context/GameContext'; 
// Componentes que você precisa criar ou completar
import CharacterGrid from './CharacterGrid'; 
import ChatScreen from './ChatScreen'; 

export default function GameScreen() {
    // 🚨 CONSUMINDO DADOS E ESTADOS DIRETAMENTE DO CONTEXTO (GameContext.js)
    const { 
        socket, 
        user, 
        roomCode, 
        disconnectSocket, 
        characters,     // <-- Dados do jogo
        chatMessages    // <-- Dados do chat
    } = useGame();

    // Se o socket ainda não estiver pronto ou os dados não tiverem chegado (o que é improvável 
    // se o GameContext fez o trabalho), mostramos um loading.
    if (!socket || !roomCode) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7048e8" />
                <Text style={styles.loadingText}>Conectando à sala...</Text>
            </View>
        );
    }
    
    // Se characters for uma lista vazia, isso pode significar que os dados estão carregando
    // ou que não há personagens na sala.
    if (characters.length === 0 && chatMessages.length === 0) {
         return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7048e8" />
                <Text style={styles.loadingText}>Carregando dados iniciais da sala...</Text>
            </View>
        );
    }
    
    // --- Renderização Principal (Após Carregamento) ---
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mesa de RPG</Text>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerText}>Código: {roomCode}</Text>
                    <Text style={styles.headerText}>👤 {characters.length} na sala</Text>
                </View>
                <TouchableOpacity onPress={disconnectSocket} style={styles.disconnectButton}>
                    <Text style={styles.disconnectButtonText}>Sair</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Coluna Principal: Grade de Personagens e Ações */}
                <View style={styles.mainColumn}>
                    <CharacterGrid 
                        characters={characters} // Consumido do contexto
                        socket={socket} 
                        myUserId={user._id}
                    />
                </View>

                {/* Coluna Secundária: Chat do Jogo */}
                <View style={styles.chatColumn}>
                    <ChatScreen 
                        messages={chatMessages} // Consumido do contexto
                        socket={socket}
                        user={user}
                        roomCode={roomCode}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a', 
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#1a1a1a' 
    },
    loadingText: { 
        color: '#fff', 
        marginTop: 10 
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#2d2d2d',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#7048e8',
    },
    headerInfo: {
        flexDirection: 'row',
        gap: 15,
    },
    headerText: {
        color: '#ccc',
        fontSize: 14,
    },
    disconnectButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: '#cc0000',
        borderRadius: 5,
    },
    disconnectButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        flexDirection: 'row', 
    },
    mainColumn: {
        flex: 2, 
        padding: 10,
    },
    chatColumn: {
        flex: 1, 
        borderLeftWidth: 1,
        borderLeftColor: '#444',
    }
});