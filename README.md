# 🌍 theGlobe - RPG Multiplayer Casting App (v2.2.3 'Ekaterina')

O **theGlobe** é uma plataforma mobile para entusiastas de RPG de mesa que buscam uma experiência de interpretação imersiva e organizada. O app funciona como um "Casting Server", onde jogadores podem entrar em salas, gerenciar seus personagens e interagir em tempo real com sincronização total via WebSockets.

## 📲 Download & Instalação

A atualização **Ekaterina** traz melhorias significativas de persistência, UX e segurança.

> ### 📥 [BAIXAR THEGLOBE APK v2.2.3](https://github.com/lzz22-v/the-globe-app/releases/download/v2.2.3/theGlobe.apk)
> *Nota: Por ser um APK independente, o Android pode solicitar permissão para "Instalar de Fontes Desconhecidas".*

---

## 🚀 Novidades da v2.2.3 'Ekaterina'

* **Salas Recentes:** Agora o app lembra as últimas salas visitadas. Entre no jogo com um toque, sem precisar digitar o código repetidamente.
* **Edição de Personagens:** Alteração de nome e imagem de personagens existentes diretamente pela interface.
* **Notificações Inteligentes:** Sistema de push e vibração otimizado que detecta se o usuário está ou não com o chat ativo.
* **Segurança Reforçada:** Implementação de variáveis de ambiente (`.env`) para proteção de chaves de API e IDs de projeto.
* **Ajustes Visuais:** Refinamento gráfico nos balões de chat, ícones de sistema e correção de sobreposição do teclado em formulários.

## 🛠️ Funcionalidades Core

* **Conexão em Tempo Real:** Comunicação instantânea utilizando Socket.io para mensagens e eventos.
* **Gestão de Identidade (Claim System):** Escolha seu personagem na lista da sala. O sistema garante que cada herói seja controlado por apenas um jogador por vez.
* **Chat Dinâmico:** * Indicador de "Digitando...".
    * Confirmação de recebimento.
    * Suporte a respostas (replies), exclusão de mensagens e rolagem de dados.
* **Interface Dark Mode:** Design focado no conforto visual para longas sessões de RPG.

## ⚙️ Tecnologias Utilizadas

### **Frontend (Mobile)**
* **React Native & Expo:** Framework para desenvolvimento nativo.
* **Socket.io-Client:** Comunicação bidirecional estável.
* **Context API:** Gerenciamento de estado global (Usuário, Sala, Personagem).
* **AsyncStorage:** Persistência local de dados de acesso e histórico.

### **Backend (Infraestrutura)**
* **Node.js & Express:** API REST e servidor de eventos.
* **Socket.io Server:** Orquestração de eventos em tempo real.
* **Render:** Hospedagem escalável para o servidor backend.

---

## 🔧 Configuração para Desenvolvedores

Se quiser rodar o projeto localmente:

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/lzz22-v/the-globe-app.git](https://github.com/lzz22-v/the-globe-app.git)
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configuração de Ambiente:**
    Crie um arquivo `.env` na raiz do projeto:
    ```env
    API_URL=[https://sua-api.com](https://sua-api.com)
    EXPO_PROJECT_ID=seu-id-do-expo
    ```

4.  **Inicie o Expo Go:**
    ```bash
    npx expo start
    ```

---

**Desenvolvido por [LZZ22](https://github.com/lzz22-v)**