import React from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import { VideoLibrary } from '@mui/icons-material';

interface ThumbnailFallbackProps {
  width?: string | number;
  height?: string | number;
  title?: string;
}

const ThumbnailFallback: React.FC<ThumbnailFallbackProps> = ({ 
  width = '100%', 
  height = '56.25%', 
  title = 'Video Thumbnail' 
}) => {
  return (
    <Box
      sx={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: 1,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Skeleton background */}
      <Skeleton
        variant="rectangular"
        width="100%"
        height="100%"
        animation="wave"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1
        }}
      />
      
      {/* Content overlay */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          textAlign: 'center',
          p: 2
        }}
      >
        <VideoLibrary 
          sx={{ 
            fontSize: 48, 
            color: 'text.secondary',
            mb: 1,
            opacity: 0.7
          }} 
        />
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary',
            fontWeight: 'bold',
            opacity: 0.8
          }}
        >
          {title}
        </Typography>
      </Box>
    </Box>
  );
};

export default ThumbnailFallback;
