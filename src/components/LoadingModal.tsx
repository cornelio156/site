import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Apple as AppleIcon,
  Security as SecurityIcon,
  Star as StarIcon,
} from '@mui/icons-material';

interface LoadingModalProps {
  open: boolean;
  onClose: () => void;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ open, onClose }) => {
  // Feature flag: modal de promoção desativado temporariamente
  const DISABLED = true;
  if (DISABLED) {
    return null;
  }
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [timeLeft, setTimeLeft] = useState(6);

  useEffect(() => {
    if (!open) return;

    // Sempre aguardar 6 segundos completos, independentemente do estado de carregamento
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setTimeLeft(5);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Prevent closing by clicking outside
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 4, textAlign: 'center', position: 'relative' }}>
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            zIndex: 0,
          }}
        />

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Loading spinner */}
          <Box sx={{ mb: 3 }}>
            <CircularProgress
              size={isMobile ? 40 : 50}
              thickness={4}
              sx={{ color: 'white' }}
            />
          </Box>

          {/* Title */}
          <DialogTitle sx={{ p: 0, mb: 2 }}>
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              component="h1"
              sx={{
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #fff 30%, #f0f0f0 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              Loading Site...
            </Typography>
          </DialogTitle>

          {/* Timer */}
          <Typography
            variant="h6"
            sx={{
              mb: 3,
              fontWeight: 'bold',
              color: '#ffeb3b',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            Please wait {timeLeft} seconds
          </Typography>

          <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.3)' }} />

          {/* Promotional content */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              sx={{
                mb: 2,
                fontWeight: 'bold',
                color: '#ffeb3b',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              🎉 Special Offers Available! 🎉
            </Typography>

            {/* Crypto offer */}
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SecurityIcon sx={{ mr: 1, color: '#4caf50' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Crypto Payment Special
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Pay with cryptocurrency above $40 and get
              </Typography>
              <Chip
                label="2 FREE Contents"
                sx={{
                  background: 'linear-gradient(45deg, #4caf50 30%, #8bc34a 90%)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                }}
              />
            </Box>

            {/* Apple Pay offer */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AppleIcon sx={{ mr: 1, color: '#fff' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Apple Pay & Other Methods
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Pay with Apple Pay, PayPal, or other methods and get
              </Typography>
              <Chip
                label="1 FREE Content"
                sx={{
                  background: 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                }}
              />
            </Box>
          </Box>

          {/* Additional info */}
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontStyle: 'italic',
            }}
          >
            Site is loading all metadata for the best experience...
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LoadingModal;
