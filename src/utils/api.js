// src/utils/api.js

// O __DEV__ é verdadeiro quando você roda o app pelo Expo Go
// e falso quando você gera o APK (Produção)
const API_URL = __DEV__ 
  ? 'http://192.168.1.68:3000' 
  : 'https://rpg-backend-server.onrender.com';

export default API_URL;