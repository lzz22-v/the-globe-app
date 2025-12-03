// src/utils/api.js

// 🚨 Alterne para 'true' quando você implantar o backend no Render
const IS_PRODUCTION = false; 

// Endereço de Produção (Será fornecido pelo Render após a implantação)
// SUBSTITUA ESTE ENDEREÇO PELA SUA URL REAL DO RENDER!
const PRODUCTION_URL = "https://rpg-casting-backend.onrender.com"; 

// Endereço de Desenvolvimento Local:
// - Android Emulator: 10.0.2.2 é o IP do host (seu PC)
// - iOS Simulator / Expo Go: use o IP da sua máquina na rede (ex: 192.168.x.x)
const LOCAL_URL = "http://10.0.2.2:3000"; 

// A URL exportada muda com base no ambiente
const API_URL = IS_PRODUCTION ? PRODUCTION_URL : LOCAL_URL;

export default API_URL;