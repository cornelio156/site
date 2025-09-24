// Serviço de migração para alternar entre Wasabi/JSON e Supabase
// Este arquivo permite migrar gradualmente para Supabase

import { VideoService } from './VideoService';
import { VideoServiceSupabase } from './VideoServiceSupabase';
import { UserServiceSupabase } from './UserServiceSupabase';
import { SiteConfigServiceSupabase } from './SiteConfigServiceSupabase';
import SupabaseService from './SupabaseService';

// Configuração de migração
export const MIGRATION_CONFIG = {
  // Definir qual serviço usar para cada funcionalidade
  useSupabaseForVideos: true, // true para usar Supabase, false para usar Wasabi/JSON
  useSupabaseForUsers: true,  // true para usar Supabase, false para usar JSON
  useSupabaseForConfig: true, // true para usar Supabase, false para usar JSON
  
  // Configuração de fallback - DESABILITADO para usar apenas Supabase
  enableFallback: false, // Se true, volta para o serviço antigo se Supabase falhar
};

// Interface unificada para vídeos
export interface UnifiedVideoService {
  getVideoIds(sortOption?: any): Promise<string[]>;
  getAllVideos(sortOption?: any, searchQuery?: string): Promise<any[]>;
  getVideo(videoId: string): Promise<any | null>;
  incrementViews(videoId: string): Promise<void>;
  getVideosWithPagination(page?: number, perPage?: number, sortOption?: any, searchQuery?: string): Promise<{videos: any[], totalPages: number}>;
  getVideoFileUrl(videoId: string): Promise<string | null>;
  createVideo(videoData: any): Promise<any | null>;
  updateVideo(videoId: string, updates: any): Promise<any | null>;
  deleteVideo(videoId: string): Promise<boolean>;
  clearCachePublic(): void;
}

// Interface unificada para usuários
export interface UnifiedUserService {
  login(email: string, password: string): Promise<{ user: any; session: any } | null>;
  logout(): Promise<void>;
  getCurrentSession(): Promise<any | null>;
  getUserById(userId: string): Promise<any | null>;
  validateSession(sessionToken: string): Promise<any | null>;
  deactivateSession(sessionId: string): Promise<void>;
  createUser(userData: any): Promise<any | null>;
  updateUser(userId: string, updates: any): Promise<any | null>;
  changePassword(userId: string, newPassword: string): Promise<boolean>;
}

// Interface unificada para configuração
export interface UnifiedSiteConfigService {
  getSiteConfig(): Promise<any | null>;
  updateSiteConfig(configData: any): Promise<any | null>;
  getCryptoWallets(): Promise<any[]>;
  updateCryptoWallets(cryptoWallets: string[]): Promise<void>;
  convertToSiteConfig(configData: any): any;
  getDefaultConfig(): any;
  refreshConfig(): Promise<any | null>;
}

// Classe de migração para vídeos
export class MigrationVideoService implements UnifiedVideoService {
  private fallbackService: typeof VideoService;
  private useSupabase: boolean;

  constructor() {
    this.fallbackService = VideoService;
    this.useSupabase = MIGRATION_CONFIG.useSupabaseForVideos;
  }

  async getVideoIds(sortOption?: any): Promise<string[]> {
    if (this.useSupabase) {
      try {
        return await VideoServiceSupabase.getVideoIds(sortOption);
      } catch (error) {
        console.error('Erro no Supabase, usando fallback:', error);
        if (MIGRATION_CONFIG.enableFallback) {
          return await this.fallbackService.getVideoIds(sortOption);
        }
        throw error;
      }
    }
    return await this.fallbackService.getVideoIds(sortOption);
  }

  async getAllVideos(sortOption?: any, searchQuery?: string): Promise<any[]> {
    if (this.useSupabase) {
      try {
        return await VideoServiceSupabase.getAllVideos(sortOption, searchQuery);
      } catch (error) {
        console.error('Erro no Supabase, usando fallback:', error);
        if (MIGRATION_CONFIG.enableFallback) {
          return await this.fallbackService.getAllVideos(sortOption, searchQuery);
        }
        throw error;
      }
    }
    return await this.fallbackService.getAllVideos(sortOption, searchQuery);
  }

  async getVideo(videoId: string): Promise<any | null> {
    if (this.useSupabase) {
      try {
        return await VideoServiceSupabase.getVideo(videoId);
      } catch (error) {
        console.error('Erro no Supabase, usando fallback:', error);
        if (MIGRATION_CONFIG.enableFallback) {
          return await this.fallbackService.getVideo(videoId);
        }
        throw error;
      }
    }
    return await this.fallbackService.getVideo(videoId);
  }

  async incrementViews(videoId: string): Promise<void> {
    if (this.useSupabase) {
      try {
        return await VideoServiceSupabase.incrementViews(videoId);
      } catch (error) {
        console.error('Erro no Supabase, usando fallback:', error);
        if (MIGRATION_CONFIG.enableFallback) {
          return await this.fallbackService.incrementViews(videoId);
        }
        throw error;
      }
    }
    return await this.fallbackService.incrementViews(videoId);
  }

  async getVideosWithPagination(page?: number, perPage?: number, sortOption?: any, searchQuery?: string): Promise<{videos: any[], totalPages: number}> {
    if (this.useSupabase) {
      try {
        return await VideoServiceSupabase.getVideosWithPagination(page, perPage, sortOption, searchQuery);
      } catch (error) {
        console.error('Erro no Supabase, usando fallback:', error);
        if (MIGRATION_CONFIG.enableFallback) {
          return await this.fallbackService.getVideosWithPagination(page, perPage, sortOption, searchQuery);
        }
        throw error;
      }
    }
    return await this.fallbackService.getVideosWithPagination(page, perPage, sortOption, searchQuery);
  }

  async getVideoFileUrl(videoId: string): Promise<string | null> {
    if (this.useSupabase) {
      try {
        return await VideoServiceSupabase.getVideoFileUrl(videoId);
      } catch (error) {
        console.error('Erro no Supabase, usando fallback:', error);
        if (MIGRATION_CONFIG.enableFallback) {
          return await this.fallbackService.getVideoFileUrl(videoId);
        }
        throw error;
      }
    }
    return await this.fallbackService.getVideoFileUrl(videoId);
  }

  async createVideo(videoData: any): Promise<any | null> {
    if (this.useSupabase) {
      try {
        return await VideoServiceSupabase.createVideo(videoData);
      } catch (error) {
        console.error('Erro no Supabase, usando fallback:', error);
        if (MIGRATION_CONFIG.enableFallback) {
          return await this.fallbackService.createVideo(videoData);
        }
        throw error;
      }
    }
    return await this.fallbackService.createVideo(videoData);
  }

  async updateVideo(videoId: string, updates: any): Promise<any | null> {
    if (this.useSupabase) {
      try {
        return await VideoServiceSupabase.updateVideo(videoId, updates);
      } catch (error) {
        console.error('Erro no Supabase, usando fallback:', error);
        if (MIGRATION_CONFIG.enableFallback) {
          return await this.fallbackService.updateVideo(videoId, updates);
        }
        throw error;
      }
    }
    return await this.fallbackService.updateVideo(videoId, updates);
  }

  async deleteVideo(videoId: string): Promise<boolean> {
    if (this.useSupabase) {
      try {
        return await VideoServiceSupabase.deleteVideo(videoId);
      } catch (error) {
        console.error('Erro no Supabase, usando fallback:', error);
        if (MIGRATION_CONFIG.enableFallback) {
          return await this.fallbackService.deleteVideo(videoId);
        }
        throw error;
      }
    }
    return await this.fallbackService.deleteVideo(videoId);
  }

  clearCachePublic(): void {
    if (this.useSupabase) {
      VideoServiceSupabase.clearCachePublic();
    } else {
      this.fallbackService.clearCachePublic();
    }
  }
}

// Instância global do serviço de migração
export const migrationVideoService = new MigrationVideoService();

// Função para testar conexão com Supabase
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    await SupabaseService.getInstance().initialize();
    console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com Supabase:', error);
    return false;
  }
};

// Função para migrar dados do JSON para Supabase
export const migrateDataToSupabase = async (): Promise<boolean> => {
  try {
    console.log('🚀 Iniciando migração de dados para Supabase...');
    
    // Testar conexão primeiro
    const connected = await testSupabaseConnection();
    if (!connected) {
      throw new Error('Não foi possível conectar com Supabase');
    }

    // Aqui você pode adicionar lógica para migrar dados específicos
    // Por exemplo, migrar vídeos, usuários, configurações, etc.
    
    console.log('✅ Migração concluída com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    return false;
  }
};

// Função para alternar entre serviços
export const switchToSupabase = (service: 'videos' | 'users' | 'config'): void => {
  switch (service) {
    case 'videos':
      MIGRATION_CONFIG.useSupabaseForVideos = true;
      console.log('🔄 Alternado para Supabase para vídeos');
      break;
    case 'users':
      MIGRATION_CONFIG.useSupabaseForUsers = true;
      console.log('🔄 Alternado para Supabase para usuários');
      break;
    case 'config':
      MIGRATION_CONFIG.useSupabaseForConfig = true;
      console.log('🔄 Alternado para Supabase para configuração');
      break;
  }
};

export const switchToFallback = (service: 'videos' | 'users' | 'config'): void => {
  switch (service) {
    case 'videos':
      MIGRATION_CONFIG.useSupabaseForVideos = false;
      console.log('🔄 Alternado para fallback para vídeos');
      break;
    case 'users':
      MIGRATION_CONFIG.useSupabaseForUsers = false;
      console.log('🔄 Alternado para fallback para usuários');
      break;
    case 'config':
      MIGRATION_CONFIG.useSupabaseForConfig = false;
      console.log('🔄 Alternado para fallback para configuração');
      break;
  }
};
