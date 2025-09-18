import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './api-routes.js';
import { sqliteDatabaseService } from './server/services/SQLiteDatabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://videosplus.onrender.com', 'https://videosplus.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('dist'));

// Caminhos dos arquivos JSON
const DATA_DIR = path.join(__dirname, 'data');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const SITE_CONFIG_FILE = path.join(DATA_DIR, 'site_config.json');

// Garantir que o diretório de dados existe
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('Data directory created');
  }
}

// Função para ler arquivo JSON
async function readJsonFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`File ${filePath} not found, using default value`);
      return defaultValue;
    }
    console.error(`Error reading ${filePath}:`, error);
    throw error;
  }
}

// Função para escrever arquivo JSON
async function writeJsonFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Successfully wrote to ${filePath}`);
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    throw error;
  }
}

// Inicializar arquivos de dados
async function initializeDataFiles() {
  await ensureDataDir();
  
  // Inicializar arquivos se não existirem
  const files = [
    { path: VIDEOS_FILE, default: [] },
    { path: USERS_FILE, default: [] },
    { path: SESSIONS_FILE, default: [] },
    { path: SITE_CONFIG_FILE, default: {
      siteName: 'VideosPlus',
      paypalClientId: '',
      paypalMeUsername: '',
      stripePublishableKey: '',
      stripeSecretKey: '',
      telegramUsername: '',
      videoListTitle: 'Available Videos',
      crypto: [],
      emailHost: 'smtp.gmail.com',
      emailPort: '587',
      emailSecure: false,
      emailUser: '',
      emailPass: '',
      emailFrom: '',
      wasabiConfig: {
        accessKey: '',
        secretKey: '',
        region: 'eu-central-2',
        bucket: 'videosfolder',
        endpoint: 'https://s3.eu-central-2.wasabisys.com'
      }
    }}
  ];

  for (const file of files) {
    try {
      await fs.access(file.path);
    } catch {
      await writeJsonFile(file.path, file.default);
      console.log(`Created ${file.path}`);
    }
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Usar as rotas da API
app.use('/api', apiRoutes);

// Servir arquivos estáticos do Vite (apenas em produção)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // Em desenvolvimento, redirecionar para o servidor do Vite (exceto para rotas da API)
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
    } else {
      res.redirect('http://localhost:5173' + req.originalUrl);
    }
  });
}

// Inicializar e iniciar servidor
async function startServer() {
  try {
    // Inicializar SQLite database
    await sqliteDatabaseService.initialize();
    console.log('SQLite database initialized');
    
    // Inicializar configuração do site se não existir
    const siteConfig = await sqliteDatabaseService.getSiteConfig();
    if (!siteConfig) {
      console.log('Inicializando configuração padrão do site...');
      const defaultConfig = {
        siteName: 'VideosPlus',
        paypalClientId: '',
        paypalMeUsername: '',
        stripePublishableKey: '',
        stripeSecretKey: '',
        telegramUsername: 'nlyadm19',
        videoListTitle: 'Available Videos',
        crypto: [],
        emailHost: 'smtp.gmail.com',
        emailPort: '587',
        emailSecure: false,
        emailUser: '',
        emailPass: '',
        emailFrom: '',
        wasabiConfig: {
          accessKey: '03AFIL7RED0GENX84KDT',
          secretKey: 'XMrGmC2R25GRTASbUssLkjz5Zr8UsfeyZ9zVgbGy',
          region: 'eu-central-2',
          bucket: 'videosfolder',
          endpoint: 'https://s3.eu-central-2.wasabisys.com'
        }
      };
      await sqliteDatabaseService.updateSiteConfig(defaultConfig);
      console.log('Configuração padrão do site criada');
    }
    
    // Criar usuário admin se não existir
    const adminUser = await sqliteDatabaseService.getUserByEmail('admin@gmail.com');
    if (!adminUser) {
      console.log('Criando usuário admin...');
      const crypto = await import('crypto');
      const adminUserData = {
        email: 'admin@gmail.com',
        name: 'Administrador',
        password: crypto.createHash('sha256').update('admin123').digest('hex')
      };
      await sqliteDatabaseService.createUser(adminUserData);
      console.log('Usuário admin criado: admin@gmail.com / admin123');
    }
    
    // Inicializar arquivos de dados (para compatibilidade)
    await initializeDataFiles();
    console.log('Data files initialized');
    
    // Iniciar servidor primeiro
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Verificar se arquivo JSON existe no Wasabi, se não existir, criar com dados iniciais
      setTimeout(async () => {
        try {
          console.log('Verificando se arquivo JSON existe no Wasabi...');
          
          // Tentar verificar se o arquivo existe
          const checkResponse = await fetch(`http://localhost:${PORT}/api/backup/status`);
          let fileExists = false;
          
          if (checkResponse.ok) {
            const status = await checkResponse.json();
            fileExists = status.hasBackup;
          }
          
          if (!fileExists) {
            console.log('Arquivo JSON não encontrado no Wasabi, criando com dados iniciais...');
            
            // Criar dados iniciais com configuração do site
            const initialData = {
              videos: [],
              users: [
                {
                  id: 'admin-001',
                  email: 'admin@gmail.com',
                  name: 'Administrador',
                  password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123 em SHA256 (hash correto)
                  createdAt: new Date().toISOString()
                }
              ],
              sessions: [],
              siteConfig: {
                siteName: 'VideosPlus',
                paypalClientId: '',
                paypalMeUsername: '',
                stripePublishableKey: '',
                stripeSecretKey: '',
                telegramUsername: 'nlyadm19',
                videoListTitle: 'Available Videos',
                crypto: [],
                emailHost: 'smtp.gmail.com',
                emailPort: '587',
                emailSecure: false,
                emailUser: '',
                emailPass: '',
                emailFrom: '',
                wasabiConfig: {
                  accessKey: '03AFIL7RED0GENX84KDT',
                  secretKey: 'XMrGmC2R25GRTASbUssLkjz5Zr8UsfeyZ9zVgbGy',
                  region: 'eu-central-2',
                  bucket: 'videosfolder',
                  endpoint: 'https://s3.eu-central-2.wasabisys.com'
                }
              }
            };

            // Fazer upload do arquivo inicial para o Wasabi
            const formData = new FormData();
            const blob = new Blob([JSON.stringify(initialData, null, 2)], { type: 'application/json' });
            formData.append('file', blob, 'videosplus-data.json');
            
            const response = await fetch(`http://localhost:${PORT}/api/upload/metadata`, {
              method: 'POST',
              body: formData
            });
            
            if (response.ok) {
              console.log('Arquivo JSON inicial criado com sucesso no Wasabi');
              console.log('Dados iniciais incluídos:');
              console.log('- Usuário admin: admin@gmail.com / admin123');
              console.log('- Configuração do site: VideosPlus');
              console.log('- Configuração Wasabi: videosfolder');
            } else {
              console.log('Erro ao criar arquivo JSON inicial no Wasabi');
            }
          } else {
            console.log('Arquivo JSON já existe no Wasabi, mantendo dados existentes');
          }
          
        } catch (error) {
          console.log('Erro ao verificar/criar arquivo JSON:', error.message);
        }
      }, 1000); // Aguardar 1 segundo para o servidor estar pronto
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();