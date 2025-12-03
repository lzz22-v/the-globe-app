// src/screens/LoginScreen.js

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGame } from '../context/GameContext'; 
import API_URL from '../utils/api'; 

export default function LoginScreen() {
    const { setToken, setUser } = useGame();
    const [authMode, setAuthMode] = useState('login'); // 'login' ou 'register'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleAuthMode = () => {
        setAuthMode(authMode === 'login' ? 'register' : 'login');
        setError('');
    };

    const handleAuth = async () => {
        setError('');
        if (!username || !password) {
            return setError('Preencha todos os campos.');
        }

        setLoading(true);

        // 🚨 CORREÇÃO AQUI: Adicionado o prefixo 'api/' para bater com o backend
        const endpoint = authMode === 'login' ? 'api/users/login' : 'api/users/register';
        
        try {
            // A URL final será algo como: http://10.0.2.2:3000/api/users/login
            const response = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro de autenticação.');
            }

            // --- Lógica de Sucesso ---
            const { token, _id, username: fetchedUsername } = data;
            
            // 1. Salva no AsyncStorage
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('user', JSON.stringify({ _id, username: fetchedUsername }));

            // 2. Atualiza o Contexto Global
            setToken(token);
            setUser({ _id, username: fetchedUsername });
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.fullScreenContainer}>
            <View style={styles.authBox}>
                <Text style={styles.title}>{authMode === 'login' ? 'Login' : 'Criar Conta'}</Text>
                
                {error ? <Text style={styles.errorMessage}>{error}</Text> : <View style={styles.errorMessagePlaceholder} />}

                <TextInput
                    style={styles.input}
                    placeholder="Nome de Usuário"
                    placeholderTextColor="#aaa"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Senha"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={handleAuth}
                    disabled={loading}
                >
                    {loading 
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.buttonText}>{authMode === 'login' ? 'Entrar' : 'Cadastrar'}</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleAuthMode} style={styles.toggleLink}>
                    <Text style={styles.toggleText}>
                        {authMode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                        <Text style={styles.toggleLinkHighlight}>
                            {authMode === 'login' ? ' Cadastrar-se' : ' Fazer Login'}
                        </Text>
                    </Text>
                </TouchableOpacity>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    authBox: {
        backgroundColor: '#2d2d2d', 
        padding: 40,
        borderRadius: 15,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    title: {
        fontSize: 24,
        color: '#7048e8', 
        marginBottom: 25,
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
    },
    primaryButton: {
        width: '100%',
        padding: 12,
        marginVertical: 5,
        borderRadius: 8,
        cursor: 'pointer',
        backgroundColor: '#7048e8', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
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
    errorMessagePlaceholder: {
        minHeight: 20,
        marginBottom: 15,
    },
    toggleLink: {
        marginTop: 15,
        alignSelf: 'center',
    },
    toggleText: {
        fontSize: 14,
        color: '#888',
    },
    toggleLinkHighlight: {
        color: '#7048e8',
        fontWeight: 'bold',
    }
});