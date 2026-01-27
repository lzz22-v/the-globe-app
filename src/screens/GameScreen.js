import React, { useState, useRef, useContext, useEffect } from 'react';
import { 
    View, Text, FlatList, StyleSheet, 
    TextInput, TouchableOpacity, KeyboardAvoidingView, 
    Platform, Image, StatusBar, Vibration,
    ToastAndroid, BackHandler 
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
// Removido useNavigation pois usaremos o estado condicional do AppNavigator
import { GameContext } from '../context/GameContext'; 
import ActionModal from '../components/ActionModal'; 
import CreateCharacterModal from '../components/CreateCharacterModal';
import MessageOptionsModal from '../components/MessageOptionsModal'; 
import CustomAlert from '../components/CustomAlert';

export default function GameScreen() {
    const { 
        user, room, characters, messages,   
        sendMessage, claimCharacter, releaseCharacter,
        createCharacter, deleteCharacter,
        typingUsers, sendTypingStatus,
        deleteMessage, markAsRead, leaveRoom, // Importada a nova função
        customAlert, showAlert, hideAlert 
    } = useContext(GameContext);

    const [text, setText] = useState('');
    const [selectedChar, setSelectedChar] = useState(null);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [messageToManage, setMessageToManage] = useState(null);

    const flatListRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inputRef = useRef(null);

    // --- DEBUG DE IDENTIDADE ---
    useEffect(() => {
        console.log("ID do Usuário Atual:", user?.id);
    }, [user]);

    // --- LÓGICA DE SAÍDA (CORRIGIDA) ---
    const handleExitRoom = () => {
        // Em vez de navegar manualmente, limpamos o estado da sala.
        // O AppNavigator irá redirecionar automaticamente para RoomSelect.
        leaveRoom();
        return true; 
    };

    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            handleExitRoom
        );
        return () => backHandler.remove();
    }, []);

    // --- MARCAR MENSAGENS COMO LIDAS ---
    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            const isFromMe = String(lastMsg.senderId).trim() === String(user?.id).trim();

            if (lastMsg?._id && !isFromMe && !lastMsg.isRead) {
                markAsRead(lastMsg._id);
            }
        }
    }, [messages, user]);

    const copyToClipboard = async () => {
        if (room?.code) {
            await Clipboard.setStringAsync(room.code);
            Vibration.vibrate(50);
            if (Platform.OS === 'android') {
                ToastAndroid.show("Código copiado!", ToastAndroid.SHORT);
            } else {
                showAlert("Copiado", "Código da sala copiado!");
            }
        }
    };

    const handleTextChange = (value) => {
        setText(value);
        if (value.length > 0) {
            sendTypingStatus(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                sendTypingStatus(false);
            }, 2000);
        } else {
            sendTypingStatus(false);
        }
    };

    const handleSend = () => {
        if (text.trim()) { 
            sendMessage(text.trim(), replyTo); 
            setText(''); 
            setReplyTo(null); 
            sendTypingStatus(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleLongPressMessage = (item) => {
        if (item.deleted) return;
        Vibration.vibrate(50);
        setMessageToManage(item);
        setMenuVisible(true);
    };

    const renderTypingIndicator = () => {
        const othersTyping = typingUsers.filter(u => String(u.id).trim() !== String(user?.id).trim());
        if (othersTyping.length === 0) return null;
        return (
            <View style={styles.typingContainer}>
                <Text style={styles.typingText}>
                    {othersTyping.length === 1 ? `${othersTyping[0].name} está digitando...` : "Vários estão digitando..."}
                </Text>
            </View>
        );
    };

    const renderPlayer = ({ item }) => {
        const ownerId = item.owner ? String(item.owner).trim() : null;
        const currentUserId = user?.id ? String(user.id).trim() : '';
        const isMine = ownerId === currentUserId;
        const isActive = item.active === true;
        const isFree = !ownerId;

        let cardStyle = styles.cardFree; 
        let textStyle = styles.nameFree;
        let imageStyle = styles.imgInactive;

        if (isMine) {
            cardStyle = isActive ? styles.cardMineActive : styles.cardMineInactive;
            textStyle = isActive ? styles.nameActive : styles.nameInactive;
            imageStyle = isActive ? styles.imgNormal : styles.imgInactive;
        } else if (!isFree) {
            cardStyle = isActive ? styles.cardOtherActive : styles.cardOtherInactive;
            textStyle = isActive ? styles.nameActive : styles.nameInactive;
            imageStyle = isActive ? styles.imgNormal : styles.imgInactive;
        }

        return (
            <TouchableOpacity 
                style={[styles.charCard, cardStyle]} 
                onPress={() => setSelectedChar(item)}
                activeOpacity={0.7}
            >
                <Image 
                    source={{ uri: item.img || 'https://via.placeholder.com/100' }} 
                    style={[styles.charAvatar, imageStyle]} 
                />
                <Text style={[styles.charName, textStyle]} numberOfLines={1}>
                    {item.name}
                </Text>
                {isActive && (
                    <View style={[styles.activeDot, { backgroundColor: isMine ? '#00FF00' : '#FF0000' }]} />
                )}
            </TouchableOpacity>
        );
    };

    const renderMessage = ({ item }) => {
        const isMyMessage = String(item.senderId).trim() === String(user?.id).trim();
        const hasChar = item.characterName && item.characterImg;
        const isReply = item.replyTo && item.replyTo.text;

        if (item.deleted) {
            return (
                <View style={[styles.messageRow, isMyMessage ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
                    <View style={styles.msgNoCharSpacer} />
                    <View style={[styles.msgBox, styles.deletedMsg]}>
                        <Text style={styles.deletedMsgText}>🚫 Mensagem apagada</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.messageRow, isMyMessage ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
                {hasChar ? (
                    <Image source={{ uri: item.characterImg }} style={styles.msgCharAvatar} />
                ) : (
                    <View style={styles.msgNoCharSpacer} />
                )}

                <TouchableOpacity 
                    activeOpacity={0.8}
                    onLongPress={() => handleLongPressMessage(item)}
                    style={[styles.msgBox, isMyMessage ? styles.myMsg : styles.otherMsg]}
                >
                    {isReply && (
                        <View style={styles.replyBubbleContainer}>
                            <View style={styles.replyBubbleContent}>
                                <Text style={styles.replyBubbleSender} numberOfLines={1}>
                                    {item.replyTo.senderName || 'Usuário'}
                                </Text>
                                <Text style={styles.replyBubbleText} numberOfLines={1}>
                                    {item.replyTo.text}
                                </Text>
                            </View>
                        </View>
                    )}

                    <Text style={styles.msgSender}>
                        {hasChar ? item.characterName : item.senderName}
                    </Text>
                    <Text style={styles.msgText}>{item.text}</Text>

                    {isMyMessage && (
                        <Text style={styles.readCheck}>
                            {item.isRead === true ? '✓✓' : '✓'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" translucent={false} />
            
            <View style={styles.header}>
                <View style={styles.headerLeftGroup}>
                    <TouchableOpacity onPress={handleExitRoom} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>←</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={copyToClipboard} activeOpacity={0.6} style={styles.roomInfo}>
                        <Text style={styles.roomLabel}>Sala: {room?.code} </Text>
                        <Text style={styles.roomTitle}>{room?.name || 'RPG Room'}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+ Novo</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                <FlatList 
                    data={characters || []} 
                    renderItem={renderPlayer} 
                    keyExtractor={item => item._id} 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={{ paddingHorizontal: 15, alignItems: 'center' }} 
                />
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={styles.chatContainer}
            >
                <View style={{ flex: 1 }}>
                    <FlatList 
                        ref={flatListRef}
                        data={[...messages].reverse()} 
                        inverted 
                        keyExtractor={(item, index) => item._id || index.toString()}
                        renderItem={renderMessage}
                        contentContainerStyle={{ padding: 15 }}
                    />
                    
                    {renderTypingIndicator()}

                    {replyTo && (
                        <View style={styles.replyPreviewContainer}>
                            <View style={styles.replyPreviewBar} />
                            <View style={styles.replyPreviewContent}>
                                <Text style={styles.replyPreviewTitle}>
                                    Respondendo a {replyTo.characterName || replyTo.senderName}
                                </Text>
                                <Text style={styles.replyPreviewText} numberOfLines={1}>
                                    {replyTo.text}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyCloseBtn}>
                                <Text style={styles.replyCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.inputArea}>
                        <TextInput 
                            ref={inputRef}
                            style={styles.input} 
                            placeholder="Mensagem..." 
                            placeholderTextColor="#666" 
                            value={text} 
                            onChangeText={handleTextChange} 
                            onSubmitEditing={handleSend}
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                            <Text style={styles.sendBtnText}>➤</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <MessageOptionsModal 
                visible={menuVisible}
                isMyMessage={String(messageToManage?.senderId).trim() === String(user?.id).trim()}
                onClose={() => setMenuVisible(false)}
                onReply={() => {
                    setReplyTo(messageToManage);
                    setMenuVisible(false);
                    setTimeout(() => inputRef.current?.focus(), 200);
                }}
                onDelete={() => {
                    deleteMessage(messageToManage._id);
                    setMenuVisible(false);
                }}
            />

            <CustomAlert 
                visible={customAlert.visible}
                title={customAlert.title}
                message={customAlert.message}
                type={customAlert.type}
                onClose={hideAlert}
            />

            {selectedChar && (
                <ActionModal 
                    visible={!!selectedChar} 
                    character={selectedChar} 
                    myIdentity={user?.id}
                    onClose={() => setSelectedChar(null)} 
                    onClaim={(id) => { claimCharacter(id); setSelectedChar(null); }} 
                    onRelease={(id) => { releaseCharacter(id); setSelectedChar(null); }} 
                    onDelete={(id) => { deleteCharacter(id); setSelectedChar(null); }}
                />
            )}

            <CreateCharacterModal 
                visible={createModalVisible} 
                onClose={() => setCreateModalVisible(false)} 
                onCreate={(data) => {
                    createCharacter(data);
                    setCreateModalVisible(false);
                }} 
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f0f' },
    header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
    headerLeftGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 }, 
    backBtn: { marginRight: 15, padding: 5 },
    backBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    roomInfo: { flex: 1 },
    roomLabel: { color: '#666', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
    roomTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    addBtn: { backgroundColor: '#7048e8', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    addBtnText: { color: '#fff', fontWeight: 'bold' },
    listContainer: { height: 140, backgroundColor: '#0f0f0f' },
    charCard: { width: 95, height: 115, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 3, position: 'relative' },
    charAvatar: { width: 65, height: 65, borderRadius: 32.5, marginBottom: 8 },
    charName: { fontSize: 12, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
    cardFree: { borderColor: '#333', backgroundColor: '#1a1a1a' }, 
    cardMineActive: { borderColor: '#00FF00', backgroundColor: 'rgba(0, 255, 0, 0.15)', borderWidth: 4 }, 
    cardMineInactive: { borderColor: '#006400', backgroundColor: 'rgba(0, 50, 0, 0.2)' }, 
    cardOtherActive: { borderColor: '#FF0000', backgroundColor: 'rgba(255, 0, 0, 0.15)', borderWidth: 4 }, 
    cardOtherInactive: { borderColor: '#5a0000', backgroundColor: 'rgba(50, 0, 0, 0.2)' },
    activeDot: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5 },
    nameActive: { color: '#fff' },
    nameInactive: { color: '#888' },
    nameFree: { color: '#666' },
    imgNormal: { opacity: 1 },
    imgInactive: { opacity: 0.4 },
    chatContainer: { flex: 1, backgroundColor: '#161616', borderTopLeftRadius: 35, borderTopRightRadius: 35, overflow: 'hidden' },
    messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
    msgCharAvatar: { width: 35, height: 35, borderRadius: 17.5, marginHorizontal: 8, backgroundColor: '#333' },
    msgNoCharSpacer: { width: 10 },
    msgBox: { padding: 12, borderRadius: 18, maxWidth: '75%', minWidth: 100 },
    myMsg: { alignSelf: 'flex-end', backgroundColor: '#7048e8', borderBottomRightRadius: 4 },
    otherMsg: { alignSelf: 'flex-start', backgroundColor: '#2a2a2a', borderBottomLeftRadius: 4 },
    deletedMsg: { backgroundColor: '#1a1a1a', borderStyle: 'dashed', borderWidth: 1, borderColor: '#333' },
    deletedMsgText: { color: '#555', fontSize: 13, fontStyle: 'italic' },
    msgSender: { color: '#bbb', fontSize: 10, marginBottom: 4, fontWeight: 'bold' },
    msgText: { color: '#fff', fontSize: 15, lineHeight: 20 },
    readCheck: { fontSize: 10, color: '#fff', alignSelf: 'flex-end', opacity: 0.7, marginTop: 2, marginRight: -4 },
    replyBubbleContainer: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 8, marginBottom: 8, flexDirection: 'row', borderLeftWidth: 4, borderLeftColor: '#ccc' },
    replyBubbleContent: { flex: 1, marginLeft: 4 },
    replyBubbleSender: { color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', fontSize: 11, marginBottom: 2 },
    replyBubbleText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
    replyPreviewContainer: { flexDirection: 'row', backgroundColor: '#1e1e1e', padding: 10, marginHorizontal: 15, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
    replyPreviewBar: { width: 4, backgroundColor: '#7048e8', borderRadius: 2, marginRight: 10 },
    replyPreviewContent: { flex: 1, justifyContent: 'center' },
    replyPreviewTitle: { color: '#7048e8', fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
    replyPreviewText: { color: '#ccc', fontSize: 13 },
    replyCloseBtn: { padding: 5 },
    replyCloseText: { color: '#888', fontSize: 18, fontWeight: 'bold' },
    inputArea: { flexDirection: 'row', paddingHorizontal: 25, paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 35 : 40, backgroundColor: '#161616', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222' },
    input: { flex: 1, backgroundColor: '#000', color: '#fff', borderRadius: 25, paddingHorizontal: 20, height: 48, fontSize: 16 },
    sendBtn: { marginLeft: 12, width: 48, height: 48, borderRadius: 24, backgroundColor: '#7048e8', justifyContent: 'center', alignItems: 'center' },
    sendBtnText: { color: '#fff', fontSize: 20 },
    typingContainer: { paddingHorizontal: 20, paddingVertical: 5 },
    typingText: { color: '#7048e8', fontSize: 12, fontStyle: 'italic' }
});