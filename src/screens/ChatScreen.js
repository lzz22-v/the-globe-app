import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    FlatList, 
    KeyboardAvoidingView, 
    Platform,
    Alert 
} from 'react-native';

export default function ChatScreen({ messages, user, roomCode, sendMessageProp, deleteMessage }) { 
    const [messageText, setMessageText] = useState('');
    const [replyTo, setReplyTo] = useState(null); // Estado para gerenciar a resposta
    const flatListRef = useRef(null);
    
    useEffect(() => {
        if (flatListRef.current && messages?.length > 0) {
            const timer = setTimeout(() => {
                flatListRef.current.scrollToEnd({ animated: true });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [messages]);

    const handleSend = () => {
        if (messageText.trim() === '') return;

        if (!sendMessageProp || !user || !user.id) {
            Alert.alert("Erro", "Conexão instável. Tente novamente.");
            return;
        }

        // Enviamos o texto e o objeto de resposta (se houver)
        sendMessageProp(messageText, replyTo); 
        
        setMessageText('');
        setReplyTo(null); // Limpa a resposta após enviar
    };

    const handleLongPress = (item) => {
        if (item.isDeleted) return; // Não interage com mensagens excluídas

        Alert.alert(
            "Opções da Mensagem",
            "O que deseja fazer?",
            [
                { text: "Responder", onPress: () => setReplyTo(item) },
                { 
                    text: "Excluir", 
                    onPress: () => deleteMessage(item._id), 
                    style: "destructive" 
                },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    };

    const renderMessage = ({ item }) => {
        if (!item) return null; 
        
        const currentId = user?.id;
        const msgSenderId = item.senderId?.toString();
        const isMyMessage = currentId && msgSenderId === currentId.toString();

        const name = item.characterName || item.senderName || 'Desconhecido';

        return (
            <TouchableOpacity 
                onLongPress={() => handleLongPress(item)}
                activeOpacity={0.8}
                style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
                    item.isDeleted && styles.deletedContainer
                ]}
            >
                {/* Visual da Resposta (Reply) */}
                {item.replyTo && !item.isDeleted && (
                    <View style={styles.replyQuote}>
                        <Text style={styles.replySender}>{item.replyTo.senderName}</Text>
                        <Text style={styles.replyText} numberOfLines={1}>{item.replyTo.text}</Text>
                    </View>
                )}

                {!isMyMessage && !item.isDeleted && (
                    <Text style={styles.senderName}>{name}</Text>
                )}

                <Text style={[
                    styles.messageText, 
                    item.isDeleted && styles.deletedText
                ]}>
                    {item.text}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.chatContainerWrapper}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={styles.keyboardAvoidingContainer} 
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>SALA: {roomCode || '...'}</Text>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item, index) => item._id || String(index)}
                    contentContainerStyle={styles.messagesList}
                />

                {/* UI de "Respondendo a..." em cima do input */}
                {replyTo && (
                    <View style={styles.replyPreview}>
                        <View style={styles.replyPreviewBar} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.replyPreviewName}>Respondendo a {replyTo.characterName || replyTo.senderName}</Text>
                            <Text style={styles.replyPreviewText} numberOfLines={1}>{replyTo.text}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setReplyTo(null)}>
                            <Text style={{ color: '#fff', paddingHorizontal: 10 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Mensagem..."
                        placeholderTextColor="#999"
                        value={messageText}
                        onChangeText={setMessageText}
                    />
                    <TouchableOpacity 
                        style={[styles.sendButton, !messageText.trim() && { opacity: 0.5 }]} 
                        onPress={handleSend}
                        disabled={!messageText.trim()}
                    >
                        <Text style={styles.sendButtonText}>➤</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    chatContainerWrapper: { flex: 1, backgroundColor: '#121212' },
    keyboardAvoidingContainer: { flex: 1 },
    header: { padding: 8, backgroundColor: '#1a1a1a', alignItems: 'center' },
    headerTitle: { color: '#666', fontSize: 10, fontWeight: 'bold' },
    messagesList: { padding: 10 },
    
    // Balões de Mensagem
    messageContainer: {
        padding: 10,
        borderRadius: 15,
        marginVertical: 4,
        maxWidth: '85%',
        minWidth: 120, // SOLUÇÃO: Impede que o balão fique "esmagado" em respostas curtas
    },
    myMessageContainer: {
        alignSelf: 'flex-end',
        backgroundColor: '#6b46c1',
        borderBottomRightRadius: 2,
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
        backgroundColor: '#2d2d2d',
        borderBottomLeftRadius: 2,
    },
    
    // Estilo para Mensagem Excluída
    deletedContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: '#444'
    },
    deletedText: {
        color: '#777',
        fontStyle: 'italic',
        fontSize: 13
    },

    senderName: { fontSize: 11, fontWeight: 'bold', color: '#a78bfa', marginBottom: 4 },
    messageText: { color: '#fff', fontSize: 15 },

    // Design da Resposta dentro do Balão
    replyQuote: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderLeftWidth: 4,
        borderLeftColor: '#a78bfa',
        padding: 6,
        borderRadius: 4,
        marginBottom: 8,
    },
    replySender: { color: '#a78bfa', fontWeight: 'bold', fontSize: 12 },
    replyText: { color: '#ccc', fontSize: 12 },

    // Visual de Resposta sobre o Input (Estilo WhatsApp)
    replyPreview: {
        flexDirection: 'row',
        backgroundColor: '#1e1e1e',
        padding: 10,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333'
    },
    replyPreviewBar: { width: 4, backgroundColor: '#a78bfa', marginRight: 10, borderRadius: 2 },
    replyPreviewName: { color: '#a78bfa', fontWeight: 'bold', fontSize: 12 },
    replyPreviewText: { color: '#999', fontSize: 12 },

    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 30 : 10
    },
    input: {
        flex: 1,
        backgroundColor: '#262626',
        color: '#fff',
        borderRadius: 25,
        paddingHorizontal: 20,
        height: 45,
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#6b46c1',
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: { color: 'white', fontSize: 18 },
});