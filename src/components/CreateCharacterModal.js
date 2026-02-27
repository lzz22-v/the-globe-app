import React, { useState } from 'react';
import { 
    Modal, 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    Image, 
    ActivityIndicator, 
    Alert, 
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraIcon } from './AppIcons'; 

export default function CreateCharacterModal({ visible, onClose, onCreate }) {
    const [name, setName] = useState('');
    const [imageUri, setImageUri] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert("Permissão necessária", "Precisamos de acesso às suas fotos para continuar.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], 
            allowsEditing: true, 
            aspect: [1, 1], 
            quality: 0.5, 
            base64: true, 
        });

        if (!result.canceled && result.assets && result.assets[0].base64) {
            setImageUri(result.assets[0].uri);
            const mimeType = result.assets[0].mimeType || 'image/jpeg';
            setImageBase64(`data:${mimeType};base64,${result.assets[0].base64}`);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) return Alert.alert("Erro", "O personagem precisa de um nome.");
        if (!imageBase64) return Alert.alert("Erro", "Escolha uma foto para o seu personagem.");

        Keyboard.dismiss();
        setLoading(true);

        try {
            await onCreate({ 
                name: name.trim(), 
                img: imageBase64 
            });
            
            resetForm();
            onClose();
        } catch (error) {
            console.error("Erro ao criar personagem:", error);
            Alert.alert("Erro", "Não foi possível criar o personagem. Verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setImageUri(null);
        setImageBase64(null);
        setLoading(false);
    };

    const handleClose = () => {
        if (!loading) {
            resetForm();
            onClose();
        }
    };

    return (
        <Modal 
            visible={visible} 
            transparent 
            animationType="fade" 
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                {/* O KeyboardAvoidingView agora envolve todo o conteúdo interno do Modal.
                   O segredo está no behavior e no flex: 1.
                */}
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.overlay}
                >
                    <View style={styles.container}>
                        <Text style={styles.title}>Novo Personagem</Text>

                        <TouchableOpacity 
                            style={[
                                styles.imageSelector, 
                                imageUri && { borderStyle: 'solid' }
                            ]} 
                            onPress={pickImage} 
                            disabled={loading}
                        >
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.placeholderBox}>
                                    <CameraIcon color="#7048e8" size={40} />
                                    <Text style={styles.placeholderSubText}>Adicionar Foto</Text>
                                </View>
                            )}
                            {loading && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <TextInput 
                            style={styles.input} 
                            placeholder="Nome do Personagem" 
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                            editable={!loading}
                            maxLength={25}
                        />

                        <View style={styles.buttons}>
                            <TouchableOpacity 
                                style={styles.cancel} 
                                onPress={handleClose} 
                                disabled={loading}
                            >
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[
                                    styles.confirm, 
                                    (!name.trim() || !imageBase64 || loading) && styles.btnDisabled
                                ]} 
                                onPress={handleCreate}
                                disabled={loading || !name.trim() || !imageBase64}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.btnText}>CRIAR AGORA</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.9)', 
        justifyContent: 'center', // Centraliza o container quando o teclado está fechado
        padding: 25 
    },
    container: { 
        backgroundColor: '#1a1a1a', 
        borderRadius: 30, 
        padding: 25, 
        borderWidth: 1, 
        borderColor: '#333', 
        alignItems: 'center',
        width: '100%',
        elevation: 5
    },
    title: { 
        color: 'white', 
        fontSize: 22, 
        fontWeight: 'bold', 
        marginBottom: 25 
    },
    imageSelector: { 
        width: 130, 
        height: 130, 
        borderRadius: 65, 
        backgroundColor: '#000', 
        borderWidth: 2, 
        borderColor: '#7048e8', 
        borderStyle: 'dashed', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 25, 
        overflow: 'hidden',
        position: 'relative'
    },
    previewImage: { 
        width: '100%', 
        height: '100%' 
    },
    placeholderBox: { 
        alignItems: 'center' 
    },
    placeholderSubText: { 
        color: '#888', 
        fontSize: 11, 
        marginTop: 8, 
        fontWeight: 'bold' 
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    input: { 
        backgroundColor: '#000', 
        color: 'white', 
        borderRadius: 15, 
        padding: 15, 
        width: '100%', 
        marginBottom: 20, 
        fontSize: 16, 
        borderWidth: 1, 
        borderColor: '#333' 
    },
    buttons: { 
        flexDirection: 'row', 
        width: '100%', 
        gap: 10,
        marginTop: 5
    },
    cancel: { 
        flex: 1, 
        padding: 15, 
        alignItems: 'center' 
    },
    cancelText: { 
        color: '#888', 
        fontWeight: 'bold' 
    },
    confirm: { 
        backgroundColor: '#7048e8', 
        flex: 2, 
        padding: 15, 
        alignItems: 'center', 
        borderRadius: 15 
    },
    btnDisabled: { 
        backgroundColor: '#222', 
        opacity: 0.6 
    },
    btnText: { 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: 16 
    }
});