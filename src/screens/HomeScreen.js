// src/screens/HomeScreen.js

import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useGame } from '../context/GameContext'; 

// Importe todas as telas que este componente pode renderizar
import LoginScreen from './LoginScreen';
import RoomSelectScreen from './RoomSelectScreen';
import GameScreen from './GameScreen'; 

// Componente simples de Loading
const LoadingScreen = () => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7048e8" />
        <Text style={styles.loadingText}>Carregando estado inicial...</Text>
    </View>
);

export default function HomeScreen() {
    const { token, roomCode, isLoading } = useGame();

    if (isLoading) {
        return <LoadingScreen />;
    }

    // Prioridade 1: Se estiver logado E com código de sala -> TELA DE JOGO
    if (token && roomCode) {
        console.log("Navegando para: GameScreen");
        return <GameScreen />; 
    }
    
    // Prioridade 2: Se estiver logado, mas SEM código de sala -> SELEÇÃO DE SALA
    if (token) {
        console.log("Navegando para: RoomSelectScreen");
        return <RoomSelectScreen />;
    }
    
    // Padrão: Se não estiver logado -> TELA DE LOGIN
    console.log("Navegando para: LoginScreen");
    return <LoginScreen />;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a', 
    },
    loadingText: {
        color: '#fff',
        marginTop: 10
    }
});