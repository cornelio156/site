import { FC, useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { VideoService } from '../services/VideoService';
import MultiVideoPreview from '../components/MultiVideoPreview';

const MultiVideoExample: FC = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const allVideos = await VideoService.getAllVideos();
        
        // Group videos into collections (example: by category or similar titles)
        const groupedVideos = allVideos.reduce((acc, video, index) => {
          const groupIndex = Math.floor(index / 3); // Group every 3 videos
          if (!acc[groupIndex]) acc[groupIndex] = [];
          acc[groupIndex].push(video);
          return acc;
        }, [] as any[]);

        // Create multi-video previews
        const multiVideoData = groupedVideos.map(group => ({
          mainVideo: group[0],
          relatedVideos: group.slice(1, 4), // Up to 3 related videos
        }));

        setVideos(multiVideoData);
      } catch (error) {
        console.error('Error loading videos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Multi-Video Preview Examples
      </Typography>
      
      <Typography variant="body1" paragraph>
        These examples show how multiple videos can be previewed together in a carousel format.
      </Typography>

      <Grid container spacing={4}>
        {videos.map((videoGroup, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Collection {index + 1}
              </Typography>
              
              <Box sx={{ height: '300px', mb: 2 }}>
                <MultiVideoPreview
                  videos={[
                    {
                      $id: videoGroup.mainVideo.$id,
                      title: videoGroup.mainVideo.title,
                      thumbnailUrl: videoGroup.mainVideo.thumbnailUrl,
                      duration: videoGroup.mainVideo.duration,
                      price: videoGroup.mainVideo.price
                    },
                    ...videoGroup.relatedVideos.map((video: any) => ({
                      $id: video.$id,
                      title: video.title,
                      thumbnailUrl: video.thumbnailUrl,
                      duration: video.duration,
                      price: video.price
                    }))
                  ]}
                  autoPlay={false}
                  showControls={true}
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {videoGroup.mainVideo.title} + {videoGroup.relatedVideos.length} related videos
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          How to Use Multi-Video Preview
        </Typography>
        
        <Typography variant="body2" paragraph>
          1. <strong>Carousel Navigation:</strong> Use arrow buttons or thumbnail strip to navigate between videos
        </Typography>
        
        <Typography variant="body2" paragraph>
          2. <strong>Auto-play:</strong> Videos can automatically cycle through when hovered
        </Typography>
        
        <Typography variant="body2" paragraph>
          3. <strong>Click to View:</strong> Clicking any video will navigate to its detail page
        </Typography>
        
        <Typography variant="body2" paragraph>
          4. <strong>Video Counter:</strong> Shows current position (e.g., "2/4")
        </Typography>
      </Box>
    </Container>
  );
};

export default MultiVideoExample;
