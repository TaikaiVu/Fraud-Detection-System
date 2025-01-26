import { useEffect, useState } from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { 
  NotificationsActive as AlertIcon,
  Close as CloseIcon,
  Warning,
  Error
} from '@mui/icons-material';
import { contentContainerStyle } from '../../styles/sharedStyles';
import WebSocketService from '../../services/websocketService';

const Alert = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ws = WebSocketService.getInstance();
    
    ws.subscribe('alerts', (data) => {
      if (data.type === 'ALERT') {
        const newNotification = {
          id: Date.now(),
          message: data.message,
          timestamp: new Date().toISOString(),
          type: data.riskLevel || 'medium',
          isRead: false
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    });

    return () => {
      ws.unsubscribe('alerts');
    };
  }, []);

  const handleDismiss = (notificationId) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  return (
    <Box sx={contentContainerStyle}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ 
          color: 'primary.main', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}>
          <AlertIcon />
          Alerts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real-time fraud detection alerts
        </Typography>
      </Box>

      {notifications.map((notification) => (
        <Paper
          key={notification.id}
          elevation={1}
          sx={{
            p: 3,
            mb: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: notification.type === 'high' ? '#fee2e2' : '#fef3c7',
            backgroundColor: notification.type === 'high' ? '#fef2f2' : '#fffbeb',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {notification.type === 'high' ? (
                <Error sx={{ color: '#dc2626' }} />
              ) : (
                <Warning sx={{ color: '#eab308' }} />
              )}
              <Typography variant="subtitle1" sx={{ 
                color: notification.type === 'high' ? '#dc2626' : '#92400e',
                fontWeight: 600
              }}>
                {notification.type === 'high' ? 'High Risk Alert' : 'Medium Risk Alert'}
              </Typography>
            </Box>
            <IconButton 
              size="small" 
              onClick={() => handleDismiss(notification.id)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {notification.message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(notification.timestamp).toLocaleString()}
          </Typography>
        </Paper>
      ))}

      {notifications.length === 0 && (
        <Paper
          elevation={1}
          sx={{
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
            backgroundColor: '#f8fafc'
          }}
        >
          <AlertIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No new alerts at the moment
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Alert; 