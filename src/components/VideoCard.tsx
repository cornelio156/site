import { FC, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import { Chip, CircularProgress, Button, IconButton, Tooltip } from '@mui/material';
import Box from '@mui/material/Box';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LockIcon from '@mui/icons-material/Lock';
import Skeleton from '@mui/material/Skeleton';
import TelegramIcon from '@mui/icons-material/Telegram';
import PreviewIcon from '@mui/icons-material/PlayCircleOutline';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { VideoService } from '../services/VideoService';
import { useSiteConfig } from '../context/SiteConfigContext';
import { StripeService } from '../services/StripeService';
import ThumbnailFallback from './ThumbnailFallback';

interface VideoCardProps {
  video: {
    $id: string;
    title: string;
    description: string;
    price: number;
    thumbnailUrl?: string;
    isPurchased?: boolean;
    duration?: string | number;
    views?: number;
    createdAt?: string;
    created_at?: string;
    product_link?: string;
  };
}

const VideoCard: FC<VideoCardProps> = ({ video }) => {
  const navigate = useNavigate();
  const { telegramUsername, stripePublishableKey } = useSiteConfig();
  const [isHovered, setIsHovered] = useState(false);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const [showTapHint, setShowTapHint] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Ensure only one card plays at a time
  useEffect(() => {
    const onAnyCardPlay = (e: Event) => {
      try {
        const custom = e as CustomEvent<{ id: string }>;
        if (custom.detail && custom.detail.id !== video.$id) {
          // Stop this card if another started
          if (videoRef.current) {
            try { videoRef.current.pause(); } catch {}
          }
          setIsPlayingInline(false);
          setVideoUrl(null);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('videocard-play', onAnyCardPlay as EventListener);
    return () => window.removeEventListener('videocard-play', onAnyCardPlay as EventListener);
  }, [video.$id]);
  const [stripeLoading, setStripeLoading] = useState(false);
  
  const handleCardClick = async () => {
    try {
      // Increment view count
      await VideoService.incrementViews(video.$id);
      
      // Navigate to video page
      navigate(`/video/${video.$id}`);
    } catch (error) {
      console.error('Error handling video card click:', error);
      // Navigate anyway even if incrementing views fails
      navigate(`/video/${video.$id}`);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    // Navigate to video page for preview
    navigate(`/video/${video.$id}`);
  };

  const openInlinePlayer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Notify other cards to stop
      window.dispatchEvent(new CustomEvent('videocard-play', { detail: { id: video.$id } }));
      setShowTapHint(false);
      setIsVideoLoading(true);
      const url = await VideoService.getVideoFileUrl(video.$id);
      setVideoUrl(url);
      setIsPlayingInline(true);
    } catch (err) {
      console.error('Failed to load video URL for inline play', err);
    } finally {
      setIsVideoLoading(false);
    }
  };

  const stopInlinePlayer = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch {}
    }
    setIsPlayingInline(false);
    setVideoUrl(null);
    setShowTapHint(true);
  };

  const handleStripePay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!stripePublishableKey) {
      console.warn('Stripe key not configured');
      return;
    }
    try {
      setStripeLoading(true);
      await StripeService.initStripe(stripePublishableKey);
      const successUrl = `${window.location.origin}/#/video/${video.$id}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/#/videos?payment_canceled=true`;
      const sessionId = await StripeService.createCheckoutSession(
        video.price,
        'usd',
        'Premium Content',
        successUrl,
        cancelUrl
      );
      await StripeService.redirectToCheckout(sessionId);
    } catch (err) {
      console.error('Stripe checkout failed', err);
    } finally {
      setStripeLoading(false);
    }
  };

  const handleTelegramClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (telegramUsername) {
      // Criar mensagem detalhada com informações do vídeo
      const videoDetails = `
🎬 *${video.title}*

💰 *Price:* $${video.price.toFixed(2)}
⏱️ *Duration:* ${video.duration ? formatDuration(video.duration) : 'N/A'}
👀 *Views:* ${formatViews(video.views)}
📅 *Added:* ${(video.createdAt || video.created_at) ? formatDate(typeof (video.createdAt || video.created_at) === 'string' ? (video.createdAt || video.created_at!) : (video.createdAt || video.created_at!).toString()) : 'N/A'}

📝 *Description:*
${video.description || 'No description available'}
      `.trim();

      // Codificar a mensagem para URL
      const encodedMessage = encodeURIComponent(videoDetails);
      
      // Abrir Telegram com a mensagem pré-formatada
      window.open(`https://t.me/${telegramUsername}?text=${encodedMessage}`, '_blank');
    }
  };

  // Format the duration nicely
  const formatDuration = (duration?: string | number) => {
    if (duration === undefined || duration === null) return '00:00';
    
    // If duration is a number (seconds), convert to string format
    if (typeof duration === 'number') {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      return `${minutes}min ${seconds}s`;
    }
    
    // If duration is already a string, check format
    if (typeof duration === 'string') {
      try {
        // Check if duration is in format MM:SS or HH:MM:SS
        const parts = duration.split(':');
        if (parts.length === 2) {
          return `${parts[0]}min ${parts[1]}s`;
        } else if (parts.length === 3) {
          return `${parts[0]}h ${parts[1]}m ${parts[2]}s`;
        }
      } catch (error) {
        console.error('Error formatting duration:', error);
        // Return the original string if split fails
        return duration;
      }
    }
    
    // Return as is if we can't parse it
    return String(duration);
  };

  // Format view count with K, M, etc.
  const formatViews = (views?: number) => {
    if (views === undefined) return '0 views';
    if (views < 1000) return `${views} views`;
    if (views < 1000000) return `${(views / 1000).toFixed(1)}K views`;
    return `${(views / 1000000).toFixed(1)}M views`;
  };

  // Format date to relative time
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Ajuste para lidar com formato created_at ou createdAt
  const createdAtField = video.createdAt || video.created_at;

  // Handle thumbnail loading states
  useEffect(() => {
    if (video.thumbnailUrl) {
      setIsThumbnailLoading(true);
      setThumbnailError(false);
    } else {
      setIsThumbnailLoading(false);
      setThumbnailError(true);
    }
  }, [video.thumbnailUrl]);

  const handleThumbnailLoad = () => {
    console.log(`Thumbnail loaded successfully for video: ${video.title}`);
    setIsThumbnailLoading(false);
    setThumbnailError(false);
  };

  const onThumbnailError = () => {
    console.warn(`Thumbnail failed to load for video: ${video.title}`);
    setThumbnailError(true);
    setIsThumbnailLoading(false);
  };

  return (
    <>
      {/* Add CSS animations */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
      
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: theme => `0 8px 20px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
          cursor: 'pointer',
          backgroundColor: theme => theme.palette.mode === 'dark' ? '#121212' : '#ffffff',
          border: '1px solid rgba(255,15,80,0.1)',
          '&:hover': {
            transform: { xs: 'none', sm: 'translateY(-10px) scale(1.02)' },
            boxShadow: { xs: '0 8px 20px rgba(0,0,0,0.15)', sm: '0 16px 30px rgba(0,0,0,0.25)' },
            borderColor: '#FF0F50',
          }
        }}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      <Box sx={{ position: 'relative', paddingTop: '56.25%' /* 16:9 aspect ratio */ }}>
        {/* Thumbnail image */}
        {video.thumbnailUrl && !thumbnailError ? (
          <CardMedia
            component="img"
            image={video.thumbnailUrl}
            alt={video.title}
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: '#0A0A0A',
              filter: 'brightness(0.9)',
            }}
            onLoad={handleThumbnailLoad}
            onError={onThumbnailError}
          />
        ) : (
          <Skeleton 
            variant="rectangular" 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: '#0A0A0A',
            }} 
            animation="wave" 
          />
        )}

        {/* Loading indicator overlay */}
        {isThumbnailLoading && video.thumbnailUrl && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
            }}
          >
            <CircularProgress 
              size={40} 
              thickness={4}
              sx={{ 
                color: '#FF0F50',
                mb: 1,
                animation: 'pulse 1.5s ease-in-out infinite'
              }} 
            />
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'white',
                fontWeight: 'bold',
                textAlign: 'center',
                fontSize: '0.75rem'
              }}
            >
              Loading...
            </Typography>
          </Box>
        )}

        {/* Error state overlay */}
        {thumbnailError && (
          <ThumbnailFallback 
            width="100%"
            height="100%"
            title={video.title}
          />
        )}
        
        {/* Adult content indicator */}
        <Chip 
          label="18+" 
          size="small" 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            left: 8, 
            backgroundColor: '#FF0F50',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.7rem',
            height: '22px',
            zIndex: 2,
          }}
        />
        
        {/* Hover overlay and inline playback area */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: isPlayingInline ? 'transparent' : 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.3) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isPlayingInline ? 1 : (isHovered ? 1 : 0.4),
            transition: 'all 0.3s ease',
          }}
        >
          {isPlayingInline && videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              ref={videoRef}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Box onClick={openInlinePlayer} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, cursor: 'pointer' }}>
              <Box
                sx={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,15,80,0.75)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isHovered ? 'scale(1.1)' : 'scale(0.9)',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.35)'
                }}
              >
                <PlayArrowIcon sx={{ fontSize: 45, color: 'white' }} />
              </Box>
              {showTapHint && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    px: 1,
                    py: 0.4,
                    borderRadius: 999,
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    lineHeight: 1,
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                    transition: 'opacity 180ms ease',
                    opacity: showTapHint ? 1 : 0,
                  }}
                >
                  Tap to play
                </Box>
              )}
            </Box>
          )}
        </Box>
        
        {/* Duration badge */}
        {video.duration && (
          <Chip 
            label={formatDuration(video.duration)} 
            size="small" 
            sx={{ 
              position: 'absolute', 
              bottom: 8, 
              right: 8, 
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              fontWeight: 'bold',
              height: '24px',
              '& .MuiChip-label': {
                px: 1,
              }
            }}
            icon={<AccessTimeIcon sx={{ color: 'white', fontSize: '14px' }} />}
          />
        )}
        
        {/* Price badge - Enhanced visibility */}
        <Chip 
          label={`$${video.price.toFixed(2)}`} 
          color="primary" 
          size="medium" 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            fontWeight: 'bold',
            fontSize: '1rem',
            height: '36px',
            boxShadow: '0 6px 16px rgba(255, 15, 80, 0.5)',
            backgroundColor: '#FF0F50',
            border: '3px solid rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)',
            '& .MuiChip-label': {
              color: 'white',
              fontWeight: 'bold',
              px: 2,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            },
            '&:hover': {
              backgroundColor: '#D10D42',
              transform: 'scale(1.08)',
              boxShadow: '0 8px 20px rgba(255, 15, 80, 0.6)',
              transition: 'all 0.3s ease'
            }
          }}
        />
      </Box>
      
      <CardContent sx={{ flexGrow: 1, p: { xs: 1.25, md: 2 }, pt: { xs: 1, md: 1.5 } }}>
        <Typography gutterBottom variant="h6" component="div" sx={{
          fontWeight: 'bold',
          fontSize: '1rem',
          lineHeight: 1.2,
          mb: 1,
          height: '2.4rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          color: theme => theme.palette.mode === 'dark' ? 'white' : 'black',
        }}>
          {video.title}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: theme => theme.palette.mode === 'dark' ? '#FF69B4' : '#FF0F50' }}>
            <VisibilityIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption">
              {formatViews(video.views)}
            </Typography>
          </Box>
          
          {createdAtField && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatDate(createdAtField)}
            </Typography>
          )}
        </Box>

        {/* Price chip movido para a linha de ações */}

        {/* Action buttons after price (linha dos botões secundários) */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          justifyContent: 'flex-start',
          alignItems: 'center',
          mt: { xs: 1, md: 1.5 },
          px: { xs: 0.5, md: 1 },
          minHeight: { xs: 36, md: 44 } // garante altura consistente da linha de botões
        }}>
          <Box sx={{ display: 'flex', gap: { xs: 1, md: 1 }, alignItems: 'center', flexGrow: 1 }}>

            {/* Details button */}
            <Tooltip title="Preview" arrow>
              <Button
                variant="contained"
                size="small"
                onClick={handlePreviewClick}
                sx={{
                  backgroundColor: 'rgba(33, 150, 243, 0.9)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: { xs: '0.9rem', md: '0.74rem' },
                  minWidth: { xs: 110, md: 'auto' },
                  px: { xs: 2.2, md: 1.2 },
                  py: { xs: 0.7, md: 0.45 },
                  borderRadius: 999,
                  '&:hover': {
                    backgroundColor: 'rgba(33, 150, 243, 1)',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                Preview
              </Button>
            </Tooltip>

            {/* Get content button (product link) visible when purchased and link exists */}
            {video.isPurchased && video.product_link && (
              <Tooltip title="Get content" arrow>
                <Button
                  variant="contained"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); window.open(video.product_link as string, '_blank'); }}
                  sx={{
                    backgroundColor: 'rgba(33, 150, 243, 0.9)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                px: { xs: 1, md: 1.5 },
                py: { xs: 0.4, md: 0.5 },
                    '&:hover': {
                      backgroundColor: 'rgba(33, 150, 243, 1)',
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  Get Content
                </Button>
              </Tooltip>
            )}

            {/* Telegram button */}
            {telegramUsername && (
              <Tooltip title="Contact on Telegram" arrow>
                <IconButton
                  size="small"
                  onClick={handleTelegramClick}
                  sx={{
                    backgroundColor: 'rgba(0, 136, 204, 0.9)',
                    color: 'white',
                    width: { xs: 44, md: 36 },
                    height: { xs: 44, md: 36 },
                    '&:hover': {
                      backgroundColor: 'rgba(0, 136, 204, 1)',
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <TelegramIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Price chip à direita */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            px: 1,
            py: 0.4,
            background: 'rgba(255, 15, 80, 0.08)',
            borderRadius: 999,
            border: '1px solid rgba(255, 15, 80, 0.35)',
            transform: { xs: 'scale(0.95)', md: 'none' },
            ml: 'auto'
          }}>
            <Typography component="span" sx={{ color: '#FF0F50', fontWeight: 900, fontSize: '0.85rem', letterSpacing: 0.2, lineHeight: 1 }}>
              ${video.price.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Botão Pay em uma linha separada abaixo dos demais */}
        <Box sx={{ mt: 1.5, px: 1 }}>
          {stripePublishableKey ? (
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleStripePay}
              disabled={stripeLoading}
              startIcon={<CreditCardIcon />}
              sx={{
                background: 'linear-gradient(90deg, #6A00FF 0%, #9B00FF 100%)',
                color: '#ffffff',
                fontWeight: 900,
                letterSpacing: 0.4,
                py: 1.1,
                boxShadow: '0 10px 20px rgba(107, 0, 255, 0.35)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #5E00E6 0%, #8C00E6 100%)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              {stripeLoading ? 'Processing…' : 'Pay'}
            </Button>
          ) : (
            // Espaço reservado para manter altura igual entre cards quando Stripe não está ativo
            <Box sx={{ height: 48 }} />
          )}
        </Box>
      </CardContent>
      </Card>
      
      {/* Inline playback handled within thumbnail overlay; no modal */}
    </>
  );
};

export default VideoCard; 