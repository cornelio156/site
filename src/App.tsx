import type { FC } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import AuthProvider from './services/Auth';
import { SiteConfigProvider, useSiteConfig } from './context/SiteConfigContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import VideoList from './pages/VideoList';
import VideoPage from './pages/VideoPage';
import Videoplayer from './pages/Videoplayer';
import Admin from './pages/Admin';
import Home from './pages/Home';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import SplashAnimation from './components/SplashAnimation';
import PaymentNotifications from './components/PaymentNotifications';
import PrivacyNotice from './components/PrivacyNotice';
import ScrollToTop from './components/ScrollToTop';
import CustomAnalytics from './components/CustomAnalytics';
import LoadingModal from './components/LoadingModal';

// Componente AppContent para usar hooks que dependem do Router
const AppContent: FC = () => {
  const { siteName, loading } = useSiteConfig();
  const [showSplash, setShowSplash] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(true);
  const location = useLocation();
  const enableSplash = false; // feature-flag: disable splash without removing code
  
  // Atualizar o título da página quando o siteName mudar
  useEffect(() => {
    if (siteName) {
      document.title = `${siteName} - Adult Content`;
    }
  }, [siteName, location]);

  // Verificar se estamos na rota inicial e configurar a exibição da animação
  useEffect(() => {
    if (!enableSplash) return;
    // Verificar se é a primeira visita à página inicial
    const isFirstVisit = !sessionStorage.getItem('visited');
    
    // Se estamos na rota inicial e é a primeira visita, mostrar a animação
    if (location.pathname === '/') {
      if (isFirstVisit) {
        setShowSplash(true);
        // Marcar que já visitou o site
        sessionStorage.setItem('visited', 'true');
      } else {
        // Se o usuário recarregar a página inicial, mostrar a animação novamente
        const isPageReload = !sessionStorage.getItem('currentSession');
        
        if (isPageReload) {
          setShowSplash(true);
          // Criar uma nova sessão
          sessionStorage.setItem('currentSession', Date.now().toString());
        }
      }
    } else {
      // Se não estamos na rota inicial, não mostrar a animação
      setShowSplash(false);
    }
    
    // Limpar a sessão atual quando o componente for desmontado
    return () => {
      if (location.pathname !== '/') {
        sessionStorage.removeItem('currentSession');
      }
    };
  }, [location.pathname, enableSplash]);

  // Função para marcar que a animação foi concluída
  const handleAnimationComplete = () => {
    setShowSplash(false);
  };

  // Função para fechar o modal de loading
  const handleLoadingModalClose = () => {
    setShowLoadingModal(false);
  };

  // Controlar quando mostrar o modal de loading
  useEffect(() => {
    // Sempre mostrar o modal no início e deixar o timer de 15s do próprio modal controlar o fechamento
    setShowLoadingModal(true);
  }, []);
  
  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    }}>
      <LoadingModal open={showLoadingModal} onClose={handleLoadingModalClose} />
      {enableSplash && showSplash && <SplashAnimation onAnimationComplete={handleAnimationComplete} />}
      <PrivacyNotice />
      <PaymentNotifications />
      <CustomAnalytics />
      <Header />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <ScrollToTop />
        <Routes>
          {/* Home page shows our new Home component */}
          <Route path="/" element={<Home />} />
          <Route path="/videos" element={<VideoList />} />
          
          {/* Video pages */}
          <Route path="/video/:id" element={<Videoplayer />} />
          <Route path="/video/legacy/:id" element={<VideoPage />} />
          
          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          
          {/* Admin area (protected) */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Box>
      <Footer />
    </Box>
  );
};

const App: FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <SiteConfigProvider>
            <AppContent />
          </SiteConfigProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
