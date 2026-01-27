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
    Keyboard 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function CreateCharacterModal({ visible, onClose, onCreate }) {
    const [name, setName] = useState('');
    const [imageUri, setImageUri] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert("Permissão necessária", "Precisamos de acesso às suas fotos.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, 
            aspect: [1, 1], 
            quality: 0.4, 
            base64: true, 
        });

        if (!result.canceled && result.assets && result.assets[0].base64) {
            setImageUri(result.assets[0].uri);
            setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) return Alert.alert("Erro", "O personagem precisa de um nome.");
        if (!imageBase64) return Alert.alert("Erro", "Escolha uma foto.");

        Keyboard.dismiss();
        setLoading(true);

        try {
            await onCreate({ 
                name: name.trim(), 
                img: imageBase64 
            });
            
            setName('');
            setImageUri(null);
            setImageBase64(null);
            onClose();
        } catch (error) {
            Alert.alert("Erro", "Falha ao criar personagem.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setName('');
            setImageUri(null);
            setImageBase64(null);
            onClose();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Novo Personagem</Text>

                    <TouchableOpacity 
                        style={[styles.imageSelector, imageUri && { borderStyle: 'solid' }]} 
                        onPress={pickImage} 
                        disabled={loading}
                    >
                        {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.placeholderBox}>
                                <Text style={styles.placeholderIcon}>📸</Text>
                                <Text style={styles.placeholderSubText}>Foto do Herói</Text>
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
                    />

                    <View style={styles.buttons}>
                        <TouchableOpacity style={styles.cancel} onPress={handleClose} disabled={loading}>
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.confirm, (!name.trim() || !imageBase64) && styles.btnDisabled]} 
                            onPress={handleCreate}
                            disabled={loading || !name.trim() || !imageBase64}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>CRIAR</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 25 },
    container: { backgroundColor: '#1a1a1a', borderRadius: 30, padding: 25, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
    title: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 25 },
    imageSelector: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#000', borderWidth: 2, borderColor: '#7048e8', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 25, overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    placeholderBox: { alignItems: 'center' },
    placeholderIcon: { fontSize: 40 },
    placeholderSubText: { color: '#888', fontSize: 12, marginTop: 5, fontWeight: 'bold' },
    input: { backgroundColor: '#000', color: 'white', borderRadius: 15, padding: 18, width: '100%', marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#333' },
    buttons: { flexDirection: 'row', width: '100%', gap: 10 },
    cancel: { flex: 1, padding: 15, alignItems: 'center' },
    cancelText: { color: '#888', fontWeight: 'bold' },
    confirm: { backgroundColor: '#7048e8', flex: 2, padding: 15, alignItems: 'center', borderRadius: 15 },
    btnDisabled: { backgroundColor: '#333', opacity: 0.5 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});