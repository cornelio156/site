import { jsonDatabaseService } from './JSONDatabaseService';
import type { VideoData } from './WasabiMetadataService';
import { wasabiService } from './WasabiService';
import { VideoServiceSupabase } from './VideoServiceSupabase';
import { MIGRATION_CONFIG } from './MigrationService';

// Video interface - mantém compatibilidade com o frontend
export interface Video {
  $id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  videoFileId?: string;
  video_id?: string;
  thumbnailFileId?: string;
  thumbnail_id?: string;
  thumbnailUrl?: string;
  isPurchased?: boolean;
  createdAt: string;
  views: number;
  product_link?: string;
}

// Sort options
export enum SortOption {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  VIEWS_DESC = 'views_desc',
  DURATION_DESC = 'duration_desc'
}

export class VideoService {
  // Cache para vídeos para melhorar performance
  private static videosCache: Video[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 30 * 1000; // 30 segundos (reduzido para produção)

  // Método para limpar o cache
  private static clearCache(): void {
    this.videosCache = null;
    this.cacheTimestamp = 0;
    console.log('Video cache cleared');
  }

  // Método público para limpar o cache (para uso externo)
  public static clearCachePublic(): void {
    this.clearCache();
  }

  // Método para forçar atualização do cache
  private static async forceRefreshCache(): Promise<Video[]> {
    this.clearCache();
    return await this.getAllVideos();
  }

  // Verificar se o cache é válido
  private static isCacheValid(): boolean {
    return this.videosCache !== null && 
           this.cacheTimestamp > 0 && 
           (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  // Método para converter VideoData para Video (compatibilidade com frontend)
  private static convertVideoData(videoData: VideoData): Video {
    // Converter duration (inteiro em segundos) para formato string (MM:SS ou HH:MM:SS)
    let formattedDuration = '00:00';
    if (typeof videoData.duration === 'string') {
      formattedDuration = videoData.duration;
    } else if (typeof videoData.duration === 'number') {
      const totalSeconds = videoData.duration;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      if (minutes < 60) {
        formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        formattedDuration = `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    
    return {
      $id: videoData.id,
      title: videoData.title,
      description: videoData.description,
      price: videoData.price,
      duration: formattedDuration,
      videoFileId: videoData.videoFileId,
      video_id: videoData.videoFileId, // Para compatibilidade
      thumbnailFileId: videoData.thumbnailFileId,
      thumbnail_id: videoData.thumbnailFileId, // Para compatibilidade
      thumbnailUrl: videoData.thumbnailUrl,
      isPurchased: videoData.isPurchased || false,
      createdAt: videoData.createdAt,
      views: videoData.views,
      product_link: videoData.productLink || ''
    };
  }

  // Get only video IDs (fast operation without metadata)
  static async getVideoIds(sortOption: SortOption = SortOption.NEWEST): Promise<string[]> {
    try {
      console.log('Getting video IDs only (fast operation)');
      
      // Use Supabase only - no fallback
      if (MIGRATION_CONFIG.useSupabaseForVideos) {
        return await VideoServiceSupabase.getVideoIds(sortOption);
      }
      
      throw new Error('Supabase is required for video operations');
    } catch (error) {
      console.error('Error getting video IDs from Supabase:', error);
      throw error;
    }
  }

  // Get all videos with sorting options
  static async getAllVideos(sortOption: SortOption = SortOption.NEWEST, searchQuery: string = ''): Promise<Video[]> {
    try {
      // Use Supabase only - no fallback
      if (MIGRATION_CONFIG.useSupabaseForVideos) {
        return await VideoServiceSupabase.getAllVideos(sortOption, searchQuery);
      }
      
      throw new Error('Supabase is required for video operations');
    } catch (error) {
      console.error('Error getting videos from Supabase:', error);
      throw error;
    }
  }

  // Método para ordenar vídeos
  private static sortVideos(videos: Video[], sortOption: SortOption): Video[] {
    switch (sortOption) {
      case SortOption.NEWEST:
        return videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case SortOption.PRICE_ASC:
        return videos.sort((a, b) => a.price - b.price);
      case SortOption.PRICE_DESC:
        return videos.sort((a, b) => b.price - a.price);
      case SortOption.VIEWS_DESC:
        return videos.sort((a, b) => (b.views || 0) - (a.views || 0));
      case SortOption.DURATION_DESC:
        return videos.sort((a, b) => {
          const getDurationInSeconds = (duration: string) => {
            try {
              const parts = duration.split(':').map(Number);
              if (parts.length === 2) {
                return parts[0] * 60 + parts[1]; // formato MM:SS
              } else if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2]; // formato HH:MM:SS
              }
            } catch (error) {
              console.error('Erro ao analisar duração:', error);
            }
            return 0;
          };
          return getDurationInSeconds(b.duration) - getDurationInSeconds(a.duration);
        });
      default:
        return videos;
    }
  }
  
  // Get a single video by ID (optimized for fast loading)
  static async getVideo(videoId: string): Promise<Video | null> {
    try {
      console.log(`Getting single video ${videoId} (optimized)`);
      
      // Use Supabase only - no fallback
      if (MIGRATION_CONFIG.useSupabaseForVideos) {
        return await VideoServiceSupabase.getVideo(videoId);
      }
      
      throw new Error('Supabase is required for video operations');
    } catch (error) {
      console.error(`Error getting video ${videoId} from Supabase:`, error);
      return null;
    }
  }
  
  // Increment view count for a video
  static async incrementViews(videoId: string): Promise<void> {
    try {
      // Use Supabase only - no fallback
      if (MIGRATION_CONFIG.useSupabaseForVideos) {
        await VideoServiceSupabase.incrementViews(videoId);
        return;
      }
      
      throw new Error('Supabase is required for video operations');
    } catch (error) {
      console.error(`Error incrementing views for video ${videoId} from Supabase:`, error);
    }
  }
  
  // Get videos with pagination
  static async getVideosWithPagination(
    page: number = 1, 
    perPage: number = 12, 
    sortOption: SortOption = SortOption.NEWEST,
    searchQuery: string = ''
  ): Promise<{videos: Video[], totalPages: number}> {
    try {
      // Get all videos first (with sorting and filtering)
      const allVideos = await this.getAllVideos(sortOption, searchQuery);
      
      // Calculate total pages
      const totalPages = Math.ceil(allVideos.length / perPage);
      
      // Get videos for the requested page
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedVideos = allVideos.slice(startIndex, endIndex);
      
      return {
        videos: paginatedVideos,
        totalPages
      };
    } catch (error) {
      console.error('Error getting paginated videos:', error);
      throw error;
    }
  }
  
  // Get video file URL for streaming
  static async getVideoFileUrl(videoId: string): Promise<string | null> {
    try {
      console.log(`Getting video file URL for video ${videoId}`);
      
      // Use Supabase only - no fallback
      if (MIGRATION_CONFIG.useSupabaseForVideos) {
        return await VideoServiceSupabase.getVideoFileUrl(videoId);
      }
      
      throw new Error('Supabase is required for video operations');
    } catch (error) {
      console.error(`Error getting video file URL for ${videoId} from Supabase:`, error);
      return null;
    }
  }

  // Criar novo vídeo (para uso no admin)
  static async createVideo(videoData: {
    title: string;
    description: string;
    price: number;
    duration: number;
    videoFileId: string;
    thumbnailFileId: string;
    productLink?: string;
  }): Promise<Video | null> {
    try {
      // Limpar cache antes da operação para evitar inconsistências
      this.clearCache();

      // Use Supabase only - no fallback
      if (MIGRATION_CONFIG.useSupabaseForVideos) {
        const newVideo = await VideoServiceSupabase.createVideo({
          title: videoData.title,
          description: videoData.description,
          price: videoData.price,
          duration: videoData.duration.toString(),
          videoFileId: videoData.videoFileId,
          thumbnailFileId: videoData.thumbnailFileId,
          productLink: videoData.productLink || ''
        });

        // Forçar atualização do cache após criação
        await this.forceRefreshCache();

        return newVideo;
      }
      
      throw new Error('Supabase is required for video operations');
    } catch (error) {
      console.error('Error creating video:', error);
      return null;
    }
  }

  // Atualizar vídeo (para uso no admin)
  static async updateVideo(videoId: string, updates: {
    title?: string;
    description?: string;
    price?: number;
    duration?: number;
    videoFileId?: string;
    thumbnailFileId?: string;
    productLink?: string;
  }): Promise<Video | null> {
    try {
      // Limpar cache antes da operação para evitar inconsistências
      this.clearCache();

      // Use Supabase only - no fallback
      if (MIGRATION_CONFIG.useSupabaseForVideos) {
        const updateData: any = { ...updates };
        if (updateData.duration) {
          updateData.duration = updateData.duration.toString();
        }

        const updatedVideo = await VideoServiceSupabase.updateVideo(videoId, updateData);
        
        if (!updatedVideo) {
          return null;
        }

        // Forçar atualização do cache após atualização
        await this.forceRefreshCache();

        return updatedVideo;
      }
      
      throw new Error('Supabase is required for video operations');
    } catch (error) {
      console.error('Error updating video:', error);
      return null;
    }
  }

  // Deletar vídeo (para uso no admin)
  static async deleteVideo(videoId: string): Promise<boolean> {
    try {
      // Limpar cache antes da operação para evitar inconsistências
      this.clearCache();

      // Primeiro, obter os dados do vídeo para deletar os arquivos
      const video = await this.getVideo(videoId);
      if (video) {
        const videoFileId = video.video_id || video.videoFileId;
        const thumbnailFileId = video.thumbnail_id || video.thumbnailFileId;

        // Deletar arquivos do Wasabi
        if (videoFileId) {
          await wasabiService.deleteFile(videoFileId);
        }
        if (thumbnailFileId) {
          await wasabiService.deleteFile(thumbnailFileId);
        }
      }

      // Deletar do JSON database
      const success = await jsonDatabaseService.deleteVideo(videoId);
      
      if (success) {
        // Forçar atualização do cache após exclusão
        await this.forceRefreshCache();
      }

      return success;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    }
  }
}