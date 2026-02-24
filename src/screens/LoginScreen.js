import React, { useState, useContext, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard,
    StatusBar
} from 'react-native';
import { GameContext } from '../context/GameContext';

export default function LoginScreen() {
    const { login, register, isLoading, showAlert, user } = useContext(GameContext);
    
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Monitor de Debug: Se o 'user' mudar, a tela deveria teoricamente sumir pelo Navigator
    useEffect(() => {
        if (user) {
            console.log("[LoginScreen] Usuário detectado no estado:", user.username);
        }
    }, [user]);

    const handleAuth = async () => {
        const cleanUsername = username.trim();
        
        if (!cleanUsername || !password) {
            return showAlert('Aviso', 'Preencha todos os campos para continuar.', 'info');
        }
        
        Keyboard.dismiss();

        try {
            if (isLogin) {
                const success = await login(cleanUsername, password);
                if (!success) {
                    // O showAlert já é disparado dentro do contexto, 
                    // então aqui apenas garantimos que o carregamento pare.
                    console.log("[LoginScreen] Falha no login verificada.");
                }
            } else {
                const registered = await register(cleanUsername, password);
                if (registered) {
                    setIsLogin(true);
                    setPassword(''); 
                    // Sucesso no registro não loga automaticamente na sua lógica atual,
                    // ele apenas muda para a aba de login.
                }
            }
        } catch (err) {
            console.error("[LoginScreen] Erro inesperado:", err);
            showAlert('Erro', 'Ocorreu um erro inesperado na autenticação.', 'error');
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.container}
        >
            <StatusBar barStyle="light-content" />
            
            <View style={styles.topSection}>
                <Text style={styles.title}>theGlobe</Text>
                <Text style={styles.subtitle}>Conecte-se ao seu mundo.</Text>
            </View>
            
            <View style={styles.card}>
                <Text style={styles.header}>{isLogin ? 'Bem-vindo de volta' : 'Nova Conta'}</Text>
                
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>NOME DE USUÁRIO</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Seu username" 
                        placeholderTextColor="#444"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                    />
                </View>
                
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>SENHA</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="••••••••" 
                        placeholderTextColor="#444"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        editable={!isLoading}
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.btn, isLoading && styles.btnDisabled]} 
                    onPress={handleAuth} 
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff"/>
                    ) : (
                        <Text style={styles.btnText}>{isLogin ? 'ENTRAR AGORA' : 'CRIAR MINHA CONTA'}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setIsLogin(!isLogin)} 
                    style={styles.switchBtn}
                    disabled={isLoading}
                >
                    <Text style={styles.switchText}>
                        {isLogin ? 'Ainda não tem conta? ' : 'Já possui uma conta? '}
                        <Text style={styles.switchHighlight}>
                            {isLogin ? 'Cadastre-se' : 'Faça Login'}
                        </Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#0a0a0a', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: { 
        color: '#7048e8', 
        fontSize: 48, 
        fontWeight: '900', 
        letterSpacing: -1,
        textShadowColor: 'rgba(112, 72, 232, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    subtitle: {
        color: '#555',
        fontSize: 14,
        marginTop: -5,
        fontWeight: '500',
    },
    card: { 
        width: '88%', 
        backgroundColor: '#141414', 
        padding: 30, 
        borderRadius: 30, 
        borderWidth: 1,
        borderColor: '#222',
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 10 }, 
        shadowOpacity: 0.5, 
        shadowRadius: 15,
        elevation: 10 
    },
    header: { 
        color: '#fff', 
        fontSize: 22, 
        fontWeight: 'bold', 
        marginBottom: 30, 
        textAlign: 'center' 
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        color: '#444',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 1,
    },
    input: { 
        backgroundColor: '#000', 
        color: '#fff', 
        padding: 16, 
        borderRadius: 15, 
        fontSize: 16, 
        borderWidth: 1, 
        borderColor: '#222' 
    },
    btn: { 
        backgroundColor: '#7048e8', 
        padding: 18, 
        borderRadius: 15, 
        alignItems: 'center', 
        marginTop: 10,
        shadowColor: '#7048e8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    btnDisabled: { 
        opacity: 0.5, 
        backgroundColor: '#333' 
    },
    btnText: { 
        color: '#fff', 
        fontWeight: '900', 
        fontSize: 14, 
        letterSpacing: 1.5 
    },
    switchBtn: { 
        marginTop: 30, 
        alignItems: 'center' 
    },
    switchText: { 
        color: '#666', 
        fontSize: 13, 
        fontWeight: '500' 
    },
    switchHighlight: {
        color: '#7048e8',
        fontWeight: 'bold',
    }
});