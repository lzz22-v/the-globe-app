import React, { useState, useRef, useContext, useEffect, useMemo } from 'react';
import { 
    View, Text, FlatList, StyleSheet, 
    TextInput, TouchableOpacity, KeyboardAvoidingView, 
    Platform, StatusBar, Vibration,
    ToastAndroid, BackHandler, Modal
} from 'react-native';
import { Image } from 'expo-image'; 
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker'; 
import { GameContext } from '../context/GameContext'; 
import ActionModal from '../components/ActionModal'; 
import CreateCharacterModal from '../components/CreateCharacterModal';
import MessageOptionsModal from '../components/MessageOptionsModal'; 
import CustomAlert from '../components/CustomAlert';

import { CameraIcon, EpisodeIcon, BlockIcon } from '../components/AppIcons';

export default function GameScreen({ navigation }) {
    const { 
        user, room, characters, messages,   
        sendMessage, sendEpisode, 
        claimCharacter, releaseCharacter,
        createCharacter, deleteCharacter, updateCharacter,
        typingUsers, sendTypingStatus,
        deleteMessage, markAsRead, 
        customAlert, hideAlert,
        setIsChatActive 
    } = useContext(GameContext);

    const [text, setText] = useState('');
    const [selectedChar, setSelectedChar] = useState(null);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [messageToManage, setMessageToManage] = useState(null);

    const [epModalVisible, setEpModalVisible] = useState(false);
    const [epNumber, setEpNumber] = useState('');

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [charToEdit, setCharToEdit] = useState(null);
    const [editName, setEditName] = useState('');
    const [editImg, setEditImg] = useState(null); 

    const flatListRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inputRef = useRef(null);

    const currentUserId = useMemo(() => String(user?.id || user?._id || '').trim(), [user]);
    const PLACEHOLDER_IMG = 'https://via.placeholder.com/150/1a1a1a/7048e8?text=RPG';

    // Ciclo de vida
    useEffect(() => {
        setIsChatActive(true);
        if (!room) navigation.replace('RoomSelect');
        return () => {
            setIsChatActive(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [room]);

    // Hardware Back
    useEffect(() => {
        const backAction = () => {
            navigation.navigate('RoomSelect');
            return true; 
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [navigation]);

    // Marcação de leitura automática (Corrigido para usar a nova markAsRead)
    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            const isFromMe = String(lastMsg.senderId).trim() === currentUserId;
            // Só chama se a função existir e a mensagem for de outro usuário
            if (markAsRead && lastMsg?._id && !isFromMe && !lastMsg.isRead) {
                markAsRead(lastMsg._id);
            }
        }
    }, [messages, currentUserId, markAsRead]);

    const handlePickImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                if (Platform.OS === 'android') ToastAndroid.show("Permissão necessária", ToastAndroid.SHORT);
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true 
            });
            if (!result.canceled && result.assets?.length > 0) {
                setEditImg(`data:image/jpeg;base64,${result.assets[0].base64}`);
            }
        } catch (error) {
            console.log("Erro ao abrir galeria:", error);
        }
    };

    const handleBackToSelect = () => {
        Vibration.vibrate(50);
        navigation.navigate('RoomSelect');
    };

    const copyToClipboard = async () => {
        const code = room?.code || room?.roomCode;
        if (code) {
            await Clipboard.setStringAsync(code);
            Vibration.vibrate(50);
            if (Platform.OS === 'android') ToastAndroid.show("Código copiado!", ToastAndroid.SHORT);
        }
    };

    const handleTextChange = (value) => {
        setText(value);
        if (value.length > 0) {
            sendTypingStatus(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 2000);
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
            setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
        }
    };

    const handleSendEpisode = () => {
        if (epNumber.trim()) {
            sendEpisode(epNumber.trim());
            setEpNumber('');
            setEpModalVisible(false);
            Vibration.vibrate(100);
        }
    };

    const handleLongPressChar = (item) => {
        const ownerId = item.owner ? String(item.owner).trim() : null;
        if (ownerId === currentUserId) {
            Vibration.vibrate(80);
            setCharToEdit(item);
            setEditName(item.name);
            setEditImg(item.img);
            setEditModalVisible(true);
        }
    };

    const handleSaveEdit = () => {
        if (!editName.trim()) return; 
        updateCharacter(charToEdit._id, { name: editName.trim(), img: editImg });
        setEditModalVisible(false);
        setCharToEdit(null);
        if (Platform.OS === 'android') ToastAndroid.show("Personagem atualizado!", ToastAndroid.SHORT);
    };

    const handleLongPressMessage = (item) => {
        if (item.deleted || item.isEpisode) return;
        Vibration.vibrate(50);
        setMessageToManage(item);
        setMenuVisible(true);
    };

    const renderTypingIndicator = () => {
        const othersTyping = typingUsers.filter(u => String(u.id).trim() !== currentUserId);
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
                onLongPress={() => handleLongPressChar(item)}
                activeOpacity={0.7}
            >
                <Image 
                    source={item.img || PLACEHOLDER_IMG} 
                    style={[styles.charAvatar, imageStyle]} 
                    contentFit="cover"
                    transition={300}
                    cachePolicy="disk"
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
        const isMyMessage = String(item.senderId).trim() === currentUserId;
        const hasChar = item.characterName && item.characterImg;
        const isReply = item.replyTo && item.replyTo.text;

        if (item.isEpisode) {
            return (
                <View style={styles.episodeContainer}>
                    <View style={styles.episodeLine} />
                    <View style={styles.episodeBadge}>
                        <EpisodeIcon size={16} color="#7048e8" />
                        <Text style={styles.episodeText}> EPISÓDIO {item.text}</Text>
                    </View>
                    <View style={styles.episodeLine} />
                </View>
            );
        }

        if (item.deleted) {
            return (
                <View style={[styles.messageRow, isMyMessage ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
                    <View style={styles.msgNoCharSpacer} />
                    <View style={[styles.msgBox, styles.deletedMsg, { flexDirection: 'row', alignItems: 'center' }]}>
                        <BlockIcon size={14} color="#555" />
                        <Text style={[styles.deletedMsgText, { marginLeft: 5 }]}>Mensagem apagada</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.messageRow, isMyMessage ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
                {hasChar ? (
                    <Image 
                        source={item.characterImg} 
                        style={styles.msgCharAvatar}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="disk"
                    />
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
                    <TouchableOpacity onPress={handleBackToSelect} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>❮</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={copyToClipboard} activeOpacity={0.6} style={styles.roomInfo}>
                        <Text style={styles.roomLabel}>Código: {room?.code || room?.roomCode} </Text>
                        <Text style={styles.roomTitle} numberOfLines={1}>{room?.name || room?.roomName || 'Carregando...'}</Text>
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
                    keyExtractor={item => item._id?.toString()} 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={{ paddingHorizontal: 15, alignItems: 'center' }} 
                />
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={styles.chatContainer}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={{ flex: 1 }}>
                    <FlatList 
                        ref={flatListRef}
                        data={[...messages].reverse()} 
                        inverted 
                        keyExtractor={(item, index) => item._id?.toString() || index.toString()}
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
                        <TouchableOpacity 
                            style={styles.epBtn} 
                            onPress={() => setEpModalVisible(true)}
                        >
                            <EpisodeIcon size={20} color="#7048e8" />
                        </TouchableOpacity>

                        <TextInput 
                            ref={inputRef}
                            style={styles.input} 
                            placeholder="Mensagem..." 
                            placeholderTextColor="#666" 
                            value={text} 
                            onChangeText={handleTextChange} 
                            onSubmitEditing={handleSend}
                        />
                        <TouchableOpacity 
                            style={[styles.sendBtn, !text.trim() && { opacity: 0.5 }]} 
                            onPress={handleSend}
                            disabled={!text.trim()}
                        >
                            <Text style={styles.sendBtnText}>➤</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Modais de Interface */}
            <Modal visible={epModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.editModalBox}>
                        <EpisodeIcon size={40} color="#7048e8" />
                        <Text style={[styles.editModalTitle, {marginTop: 10}]}>Novo Episódio</Text>
                        <TextInput 
                            style={styles.editInput}
                            placeholder="Ex: 01, 02..."
                            placeholderTextColor="#555"
                            keyboardType="numeric"
                            value={epNumber}
                            onChangeText={setEpNumber}
                            autoFocus
                        />
                        <View style={styles.editActions}>
                            <TouchableOpacity style={[styles.editBtn, styles.cancelBtn]} onPress={() => setEpModalVisible(false)}>
                                <Text style={styles.editBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.editBtn, styles.saveBtn]} onPress={handleSendEpisode}>
                                <Text style={styles.editBtnText}>Ação!</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={editModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.editModalBox}>
                        <Text style={styles.editModalTitle}>Editar Personagem</Text>
                        <TouchableOpacity style={styles.imagePickerWrapper} onPress={handlePickImage}>
                            <Image 
                                source={editImg || PLACEHOLDER_IMG} 
                                style={styles.editAvatarPreview}
                                contentFit="cover"
                                cachePolicy="none"
                            />
                            <View style={styles.editIconBadge}>
                                <CameraIcon size={16} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.inputLabel}>Nome do Personagem</Text>
                        <TextInput 
                            style={styles.editInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Nome..."
                            placeholderTextColor="#555"
                        />
                        <View style={styles.editActions}>
                            <TouchableOpacity style={[styles.editBtn, styles.cancelBtn]} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.editBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.editBtn, styles.saveBtn]} onPress={handleSaveEdit}>
                                <Text style={styles.editBtnText}>Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <MessageOptionsModal 
                visible={menuVisible}
                isMyMessage={String(messageToManage?.senderId).trim() === currentUserId}
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
                    myIdentity={currentUserId}
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
    backBtnText: { color: '#7048e8', fontSize: 24, fontWeight: 'bold' },
    roomInfo: { flex: 1 },
    roomLabel: { color: '#666', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
    roomTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    addBtn: { backgroundColor: '#7048e8', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    addBtnText: { color: '#fff', fontWeight: 'bold' },
    listContainer: { height: 140, backgroundColor: '#0f0f0f' },
    charCard: { width: 95, height: 115, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 3, position: 'relative' },
    charAvatar: { width: 65, height: 65, borderRadius: 32.5, marginBottom: 8, backgroundColor: '#222' },
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
    inputArea: { flexDirection: 'row', paddingHorizontal: 15, paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 35 : 40, backgroundColor: '#161616', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222' },
    input: { flex: 1, backgroundColor: '#000', color: '#fff', borderRadius: 25, paddingHorizontal: 20, height: 48, fontSize: 16 },
    sendBtn: { marginLeft: 12, width: 48, height: 48, borderRadius: 24, backgroundColor: '#7048e8', justifyContent: 'center', alignItems: 'center' },
    sendBtnText: { color: '#fff', fontSize: 20 },
    epBtn: { marginRight: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    typingContainer: {paddingHorizontal: 20, paddingVertical: 5 },
    typingText: { color: '#7048e8', fontSize: 12, fontStyle: 'italic' },
    episodeContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25, paddingHorizontal: 20 },
    episodeLine: { flex: 1, height: 1, backgroundColor: '#333' },
    episodeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#7048e8', marginHorizontal: 10 },
    episodeText: { color: '#7048e8', fontWeight: 'bold', fontSize: 13, letterSpacing: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    editModalBox: { width: '85%', backgroundColor: '#1a1a1a', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
    editModalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    imagePickerWrapper: { position: 'relative', marginBottom: 25 },
    editAvatarPreview: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#7048e8', backgroundColor: '#222' },
    editIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#7048e8', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1a1a1a' },
    inputLabel: { color: '#7048e8', fontSize: 12, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase', alignSelf: 'flex-start' },
    editInput: { width: '100%', backgroundColor: '#000', color: '#fff', borderRadius: 12, padding: 12, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#222' },
    editActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    editBtn: { flex: 0.48, paddingVertical: 12, borderRadius: 15, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#333' },
    saveBtn: { backgroundColor: '#7048e8' },
    editBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});