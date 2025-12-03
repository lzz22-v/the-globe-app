// RPG-CASTING-SERVER/server.js (Versão Final para Implantação)

// ... (IMPORTS e inicializações, inalterados)
// ...

// ==========================
// 🚨 CHAVES E UTILITÁRIOS 🚨
// ==========================
// **ATENÇÃO:** Mantenha estas chaves em variáveis de ambiente (.env) em um projeto real.
// JWT_SECRET agora lê a variável de ambiente (process.env.JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'jsonwebtoken_fallback_secret_stronger'; 

// URI do MongoDB Atlas fornecida por você (AGORA COMO FALLBACK)
const FALLBACK_MONGODB_URI = "mongodb+srv://luizvale132_db_user:R04cTRkJ4GgOYdPb@cluster0.flnqilb.mongodb.net/project0?retryWrites=true&w=majority";

// Configuração do Cloudinary (para upload de imagens, se necessário)
cloudinary.config({
    cloud_name: "dmdkwkgoi", 
    api_key: 685964722873423,      
    api_secret: "PDbMoEuEePM713_ZF2XMXxEZxIY",  
});

// Função auxiliar para gerar JWT
const generateToken = (id, username) => {
    return jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '30d' });
};

// ==========================
// 🚨 MONGODB CONEXÃO 🚨
// ==========================
// LÊ A VARIÁVEL DE AMBIENTE OU USA O FALLBACK
const MONGODB_URI = process.env.MONGODB_URI || FALLBACK_MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB: Conexão BEM-SUCEDIDA!'))
  .catch(err => {
    console.error('❌ MongoDB: ERRO CRÍTICO de conexão!', err.message);
  });

// ... (DEFINIÇÃO DOS MODELOS, MIDDLEWARES, ROTAS e SOCKET.IO, inalterados)
// ...

// ==========================
// INICIAR SERVIDOR
// ==========================
// LÊ A PORTA DO AMBIENTE (RENDER) OU USA 3000 LOCALMENTE
const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});