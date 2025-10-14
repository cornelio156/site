import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TelegramIcon from '@mui/icons-material/Telegram';
import { useSiteConfig } from '../context/SiteConfigContext';
import { StripeService } from '../services/StripeService';

interface PromoOfferBannerProps {
  telegramLink?: string; // full URL override
  telegramUsername?: string; // e.g., mychannel or myuser
  prefilledMessage?: string; // custom interest message
}

const getRandomInt = (min: number, max: number) => {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
};

const PromoOfferBanner = ({ telegramLink, telegramUsername, prefilledMessage }: PromoOfferBannerProps) => {
  const [onlineNow, setOnlineNow] = useState<number>(() => getRandomInt(0, 100));
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const { stripePublishableKey } = useSiteConfig();

  // Stable base so the number of customers looks consistent during a session
  const baseHappyCustomers = useMemo(() => getRandomInt(700, 1300), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineNow(prev => {
        const delta = getRandomInt(-5, 6);
        const next = prev + delta;
        return Math.min(100, Math.max(0, next));
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const happyCustomers = `${baseHappyCustomers}+`;

  const interestMessage = prefilledMessage || "Hi! I'm interested in the $85 offer including all content. Could you guide me on how to pay?";
  const computedTelegramHref = (() => {
    try {
      if (telegramLink) return telegramLink;
      if (telegramUsername) {
        // Open chat with username and try to pass text
        return `https://t.me/${telegramUsername}?text=${encodeURIComponent(interestMessage)}`;
      }
      // Fallback: share with prefilled text (user selects chat)
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return `https://t.me/share/url?url=${encodeURIComponent(origin)}&text=${encodeURIComponent(interestMessage)}`;
    } catch {
      return 'https://t.me/';
    }
  })();

  // Handle Stripe payment for $85 offer
  const handleStripePayment = async () => {
    if (!stripePublishableKey) {
      alert('Stripe configuration is missing. Please contact support.');
      return;
    }
    
    try {
      setIsStripeLoading(true);
      
      // Initialize Stripe
      await StripeService.initStripe(stripePublishableKey);
      
      // Generate a random product name for privacy
      const productNames = [
        "Premium Content Package",
        "Digital Media Collection",
        "Exclusive Content Bundle",
        "Premium Access Package"
      ];
      const randomProductName = productNames[Math.floor(Math.random() * productNames.length)];
      
      // Build success and cancel URLs
      const successUrl = `${window.location.origin}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/?payment_canceled=true`;
      
      // Create checkout session
      const sessionId = await StripeService.createCheckoutSession(
        85, // $85 price
        'usd',
        randomProductName,
        successUrl,
        cancelUrl
      );
      
      // Redirect to checkout
      await StripeService.redirectToCheckout(sessionId);
      
    } catch (error) {
      console.error('Error processing Stripe payment:', error);
      alert('Failed to initialize payment. Please try again.');
    } finally {
      setIsStripeLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 3, px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          position: 'relative',
          maxWidth: 800,
          mx: 'auto',
          borderRadius: 4,
          p: { xs: 2.5, sm: 3.5 },
          color: 'white',
          background: 'linear-gradient(135deg, #FF0F50, #D10D42, #FF3871, #FF6B9D)',
          backgroundSize: '300% 300%',
          animation: 'gradientMove 8s ease infinite, shimmer 3s ease-in-out infinite',
          boxShadow: '0 8px 32px rgba(255, 15, 80, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)',
          transform: 'perspective(1000px) rotateX(2deg)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'perspective(1000px) rotateX(0deg) scale(1.02)',
            boxShadow: '0 12px 48px rgba(255, 15, 80, 0.4), 0 0 0 2px rgba(255,255,255,0.3)'
          },
          '@keyframes gradientMove': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' }
          },
          '@keyframes shimmer': {
            '0%': { boxShadow: '0 8px 32px rgba(255, 15, 80, 0.3)' },
            '50%': { boxShadow: '0 8px 32px rgba(255, 15, 80, 0.5), 0 0 20px rgba(255, 255, 255, 0.3)' },
            '100%': { boxShadow: '0 8px 32px rgba(255, 15, 80, 0.3)' }
          }
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            animation: 'float 6s ease-in-out infinite'
          }}
        />
        
        <Box
          sx={{
            position: 'absolute',
            left: -30,
            bottom: -30,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            animation: 'float 8s ease-in-out infinite reverse'
          }}
        />

        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            textAlign: 'center',
            textShadow: '2px 2px 8px rgba(0,0,0,0.4)',
            mb: 1,
            fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.2rem' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            animation: 'bounce 2s ease-in-out infinite'
          }}
        >
          🎉 SPECIAL OFFER 🎉
        </Typography>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            textAlign: 'center',
            mb: 2,
            fontSize: { xs: '1.1rem', sm: '1.4rem', md: '1.6rem' },
            textShadow: '1px 1px 4px rgba(0,0,0,0.3)'
          }}
        >
          ALL CONTENT FOR ONLY $85
        </Typography>

        <Typography sx={{ textAlign: 'center', opacity: 0.95, mb: 2.5, fontSize: '0.95rem' }}>
          Get access to our entire premium collection at an unbeatable price!
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
          <Typography
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              background: 'rgba(255, 193, 7, 0.25)',
              color: '#FFC107',
              display: 'inline-block',
              px: 2,
              py: 0.8,
              borderRadius: 2,
              border: '1px solid rgba(255, 193, 7, 0.5)',
              fontSize: '0.9rem',
              animation: 'glow 2s ease-in-out infinite alternate'
            }}
          >
            📦 EVERYTHING YOU SEE ON THIS SITE INCLUDED! 📦
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Button
            href={computedTelegramHref}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<TelegramIcon />}
            variant="contained"
            sx={{
              bgcolor: '#1E90FF',
              color: 'white',
              fontWeight: 800,
              px: 2.5,
              py: 1,
              borderRadius: 999,
              boxShadow: '0 4px 15px rgba(30,144,255,0.4)',
              transition: 'all 0.3s ease',
              animation: 'pulseButton 3s ease-in-out infinite',
              '&:hover': { 
                bgcolor: '#187bcd', 
                transform: 'translateY(-2px) scale(1.05)', 
                boxShadow: '0 8px 25px rgba(30,144,255,0.6)' 
              }
            }}
          >
            Come to Negociate
          </Button>
          
          <Button
            variant="contained"
            onClick={handleStripePayment}
            disabled={isStripeLoading || !stripePublishableKey}
            sx={{
              bgcolor: '#635bff',
              color: 'white',
              fontWeight: 800,
              px: 2.5,
              py: 1,
              borderRadius: 999,
              boxShadow: '0 4px 15px rgba(99, 91, 255, 0.4)',
              transition: 'all 0.3s ease',
              animation: 'pulseButton 3s ease-in-out infinite 1.5s',
              '&:hover': { 
                bgcolor: '#4b45c6', 
                transform: 'translateY(-2px) scale(1.05)', 
                boxShadow: '0 8px 25px rgba(99, 91, 255, 0.6)' 
              }
            }}
          >
            {isStripeLoading ? 'Processing...' : 'Pay $85'}
          </Button>
        </Box>

        <Typography sx={{ textAlign: 'center', fontSize: '0.85rem', opacity: 0.8, mb: 2.5 }}>
          ⚡ Instant delivery after payment ⚡
        </Typography>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            flexWrap: 'wrap'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
              backgroundColor: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.25)'
            }}
          >
            <Typography sx={{ fontWeight: 700, color: 'white' }}>{happyCustomers} Happy Customers</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
              backgroundColor: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.25)'
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff4d4f', animation: 'pulseDot 1.2s ease-in-out infinite' }} />
            <Typography sx={{ fontWeight: 700, color: 'white' }}>{onlineNow} online</Typography>
          </Box>
        </Box>

        <Box sx={{ 
          '@keyframes pulseDot': { '0%': { opacity: 1 }, '50%': { opacity: 0.5 }, '100%': { opacity: 1 } },
          '@keyframes float': { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-10px)' } },
          '@keyframes bounce': { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-5px)' } },
          '@keyframes glow': { '0%': { boxShadow: '0 0 5px rgba(255, 193, 7, 0.5)' }, '100%': { boxShadow: '0 0 20px rgba(255, 193, 7, 0.8)' } },
          '@keyframes pulseButton': { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.05)' } }
        }} />
      </Box>
    </Box>
  );
};

export default PromoOfferBanner;


