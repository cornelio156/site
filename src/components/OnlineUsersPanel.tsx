import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  Fade,
  LinearProgress
} from '@mui/material';
import {
  People,
  Wifi,
  WifiOff,
  Refresh,
  Visibility,
  AccessTime,
  TrendingUp
} from '@mui/icons-material';
import OnlineUsersService from '../services/OnlineUsersService';

interface OnlineUsersPanelProps {
  showDetails?: boolean;
  refreshInterval?: number;
}

const OnlineUsersPanel: React.FC<OnlineUsersPanelProps> = ({
  showDetails = true,
  refreshInterval = 5000
}) => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const onlineService = OnlineUsersService.getInstance();

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const count = onlineService.getOnlineCount();
      const users = onlineService.getOnlineUsers();
      
      setOnlineCount(count);
      setOnlineUsers(users);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao atualizar dados de usuários online:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Adiciona listener para mudanças
    const handleCountChange = (count: number) => {
      setOnlineCount(count);
      setOnlineUsers(onlineService.getOnlineUsers());
      setLastUpdate(new Date());
    };

    onlineService.addListener(handleCountChange);
    
    // Atualiza dados iniciais
    refreshData();

    // Configura refresh automático
    const interval = setInterval(refreshData, refreshInterval);

    return () => {
      onlineService.removeListener(handleCountChange);
      clearInterval(interval);
    };
  }, [onlineService, refreshInterval]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return `${Math.floor(diff / 86400000)}d atrás`;
  };

  const getStatusColor = (lastSeen: number) => {
    const now = Date.now();
    const diff = now - lastSeen;
    
    if (diff < 30000) return 'success'; // Verde - muito recente
    if (diff < 60000) return 'warning'; // Amarelo - recente
    return 'default'; // Cinza - antigo
  };

  const getStatusIcon = (lastSeen: number) => {
    const now = Date.now();
    const diff = now - lastSeen;
    
    if (diff < 30000) return <Wifi />;
    return <WifiOff />;
  };

  return (
    <Card sx={{ maxWidth: 400, width: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <People color="primary" />
            Usuários Online
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={onlineCount}
              color="primary"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
            <Tooltip title="Atualizar">
              <IconButton
                size="small"
                onClick={refreshData}
                disabled={isLoading}
                sx={{ 
                  animation: isLoading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>

        {showDetails && onlineUsers.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Usuários Ativos
            </Typography>
            <List dense>
              {onlineUsers.slice(0, 10).map((user, index) => (
                <Fade in={true} timeout={300 + index * 100} key={user.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getStatusIcon(user.lastSeen)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            Usuário {user.id.slice(-6)}
                          </Typography>
                          <Chip
                            label={formatTime(user.lastSeen)}
                            size="small"
                            color={getStatusColor(user.lastSeen)}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={`Conectado há ${formatTime(user.timestamp)}`}
                    />
                  </ListItem>
                </Fade>
              ))}
            </List>
            
            {onlineUsers.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                E mais {onlineUsers.length - 10} usuários...
              </Typography>
            )}
          </>
        )}

        {onlineUsers.length === 0 && !isLoading && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <WifiOff sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Nenhum usuário online no momento
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default OnlineUsersPanel;
