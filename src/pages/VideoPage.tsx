import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TelegramIcon from '@mui/icons-material/Telegram';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAuth } from '../services/Auth';
import { useSiteConfig } from '../context/SiteConfigContext';
import { VideoService, Video } from '../services/VideoService';

// Skeleton component for video page loading state
const VideoPageSkeleton: FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Skeleton variant="rectangular" width={120} height={40} sx={{ mb: 3, borderRadius: 1 }} />
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Skeleton variant="text" sx={{ fontSize: '2rem', mb: 2, width: '60%' }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Skeleton 
              variant="rectangular" 
              sx={{ width: '100%', height: 300, borderRadius: 1 }} 
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 2, width: '40%' }} />
            <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 1 }} />
            <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 1, width: '80%' }} />
            <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 2, width: '60%' }} />
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Skeleton variant="rectangular" width={80} height={24} />
              <Skeleton variant="rectangular" width={80} height={24} />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 2, width: '30%' }} />
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Skeleton variant="rectangular" width={120} height={40} />
              <Skeleton variant="rectangular" width={120} height={40} />
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

const VideoPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { telegramUsername } = useSiteConfig();
  const [video, setVideo] = useState<Video | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  useEffect(() => {
    const loadVideo = async () => {
      if (!id) {
        setError('Invalid video ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get video details
        const videoData = await VideoService.getVideo(id);
        if (!videoData) {
          setError('Video not found');
          setLoading(false);
          return;
        }
        
        setVideo(videoData);
        
        // Increment view count
        await VideoService.incrementViews(id);

        // Check if user has purchased this video
        if (user) {
          // Não precisamos mais verificar se o usuário comprou o vídeo
          // O fluxo de compra será sempre possível
          setHasPurchased(false);
          
          // Get video streaming URL
          const url = await VideoService.getVideoFileUrl(id);
          setVideoUrl(url);
        }
      } catch (err) {
        console.error('Error loading video:', err);
        setError('An error occurred while loading the video');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [id, user]);

  const handlePurchase = async () => {
    if (!user) {
      // Redirect to login if not logged in
      navigate('/login', { state: { from: `/video/${id}` } });
      return;
    }

    if (!video) {
      setPurchaseError('Video information not available');
      return;
    }

    try {
      setPurchaseLoading(true);
      setPurchaseError(null);

      // Simulação de processamento de compra
      setTimeout(() => {
        setPurchaseComplete(true);
        setHasPurchased(true);
        
        // Get video streaming URL after purchase
        VideoService.getVideoFileUrl(id!)
          .then(url => setVideoUrl(url))
          .catch(err => console.error('Error getting video URL:', err));
        
        setPurchaseLoading(false);
      }, 1500);
    } catch (err) {
      console.error('Purchase error:', err);
      setPurchaseError('Failed to complete purchase. Please try again.');
      setPurchaseLoading(false);
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

  // Create Telegram href for the button
  const telegramHref = (() => {
    if (!video) return 'https://t.me/share/url';
    
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
    
    const message = `🎬 **${video.title}**

💰 **Price:** $${video.price.toFixed(2)}
⏱️ **Duration:** ${formatDuration(video.duration)}
👀 **Views:** ${formatViews(video.views)}
📅 **Added:** ${formatAddedDate(new Date(video.createdAt || Date.now()))}

📝 **Description:**
${video.description || 'No description available'}

Please let me know how to proceed with payment.`;
    
    const encoded = encodeURIComponent(message);
    if (telegramUsername) {
      const base = `https://t.me/${telegramUsername.replace('@', '')}`;
      return `${base}?text=${encoded}`;
    } else {
      return `https://t.me/share/url?text=${encoded}`;
    }
  })();

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return <VideoPageSkeleton />;
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={handleBack}
        sx={{ mb: 3 }}
      >
        Back to videos
      </Button>
      
      {purchaseComplete && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Purchase successful! You can now watch this video.
        </Alert>
      )}
      
      {purchaseError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {purchaseError}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {video?.title || 'Video Details'}
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={hasPurchased && videoUrl ? 12 : 6}>
            {hasPurchased && videoUrl ? (
              <Box sx={{ position: 'relative', width: '100%', pt: '56.25%', mb: 2 }}>
                <video
                  controls
                  autoPlay
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000'
                  }}
                  src={videoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </Box>
            ) : (
              <Card>
                <CardMedia
                  component="img"
                  image={video?.thumbnailUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5WaWRlbyBUaHVtYm5haWw8L3RleHQ+PC9zdmc+'}
                  alt={video?.title}
                  sx={{ height: 300, objectFit: 'cover' }}
                />
              </Card>
            )}
          </Grid>
          
          {(!hasPurchased || !videoUrl) && (
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Video Information
              </Typography>
              
              <Typography variant="body1" paragraph>
                {video?.description}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTimeIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {video?.duration ? formatDuration(video.duration) : 'N/A'}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <VisibilityIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {formatViews(video?.views)}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="p" color="primary" sx={{ fontWeight: 'bold' }}>
                  ${video?.price.toFixed(2)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<ShoppingCartCheckoutIcon />}
                  onClick={handlePurchase}
                  disabled={purchaseLoading || hasPurchased || !user}
                >
                  {purchaseLoading ? (
                    <>
                      <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                      Processing...
                    </>
                  ) : hasPurchased ? (
                    'Already Purchased'
                  ) : (
                    'Purchase Now'
                  )}
                </Button>
                
                {telegramUsername && (
                  <Button
                    variant="outlined"
                    color="primary"
                    fullWidth
                    startIcon={<TelegramIcon />}
                    href={telegramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contact on Telegram
                  </Button>
                )}
              </Box>
              
              {!user && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Please log in to purchase this video.
                </Alert>
              )}
            </Grid>
          )}
        </Grid>
        
        {hasPurchased && videoUrl && (
          <>
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            
            <Typography variant="body1" paragraph>
              {video?.description}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {video?.duration ? formatDuration(video.duration) : 'N/A'}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <VisibilityIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {formatViews(video?.views)}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default VideoPage; 