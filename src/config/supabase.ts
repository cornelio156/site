// Configuração do Supabase
// Substitua pelos seus valores reais do Supabase

export const SUPABASE_CONFIG = {
  // URL do seu projeto Supabase
  url: 'https://tzfeqnmqvbvixopaunku.supabase.co', // Exemplo: 'https://your-project.supabase.co'
  
  // Chave anônima do Supabase
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6ZmVxbm1xdmJ2aXhvcGF1bmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDE1MzAsImV4cCI6MjA3MzMxNzUzMH0.ZYnY9STMyklVs3zfzAQhn1JzTKU70TlP7AfiQCwUb1w', // Exemplo: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

// Função para obter configuração do Supabase
export const getSupabaseConfig = () => {
  // Verificar se as variáveis de ambiente estão definidas
  const url = import.meta.env.VITE_SUPABASE_URL || SUPABASE_CONFIG.url;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_CONFIG.anonKey;
  
  if (url === 'YOUR_SUPABASE_URL' || anonKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('⚠️ Configuração do Supabase não definida! Por favor, configure as variáveis de ambiente ou edite o arquivo src/config/supabase.ts');
  }
  
  return {
    url,
    anonKey
  };
};
