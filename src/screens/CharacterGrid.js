import React from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';

/**
 * Componente que exibe a grade de personagens/jogadores.
 * @param {object[]} props.characters - Lista de objetos de personagens/jogadores.
 * @param {object} props.socket - Instância do Socket.io.
 * @param {string} props.myUserId - ID do usuário logado.
 */
export default function CharacterGrid({ characters, socket, myUserId }) {
    
    // Certifica-se de que characters é um array (embora GameScreen já faça isso)
    const data = Array.isArray(characters) ? characters : [];

    const handlePress = (char) => {
        // Lógica de interação com o personagem (ex: abrir ficha, focar, etc.)
        console.log(`Interagindo com: ${char.name}`);
        // Exemplo: socket.emit('interact_character', { characterId: char.id });
    };

    const renderCharacter = ({ item }) => {
        // ✅ CORREÇÃO CRÍTICA: Evita o erro se o array 'characters' contiver 'null' ou 'undefined'
        if (!item) return null; 

        // Garante que os valores a serem exibidos sejam strings seguras
        const safeName = String(item.name || 'Sem Nome');
        const safeStatus = String(item.status || 'Offline');
        const safeImageUrl = item.imageUrl ? String(item.imageUrl) : 'https://via.placeholder.com/150';

        const isMe = item.userId === myUserId;
        const statusColor = safeStatus === 'Online' ? '#4CAF50' : '#FF9800';

        return (
            <TouchableOpacity 
                style={[styles.card, isMe && styles.myCard]} 
                onPress={() => handlePress(item)}
            >
                <Image 
                    style={styles.image} 
                    source={{ uri: safeImageUrl }} 
                    resizeMode="cover" 
                />
                <View style={styles.info}>
                    {/* ✅ CORREÇÃO APLICADA: Garante string para o nome */}
                    <Text style={styles.name}>{safeName}</Text>
                    <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        {/* ✅ CORREÇÃO APLICADA: Garante string para o status */}
                        <Text style={styles.statusText}>{safeStatus}</Text>
                    </View>
                </View>
                {isMe && <Text style={styles.meBadge}>Você</Text>}
            </TouchableOpacity>
        );
    };

    return (
        <FlatList
            data={data}
            renderItem={renderCharacter}
            keyExtractor={(item, index) => String(item?.id || index)}
            numColumns={3} // Exemplo de 3 colunas
            contentContainerStyle={styles.grid}
            // Garante que o FlatList não tente renderizar nada se estiver vazio
            ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhum personagem encontrado.</Text>
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    // ... (Seus estilos existentes)
    grid: {
        padding: 5,
        justifyContent: 'center',
    },
    card: {
        flex: 1,
        margin: 5,
        backgroundColor: '#2d2d2d',
        borderRadius: 10,
        overflow: 'hidden',
        alignItems: 'center',
        paddingBottom: 8,
        position: 'relative',
    },
    myCard: {
        borderWidth: 2,
        borderColor: '#7048e8',
    },
    image: {
        width: '100%',
        height: 100,
        backgroundColor: '#444',
    },
    info: {
        paddingTop: 8,
        alignItems: 'center',
    },
    name: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    statusText: {
        color: '#ccc',
        fontSize: 12,
    },
    meBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: '#7048e8',
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 100,
    },
    emptyText: {
        color: '#ccc',
        fontSize: 16,
    }
});