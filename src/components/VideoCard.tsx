import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import { Chip, CircularProgress, Button } from '@mui/material';
import Box from '@mui/material/Box';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TelegramIcon from '@mui/icons-material/Telegram';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import Skeleton from '@mui/material/Skeleton';
import { VideoService } from '../services/VideoService';
import { useSiteConfig } from '../context/SiteConfigContext';
import { StripeService } from '../services/StripeService';
import MultiVideoPreview from './MultiVideoPreview';

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
    // Support for multiple videos in preview
    relatedVideos?: Array<{
      $id: string;
      title: string;
      thumbnailUrl?: string;
      duration?: string | number;
      price: number;
    }>;
  };
}

const VideoCard: FC<VideoCardProps> = ({ video }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);
  const { telegramUsername, stripePublishableKey } = useSiteConfig();
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  
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
    }
  }, [video.thumbnailUrl]);

  const handleThumbnailLoad = () => {
    setIsThumbnailLoading(false);
  };

  const handleThumbnailError = () => {
    setIsThumbnailLoading(false);
    setThumbnailError(true);
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/video/${video.$id}`);
  };

  const handleTelegramClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Format date for "Added" field
    const formatAddedDate = (date: Date) => {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      return `${Math.ceil(diffDays / 30)} months ago`;
    };
    
    const msg = `🎬 **${video.title}**

💰 **Price:** $${video.price.toFixed(2)}
⏱️ **Duration:** ${formatDuration(video.duration)}
👀 **Views:** ${formatViews(video.views)}
📅 **Added:** ${formatAddedDate(new Date(video.createdAt || video.created_at || Date.now()))}

📝 **Description:**
${video.description || 'No description available'}

Please let me know how to proceed with payment.`;
    
    const encoded = encodeURIComponent(msg);
    const base = telegramUsername ? `https://t.me/${telegramUsername.replace('@', '')}` : 'https://t.me/share/url';
    const url = telegramUsername ? `${base}?text=${encoded}` : `${base}?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Create Telegram href for the button
  const telegramHref = (() => {
    if (!telegramUsername) return 'https://t.me/share/url';
    
    // Format date for "Added" field
    const formatAddedDate = (date: Date) => {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      return `${Math.ceil(diffDays / 30)} months ago`;
    };
    
    const msg = `🎬 **${video.title}**

💰 **Price:** $${video.price.toFixed(2)}
⏱️ **Duration:** ${formatDuration(video.duration)}
👀 **Views:** ${formatViews(video.views)}
📅 **Added:** ${formatAddedDate(new Date(video.createdAt || video.created_at || Date.now()))}

📝 **Description:**
${video.description || 'No description available'}

Please let me know how to proceed with payment.`;
    
    const encoded = encodeURIComponent(msg);
    return `https://t.me/${telegramUsername.replace('@', '')}?text=${encoded}`;
  })();

  const handleStripePay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!stripePublishableKey) return;
    try {
      setIsStripeLoading(true);
      await StripeService.initStripe(stripePublishableKey);
      const productName = 'Video Access';
      const successUrl = `${window.location.origin}/payment-success?video_id=${video.$id}&session_id={CHECKOUT_SESSION_ID}&payment_method=stripe`;
      const cancelUrl = `${window.location.origin}/video/${video.$id}?payment_canceled=true`;
      const sessionId = await StripeService.createCheckoutSession(
        video.price,
        'usd',
        productName,
        successUrl,
        cancelUrl
      );
      await StripeService.redirectToCheckout(sessionId);
    } catch (err) {
      console.error('Stripe payment error:', err);
    } finally {
      setIsStripeLoading(false);
    }
  };

  return (
    <>
      {/* Add CSS animation for pulse effect */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
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
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(142,36,170,0.2)',
          '&:hover': {
            transform: 'translateY(-10px) scale(1.02)',
            boxShadow: '0 16px 30px rgba(142,36,170,0.3)',
            borderColor: '#8e24aa',
          }
        }}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      <Box sx={{ position: 'relative', paddingTop: '56.25%' /* 16:9 aspect ratio */ }}>
        {/* Multi-video preview (from previewSources) or single thumbnail */}
        {(video as any).previewSources && (video as any).previewSources.length > 0 ? (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}>
            <MultiVideoPreview
              videos={[(video as any).previewSources].flat().slice(0,3).map((src: any, idx: number) => ({
                $id: `${video.$id}::${src.id}`,
                title: video.title,
                thumbnailUrl: src.thumbnail_file_id ? undefined : video.thumbnailUrl,
                duration: video.duration,
                price: video.price
              }))}
              onVideoClick={(videoId) => navigate(`/video/${videoId}`)}
              autoPlay={isHovered}
              showControls={isHovered}
            />
          </Box>
        ) : (
          <>
            {/* Single thumbnail image */}
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
            onError={handleThumbnailError}
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
          </>
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
                color: '#8e24aa',
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
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: '#0A0A0A',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#666',
                textAlign: 'center',
                fontSize: '0.9rem'
              }}
            >
              Video Thumbnail
            </Typography>
          </Box>
        )}
        
        {/* Adult content indicator */}
        <Chip 
          label="18+" 
          size="small" 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            left: 8, 
            backgroundColor: '#8e24aa',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.7rem',
            height: '22px',
            zIndex: 2,
          }}
        />
        
        {/* Hover overlay without central play/lock icon */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.25) 100%)',
            opacity: isHovered ? 1 : 0.4,
            transition: 'all 0.3s ease',
          }}
        />
        
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
        
        {/* Price badge - Pink/Red style */}
        <Chip 
          label={`$${video.price.toFixed(2)}`} 
          size="medium" 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            fontWeight: 'bold',
            fontSize: '0.9rem',
            height: '32px',
            backgroundColor: '#FF0F50',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            '& .MuiChip-label': {
              color: 'white',
              fontWeight: 'bold',
              px: 1.5
            }
          }}
        />
      </Box>
      
      <CardContent sx={{ flexGrow: 1, p: 2, pt: 1.5 }}>
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
          color: 'white',
        }}>
          {video.title}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#ccc' }}>
            <VisibilityIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption">
              {formatViews(video.views)}
            </Typography>
          </Box>
          
          {createdAtField && (
            <Typography variant="caption" sx={{ color: '#ccc' }}>
              {formatDate(createdAtField)}
            </Typography>
          )}
        </Box>

        {/* Actions: Preview and Telegram */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<VisibilityIcon />}
            onClick={handlePreviewClick}
            sx={{
              backgroundColor: '#8e24aa',
              color: 'white',
              '&:hover': {
                backgroundColor: '#6a1b9a',
              }
            }}
          >
            Preview
          </Button>
          <Button
            variant="contained"
            fullWidth
            startIcon={<TelegramIcon />}
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              backgroundColor: '#8e24aa',
              color: 'white',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#6a1b9a',
              }
            }}
          >
            Telegram
          </Button>
          <Button
            variant="contained"
            fullWidth
            startIcon={<CreditCardIcon />}
            onClick={handleStripePay}
            disabled={isStripeLoading}
            sx={{
              backgroundColor: '#8e24aa',
              color: 'white',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#6a1b9a',
              }
            }}
          >
            Pay
          </Button>
        </Box>

      </CardContent>
      </Card>
    </>
  );
};

export default VideoCard; 