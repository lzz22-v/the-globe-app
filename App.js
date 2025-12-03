// App.js

import React from 'react';
import HomeScreen from "./src/screens/HomeScreen";
// 🚨 Importe o Provider que você criou
import { GameProvider } from './src/context/GameContext'; 

export default function App() {
  return (
    // 🚨 Envolvemos o HomeScreen no GameProvider para dar acesso ao estado global.
    <GameProvider>
      <HomeScreen />
    </GameProvider>
  );
}