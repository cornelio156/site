import SupabaseService from './SupabaseService';

// Site configuration interfaces
export interface SiteConfigData {
  siteName: string;
  paypalClientId: string;
  paypalMeUsername: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  telegramUsername: string;
  videoListTitle: string;
  crypto: string[];
  emailHost: string;
  emailPort: string;
  emailSecure: boolean;
  emailUser: string;
  emailPass: string;
  emailFrom: string;
  wasabiConfig: {
    accessKey: string;
    secretKey: string;
    region: string;
    bucket: string;
    endpoint: string;
  };
}

export interface SiteConfig {
  $id: string;
  site_name: string;
  paypal_client_id: string;
  paypal_me_username: string;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  telegram_username: string;
  video_list_title: string;
  crypto: string[];
  email_host: string;
  email_port: string;
  email_secure: boolean;
  email_user: string;
  email_pass: string;
  email_from: string;
  wasabi_config: {
    accessKey: string;
    secretKey: string;
    region: string;
    bucket: string;
    endpoint: string;
  };
}

export interface CryptoWallet {
  id: number;
  address: string;
  type: string;
  created_at: string;
}

export class SiteConfigServiceSupabase {
  private static supabase = SupabaseService.getInstance();
  
  // Cache para configuração
  private static configCache: SiteConfigData | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

  // Verificar se o cache é válido
  private static isCacheValid(): boolean {
    return this.configCache !== null && 
           this.cacheTimestamp > 0 && 
           (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  // Limpar cache
  private static clearCache(): void {
    this.configCache = null;
    this.cacheTimestamp = 0;
    console.log('Site config cache cleared');
  }

  // Converter dados do Supabase para SiteConfigData
  private static convertSupabaseToSiteConfigData(supabaseConfig: any, cryptoWallets: any[]): SiteConfigData {
    return {
      siteName: supabaseConfig.site_name || 'VideosPlus',
      paypalClientId: supabaseConfig.paypal_client_id || '',
      paypalMeUsername: supabaseConfig.paypal_me_username || '',
      stripePublishableKey: supabaseConfig.stripe_publishable_key || '',
      stripeSecretKey: supabaseConfig.stripe_secret_key || '',
      telegramUsername: supabaseConfig.telegram_username || '',
      videoListTitle: supabaseConfig.video_list_title || 'Available Videos',
      crypto: cryptoWallets.map(wallet => `${wallet.type}:${wallet.address}`),
      emailHost: supabaseConfig.email_host || 'smtp.gmail.com',
      emailPort: supabaseConfig.email_port || '587',
      emailSecure: supabaseConfig.email_secure || false,
      emailUser: supabaseConfig.email_user || '',
      emailPass: supabaseConfig.email_pass || '',
      emailFrom: supabaseConfig.email_from || '',
      wasabiConfig: {
        accessKey: supabaseConfig.wasabi_access_key || '',
        secretKey: supabaseConfig.wasabi_secret_key || '',
        region: supabaseConfig.wasabi_region || '',
        bucket: supabaseConfig.wasabi_bucket || '',
        endpoint: supabaseConfig.wasabi_endpoint || ''
      }
    };
  }

  // Converter SiteConfigData para formato do Supabase
  private static convertSiteConfigDataToSupabase(configData: SiteConfigData): any {
    return {
      site_name: configData.siteName,
      paypal_client_id: configData.paypalClientId,
      paypal_me_username: configData.paypalMeUsername,
      stripe_publishable_key: configData.stripePublishableKey,
      stripe_secret_key: configData.stripeSecretKey,
      telegram_username: configData.telegramUsername,
      video_list_title: configData.videoListTitle,
      email_host: configData.emailHost,
      email_port: configData.emailPort,
      email_secure: configData.emailSecure,
      email_user: configData.emailUser,
      email_pass: configData.emailPass,
      email_from: configData.emailFrom,
      wasabi_access_key: configData.wasabiConfig.accessKey,
      wasabi_secret_key: configData.wasabiConfig.secretKey,
      wasabi_region: configData.wasabiConfig.region,
      wasabi_bucket: configData.wasabiConfig.bucket,
      wasabi_endpoint: configData.wasabiConfig.endpoint,
      updated_at: new Date().toISOString()
    };
  }

  // Obter configuração do site
  static async getSiteConfig(): Promise<SiteConfigData | null> {
    try {
      // Se o cache é válido, usar cache
      if (this.isCacheValid()) {
        console.log('Usando cache de configuração do site');
        return this.configCache;
      }

      console.log('Buscando configuração do site do Supabase');
      
      // Buscar configuração do site
      const siteConfig = await this.supabase.getSiteConfig();
      
      if (!siteConfig) {
        console.log('Configuração do site não encontrada no Supabase');
        return null;
      }

      // Buscar carteiras crypto
      const cryptoWallets = await this.supabase.getCryptoWallets();
      
      // Converter para formato esperado
      const configData = this.convertSupabaseToSiteConfigData(siteConfig, cryptoWallets);
      
      // Atualizar cache
      this.configCache = configData;
      this.cacheTimestamp = Date.now();
      
      console.log('Configuração do site carregada do Supabase');
      return configData;
    } catch (error) {
      console.error('Erro ao obter configuração do site:', error);
      return null;
    }
  }

  // Atualizar configuração do site
  static async updateSiteConfig(configData: Partial<SiteConfigData>): Promise<SiteConfigData | null> {
    try {
      console.log('Atualizando configuração do site no Supabase');
      
      // Limpar cache antes da atualização
      this.clearCache();
      
      // Obter configuração atual
      const currentConfig = await this.getSiteConfig();
      
      if (!currentConfig) {
        console.error('Não foi possível obter configuração atual');
        return null;
      }
      
      // Mesclar configurações - preservar crypto se não for fornecido
      const updatedConfig = { 
        ...currentConfig, 
        ...configData,
        // Se crypto não foi fornecido, manter o atual
        crypto: configData.crypto !== undefined ? configData.crypto : currentConfig.crypto
      };
      
      // Converter para formato do Supabase
      const supabaseData = this.convertSiteConfigDataToSupabase(updatedConfig);
      
      // Atualizar no Supabase
      await this.supabase.updateSiteConfig(supabaseData);
      
      // Atualizar carteiras crypto sempre (mesmo que seja o mesmo array)
      await this.updateCryptoWallets(updatedConfig.crypto);
      
      // Limpar cache para forçar recarregamento
      this.clearCache();
      
      console.log('Configuração do site atualizada no Supabase');
      return updatedConfig;
    } catch (error) {
      console.error('Erro ao atualizar configuração do site:', error);
      return null;
    }
  }

  // Atualizar carteiras crypto
  static async updateCryptoWallets(cryptoWallets: string[]): Promise<void> {
    try {
      console.log('Atualizando carteiras crypto no Supabase');
      
      const client = this.supabase.getClient();
      
      // Deletar carteiras existentes
      await client.from('crypto_wallets').delete().neq('id', 0); // Delete all
      
      // Inserir novas carteiras apenas se houver carteiras válidas
      if (cryptoWallets && cryptoWallets.length > 0) {
        const walletsToInsert = cryptoWallets
          .filter(wallet => wallet && wallet.trim()) // Filtrar wallets vazias
          .map(wallet => {
            const [type, address] = wallet.split(':');
            return {
              type: type?.trim() || '',
              address: address?.trim() || ''
            };
          })
          .filter(wallet => wallet.type && wallet.address); // Filtrar wallets com dados válidos
        
        if (walletsToInsert.length > 0) {
          await client.from('crypto_wallets').insert(walletsToInsert);
          console.log(`${walletsToInsert.length} carteiras crypto inseridas no Supabase`);
        } else {
          console.log('Nenhuma carteira crypto válida para inserir');
        }
      } else {
        console.log('Nenhuma carteira crypto fornecida - mantendo estado atual');
      }
      
      console.log('Carteiras crypto atualizadas no Supabase');
    } catch (error) {
      console.error('Erro ao atualizar carteiras crypto:', error);
      throw error;
    }
  }

  // Obter carteiras crypto
  static async getCryptoWallets(): Promise<CryptoWallet[]> {
    try {
      const wallets = await this.supabase.getCryptoWallets();
      return wallets.map(wallet => ({
        id: wallet.id,
        address: wallet.address,
        type: wallet.type,
        created_at: wallet.created_at
      }));
    } catch (error) {
      console.error('Erro ao obter carteiras crypto:', error);
      return [];
    }
  }

  // Converter para formato de compatibilidade (SiteConfig)
  static convertToSiteConfig(configData: SiteConfigData): SiteConfig {
    return {
      $id: 'site-config',
      site_name: configData.siteName,
      paypal_client_id: configData.paypalClientId,
      paypal_me_username: configData.paypalMeUsername,
      stripe_publishable_key: configData.stripePublishableKey,
      stripe_secret_key: configData.stripeSecretKey,
      telegram_username: configData.telegramUsername,
      video_list_title: configData.videoListTitle,
      crypto: configData.crypto,
      email_host: configData.emailHost,
      email_port: configData.emailPort,
      email_secure: configData.emailSecure,
      email_user: configData.emailUser,
      email_pass: configData.emailPass,
      email_from: configData.emailFrom,
      wasabi_config: configData.wasabiConfig
    };
  }

  // Obter configuração padrão
  static getDefaultConfig(): SiteConfigData {
    return {
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
        region: '',
        bucket: '',
        endpoint: ''
      }
    };
  }

  // Forçar atualização do cache
  static async refreshConfig(): Promise<SiteConfigData | null> {
    this.clearCache();
    return await this.getSiteConfig();
  }
}
