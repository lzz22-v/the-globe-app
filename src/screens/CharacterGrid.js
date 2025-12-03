import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Modal, 
    TextInput,
    Alert 
} from 'react-native';

// --- DEFINIÇÕES DE DADOS PARA AÇÕES E ATRIBUTOS (Simplificado) ---
// Em uma aplicação real, estes dados viriam do backend.
const ATTRIBUTES = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma'];
const DICE_OPTIONS = [4, 6, 8, 10, 12, 20, 100]; // d4, d6, etc.

/**
 * --------------------------------------------------
 * 1. COMPONENTE MODAL DE CRIAÇÃO DE PERSONAGEM
 * --------------------------------------------------
 */
function CharacterCreationModal({ isVisible, onClose, socket, myUserId }) {
    const [name, setName] = useState('');
    const [currentAttribute, setCurrentAttribute] = useState('Força');
    const [attributeValue, setAttributeValue] = useState(10);
    const [isGm, setIsGm] = useState(false);

    const handleCreate = () => {
        if (name.trim() === '') {
            return Alert.alert("Erro", "O personagem precisa de um nome.");
        }

        const newCharacter = {
            name,
            ownerId: myUserId, // Identifica o criador
            isGm,
            // Simulação de atributos, o backend cuidaria da validação
            attributes: { [currentAttribute.toLowerCase()]: attributeValue }, 
            health: 100, // Valor inicial
        };

        // Envia o comando para o servidor via Socket.io
        socket.emit('createCharacter', newCharacter);

        // Limpa e fecha o modal
        setName('');
        setAttributeValue(10);
        setIsGm(false);
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={modalStyles.centeredView}>
                <View style={modalStyles.modalView}>
                    <Text style={modalStyles.modalTitle}>Criar Novo Personagem</Text>
                    
                    <TextInput
                        style={modalStyles.input}
                        placeholder="Nome do Personagem"
                        placeholderTextColor="#999"
                        value={name}
                        onChangeText={setName}
                    />
                    
                    {/* Exemplo Simples de Campo de Atributo */}
                    <View style={modalStyles.row}>
                        <Text style={modalStyles.label}>{currentAttribute}:</Text>
                        <TextInput
                            style={[modalStyles.input, modalStyles.smallInput]}
                            placeholder="Valor"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={String(attributeValue)}
                            onChangeText={(text) => setAttributeValue(Number(text) || 0)}
                        />
                    </View>

                    <View style={modalStyles.buttonGroup}>
                        <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
                            <Text style={modalStyles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={modalStyles.primaryButton} onPress={handleCreate}>
                            <Text style={modalStyles.primaryButtonText}>Criar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/**
 * --------------------------------------------------
 * 2. COMPONENTE MODAL DE AÇÃO (ROLAGEM DE DADOS)
 * --------------------------------------------------
 */
function CharacterActionModal({ isVisible, onClose, socket, character }) {
    const [diceType, setDiceType] = useState(20);
    const [modifier, setModifier] = useState(0);
    const [description, setDescription] = useState('');
    
    // Reseta o estado quando o modal é aberto para um novo personagem
    useEffect(() => {
        setDiceType(20);
        setModifier(0);
        setDescription('');
    }, [isVisible, character]);

    if (!character) return null;

    const handleRoll = () => {
        const actionPayload = {
            characterId: character._id,
            characterName: character.name,
            action: 'roll', // Tipo de ação
            data: {
                dice: diceType,
                modifier: modifier,
                description: description || `Rolagem de d${diceType}`
            }
        };

        // Envia o comando de ação para o servidor
        socket.emit('characterAction', actionPayload);

        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={modalStyles.centeredView}>
                <View style={modalStyles.modalView}>
                    <Text style={modalStyles.modalTitle}>Ação: {character.name}</Text>
                    <Text style={modalStyles.subTitle}>Rolagem de Dados</Text>

                    {/* Seleção do Tipo de Dado */}
                    <View style={modalStyles.diceSelector}>
                        {DICE_OPTIONS.map(dice => (
                            <TouchableOpacity
                                key={dice}
                                style={[
                                    modalStyles.diceButton,
                                    diceType === dice && modalStyles.diceButtonActive
                                ]}
                                onPress={() => setDiceType(dice)}
                            >
                                <Text style={modalStyles.diceButtonText}>d{dice}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Modificador e Descrição */}
                    <TextInput
                        style={modalStyles.input}
                        placeholder="Modificador (+/-)"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={String(modifier)}
                        onChangeText={(text) => setModifier(Number(text) || 0)}
                    />
                    <TextInput
                        style={modalStyles.input}
                        placeholder="Descrição da Ação (Ex: Ataque de Espada)"
                        placeholderTextColor="#999"
                        value={description}
                        onChangeText={setDescription}
                    />

                    <View style={modalStyles.buttonGroup}>
                        <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
                            <Text style={modalStyles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={modalStyles.primaryButton} onPress={handleRoll}>
                            <Text style={modalStyles.primaryButtonText}>Rolar d{diceType}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/**
 * --------------------------------------------------
 * 3. COMPONENTE PRINCIPAL: CHARACTER GRID
 * --------------------------------------------------
 */
export default function CharacterGrid({ characters, socket, myUserId }) {
    // Estado para o modal de criação
    const [isCreationModalVisible, setCreationModalVisible] = useState(false);
    
    // Estado para o modal de ação (rolagem de dados)
    const [isActionModalVisible, setActionModalVisible] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState(null);

    // --- Ações ---
    const openActionModal = (character) => {
        setSelectedCharacter(character);
        setActionModalVisible(true);
    };

    // --- Renderização de Item ---
    const renderCharacterItem = ({ item }) => {
        // Verifica se o usuário atual é o dono do personagem para habilitar ações
        const isOwner = item.ownerId === myUserId;

        // Formatação simples do HP (Health Points)
        const healthColor = item.health > 50 ? '#2ecc71' : item.health > 20 ? '#f1c40f' : '#e74c3c';

        return (
            <View style={gridStyles.card}>
                <Text style={gridStyles.cardTitle}>{item.name}</Text>
                
                {/* Informações do Personagem */}
                <View style={gridStyles.infoRow}>
                    <Text style={gridStyles.infoLabel}>HP:</Text>
                    <Text style={[gridStyles.infoValue, { color: healthColor, fontWeight: 'bold' }]}>
                        {item.health || '??'}
                    </Text>
                </View>

                <Text style={gridStyles.infoOwner}>
                    {isOwner ? 'Seu Personagem' : `Jogador: ${item.ownerUsername}`}
                </Text>

                {/* Botão de Ação */}
                <TouchableOpacity
                    style={[gridStyles.actionButton, !isOwner && gridStyles.disabledButton]}
                    onPress={() => isOwner && openActionModal(item)}
                    disabled={!isOwner}
                >
                    <Text style={gridStyles.actionButtonText}>
                        {isOwner ? 'Ação / Rolar Dados' : 'Ação (Apenas Dono)'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={gridStyles.container}>
            <View style={gridStyles.header}>
                <Text style={gridStyles.title}>Personagens na Sala</Text>
                <TouchableOpacity 
                    style={gridStyles.createButton} 
                    onPress={() => setCreationModalVisible(true)}
                >
                    <Text style={gridStyles.createButtonText}>+ Novo Personagem</Text>
                </TouchableOpacity>
            </View>

            {/* Lista de Personagens */}
            <FlatList
                data={characters}
                renderItem={renderCharacterItem}
                keyExtractor={item => item._id}
                numColumns={2} // Exibe em 2 colunas para melhor aproveitamento de espaço
                columnWrapperStyle={gridStyles.row}
                ListEmptyComponent={() => (
                    <Text style={gridStyles.emptyListText}>Nenhum personagem na sala. Crie um!</Text>
                )}
            />

            {/* Modais */}
            <CharacterCreationModal
                isVisible={isCreationModalVisible}
                onClose={() => setCreationModalVisible(false)}
                socket={socket}
                myUserId={myUserId}
            />

            <CharacterActionModal
                isVisible={isActionModalVisible}
                onClose={() => setActionModalVisible(false)}
                socket={socket}
                character={selectedCharacter}
            />
        </View>
    );
}

// --------------------------------------------------
// ESTILOS
// --------------------------------------------------

const gridStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        padding: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
        paddingBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    createButton: {
        backgroundColor: '#2ecc71', // Cor verde para criar
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    row: {
        justifyContent: 'space-between',
    },
    card: {
        flex: 1,
        margin: 5,
        backgroundColor: '#2d2d2d',
        borderRadius: 10,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#7048e8',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
        paddingBottom: 5,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    infoLabel: {
        color: '#ccc',
        fontSize: 14,
    },
    infoValue: {
        fontSize: 14,
        color: '#fff',
    },
    infoOwner: {
        fontSize: 12,
        color: '#999',
        marginBottom: 15,
    },
    actionButton: {
        backgroundColor: '#7048e8',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#555',
    },
    emptyListText: {
        color: '#aaa',
        textAlign: 'center',
        marginTop: 20,
        width: '100%',
    }
});

const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)', // Fundo escurecido
    },
    modalView: {
        margin: 20,
        backgroundColor: '#2d2d2d',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
    },
    subTitle: {
        fontSize: 16,
        color: '#ccc',
        marginBottom: 10,
    },
    input: {
        width: '100%',
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#1a1a1a',
        color: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
    },
    smallInput: {
        width: 100,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 15,
    },
    label: {
        color: '#fff',
        fontSize: 16,
    },
    diceSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 20,
    },
    diceButton: {
        padding: 8,
        margin: 4,
        backgroundColor: '#444',
        borderRadius: 5,
    },
    diceButtonActive: {
        backgroundColor: '#7048e8',
    },
    diceButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 15,
    },
    primaryButton: {
        backgroundColor: '#7048e8',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#555',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
    }
});