import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// --- ÍCONES SVG ---

const ReplyIcon = ({ color = "#7048e8", size = 22 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" fill={color} />
    </Svg>
);

const TrashIcon = ({ color = "#ff4444", size = 22 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill={color} />
    </Svg>
);

const BlockIcon = ({ color = "#ff9800", size = 22 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.69 5.69C9.04 4.63 10.75 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z" fill={color} />
    </Svg>
);

export default function MessageOptionsModal({ visible, onClose, onReply, onDelete, onBlock, isMyMessage }) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.menuBox}>
                    <View style={styles.indicator} />
                    
                    {/* RESPONDER */}
                    <TouchableOpacity style={styles.option} onPress={onReply}>
                        <View style={styles.iconWrapper}>
                            <ReplyIcon color="#7048e8" />
                        </View>
                        <Text style={styles.optionText}>Responder</Text>
                    </TouchableOpacity>

                    {/* BLOQUEAR USUÁRIO (Sempre visível para moderação ou apenas para outros) */}
                    {!isMyMessage && (
                        <TouchableOpacity style={styles.option} onPress={onBlock}>
                            <View style={styles.iconWrapper}>
                                <BlockIcon color="#ff9800" />
                            </View>
                            <Text style={[styles.optionText, { color: '#ff9800' }]}>Bloquear Usuário</Text>
                        </TouchableOpacity>
                    )}

                    {/* EXCLUIR MENSAGEM */}
                    {isMyMessage && (
                        <TouchableOpacity style={styles.option} onPress={onDelete}>
                            <View style={styles.iconWrapper}>
                                <TrashIcon color="#ff4444" />
                            </View>
                            <Text style={[styles.optionText, { color: '#ff4444' }]}>Excluir Mensagem</Text>
                        </TouchableOpacity>
                    )}

                    {/* CANCELAR */}
                    <TouchableOpacity style={[styles.option, styles.cancelOption]} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    menuBox: { 
        backgroundColor: '#161616', 
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30, 
        paddingHorizontal: 25,
        paddingTop: 12, 
        paddingBottom: 40,
        borderWidth: 1,
        borderColor: '#222'
    },
    indicator: { width: 45, height: 5, backgroundColor: '#333', borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
    option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
    iconWrapper: { width: 35, alignItems: 'flex-start' },
    optionText: { color: '#fff', fontSize: 17, fontWeight: '600', marginLeft: 5 },
    cancelOption: { borderBottomWidth: 0, marginTop: 15, justifyContent: 'center' },
    cancelText: { color: '#666', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }
});