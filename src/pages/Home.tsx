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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [showSetupButton, setShowSetupButton] = useState(false);
  // const [quickSearchQuery, setQuickSearchQuery] = useState(''); // Removed - no longer needed
  const [loadedVideos, setLoadedVideos] = useState<Video[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SortOption>(SortOption.VIEWS_DESC);
  
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
        
        // Get video IDs first (ultra-fast operation - no metadata loading)  
        const allVideoIds = await VideoService.getVideoIds(selectedFilter);
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
  }, [user, page, selectedFilter]);

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
          setLoadedVideos(prev => {
            // Check if video already exists to prevent duplicates
            if (prev.some(v => v.$id === video.$id)) {
              return prev;
            }
            return [...prev, video];
          });
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
          // Add video immediately to both arrays, checking for duplicates
          setLoadedVideos(prev => {
            // Check if video already exists to prevent duplicates
            if (prev.some(v => v.$id === video.$id)) {
              return prev;
            }
            return [...prev, video];
          });
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

  const handleFilterChange = (event: React.MouseEvent<HTMLElement>, newFilter: SortOption | null) => {
    if (newFilter !== null) {
      setSelectedFilter(newFilter);
      setPage(1); // Reset to first page when changing filter
    }
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
      // Create special offer message for Telegram
      const specialOfferMessage = `
Hey! Saw your $90 deal for everything 🔥

I want in! How do I pay?

Thanks!
      `.trim();

      // Encode message for URL
      const encodedMessage = encodeURIComponent(specialOfferMessage);

      // Open Telegram with pre-formatted message
      window.open(`https://t.me/${telegramUsername}?text=${encodedMessage}`, '_blank');
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
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
      
      {/* Banner de destaque - Temporarily disabled */}
      {/* <FeaturedBanner onError={handleBannerError} /> */}
      
      {/* Contador de usuários online */}
      <OnlineUsersCounter 
        variant="detailed" 
        position="fixed" 
        size="medium" 
      />
      
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>

        {/* Special Offer Section */}
        <Box sx={{ 
          mb: 6,
          py: 5,
          px: 4,
          background: 'linear-gradient(135deg, #FF0F50 0%, #D10D42 50%, #8B0000 100%)',
          borderRadius: 3,
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(255, 15, 80, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
            animation: 'shimmer 3s infinite'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -50,
            right: -50,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            animation: 'pulse 4s ease-in-out infinite'
          }
        }}>
          <Typography variant="h3" sx={{ 
            fontWeight: 'bold', 
            mb: 2, 
            position: 'relative', 
            zIndex: 1,
            textShadow: '0 4px 8px rgba(0,0,0,0.3)',
            fontSize: { xs: '1.8rem', md: '2.5rem' }
          }}>
            🎉 SPECIAL OFFER 🎉
          </Typography>
          <Typography variant="h4" sx={{ 
            fontWeight: 'bold', 
            mb: 2, 
            position: 'relative', 
            zIndex: 1,
            textShadow: '0 3px 6px rgba(0,0,0,0.3)',
            fontSize: { xs: '1.5rem', md: '2rem' }
          }}>
            ALL CONTENT FOR ONLY $90
          </Typography>
          <Typography variant="h6" sx={{ 
            mb: 2, 
            position: 'relative', 
            zIndex: 1, 
            opacity: 0.95,
            fontSize: { xs: '1rem', md: '1.2rem' },
            fontWeight: 500
          }}>
            Get access to our entire premium collection at an unbeatable price!
          </Typography>
          <Typography variant="h5" sx={{ 
            mb: 3, 
            position: 'relative', 
            zIndex: 1, 
            fontWeight: 'bold', 
            color: '#FFEB3B',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            fontSize: { xs: '1.1rem', md: '1.4rem' },
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            📦 EVERYTHING YOU SEE ON THIS SITE INCLUDED! 📦
          </Typography>
          
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
                px: 5,
                py: 2.5,
                borderRadius: '30px',
                textTransform: 'none',
                fontSize: { xs: '1rem', md: '1.2rem' },
                position: 'relative',
                zIndex: 1,
                '&:hover': {
                  backgroundColor: '#006699',
                  transform: 'scale(1.08) translateY(-2px)',
                  boxShadow: '0 12px 30px rgba(0, 136, 204, 0.6)',
                },
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 25px rgba(0, 136, 204, 0.5)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              🚀 Come to Telegram to Pay 
            </Button>
          )}
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
            
            {/* Filter Bar */}
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={selectedFilter}
                exclusive
                onChange={handleFilterChange}
                aria-label="video filters"
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    border: '1px solid rgba(255, 15, 80, 0.3)',
                    color: '#FF0F50',
                    fontWeight: 'bold',
                    px: 2,
                    py: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: '#FF0F50',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#D10D42',
                      }
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 15, 80, 0.1)',
                    }
                  }
                }}
              >
                <ToggleButton value={SortOption.VIEWS_DESC} aria-label="most viewed">
                  🔥 Most Viewed
                </ToggleButton>
                <ToggleButton value={SortOption.NEWEST} aria-label="recent">
                  🆕 Recent
                </ToggleButton>
                <ToggleButton value={SortOption.PRICE_DESC} aria-label="expensive">
                  💰 Expensive
                </ToggleButton>
                <ToggleButton value={SortOption.PRICE_ASC} aria-label="cheap">
                  💸 Cheap
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {!loading && loadedVideos.length > 0 && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1, alignItems: 'center' }}>
                <Chip 
                  label={`From $${Math.min(...loadedVideos.map(v => v.price)).toFixed(2)}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255, 15, 80, 0.1)',
                    color: '#FF0F50',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 15, 80, 0.3)'
                  }}
                />
                <Chip 
                  label={`Up to $${Math.max(...loadedVideos.map(v => v.price)).toFixed(2)}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255, 15, 80, 0.1)',
                    color: '#FF0F50',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 15, 80, 0.3)'
                  }}
                />
                <Chip 
                  label={`Avg: $${(loadedVideos.reduce((sum, v) => sum + v.price, 0) / loadedVideos.length).toFixed(2)}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255, 15, 80, 0.1)',
                    color: '#FF0F50',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 15, 80, 0.3)'
                  }}
                />
                <Chip 
                  label="🔥 927+ Happy Customers"
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    color: '#4CAF50',
                    fontWeight: 'bold',
                    border: '1px solid rgba(76, 175, 80, 0.3)'
                  }}
                />
                <Chip 
                  label="⭐ 4.4/5 Rating"
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    color: '#FFC107',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 193, 7, 0.3)'
                  }}
                />
                
                {/* Contador de usuários online */}
                <OnlineUsersCounter 
                  variant="chip" 
                  size="small" 
                  showDetails={true}
                />
                
                {/* Loading progress indicator */}
                {isLoadingMore && (
                  <Chip 
                    label={`Loading ${loadedVideos.length} videos...`}
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
              <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                {renderSkeletons()}
              </Grid>
            ) : loadedVideos.length === 0 && !isLoadingMore ? (
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
                <Grid container spacing={{ xs: 1.25, sm: 2, md: 3 }}>
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
