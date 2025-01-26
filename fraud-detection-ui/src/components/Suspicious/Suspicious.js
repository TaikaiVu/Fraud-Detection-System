import { Box, Paper, Typography, Chip, Grid, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemIcon, ListItemText, Button } from '@mui/material';
import { Warning, TrendingUp, CheckCircle, NotificationsOff, SecurityUpdateGood, HistoryToggleOff } from '@mui/icons-material';
// import { userTransactions } from '../../data/userTransactions';
// import { getUserName } from '../../data/customers';
import { contentContainerStyle } from '../../styles/sharedStyles';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchFlaggedTransactions, updateTransactionStatus } from '../../services/dynamoDBService';
import WebSocketService from '../../services/websocketService';

const formatAmount = (amount) => {
  if (!amount) return '$0';
  const amountStr = amount.toString();
  return amountStr.startsWith('$') ? amountStr : `$${amountStr}`;
};

const Suspicious = ({ onTransactionSelect, onStatusUpdate }) => {
  const navigate = useNavigate();
  const [mediumRiskTransactions, setMediumRiskTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(null); // 'normal' or 'high'

  const sortTransactionsByDate = (transactions) => {
    return [...transactions].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.date);
      const dateB = new Date(b.updatedAt || b.date);
      return dateB - dateA;
    });
  };

  // Add WebSocket subscription
  useEffect(() => {
    const ws = WebSocketService.getInstance();
    let isSubscribed = true;

    const handleUpdate = async (data) => {
      console.log('Suspicious received WebSocket update:', data);
      
      if (!isSubscribed) return;
      
      if (data.type === 'TRANSACTION_UPDATE') {
        try {
          const newData = await fetchFlaggedTransactions('medium');
          
          if (!isSubscribed) return;
          
          const formattedTransactions = newData.map(transaction => ({
            ...transaction,
            transactionId: transaction.SK.split('#')[1],
            userName: transaction.userName,
            amount: transaction.amount?.toString() || '0',
            date: transaction.date || new Date().toISOString(),
            type: transaction.type || 'Unknown',
            reason: transaction.reason || 'Suspicious activity detected'
          }));

          // Sort transactions before updating state
          setMediumRiskTransactions(prevTransactions => {
            const newTransactions = [...formattedTransactions];
            return sortTransactionsByDate(newTransactions);
          });

          // Update notification counts if needed
          if (onStatusUpdate) {
            await onStatusUpdate();
          }
        } catch (error) {
          console.error('Error updating transactions:', error);
        }
      }
    };

    ws.subscribe('suspicious', handleUpdate);
    
    // Initial load
    const loadMediumRiskTransactions = async () => {
      try {
        const data = await fetchFlaggedTransactions('medium');
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
        
        // Sort transactions before setting state
        const sortedTransactions = sortTransactionsByDate(formattedTransactions);
        setMediumRiskTransactions(sortedTransactions);
      } catch (err) {
        console.error('Error loading medium risk transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMediumRiskTransactions();

    return () => {
      isSubscribed = false;
      ws.unsubscribe('suspicious');
    };
  }, [onStatusUpdate]); // Add onStatusUpdate to dependencies

  const handleTransactionClick = (transaction) => {
    navigate(`/suspicious/transaction/${transaction.transactionId}`);
  };

  const handleMarkAsNormal = () => {
    setDialogType('normal');
    setIsDialogOpen(true);
  };

  const handleMarkAsHighRisk = () => {
    setDialogType('high');
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    setIsDialogOpen(false);
    navigate('/suspicious', { replace: true });
  };

  const ConfirmationDialog = () => (
    <Dialog 
      open={isDialogOpen} 
      onClose={() => setIsDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        bgcolor: dialogType === 'normal' ? 'success.light' : 'error.light', 
        color: dialogType === 'normal' ? 'success.dark' : 'error.dark',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        {dialogType === 'normal' ? <CheckCircle /> : <Warning />}
        {dialogType === 'normal' ? 'Mark Transaction as Normal' : 'Mark as High Risk'}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          In a real-world scenario, this action would:
        </Typography>
        {dialogType === 'normal' ? (
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
        ) : (
          <List>
            <ListItem>
              <ListItemIcon>
                <Warning color="error" />
              </ListItemIcon>
              <ListItemText 
                primary="Escalate risk level"
                secondary="Mark as high-risk transaction"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <NotificationsOff color="error" />
              </ListItemIcon>
              <ListItemText 
                primary="Update notification system"
                secondary="Add to action required list"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <HistoryToggleOff color="error" />
              </ListItemIcon>
              <ListItemText 
                primary="Update transaction history"
                secondary="Record risk level change"
              />
            </ListItem>
          </List>
        )}
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
          color={dialogType === 'normal' ? 'success' : 'error'}
          startIcon={dialogType === 'normal' ? <CheckCircle /> : <Warning />}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {mediumRiskTransactions.map((transaction) => (
        <Paper
          key={transaction.transactionId}
          onClick={() => onTransactionSelect(transaction)}
          sx={{
            cursor: 'pointer',
            p: 3,
            borderRadius: 2,
            border: '1px solid #fef3c7',
            backgroundColor: '#fff',
            transition: 'all 0.2s ease',
            mb: 2,
            '&:hover': {
              backgroundColor: '#fefce8',
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
                color: 'warning.main',
                fontWeight: 600
              }}
            >
              {formatAmount(transaction.amount)}
            </Typography>
          </Box>

          <Typography 
            variant="body2" 
            sx={{ 
              color: 'warning.main',
              backgroundColor: '#fef3c7',
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

export default Suspicious; 