// API Routes para o servidor SQLite
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Forçar leitura do .env
dotenv.config();

// Supabase server client
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } }) : null;

function requireSupabase(res) {
  if (!supabase) {
    res.status(500).json({ error: 'Supabase not configured on server' });
    return false;
  }
  return true;
}

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
// Helper: load Wasabi config from ENV first, then Supabase site_config
async function getWasabiConfigFromServer() {
  // ENV takes precedence
  const envConfig = {
    accessKey: process.env.WASABI_ACCESS_KEY || process.env.VITE_WASABI_ACCESS_KEY,
    secretKey: process.env.WASABI_SECRET_KEY || process.env.VITE_WASABI_SECRET_KEY,
    region: process.env.WASABI_REGION || process.env.VITE_WASABI_REGION,
    bucket: process.env.WASABI_BUCKET || process.env.VITE_WASABI_BUCKET,
    endpoint: process.env.WASABI_ENDPOINT || process.env.VITE_WASABI_ENDPOINT,
  };
  if (envConfig.accessKey && envConfig.secretKey && envConfig.bucket && envConfig.region && envConfig.endpoint) {
    return envConfig;
  }
  // Fallback to Supabase site_config
  if (!supabase) return null;
  const { data: cfg, error: cfgErr } = await supabase.from('site_config').select('wasabi_config').limit(1).maybeSingle();
  if (cfgErr) throw cfgErr;
  const wasabiConfig = cfg?.wasabi_config || {};
  if (wasabiConfig && wasabiConfig.accessKey && wasabiConfig.secretKey && wasabiConfig.bucket && wasabiConfig.region && wasabiConfig.endpoint) {
    return wasabiConfig;
  }
  return null;
}


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
    if (!requireSupabase(res)) return;
    const { data: videos, error } = await supabase.from('videos').select('*');
    if (error) throw error;
    
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
    if (!requireSupabase(res)) return;
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// GET /api/videos/:id - Obter vídeo por ID
router.get('/videos/:id', async (req, res) => {
  try {
    if (!requireSupabase(res)) return;
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    
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
    if (!requireSupabase(res)) return;
    const newVideo = req.body;
    
    // Validar campos obrigatórios
    const requiredFields = ['title', 'description', 'price'];
    for (const field of requiredFields) {
      if (!newVideo[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    
    const { data: createdVideo, error } = await supabase
      .from('videos')
      .insert({
        title: newVideo.title,
        description: newVideo.description,
        price: newVideo.price,
        duration: newVideo.duration || null,
        video_file_id: newVideo.videoFileId || newVideo.video_id || null,
        thumbnail_file_id: newVideo.thumbnailFileId || newVideo.thumbnail_id || null,
        product_link: newVideo.productLink || null,
        is_active: newVideo.isActive !== false,
      })
      .select('*')
      .single();
    if (error) throw error;
    
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
    if (!requireSupabase(res)) return;
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
    
    const supaUpdates = {
      title: validUpdates.title,
      description: validUpdates.description,
      price: validUpdates.price,
      duration: validUpdates.duration,
      video_file_id: validUpdates.videoFileId,
      thumbnail_file_id: validUpdates.thumbnailFileId,
      product_link: validUpdates.productLink,
      is_active: validUpdates.isActive,
    };
    Object.keys(supaUpdates).forEach(k => supaUpdates[k] === undefined && delete supaUpdates[k]);
    const { data: updatedVideo, error } = await supabase
      .from('videos')
      .update(supaUpdates)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    
    if (!updatedVideo) {
      return res.status(404).json({ error: 'Video not found' });
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
    if (!requireSupabase(res)) return;
    const { error } = await supabase.from('videos').delete().eq('id', req.params.id);
    const success = !error;
    
    if (!success) {
      return res.status(404).json({ error: 'Video not found' });
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
    if (!requireSupabase(res)) return;
    // Try RPC first; fallback to update
    const { error: rpcErr } = await supabase.rpc('increment', { table_name: 'videos', row_id: req.params.id, column_name: 'views' });
    if (rpcErr) {
      const { data: current } = await supabase.from('videos').select('views').eq('id', req.params.id).maybeSingle();
      await supabase.from('videos').update({ views: (current?.views || 0) + 1 }).eq('id', req.params.id);
    }
    const { data: video } = await supabase.from('videos').select('views').eq('id', req.params.id).maybeSingle();
    
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
    if (!requireSupabase(res)) return;
    const { data: users, error } = await supabase.from('users').select('id,email,name,role,created_at').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Obter usuário por ID
router.get('/users/:id', async (req, res) => {
  try {
    if (!requireSupabase(res)) return;
    const { data: user, error } = await supabase.from('users').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    
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
    if (!requireSupabase(res)) return;
    
    const { data: user, error } = await supabase.from('users').select('*').eq('email', req.params.email).maybeSingle();
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

// POST /api/users - Criar novo usuário
router.post('/users', async (req, res) => {
  try {
    if (!requireSupabase(res)) return;
    const { email, name, role = 'admin', password_hash } = req.body;
    const { data, error } = await supabase.from('users').insert({ email, name, role, password_hash }).select('*').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Atualizar usuário
router.put('/users/:id', async (req, res) => {
  try {
    if (!requireSupabase(res)) return;
    const updates = req.body;
    
    const { data: updatedUser, error } = await supabase.from('users').update(updates).eq('id', req.params.id).select('*').single();
    
    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// DELETE /api/users/:id - Deletar usuário
router.delete('/users/:id', async (req, res) => {
  try {
    if (!requireSupabase(res)) return;
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    const success = !error;
    
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
    if (!requireSupabase(res)) return;
    const { data: session, error } = await supabase.from('sessions').select('*').eq('token', req.params.token).maybeSingle();
    if (error) throw error;
    
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
    if (!requireSupabase(res)) return;
    const b = req.body || {};
    const payload = {
      user_id: b.userId || b.user_id,
      token: b.token,
      user_agent: b.userAgent || b.user_agent,
      expires_at: b.expiresAt || b.expires_at,
      is_active: typeof b.isActive === 'boolean' ? b.isActive : (b.is_active ?? true),
    };
    const { data, error } = await supabase.from('sessions').insert(payload).select('*').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// PUT /api/sessions/:id - Atualizar sessão
router.put('/sessions/:id', async (req, res) => {
  try {
    if (!requireSupabase(res)) return;
    const b = req.body || {};
    const updates = {
      user_id: b.userId ?? undefined,
      token: b.token ?? undefined,
      user_agent: (b.userAgent ?? b.user_agent) ?? undefined,
      expires_at: (b.expiresAt ?? b.expires_at) ?? undefined,
      is_active: (typeof b.isActive === 'boolean' ? b.isActive : b.is_active) ?? undefined,
    };
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);
    const { data: updatedSession, error } = await supabase.from('sessions').update(updates).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    
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
    if (!requireSupabase(res)) return;
    const { error } = await supabase.from('sessions').delete().eq('id', req.params.id);
    const success = !error;
    
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

    // Block legacy metadata JSON usage — metadata is now in Supabase
    if (String(fileId).startsWith('metadata/')) {
      return res.status(410).json({ error: 'Legacy metadata file is no longer used. Metadata is stored in Supabase.' });
    }

    const wasabiConfig = await getWasabiConfigFromServer();

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
    if (!requireSupabase(res)) return;
    const { data: config, error } = await supabase.from('site_config').select('*').limit(1).maybeSingle();
    if (error) throw error;

    // Merge ENV overrides
    const envWasabi = {
      accessKey: process.env.WASABI_ACCESS_KEY || undefined,
      secretKey: process.env.WASABI_SECRET_KEY || undefined,
      region: process.env.WASABI_REGION || undefined,
      bucket: process.env.WASABI_BUCKET || undefined,
      endpoint: process.env.WASABI_ENDPOINT || undefined,
    };
    const merged = {
      ...(config || {}),
      stripe_publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || (config?.stripe_publishable_key ?? ''),
      stripe_secret_key: process.env.STRIPE_SECRET_KEY || (config?.stripe_secret_key ?? ''),
      paypal_client_id: process.env.PAYPAL_CLIENT_ID || (config?.paypal_client_id ?? ''),
      paypal_me_username: config?.paypal_me_username ?? '',
      site_name: config?.site_name ?? '',
      telegram_username: config?.telegram_username ?? '',
      video_list_title: config?.video_list_title ?? '',
      crypto: Array.isArray(config?.crypto) ? config.crypto : [],
      email: config?.email || {},
      wasabi_config: {
        ...(config?.wasabi_config || {}),
        ...Object.fromEntries(Object.entries(envWasabi).filter(([_, v]) => v))
      }
    };
    res.json(merged);
  } catch (error) {
    console.error('Error fetching site config:', error);
    res.status(500).json({ error: 'Failed to fetch site config' });
  }
});

// PUT /api/site-config - Atualizar configurações do site
router.put('/site-config', async (req, res) => {
  try {
    if (!requireSupabase(res)) return;
    const payload = { ...req.body } || {};
    // Normalize and validate wasabi_config when provided
    if (payload.wasabi_config) {
      const cfg = payload.wasabi_config;
      const accessKey = (cfg.accessKey || cfg.access_key || '').trim();
      const secretKey = (cfg.secretKey || cfg.secret_key || '').trim();
      const region = (cfg.region || '').trim();
      const bucket = (cfg.bucket || '').trim();
      const endpoint = (cfg.endpoint || '').trim();
      if (!accessKey || !secretKey || !region || !bucket || !endpoint) {
        return res.status(400).json({ error: 'All Wasabi fields are required: accessKey, secretKey, region, bucket, endpoint' });
      }
      payload.wasabi_config = { accessKey, secretKey, region, bucket, endpoint };
    }

    // Trim simple strings to avoid storing accidental whitespace
    const trimIfString = (v) => typeof v === 'string' ? v.trim() : v;
    payload.site_name = trimIfString(payload.site_name);
    payload.paypal_client_id = trimIfString(payload.paypal_client_id);
    payload.paypal_me_username = trimIfString(payload.paypal_me_username);
    payload.stripe_publishable_key = trimIfString(payload.stripe_publishable_key);
    payload.stripe_secret_key = trimIfString(payload.stripe_secret_key);
    payload.telegram_username = trimIfString(payload.telegram_username);
    payload.video_list_title = trimIfString(payload.video_list_title);

    const { data: existing } = await supabase.from('site_config').select('id').limit(1).maybeSingle();
    const write = existing
      ? supabase.from('site_config').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', existing.id).select('*').single()
      : supabase.from('site_config').insert({ ...payload, updated_at: new Date().toISOString() }).select('*').single();
    const { data, error } = await write;
    if (error) throw error;
    res.json(data);
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

    if (!requireSupabase(res)) return;
    const { data: siteConfig, error: cfgErr } = await supabase.from('site_config').select('stripe_secret_key').limit(1).maybeSingle();
    if (cfgErr) throw cfgErr;
    const stripeSecretKey = siteConfig?.stripe_secret_key;

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

    const wasabiConfig = await getWasabiConfigFromServer();
    if (!wasabiConfig) {
      console.error('Wasabi configuration not found for delete operation');
      return res.status(500).json({ error: 'Wasabi configuration not found' });
    }
    
    console.log('Wasabi config for delete:', {
      region: wasabiConfig.region,
      bucket: wasabiConfig.bucket,
      endpoint: wasabiConfig.endpoint,
      hasAccessKey: !!wasabiConfig.accessKey,
      hasSecretKey: !!wasabiConfig.secretKey
    });

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
// Removido - usando Wasabi diretamente como fonte principal

// Verificar status do backup
router.get('/backup/status', async (req, res) => {
  try {
    const wasabiConfig = await getWasabiConfigFromServer();

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

    const wasabiConfig = await getWasabiConfigFromServer();

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
    console.log('Incoming file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    const wasabiConfig = await getWasabiConfigFromServer();

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
    console.log('Generated Wasabi key:', fileName);

    // Fazer upload para o Wasabi
    const uploadCommand = new PutObjectCommand({
      Bucket: wasabiConfig.bucket,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3Client.send(uploadCommand);
    console.log('Wasabi upload success:', fileName);

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
