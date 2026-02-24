import React, { useContext } from 'react';
import { ActivityIndicator, View, StyleSheet, StatusBar } from 'react-native'; 
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { GameContext } from '../context/GameContext'; 

import RoomSelectScreen from '../screens/RoomSelectScreen';
import GameScreen from '../screens/GameScreen';
import LoginScreen from '../screens/LoginScreen'; 

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    // Pegamos também o setUser para garantir que o contexto está acessível
    const { user, isLoading } = useContext(GameContext);

    // Se estiver carregando dados do AsyncStorage ou processando login
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" />
                <ActivityIndicator size="large" color="#7048e8" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator 
                screenOptions={{ 
                    headerShown: false,
                    animation: 'fade'
                }}
            >
                {/* A checagem user?.token é mais segura. 
                  O React Navigation gerencia a troca de telas automaticamente 
                  assim que o estado 'user' deixa de ser nulo.
                */}
                {user && user.token ? (
                    <Stack.Group>
                        <Stack.Screen 
                            name="RoomSelect" 
                            component={RoomSelectScreen} 
                        />
                        <Stack.Screen 
                            name="Game" 
                            component={GameScreen} 
                            options={{ 
                                animation: 'slide_from_right',
                                gestureEnabled: false 
                            }}
                        />
                    </Stack.Group>
                ) : (
                    <Stack.Screen 
                        name="Login" 
                        component={LoginScreen} 
                    />
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
        backgroundColor: '#0a0a0a', 
    }
});