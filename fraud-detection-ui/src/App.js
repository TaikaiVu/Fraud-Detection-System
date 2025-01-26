import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainContent from './components/MainContent/MainContent';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ErrorBoundary from './components/ErrorBoundary';
import Analysis from './components/Analysis/Analysis';
import SplashScreen from './components/SplashScreen/SplashScreen';

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#059669',
      light: '#d1fae5',
      dark: '#047857',
    },
    secondary: {
      main: '#0d9488',
      light: '#ccfbf1',
      dark: '#0f766e',
    },
    background: {
      default: '#ecfdf5',
      paper: '#ffffff',
    },
    text: {
      primary: '#064e3b',
      secondary: '#047857',
    },
    emerald: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 600,
      letterSpacing: '0.05em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
    '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
    // ... rest of the shadows remain default
  ],
});

const App = () => {
  // Always show splash on initial render
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  return (
    <ThemeProvider theme={theme}>
      <ErrorBoundary>
        {showSplash && <SplashScreen />}
        <Router>
          <Box sx={{ 
            display: 'flex',
            backgroundColor: 'background.default',
            minHeight: '100vh',
            opacity: showSplash ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out'
          }}>
            <Routes>
              <Route path="/" element={<MainContent />} />
              <Route path="/dashboard" element={<MainContent />} />
              <Route path="/dashboard/:view" element={<MainContent />} />
              <Route path="/dashboard/:view/:transactionId" element={<MainContent />} />
              <Route path="/analysis/:customerId" element={<Analysis />} />
            </Routes>
          </Box>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App; 