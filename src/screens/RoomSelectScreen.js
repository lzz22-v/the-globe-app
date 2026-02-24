import React, { useState, useContext, useCallback } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    ActivityIndicator, ScrollView, Keyboard, 
    KeyboardAvoidingView, Platform, Vibration, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; 
import { GameContext } from '../context/GameContext'; 
import CustomAlert from '../components/CustomAlert'; 

export default function RoomSelectScreen() {
    const navigation = useNavigation();
    const { 
        user, logout, connectToRoom, room, BASE_URL, 
        customAlert, showAlert, hideAlert 
    } = useContext(GameContext); 

    const [joinCode, setJoinCode] = useState('');
    const [localLoading, setLocalLoading] = useState(false);
    const [loadingType, setLoadingType] = useState(null); // 'join', 'create' ou 'resume'
    const [newRoomName, setNewRoomName] = useState('');
    const [history, setHistory] = useState([]);

    const activeCode = room?.code || room?.roomCode;

    // Carregar histórico ao focar na tela
    useFocusEffect(
        useCallback(() => {
            const loadHistory = async () => {
                try {
                    const saved = await AsyncStorage.getItem('@room_history');
                    if (saved) setHistory(JSON.parse(saved));
                } catch (e) { console.error("Erro histórico:", e); }
            };
            loadHistory();
        }, [])
    );

    // Função Unificada com bloqueio de reentrância
    const handleConnectAndNavigate = async (code, type) => {
        if (localLoading) return;

        const upperCode = code.trim().toUpperCase();
        
        // Se já estamos conectados nesta sala, apenas navegamos
        if (activeCode === upperCode) {
            return navigation.navigate('Game');
        }

        setLocalLoading(true);
        setLoadingType(type);
        Vibration.vibrate(50);
        
        try {
            await connectToRoom(upperCode);
            navigation.navigate('Game');
        } catch (err) {
            showAlert("Conexão Falhou", err.message || "Não foi possível conectar.", "error");
        } finally {
            setLocalLoading(false);
            setLoadingType(null);
        }
    };

    const reqCreateRoom = async () => {
        const userId = user?.id;
        if (!user?.token || !userId) return showAlert('Erro', 'Sessão expirada.', 'error');
        
        const roomName = newRoomName.trim();
        if (!roomName) return showAlert('Aviso', 'Dê um nome para a sala.', 'info');

        Keyboard.dismiss();
        setLocalLoading(true);
        setLoadingType('create');

        try {
            const response = await fetch(`${BASE_URL}/api/rooms/create`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ roomName, ownerId: userId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao criar sala.');

            setNewRoomName('');
            await handleConnectAndNavigate(data.roomCode, 'create');
        } catch (err) {
            showAlert("Erro", err.message, 'error');
            setLocalLoading(false);
            setLoadingType(null);
        }
    };

    const reqJoinRoom = () => {
        const code = joinCode.trim().toUpperCase();
        if (!code) return showAlert('Aviso', 'Insira um código.', 'info');
        Keyboard.dismiss();
        setJoinCode('');
        handleConnectAndNavigate(code, 'join');
    };

    return (
        <KeyboardAvoidingView 
            style={styles.fullScreenContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" />
            <ScrollView 
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.welcomeLabel}>Bem-vindo,</Text>
                        <Text style={styles.welcomeText}>{user?.username || 'Viajante'}</Text>
                    </View>
                    <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                        <Text style={styles.logoutButtonText}>Sair</Text>
                    </TouchableOpacity>
                </View>

                {/* Card de Sessão Ativa */}
                {activeCode && (
                    <View style={styles.activeRoomCard}>
                        <View style={styles.activeRoomInfo}>
                            <View style={styles.pulseDot} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.activeRoomLabel}>Sessão em segundo plano</Text>
                                <Text style={styles.roomHighlight} numberOfLines={1}>
                                    {room.name || room.roomName} 
                                    <Text style={styles.activeCodeMini}> ({activeCode})</Text>
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity 
                            style={styles.resumeButton} 
                            onPress={() => handleConnectAndNavigate(activeCode, 'resume')}
                            disabled={localLoading}
                        >
                            {loadingType === 'resume' ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.resumeButtonText}>VOLTAR PARA O JOGO</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Entrar em Sala */}
                <View style={styles.authBox}>
                    <Text style={styles.boxTitle}>Entrar em uma Sala</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: AB12CD"
                        placeholderTextColor="#444"
                        value={joinCode}
                        onChangeText={setJoinCode}
                        autoCapitalize="characters"
                        maxLength={6}
                        editable={!localLoading}
                    />
                    <TouchableOpacity 
                        style={styles.primaryButton} 
                        onPress={reqJoinRoom}
                        disabled={localLoading}
                    >
                        {loadingType === 'join' ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Confirmar Código</Text>
                        )}
                    </TouchableOpacity>

                    {/* Histórico */}
                    {history.length > 0 && (
                        <View style={styles.historyContainer}>
                            <Text style={styles.historyTitle}>Salas Recentes</Text>
                            <View style={styles.historyList}>
                                {history.map((item, index) => (
                                    <TouchableOpacity 
                                        key={index} 
                                        style={[
                                            styles.historyItem, 
                                            activeCode === item.code && styles.historyItemActive
                                        ]}
                                        onPress={() => handleConnectAndNavigate(item.code, 'join')}
                                        disabled={localLoading}
                                    >
                                        <Text style={styles.historyRoomName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.historyRoomCode}>{item.code}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.separatorContainer}>
                    <View style={styles.line} />
                    <Text style={styles.orText}>OU</Text>
                    <View style={styles.line} />
                </View>

                {/* Criar Sala */}
                <View style={[styles.authBox, { borderColor: '#333' }]}>
                    <Text style={styles.boxTitle}>Criar Nova Sala</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nome da Sala"
                        placeholderTextColor="#444"
                        value={newRoomName}
                        onChangeText={setNewRoomName}
                        editable={!localLoading}
                    />
                    <TouchableOpacity 
                        style={[styles.primaryButton, { backgroundColor: '#4c32a8' }]} 
                        onPress={reqCreateRoom} 
                        disabled={localLoading}
                    >
                        {loadingType === 'create' ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Criar e Iniciar</Text>
                        )}
                    </TouchableOpacity>
                </View>
                
                <View style={{ height: 40 }} />
            </ScrollView>

            <CustomAlert 
                visible={customAlert.visible}
                title={customAlert.title}
                message={customAlert.message}
                type={customAlert.type}
                onClose={hideAlert}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: { flex: 1, backgroundColor: '#0a0a0a' },
    contentContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    headerRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, alignItems: 'center' },
    welcomeLabel: { color: '#555', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
    welcomeText: { color: 'white', fontSize: 24, fontWeight: '900' },
    logoutButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 12, backgroundColor: '#1a0a0a', borderWidth: 1, borderColor: '#331111' },
    logoutButtonText: { color: '#ff4444', fontWeight: 'bold', fontSize: 12 },
    activeRoomCard: { width: '100%', backgroundColor: '#141125', padding: 20, borderRadius: 25, marginBottom: 30, borderWidth: 1, borderColor: '#7048e8' },
    activeRoomInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    activeCodeMini: { color: '#7048e8', fontSize: 14 },
    pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00FF00', marginRight: 12 },
    activeRoomLabel: { color: '#888', fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold' },
    roomHighlight: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
    resumeButton: { backgroundColor: '#7048e8', padding: 16, borderRadius: 15, alignItems: 'center' },
    resumeButtonText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    authBox: { backgroundColor: '#141414', padding: 25, borderRadius: 30, width: '100%', borderWidth: 1, borderColor: '#222' },
    boxTitle: { fontSize: 16, color: '#fff', marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
    input: { backgroundColor: '#000', color: 'white', padding: 18, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#222', fontSize: 16, textAlign: 'center' },
    primaryButton: { backgroundColor: '#7048e8', padding: 18, borderRadius: 15, alignItems: 'center', minHeight: 55, justifyContent: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    separatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30, width: '100%' },
    line: { flex: 1, height: 1, backgroundColor: '#222' },
    orText: { color: '#444', marginHorizontal: 15, fontWeight: 'bold', fontSize: 12 },
    historyContainer: { marginTop: 25, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 20 },
    historyTitle: { color: '#444', fontSize: 11, marginBottom: 15, textAlign: 'center', fontWeight: '800', textTransform: 'uppercase' },
    historyList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    historyItem: { backgroundColor: '#0a0a0a', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 15, marginBottom: 10, alignItems: 'center', width: '48%', borderWidth: 1, borderColor: '#222' },
    historyItemActive: { borderColor: '#7048e8', backgroundColor: '#141125' },
    historyRoomName: { color: '#eee', fontSize: 13, fontWeight: '600' },
    historyRoomCode: { color: '#7048e8', fontSize: 11, fontWeight: 'bold', marginTop: 4 }
});