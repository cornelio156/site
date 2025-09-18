import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { jsonDatabaseService, SiteConfigData } from '../services/JSONDatabaseService';

// Define the site config interface - mantém compatibilidade com o frontend
interface SiteConfig {
  $id: string;
  site_name: string;
  paypal_client_id: string;
  paypal_me_username?: string; // For PayPal.me integration
  stripe_publishable_key: string;
  stripe_secret_key: string;
  telegram_username: string;
  video_list_title?: string;
  crypto?: string[];
  email_host?: string;
  email_port?: string;
  email_secure?: boolean;
  email_user?: string;
  email_pass?: string;
  email_from?: string;
  wasabi_config?: {
    accessKey: string;
    secretKey: string;
    region: string;
    bucket: string;
    endpoint: string;
  };
}

// Define the context interface
interface SiteConfigContextType {
  siteName: string;
  paypalClientId: string;
  paypalMeUsername: string; // For PayPal.me integration
  stripePublishableKey: string;
  stripeSecretKey: string;
  telegramUsername: string;
  videoListTitle: string;
  cryptoWallets: string[];
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
  siteConfig: SiteConfig | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  updateConfig: (updates: Partial<SiteConfigData>) => Promise<void>;
}

// Create the context with default values
const SiteConfigContext = createContext<SiteConfigContextType>({
  siteName: 'VideosPlus',
  paypalClientId: '',
  paypalMeUsername: '',
  stripePublishableKey: '',
  stripeSecretKey: '',
  telegramUsername: '',
  videoListTitle: 'Available Videos',
  cryptoWallets: [],
  emailHost: 'smtp.gmail.com',
  emailPort: '587',
  emailSecure: false,
  emailUser: '',
  emailPass: '',
  emailFrom: '',
  wasabiConfig: {
    accessKey: '',
    secretKey: '',
    region: 'eu-central-2',
    bucket: 'videosfolder',
    endpoint: 'https://s3.eu-central-2.wasabisys.com'
  },
  siteConfig: null,
  loading: false,
  error: null,
  refreshConfig: async () => {},
  updateConfig: async () => {},
});

// Provider component
export const SiteConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to convert SiteConfigData to SiteConfig (compatibilidade)
  const convertToSiteConfig = (data: SiteConfigData): SiteConfig => {
    return {
      $id: 'site-config', // ID fixo para compatibilidade
      site_name: data.siteName,
      paypal_client_id: data.paypalClientId,
      paypal_me_username: data.paypalMeUsername,
      stripe_publishable_key: data.stripePublishableKey,
      stripe_secret_key: data.stripeSecretKey,
      telegram_username: data.telegramUsername,
      video_list_title: data.videoListTitle,
      crypto: data.crypto,
      email_host: data.emailHost,
      email_port: data.emailPort,
      email_secure: data.emailSecure,
      email_user: data.emailUser,
      email_pass: data.emailPass,
      email_from: data.emailFrom,
      wasabi_config: data.wasabiConfig
    };
  };

  // Function to fetch site configuration
  const fetchSiteConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Primeiro, tentar carregar do JSON database
      let configData: SiteConfigData | null = null;
      
      try {
        configData = await jsonDatabaseService.getSiteConfig();
      } catch (err) {
        console.log('JSON database not available, trying to load from public file');
        
        // Se não conseguir do JSON database, carregar do arquivo público
        try {
          const response = await fetch('/site_config.json');
          if (response.ok) {
            configData = await response.json();
          }
        } catch (fileErr) {
          console.error('Error loading from public file:', fileErr);
        }
      }
      
      if (configData) {
        const siteConfig = convertToSiteConfig(configData);
        setConfig(siteConfig);
      } else {
        // Usar configuração padrão se não conseguir carregar
        const defaultConfig: SiteConfig = {
          $id: 'site-config',
          site_name: 'VideosPlus',
          paypal_client_id: '',
          paypal_me_username: '',
          stripe_publishable_key: '',
          stripe_secret_key: '',
          telegram_username: '',
          video_list_title: 'Available Videos',
          crypto: [],
          email_host: 'smtp.gmail.com',
          email_port: '587',
          email_secure: false,
          email_user: '',
          email_pass: '',
          email_from: '',
          wasabi_config: {
            accessKey: '',
            secretKey: '',
            region: 'eu-central-2',
            bucket: 'videosfolder',
            endpoint: 'https://s3.eu-central-2.wasabisys.com'
          }
        };
        setConfig(defaultConfig);
      }
    } catch (err) {
      console.error('Error fetching site config:', err);
      setError('Failed to load site configuration');
    } finally {
      setLoading(false);
    }
  };

  // Function to update site configuration
  const updateConfig = async (updates: Partial<SiteConfigData>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Obter configuração atual
      const currentConfig = await jsonDatabaseService.getSiteConfig();
      
      // Mesclar com as atualizações
      const updatedConfig: SiteConfigData = {
        ...currentConfig,
        ...updates
      };
      
      // Salvar no JSON database
      await jsonDatabaseService.updateSiteConfig(updatedConfig);
      
      // Atualizar estado local
      const siteConfig = convertToSiteConfig(updatedConfig);
      setConfig(siteConfig);
      
    } catch (err) {
      console.error('Error updating site config:', err);
      setError('Failed to update site configuration');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch config on mount
  useEffect(() => {
    fetchSiteConfig();
  }, []);

  // Context value
  const value = {
    siteName: config?.site_name || 'VideosPlus',
    paypalClientId: config?.paypal_client_id || '',
    paypalMeUsername: config?.paypal_me_username || '',
    stripePublishableKey: config?.stripe_publishable_key || '',
    stripeSecretKey: config?.stripe_secret_key || '',
    telegramUsername: config?.telegram_username || '',
    videoListTitle: config?.video_list_title || 'Available Videos',
    cryptoWallets: config?.crypto || [],
    emailHost: config?.email_host || 'smtp.gmail.com',
    emailPort: config?.email_port || '587',
    emailSecure: config?.email_secure || false,
    emailUser: config?.email_user || '',
    emailPass: config?.email_pass || '',
    emailFrom: config?.email_from || '',
    wasabiConfig: config?.wasabi_config || {
      accessKey: '',
      secretKey: '',
      region: 'eu-central-2',
      bucket: 'videosfolder',
      endpoint: 'https://s3.eu-central-2.wasabisys.com'
    },
    siteConfig: config,
    loading,
    error,
    refreshConfig: fetchSiteConfig,
    updateConfig,
  };

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
};

// Custom hook for using the context
export const useSiteConfig = () => useContext(SiteConfigContext);

export default SiteConfigContext;