// API Routes para o servidor SQLite
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import Stripe from 'stripe';
import { sqliteDatabaseService } from './server/services/SQLiteDatabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configurar multer para upload de arquivos
const upload = multer({ storage: multer.memoryStorage() });

// Caminhos dos arquivos JSON
const DATA_DIR = path.join(__dirname, 'data');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const SITE_CONFIG_FILE = path.join(DATA_DIR, 'site_config.json');

// Função para ler arquivo JSON
async function readJsonFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

// Função para escrever arquivo JSON com backup e validação
async function writeJsonFile(filePath, data) {
  try {
    // Criar backup do arquivo atual antes de escrever
    const backupPath = `${filePath}.backup`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const timestampedBackup = `${filePath}.backup.${timestamp}`;
    
    try {
      // Criar backup com timestamp
      await fs.copyFile(filePath, timestampedBackup);
      
      // Manter apenas o backup mais recente
      await fs.copyFile(filePath, backupPath);
      
      // Limpar backups antigos (manter apenas os últimos 5)
      const backupDir = path.dirname(filePath);
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(f => f.startsWith(path.basename(filePath) + '.backup.') && f !== path.basename(backupPath))
        .sort()
        .reverse();
      
      // Manter apenas os 5 backups mais recentes
      for (let i = 5; i < backupFiles.length; i++) {
        try {
          await fs.unlink(path.join(backupDir, backupFiles[i]));
        } catch (unlinkError) {
          console.warn('Could not delete old backup:', unlinkError.message);
        }
      }
    } catch (backupError) {
      // Se não conseguir fazer backup, continuar mesmo assim
      console.warn('Could not create backup file:', backupError.message);
    }

    // Escrever o arquivo com validação
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf8');
    
    // Verificar se o arquivo foi escrito corretamente
    const writtenData = await fs.readFile(filePath, 'utf8');
    const parsedData = JSON.parse(writtenData);
    
    if (parsedData.length !== data.length) {
      throw new Error('Data integrity check failed after write');
    }
    
    console.log(`Successfully wrote ${data.length} videos to ${filePath}`);
  } catch (error) {
    console.error('Error writing JSON file:', error);
    throw error;
  }
}

// ===== VÍDEOS =====

// GET /api/videos/health - Verificar integridade dos dados
router.get('/videos/health', async (req, res) => {
  try {
    const videos = await sqliteDatabaseService.getAllVideos();
    
    // Verificar integridade básica
    const healthCheck = {
      totalVideos: videos.length,
      validVideos: 0,
      invalidVideos: [],
      lastBackup: null,
      dataIntegrity: 'OK'
    };
    
    // Verificar cada vídeo
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const requiredFields = ['id', 'title', 'description', 'price', 'createdAt'];
      const missingFields = requiredFields.filter(field => !video[field]);
      
      if (missingFields.length === 0) {
        healthCheck.validVideos++;
      } else {
        healthCheck.invalidVideos.push({
          index: i,
          id: video.id || 'unknown',
          missingFields
        });
      }
    }
    
    // Verificar se há backup recente
    try {
      const backupPath = `${VIDEOS_FILE}.backup`;
      const backupStats = await fs.stat(backupPath);
      healthCheck.lastBackup = backupStats.mtime.toISOString();
    } catch (backupError) {
      healthCheck.lastBackup = 'No backup found';
    }
    
    if (healthCheck.invalidVideos.length > 0) {
      healthCheck.dataIntegrity = 'WARNING';
    }
    
    res.json(healthCheck);
  } catch (error) {
    console.error('Error checking videos health:', error);
    res.status(500).json({ 
      error: 'Failed to check videos health',
      details: error.message 
    });
  }
});

// GET /api/videos - Obter todos os vídeos
router.get('/videos', async (req, res) => {
  try {
    await sqliteDatabaseService.initialize();
    const videos = await sqliteDatabaseService.getAllVideos();
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// GET /api/videos/:id - Obter vídeo por ID
router.get('/videos/:id', async (req, res) => {
  try {
    await sqliteDatabaseService.initialize();
    const video = await sqliteDatabaseService.getVideo(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// POST /api/videos - Criar novo vídeo
router.post('/videos', async (req, res) => {
  try {
    await sqliteDatabaseService.initialize();
    const newVideo = req.body;
    
    // Validar campos obrigatórios
    const requiredFields = ['title', 'description', 'price'];
    for (const field of requiredFields) {
      if (!newVideo[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    
    const createdVideo = await sqliteDatabaseService.createVideo(newVideo);
    
    // Fazer backup automático após criar vídeo
    try {
      await sqliteDatabaseService.backupToWasabi();
      console.log('Backup automático realizado após criar vídeo');
    } catch (backupError) {
      console.warn('Erro no backup automático:', backupError.message);
    }
    
    console.log(`Video ${createdVideo.id} created successfully`);
    res.status(201).json(createdVideo);
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Failed to create video' });
  }
});

// PUT /api/videos/:id - Atualizar vídeo
router.put('/videos/:id', async (req, res) => {
  try {
    await sqliteDatabaseService.initialize();
    const updates = req.body;
    
    // Filtrar apenas campos válidos para atualização
    const allowedFields = [
      'title', 'description', 'price', 'duration', 
      'videoFileId', 'thumbnailFileId', 'productLink', 
      'isActive', 'isPurchased'
    ];
    
    const validUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        validUpdates[field] = updates[field];
      }
    }
    
    const updatedVideo = await sqliteDatabaseService.updateVideo(req.params.id, validUpdates);
    
    if (!updatedVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Fazer backup automático após atualizar vídeo
    try {
      await sqliteDatabaseService.backupToWasabi();
      console.log('Backup automático realizado após atualizar vídeo');
    } catch (backupError) {
      console.warn('Erro no backup automático:', backupError.message);
    }
    
    console.log(`Video ${req.params.id} updated successfully`);
    res.json(updatedVideo);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// DELETE /api/videos/:id - Deletar vídeo
router.delete('/videos/:id', async (req, res) => {
  try {
    await sqliteDatabaseService.initialize();
    const success = await sqliteDatabaseService.deleteVideo(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Fazer backup automático após deletar vídeo
    try {
      await sqliteDatabaseService.backupToWasabi();
      console.log('Backup automático realizado após deletar vídeo');
    } catch (backupError) {
      console.warn('Erro no backup automático:', backupError.message);
    }
    
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// POST /api/videos/:id/views - Incrementar visualizações
router.post('/videos/:id/views', async (req, res) => {
  try {
    await sqliteDatabaseService.incrementVideoViews(req.params.id);
    const video = await sqliteDatabaseService.getVideo(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json({ views: video.views });
  } catch (error) {
    console.error('Error incrementing video views:', error);
    res.status(500).json({ error: 'Failed to increment views' });
  }
});

// ===== USUÁRIOS =====

// GET /api/users - Obter todos os usuários
router.get('/users', async (req, res) => {
  try {
    const users = await sqliteDatabaseService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Obter usuário por ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await sqliteDatabaseService.getUser(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/users/email/:email - Obter usuário por email
router.get('/users/email/:email', async (req, res) => {
  try {
    const user = await sqliteDatabaseService.getUserByEmail(req.params.email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users - Criar novo usuário
router.post('/users', async (req, res) => {
  try {
    const newUser = await sqliteDatabaseService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Atualizar usuário
router.put('/users/:id', async (req, res) => {
  try {
    const updatedUser = await sqliteDatabaseService.updateUser(req.params.id, req.body);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Deletar usuário
router.delete('/users/:id', async (req, res) => {
  try {
    const success = await sqliteDatabaseService.deleteUser(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ===== SESSÕES =====

// GET /api/sessions/token/:token - Obter sessão por token
router.get('/sessions/token/:token', async (req, res) => {
  try {
    const session = await sqliteDatabaseService.getSessionByToken(req.params.token);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error fetching session by token:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/sessions - Criar nova sessão
router.post('/sessions', async (req, res) => {
  try {
    const newSession = await sqliteDatabaseService.createSession(req.body);
    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// PUT /api/sessions/:id - Atualizar sessão
router.put('/sessions/:id', async (req, res) => {
  try {
    const updatedSession = await sqliteDatabaseService.updateSession(req.params.id, req.body);
    
    if (!updatedSession) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// DELETE /api/sessions/:id - Deletar sessão
router.delete('/sessions/:id', async (req, res) => {
  try {
    const success = await sqliteDatabaseService.deleteSession(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Limpar cache do frontend
router.post('/clear-cache', (req, res) => {
  try {
    console.log('Cache clear requested');
    res.json({ 
      success: true, 
      message: 'Cache clear signal sent',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      error: 'Failed to clear cache',
      details: error.message 
    });
  }
});

// Gerar URL assinada para arquivo no Wasabi
router.get('/signed-url/:fileId', async (req, res) => {
  console.log('Signed URL endpoint called with fileId:', req.params.fileId);
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    const siteConfig = await sqliteDatabaseService.getSiteConfig();
    const wasabiConfig = siteConfig.wasabiConfig;

    if (!wasabiConfig || !wasabiConfig.accessKey || !wasabiConfig.secretKey) {
      return res.status(500).json({ error: 'Wasabi configuration not found' });
    }

    const s3Client = new S3Client({
      region: wasabiConfig.region,
      endpoint: wasabiConfig.endpoint,
      credentials: {
        accessKeyId: wasabiConfig.accessKey,
        secretAccessKey: wasabiConfig.secretKey,
      },
      forcePathStyle: true,
    });

    // Gerar URL assinada válida por 1 hora
    const command = new GetObjectCommand({
      Bucket: wasabiConfig.bucket,
      Key: fileId,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({
      success: true,
      url: signedUrl,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate signed URL',
      details: error.message 
    });
  }
});

// ===== CONFIGURAÇÕES DO SITE =====

// GET /api/site-config - Obter configurações do site
router.get('/site-config', async (req, res) => {
  try {
    const config = await sqliteDatabaseService.getSiteConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching site config:', error);
    res.status(500).json({ error: 'Failed to fetch site config' });
  }
});

// PUT /api/site-config - Atualizar configurações do site
router.put('/site-config', async (req, res) => {
  try {
    const config = await sqliteDatabaseService.updateSiteConfig(req.body);
    res.json(config);
  } catch (error) {
    console.error('Error updating site config:', error);
    res.status(500).json({ error: 'Failed to update site config' });
  }
});

// Criar sessão de checkout do Stripe
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { amount, currency = 'usd', name, success_url, cancel_url } = req.body;
    
    if (!amount || !success_url || !cancel_url) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const siteConfig = await sqliteDatabaseService.getSiteConfig();
    const stripeSecretKey = siteConfig.stripeSecretKey;

    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    const stripe = new Stripe(stripeSecretKey);

    // Create a random product name from a list
    const productNames = [
      "Personal Development Ebook",
      "Financial Freedom Ebook", 
      "Digital Marketing Guide",
      "Health & Wellness Ebook",
      "Productivity Masterclass",
      "Mindfulness & Meditation Guide",
      "Entrepreneurship Blueprint",
      "Wellness Program",
      "Success Coaching",
      "Executive Mentoring",
      "Learning Resources",
      "Online Course Access",
      "Premium Content Subscription",
      "Digital Asset Package"
    ];
    
    const randomProductName = productNames[Math.floor(Math.random() * productNames.length)];

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: randomProductName,
            },
            unit_amount: Math.round(amount), // Amount already in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
    });

    res.json({
      success: true,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
});

// Deletar arquivo do Wasabi
router.delete('/delete-file/:fileId', async (req, res) => {
  console.log('Delete file endpoint called with fileId:', req.params.fileId);
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    const siteConfig = await sqliteDatabaseService.getSiteConfig();
    const wasabiConfig = siteConfig.wasabiConfig;

    if (!wasabiConfig || !wasabiConfig.accessKey || !wasabiConfig.secretKey) {
      return res.status(500).json({ error: 'Wasabi configuration not found' });
    }

    const s3Client = new S3Client({
      region: wasabiConfig.region,
      endpoint: wasabiConfig.endpoint,
      credentials: {
        accessKeyId: wasabiConfig.accessKey,
        secretAccessKey: wasabiConfig.secretKey,
      },
      forcePathStyle: true,
    });

    // Deletar arquivo do Wasabi
    const deleteCommand = new DeleteObjectCommand({
      Bucket: wasabiConfig.bucket,
      Key: fileId,
    });

    await s3Client.send(deleteCommand);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file from Wasabi:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      details: error.message 
    });
  }
});

// ===== BACKUP E RESTAURAÇÃO =====

// Fazer backup dos dados para Wasabi
router.post('/backup', async (req, res) => {
  try {
    console.log('Iniciando backup dos dados...');
    
    // Fazer backup dos dados
    const backupData = await sqliteDatabaseService.backupToWasabi();
    
    // Salvar backup no Wasabi
    const siteConfig = await sqliteDatabaseService.getSiteConfig();
    const wasabiConfig = siteConfig.wasabiConfig;

    if (!wasabiConfig || !wasabiConfig.accessKey || !wasabiConfig.secretKey) {
      return res.status(500).json({ error: 'Wasabi configuration not found' });
    }

    const s3Client = new S3Client({
      region: wasabiConfig.region,
      endpoint: wasabiConfig.endpoint,
      credentials: {
        accessKeyId: wasabiConfig.accessKey,
        secretAccessKey: wasabiConfig.secretKey,
      },
      forcePathStyle: true,
    });

    // Upload do backup para Wasabi
    const backupKey = `metadata/backup-${Date.now()}.json`;
    const uploadCommand = new PutObjectCommand({
      Bucket: wasabiConfig.bucket,
      Key: backupKey,
      Body: JSON.stringify(backupData, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(uploadCommand);

    // Salvar referência do backup mais recente
    const latestBackupKey = `metadata/latest-backup.json`;
    const latestBackupCommand = new PutObjectCommand({
      Bucket: wasabiConfig.bucket,
      Key: latestBackupKey,
      Body: JSON.stringify({
        backupKey,
        backupDate: backupData.backupDate,
        version: backupData.version
      }, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(latestBackupCommand);

    res.json({
      success: true,
      message: 'Backup criado com sucesso',
      backupKey,
      backupDate: backupData.backupDate
    });

  } catch (error) {
    console.error('Erro ao fazer backup:', error);
    res.status(500).json({ 
      error: 'Failed to create backup',
      details: error.message 
    });
  }
});

// Restaurar dados do Wasabi
router.post('/restore', async (req, res) => {
  try {
    console.log('Iniciando restauração dos dados...');
    
    const siteConfig = await sqliteDatabaseService.getSiteConfig();
    const wasabiConfig = siteConfig.wasabiConfig;

    if (!wasabiConfig || !wasabiConfig.accessKey || !wasabiConfig.secretKey) {
      return res.status(500).json({ error: 'Wasabi configuration not found' });
    }

    const s3Client = new S3Client({
      region: wasabiConfig.region,
      endpoint: wasabiConfig.endpoint,
      credentials: {
        accessKeyId: wasabiConfig.accessKey,
        secretAccessKey: wasabiConfig.secretKey,
      },
      forcePathStyle: true,
    });

    // Buscar o backup mais recente
    const latestBackupKey = `metadata/latest-backup.json`;
    const getLatestCommand = new GetObjectCommand({
      Bucket: wasabiConfig.bucket,
      Key: latestBackupKey,
    });

    try {
      const latestBackupResponse = await s3Client.send(getLatestCommand);
      const latestBackupData = JSON.parse(await latestBackupResponse.Body.transformToString());
      
      // Buscar o backup completo
      const getBackupCommand = new GetObjectCommand({
        Bucket: wasabiConfig.bucket,
        Key: latestBackupData.backupKey,
      });

      const backupResponse = await s3Client.send(getBackupCommand);
      const backupData = JSON.parse(await backupResponse.Body.transformToString());

      // Restaurar dados
      await sqliteDatabaseService.restoreFromWasabi(backupData);

      res.json({
        success: true,
        message: 'Dados restaurados com sucesso',
        restoredDate: backupData.backupDate
      });

    } catch (backupError) {
      console.error('Erro ao buscar backup do Wasabi:', backupError);
      res.status(404).json({ 
        error: 'Backup not found in Wasabi',
        details: backupError.message 
      });
    }

  } catch (error) {
    console.error('Erro ao restaurar dados:', error);
    res.status(500).json({ 
      error: 'Failed to restore data',
      details: error.message 
    });
  }
});

// Verificar status do backup
router.get('/backup/status', async (req, res) => {
  try {
    const siteConfig = await sqliteDatabaseService.getSiteConfig();
    const wasabiConfig = siteConfig.wasabiConfig;

    if (!wasabiConfig || !wasabiConfig.accessKey || !wasabiConfig.secretKey) {
      return res.status(500).json({ error: 'Wasabi configuration not found' });
    }

    const s3Client = new S3Client({
      region: wasabiConfig.region,
      endpoint: wasabiConfig.endpoint,
      credentials: {
        accessKeyId: wasabiConfig.accessKey,
        secretAccessKey: wasabiConfig.secretKey,
      },
      forcePathStyle: true,
    });

    // Verificar se existe o arquivo de metadados principal
    const metadataKey = `metadata/videosplus-data.json`;
    const getMetadataCommand = new GetObjectCommand({
      Bucket: wasabiConfig.bucket,
      Key: metadataKey,
    });

    try {
      const metadataResponse = await s3Client.send(getMetadataCommand);
      const metadataData = JSON.parse(await metadataResponse.Body.transformToString());
      
      res.json({
        hasBackup: true,
        message: 'Metadata file exists',
        metadataKey: metadataKey
      });

    } catch (error) {
      res.json({
        hasBackup: false,
        message: 'No metadata file found'
      });
    }

  } catch (error) {
    console.error('Erro ao verificar status do backup:', error);
    res.status(500).json({ 
      error: 'Failed to check backup status',
      details: error.message 
    });
  }
});

// Upload de metadados para Wasabi
router.post('/upload/metadata', upload.single('file'), async (req, res) => {
  console.log('Metadata upload endpoint called');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Carregar configurações do Wasabi
    const siteConfig = await sqliteDatabaseService.getSiteConfig();
    const wasabiConfig = siteConfig.wasabiConfig;

    if (!wasabiConfig || !wasabiConfig.accessKey || !wasabiConfig.secretKey) {
      return res.status(500).json({ error: 'Wasabi configuration not found' });
    }

    // Configurar cliente S3 para Wasabi
    const s3Client = new S3Client({
      region: wasabiConfig.region,
      endpoint: wasabiConfig.endpoint,
      credentials: {
        accessKeyId: wasabiConfig.accessKey,
        secretAccessKey: wasabiConfig.secretKey,
      },
      forcePathStyle: true,
    });

    // Upload para o Wasabi
    const uploadCommand = new PutObjectCommand({
      Bucket: wasabiConfig.bucket,
      Key: 'metadata/videosplus-data.json',
      Body: req.file.buffer,
      ContentType: 'application/json',
    });

    await s3Client.send(uploadCommand);

    res.json({
      success: true,
      message: 'Metadata uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading metadata to Wasabi:', error);
    res.status(500).json({ 
      error: 'Failed to upload metadata',
      details: error.message 
    });
  }
});

// Upload de arquivo para Wasabi
router.post('/upload/:folder', upload.single('file'), async (req, res) => {
  console.log(`Upload endpoint called: /upload/${req.params.folder}`);
  try {
    const { folder } = req.params; // 'videos' ou 'thumbnails'
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Carregar configurações do Wasabi
    const siteConfig = await sqliteDatabaseService.getSiteConfig();
    const wasabiConfig = siteConfig.wasabiConfig;

    if (!wasabiConfig || !wasabiConfig.accessKey || !wasabiConfig.secretKey) {
      return res.status(500).json({ error: 'Wasabi configuration not found' });
    }

    // Configurar cliente S3 para Wasabi
    const s3Client = new S3Client({
      region: wasabiConfig.region,
      endpoint: wasabiConfig.endpoint,
      credentials: {
        accessKeyId: wasabiConfig.accessKey,
        secretAccessKey: wasabiConfig.secretKey,
      },
      forcePathStyle: true, // Necessário para Wasabi
    });

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = req.file.originalname.split('.').pop() || '';
    const fileName = `${folder}/${timestamp}_${randomId}.${fileExtension}`;

    // Fazer upload para o Wasabi
    const uploadCommand = new PutObjectCommand({
      Bucket: wasabiConfig.bucket,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3Client.send(uploadCommand);

    // URL do arquivo
    const fileUrl = `https://${wasabiConfig.bucket}.s3.${wasabiConfig.region}.wasabisys.com/${fileName}`;

    res.json({
      success: true,
      fileId: fileName,
      url: fileUrl,
    });

  } catch (error) {
    console.error('Error uploading file to Wasabi:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      details: error.message 
    });
  }
});

export default router;
