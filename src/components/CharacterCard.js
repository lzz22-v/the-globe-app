import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

export default function CharacterCard({ character, isOwner, onAction }) {
    return (
        <View style={styles.card}>
            <Image 
                source={{ uri: character.img || 'https://via.placeholder.com/150' }} 
                style={styles.image} 
            />
            <View style={styles.info}>
                <Text style={styles.name}>{character.name}</Text>
                <Text style={styles.status}>
                    {character.owner ? `Dono: ${character.ownerName || 'Outro Player'}` : 'Disponível'}
                </Text>
            </View>
            
            <TouchableOpacity 
                style={[styles.button, isOwner ? styles.buttonActive : styles.buttonClaim]} 
                onPress={() => onAction(character)}
            >
                <Text style={styles.buttonText}>
                    {isOwner ? (character.active ? 'Ativo' : 'Usar') : 'Assumir'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: '#2d2d2d', borderRadius: 10, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
    image: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#444' },
    info: { flex: 1, marginLeft: 15 },
    name: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    status: { color: '#aaa', fontSize: 12 },
    button: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5 },
    buttonClaim: { backgroundColor: '#7048e8' },
    buttonActive: { backgroundColor: '#2ecc71' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});