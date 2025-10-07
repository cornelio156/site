import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TelegramIcon from '@mui/icons-material/Telegram';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useAuth } from '../services/Auth';
import { useSiteConfig } from '../context/SiteConfigContext';
import { VideoService, Video } from '../services/VideoService';
import VideoCard from '../components/VideoCard';
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import Backdrop from '@mui/material/Backdrop';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import jsPDF from 'jspdf';
import { useTheme } from '@mui/material/styles';
import { StripeService } from '../services/StripeService';
import { LinearProgress } from '@mui/material';
import TelegramService from '../services/TelegramService';

// Extend Video interface to include product_link
declare module '../services/VideoService' {
  interface Video {
    product_link?: string;
  }
}

// SVG icons for main cryptos
const cryptoIcons: Record<string, JSX.Element> = {
  BTC: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f7931a"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">₿</text></svg>,
  ETH: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#3c3c3d"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">Ξ</text></svg>,
  USDT: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#26a17b"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">T</text></svg>,
  BNB: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3ba2f"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">BNB</text></svg>,
  SOL: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#66f9a1"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#222" fontWeight="bold">◎</text></svg>,
  XRP: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#23292f"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">XRP</text></svg>,
  ADA: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#0033ad"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">ADA</text></svg>,
  DOGE: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#c2a633"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">Ð</text></svg>,
  AVAX: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#e84142"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">A</text></svg>,
  DOT: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#e6007a"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">●</text></svg>,
  MATIC: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#8247e5"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">M</text></svg>,
  SHIB: <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f47321"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">S</text></svg>,
};



const VideoPlayer: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { telegramUsername, paypalClientId, stripePublishableKey, cryptoWallets, siteName } = useSiteConfig();
  const [video, setVideo] = useState<Video | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [suggestedVideos, setSuggestedVideos] = useState<Video[]>([]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [copiedWalletIndex, setCopiedWalletIndex] = useState<number | null>(null);
  const [purchasedProductName, setPurchasedProductName] = useState<string>("");
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [showPrePaymentModal, setShowPrePaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'stripe' | 'paypal' | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(10);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
  const theme = useTheme();

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
        // Reset purchase state when loading a new video
        setHasPurchased(false);
        setPurchaseComplete(false);
        setShowPurchaseModal(false);
        setPurchaseError(null);
        setPreviewUrl(null);

        // Get video details FIRST (ultra-fast operation)
        const videoData = await VideoService.getVideo(id);
        if (!videoData) {
          setError('Video not found');
          setLoading(false);
          return;
        }
        
        // Set video immediately - this shows the video info right away
        setVideo(videoData);
        
        // Set loading to false immediately so user sees the video info
        setLoading(false);
        
        // Load preview video URL in background (non-blocking)
        VideoService.getVideoFileUrl(id)
          .then(url => {
            console.log('Video URL obtained:', url);
            setPreviewUrl(url);
          })
          .catch(err => {
            console.error('Error loading preview video:', err);
            // Don't set error, just log it - the thumbnail will be shown instead
          });
        
        // Increment view count in background (non-blocking)
        VideoService.incrementViews(id).catch(err => {
          console.error('Error incrementing views:', err);
        });
        
        // Check if user has purchased this video (only if logged in)
        if (user) {
          // Não precisamos mais verificar se o usuário comprou o vídeo
          // O fluxo de compra será sempre possível
          setHasPurchased(false);
          
          // Show purchase modal if it's the first time after purchase
          const justPurchased = sessionStorage.getItem(`purchased_${id}`);
          if (justPurchased) {
            // Make sure we only show the modal for the current video
            setShowPurchaseModal(true);
            // Clear the flag immediately to prevent showing the modal again
            sessionStorage.removeItem(`purchased_${id}`);
          }
        }
        
        // Load suggested videos in background (non-blocking)
        // This will not block the main video from loading
        VideoService.getAllVideos()
          .then(allVideos => {
            const filtered = allVideos
              .filter(v => v.$id !== id)
              .slice(0, 8); // Limit to 8 videos
            setSuggestedVideos(filtered);
          })
          .catch(err => {
            console.error('Error loading suggested videos:', err);
            // Don't set error state for suggested videos, just log it
          });
      } catch (err) {
        console.error('Error loading video:', err);
        setError('Failed to load video. Please try again later.');
        setLoading(false);
      }
    };

    loadVideo();
  }, [id, user]);


  const handleTelegramRedirect = () => {
    if (telegramUsername && video) {
      // Criar mensagem detalhada com informações do vídeo
      const videoDetails = `
🎬 *${video.title}*

💰 *Price:* $${video.price.toFixed(2)}
⏱️ *Duration:* ${video.duration ? formatDuration(video.duration) : 'N/A'}
👀 *Views:* ${formatViews(video.views)}
📅 *Added:* ${video.createdAt ? formatDate(new Date(video.createdAt)) : 'N/A'}

📝 *Description:*
${video.description || 'No description available'}
      `.trim();

      // Codificar a mensagem para URL
      const encodedMessage = encodeURIComponent(videoDetails);
      
      // Abrir Telegram com a mensagem pré-formatada
      window.open(`https://t.me/${telegramUsername}?text=${encodedMessage}`, '_blank');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setShowOverlay(false);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    // Don't show overlay when paused, as it might block controls
  };
  
  const handleVideoInteraction = () => {
    // Hide overlay when user interacts with the video
    setShowOverlay(false);
  };

  // Format duration (e.g., "1:30" to "1 min 30 sec")
  const formatDuration = (duration?: string | number) => {
    if (!duration) return 'Unknown';
    
    if (typeof duration === 'string') {
      // Parse MM:SS or HH:MM:SS format
      const parts = duration.split(':').map(Number);
      
        if (parts.length === 2) {
        // MM:SS format
        const [minutes, seconds] = parts;
        
        if (minutes === 0) {
          return `${seconds} sec`;
        } else if (seconds === 0) {
          return `${minutes} min`;
        } else {
          return `${minutes} min ${seconds} sec`;
        }
        } else if (parts.length === 3) {
        // HH:MM:SS format
        const [hours, minutes, seconds] = parts;
        
        if (hours === 0) {
          // No hours, format as minutes and seconds
          if (minutes === 0) {
            return `${seconds} sec`;
          } else if (seconds === 0) {
            return `${minutes} min`;
          } else {
            return `${minutes} min ${seconds} sec`;
          }
        } else {
          // Include hours
          if (minutes === 0 && seconds === 0) {
            return `${hours} hr`;
          } else if (seconds === 0) {
            return `${hours} hr ${minutes} min`;
          } else if (minutes === 0) {
            return `${hours} hr ${seconds} sec`;
          } else {
            return `${hours} hr ${minutes} min ${seconds} sec`;
          }
        }
      }
    }
    
    // If we can't parse it, just return as is
    return duration.toString();
  };

  // Format views with K/M suffix for thousands/millions
  const formatViews = (views?: number) => {
    if (views === undefined) return '0 views';
    
    if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`;
    } else {
      return `${views} views`;
    }
  };

  // Format date to readable format
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Copy product link to clipboard
  const copyToClipboard = () => {
    if (video?.product_link) {
      navigator.clipboard.writeText(video.product_link)
        .then(() => {
      setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(err => console.error('Failed to copy: ', err));
    }
  };

  // Copy individual link to clipboard
  const copyIndividualLink = (link: string, index: number) => {
    navigator.clipboard.writeText(link.trim())
      .then(() => {
        setCopiedLinkIndex(index);
        setTimeout(() => setCopiedLinkIndex(null), 3000);
      })
      .catch(err => console.error('Failed to copy: ', err));
  };

  // Split product links by space
  const getProductLinks = () => {
    if (!video?.product_link) return [];
    return video.product_link.split(/\s+/).filter(link => link.trim().length > 0);
  };

  // Função para obter um nome de produto genérico aleatório em inglês
  const getRandomProductName = () => {
    const productNames = [
      "Personal Development Ebook",
      "Financial Freedom Ebook",
      "Digital Marketing Guide",
      "Health & Wellness Ebook",
      "Productivity Masterclass",
      "Mindfulness & Meditation Guide",
      "Entrepreneurship Blueprint"
    ];
    
    const randomIndex = Math.floor(Math.random() * productNames.length);
    return productNames[randomIndex];
  };


  // Generate PDF with product link
  const generatePDF = () => {
    if (!video) return;
    
    try {
      const doc = new jsPDF();
      
      // Set font size and styles
      doc.setFontSize(22);
      doc.setTextColor(229, 9, 20); // Netflix red
      doc.text("ADULTFLIX", 105, 20, { align: "center" });
    
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Purchase Receipt", 105, 30, { align: "center" });
    
      // Add horizontal line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 35, 190, 35);
      
      // Video details (usando o nome original do vídeo)
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Video: ${video.title}`, 20, 50);
      doc.text(`Purchase Date: ${formatDate(new Date())}`, 20, 60);
      doc.text(`Price: $${video.price.toFixed(2)}`, 20, 70);
    
      // Product link section
      doc.setFontSize(14);
      doc.text("Your Product Link:", 20, 90);
      
      // Draw a box around the link
      doc.setDrawColor(229, 9, 20); // Netflix red
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(20, 95, 170, 20, 3, 3, 'FD');
    
      // Add the link text
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      if (video.product_link) {
        doc.text(video.product_link, 25, 107);
      } else {
        doc.text("Contact support via Telegram for access", 25, 107);
      }
    
      // Instructions
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text("Instructions:", 20, 130);
      
      if (video.product_link) {
        doc.text("1. Copy the link above and paste it in your browser", 25, 140);
        doc.text("2. The link will take you to your purchased content", 25, 150);
        doc.text("3. This link is for your personal use only", 25, 160);
        doc.text("4. Do not share this link with others", 25, 170);
      } else {
        doc.text("1. Contact support via Telegram to get access to your content", 25, 140);
        doc.text("2. Provide your purchase details when contacting support", 25, 150);
        doc.text("3. Support will provide you with access instructions", 25, 160);
      }
    
      // Footer
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("Thank you for your purchase!", 105, 200, { align: "center" });
      doc.text("© ADULTFLIX - All Rights Reserved", 105, 206, { align: "center" });
    
      // Save the PDF (usando o nome original do vídeo para o arquivo)
      doc.save(`ADULTFLIX-Receipt-${video.title.replace(/\s+/g, '-')}.pdf`);
      setPdfGenerated(true);
      setTimeout(() => setPdfGenerated(false), 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Create PayPal order
  const createOrder = (_: any, actions: any) => {
    if (!video) {
      setPurchaseError('Video information not available');
      return Promise.reject('Video information not available');
    }
    
    try {
      // Usar um nome de produto genérico em vez do nome do vídeo
      const genericProductName = getRandomProductName();
      
      // Armazenar o nome do produto para uso posterior
      setPurchasedProductName(genericProductName);
      
      return actions.order.create({
        purchase_units: [
          {
            description: genericProductName,
            amount: {
              currency_code: 'USD',
              value: video.price.toString()
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      setPurchaseError('Failed to create payment order. Please try again.');
      return Promise.reject('Failed to create order');
    }
  };

  // Handle PayPal approval
  const onApprove = async (_: any, actions: any) => {
    try {
      // Capture the funds from PayPal
      const orderData = await actions.order.capture();
      console.log('Order data:', orderData);
      
      if (!video) {
        setPurchaseError('Video information not available');
        return;
      }
      
      // Usar um ID temporário se o usuário não estiver logado
      const userId = user ? user.$id : 'guest-' + Date.now();
      
      try {
        // Mostrar diretamente o modal de compra bem-sucedida
        // Não precisamos mais tentar registrar a compra no banco de dados
        setHasPurchased(true);
        setPurchaseComplete(true);
        setShowPurchaseModal(true);
        
        // Armazenar uma flag que acabamos de comprar este vídeo
        sessionStorage.setItem(`purchased_${video.$id}`, 'true');
        
        // Se não temos um nome de produto, gerar um novo
        if (!purchasedProductName) {
          setPurchasedProductName(getRandomProductName());
        }
        
        // Send confirmation email if we have PayPal payer info
        if (orderData && orderData.payer && orderData.payer.email_address) {
          const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : (import.meta.env.VITE_API_URL || '');
          
          try {
            const response = await fetch(`${API_BASE_URL}/api/send-paypal-confirmation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                buyerEmail: orderData.payer.email_address,
                buyerName: orderData.payer.name?.given_name || '',
                transactionId: orderData.id,
                isCompany: siteName || '',
              }),
            });
            
            const emailResult = await response.json();
            console.log('Email sent result:', emailResult);
          } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't show this error to the user since payment was successful
          }
        }

        // Send Telegram notification
        try {
          await TelegramService.sendSaleNotification({
            videoTitle: video.title,
            videoPrice: video.price,
            buyerEmail: orderData?.payer?.email_address,
            buyerName: orderData?.payer?.name?.given_name,
            transactionId: orderData.id,
            paymentMethod: 'paypal',
            timestamp: new Date().toLocaleString('en-US'),
            videoUrl: `${window.location.origin}/video/${video.$id}`
          });
        } catch (telegramError) {
          console.error('Failed to send Telegram notification:', telegramError);
          // Don't show this error to the user since payment was successful
        }
      } catch (error) {
        console.error('Error processing payment:', error);
        setPurchaseError('Payment processing failed. Please try again later.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setPurchaseError('Payment processing failed. Please try again later.');
    }
  };

  const handleCloseModal = () => {
      setShowPurchaseModal(false);
  };

  // Handle pre-payment modal
  const startPaymentProcess = (type: 'stripe' | 'paypal') => {
    // Armazenar o tipo de pagamento para uso posterior
    setPaymentType(type);
    
    // Mostrar o modal informativo
    setShowPrePaymentModal(true);
    
    // Iniciar contador de 5 segundos
    setRedirectCountdown(5);
    
    // Iniciar contagem regressiva
    const countdownInterval = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) {
          // Quando chegar a 0, limpar intervalo
          clearInterval(countdownInterval);
          
          // Fechar o modal
          setShowPrePaymentModal(false);
          
          // Iniciar o processo de pagamento correspondente
          if (type === 'stripe') {
            handleStripePaymentRedirect();
          } else if (type === 'paypal') {
            // Nada a fazer, o PayPal já está integrado via componente
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle Stripe payment (Nova função apenas para redirecionamento)
  const handleStripePaymentRedirect = async () => {
    if (!video || !stripePublishableKey) {
      setPurchaseError('Stripe configuration is missing or video information not available');
      return;
    }
    
    try {
      setIsStripeLoading(true);
      
      // Initialize Stripe
      await StripeService.initStripe(stripePublishableKey);
      
      // Generate a random product name
      const randomProductName = getRandomProductName();
      setPurchasedProductName(randomProductName);
      
      // Build success and cancel URLs
      const successUrl = `${window.location.origin}/video/${id}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/video/${id}?payment_canceled=true`;
      
      // Create checkout session
      const sessionId = await StripeService.createCheckoutSession(
        video.price,
        'usd',
        randomProductName,
        successUrl,
        cancelUrl
      );
      
      // Redirect to checkout
      await StripeService.redirectToCheckout(sessionId);
      
    } catch (error) {
      console.error('Error processing Stripe payment:', error);
      setPurchaseError('Failed to initialize Stripe payment. Please try again.');
    } finally {
      setIsStripeLoading(false);
    }
  };

  // Handle Stripe payment (Modificado para mostrar o modal primeiro)
  const handleStripePayment = () => {
    if (!video) {
      setPurchaseError('Video information not available');
      return;
    }
    
    // Iniciar o processo com o modal
    startPaymentProcess('stripe');
  };

  // Check for Stripe payment success on component mount
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const paymentSuccess = queryParams.get('payment_success');
    const sessionId = queryParams.get('session_id');
    
    console.log('Stripe payment check:', { paymentSuccess, sessionId, video: !!video, videoTitle: video?.title });
    
    // Process payment success even if video is not loaded yet
    if (paymentSuccess === 'true') {
      console.log('Stripe payment successful detected, processing...');
      
      // If video is loaded, process immediately
      if (video) {
        console.log('Video loaded, processing payment success immediately');
        processStripePaymentSuccess(video, sessionId);
      } else {
        console.log('Video not loaded yet, storing payment success for later processing');
        // Store payment success info for when video loads
        sessionStorage.setItem(`stripe_payment_success_${id}`, JSON.stringify({
          sessionId,
          timestamp: Date.now()
        }));
      }
      
      // Clear query params immediately to prevent re-processing
      window.history.replaceState({}, document.title, `/video/${id}`);
    }
  }, [id, video]);

  // Process Stripe payment success
  const processStripePaymentSuccess = (videoData: Video, sessionId: string | null) => {
    console.log('Processing Stripe payment success for video:', videoData.title);
    
    // Update state to show purchase was successful
    setHasPurchased(true);
    setPurchaseComplete(true);
    setShowPurchaseModal(true);
    
    // Store the purchase in session storage
    sessionStorage.setItem(`purchased_${videoData.$id}`, 'true');
    
    // Set a random product name if not already set
    if (!purchasedProductName) {
      setPurchasedProductName(getRandomProductName());
    }
    
    // Send Telegram notification for Stripe payment
    if (sessionId) {
      console.log('Sending Stripe notification to Telegram with sessionId:', sessionId);
      TelegramService.sendSaleNotification({
        videoTitle: videoData.title,
        videoPrice: videoData.price,
        buyerEmail: undefined, // Stripe doesn't provide email in success URL
        buyerName: undefined, // Stripe doesn't provide name in success URL
        transactionId: sessionId,
        paymentMethod: 'stripe',
        timestamp: new Date().toLocaleString('pt-BR'),
        videoUrl: `${window.location.origin}/video/${videoData.$id}`
      }).then(success => {
        console.log('Stripe notification result:', success);
      }).catch(error => {
        console.error('Failed to send Stripe notification to Telegram:', error);
      });
    } else {
      console.warn('No sessionId found for Stripe payment notification');
    }
  };

  // Check for stored Stripe payment success when video loads
  useEffect(() => {
    if (video && id) {
      const storedPayment = sessionStorage.getItem(`stripe_payment_success_${id}`);
      if (storedPayment) {
        try {
          const paymentData = JSON.parse(storedPayment);
          console.log('Found stored Stripe payment success, processing now:', paymentData);
          
          // Process the stored payment success
          processStripePaymentSuccess(video, paymentData.sessionId);
          
          // Clear the stored payment data
          sessionStorage.removeItem(`stripe_payment_success_${id}`);
        } catch (error) {
          console.error('Error processing stored Stripe payment:', error);
          sessionStorage.removeItem(`stripe_payment_success_${id}`);
        }
      }
    }
  }, [video, id]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '500px' 
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4, px: 2 }}>
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
      </Box>
    );
  }

  return (
      <Box sx={{ 
      bgcolor: theme.palette.mode === 'dark' ? '#141414' : '#f5f5f5', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
        width: '100%', 
      overflow: 'hidden' 
    }}>
      {/* Video player section */}
      <Box sx={{ width: '100%', bgcolor: '#000' }}>
        <Box sx={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          position: 'relative'
        }}>
          {previewUrl ? (
            // Native browser player
            <Box sx={{ 
              width: '100%',
              height: '500px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#000'
            }}>
              <video 
                src={previewUrl}
                controls 
                autoPlay={false}
              poster={video?.thumbnailUrl}
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
                onClick={handleVideoInteraction}
                onMouseOver={handleVideoInteraction}
                onLoadStart={() => console.log('Video load started:', previewUrl)}
                onLoadedData={() => console.log('Video data loaded:', previewUrl)}
                onError={(e) => {
                  console.error('Video load error:', e);
                  console.error('Video URL:', previewUrl);
                  console.error('Thumbnail URL:', video?.thumbnailUrl);
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '1200px',
                  maxHeight: '500px',
                  objectFit: 'contain',
                  backgroundColor: '#000',
                  zIndex: 1000 /* Ensure video controls are above overlay */
                }}
              >
                <source src={previewUrl} type="video/mp4" />
                Your browser does not support the video element.
              </video>
            </Box>
          ) : (
            // Show only the thumbnail if no video URL
            <Box sx={{ 
              width: '100%',
              height: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#000',
              position: 'relative'
            }}>
            <CardMedia
              component="img"
              image={video?.thumbnailUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlZpZGVvIFByZXZpZXc8L3RleHQ+PC9zdmc+'}
              alt={video?.title || 'Video thumbnail'}
              onLoad={() => {
                console.log('Thumbnail loaded successfully:', video?.thumbnailUrl);
                console.log('Video data:', video);
              }}
              onError={(e) => {
                console.error('Thumbnail failed to load:', video?.thumbnailUrl);
                console.error('Error event:', e);
                console.error('Video data:', video);
                // Fallback para placeholder
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlZpZGVvIFByZXZpZXc8L3RleHQ+PC9zdmc+';
              }}
              sx={{ 
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                maxWidth: '1200px',
                backgroundColor: '#f5f5f5',
                minHeight: '300px'
              }}
            />
            
              {/* Purchase overlay */}
              {showOverlay && (
            <Box
              sx={{
                position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 3,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                  color: 'white',
                display: 'flex',
                  justifyContent: 'space-between',
                alignItems: 'center',
                  zIndex: 999
                }}
              >
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {video?.title || 'Video Details'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTimeIcon fontSize="small" />
                      <Typography variant="body2">
                        {video?.duration ? formatDuration(video.duration) : 'N/A'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <VisibilityIcon fontSize="small" />
                      <Typography variant="body2">
                        {formatViews(video?.views)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
              </Box>
              )}
            </Box>
          )}
          
          {/* Title overlay (only shown when not interacting with video) */}
          {previewUrl && showOverlay && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 3,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 998, /* Below the video controls */
              }}
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {video?.title || 'Video Details'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTimeIcon fontSize="small" />
                    <Typography variant="body2">
                      {video?.duration ? formatDuration(video.duration) : 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <VisibilityIcon fontSize="small" />
                    <Typography variant="body2">
                      {formatViews(video?.views)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
            </Box>
          )}
          </Box>
      </Box>
      
      {/* Content section */}
      <Box sx={{ 
        width: '100%', 
        maxWidth: '1200px', 
        color: theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary, 
        mt: 6, 
        px: { xs: 2, md: 4 } 
      }}>
        <Box sx={{ mb: 6 }}>
          {purchaseComplete && !showPurchaseModal && (
          <Alert severity="success" sx={{ mb: 3 }}>
              Purchase successful! Click here to <Button color="inherit" onClick={() => setShowPurchaseModal(true)}>view your product link</Button>.
          </Alert>
        )}
        
        {purchaseError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {purchaseError}
          </Alert>
        )}
        
        {/* Back button */}
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back to Videos
        </Button>
        
        {/* Video description */}
        <Box sx={{ mb: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 2,
              mb: 2
            }}>
              <Typography variant="h4" component="h1" sx={{ 
                color: theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary, 
                mt: 2,
                flex: 1,
                minWidth: '200px'
              }}>
                {video?.title || 'Video Details'}
              </Typography>
              
               {/* Price Display - Enhanced */}
               <Box sx={{ 
                 display: 'flex', 
                 flexDirection: 'column', 
                 alignItems: 'center',
                 p: 1.5,
                 backgroundColor: theme.palette.mode === 'dark' ? 'rgba(229, 9, 20, 0.1)' : 'rgba(229, 9, 20, 0.05)',
                 borderRadius: 1.5,
                 border: '1px solid #E50914',
                 minWidth: '120px'
               }}>
                 <Typography variant="h4" sx={{ 
                   fontWeight: 'bold', 
                   color: '#E50914',
                   fontSize: { xs: '1.4rem', sm: '1.6rem' },
                   lineHeight: 1
                 }}>
                   ${video?.price.toFixed(2)}
                 </Typography>
                 <Typography variant="caption" sx={{ 
                   color: theme.palette.mode === 'dark' ? '#ccc' : '#666',
                   fontSize: '0.7rem',
                   fontWeight: 'bold',
                   textTransform: 'uppercase',
                   letterSpacing: '0.3px',
                   mt: 0.3
                 }}>
                   One-time
                 </Typography>
               </Box>
            </Box>
          
          <Typography variant="body1" paragraph sx={{ 
            color: theme.palette.mode === 'dark' ? '#ccc' : theme.palette.text.secondary, 
            mt: 2 
          }}>
            {video?.description}
          </Typography>
          
            {/* Payment Options */}
            <Box sx={{ mt: 4 }}>
              {/* Payment Options Layout - Reorganized for better responsiveness */}
              <Grid container spacing={3} justifyContent="center" alignItems="stretch" sx={{ mb: 4 }}>
                {/* Left column for payment methods */}
                <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* PayPal Payment Button - Using Client ID */}
                  {paypalClientId && paypalClientId.startsWith('A') && (
                    <Box sx={{ width: '100%', mb: { xs: 2, md: 0 } }}>
                      <PayPalScriptProvider 
                        options={{
                          clientId: paypalClientId,
                          currency: "USD",
                          intent: "capture",
                          disableFunding: "credit",
                          components: "buttons"
                        }}
                      >
                        <PayPalButtons
                          fundingSource={undefined}
                          style={{ 
                            layout: "vertical",
                            color: "gold",
                            shape: "rect",
                            label: "paypal"
                          }}
                          onClick={async (data, actions) => {
                            startPaymentProcess('paypal');
                            return Promise.resolve();
                          }}
                          createOrder={createOrder}
                          onApprove={onApprove}
                        />
                      </PayPalScriptProvider>
                    </Box>
                  )}
                  
                  {/* Stripe Button */}
                  {stripePublishableKey && !hasPurchased && (
                    <Box sx={{ width: '100%', mb: { xs: 2, md: 0 } }}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleStripePayment}
                        disabled={isStripeLoading}
                        sx={{
                          py: 1.5,
                          backgroundColor: '#635bff',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: 16,
                          '&:hover': {
                            backgroundColor: '#4b45c6',
                          }
                        }}
                      >
                        {isStripeLoading ? 'Processing...' : 'Pay Now'}
                      </Button>
                      
                      {/* Information text field */}
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value="IMPORTANT: You MUST provide a any valid email address during checkout. Without email, payment will be declined. You will automatically receive the content link immediately after successful payment."
                        InputProps={{
                          readOnly: true,
                          sx: { 
                            color: theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary,
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            fontSize: '0.875rem',
                            '& .MuiInputBase-input': {
                              textAlign: 'center',
                              fontWeight: 'bold'
                            }
                          }
                        }}
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  )}
                  
                  {/* Crypto Button */}
                  {cryptoWallets.length > 0 && (
                    <Box sx={{ width: '100%', mb: { xs: 2, md: 0 } }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<MonetizationOnIcon />}
                        onClick={() => setShowCryptoModal(true)}
                        sx={{ 
                          py: 1.5,
                          borderColor: '#26a17b',
                          color: '#26a17b',
                          fontWeight: 'bold',
                          fontSize: 16,
                          '&:hover': {
                            borderColor: '#1e1e1e',
                            color: '#fff',
                            background: '#26a17b',
                          }
                        }}
                      >
                        Pay with Crypto
                      </Button>
                    </Box>
                  )}
                  
                  {/* Product Link Button - Show if purchased */}
                  {hasPurchased && (
                    <Box sx={{ width: '100%' }}>
                      <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        onClick={() => setShowPurchaseModal(true)}
                        startIcon={<CheckCircleIcon />}
                        sx={{ py: 1.5, fontWeight: 'bold', fontSize: 16 }}
                      >
                        View Product Link
                      </Button>
                    </Box>
                  )}
                </Grid>
                
                {/* Right column for telegram contact */}
                {telegramUsername && (
                  <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<TelegramIcon />}
                      onClick={handleTelegramRedirect}
                      sx={{ 
                        py: 1.5,
                        height: '100%',
                        borderColor: '#229ED9',
                        color: '#229ED9',
                        fontWeight: 'bold',
                        fontSize: 16,
                        '&:hover': {
                          borderColor: '#229ED9',
                          color: '#fff',
                          background: '#229ED9',
                        }
                      }}
                    >
                      Contact on Telegram
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Box>
        </Box>
        
        {/* Suggested Videos Section */}
        {suggestedVideos.length > 0 && (
          <>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 6, mb: 3, color: 'white' }}>
              More Like This
            </Typography>
            
            <Grid container spacing={3}>
              {suggestedVideos.map((suggestedVideo) => (
                <Grid item key={suggestedVideo.$id} xs={12} sm={6} md={3}>
                  <VideoCard video={suggestedVideo} />
                </Grid>
              ))}
            </Grid>
          </>
        )}
        </Box>
      </Box>
      
      {/* Purchase Success Modal */}
      <Modal
        open={showPurchaseModal}
        onClose={handleCloseModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
        aria-labelledby="purchase-success-modal"
        aria-describedby="modal-with-product-link"
      >
        <Fade in={showPurchaseModal}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: '500px' },
            bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : theme.palette.background.paper,
            border: '2px solid #E50914',
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            color: theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                Purchase Successful!
              </Typography>
              <IconButton 
                onClick={handleCloseModal} 
                sx={{ color: theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary }}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
            </Box>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              Thank you for purchasing <strong>{purchasedProductName || getRandomProductName()}</strong>!
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 1 }}>
              You now have access to: <strong>{video?.title}</strong>
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 3, color: theme.palette.mode === 'dark' ? '#aaa' : '#777' }}>
              Note: For your privacy, a generic product name was used during checkout.
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              {getProductLinks().length > 1 ? 'Here are your product links:' : 'Here is your product link:'}
            </Typography>
            
            {video?.product_link ? (
              <Box sx={{ mb: 4 }}>
                {/* Individual Links */}
                {getProductLinks().map((link, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Link {index + 1}:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        value={link.trim()}
                        InputProps={{
                          readOnly: true,
                          sx: { 
                            color: theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary,
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                          }
                        }}
                      />
                      <Button
                        variant="contained"
                        color={copiedLinkIndex === index ? "success" : "primary"}
                        onClick={() => copyIndividualLink(link, index)}
                        startIcon={copiedLinkIndex === index ? <CheckCircleIcon /> : <ContentCopyIcon />}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {copiedLinkIndex === index ? 'Copied!' : 'Copy'}
                      </Button>
                    </Box>
                  </Box>
                ))}

                {/* Button to copy all links */}
                {getProductLinks().length > 1 && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={copyToClipboard}
                      startIcon={copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
                      sx={{ 
                        borderColor: '#E50914',
                        color: '#E50914',
                        '&:hover': {
                          borderColor: '#E50914',
                          color: '#fff',
                          background: '#E50914',
                        }
                      }}
                    >
                      {copied ? 'All Links Copied!' : 'Copy All Links'}
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="info" sx={{ mb: 4 }}>
                Your purchase was successful! The admin will need to update the product link. 
                Please contact support through Telegram for immediate access.
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {video?.product_link && (
                <Button
                  variant="contained"
                  color={pdfGenerated ? "success" : "secondary"}
                  fullWidth
                  startIcon={pdfGenerated ? <CheckCircleIcon /> : <PictureAsPdfIcon />}
                  onClick={generatePDF}
                >
                  {pdfGenerated ? 'PDF Downloaded!' : 'Download Receipt PDF'}
                </Button>
              )}
              
              {telegramUsername && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<TelegramIcon />}
                  onClick={handleTelegramRedirect}
                  sx={{ 
                    borderColor: '#229ED9',
                    color: '#229ED9',
                    '&:hover': {
                      borderColor: '#229ED9',
                      color: '#fff',
                      background: '#229ED9',
                    }
                  }}
                >
                  Contact on Telegram
                </Button>
              )}
              
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#aaa' : theme.palette.text.secondary, 
              textAlign: 'center', 
              mt: 2 
            }}>
              {video?.product_link 
                ? 'Please save your product link and download the receipt PDF before closing this window. If any link does not work, please contact us via Telegram for immediate assistance.'
                : 'Your purchase has been recorded. Please contact support for access to your content.'}
            </Typography>
            </Box>
          </Box>
        </Fade>
      </Modal>
      
      {/* Crypto Wallets Modal */}
      <Modal
        open={showCryptoModal}
        onClose={() => setShowCryptoModal(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500 }}
        aria-labelledby="crypto-wallets-modal"
        aria-describedby="modal-with-crypto-wallets"
      >
        <Fade in={showCryptoModal}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '95%', sm: 420, md: 500 },
            bgcolor: theme.palette.mode === 'dark' ? '#181818' : '#fff',
            borderRadius: 3,
            boxShadow: 24,
            p: 4,
            color: theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Pay with Crypto
              </Typography>
              <IconButton onClick={() => setShowCryptoModal(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Typography variant="body2" sx={{ mb: 3, color: theme.palette.mode === 'dark' ? '#aaa' : '#555' }}>
              Choose one of the wallets below to make your payment. <br />
              <b>After payment, send your proof of payment via Telegram for manual confirmation.</b>
            </Typography>
            {cryptoWallets.map((wallet, idx) => {
              // Parse wallet: "CODE - Name\naddress"
              const [header, address] = wallet.split('\n');
              const [code, name] = header.split(' - ');
              return (
                <Box key={idx} sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  gap: { xs: 2, sm: 2 },
                  mb: 3,
                  p: 2,
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'dark' ? '#333' : '#eee',
                  borderRadius: 2,
                  background: theme.palette.mode === 'dark' ? '#232323' : '#fafafa',
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    flex: 1,
                    minWidth: 0
                  }}>
                    <Box sx={{ minWidth: 40, flexShrink: 0 }}>{cryptoIcons[code] || <MonetizationOnIcon fontSize="large" />}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{name || code}</Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          wordBreak: 'break-all', 
                          color: theme.palette.mode === 'dark' ? '#fff' : '#222',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                      >
                        {address}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant={copiedWalletIndex === idx ? 'contained' : 'outlined'}
                    color={copiedWalletIndex === idx ? 'success' : 'primary'}
                    size="small"
                    startIcon={copiedWalletIndex === idx ? <CheckCircleIcon /> : <ContentCopyIcon />}
                    onClick={() => {
                      navigator.clipboard.writeText(address);
                      setCopiedWalletIndex(idx);
                      setTimeout(() => setCopiedWalletIndex(null), 2000);
                    }}
                    sx={{ 
                      minWidth: { xs: '100%', sm: 90 },
                      mt: { xs: 1, sm: 0 }
                    }}
                  >
                    {copiedWalletIndex === idx ? 'Copied!' : 'Copy'}
                  </Button>
                </Box>
              );
            })}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<TelegramIcon />}
                onClick={handleTelegramRedirect}
              >
                Contact on Telegram
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>
      
      {/* Payment Processing Modal */}
      <Modal
        open={showPrePaymentModal}
        onClose={() => setShowPrePaymentModal(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500 }}
        aria-labelledby="pre-payment-modal"
        aria-describedby="modal-before-payment-redirect"
      >
        <Fade in={showPrePaymentModal}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '95%', sm: 450 },
            maxWidth: 500,
            bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : theme.palette.background.paper,
            border: '2px solid #E50914',
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            color: theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                Processing Payment
              </Typography>
              <CircularProgress size={30} sx={{ color: theme.palette.primary.main }} />
            </Box>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              You are about to purchase:
            </Typography>
            
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              {video?.title}
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                What to expect:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Generic product name for privacy
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Redirect to secure payment page
              </Typography>
              <Typography variant="body2">
                • Return here with content link after payment
              </Typography>
            </Alert>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Important:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, color: '#d32f2f', fontWeight: 'bold' }}>
                • EMAIL REQUIRED
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • One attempt only
              </Typography>
              <Typography variant="body2">
                • Contact Telegram if issues
              </Typography>
            </Alert>
            
            <Typography variant="body2" sx={{ mb: 2, color: theme.palette.mode === 'dark' ? '#aaa' : '#777', display: 'flex', justifyContent: 'space-between' }}>
              <span>Redirecting in:</span> <span>{redirectCountdown} seconds</span>
            </Typography>
            
            <LinearProgress variant="determinate" value={(5 - redirectCountdown) * 20} sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => setShowPrePaymentModal(false)}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>
      
    </Box>
  );
};

export default VideoPlayer;
