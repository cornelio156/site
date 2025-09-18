import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import { keyframes } from '@mui/system';
import { useSiteConfig } from '../context/SiteConfigContext';

// Keyframes para a animação
const fadeIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

const scaleUp = keyframes`
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.1);
  }
`;

const fadeOut = keyframes`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

interface SplashAnimationProps {
  onAnimationComplete: () => void;
}

const SplashAnimation = ({ onAnimationComplete }: SplashAnimationProps) => {
  const [animationStage, setAnimationStage] = useState(0);
  const { siteName } = useSiteConfig();

  useEffect(() => {
    // Controla os estágios da animação
    const stageTimers = [
      setTimeout(() => setAnimationStage(1), 1500), // Fade in completo (aumentado)
      setTimeout(() => setAnimationStage(2), 4000), // Começa a escalar (aumentado)
      setTimeout(() => setAnimationStage(3), 5500), // Começa a desaparecer (aumentado)
      setTimeout(() => {
        setAnimationStage(4);
        onAnimationComplete();
      }, 7000) // Animação completa (aumentado)
    ];

    return () => {
      stageTimers.forEach(timer => clearTimeout(timer));
    };
  }, [onAnimationComplete]);

  // Se a animação estiver completa, não renderiza nada
  if (animationStage === 4) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        zIndex: 9999,
        opacity: animationStage === 3 ? 0 : 1,
        transition: 'opacity 1.5s ease-out',
      }}
    >
      <Box
        sx={{
          color: '#E50914',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          fontSize: { xs: '3rem', sm: '4rem', md: '6rem' },
          letterSpacing: '4px',
          animation: animationStage === 0
            ? `${fadeIn} 1.5s ease-in forwards`
            : animationStage === 2
              ? `${scaleUp} 1.5s ease-out forwards`
              : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {siteName || 'VIDEOSPLUS'}
        <Box
          sx={{
            width: '100%',
            height: '8px',
            backgroundColor: '#E50914',
            marginTop: '15px',
          }}
        />
      </Box>
    </Box>
  );
};

export default SplashAnimation; 