import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Obter configuração do Supabase
      const config = getSupabaseConfig();
      this.config = {
        url: config.url,
        anonKey: config.anonKey
      };

      this.client = createClient(this.config.url, this.config.anonKey);
      
      // Testar conexão
      const { data, error } = await this.client.from('videos').select('count').limit(1);
      
      if (error) {
        console.error('Erro ao conectar com Supabase:', error);
        throw new Error(`Falha na conexão com Supabase: ${error.message}`);
      }

      this.isInitialized = true;
      console.log('Supabase inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar Supabase:', error);
      throw error;
    }
  }

  async checkInitialized(): Promise<void> {
    if (!this.isInitialized || !this.client) {
      await this.initialize();
    }
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase não foi inicializado. Chame initialize() primeiro.');
    }
    return this.client;
  }

  // Métodos para vídeos
  async getVideos(): Promise<any[]> {
    await this.checkInitialized();
    const { data, error } = await this.client!.from('videos').select('*').eq('is_active', true).order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar vídeos:', error);
      throw error;
    }
    
    return data || [];
  }

  async getVideo(id: string): Promise<any | null> {
    await this.checkInitialized();
    const { data, error } = await this.client!.from('videos').select('*').eq('id', id).eq('is_active', true).single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Vídeo não encontrado
      }
      console.error('Erro ao buscar vídeo:', error);
      throw error;
    }
    
    return data;
  }

  async incrementVideoViews(id: string): Promise<void> {
    await this.checkInitialized();
    
    try {
      // Primeiro, buscar o vídeo atual para obter o número de views
      const { data: video, error: fetchError } = await this.client!
        .from('videos')
        .select('views')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Erro ao buscar vídeo para incrementar views:', fetchError);
        return;
      }
      
      // Incrementar as views
      const currentViews = video?.views || 0;
      const { error: updateError } = await this.client!
        .from('videos')
        .update({ views: currentViews + 1 })
        .eq('id', id);
      
      if (updateError) {
        console.error('Erro ao incrementar views:', updateError);
      }
    } catch (error) {
      console.error('Erro ao incrementar views:', error);
    }
  }

  // Métodos para usuários
  async getUserByEmail(email: string): Promise<any | null> {
    await this.checkInitialized();
    const { data, error } = await this.client!.from('users').select('*').eq('email', email).single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Usuário não encontrado
      }
      console.error('Erro ao buscar usuário:', error);
      throw error;
    }
    
    return data;
  }

  async getUserById(id: string): Promise<any | null> {
    await this.checkInitialized();
    const { data, error } = await this.client!.from('users').select('*').eq('id', id).single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Usuário não encontrado
      }
      console.error('Erro ao buscar usuário por ID:', error);
      throw error;
    }
    
    return data;
  }

  async createUser(userData: any): Promise<any> {
    await this.checkInitialized();
    
    // Generate a unique ID if not provided
    const userWithId = {
      id: userData.id || this.generateId(),
      ...userData
    };
    
    const { data, error } = await this.client!.from('users').insert(userWithId).select().single();
    
    if (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
    
    return data;
  }

  // Generate a unique ID
  private generateId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Métodos para sessões
  async createSession(sessionData: any): Promise<any> {
    await this.checkInitialized();
    const { data, error } = await this.client!.from('sessions').insert(sessionData).select().single();
    
    if (error) {
      console.error('Erro ao criar sessão:', error);
      throw error;
    }
    
    return data;
  }

  async getSessionByToken(token: string): Promise<any | null> {
    await this.checkInitialized();
    const { data, error } = await this.client!.from('sessions').select('*').eq('token', token).eq('is_active', true).single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Sessão não encontrada
      }
      console.error('Erro ao buscar sessão:', error);
      throw error;
    }
    
    return data;
  }

  async updateSession(id: string, updates: any): Promise<void> {
    await this.checkInitialized();
    const { error } = await this.client!.from('sessions').update(updates).eq('id', id);
    
    if (error) {
      console.error('Erro ao atualizar sessão:', error);
      throw error;
    }
  }

  async deleteSession(id: string): Promise<void> {
    await this.checkInitialized();
    const { error } = await this.client!.from('sessions').delete().eq('id', id);
    
    if (error) {
      console.error('Erro ao deletar sessão:', error);
      throw error;
    }
  }

  // Métodos para configuração do site
  async getSiteConfig(): Promise<any | null> {
    await this.checkInitialized();
    const { data, error } = await this.client!.from('site_config').select('*').order('id', { ascending: false }).limit(1).single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Configuração não encontrada
      }
      console.error('Erro ao buscar configuração do site:', error);
      throw error;
    }
    
    return data;
  }

  async updateSiteConfig(configData: any): Promise<void> {
    await this.checkInitialized();
    const { error } = await this.client!.from('site_config').upsert(configData);
    
    if (error) {
      console.error('Erro ao atualizar configuração do site:', error);
      throw error;
    }
  }

  // Métodos para carteiras crypto
  async getCryptoWallets(): Promise<any[]> {
    await this.checkInitialized();
    const { data, error } = await this.client!.from('crypto_wallets').select('*').order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar carteiras crypto:', error);
      throw error;
    }
    
    return data || [];
  }
}

export default SupabaseService;
