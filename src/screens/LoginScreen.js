import React, { useState, useContext } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard 
} from 'react-native';
import { GameContext } from '../context/GameContext';

export default function LoginScreen() {
    const { login, register, isLoading } = useContext(GameContext);
    
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleAuth = async () => {
        const cleanUsername = username.trim();
        
        if (!cleanUsername || !password) {
            return Alert.alert('Erro', 'Preencha todos os campos');
        }
        
        // Fecha o teclado para não atrapalhar a visão do loading
        Keyboard.dismiss();

        if (isLogin) {
            await login(cleanUsername, password);
        } else {
            const registered = await register(cleanUsername, password);
            if (registered) {
                setIsLogin(true);
                setPassword(''); // Limpa a senha por segurança
            }
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.container}
        >
            <Text style={styles.title}>theGlobe</Text>
            
            <View style={styles.card}>
                <Text style={styles.header}>{isLogin ? 'Login' : 'Criar Conta'}</Text>
                
                <TextInput 
                    style={styles.input} 
                    placeholder="Usuário" 
                    placeholderTextColor="#666"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                />
                
                <TextInput 
                    style={styles.input} 
                    placeholder="Senha" 
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!isLoading}
                />

                <TouchableOpacity 
                    style={[styles.btn, isLoading && styles.btnDisabled]} 
                    onPress={handleAuth} 
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff"/>
                    ) : (
                        <Text style={styles.btnText}>{isLogin ? 'ENTRAR' : 'CADASTRAR'}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setIsLogin(!isLogin)} 
                    style={styles.switchBtn}
                    disabled={isLoading}
                >
                    <Text style={styles.switchText}>
                        {isLogin ? 'Não tem conta? Crie uma' : 'Já tem conta? Faça login'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },
    title: { color: '#7048e8', fontSize: 40, fontWeight: 'bold', marginBottom: 30, letterSpacing: 2 },
    card: { width: '85%', backgroundColor: '#1a1a1a', padding: 25, borderRadius: 25, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
    header: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
    input: { backgroundColor: '#000', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#333' },
    btn: { backgroundColor: '#7048e8', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    btnDisabled: { opacity: 0.6, backgroundColor: '#444' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
    switchBtn: { marginTop: 25, alignItems: 'center' },
    switchText: { color: '#888', fontSize: 14, fontWeight: '500' }
});