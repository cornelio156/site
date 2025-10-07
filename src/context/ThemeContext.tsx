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
  mode: 'light',
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Start with dark theme by default
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
        main: '#FF0F50', // Vibrant red/pink for adult content
      },
      secondary: {
        main: '#9900CC', // Purple accent
      },
      background: {
        default: mode === 'dark' ? '#0A0A0A' : '#ffffff', // White background for light mode
        paper: mode === 'dark' ? '#121212' : '#ffffff',   // White cards for light mode
      },
      text: {
        primary: mode === 'dark' ? '#FFFFFF' : '#000000', // Black text for light mode
        secondary: mode === 'dark' ? '#FF69B4' : '#FF0F50', // Red for secondary text in light mode
      },
      error: {
        main: '#FF0000', // Pure red for errors
      },
      divider: mode === 'dark' ? 'rgba(255, 15, 80, 0.2)' : 'rgba(255, 15, 80, 0.3)',
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
            backgroundColor: '#FF0F50',
            '&:hover': {
              backgroundColor: '#D10D42',
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
            backgroundColor: mode === 'dark' ? '#121212' : '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: 'rgba(255, 15, 80, 0.1)',
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
        <style>
          {`
            body {
              background-color: ${mode === 'dark' ? '#0A0A0A' : '#ffffff'} !important;
              color: ${mode === 'dark' ? '#FFFFFF' : '#000000'} !important;
            }
            
            .light-theme {
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            
            .dark-theme {
              background-color: #0A0A0A !important;
              color: #FFFFFF !important;
            }
            
            /* Light mode specific styles */
            .light-theme .MuiPaper-root {
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            
            .light-theme .MuiCard-root {
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            
            .light-theme .MuiContainer-root {
              background-color: #ffffff !important;
            }
            
            /* Dark mode specific styles */
            .dark-theme .MuiPaper-root {
              background-color: #121212 !important;
              color: #FFFFFF !important;
            }
            
            .dark-theme .MuiCard-root {
              background-color: #121212 !important;
              color: #FFFFFF !important;
            }
            
            .dark-theme .MuiContainer-root {
              background-color: #0A0A0A !important;
            }
          `}
        </style>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 