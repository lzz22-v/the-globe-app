import React from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';

/**
 * Componente que exibe a grade de personagens/jogadores.
 * @param {object[]} props.characters - Lista de objetos de personagens/jogadores.
 * @param {object} props.socket - Instância do Socket.io.
 * @param {string} props.myUserId - ID do usuário logado.
 */
export default function CharacterGrid({ characters, socket, myUserId }) {
    
    // Certifica-se de que characters é um array
    const data = Array.isArray(characters) ? characters : [];

    const handlePress = (char) => {
        // Lógica de interação: aqui você pode disparar o claim ou abrir detalhes
        console.log(`Interagindo com: ${char.name}`);
    };

    const renderCharacter = ({ item }) => {
        if (!item) return null; 

        // ✅ CORREÇÃO: Alinhando com o GameContext (item.img em vez de imageUrl)
        const safeName = String(item.name || 'Sem Nome');
        
        // No seu sistema, se o personagem tem um owner, ele está "Ocupado/Online"
        const isClaimed = !!item.owner;
        const safeStatus = isClaimed ? 'Ocupado' : 'Livre';
        
        // ✅ CORREÇÃO: Usa a propriedade 'img' que já vem processada pelo Context
        const safeImageUrl = item.img ? String(item.img) : 'https://via.placeholder.com/150/1a1a1a/7048e8?text=?';

        // ✅ CORREÇÃO: Verifica o dono usando 'owner' (campo do banco/socket)
        const isMe = String(item.owner) === String(myUserId);
        const statusColor = isClaimed ? '#FF9800' : '#4CAF50';

        return (
            <TouchableOpacity 
                style={[styles.card, isMe && styles.myCard]} 
                onPress={() => handlePress(item)}
            >
                <View style={styles.imageContainer}>
                    <Image 
                        style={[styles.image, !isClaimed && { opacity: 0.7 }]} 
                        source={{ uri: safeImageUrl }} 
                        resizeMode="cover" 
                    />
                </View>

                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{safeName}</Text>
                    <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={styles.statusText}>{safeStatus}</Text>
                    </View>
                </View>

                {isMe && (
                    <View style={styles.meBadge}>
                        <Text style={styles.meBadgeText}>VOCÊ</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <FlatList
            data={data}
            renderItem={renderCharacter}
            keyExtractor={(item, index) => String(item?._id || item?.id || index)}
            numColumns={3}
            contentContainerStyle={styles.grid}
            ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhum personagem na sala.</Text>
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    grid: {
        padding: 10,
    },
    card: {
        flex: 1,
        margin: 5,
        backgroundColor: '#1a1a1a', // Escurecido para combinar com o tema
        borderRadius: 15,
        overflow: 'hidden',
        alignItems: 'center',
        paddingBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
        maxWidth: '31%', // Garante 3 colunas limpas
    },
    myCard: {
        borderColor: '#7048e8',
        backgroundColor: '#1e1b2e',
    },
    imageContainer: {
        width: '100%',
        height: 100,
        backgroundColor: '#000',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    info: {
        paddingTop: 8,
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    name: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    statusText: {
        color: '#aaa',
        fontSize: 10,
        fontWeight: 'bold',
    },
    meBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: '#7048e8',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    meBadgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'black',
    },
    emptyContainer: {
        marginTop: 50,
        alignItems: 'center',
    },
    emptyText: {
        color: '#666',
        fontSize: 14,
    }
});