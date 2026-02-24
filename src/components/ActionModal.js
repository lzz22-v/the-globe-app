import React from 'react';
import { 
    View, Text, StyleSheet, Modal, 
    TouchableOpacity, Image, Dimensions 
} from 'react-native';

const { width } = Dimensions.get('window');

export default function ActionModal({ 
    visible, onClose, character, myIdentity, 
    onClaim, onRelease, onDelete 
}) {
    if (!character) return null;

    const ownerId = character.owner ? String(character.owner).trim() : null;
    const isMine = ownerId === myIdentity;
    const isFree = !ownerId;
    const isActive = character.active === true; // Verifica se o personagem está sendo usado ativamente

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.overlay} 
                activeOpacity={1} 
                onPress={onClose}
            >
                <View style={styles.modalContainer}>
                    {/* Header com Imagem */}
                    <Image source={{ uri: character.img }} style={styles.charImage} />
                    
                    <Text style={styles.charName}>{character.name}</Text>
                    <Text style={styles.charStatus}>
                        {isFree ? "Disponível para assumir" : (isMine && isActive) ? "Sendo usado por você" : isMine ? "Seu personagem (Inativo)" : "Ocupado por outro jogador"}
                    </Text>

                    <View style={styles.divider} />

                    {/* Botões de Ação */}
                    <View style={styles.buttonGroup}>
                        {/* Se o personagem for livre OU se for seu mas NÃO estiver ativo, mostra o botão de assumir/usar */}
                        {(isFree || (isMine && !isActive)) && (
                            <TouchableOpacity 
                                style={[styles.actionBtn, styles.claimBtn]} 
                                onPress={() => onClaim(character._id)}
                            >
                                <Text style={styles.btnText}>
                                    {isFree ? "Assumir Personagem" : "Usar Personagem"}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Botão de Largar só aparece se o personagem for seu */}
                        {isMine && (
                            <TouchableOpacity 
                                style={[styles.actionBtn, styles.releaseBtn]} 
                                onPress={() => onRelease(character._id)}
                            >
                                <Text style={styles.btnText}>Largar Personagem</Text>
                            </TouchableOpacity>
                        )}

                        {/* Opção de Deletar (Pode ser restrita ao dono da sala no futuro) */}
                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.deleteBtn]} 
                            onPress={() => onDelete(character._id)}
                        >
                            <Text style={[styles.btnText, { color: '#ff4444' }]}>Excluir Personagem</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.cancelBtn]} 
                            onPress={onClose}
                        >
                            <Text style={styles.cancelText}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { 
        width: width * 0.85, 
        backgroundColor: '#161616', 
        borderRadius: 30, 
        padding: 25, 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    charImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 3, borderColor: '#7048e8' },
    charName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
    charStatus: { color: '#888', fontSize: 14, marginBottom: 20 },
    divider: { width: '100%', height: 1, backgroundColor: '#222', marginBottom: 20 },
    buttonGroup: { width: '100%' },
    actionBtn: { width: '100%', padding: 16, borderRadius: 15, alignItems: 'center', marginBottom: 10 },
    claimBtn: { backgroundColor: '#7048e8' },
    releaseBtn: { backgroundColor: '#333', borderWidth: 1, borderColor: '#444' },
    deleteBtn: { backgroundColor: '#1a0a0a', marginTop: 10 },
    cancelBtn: { marginTop: 5 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    cancelText: { color: '#666', fontWeight: '600' },
    activeDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 }
});