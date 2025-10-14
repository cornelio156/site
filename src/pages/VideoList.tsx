import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { Fade, Grow } from '@mui/material';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import FilterListIcon from '@mui/icons-material/FilterList';
import Collapse from '@mui/material/Collapse';
import Slider from '@mui/material/Slider';
import { Chip } from '@mui/material';
import Modal from '@mui/material/Modal';
import Backdrop from '@mui/material/Backdrop';
import WarningIcon from '@mui/icons-material/Warning';
import { useAuth } from '../services/Auth';
import VideoCard from '../components/VideoCard';
import { VideoService, Video, SortOption } from '../services/VideoService';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useDebounce } from '../hooks/useDebounce';
import ContactSection from '../components/ContactSection';

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

const VideoList: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.NEWEST);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [durationFilter, setDurationFilter] = useState<string | null>(null);
  const [showAdultWarning, setShowAdultWarning] = useState(false);
  
  const { user } = useAuth();
  const { siteConfig } = useSiteConfig();

  // Check if user has seen the adult content warning
  useEffect(() => {
    const hasSeenWarning = localStorage.getItem('adult_content_warning_seen');
    if (!hasSeenWarning) {
      setShowAdultWarning(true);
    }
  }, []);

  // Update search query when URL params change
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search') || '';
    if (urlSearchQuery !== searchQuery) {
      setSearchQuery(urlSearchQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get all videos at once without pagination
        const allVideos = await VideoService.getAllVideos(sortOption, debouncedSearchQuery);
        
        console.log('Received videos:', allVideos);
        
        // Apply client-side filtering for price range
        let filteredVideos = allVideos.filter(video => 
          video.price >= priceRange[0] && video.price <= priceRange[1]
        );
        
        // Apply duration filter if selected
        if (durationFilter) {
          filteredVideos = filteredVideos.filter(video => {
            const duration = video.duration || '00:00';
            const parts = duration.split(':').map(Number);
            const seconds = parts.length === 2 
              ? parts[0] * 60 + parts[1] 
              : parts[0] * 3600 + parts[1] * 60 + parts[2];
              
            switch(durationFilter) {
              case 'short': // Less than 5 minutes
                return seconds < 300;
              case 'medium': // 5-15 minutes
                return seconds >= 300 && seconds <= 900;
              case 'long': // More than 15 minutes
                return seconds > 900;
              default:
                return true;
            }
          });
        }
        
        // Set all filtered videos to state
        setVideos(filteredVideos);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [user, sortOption, debouncedSearchQuery, priceRange, durationFilter]);

  // Verificação periódica para limpar cache se necessário
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Verificar se há sinal para limpar cache
        const response = await fetch('/api/clear-cache', { method: 'POST' });
        if (response.ok) {
          console.log('Cache clear signal received, refreshing videos...');
          VideoService.clearCachePublic();
          // Recarregar vídeos
          const allVideos = await VideoService.getAllVideos(sortOption, debouncedSearchQuery);
          setVideos(allVideos);
        }
      } catch (error) {
        // Ignorar erros de rede
        console.log('Cache check failed:', error);
      }
    };

    // Verificar a cada 10 segundos
    const interval = setInterval(checkForUpdates, 10000);
    
    return () => clearInterval(interval);
  }, [sortOption, debouncedSearchQuery]);

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortOption(event.target.value as SortOption);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handlePriceRangeChange = (event: Event, newValue: number | number[]) => {
    setPriceRange(newValue as [number, number]);
  };
  
  const handleDurationFilterChange = (value: string | null) => {
    setDurationFilter(value === durationFilter ? null : value);
  };
  
  const handleClearFilters = () => {
    setPriceRange([0, 100]);
    setDurationFilter(null);
  };

  // Handle adult content warning acknowledgment
  const handleCloseAdultWarning = () => {
    localStorage.setItem('adult_content_warning_seen', 'true');
    setShowAdultWarning(false);
  };

  // Render skeleton loaders during loading state
  const renderSkeletons = () => {
    return Array(12).fill(0).map((_, index) => (
      <Grid item key={`skeleton-${index}`} xs={12} sm={6} md={4} lg={3}>
        <VideoCardSkeleton />
      </Grid>
    ));
  };

  return (
    <>
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Adult Content Warning Modal */}
      <Modal
        open={showAdultWarning}
        onClose={handleCloseAdultWarning}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
        aria-labelledby="adult-content-warning"
      >
        <Fade in={showAdultWarning}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: '500px' },
            bgcolor: 'background.paper',
            border: '2px solid #f44336',
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <WarningIcon color="error" sx={{ fontSize: 40, mr: 2 }} />
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                Adult Content Warning
              </Typography>
            </Box>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              This website contains adult material and is intended only for people 18 years of age or older.
              By clicking "Enter", you confirm that you are at least 18 years old and consent to viewing adult content.
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="outlined" 
                color="error" 
                onClick={() => window.history.back()}
              >
                Exit
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleCloseAdultWarning}
              >
                Enter (18+)
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>
      
      <Box 
        data-testid="search-section"
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          mb: 3
        }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {siteConfig?.video_list_title || 'Available Videos'}
          </Typography>
          {!loading && videos.length > 0 && (
            <Box sx={{ mt: -1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Showing {videos.length} video{videos.length !== 1 ? 's' : ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
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
              </Box>
            </Box>
          )}
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: 2,
          width: { xs: '100%', md: 'auto' },
          mt: { xs: 2, md: 0 }
        }}>
          <TextField
            placeholder="Search videos..."
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ minWidth: { xs: '100%', sm: '200px' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: '150px' } }}>
              <InputLabel id="sort-select-label">Sort By</InputLabel>
              <Select
                labelId="sort-select-label"
                value={sortOption}
                label="Sort By"
                onChange={handleSortChange}
              >
                <MenuItem value={SortOption.NEWEST}>Newest</MenuItem>
                <MenuItem value={SortOption.PRICE_ASC}>Price: Low to High</MenuItem>
                <MenuItem value={SortOption.PRICE_DESC}>Price: High to Low</MenuItem>
                <MenuItem value={SortOption.VIEWS_DESC}>Most Viewed</MenuItem>
                <MenuItem value={SortOption.DURATION_DESC}>Longest</MenuItem>
              </Select>
            </FormControl>
            
            <Button 
              variant={showFilters ? "contained" : "outlined"}
              color="primary"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              size="small"
            >
              Filters
            </Button>
          </Box>
        </Box>
      </Box>
      
      <Collapse in={showFilters}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filter Options
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Price Range (${priceRange[0]} - ${priceRange[1]})
              </Typography>
              <Slider
                value={priceRange}
                onChange={handlePriceRangeChange}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                sx={{ mt: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Duration
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Chip 
                  label="Short (<5 min)" 
                  onClick={() => handleDurationFilterChange('short')}
                  color={durationFilter === 'short' ? 'primary' : 'default'}
                  variant={durationFilter === 'short' ? 'filled' : 'outlined'}
                />
                <Chip 
                  label="Medium (5-15 min)" 
                  onClick={() => handleDurationFilterChange('medium')}
                  color={durationFilter === 'medium' ? 'primary' : 'default'}
                  variant={durationFilter === 'medium' ? 'filled' : 'outlined'}
                />
                <Chip 
                  label="Long (>15 min)" 
                  onClick={() => handleDurationFilterChange('long')}
                  color={durationFilter === 'long' ? 'primary' : 'default'}
                  variant={durationFilter === 'long' ? 'filled' : 'outlined'}
                />
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          </Box>
        </Paper>
      </Collapse>
      
      {debouncedSearchQuery && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body1">
            Search results for: <strong>"{debouncedSearchQuery}"</strong>
          </Typography>
        </Paper>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box>
        {loading ? (
          <Grid container spacing={3}>
            {renderSkeletons()}
          </Grid>
        ) : videos.length === 0 ? (
          <Grow in={true} timeout={1000}>
            <Paper sx={{ 
              p: 4, 
              my: 3, 
              textAlign: 'center',
              borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(255, 15, 80, 0.05) 0%, rgba(209, 13, 66, 0.05) 100%)'
            }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                No videos found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery 
                  ? `No videos matching "${searchQuery}". Try a different search term.` 
                  : (showFilters 
                    ? 'No videos match your current filters. Try adjusting your filter settings.' 
                    : 'No videos available at the moment. Please check back later.')}
              </Typography>
            </Paper>
          </Grow>
          ) : (
            <>
              <Grid container spacing={3}>
                {videos.map((video, index) => (
                  <Grow
                    key={video.$id}
                    in={true}
                    timeout={300 + index * 50}
                  >
                    <Grid item xs={12} sm={6} md={4} lg={3}>
                      <VideoCard video={video} />
                    </Grid>
                  </Grow>
                ))}
              </Grid>
            </>
          )}
      </Box>
    </Container>
    
    <ContactSection />
    </>
  );
};

export default VideoList; 