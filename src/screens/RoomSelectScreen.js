import React, { useState, useContext } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    ActivityIndicator, ScrollView, Keyboard 
} from 'react-native';
import { GameContext } from '../context/GameContext'; 
import CustomAlert from '../components/CustomAlert'; // Importando seu novo componente

export default function RoomSelectScreen() {
    const { 
        user, logout, connectToRoom, BASE_URL, 
        customAlert, showAlert, hideAlert 
    } = useContext(GameContext); 

    const [joinCode, setJoinCode] = useState('');
    const [localLoading, setLocalLoading] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');

    const reqCreateRoom = async () => {
        if (!user?.token) return showAlert('Erro', 'Sessão expirada.', 'error');
        
        const roomName = newRoomName.trim();
        if (!roomName) return showAlert('Aviso', 'Dê um nome para a sala.', 'info');

        Keyboard.dismiss();
        setLocalLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/rooms/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    roomName,
                    ownerId: user.id 
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erro ao criar sala.');
            }

            showAlert("Sucesso", `Sala criada! Código: ${data.roomCode}. Clique no nome da sala para copiar o código.`, 'info');
            setNewRoomName('');
            
            connectToRoom(data.roomCode);

        } catch (err) {
            showAlert("Erro", err.message, 'error');
        } finally {
            setLocalLoading(false);
        }
    };

    const reqJoinRoom = () => {
        const code = joinCode.trim().toUpperCase();
        if (!code) return showAlert('Aviso', 'Insira um código.', 'info');

        Keyboard.dismiss();
        connectToRoom(code); 
    };

    const handleLogout = () => {
        // Como o Logout exige confirmação (Sim/Não), o Alert nativo ainda é útil.
        // Mas para manter a estratégia, aqui chamamos o logout diretamente 
        // ou podemos usar um showAlert customizado se você quiser adicionar botões extras depois.
        logout();
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView 
                style={styles.fullScreenContainer} 
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.logoutContainer}>
                    <View>
                        <Text style={styles.welcomeLabel}>Bem-vindo,</Text>
                        <Text style={styles.welcomeText}>{user?.username || 'Viajante'}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Text style={styles.logoutButtonText}>Sair</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.authBox}>
                    <Text style={styles.title}>Entrar em uma Sala</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: AB12"
                        placeholderTextColor="#666"
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
                        <Text style={styles.buttonText}>Entrar no Jogo</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.separatorContainer}>
                    <View style={styles.line} />
                    <Text style={styles.orText}>OU</Text>
                    <View style={styles.line} />
                </View>

                <View style={styles.authBox}>
                    <Text style={styles.title}>Criar Nova Sala</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nome da Sala (Mundo)"
                        placeholderTextColor="#666"
                        value={newRoomName}
                        onChangeText={setNewRoomName}
                        editable={!localLoading}
                    />
                    <TouchableOpacity 
                        style={[styles.primaryButton, { backgroundColor: '#4c32a8' }]} 
                        onPress={reqCreateRoom} 
                        disabled={localLoading}
                    >
                        {localLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Criar e Entrar</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* O Alerta Customizado renderizado no final para sobrepor tudo */}
            <CustomAlert 
                visible={customAlert.visible}
                title={customAlert.title}
                message={customAlert.message}
                type={customAlert.type}
                onClose={hideAlert}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: { flex: 1, backgroundColor: '#0f0f0f' },
    contentContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 25 },
    logoutContainer: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40, alignItems: 'center' },
    welcomeLabel: { color: '#888', fontSize: 14 },
    welcomeText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    logoutButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, backgroundColor: '#331111', borderWidth: 1, borderColor: '#552222' },
    logoutButtonText: { color: '#ff4444', fontWeight: 'bold', fontSize: 14 },
    authBox: { backgroundColor: '#161616', padding: 25, borderRadius: 25, width: '100%', borderWidth: 1, borderColor: '#222' },
    title: { fontSize: 18, color: '#fff', marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
    input: { backgroundColor: '#000', color: 'white', padding: 18, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#333', fontSize: 16, textAlign: 'center' },
    primaryButton: { backgroundColor: '#7048e8', padding: 18, borderRadius: 15, alignItems: 'center', elevation: 5 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
    separatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 35, width: '100%' },
    line: { flex: 1, height: 1, backgroundColor: '#333' },
    orText: { color: '#555', marginHorizontal: 15, fontWeight: 'bold' }
});