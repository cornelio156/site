import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Fade from '@mui/material/Fade';
import Grow from '@mui/material/Grow';
import Pagination from '@mui/material/Pagination';
import Button from '@mui/material/Button';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SettingsIcon from '@mui/icons-material/Settings';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
// import TextField from '@mui/material/TextField'; // Removed - no longer needed
// import InputAdornment from '@mui/material/InputAdornment'; // Removed - no longer needed
// import SearchIcon from '@mui/icons-material/Search'; // Removed - no longer needed
import Paper from '@mui/material/Paper';
import { Chip } from '@mui/material';
import { useAuth } from '../services/Auth';
import VideoCard from '../components/VideoCard';
import { VideoService, Video, SortOption } from '../services/VideoService';
import { useSiteConfig } from '../context/SiteConfigContext';
import TelegramIcon from '@mui/icons-material/Telegram';
// import FeaturedBanner from '../components/FeaturedBanner'; // Temporarily disabled
import DatabaseSetupModal from '../components/DatabaseSetupModal';
import CredentialsStatus from '../components/CredentialsStatus';
import ContactSection from '../components/ContactSection';
import OnlineUsersCounter from '../components/OnlineUsersCounter';

// Skeleton card component for loading state
const VideoCardSkeleton: FC = () => {
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      bgcolor: 'background.paper'
    }}>
      <Skeleton 
        variant="rectangular" 
        sx={{ width: '100%', paddingTop: '56.25%' }} 
        animation="wave" 
      />
      <CardContent>
        <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 1 }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem', width: '60%' }} />
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton variant="text" sx={{ width: '30%' }} />
          <Skeleton variant="text" sx={{ width: '20%' }} />
        </Box>
      </CardContent>
    </Card>
  );
};

// Loading card component with progress indicator
const VideoCardLoading: FC<{ index: number }> = ({ index }) => {
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      bgcolor: 'background.paper',
      position: 'relative'
    }}>
      {/* Thumbnail area with progress indicator */}
      <Box sx={{ 
        width: '100%', 
        paddingTop: '56.25%', 
        position: 'relative',
        bgcolor: 'rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 2
        }}>
          <CircularProgress 
            size={40} 
            thickness={4}
            sx={{ 
              color: 'primary.main',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} 
          />
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          >
            Loading video {index + 1}...
          </Typography>
        </Box>
      </Box>
      
      <CardContent>
        <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 1 }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem', width: '60%' }} />
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton variant="text" sx={{ width: '30%' }} />
          <Skeleton variant="text" sx={{ width: '20%' }} />
        </Box>
      </CardContent>
    </Card>
  );
};

const Home: FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [showSetupButton, setShowSetupButton] = useState(false);
  // const [quickSearchQuery, setQuickSearchQuery] = useState(''); // Removed - no longer needed
  const [loadedVideos, setLoadedVideos] = useState<Video[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const { user } = useAuth();
  const { videoListTitle, telegramUsername } = useSiteConfig();
  const navigate = useNavigate();
  const videosPerPage = 24; // Aumentar de 12 para 24 vídeos por página

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        setLoadedVideos([]); // Reset loaded videos
        setVideos([]); // Reset videos array
        
        // Get video IDs first (ultra-fast operation - no metadata loading)
        const allVideoIds = await VideoService.getVideoIds(SortOption.NEWEST);
        const totalPages = Math.ceil(allVideoIds.length / videosPerPage);
        setTotalPages(totalPages);
        
        // Get video IDs for current page
        const startIndex = (page - 1) * videosPerPage;
        const endIndex = startIndex + videosPerPage;
        const pageVideoIds = allVideoIds.slice(startIndex, endIndex);
        
        // Set loading to false immediately so skeletons show
        setLoading(false);
        
        // Load videos one by one, starting immediately
        loadVideosOneByOne(pageVideoIds);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchVideos();
    
    // Sempre mostrar o botão de configuração (não dependemos mais do Appwrite)
    setShowSetupButton(false);
  }, [user, page]);

  // Function to load videos one by one (immediate first video)
  const loadVideosOneByOne = async (videoIds: string[]) => {
    setIsLoadingMore(true);
    
    // Load first 3 videos immediately without delay
    const immediateVideos = videoIds.slice(0, 3);
    const remainingVideos = videoIds.slice(3);
    
    // Load first 3 videos in parallel for instant display
    const immediatePromises = immediateVideos.map(async (videoId) => {
      try {
        const video = await VideoService.getVideo(videoId);
        if (video) {
          setLoadedVideos(prev => [...prev, video]);
          setVideos(prev => [...prev, video]);
        }
      } catch (error) {
        console.error(`Error loading video ${videoId}:`, error);
      }
    });
    
    // Wait for first 3 videos to load
    await Promise.all(immediatePromises);
    
    // Load remaining videos one by one with delay
    for (let i = 0; i < remainingVideos.length; i++) {
      const videoId = remainingVideos[i];
      
      try {
        // Load individual video
        const video = await VideoService.getVideo(videoId);
        
        if (video) {
          // Add video immediately to both arrays
          setLoadedVideos(prev => [...prev, video]);
          setVideos(prev => [...prev, video]);
        }
        
        // Add a small delay between videos
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`Error loading video ${videoId}:`, error);
        // Continue with next video even if current one fails
      }
    }
    
    setIsLoadingMore(false);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    // Scroll to top with enhanced smooth behavior
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
    
    // Add a small delay to ensure smooth transition
    setTimeout(() => {
      const headerElement = document.querySelector('header');
      if (headerElement) {
        headerElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };

  // Render skeleton loaders during loading state
  const renderSkeletons = () => {
    // Show skeletons for videos that haven't loaded yet
    const totalExpectedVideos = videosPerPage;
    const loadedCount = loadedVideos.length;
    const skeletonCount = Math.max(0, totalExpectedVideos - loadedCount);
    
    return Array(skeletonCount).fill(0).map((_, index) => (
      <Grid item key={`skeleton-${index}`} xs={12} sm={6} md={4} lg={3}>
        <VideoCardSkeleton />
      </Grid>
    ));
  };

  // Render loading cards with progress indicators
  const renderLoadingCards = () => {
    // Show loading cards for videos that are currently being loaded
    const totalExpectedVideos = videosPerPage;
    const loadedCount = loadedVideos.length;
    const loadingCount = Math.max(0, totalExpectedVideos - loadedCount);
    
    return Array(loadingCount).fill(0).map((_, index) => (
      <Grid item key={`loading-${index}`} xs={12} sm={6} md={4} lg={3}>
        <VideoCardLoading index={loadedCount + index} />
      </Grid>
    ));
  };

  // const handleBannerError = (errorMsg: string) => {
  //   setError(errorMsg);
  // }; // Temporarily disabled with FeaturedBanner

  // const handleQuickSearch = (event: React.FormEvent) => {
  //   event.preventDefault();
  //   if (quickSearchQuery.trim()) {
  //     navigate(`/videos?search=${encodeURIComponent(quickSearchQuery.trim())}`);
  //   }
  // }; // Removed - search is now handled by header search bar only

  // const handleQuickSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setQuickSearchQuery(event.target.value);
  // }; // Removed - search is now handled by header search bar only

  const handleTelegramClick = () => {
    if (telegramUsername) {
      // Create welcome message for Telegram
      const welcomeMessage = `
🎬 *Premium Video Collection*

Welcome to our premium content site!

✨ *What we offer:*
• Exclusive high-quality videos
• Secure payments (PayPal, Stripe, Crypto)
• Instant access after purchase
• 18+ adult content

🔒 *Privacy and Security:*
• Encrypted transactions
• Protected data
• 24/7 support

💬 *Need help?*
I'm here to answer your questions about our videos and services!

*Click "View Videos" to start your journey!* 🚀
      `.trim();

      // Encode message for URL
      const encodedMessage = encodeURIComponent(welcomeMessage);

      // Open Telegram with pre-formatted message
      window.open(`https://t.me/${telegramUsername}?text=${encodedMessage}`, '_blank');
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
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
      
      {/* Banner de destaque - Temporarily disabled */}
      {/* <FeaturedBanner onError={handleBannerError} /> */}
      
      {/* Contador de usuários online */}
      <OnlineUsersCounter 
        variant="detailed" 
        position="fixed" 
        size="medium" 
      />
      
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Simple header to replace the banner */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 6,
          py: 4,
          background: 'linear-gradient(135deg, rgba(255, 15, 80, 0.05) 0%, rgba(209, 13, 66, 0.05) 100%)',
          borderRadius: 2,
          border: '1px solid rgba(255, 15, 80, 0.1)'
        }}>
          <Typography 
            variant="h2" 
            component="h1" 
          sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              background: 'linear-gradient(45deg, #FF0F50 30%, #D10D42 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            Premium Video Collection
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary',
              maxWidth: '600px',
              mx: 'auto',
              mb: 3
            }}
          >
            Discover exclusive adult content with high-quality videos and secure payment options
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip 
              label="18+ ADULTS ONLY" 
              color="error"
              sx={{ fontWeight: 'bold' }}
            />
            <Chip 
              label="SECURE PAYMENTS" 
              color="primary"
              sx={{ fontWeight: 'bold' }}
            />
            <Chip 
              label="INSTANT ACCESS" 
              color="secondary"
              sx={{ fontWeight: 'bold' }}
            />
            
            {/* Telegram Button */}
            {telegramUsername && (
              <Button
                variant="contained"
                startIcon={<TelegramIcon />}
                onClick={handleTelegramClick}
              sx={{ 
                  backgroundColor: '#0088cc',
                  color: 'white',
                  fontWeight: 'bold',
                  px: 3,
                py: 1,
                  borderRadius: '25px',
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  '&:hover': {
                    backgroundColor: '#006699',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 136, 204, 0.3)',
                }}
              >
                Contact on Telegram
            </Button>
            )}
          </Box>
        </Box>

        {/* Status das Credenciais */}
        <CredentialsStatus />
        

        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          mb: 3
        }}>
          <Box>
            <Typography variant="h4" component="h2" gutterBottom>
              {videoListTitle || 'Featured Videos'}
            </Typography>
            {!loading && videos.length > 0 && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1, alignItems: 'center' }}>
                <Chip 
                  label={`From $${Math.min(...videos.map(v => v.price)).toFixed(2)}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255, 15, 80, 0.1)',
                    color: '#FF0F50',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 15, 80, 0.3)'
                  }}
                />
                <Chip 
                  label={`Up to $${Math.max(...videos.map(v => v.price)).toFixed(2)}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255, 15, 80, 0.1)',
                    color: '#FF0F50',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 15, 80, 0.3)'
                  }}
                />
                <Chip 
                  label={`Avg: $${(videos.reduce((sum, v) => sum + v.price, 0) / videos.length).toFixed(2)}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255, 15, 80, 0.1)',
                    color: '#FF0F50',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 15, 80, 0.3)'
                  }}
                />
                
                {/* Contador de usuários online */}
                <OnlineUsersCounter 
                  variant="chip" 
                  size="small" 
                  showDetails={true}
                />
                
                {/* Loading progress indicator */}
                {isLoadingMore && loadedVideos.length < videos.length && (
                  <Chip 
                    label={`Loading ${loadedVideos.length}/${videos.length} videos...`}
                    size="small"
                    sx={{ 
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      color: '#2196F3',
                      fontWeight: 'bold',
                      border: '1px solid rgba(33, 150, 243, 0.3)',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}
                  />
                )}
              </Box>
            )}
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            alignItems: 'center',
            alignSelf: { xs: 'flex-start', md: 'center' }
          }}>
            {showSetupButton && (
              <Tooltip title="Configurar Armazenamento Wasabi">
                <Button
                  onClick={() => setSetupModalOpen(true)}
                  variant="outlined"
                  color="secondary"
                  size="small"
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1.5,
                    opacity: 0.7,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  <SettingsIcon fontSize="small" />
                </Button>
              </Tooltip>
            )}
            
            <Button 
              component={RouterLink}
              to="/videos"
              variant="outlined"
              color="primary"
              endIcon={<ArrowForwardIcon />}
            >
              View All Videos
            </Button>
          </Box>
        </Box>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setSetupModalOpen(true)}
                startIcon={<SettingsIcon />}
              >
                Configurar Base de Dados
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        
        <Fade in={true} timeout={500}>
          <Box>
            {loading ? (
              <Grid container spacing={3}>
                {renderSkeletons()}
              </Grid>
            ) : videos.length === 0 && !isLoadingMore ? (
              <Grow in={true} timeout={1000}>
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: '1.5rem'
                    }
                  }}
                >
                  No videos available at the moment. Please check back later.
                </Alert>
              </Grow>
            ) : (
              <>
                <Grid container spacing={3}>
                  {/* Show loaded videos with smooth animation */}
                  {loadedVideos.map((video, index) => (
                    <Grow
                      key={video.$id}
                      in={true}
                      timeout={200}
                    >
                      <Grid item xs={12} sm={6} md={4} lg={3}>
                        <VideoCard video={video} />
                      </Grid>
                    </Grow>
                  ))}
                  
                  {/* Show loading cards with progress indicators for remaining videos */}
                  {isLoadingMore && renderLoadingCards()}
                </Grid>
                
                {totalPages > 1 && (
                  <Fade in={true} timeout={800}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      mt: 5,
                      pt: 3,
                      borderTop: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Pagination 
                        count={totalPages} 
                        page={page} 
                        onChange={handlePageChange}
                        color="primary"
                        size="large"
                        showFirstButton
                        showLastButton
                        sx={{
                          '& .MuiPaginationItem-root': {
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'scale(1.1)',
                              bgcolor: 'primary.main',
                              color: 'white'
                            }
                          }
                        }}
                      />
                    </Box>
                  </Fade>
                )}
              </>
            )}
          </Box>
        </Fade>
      </Container>
      
      <ContactSection />
      
      {/* Modal de setup da base de dados */}
      <DatabaseSetupModal 
        open={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
      />
    </Box>
  );
};

export default Home;
