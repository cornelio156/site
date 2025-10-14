import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Always start with dark theme for adult content site
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    // Check if user has a saved theme preference
    const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
    if (savedTheme) {
      setMode(savedTheme);
    } else {
      // Set dark theme as default
      localStorage.setItem('theme', 'dark');
    }
  }, []);

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('theme', mode);
    
    // Apply theme class to body
    document.body.className = mode === 'dark' ? 'dark-theme' : 'light-theme';
  }, [mode]);

  const toggleTheme = () => {
    setMode(prevMode => (prevMode === 'dark' ? 'light' : 'dark'));
  };

  // Create MUI theme based on mode
  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: '#8e24aa', // Purple for adult content
      },
      secondary: {
        main: '#6a1b9a', // Darker purple accent
      },
      background: {
        default: mode === 'dark' ? '#000000' : '#000000', // Pure black background
        paper: mode === 'dark' ? '#1a1a1a' : '#1a1a1a',   // Dark cards
      },
      text: {
        primary: mode === 'dark' ? '#FFFFFF' : '#FFFFFF',
        secondary: mode === 'dark' ? '#8e24aa' : '#8e24aa', // Purple for secondary text
      },
      error: {
        main: '#FF0000', // Pure red for errors
      },
    },
    typography: {
      fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 800,
        letterSpacing: '0.5px',
      },
      h2: {
        fontWeight: 700,
        letterSpacing: '0.3px',
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      button: {
        fontWeight: 600,
        textTransform: 'none',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '8px 20px',
            transition: 'all 0.3s ease',
          },
          containedPrimary: {
            backgroundColor: '#8e24aa',
            '&:hover': {
              backgroundColor: '#6a1b9a',
              transform: 'scale(1.03)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              zIndex: 1,
              boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1a1a1a' : '#1a1a1a',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: 'rgba(142, 36, 170, 0.1)',
            }
          }
        }
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 