import React, { useContext } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native'; 
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Contexto
import { GameContext } from '../context/GameContext'; 

// Telas
import RoomSelectScreen from '../screens/RoomSelectScreen';
import GameScreen from '../screens/GameScreen';
import LoginScreen from '../screens/LoginScreen'; 

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { user, room, isLoading } = useContext(GameContext);

    // Corrigido: Substituímos 'div' por 'View'
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7048e8" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                
                {/* Lógica de fluxo de navegação */}
                {!user ? (
                    // 1. Não logado -> Login
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : !room ? (
                    // 2. Logado, mas sem sala -> Seleção de Sala
                    <Stack.Screen name="RoomSelect" component={RoomSelectScreen} />
                ) : (
                    // 3. Logado e em uma sala -> Tela de Jogo
                    <Stack.Screen name="Game" component={GameScreen} />
                )}

            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f0f0f', 
    }
});