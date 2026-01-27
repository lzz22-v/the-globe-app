import React from 'react';
import { StatusBar } from 'expo-status-bar'; // Opcional, mas bom para Expo
import { GameProvider } from './src/context/GameContext'; 
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    // 1. Envolvemos tudo no Provedor do Jogo para que o contexto (socket, user) funcione
    <GameProvider>
      {/* Controla a cor da barra de status do celular */}
      <StatusBar style="light" />
      
      {/* 2. Carregamos o Navegador que decide se mostra Login ou o Jogo */}
      <AppNavigator />
    </GameProvider>
  );
}