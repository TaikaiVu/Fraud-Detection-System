import { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemIcon, ListItemText, Typography, IconButton } from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Assessment as ReportIcon,
  NotificationsActive as NotificationsActiveIcon,
  Close,
  Dashboard,
  Warning,
  ReportProblem
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { fetchFlaggedTransactions } from '../../services/dynamoDBService';
import WebSocketService from '../../services/websocketService';

const Sidebar = ({ currentView, notificationCounts, onClose, isSmallScreen, onNavigate }) => {
  const navigate = useNavigate();
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [mediumRiskCount, setMediumRiskCount] = useState(0);

  useEffect(() => {
    // Load initial counts
    const loadInitialCounts = async () => {
      try {
        const [highRiskData, mediumRiskData] = await Promise.all([
          fetchFlaggedTransactions('high'),
          fetchFlaggedTransactions('medium')
        ]);
        setHighRiskCount(highRiskData.length);
        setMediumRiskCount(mediumRiskData.length);
      } catch (error) {
        console.error('Error loading initial counts:', error);
      }
    };

    loadInitialCounts();

    // Set up WebSocket for updates
    const ws = WebSocketService.getInstance();
    
    ws.subscribe('sidebar', (data) => {
      console.log('Sidebar received update:', data);
      if (data.type === 'TRANSACTION_UPDATE') {
        if (data.counts) {
          setHighRiskCount(data.counts.high || 0);
          setMediumRiskCount(data.counts.medium || 0);
        }
      }
    });

    return () => {
      ws.unsubscribe('sidebar');
    };
  }, []);

  const menuItems = [
    {
      icon: <DashboardIcon />, 
      text: 'Dashboard',
      view: '',  // Empty for default dashboard view
      color: '#2563eb'
    },
    { 
      icon: <WarningIcon />, 
      text: 'Suspicious',
      view: 'suspicious',
      color: '#eab308',
      count: mediumRiskCount
    },
    {
      icon: <ErrorIcon />, 
      text: 'Action Required',
      view: 'action-required',
      color: '#dc2626',
      count: highRiskCount
    }
  ];

  return (
    <Box
      sx={{
        width: '280px',
        height: '100vh',
        backgroundColor: 'secondary.light',
        borderRight: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Close button - Only show on smaller screens */}
      {isSmallScreen && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          p: 1
        }}>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      )}

      {/* Title Section */}
      <Box sx={{ 
        p: 3, 
        mb: 1,
        borderBottom: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.1)',
      }}>
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: '12px',
            padding: '10px 15px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#047857',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textAlign: 'center',
              textTransform: 'uppercase',
              fontSize: '1.1rem',
              textShadow: '0 1px 2px rgba(255,255,255,0.3)',
            }}
          >
            GuardFraud
          </Typography>
        </Box>
      </Box>

      {/* Navigation List */}
      <List sx={{ px: 2, py: 3 }}>
        {menuItems.map((item) => (
          <ListItem 
            key={item.text}
            button 
            selected={currentView === item.view}
            onClick={() => onNavigate(item.view)}
            sx={{
              mb: 1,
              borderRadius: 2,
              color: '#047857',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                transform: 'translateX(6px)',
              },
            }}
          >
            <ListItemIcon sx={{ 
              minWidth: 40,
              color: item.color
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text}
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: '0.95rem',
                  fontWeight: currentView === item.view ? 600 : 500,
                  color: '#047857',
                }
              }}
            />
            {item.count > 0 && (
              <Box
                sx={{
                  backgroundColor: item.color,
                  color: 'white',
                  borderRadius: '12px',
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  ml: 1,
                }}
              >
                {item.count}
              </Box>
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar; 