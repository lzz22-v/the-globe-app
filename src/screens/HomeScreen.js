// src/screens/HomeScreen.js

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';

export default function HomeScreen() {
    const { user, isLoading } = useGame();
    const navigation = useNavigation();

    useEffect(() => {
        if (!isLoading) {
            // Navega após o carregamento inicial dos dados (token/user)
            if (user) {
                // Usuário logado: vai para a seleção de sala
                navigation.replace('RoomSelectScreen');
            } else {
                // Usuário deslogado: vai para o login
                navigation.replace('Login'); // Assegure-se que você tem a tela 'Login'
            }
        }
    }, [isLoading, user, navigation]);

    // Exibe um loading enquanto os dados do Async Storage são carregados
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#7048e8" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
});