import { useState, useEffect, useCallback } from 'react';
import OnlineUsersService from '../services/OnlineUsersService';

interface UseOnlineUsersReturn {
  onlineCount: number;
  isOnline: boolean;
  error: string | null;
}

export const useOnlineUsers = (): UseOnlineUsersReturn => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const onlineService = OnlineUsersService.getInstance();

  // Callback para atualizar o contador
  const handleCountChange = useCallback((count: number) => {
    setOnlineCount(count);
  }, []);

  // Callback para heartbeat
  const sendHeartbeat = useCallback(() => {
    try {
      onlineService.updateUserActivity(userId);
    } catch (err) {
      console.error('Erro ao enviar heartbeat:', err);
    }
  }, [onlineService, userId]);

  useEffect(() => {
    try {
      // Adiciona o usuário atual
      onlineService.addUser(userId);
      setIsOnline(true);
      
      // Obtém o contador inicial
      const initialCount = onlineService.getOnlineCount();
      setOnlineCount(initialCount);

      // Adiciona listener para mudanças no contador
      onlineService.addListener(handleCountChange);

          // Configura heartbeat com variações mais frequentes
          const heartbeatInterval = setInterval(sendHeartbeat, 3000); // 3 segundos para simular mudanças mais dinâmicas

      // Cleanup ao desmontar
      return () => {
        onlineService.removeUser(userId);
        onlineService.removeListener(handleCountChange);
        clearInterval(heartbeatInterval);
        setIsOnline(false);
      };
    } catch (err) {
      console.error('Erro ao inicializar usuários online:', err);
      setError('Erro ao conectar com o sistema de usuários online');
    }
  }, [onlineService, userId, handleCountChange, sendHeartbeat]);

  return {
    onlineCount,
    isOnline,
    error
  };
};
