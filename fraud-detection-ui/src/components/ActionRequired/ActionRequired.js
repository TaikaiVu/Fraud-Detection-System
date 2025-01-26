import { Box, Paper, Typography, Chip, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Warning, TrendingUp, CheckCircle, SecurityUpdateGood, NotificationsOff, HistoryToggleOff } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { fetchFlaggedTransactions, updateTransactionStatus } from '../../services/dynamoDBService';
import { contentContainerStyle } from '../../styles/sharedStyles';
import { useNavigate } from 'react-router-dom';
import WebSocketService from '../../services/websocketService';

const ActionRequired = ({ onTransactionSelect, onStatusUpdate }) => {
  const navigate = useNavigate();
  const [highRiskTransactions, setHighRiskTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sortTransactionsByDate = (transactions) => {
    return [...transactions].sort((a, b) => {
      const timeA = a.updatedAt || a.date;
      const timeB = b.updatedAt || b.date;
      
      // Simple string comparison works because ISO format strings are chronologically sortable
      return timeB.localeCompare(timeA); // For descending order (newest first)
    });
  };

  // Add initial load effect
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const data = await fetchFlaggedTransactions('high');
        
        const formattedTransactions = data.map(transaction => ({
          ...transaction,
          transactionId: transaction.SK.split('#')[1],
          userName: transaction.userName,
          amount: transaction.amount?.toString() || '0',
          date: transaction.date || new Date().toISOString(),
          updatedAt: transaction.updatedAt || transaction.date,
          type: transaction.type || 'Unknown',
          reason: transaction.reason || 'Suspicious activity detected'
        }));

        setHighRiskTransactions(sortTransactionsByDate(formattedTransactions));
      } catch (error) {
        // Handle error
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []); // Run only on mount

  // WebSocket subscription effect
  useEffect(() => {
    const ws = WebSocketService.getInstance();
    let isSubscribed = true;
    
    const handleUpdate = async (data) => {
      if (!isSubscribed || data.type !== 'TRANSACTION_UPDATE') return;

      try {
        const newData = await fetchFlaggedTransactions('high');
        
        if (!isSubscribed) return;
        
        const formattedTransactions = newData.map(transaction => ({
          ...transaction,
          transactionId: transaction.SK.split('#')[1],
          userName: transaction.userName,
          amount: transaction.amount?.toString() || '0',
          date: transaction.date || new Date().toISOString(),
          updatedAt: transaction.updatedAt || transaction.date,
          type: transaction.type || 'Unknown',
          reason: transaction.reason || 'Suspicious activity detected'
        }));

        setHighRiskTransactions(sortTransactionsByDate(formattedTransactions));
        
        // Update notification counts
        if (onStatusUpdate) {
          await onStatusUpdate();
        }
      } catch (error) {
        // Handle error
      }
    };

    ws.subscribe('action-required', handleUpdate);
    
    return () => {
      isSubscribed = false;
      ws.unsubscribe('action-required');
    };
  }, [onStatusUpdate]);

  const handleTransactionClick = (transaction) => {
    console.log('Transaction data:', transaction);
    
    // Get the transaction ID in the correct format
    const transactionId = transaction.SK?.split('#')[1] || 
                         transaction.transactionId || 
                         `T-${transaction.customerId}-${transaction.id}`;
    
    if (!transactionId) {
      console.error('Invalid transaction data:', transaction);
      return;
    }

    console.log('Using transaction ID:', transactionId);
    
    navigate(`/action-required/transaction/${transactionId}`);
  };

  const handleMarkAsNormal = () => {
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    setIsDialogOpen(false);
    navigate('/action-required', { replace: true });
  };

  const ConfirmationDialog = () => (
    <Dialog 
      open={isDialogOpen} 
      onClose={() => setIsDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        bgcolor: 'success.light', 
        color: 'success.dark',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <CheckCircle />
        Mark Transaction as Normal
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          In a real-world scenario, this action would:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <SecurityUpdateGood color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Un-flag this transaction"
              secondary="Remove suspicious status"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <NotificationsOff color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Update notification system"
              secondary="Remove from suspicious list"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <HistoryToggleOff color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Update transaction history"
              secondary="Mark as reviewed and cleared"
            />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Button 
          onClick={() => setIsDialogOpen(false)}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box sx={contentContainerStyle}>
        <Typography>Loading transactions...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {highRiskTransactions.map((transaction) => (
        <Paper
          key={transaction.transactionId}
          onClick={() => onTransactionSelect(transaction)}
          sx={{
            cursor: 'pointer',
            p: 3,
            borderRadius: 2,
            border: '1px solid #fee2e2',
            backgroundColor: '#fff',
            transition: 'all 0.2s ease',
            mb: 2,  // Consistent margin bottom between transactions
            '&:hover': {
              backgroundColor: '#fef2f2',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6">{transaction.userName}</Typography>
              <Typography variant="body2" color="text.secondary">
                Transaction ID: {transaction.transactionId}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp fontSize="small" />
                {transaction.type}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {transaction.date}
              </Typography>
            </Box>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'error.main',
                fontWeight: 600
              }}
            >
              ${transaction.amount}
            </Typography>
          </Box>

          <Typography 
            variant="body2" 
            sx={{ 
              color: 'error.main',
              backgroundColor: '#fee2e2',
              p: 1,
              borderRadius: 1,
              mt: 2
            }}
          >
            Flagged: {transaction.reason}
          </Typography>
        </Paper>
      ))}
      <ConfirmationDialog />
    </Box>
  );
};

export default ActionRequired; 