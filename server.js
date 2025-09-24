import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './api-routes.js';
// SQLite removido - usando Supabase como fonte principal para metadados
// Wasabi usado apenas para armazenamento de arquivos (vídeos/thumbnails)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // In production, allow ALL domains - completamente aberto
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    
    // For any other case, allow the request
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('dist'));

// JSON files removed - using Supabase for all metadata

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
    console.log('Iniciando servidor com Supabase como fonte principal...');
    
    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('✅ Servidor iniciado com sucesso!');
      console.log('📊 Usando Supabase para todos os metadados');
      console.log('🔗 Wasabi usado apenas para armazenamento de arquivos (vídeos/thumbnails)');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();