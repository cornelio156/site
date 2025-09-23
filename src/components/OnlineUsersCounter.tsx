import React from 'react';
import { Box, Typography, Chip, Tooltip, Fade } from '@mui/material';
import { People, Wifi, WifiOff, Circle } from '@mui/icons-material';
import { useOnlineUsers } from '../hooks/useOnlineUsers';

interface OnlineUsersCounterProps {
  showDetails?: boolean;
  variant?: 'chip' | 'text' | 'detailed';
  size?: 'small' | 'medium' | 'large';
  position?: 'fixed' | 'static';
}

const OnlineUsersCounter: React.FC<OnlineUsersCounterProps> = ({
  showDetails = true,
  variant = 'chip',
  size = 'medium',
  position = 'static'
}) => {
  const { onlineCount, isOnline, error } = useOnlineUsers();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { fontSize: '0.75rem', padding: '2px 8px' };
      case 'large':
        return { fontSize: '1rem', padding: '8px 16px' };
      default:
        return { fontSize: '0.875rem', padding: '4px 12px' };
    }
  };

  const getPositionStyles = () => {
    if (position === 'fixed') {
      return {
        position: 'fixed' as const,
        top: 16,
        right: 16,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      };
    }
    return {};
  };

  if (error) {
    return (
      <Box sx={{ ...getPositionStyles() }}>
        <Chip
          icon={<WifiOff />}
          label="Erro de conexão"
          color="error"
          size="small"
          sx={getSizeStyles()}
        />
      </Box>
    );
  }

  const formatCount = (count: number) => {
    if (count === 0) return '0';
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'default';
    if (onlineCount === 0) return 'default';
    if (onlineCount < 10) return 'success';
    if (onlineCount < 50) return 'warning';
    return 'error';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff />;
    return <Circle sx={{ fontSize: '0.8rem', color: '#4caf50' }} />;
  };

  const getTooltipText = () => {
    if (!isOnline) return 'Connecting...';
    if (onlineCount === 0) return 'No users online';
    if (onlineCount === 1) return '1 user online';
    return `${onlineCount} users online`;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Connecting...';
    if (onlineCount === 0) return '0 online';
    return `${onlineCount} online`;
  };

  const getDetailedStatusText = () => {
    if (!isOnline) return 'Connecting...';
    if (onlineCount === 0) return 'No users online';
    if (onlineCount === 1) return '1 user online';
    return `${onlineCount} users online`;
  };

  if (variant === 'text') {
    return (
      <Box sx={{ ...getPositionStyles() }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            ...getSizeStyles()
          }}
        >
          {getStatusIcon()}
          {getStatusText()}
        </Typography>
      </Box>
    );
  }

  if (variant === 'detailed') {
    return (
      <Box sx={{ ...getPositionStyles() }}>
        <Fade in={isOnline}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              backgroundColor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <People color="primary" />
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {formatCount(onlineCount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {onlineCount === 1 ? 'user online' : 'users online'}
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Box>
    );
  }

  // Default chip variant
  return (
    <Box sx={getPositionStyles()}>
      <Tooltip title={getTooltipText()} arrow>
        <Chip
          icon={getStatusIcon()}
          label={
            showDetails
              ? getStatusText()
              : formatCount(onlineCount)
          }
          color={getStatusColor()}
          size="small"
          sx={{
            ...getSizeStyles(),
            '& .MuiChip-icon': {
              fontSize: '1rem'
            }
          }}
        />
      </Tooltip>
    </Box>
  );
};

export default OnlineUsersCounter;
