// WasabiBackendService - Serviço backend para gerenciar dados no Wasabi
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

class WasabiBackendService {
  constructor() {
    this.s3Client = null;
    this.METADATA_KEY = 'metadata/videosplus-data.json';
  }

  // Inicializar cliente S3
  async initializeS3Client() {
    if (this.s3Client) return;

    const config = {
      region: process.env.VITE_WASABI_REGION || '',
      endpoint: process.env.VITE_WASABI_ENDPOINT || '',
      credentials: {
        accessKeyId: process.env.VITE_WASABI_ACCESS_KEY || '',
        secretAccessKey: process.env.VITE_WASABI_SECRET_KEY || '',
      },
      forcePathStyle: true,
    };

    this.s3Client = new S3Client(config);
  }

  // Carregar dados do Wasabi
  async loadDataFromWasabi() {
    try {
      await this.initializeS3Client();
      
      const command = new GetObjectCommand({
        Bucket: process.env.VITE_WASABI_BUCKET || '',
        Key: this.METADATA_KEY,
      });

      const response = await this.s3Client.send(command);
      const data = await response.Body.transformToString();
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading data from Wasabi:', error);
      
      // Retornar dados padrão se não conseguir carregar
      return {
        videos: [],
        users: [
          {
            id: 'admin-001',
            email: 'admin@gmail.com',
            name: 'Administrador',
            password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
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
            accessKey: process.env.VITE_WASABI_ACCESS_KEY || '',
            secretKey: process.env.VITE_WASABI_SECRET_KEY || '',
            region: process.env.VITE_WASABI_REGION || '',
            bucket: process.env.VITE_WASABI_BUCKET || '',
            endpoint: process.env.VITE_WASABI_ENDPOINT || ''
          }
        }
      };
    }
  }

  // Salvar dados no Wasabi
  async saveDataToWasabi(data) {
    try {
      await this.initializeS3Client();
      
      const command = new PutObjectCommand({
        Bucket: process.env.VITE_WASABI_BUCKET || '',
        Key: this.METADATA_KEY,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
      });

      await this.s3Client.send(command);
      console.log('Data saved to Wasabi successfully');
    } catch (error) {
      console.error('Error saving data to Wasabi:', error);
      throw error;
    }
  }

  // ===== VÍDEOS =====
  
  async getAllVideos() {
    const data = await this.loadDataFromWasabi();
    return data.videos || [];
  }

  async getVideo(id) {
    const videos = await this.getAllVideos();
    return videos.find(video => video.id === id) || null;
  }

  async createVideo(videoData) {
    const data = await this.loadDataFromWasabi();
    
    const newVideo = {
      ...videoData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      views: 0
    };
    
    if (!data.videos) data.videos = [];
    data.videos.push(newVideo);
    
    await this.saveDataToWasabi(data);
    return newVideo;
  }

  async updateVideo(id, updates) {
    const data = await this.loadDataFromWasabi();
    
    if (!data.videos) return null;
    
    const videoIndex = data.videos.findIndex(video => video.id === id);
    if (videoIndex === -1) return null;
    
    data.videos[videoIndex] = { ...data.videos[videoIndex], ...updates };
    await this.saveDataToWasabi(data);
    return data.videos[videoIndex];
  }

  async deleteVideo(id) {
    const data = await this.loadDataFromWasabi();
    
    if (!data.videos) return false;
    
    const videoIndex = data.videos.findIndex(video => video.id === id);
    if (videoIndex === -1) return false;
    
    data.videos.splice(videoIndex, 1);
    await this.saveDataToWasabi(data);
    return true;
  }

  async incrementVideoViews(id) {
    const data = await this.loadDataFromWasabi();
    
    if (!data.videos) return;
    
    const video = data.videos.find(video => video.id === id);
    if (video) {
      video.views = (video.views || 0) + 1;
      await this.saveDataToWasabi(data);
    }
  }

  // ===== USUÁRIOS =====
  
  async getAllUsers() {
    const data = await this.loadDataFromWasabi();
    return data.users || [];
  }

  async getUser(id) {
    const users = await this.getAllUsers();
    return users.find(user => user.id === id) || null;
  }

  async getUserByEmail(email) {
    const users = await this.getAllUsers();
    return users.find(user => user.email === email) || null;
  }

  async createUser(userData) {
    const data = await this.loadDataFromWasabi();
    
    const newUser = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    if (!data.users) data.users = [];
    data.users.push(newUser);
    
    await this.saveDataToWasabi(data);
    return newUser;
  }

  async updateUser(id, updates) {
    const data = await this.loadDataFromWasabi();
    
    if (!data.users) return null;
    
    const userIndex = data.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    data.users[userIndex] = { ...data.users[userIndex], ...updates };
    await this.saveDataToWasabi(data);
    return data.users[userIndex];
  }

  async deleteUser(id) {
    const data = await this.loadDataFromWasabi();
    
    if (!data.users) return false;
    
    const userIndex = data.users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;
    
    data.users.splice(userIndex, 1);
    await this.saveDataToWasabi(data);
    return true;
  }

  // ===== SESSÕES =====
  
  async getAllSessions() {
    const data = await this.loadDataFromWasabi();
    return data.sessions || [];
  }

  async getSessionByToken(token) {
    const sessions = await this.getAllSessions();
    return sessions.find(session => session.token === token && session.isActive) || null;
  }

  async createSession(sessionData) {
    const data = await this.loadDataFromWasabi();
    
    const newSession = {
      ...sessionData,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    if (!data.sessions) data.sessions = [];
    data.sessions.push(newSession);
    
    await this.saveDataToWasabi(data);
    return newSession;
  }

  async updateSession(id, updates) {
    const data = await this.loadDataFromWasabi();
    
    if (!data.sessions) return null;
    
    const sessionIndex = data.sessions.findIndex(session => session.id === id);
    if (sessionIndex === -1) return null;
    
    data.sessions[sessionIndex] = { ...data.sessions[sessionIndex], ...updates };
    await this.saveDataToWasabi(data);
    return data.sessions[sessionIndex];
  }

  async deleteSession(id) {
    const data = await this.loadDataFromWasabi();
    
    if (!data.sessions) return false;
    
    const sessionIndex = data.sessions.findIndex(session => session.id === id);
    if (sessionIndex === -1) return false;
    
    data.sessions.splice(sessionIndex, 1);
    await this.saveDataToWasabi(data);
    return true;
  }

  // ===== CONFIGURAÇÃO DO SITE =====
  
  async getSiteConfig() {
    const data = await this.loadDataFromWasabi();
    return data.siteConfig || null;
  }

  async updateSiteConfig(config) {
    const data = await this.loadDataFromWasabi();
    
    data.siteConfig = { ...data.siteConfig, ...config };
    await this.saveDataToWasabi(data);
    return data.siteConfig;
  }

  // ===== UTILITÁRIOS =====
  
  generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Instância singleton
export const wasabiBackendService = new WasabiBackendService();
export default WasabiBackendService;
