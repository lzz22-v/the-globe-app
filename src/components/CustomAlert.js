import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function CustomAlert({ visible, title, message, onClose, type = 'info' }) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.alertBox}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    
                    <TouchableOpacity 
                        style={[
                            styles.button, 
                            type === 'error' ? { backgroundColor: '#331111' } : { backgroundColor: '#7048e8' }
                        ]} 
                        onPress={onClose}
                    >
                        <Text style={[
                            styles.buttonText,
                            type === 'error' ? { color: '#ff4444' } : { color: '#fff' }
                        ]}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    alertBox: { 
        width: width * 0.8, 
        backgroundColor: '#161616', 
        borderRadius: 20, 
        padding: 25, 
        borderWidth: 1, 
        borderColor: '#222', 
        alignItems: 'center' 
    },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    message: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 20 },
    button: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12, width: '100%', alignItems: 'center' },
    buttonText: { fontWeight: 'bold', fontSize: 16 }
});