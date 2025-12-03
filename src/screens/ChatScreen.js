import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    FlatList, 
    KeyboardAvoidingView, 
    Platform 
} from 'react-native';

/**
 * Componente funcional que exibe e gerencia o chat em tempo real.
 * @param {object} props 
 * @param {Array} props.messages - Lista de mensagens.
 * @param {object} props.socket - Instância do Socket.io.
 * @param {object} props.user - Objeto do usuário logado.
 * @param {string} props.roomCode - Código da sala atual.
 */
export default function ChatScreen({ messages, socket, user, roomCode }) {
    const [messageText, setMessageText] = useState('');
    const flatListRef = useRef(null);
    
    // Rola para a última mensagem sempre que a lista de mensagens é atualizada
    useEffect(() => {
        if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    // Função para enviar mensagem via Socket.io
    const sendMessage = () => {
        if (messageText.trim() === '') return;

        // O formato do dado deve ser consistente com o que o seu backend espera
        const newMessage = {
            senderId: user._id,
            senderUsername: user.username,
            roomCode: roomCode,
            text: messageText,
            timestamp: new Date().toISOString(), // Opcional, o backend deve gerar
        };

        // Envia a mensagem para o servidor
        socket.emit('sendMessage', newMessage);

        // Limpa o campo de texto
        setMessageText('');
    };

    // --- Componente interno para renderizar cada mensagem ---
    const renderMessage = ({ item }) => {
        // Verifica se a mensagem foi enviada pelo usuário logado
        const isMyMessage = item.senderId === user._id;

        return (
            <View style={[
                styles.messageContainer,
                isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
            ]}>
                {/* Nome do remetente (apenas se não for o próprio usuário) */}
                {!isMyMessage && (
                    <Text style={styles.senderName}>{item.senderUsername}</Text>
                )}
                
                {/* Texto da mensagem */}
                <Text style={styles.messageText}>
                    {item.text}
                </Text>
                
                {/* Você pode adicionar um timestamp aqui se a performance permitir */}
            </View>
        );
    };

    return (
        // KeyboardAvoidingView para garantir que o teclado não cubra o input
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.chatContainer}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Chat do Jogo</Text>
            </View>

            {/* Lista de Mensagens */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.messagesList}
                // Garante que a lista comece pelo fim (mensagens mais recentes)
                onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
            />

            {/* Input e Botão de Envio */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Digite sua fala..."
                    placeholderTextColor="#999"
                    value={messageText}
                    onChangeText={setMessageText}
                    onSubmitEditing={sendMessage} // Permite enviar pressionando Enter/Done
                    blurOnSubmit={false}
                />
                <TouchableOpacity 
                    style={styles.sendButton} 
                    onPress={sendMessage}
                    disabled={messageText.trim() === ''}
                >
                    <Text style={styles.sendButtonText}>Enviar</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    chatContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a', // Fundo escuro
    },
    header: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    messagesList: {
        padding: 10,
    },
    messageContainer: {
        padding: 10,
        borderRadius: 15,
        marginVertical: 4,
        maxWidth: '80%',
    },
    myMessageContainer: {
        alignSelf: 'flex-end',
        backgroundColor: '#7048e8', // Cor de destaque (do usuário)
        borderBottomRightRadius: 5,
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
        backgroundColor: '#2d2d2d', // Cor de fundo (de outros)
        borderBottomLeftRadius: 5,
    },
    senderName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ccc',
        marginBottom: 2,
    },
    messageText: {
        color: '#fff',
        fontSize: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#444',
        backgroundColor: '#1a1a1a',
    },
    input: {
        flex: 1,
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#7048e8', // Cor de destaque
        borderRadius: 20,
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});