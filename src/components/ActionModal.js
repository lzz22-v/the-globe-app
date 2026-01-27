import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image } from 'react-native';

const ActionModal = ({ visible, character, onClose, onClaim, onRelease, onDelete, myIdentity }) => {
    if (!character) return null;

    // Comparação de IDs (Garante que ambos sejam strings limpas)
    const ownerId = character.owner ? String(character.owner).trim() : null;
    const currentUserId = myIdentity ? String(myIdentity).trim() : '';

    const isMine = ownerId === currentUserId;
    const isFree = !ownerId;
    const isActive = character.active;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Image 
                        source={{ uri: character.img || 'https://via.placeholder.com/150' }} 
                        style={[
                            styles.avatar, 
                            isMine && isActive ? styles.avatarActive : styles.avatarInactive
                        ]} 
                    />
                    <Text style={styles.name}>{character.name}</Text>
                    
                    <View style={styles.buttonArea}>
                        
                        {/* 1. ASSUMIR: Só aparece se estiver LIVRE ou se já for MEU mas estiver inativo */}
                        {(isFree || (isMine && !isActive)) && (
                            <TouchableOpacity 
                                style={[styles.btn, styles.btnClaim]} 
                                onPress={() => { onClaim(character._id); onClose(); }}
                            >
                                <Text style={styles.btnText}>
                                    {isFree ? "Assumir Personagem" : "Ativar Personagem"}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* 2. SOLTAR: Só aparece se o personagem for MEU */}
                        {isMine && (
                            <TouchableOpacity 
                                style={[styles.btn, styles.btnRelease]} 
                                onPress={() => { onRelease(character._id); onClose(); }}
                            >
                                <Text style={styles.btnText}>Deixar Personagem</Text>
                            </TouchableOpacity>
                        )}

                        {/* 3. AVISO DE OCUPADO: Se não for meu e não estiver livre, avisa quem é o dono */}
                        {!isMine && !isFree && (
                            <View style={styles.occupiedBadge}>
                                <Text style={styles.occupiedText}>Ocupado por outro jogador</Text>
                            </View>
                        )}

                        {/* 4. EXCLUIR: Mantenha apenas se quiser que todos possam deletar */}
                        <TouchableOpacity 
                            style={[styles.btn, styles.btnDelete]} 
                            onPress={() => { onDelete(character._id); onClose(); }}
                        >
                            <Text style={styles.btnText}>Excluir Personagem</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnClose} onPress={onClose}>
                            <Text style={styles.btnCloseText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    container: { width: '85%', backgroundColor: '#1a1a1a', borderRadius: 30, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 4, backgroundColor: '#000' },
    avatarActive: { borderColor: '#00FF00' },
    avatarInactive: { borderColor: '#444' },
    name: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 25 },
    buttonArea: { width: '100%' },
    btn: { width: '100%', padding: 16, borderRadius: 15, alignItems: 'center', marginBottom: 12 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    btnClaim: { backgroundColor: '#2f9e44' },
    btnRelease: { backgroundColor: '#495057' },
    btnDelete: { backgroundColor: '#c92a2a', marginTop: 10, opacity: 0.8 },
    btnClose: { marginTop: 5, padding: 15, width: '100%', alignItems: 'center' },
    btnCloseText: { color: '#888', fontSize: 16 },
    occupiedBadge: { backgroundColor: '#343a40', padding: 15, borderRadius: 15, marginBottom: 12, alignItems: 'center' },
    occupiedText: { color: '#adb5bd', fontWeight: 'bold' }
});

export default ActionModal;