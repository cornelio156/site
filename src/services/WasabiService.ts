// WasabiService - Serviço para gerenciar uploads e downloads no Wasabi
export interface WasabiConfig {
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
  endpoint: string;
}

export interface UploadResult {
  success: boolean;
  fileId: string;
  url: string;
  error?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url: string;
}

class WasabiService {
  private config: WasabiConfig | null = null;
  private isInitialized = false;
  private thumbnailCache = new Map<string, { url: string; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
  private activeRequests = new Set<string>();
  private readonly MAX_CONCURRENT_REQUESTS = 5;

  // Inicializar o serviço com as credenciais do Wasabi
  async initialize(config: WasabiConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
  }

  // Limpar cache expirado
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.thumbnailCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.thumbnailCache.delete(key);
      }
    }
  }

  // Obter URL do cache se disponível
  private getCachedThumbnailUrl(thumbnailId: string): string | null {
    this.cleanExpiredCache();
    const cached = this.thumbnailCache.get(thumbnailId);
    return cached ? cached.url : null;
  }

  // Salvar URL no cache
  private setCachedThumbnailUrl(thumbnailId: string, url: string): void {
    this.thumbnailCache.set(thumbnailId, {
      url,
      timestamp: Date.now()
    });
  }

  // Aguardar slot disponível para requisição
  private async waitForAvailableSlot(): Promise<void> {
    while (this.activeRequests.size >= this.MAX_CONCURRENT_REQUESTS) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Adicionar requisição ativa
  private addActiveRequest(id: string): void {
    this.activeRequests.add(id);
  }

  // Remover requisição ativa
  private removeActiveRequest(id: string): void {
    this.activeRequests.delete(id);
  }

  // Verificar se o serviço está inicializado e inicializar se necessário
  private async checkInitialized(): Promise<void> {
    if (!this.isInitialized || !this.config) {
      // Tentar inicializar com configurações padrão ou do site
      await this.initializeWithDefaultConfig();
    }
  }

  // Inicializar com configurações padrão ou do site
  private async initializeWithDefaultConfig(): Promise<void> {
    try {
      // Tentar carregar configurações do site
      const response = await fetch('/api/site-config');
      if (response.ok) {
        const siteConfig = await response.json();
        if (siteConfig.wasabiConfig) {
          await this.initialize(siteConfig.wasabiConfig);
          return;
        }
      }
    } catch (error) {
      console.warn('Could not load site config for Wasabi, using default config');
    }

    // Usar configurações padrão se não conseguir carregar do site
    await this.initialize(defaultWasabiConfig);
  }

  // Upload de arquivo para o Wasabi via servidor
  async uploadFile(file: File, folder: 'videos' | 'thumbnails' = 'videos'): Promise<UploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Usar a URL correta da API (porta 3000)
      const baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
      const endpoint = `/api/upload/${folder}`;
      const fullUrl = `${baseUrl}${endpoint}`;
      
      console.log(`Uploading file to: ${fullUrl}`);
      console.log(`File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          success: result.success,
          fileId: result.fileId,
          url: result.url
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading file to Wasabi:', error);
      return {
        success: false,
        fileId: '',
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Obter URL de visualização do arquivo (usando URL assinada)
  async getFileUrl(fileId: string): Promise<string> {
    await this.checkInitialized();
    
    // Implementar retry com timeout
    const maxRetries = 3;
    const timeout = 5000; // 5 segundos
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Usar o servidor para gerar URL assinada
      const baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
      const encodedFileId = encodeURIComponent(fileId);
        console.log(`Requesting signed URL for fileId: ${fileId} (attempt ${attempt}/${maxRetries})`);
        
        // Criar AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(`${baseUrl}/api/signed-url/${encodedFileId}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.url) {
          console.log('Signed URL obtained:', result.url);
          return result.url;
        }
      } else {
          console.error(`Failed to get signed URL (attempt ${attempt}):`, response.status, response.statusText);
        }
        
        // Se não for o último attempt, aguardar antes de tentar novamente
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff exponencial
        }
        
    } catch (error) {
        console.error(`Error getting signed URL (attempt ${attempt}):`, error);
        
        // Se for timeout ou erro de conexão, tentar novamente
        if (error instanceof Error && (error.name === 'AbortError' || (error as any).code === 'ECONNRESET' || (error as any).code === 'ETIMEDOUT')) {
          if (attempt < maxRetries) {
            console.log(`Retrying in ${1000 * attempt}ms...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        }
        
        // Se não for erro de timeout/conexão, não tentar novamente
        break;
      }
    }
    
    console.warn('Failed to get signed URL after all attempts, falling back to direct URL');
    
    // Fallback para URL direta (pode não funcionar se o bucket for privado)
    if (fileId.startsWith('videos/') || fileId.startsWith('thumbnails/')) {
      return `https://${this.config!.bucket}.s3.${this.config!.region}.wasabisys.com/${fileId}`;
    }
    
    return `https://${this.config!.bucket}.s3.${this.config!.region}.wasabisys.com/videos/${fileId}`;
  }

  // Obter URL de thumbnail (usando URL assinada)
  async getThumbnailUrl(thumbnailId: string): Promise<string> {
    await this.checkInitialized();
    
    // Verificar cache primeiro
    const cachedUrl = this.getCachedThumbnailUrl(thumbnailId);
    if (cachedUrl) {
      console.log('Using cached thumbnail URL:', thumbnailId);
      return cachedUrl;
    }
    
    // Aguardar slot disponível para evitar sobrecarregar o Wasabi
    await this.waitForAvailableSlot();
    this.addActiveRequest(thumbnailId);
    
    try {
      // Implementar retry com timeout
      const maxRetries = 3;
      const timeout = 5000; // 5 segundos
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Usar o servidor para gerar URL assinada
      const baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
      const encodedThumbnailId = encodeURIComponent(thumbnailId);
          console.log(`Requesting signed URL for thumbnailId: ${thumbnailId} (attempt ${attempt}/${maxRetries})`);
          
          // Criar AbortController para timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          const response = await fetch(`${baseUrl}/api/signed-url/${encodedThumbnailId}`, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.url) {
          console.log('Signed URL for thumbnail obtained:', result.url);
              // Salvar no cache
              this.setCachedThumbnailUrl(thumbnailId, result.url);
          return result.url;
        }
      } else {
            console.error(`Failed to get signed URL for thumbnail (attempt ${attempt}):`, response.status, response.statusText);
          }
          
          // Se não for o último attempt, aguardar antes de tentar novamente
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff exponencial
          }
          
        } catch (error) {
          console.error(`Error getting signed URL for thumbnail (attempt ${attempt}):`, error);
          
          // Se for timeout ou erro de conexão, tentar novamente
          if (error instanceof Error && (error.name === 'AbortError' || (error as any).code === 'ECONNRESET' || (error as any).code === 'ETIMEDOUT')) {
            if (attempt < maxRetries) {
              console.log(`Retrying thumbnail in ${1000 * attempt}ms...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
          }
          
          // Se não for erro de timeout/conexão, não tentar novamente
          break;
        }
      }
      
      console.warn('Failed to get signed URL for thumbnail after all attempts, falling back to direct URL');
    
    // Fallback para URL direta (pode não funcionar se o bucket for privado)
      let fallbackUrl: string;
    if (thumbnailId.startsWith('thumbnails/')) {
        fallbackUrl = `https://${this.config!.bucket}.s3.${this.config!.region}.wasabisys.com/${thumbnailId}`;
      } else {
        fallbackUrl = `https://${this.config!.bucket}.s3.${this.config!.region}.wasabisys.com/thumbnails/${thumbnailId}`;
      }
      
      // Salvar fallback no cache também
      this.setCachedThumbnailUrl(thumbnailId, fallbackUrl);
      return fallbackUrl;
      
    } finally {
      // Sempre remover a requisição ativa
      this.removeActiveRequest(thumbnailId);
    }
  }

  // Deletar arquivo do Wasabi via servidor
  async deleteFile(fileId: string): Promise<boolean> {
    await this.checkInitialized();
    
    try {
      // Usar o servidor para deletar arquivo
      const baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
      const encodedFileId = encodeURIComponent(fileId);
      const response = await fetch(`${baseUrl}/api/delete-file/${encodedFileId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.success || false;
      } else {
        console.error('Failed to delete file:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error deleting file from Wasabi:', error);
      return false;
    }
  }

  // Verificar se um arquivo existe
  async fileExists(fileId: string): Promise<boolean> {
    await this.checkInitialized();
    
    try {
      const url = await this.getFileUrl(fileId);
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  // Listar arquivos em uma pasta
  async listFiles(folder: 'videos' | 'thumbnails' = 'videos'): Promise<FileMetadata[]> {
    await this.checkInitialized();
    
    try {
      // Para simplificar, retornamos um array vazio
      // Em produção, você usaria a API do Wasabi para listar arquivos
      return [];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
}

// Instância singleton do serviço
export const wasabiService = new WasabiService();

// Configuração padrão do Wasabi (será carregada do site_config.json)
export const defaultWasabiConfig: WasabiConfig = {
  accessKey: '',
  secretKey: '',
  region: '',
  bucket: '',
  endpoint: ''
};

export default WasabiService;
