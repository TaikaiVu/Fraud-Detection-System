import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { Shield } from '@mui/icons-material';

// Pulse animation for the background
const pulseBackground = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

// Text reveal animation
const revealText = keyframes`
  0% {
    clip-path: inset(0 100% 0 0);
    transform: translateX(-20px);
  }
  50% {
    clip-path: inset(0 0 0 0);
    transform: translateX(0);
  }
  100% {
    clip-path: inset(0 0 0 0);
    transform: translateX(0);
  }
`;

// Shield icon animation
const rotateShield = keyframes`
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
`;

// Fade out animation
const fadeOut = keyframes`
  80% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.95);
  }
`;

const SplashScreen = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(-45deg, #047857, #059669, #0d9488, #047857)',
        backgroundSize: '400% 400%',
        animation: `${pulseBackground} 3s ease infinite, ${fadeOut} 2s ease-in-out forwards`,
        zIndex: 9999,
        gap: 2,
        overflow: 'hidden'
      }}
    >
      <Shield 
        sx={{
          fontSize: {
            xs: '4rem',
            sm: '5rem',
            md: '6rem'
          },
          color: 'white',
          animation: `${rotateShield} 1s ease-out forwards`,
          mb: 2
        }}
      />
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <Typography
          variant="h1"
          sx={{
            color: '#ffffff',
            fontWeight: 800,
            letterSpacing: '0.2em',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            fontSize: {
              xs: '2rem',
              sm: '3rem',
              md: '4rem'
            },
            animation: `${revealText} 1s ease-out forwards`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: 'white',
              transform: 'scaleX(0)',
              transformOrigin: 'left',
              animation: 'underline 1s ease-out 0.5s forwards',
            },
            '@keyframes underline': {
              to: {
                transform: 'scaleX(1)',
              },
            },
          }}
        >
          GUARDFRAUD
        </Typography>
      </Box>
      <Typography
        variant="subtitle1"
        sx={{
          color: 'rgba(255,255,255,0.9)',
          mt: 2,
          opacity: 0,
          animation: `${revealText} 0.8s ease-out 0.3s forwards`,
          textAlign: 'center',
          letterSpacing: '0.1em',
          fontSize: {
            xs: '0.9rem',
            sm: '1rem',
            md: '1.1rem'
          }
        }}
      >
        Securing Your Transactions
      </Typography>
    </Box>
  );
};

export default SplashScreen; 