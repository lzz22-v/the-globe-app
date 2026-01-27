import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function MessageOptionsModal({ visible, onClose, onReply, onDelete, isMyMessage }) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.menuBox}>
                    <View style={styles.indicator} />
                    
                    <TouchableOpacity style={styles.option} onPress={onReply}>
                        <Text style={styles.optionText}>💬 Responder</Text>
                    </TouchableOpacity>

                    {isMyMessage && (
                        <TouchableOpacity style={styles.option} onPress={onDelete}>
                            <Text style={[styles.optionText, { color: '#ff4444' }]}>🗑️ Excluir Mensagem</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={[styles.option, styles.cancelOption]} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    menuBox: { 
        backgroundColor: '#161616', 
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30, 
        padding: 20, 
        paddingBottom: 40,
        borderWidth: 1,
        borderColor: '#222'
    },
    indicator: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    option: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#222' },
    optionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    cancelOption: { borderBottomWidth: 0, marginTop: 10, alignItems: 'center' },
    cancelText: { color: '#666', fontSize: 16 }
});