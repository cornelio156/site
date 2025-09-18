// SQLiteDatabaseService - Serviço para gerenciar dados em SQLite
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SQLiteDatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      try {
        // Caminho do banco de dados
        const dbPath = path.join(process.cwd(), 'data', 'videos.db');
        
        // Garantir que o diretório existe
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        // Conectar ao banco
        this.db = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            console.error('Error opening database:', err);
            reject(err);
            return;
          }
          
          console.log('Connected to SQLite database');
          this.createTables().then(() => {
            this.isInitialized = true;
            resolve();
          }).catch(reject);
        });
      } catch (error) {
        console.error('Error initializing SQLite database:', error);
        reject(error);
      }
    });
  }

  async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const createTablesSQL = `
        -- Tabela de vídeos
        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          duration TEXT,
          videoFileId TEXT,
          thumbnailFileId TEXT,
          thumbnailUrl TEXT,
          isPurchased BOOLEAN DEFAULT 0,
          createdAt TEXT NOT NULL,
          views INTEGER DEFAULT 0,
          productLink TEXT,
          isActive BOOLEAN DEFAULT 1
        );

        -- Tabela de usuários
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );

        -- Tabela de sessões
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expiresAt TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          isActive BOOLEAN DEFAULT 1,
          FOREIGN KEY (userId) REFERENCES users (id)
        );

        -- Tabela de configuração do site
        CREATE TABLE IF NOT EXISTS site_config (
          id TEXT PRIMARY KEY,
          siteName TEXT,
          paypalClientId TEXT,
          paypalMeUsername TEXT,
          stripePublishableKey TEXT,
          stripeSecretKey TEXT,
          telegramUsername TEXT,
          videoListTitle TEXT,
          crypto TEXT,
          emailHost TEXT,
          emailPort TEXT,
          emailSecure BOOLEAN,
          emailUser TEXT,
          emailPass TEXT,
          emailFrom TEXT,
          wasabiConfig TEXT,
          updatedAt TEXT NOT NULL
        );

        -- Índices para melhor performance
        CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
        CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(createdAt);
        CREATE INDEX IF NOT EXISTS idx_videos_is_active ON videos(isActive);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(userId);
      `;

      this.db.exec(createTablesSQL, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('Tables created successfully');
          resolve();
        }
      });
    });
  }

  async checkInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // ===== VÍDEOS =====
  
  async getAllVideos() {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('SELECT * FROM videos WHERE isActive = 1 ORDER BY createdAt DESC');
      stmt.all((err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getVideo(id) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('SELECT * FROM videos WHERE id = ?');
      stmt.get(id, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async createVideo(video) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const now = new Date().toISOString();
      
      const newVideo = {
        ...video,
        id,
        createdAt: now,
        views: 0
      };

      const stmt = this.db.prepare(`
        INSERT INTO videos (
          id, title, description, price, duration, videoFileId, 
          thumbnailFileId, thumbnailUrl, isPurchased, createdAt, 
          views, productLink, isActive
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        newVideo.id,
        newVideo.title,
        newVideo.description,
        newVideo.price,
        newVideo.duration,
        newVideo.videoFileId,
        newVideo.thumbnailFileId,
        newVideo.thumbnailUrl,
        newVideo.isPurchased ? 1 : 0,
        newVideo.createdAt,
        newVideo.views,
        newVideo.productLink,
        newVideo.isActive ? 1 : 0,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(newVideo);
          }
        }
      );
    });
  }

  async updateVideo(id, updates) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      // Primeiro, obter o vídeo existente
      this.getVideo(id).then(existingVideo => {
        if (!existingVideo) {
          resolve(null);
          return;
        }

        const updatedVideo = { ...existingVideo, ...updates };

        const stmt = this.db.prepare(`
          UPDATE videos SET 
            title = ?, description = ?, price = ?, duration = ?, 
            videoFileId = ?, thumbnailFileId = ?, thumbnailUrl = ?, 
            isPurchased = ?, productLink = ?, isActive = ?
          WHERE id = ?
        `);

        stmt.run(
          updatedVideo.title,
          updatedVideo.description,
          updatedVideo.price,
          updatedVideo.duration,
          updatedVideo.videoFileId,
          updatedVideo.thumbnailFileId,
          updatedVideo.thumbnailUrl,
          updatedVideo.isPurchased ? 1 : 0,
          updatedVideo.productLink,
          updatedVideo.isActive ? 1 : 0,
          id,
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(updatedVideo);
            }
          }
        );
      }).catch(reject);
    });
  }

  async deleteVideo(id) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('DELETE FROM videos WHERE id = ?');
      stmt.run(id, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  async incrementVideoViews(id) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('UPDATE videos SET views = views + 1 WHERE id = ?');
      stmt.run(id, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // ===== USUÁRIOS =====
  
  async getAllUsers() {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('SELECT * FROM users ORDER BY createdAt DESC');
      stmt.all((err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getUser(id) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      stmt.get(id, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getUserByEmail(email) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
      stmt.get(email, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async createUser(user) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const now = new Date().toISOString();
      
      const newUser = {
        ...user,
        id,
        createdAt: now
      };

      const stmt = this.db.prepare('INSERT INTO users (id, email, name, password, createdAt) VALUES (?, ?, ?, ?, ?)');
      stmt.run(newUser.id, newUser.email, newUser.name, newUser.password, newUser.createdAt, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(newUser);
        }
      });
    });
  }

  async updateUser(id, updates) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.getUser(id).then(existingUser => {
        if (!existingUser) {
          resolve(null);
          return;
        }

        const updatedUser = { ...existingUser, ...updates };

        const stmt = this.db.prepare('UPDATE users SET email = ?, name = ?, password = ? WHERE id = ?');
        stmt.run(updatedUser.email, updatedUser.name, updatedUser.password, id, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(updatedUser);
          }
        });
      }).catch(reject);
    });
  }

  async deleteUser(id) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
      stmt.run(id, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  // ===== SESSÕES =====
  
  async createSession(session) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const now = new Date().toISOString();
      
      const newSession = {
        ...session,
        id,
        createdAt: now
      };

      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, userId, token, expiresAt, createdAt, isActive) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        newSession.id,
        newSession.userId,
        newSession.token,
        newSession.expiresAt,
        newSession.createdAt,
        newSession.isActive ? 1 : 0,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(newSession);
          }
        }
      );
    });
  }

  async getSessionByToken(token) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('SELECT * FROM sessions WHERE token = ? AND isActive = 1');
      stmt.get(token, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updateSession(id, updates) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.getSessionByToken(id).then(existingSession => {
        if (!existingSession) {
          resolve(null);
          return;
        }

        const updatedSession = { ...existingSession, ...updates };

        const stmt = this.db.prepare('UPDATE sessions SET isActive = ? WHERE id = ?');
        stmt.run(updatedSession.isActive ? 1 : 0, id, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(updatedSession);
          }
        });
      }).catch(reject);
    });
  }

  async getAllSessions() {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY createdAt DESC');
      stmt.all((err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async deleteSession(id) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
      stmt.run(id, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  // ===== CONFIGURAÇÃO DO SITE =====
  
  async getSiteConfig() {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('SELECT * FROM site_config ORDER BY updatedAt DESC LIMIT 1');
      stmt.get((err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          const result = row;
          resolve({
            ...result,
            crypto: result.crypto ? JSON.parse(result.crypto) : [],
            wasabiConfig: result.wasabiConfig ? JSON.parse(result.wasabiConfig) : {}
          });
        }
      });
    });
  }

  async updateSiteConfig(config) {
    await this.checkInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const id = 'site-config';
      
      const configData = {
        id,
        siteName: config.siteName || 'VideosPlus',
        paypalClientId: config.paypalClientId || '',
        paypalMeUsername: config.paypalMeUsername || '',
        stripePublishableKey: config.stripePublishableKey || '',
        stripeSecretKey: config.stripeSecretKey || '',
        telegramUsername: config.telegramUsername || '',
        videoListTitle: config.videoListTitle || 'Available Videos',
        crypto: JSON.stringify(config.crypto || []),
        emailHost: config.emailHost || 'smtp.gmail.com',
        emailPort: config.emailPort || '587',
        emailSecure: config.emailSecure || false,
        emailUser: config.emailUser || '',
        emailPass: config.emailPass || '',
        emailFrom: config.emailFrom || '',
        wasabiConfig: JSON.stringify(config.wasabiConfig || {}),
        updatedAt: now
      };

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO site_config (
          id, siteName, paypalClientId, paypalMeUsername, stripePublishableKey,
          stripeSecretKey, telegramUsername, videoListTitle, crypto, emailHost,
          emailPort, emailSecure, emailUser, emailPass, emailFrom, wasabiConfig, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        configData.id,
        configData.siteName,
        configData.paypalClientId,
        configData.paypalMeUsername,
        configData.stripePublishableKey,
        configData.stripeSecretKey,
        configData.telegramUsername,
        configData.videoListTitle,
        configData.crypto,
        configData.emailHost,
        configData.emailPort,
        configData.emailSecure ? 1 : 0,
        configData.emailUser,
        configData.emailPass,
        configData.emailFrom,
        configData.wasabiConfig,
        configData.updatedAt,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              ...configData,
              crypto: JSON.parse(configData.crypto),
              wasabiConfig: JSON.parse(configData.wasabiConfig)
            });
          }
        }
      );
    });
  }

  // ===== UTILITÁRIOS =====
  
  generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // ===== BACKUP E RESTAURAÇÃO =====
  
  // Fazer backup de todos os dados para Wasabi
  async backupToWasabi() {
    try {
      await this.checkInitialized();
      
      const backupData = {
        videos: await this.getAllVideos(),
        users: await this.getAllUsers(),
        sessions: await this.getAllSessions(),
        siteConfig: await this.getSiteConfig(),
        backupDate: new Date().toISOString(),
        version: '1.0'
      };

      // Salvar backup localmente primeiro
      const backupPath = path.join(process.cwd(), 'data', 'backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      
      console.log('Backup local criado com sucesso');
      return backupData;
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      throw error;
    }
  }

  // Restaurar dados do Wasabi
  async restoreFromWasabi(backupData) {
    try {
      await this.checkInitialized();
      
      if (!backupData || !backupData.videos) {
        throw new Error('Dados de backup inválidos');
      }

      console.log('Iniciando restauração dos dados...');
      
      // Limpar tabelas existentes
      await this.clearAllTables();
      
      // Restaurar vídeos
      for (const video of backupData.videos) {
        await this.createVideo(video);
      }
      
      // Restaurar usuários
      for (const user of backupData.users) {
        await this.createUser(user);
      }
      
      // Restaurar sessões
      for (const session of backupData.sessions) {
        await this.createSession(session);
      }
      
      // Restaurar configuração do site
      if (backupData.siteConfig) {
        await this.updateSiteConfig(backupData.siteConfig);
      }
      
      console.log('Restauração concluída com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao restaurar dados:', error);
      throw error;
    }
  }

  // Limpar todas as tabelas
  async clearAllTables() {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const clearSQL = `
        DELETE FROM sessions;
        DELETE FROM users;
        DELETE FROM videos;
        DELETE FROM site_config;
      `;
      
      this.db.exec(clearSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Tabelas limpas com sucesso');
          resolve();
        }
      });
    });
  }

  // Verificar se existe backup no Wasabi
  async checkWasabiBackup() {
    try {
      const siteConfig = await this.getSiteConfig();
      if (!siteConfig || !siteConfig.wasabiConfig) {
        return false;
      }

      // Aqui você implementaria a lógica para verificar se existe backup no Wasabi
      // Por enquanto, retornamos false
      return false;
    } catch (error) {
      console.error('Erro ao verificar backup no Wasabi:', error);
      return false;
    }
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Instância singleton
export const sqliteDatabaseService = new SQLiteDatabaseService();