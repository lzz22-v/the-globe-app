# 🌍 theGlobe - RPG Multiplayer Casting App

O **theGlobe** é uma plataforma mobile para entusiastas de RPG de mesa que buscam uma experiência de interpretação imersiva e organizada. O app funciona como um "Casting Server", onde jogadores podem entrar em salas, assumir personagens e interagir em tempo real com sincronização total via WebSockets.

## 📲 Download & Instalação

A versão mais recente do aplicativo está disponível para Android.

> ### 📥 [BAIXAR THEGLOBE APK v1.0.1](https://github.com/lzz22-v/the-globe-app/releases/download/v1.0.1/theGlobe.apk)

*Nota: Por ser um APK independente, o Android pode solicitar permissão para "Instalar de Fontes Desconhecidas".*

---

## 🚀 Funcionalidades

- **Conexão em Tempo Real:** Comunicação instantânea utilizando Socket.io para mensagens e eventos de jogo.
- **Sistema de Salas:** Entre em salas específicas através de IDs compartilhados.
- **Gestão de Identidade (Claim System):** Escolha seu personagem na lista da sala. Uma vez ocupado, ninguém mais pode usá-lo até que seja liberado.
- **Chat Dinâmico:** - Indicador de "Digitando...".
    - Confirmação de leitura e recebimento.
    - Suporte a respostas (replies) e exclusão de mensagens.
- **Interface Dark Mode:** Design focado no conforto visual para longas sessões de jogo.



## 🛠️ Tecnologias Utilizadas

### **Frontend (Mobile)**
- **React Native & Expo:** Framework para desenvolvimento nativo.
- **Socket.io-Client:** Comunicação bidirecional estável com o servidor.
- **Context API:** Gerenciamento de estado global (Usuário, Sala, Personagem).
- **AsyncStorage:** Persistência local de dados de acesso.

### **Backend (Infraestrutura)**
- **Node.js & Express:** API REST e servidor de eventos.
- **Socket.io Server:** Orquestração de eventos em tempo real.
- **Render:** Hospedagem escalável para o servidor backend.

---

## 🔧 Configuração para Desenvolvedores

Se quiser rodar o projeto localmente:

1. Clone o repositório:
   ```bash
   git clone [https://github.com/lzz22-v/the-globe-app.git](https://github.com/lzz22-v/the-globe-app.git)
2. Instale as dependências:

    ```bash
    npm install

3. Inicie o Expo Go:

    ```bash
    npx expo start

---

Desenvolvido por LZZ22 - https://github.com/lzz22-v