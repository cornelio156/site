import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TelegramIcon from '@mui/icons-material/Telegram';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import CloseIcon from '@mui/icons-material/Close';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import Backdrop from '@mui/material/Backdrop';
import { useTheme } from '@mui/material/styles';
import jsPDF from 'jspdf';
import { VideoService } from '../services/VideoService';
import { useSiteConfig } from '../context/SiteConfigContext';
import TelegramService from '../services/TelegramService';

interface PaymentData {
  videoId: string;
  videoTitle: string;
  videoPrice: number;
  productLink?: string;
  transactionId: string;
  paymentMethod: 'stripe' | 'paypal';
  buyerEmail?: string;
  buyerName?: string;
}

const PaymentSuccess: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { telegramUsername, siteName } = useSiteConfig();
  
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get parameters from URL
        const videoId = searchParams.get('video_id');
        const sessionId = searchParams.get('session_id');
        const paymentSuccess = searchParams.get('payment_success');
        const paymentMethod = searchParams.get('payment_method') as 'stripe' | 'paypal' || 'stripe';
        const buyerEmail = searchParams.get('buyer_email');
        const buyerName = searchParams.get('buyer_name');

        if (!videoId) {
          setError('Invalid payment data. Video ID not found.');
          setLoading(false);
          return;
        }

        // Get video details
        const video = await VideoService.getVideo(videoId);
        if (!video) {
          setError('Video not found.');
          setLoading(false);
          return;
        }

        const data: PaymentData = {
          videoId,
          videoTitle: video.title,
          videoPrice: video.price,
          productLink: video.product_link,
          transactionId: sessionId || `payment_${Date.now()}`,
          paymentMethod,
          buyerEmail: buyerEmail || undefined,
          buyerName: buyerName || undefined,
        };

        setPaymentData(data);


        // Send Telegram notification
        try {
          await TelegramService.sendSaleNotification({
            videoTitle: video.title,
            videoPrice: video.price,
            buyerEmail: buyerEmail || undefined,
            buyerName: buyerName || undefined,
            transactionId: sessionId || `payment_${Date.now()}`,
            paymentMethod,
            timestamp: new Date().toLocaleString('pt-BR')
          });
        } catch (telegramError) {
          console.error('Failed to send Telegram notification:', telegramError);
          // Don't show this error to the user since payment was successful
        }

      } catch (err) {
        console.error('Error loading payment data:', err);
        setError('Failed to load payment information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, [searchParams]);


  // Split product links by space
  const getProductLinks = () => {
    if (!paymentData?.productLink) return [];
    return paymentData.productLink.split(/\s+/).filter(link => link.trim().length > 0);
  };

  // Copy product link to clipboard
  const copyToClipboard = () => {
    if (paymentData?.productLink) {
      navigator.clipboard.writeText(paymentData.productLink)
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

  // Generate PDF with product link
  const generatePDF = () => {
    if (!paymentData) return;
    
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
      
      // Video details
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Video: ${paymentData.videoTitle}`, 20, 50);
      doc.text(`Purchase Date: ${formatDate(new Date())}`, 20, 60);
      doc.text(`Price: $${paymentData.videoPrice.toFixed(2)}`, 20, 70);
      doc.text(`Payment Method: ${paymentData.paymentMethod.toUpperCase()}`, 20, 80);
      doc.text(`Transaction ID: ${paymentData.transactionId}`, 20, 90);
    
      // Product link section
      doc.setFontSize(14);
      doc.text("Your Product Link:", 20, 110);
      
      // Draw a box around the link
      doc.setDrawColor(229, 9, 20); // Netflix red
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(20, 115, 170, 20, 3, 3, 'FD');
    
      // Add the link text
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      if (paymentData.productLink) {
        doc.text(paymentData.productLink, 25, 127);
      } else {
        doc.text("Contact support via Telegram for access", 25, 127);
      }
    
      // Instructions
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text("Instructions:", 20, 150);
      
      if (paymentData.productLink) {
        doc.text("1. Copy the link above and paste it in your browser", 25, 160);
        doc.text("2. The link will take you to your purchased content", 25, 170);
        doc.text("3. This link is for your personal use only", 25, 180);
        doc.text("4. Do not share this link with others", 25, 190);
      } else {
        doc.text("1. Contact support via Telegram to get access to your content", 25, 160);
        doc.text("2. Provide your purchase details when contacting support", 25, 170);
        doc.text("3. Support will provide you with access instructions", 25, 180);
      }
    
      // Footer
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("Thank you for your purchase!", 105, 220, { align: "center" });
      doc.text("© ADULTFLIX - All Rights Reserved", 105, 226, { align: "center" });
    
      // Save the PDF
      doc.save(`ADULTFLIX-Receipt-${paymentData.videoTitle.replace(/\s+/g, '-')}.pdf`);
      setPdfGenerated(true);
      setTimeout(() => setPdfGenerated(false), 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
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

  // Create Telegram href for the button
  const telegramHref = (() => {
    if (!paymentData) return 'https://t.me/share/url';
    
    const message = `🎬 **${paymentData.videoTitle}**

💰 **Price:** $${paymentData.videoPrice.toFixed(2)}
💳 **Payment Method:** ${paymentData.paymentMethod.toUpperCase()}
🆔 **Transaction ID:** ${paymentData.transactionId}
📅 **Purchase Date:** ${formatDate(new Date())}

📝 **Description:**
I just completed my purchase and need access to the content.

Please provide me with the access details.`;
    
    const encoded = encodeURIComponent(message);
    if (telegramUsername) {
      return `https://t.me/${telegramUsername.replace('@', '')}?text=${encoded}`;
    } else {
      return `https://t.me/share/url?text=${encoded}`;
    }
  })();

  const handleBack = () => {
    navigate('/videos');
  };

  const handleHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={handleBack}
            variant="outlined"
          >
            Back to Videos
          </Button>
          <Button 
            startIcon={<HomeIcon />} 
            onClick={handleHome}
            variant="contained"
          >
            Home
          </Button>
        </Box>
        
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!paymentData) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={handleBack}
            variant="outlined"
          >
            Back to Videos
          </Button>
          <Button 
            startIcon={<HomeIcon />} 
            onClick={handleHome}
            variant="contained"
          >
            Home
          </Button>
        </Box>
        
        <Alert severity="error">
          No payment data found.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          variant="outlined"
        >
          Back to Videos
        </Button>
        <Button 
          startIcon={<HomeIcon />} 
          onClick={handleHome}
          variant="contained"
        >
          Home
        </Button>
      </Box>
      
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Success Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Payment Successful!
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Thank you for your purchase
          </Typography>
        </Box>

        {/* Payment Details */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Purchase Details
          </Typography>
          
          <Box sx={{ 
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            p: 2,
            borderRadius: 1,
            mb: 2
          }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Video:</strong> {paymentData.videoTitle}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Price:</strong> ${paymentData.videoPrice.toFixed(2)}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Payment Method:</strong> {paymentData.paymentMethod.toUpperCase()}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Transaction ID:</strong> {paymentData.transactionId}
            </Typography>
            <Typography variant="body1">
              <strong>Purchase Date:</strong> {formatDate(new Date())}
            </Typography>
          </Box>
        </Box>

        {/* Product Link Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Your Product Access
          </Typography>
          
          {paymentData.productLink ? (
            <Box>

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
                      color={copiedLinkIndex === index ? ("success" as const) : ("primary" as const)}
                      onClick={() => copyIndividualLink(link, index)}
                      startIcon={copiedLinkIndex === index ? <CheckCircleIcon /> : <ContentCopyIcon />}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {copiedLinkIndex === index ? 'Copied!' : 'Copy'}
                    </Button>
                  </Box>
                </Box>
              ))}

              {/* Copy All Links Button */}
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
            <Alert severity="info" sx={{ mb: 3 }}>
              Your purchase was successful! The admin will need to update the product link. 
              Please contact support through Telegram for immediate access.
            </Alert>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {paymentData.productLink && (
            <Button
              variant="contained"
              color={pdfGenerated ? "success" : "secondary"}
              fullWidth
              startIcon={pdfGenerated ? <CheckCircleIcon /> : <PictureAsPdfIcon />}
              onClick={generatePDF}
              sx={{ py: 1.5 }}
            >
              {pdfGenerated ? 'PDF Downloaded!' : 'Download Receipt PDF'}
            </Button>
          )}
          
          {telegramUsername && (
            <Button
              variant="outlined"
              fullWidth
              startIcon={<TelegramIcon />}
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                borderColor: '#229ED9',
                color: '#229ED9',
                py: 1.5,
                '&:hover': {
                  borderColor: '#229ED9',
                  color: '#fff',
                  background: '#229ED9',
                }
              }}
            >
              Contact Support on Telegram
            </Button>
          )}
        </Box>

        {/* Instructions */}
        <Box sx={{ mt: 4, p: 2, backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ 
            color: theme.palette.mode === 'dark' ? '#aaa' : theme.palette.text.secondary,
            textAlign: 'center'
          }}>
            {paymentData.productLink 
              ? 'Please save your product link and download the receipt PDF. If any link does not work, please contact us via Telegram for immediate assistance.'
              : 'Your purchase has been recorded. Please contact support for access to your content.'}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default PaymentSuccess;