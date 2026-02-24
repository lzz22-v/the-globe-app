// App.js

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar'; 
import { GameProvider } from './src/context/GameContext'; 
import AppNavigator from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';

// Impede que a Splash Screen nativa (aquela que você configurou no app.json) 
// se esconda automaticamente antes do app carregar a lógica inicial.
SplashScreen.preventAutoHideAsync();

export default function App() {
    const [appIsReady, setAppIsReady] = useState(false);

    useEffect(() => {
        async function prepare() {
            try {
                /**
                 * Como a imagem já tem a versão e a logo, 
                 * mantemos o app na splash por um tempo determinado (ex: 2.5 segundos)
                 * para garantir uma experiência visual estável no APK.
                 */
                await new Promise(resolve => setTimeout(resolve, 2500)); 
            } catch (e) {
                console.warn("Erro ao preparar o app:", e);
            } finally {
                // Notifica que o carregamento terminou
                setAppIsReady(true);
            }
        }

        prepare();
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (appIsReady) {
            /**
             * Oculta a Splash Screen nativa de forma suave assim que 
             * a View principal do app for montada na tela.
             */
            await SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    // Enquanto o app não está pronto, retornamos null. 
    // O sistema continuará exibindo a imagem do app.json (globe-splash-logo.png).
    if (!appIsReady) {
        return null;
    }

    return (
        <View style={styles.container} onLayout={onLayoutRootView}>
            <GameProvider>
                <StatusBar style="light" />
                <AppNavigator />
            </GameProvider>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0b0b', // Cor de fundo que combina com sua splash
    },
});