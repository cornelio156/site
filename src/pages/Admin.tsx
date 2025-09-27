import { useState, useEffect, useRef, ChangeEvent } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/Auth';
import { VideoService } from '../services/VideoService';
import { wasabiService } from '../services/WasabiService';
import { useSiteConfig } from '../context/SiteConfigContext';
import { UserServiceSupabase } from '../services/UserServiceSupabase';
import { SiteConfigServiceSupabase } from '../services/SiteConfigServiceSupabase';
import FormControlLabel from '@mui/material/FormControlLabel';
import SendIcon from '@mui/icons-material/Send';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import LinearProgress from '@mui/material/LinearProgress';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import Card from '@mui/material/Card';
import OnlineUsersPanel from '../components/OnlineUsersPanel';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import React from 'react';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LockIcon from '@mui/icons-material/Lock';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Styled components for file upload
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

// Custom Alert component
const CustomAlert = React.forwardRef<HTMLDivElement, AlertProps>((props, ref) => {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// Video interface
interface Video {
  $id: string;
  title: string;
  description: string;
  price: number;
  product_link?: string;
  video_id?: string;
  videoFileId?: string;
  thumbnail_id?: string;
  thumbnailFileId?: string;
  created_at: string;
  is_active: boolean;
  duration?: number;
}

// User interface
interface User {
  $id: string;
  email: string;
  name: string;
  password: string;
  created_at: string;
}

// Site config interface
interface SiteConfig {
  $id: string;
  site_name: string;
  paypal_client_id: string;
  paypal_me_username?: string;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  telegram_username: string;
  video_list_title?: string;
  crypto?: string[];
  email_host?: string;
  email_port?: string;
  email_secure?: boolean;
  email_user?: string;
  email_pass?: string;
  email_from?: string;
  wasabi_config?: {
    accessKey: string;
    secretKey: string;
    region: string;
    bucket: string;
    endpoint: string;
  };
}

// Admin page component
const Admin: FC = () => {
  const { user } = useAuth();
  const { refreshConfig, updateConfig } = useSiteConfig();
  const [tabValue, setTabValue] = useState(0);
  
  // Videos state
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  
  // Video form state
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoPrice, setVideoPrice] = useState('');
  const [productLink, setProductLink] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUser, setNewUser] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  
  // Site config state
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [siteName, setSiteName] = useState('');
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalMeUsername, setPaypalMeUsername] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [videoListTitle, setVideoListTitle] = useState('');
  const [cryptoWallets, setCryptoWallets] = useState<string[]>([]);
  const [newCryptoWallet, setNewCryptoWallet] = useState('');
  
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [editingConfig, setEditingConfig] = useState(false);
  
  // Email config state
  const [emailHost, setEmailHost] = useState('');
  const [emailPort, setEmailPort] = useState('');
  const [emailSecure, setEmailSecure] = useState(false);
  const [emailUser, setEmailUser] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [emailFrom, setEmailFrom] = useState('');
  
  // Wasabi config state
  const [wasabiAccessKey, setWasabiAccessKey] = useState('');
  const [wasabiSecretKey, setWasabiSecretKey] = useState('');
  const [wasabiRegion, setWasabiRegion] = useState('');
  const [wasabiBucket, setWasabiBucket] = useState('');
  const [wasabiEndpoint, setWasabiEndpoint] = useState('');
  
  // Available cryptocurrencies
  const cryptoCurrencies = [
    { code: 'BTC', name: 'Bitcoin' },
    { code: 'ETH', name: 'Ethereum' },
    { code: 'USDT', name: 'Tether USD' },
    { code: 'BNB', name: 'Binance Coin' },
    { code: 'SOL', name: 'Solana' },
    { code: 'XRP', name: 'Ripple' },
    { code: 'ADA', name: 'Cardano' },
    { code: 'DOGE', name: 'Dogecoin' },
    { code: 'AVAX', name: 'Avalanche' },
    { code: 'DOT', name: 'Polkadot' },
    { code: 'MATIC', name: 'Polygon' },
    { code: 'SHIB', name: 'Shiba Inu' }
  ];
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'video' | 'user', id: string } | null>(null);
  
  // Feedback snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // Video element ref for getting duration
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Admin management state
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);

  // Event listener for show-feedback events
  useEffect(() => {
    const handleShowFeedback = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string, severity: 'success' | 'error' }>;
      setSnackbarMessage(customEvent.detail.message);
      setSnackbarSeverity(customEvent.detail.severity);
      setSnackbarOpen(true);
    };
    
    document.addEventListener('show-feedback', handleShowFeedback);
    
    return () => {
      document.removeEventListener('show-feedback', handleShowFeedback);
    };
  }, []);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Load videos on mount and tab change
  useEffect(() => {
    if (tabValue === 0) {
      fetchVideos();
    } else if (tabValue === 1) {
      fetchUsers();
      fetchSiteConfig();
    } else if (tabValue === 2) {
      fetchAdminUsers();
    }
  }, [tabValue]);

  // Fetch videos from database
  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allVideos = await VideoService.getAllVideos();
      console.log(`Admin: Fetched ${allVideos.length} videos using VideoService`);
      
      // Convert VideoService format to Admin format
      const adminVideos = allVideos.map(video => ({
        $id: video.$id,
        title: video.title,
        description: video.description,
        price: video.price,
        product_link: video.product_link || '',
        video_id: video.video_id || video.videoFileId,
        thumbnail_id: video.thumbnail_id || video.thumbnailFileId,
        created_at: video.createdAt,
        is_active: true,
        duration: typeof video.duration === 'string' ? 
          // Convert duration string (MM:SS or HH:MM:SS) to seconds
          video.duration.split(':').reduce((acc, time) => (60 * acc) + parseInt(time), 0) : 
          undefined
      })) as unknown as Video[];
      
      setVideos(adminVideos);
      setFilteredVideos(adminVideos);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch users from database
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const usersData = await UserServiceSupabase.getAllUsers();
      
      // Convert to admin format
      const adminUsers = usersData.map((user: any) => ({
        $id: user.id,
        email: user.email,
        name: user.name,
        password: user.password,
        created_at: user.created_at
      })) as unknown as User[];
      
      setUsers(adminUsers);
    } catch (err) {
      console.error('Error fetching users from Supabase:', err);
      setError('Failed to load users from Supabase. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch admin users
  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const usersData = await UserServiceSupabase.getAllUsers();
      
      // Filter only admin users (you can add a role field later)
      const adminUsers = usersData.map((user: any) => ({
        $id: user.id,
        email: user.email,
        name: user.name,
        password: user.password,
        created_at: user.created_at
      })) as unknown as User[];
      
      setAdminUsers(adminUsers);
    } catch (err) {
      console.error('Error fetching admin users:', err);
      setError('Failed to load admin users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch site configuration
  const fetchSiteConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const configData = await SiteConfigServiceSupabase.getSiteConfig();
      
      if (configData) {
        const config: SiteConfig = {
          $id: 'site-config',
          site_name: configData.siteName,
          paypal_client_id: configData.paypalClientId,
          paypal_me_username: configData.paypalMeUsername,
          stripe_publishable_key: configData.stripePublishableKey,
          stripe_secret_key: configData.stripeSecretKey,
          telegram_username: configData.telegramUsername,
          video_list_title: configData.videoListTitle,
          crypto: configData.crypto
        };
        
        setSiteConfig(config);
        setSiteName(config.site_name);
        setPaypalClientId(config.paypal_client_id);
        setPaypalMeUsername(config.paypal_me_username || '');
        setStripePublishableKey(config.stripe_publishable_key || '');
        setStripeSecretKey(config.stripe_secret_key || '');
        setTelegramUsername(config.telegram_username);
        setVideoListTitle(config.video_list_title || 'Available Videos');
        setCryptoWallets(config.crypto || []);
        
        // Email settings
        setEmailHost(configData.emailHost || '');
        setEmailPort(configData.emailPort || '');
        setEmailSecure(configData.emailSecure || false);
        setEmailUser(configData.emailUser || '');
        setEmailPass(configData.emailPass || '');
        setEmailFrom(configData.emailFrom || '');
        
        // Wasabi settings
        if (configData.wasabiConfig) {
          setWasabiAccessKey(configData.wasabiConfig.accessKey || '');
          setWasabiSecretKey(configData.wasabiConfig.secretKey || '');
          setWasabiRegion(configData.wasabiConfig.region || '');
          setWasabiBucket(configData.wasabiConfig.bucket || '');
          setWasabiEndpoint(configData.wasabiConfig.endpoint || '');
        }
      }
    } catch (err) {
      console.error('Error fetching site config from Supabase:', err);
      setError('Failed to load site configuration from Supabase');
    } finally {
      setLoading(false);
    }
  };

  // Filter videos when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVideos(videos);
    } else {
      const term = searchTerm.toLowerCase().trim();
      const filtered = videos.filter(
        video => 
          video.title.toLowerCase().includes(term) || 
          video.description.toLowerCase().includes(term)
      );
      setFilteredVideos(filtered);
    }
  }, [searchTerm, videos]);

  // Delete video
  const handleDeleteVideo = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await VideoService.deleteVideo(id);
      
      if (success) {
        showFeedback('Video successfully deleted!', 'success');
        fetchVideos();
      } else {
        showFeedback('Failed to delete video', 'error');
      }
    } catch (err) {
      console.error('Error deleting video:', err);
      showFeedback('Failed to delete video. Please try again.', 'error');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };
  
  // Save admin (create or update)
  const handleSaveAdmin = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!adminName || !adminEmail || !adminPassword) {
        showFeedback('Please fill in all required fields', 'error');
        return;
      }

      if (adminPassword !== confirmPassword) {
        showFeedback('Passwords do not match', 'error');
        return;
      }

      const adminData = {
        name: adminName,
        email: adminEmail,
        password: adminPassword
      };

      if (editingAdmin) {
        // Update existing admin
        const success = await UserServiceSupabase.updateUser(editingAdmin, adminData);
        if (success) {
          showFeedback('Admin updated successfully!', 'success');
          fetchAdminUsers();
          setShowAdminForm(false);
          setEditingAdmin(null);
        } else {
          showFeedback('Failed to update admin', 'error');
        }
      } else {
        // Create new admin
        const success = await UserServiceSupabase.createUser(adminData);
        if (success) {
          showFeedback('Admin created successfully!', 'success');
          fetchAdminUsers();
          setShowAdminForm(false);
        } else {
          showFeedback('Failed to create admin', 'error');
        }
      }

      // Reset form
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setConfirmPassword('');

    } catch (err) {
      console.error('Error saving admin:', err);
      showFeedback('Failed to save admin. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Change current user password
  const handleChangePassword = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        showFeedback('Please fill in all password fields', 'error');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        showFeedback('New passwords do not match', 'error');
        return;
      }

      if (newPassword.length < 6) {
        showFeedback('New password must be at least 6 characters', 'error');
        return;
      }

      // Here you would typically verify the current password first
      // For now, we'll just update it
      const success = await UserServiceSupabase.changePassword(user?.$id || '', newPassword);

      if (success) {
        showFeedback('Password changed successfully!', 'success');
        setShowChangePasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        showFeedback('Failed to change password', 'error');
      }

    } catch (err) {
      console.error('Error changing password:', err);
      showFeedback('Failed to change password. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await UserServiceSupabase.deleteUser(id);
      
      if (success) {
        showFeedback('User successfully deleted!', 'success');
        fetchUsers();
      } else {
        showFeedback('Failed to delete user', 'error');
      }
    } catch (err) {
      console.error('Error deleting user from Supabase:', err);
      showFeedback('Failed to delete user. Please try again.', 'error');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Save video (create or update)
  const handleSaveVideo = async () => {
    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      if (!videoTitle || !videoDescription || !videoPrice) {
        showFeedback('Please fill in all required fields', 'error');
        return;
      }

      const price = parseFloat(videoPrice);
      if (isNaN(price) || price < 0) {
        showFeedback('Please enter a valid price', 'error');
        return;
      }

      let videoFileId = '';
      let thumbnailFileId = '';

      // Se estiver editando, carregar dados existentes primeiro
      if (editingVideo) {
        const existingVideo = videos.find(v => v.$id === editingVideo);
        if (existingVideo) {
          // Preservar IDs existentes se não houver novos arquivos
          videoFileId = existingVideo.video_id || existingVideo.videoFileId || '';
          thumbnailFileId = existingVideo.thumbnail_id || existingVideo.thumbnailFileId || '';
        }
      }

      // Upload video file if provided (apenas se houver novo arquivo)
      if (videoFile) {
        setUploadProgress(20);
        const videoResult = await wasabiService.uploadFile(videoFile, 'videos');
        if (!videoResult.success) {
          showFeedback('Failed to upload video file', 'error');
          return;
        }
        videoFileId = videoResult.fileId;
        setUploadProgress(60);
      }

      // Upload thumbnail if provided (apenas se houver novo arquivo)
      if (thumbnailFile) {
        const thumbnailResult = await wasabiService.uploadFile(thumbnailFile, 'thumbnails');
        if (!thumbnailResult.success) {
          showFeedback('Failed to upload thumbnail', 'error');
          return;
        }
        thumbnailFileId = thumbnailResult.fileId;
        setUploadProgress(80);
      }

      // Preparar dados para atualização
      const videoData: any = {
        title: videoTitle,
        description: videoDescription,
        price: price,
        productLink: productLink || undefined,
        isActive: true
      };

      // Adicionar duração se fornecida ou se for novo vídeo
      if (videoDuration) {
        videoData.duration = `${Math.floor(videoDuration / 60)}:${(videoDuration % 60).toString().padStart(2, '0')}`;
      } else if (!editingVideo) {
        videoData.duration = '00:00';
      }

      // Adicionar IDs de arquivos apenas se foram fornecidos
      if (videoFileId) {
        videoData.videoFileId = videoFileId;
        videoData.video_id = videoFileId; // Para compatibilidade
      }
      
      if (thumbnailFileId) {
        videoData.thumbnailFileId = thumbnailFileId;
        videoData.thumbnail_id = thumbnailFileId; // Para compatibilidade
      }

      setUploadProgress(90);

      if (editingVideo) {
        // Update existing video using VideoService (which uses Supabase)
        const updatedVideo = await VideoService.updateVideo(editingVideo, videoData);
        if (updatedVideo) {
          showFeedback('Video updated successfully!', 'success');
          fetchVideos();
          setShowVideoForm(false);
          setEditingVideo(null);
        } else {
          showFeedback('Failed to update video', 'error');
        }
      } else {
        // Create new video using VideoService (which uses Supabase)
        const newVideo = await VideoService.createVideo(videoData);
        if (newVideo) {
          showFeedback('Video uploaded successfully!', 'success');
          fetchVideos();
          setShowVideoForm(false);
        } else {
          showFeedback('Failed to create video', 'error');
        }
      }

      setUploadProgress(100);

      // Reset form
      setVideoTitle('');
      setVideoDescription('');
      setVideoPrice('');
      setProductLink('');
      setVideoFile(null);
      setThumbnailFile(null);
      setVideoDuration(null);

    } catch (err) {
      console.error('Error saving video:', err);
      showFeedback('Failed to save video. Please try again.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Save site configuration
  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const configData = {
        siteName: siteName,
        paypalClientId: paypalClientId,
        paypalMeUsername: paypalMeUsername,
        stripePublishableKey: stripePublishableKey,
        stripeSecretKey: stripeSecretKey,
        telegramUsername: telegramUsername,
        videoListTitle: videoListTitle,
        crypto: cryptoWallets,
        emailHost: emailHost,
        emailPort: emailPort,
        emailSecure: emailSecure,
        emailUser: emailUser,
        emailPass: emailPass,
        emailFrom: emailFrom,
        wasabiConfig: {
          accessKey: wasabiAccessKey,
          secretKey: wasabiSecretKey,
          region: wasabiRegion,
          bucket: wasabiBucket,
          endpoint: wasabiEndpoint
        }
      };

      await SiteConfigServiceSupabase.updateSiteConfig(configData);
      
      showFeedback('Configuration saved successfully!', 'success');
      setEditingConfig(false);
      fetchSiteConfig();
      
    } catch (err) {
      console.error('Error saving configuration to Supabase:', err);
      showFeedback('Failed to save configuration. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
            <Tab icon={<VideoLibraryIcon />} label="Manage Videos" />
            <Tab icon={<SettingsIcon />} label="Site Configuration & Users" />
            <Tab icon={<AdminPanelSettingsIcon />} label="Admin Management" />
            <Tab icon={<PeopleIcon />} label="Online Users" />
          </Tabs>
        </Box>
        
        {/* Videos Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={2} alignItems="center" justifyContent="space-between">
              <Grid item>
                <Typography variant="h5" component="h2" gutterBottom>
                  Manage Videos
                </Typography>
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setShowVideoForm(!showVideoForm)}
                >
                  {showVideoForm ? 'Hide Form' : 'Upload New Video'}
                </Button>
              </Grid>
            </Grid>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
          
          {loading && !error ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Search box */}
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  placeholder="Pesquisar vídeos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                />
              </Box>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredVideos.map((video) => (
                      <TableRow key={video.$id}>
                        <TableCell>{video.title}</TableCell>
                        <TableCell>${video.price}</TableCell>
                        <TableCell>{video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : '00:00'}</TableCell>
                        <TableCell>{video.is_active ? 'Active' : 'Inactive'}</TableCell>
                        <TableCell>
                          <IconButton 
                            color="primary" 
                            onClick={() => {
                              setVideoTitle(video.title);
                              setVideoDescription(video.description);
                              setVideoPrice(video.price.toString());
                              setProductLink(video.product_link || '');
                              setVideoDuration(video.duration || null);
                              setEditingVideo(video.$id);
                              setShowVideoForm(true);
                            }}
                            aria-label="edit video"
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={() => {
                              setItemToDelete({ type: 'video', id: video.$id });
                              setDeleteDialogOpen(true);
                            }}
                            aria-label="delete video"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredVideos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          {searchTerm.trim() ? 'No videos found matching your search' : 'No videos found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
          
          {/* Video Form */}
          {showVideoForm && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" component="h3" sx={{ mb: 3 }}>
                {editingVideo ? 'Edit Video' : 'Upload New Video'}
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Video Title"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Description"
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    variant="outlined"
                    multiline
                    rows={3}
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Price (USD)"
                    type="number"
                    value={videoPrice}
                    onChange={(e) => setVideoPrice(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Product Link (optional)"
                    value={productLink}
                    onChange={(e) => setProductLink(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Video File
                    </Typography>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setVideoFile(file);
                          // Get video duration
                          const video = document.createElement('video');
                          video.preload = 'metadata';
                          video.onloadedmetadata = () => {
                            setVideoDuration(video.duration);
                          };
                          video.src = URL.createObjectURL(file);
                        }
                      }}
                      style={{ width: '100%' }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Thumbnail Image
                    </Typography>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setThumbnailFile(file);
                        }
                      }}
                      style={{ width: '100%' }}
                    />
                  </Box>
                  
                  {videoDuration && (
                    <Typography variant="body2" color="text.secondary">
                      Duration: {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}
                    </Typography>
                  )}
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveVideo}
                  disabled={uploading || !videoTitle || !videoDescription || !videoPrice}
                  startIcon={uploading ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {uploading ? 'Uploading...' : (editingVideo ? 'Update Video' : 'Upload Video')}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowVideoForm(false);
                    setEditingVideo(null);
                    setVideoTitle('');
                    setVideoDescription('');
                    setVideoPrice('');
                    setProductLink('');
                    setVideoFile(null);
                    setThumbnailFile(null);
                    setVideoDuration(null);
                  }}
                >
                  Cancel
                </Button>
              </Box>
              
              {uploadProgress > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Upload Progress: {uploadProgress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
              )}
            </Paper>
          )}
        </TabPanel>
        
        {/* Site Configuration & Users Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Grid item>
                <Typography variant="h5" component="h2">
                  Site Configuration
                </Typography>
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setEditingConfig(!editingConfig)}
                  startIcon={editingConfig ? <CancelIcon /> : <EditIcon />}
                >
                  {editingConfig ? 'Cancel Edit' : 'Edit Config'}
                </Button>
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>

          {/* Site Configuration Form */}
          {editingConfig && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" component="h3" sx={{ mb: 3 }}>
                Site Settings
              </Typography>
              
              <Grid container spacing={3}>
                {/* Basic Site Info */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Site Name"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Video List Title"
                    value={videoListTitle}
                    onChange={(e) => setVideoListTitle(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Telegram Username"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    variant="outlined"
                    placeholder="@username"
                    sx={{ mb: 2 }}
                  />
                </Grid>

                {/* Payment Settings */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Payment Settings
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="PayPal Client ID"
                    value={paypalClientId}
                    onChange={(e) => setPaypalClientId(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="PayPal.me Username"
                    value={paypalMeUsername}
                    onChange={(e) => setPaypalMeUsername(e.target.value)}
                    variant="outlined"
                    placeholder="@username"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Stripe Publishable Key"
                    value={stripePublishableKey}
                    onChange={(e) => setStripePublishableKey(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Stripe Secret Key"
                    type="password"
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </Grid>

                {/* Email Settings */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Email Settings
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="SMTP Host"
                    value={emailHost}
                    onChange={(e) => setEmailHost(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="SMTP Port"
                    value={emailPort}
                    onChange={(e) => setEmailPort(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={emailSecure}
                        onChange={(e) => setEmailSecure(e.target.checked)}
                      />
                    }
                    label="Use SSL/TLS"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Email Username"
                    value={emailUser}
                    onChange={(e) => setEmailUser(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Email Password"
                    type="password"
                    value={emailPass}
                    onChange={(e) => setEmailPass(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="From Email"
                    value={emailFrom}
                    onChange={(e) => setEmailFrom(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </Grid>

                {/* Wasabi Settings */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Wasabi Storage Settings
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Access Key"
                    value={wasabiAccessKey}
                    onChange={(e) => setWasabiAccessKey(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Secret Key"
                    type="password"
                    value={wasabiSecretKey}
                    onChange={(e) => setWasabiSecretKey(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Region"
                    value={wasabiRegion}
                    onChange={(e) => setWasabiRegion(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Bucket Name"
                    value={wasabiBucket}
                    onChange={(e) => setWasabiBucket(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Endpoint"
                    value={wasabiEndpoint}
                    onChange={(e) => setWasabiEndpoint(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </Grid>

                {/* Crypto Wallets */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Cryptocurrency Wallets
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>Crypto</InputLabel>
                      <Select
                        value={selectedCrypto}
                        onChange={(e) => setSelectedCrypto(e.target.value)}
                        label="Crypto"
                      >
                        {cryptoCurrencies.map((crypto) => (
                          <MenuItem key={crypto.code} value={crypto.code}>
                            {crypto.name} ({crypto.code})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <TextField
                      label="Wallet Address"
                      value={newCryptoWallet}
                      onChange={(e) => setNewCryptoWallet(e.target.value)}
                      variant="outlined"
                      sx={{ flexGrow: 1 }}
                    />
                    
                    <Button
                      variant="outlined"
                      onClick={() => {
                        if (newCryptoWallet.trim()) {
                          setCryptoWallets([...cryptoWallets, `${selectedCrypto}:${newCryptoWallet}`]);
                          setNewCryptoWallet('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </Box>
                  
                  {cryptoWallets.length > 0 && (
                    <Box>
                      {cryptoWallets.map((wallet, index) => (
                        <Chip
                          key={index}
                          label={wallet}
                          onDelete={() => {
                            setCryptoWallets(cryptoWallets.filter((_, i) => i !== index));
                          }}
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveConfig}
                  startIcon={<SaveIcon />}
                >
                  Save Configuration
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => {
                    setEditingConfig(false);
                    fetchSiteConfig();
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Paper>
          )}

          {/* Display Current Configuration */}
          {!editingConfig && siteConfig && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" component="h3" sx={{ mb: 3 }}>
                Current Configuration
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Site Name
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {siteConfig.site_name || 'Not set'}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Video List Title
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {siteConfig.video_list_title || 'Not set'}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Telegram Username
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {siteConfig.telegram_username || 'Not set'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    PayPal Client ID
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {siteConfig.paypal_client_id ? '***' + siteConfig.paypal_client_id.slice(-4) : 'Not set'}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Stripe Publishable Key
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {siteConfig.stripe_publishable_key ? '***' + siteConfig.stripe_publishable_key.slice(-4) : 'Not set'}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Wasabi Bucket
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {siteConfig.wasabi_config?.bucket || 'Not set'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
        </TabPanel>
        
        {/* Admin Management Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={2} alignItems="center" justifyContent="space-between">
              <Grid item>
                <Typography variant="h5" component="h2" gutterBottom>
                  Admin Management
                </Typography>
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setShowAdminForm(!showAdminForm)}
                  sx={{ mr: 2 }}
                >
                  {showAdminForm ? 'Hide Form' : 'Add New Admin'}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<LockIcon />}
                  onClick={() => setShowChangePasswordForm(!showChangePasswordForm)}
                >
                  Change My Password
                </Button>
              </Grid>
            </Grid>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
          
          {loading && !error ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Admin List */}
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {adminUsers.map((admin) => (
                      <TableRow key={admin.$id}>
                        <TableCell>{admin.name}</TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <IconButton 
                            color="primary" 
                            onClick={() => {
                              setAdminName(admin.name);
                              setAdminEmail(admin.email);
                              setAdminPassword('');
                              setConfirmPassword('');
                              setEditingAdmin(admin.$id);
                              setShowAdminForm(true);
                            }}
                            aria-label="edit admin"
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={() => {
                              setItemToDelete({ type: 'user', id: admin.$id });
                              setDeleteDialogOpen(true);
                            }}
                            aria-label="delete admin"
                            disabled={admin.$id === user?.$id} // Prevent deleting self
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {adminUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No admin users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Add/Edit Admin Form */}
              {showAdminForm && (
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" component="h3" sx={{ mb: 3 }}>
                    {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Admin Name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSaveAdmin}
                      disabled={loading || !adminName || !adminEmail || !adminPassword}
                      startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                    >
                      {loading ? 'Saving...' : (editingAdmin ? 'Update Admin' : 'Create Admin')}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setShowAdminForm(false);
                        setEditingAdmin(null);
                        setAdminName('');
                        setAdminEmail('');
                        setAdminPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Paper>
              )}

              {/* Change Password Form */}
              {showChangePasswordForm && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" component="h3" sx={{ mb: 3 }}>
                    Change My Password
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Current Password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Confirm New Password"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleChangePassword}
                      disabled={loading || !currentPassword || !newPassword || !confirmNewPassword}
                      startIcon={loading ? <CircularProgress size={20} /> : <LockIcon />}
                    >
                      {loading ? 'Changing...' : 'Change Password'}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setShowChangePasswordForm(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Paper>
              )}
            </>
          )}
        </TabPanel>
        
        {/* Online Users Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <OnlineUsersPanel 
                  showDetails={true} 
                  refreshInterval={5000}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Estatísticas em Tempo Real
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Monitore quantos usuários estão acessando seu site em tempo real.
                      Os dados são atualizados automaticamente a cada 5 segundos.
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Funcionalidades:
                      </Typography>
                      <ul>
                        <li>Contador de usuários online em tempo real</li>
                        <li>Lista de usuários ativos com timestamps</li>
                        <li>Status de conexão de cada usuário</li>
                        <li>Atualização automática dos dados</li>
                      </ul>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              if (itemToDelete) {
                if (itemToDelete.type === 'video') {
                  handleDeleteVideo(itemToDelete.id);
                } else {
                  handleDeleteUser(itemToDelete.id);
                }
              }
            }} 
            color="error" 
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <CustomAlert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
        >
          {snackbarMessage}
        </CustomAlert>
      </Snackbar>
    </Container>
  );
};

export default Admin;

// Helper function to show feedback via snackbar
function showFeedback(message: string, severity: 'success' | 'error') {
  const event = new CustomEvent('show-feedback', {
    detail: { message, severity }
  });
  document.dispatchEvent(event);
}
