import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Chip, Divider, Grid, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { 
  Warning, 
  ArrowBack, 
  AccessTime,
  AccountBalance,
  Category,
  Flag,
  Download,
  Block,
  CheckCircle,
  Email,
  DeviceHub,
  LocationOn,
  Person,
  CheckCircleOutline,
  NotificationsOff,
  SecurityUpdateGood,
  HistoryToggleOff,
  History,
  Description
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import TransactionMap from '../Map/TransactionMap';
import { 
  updateTransactionStatus, 
  fetchCustomerTransactions, 
  fetchFlaggedTransactions,
  fetchCustomerProfile,
  fetchTransactionById
} from '../../services/dynamoDBService';
import WebSocketService from '../../services/websocketService';
import { formatCurrency } from '../../utils/formatters';
import PropTypes from 'prop-types';
import { useMediaQuery } from '@mui/material';

const formatAmount = (amount) => {
  if (!amount) return '$0';
  const amountStr = amount.toString();
  return amountStr.startsWith('$') ? amountStr : `$${amountStr}`;
};

const TransactionDetail = ({ transaction: initialTransaction, onBack, onStatusUpdate, isPhoneScreen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { view } = useParams();
  
  // Move all useState hooks to the top
  const [transaction, setTransaction] = useState(initialTransaction || location.state?.transaction || null);
  const [isLoading, setIsLoading] = useState(!transaction);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]);
  const [dialogType, setDialogType] = useState(null); // 'normal' or 'high'

  // Add safe location check
  const locationInfo = transaction?.location || {};
  const hasLocation = Boolean(locationInfo.lat && locationInfo.lng);

  const isMobileScreen = useMediaQuery('(max-width:430px) and (max-height:932px)');

  // Fetch transaction data if not available
  useEffect(() => {
    const fetchTransactionData = async () => {
      if (!transaction && location.pathname) {
        const transactionId = location.pathname.split('/').pop();
        if (transactionId) {
          try {
            setIsLoading(true);
            const fetchedTransaction = await fetchTransactionById(transactionId);
            if (fetchedTransaction) {
              setTransaction(fetchedTransaction);
            } else {
              console.error('Transaction not found:', transactionId);
              navigate('/action-required');
            }
          } catch (error) {
            console.error('Error fetching transaction:', error);
            navigate('/action-required');
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    fetchTransactionData();
  }, [transaction, location.pathname, navigate]);

  // Fetch customer information
  useEffect(() => {
    const fetchData = async () => {
      if (!transaction?.PK) return;

      const customerId = transaction.PK.split('#')[1];
      try {
        setIsLoading(true);
        const customerData = await fetchCustomerProfile(customerId);
        if (customerData) {
          setCustomerInfo(customerData);
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [transaction?.PK]);

  // WebSocket subscription
  useEffect(() => {
    if (!transaction?.transactionId) return;

    const ws = WebSocketService.getInstance();
    
    const handleUpdate = (data) => {
      if (data.type === 'TRANSACTION_UPDATE' && data.transactionId === transaction.transactionId) {
        // Update transaction data
        fetchTransactionById(transaction.transactionId).then(updatedTransaction => {
          if (updatedTransaction) {
            setTransaction(updatedTransaction);
          }
        });
      }
    };

    ws.subscribe(`transaction-${transaction.transactionId}`, handleUpdate);

    return () => {
      ws.unsubscribe(`transaction-${transaction.transactionId}`);
    };
  }, [transaction?.transactionId]);

  // Fetch all transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!transaction?.PK) return;
      
      const customerId = transaction.PK.split('#')[1];
      try {
        const transactions = await fetchCustomerTransactions(customerId);
        setAllTransactions(transactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };
    
    fetchTransactions();
  }, [transaction?.PK]);

  // Determine if we're viewing from suspicious tab
  const isFromSuspicious = location.pathname.includes('/suspicious/');

  const handleBack = () => {
    // Clear the selected transaction and navigate back
    if (view === 'action-required') {
      navigate('/dashboard/action-required');
    } else if (view === 'suspicious') {
      navigate('/dashboard/suspicious');
    } else {
      navigate('/dashboard');
    }
    
    // Call the onBack prop if provided
    if (onBack) {
      onBack();
    }
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
    navigate(isFromSuspicious ? '/suspicious' : '/action-required', { replace: true });
  };

  const handleFreezeAccount = async () => {
    setIsDialogOpen(true);
  };

  const handleDownload = () => {
    setIsDownloadDialogOpen(true);
  };

  // Separate Download Dialog Component
  const DownloadDialog = () => (
    <Dialog 
      open={isDownloadDialogOpen} 
      onClose={() => setIsDownloadDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        bgcolor: 'info.light', 
        color: 'info.dark',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Download />
        Download Transaction Details
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          In a real-world scenario, this action would:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <Download color="info" />
            </ListItemIcon>
            <ListItemText 
              primary="Generate detailed report"
              secondary="Including all transaction metadata"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <History color="info" />
            </ListItemIcon>
            <ListItemText 
              primary="Include transaction history"
              secondary="All status changes and updates"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Description color="info" />
            </ListItemIcon>
            <ListItemText 
              primary="Export as PDF"
              secondary="Formatted for compliance records"
            />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Button 
          onClick={() => setIsDownloadDialogOpen(false)}
          color="inherit"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Original Confirmation Dialog (for mark as normal/high)
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

  // Action Buttons component
  const ActionButtons = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {isFromSuspicious ? (
        <>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={handleMarkAsNormal}
            fullWidth
          >
            Mark as Normal
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<Warning />}
            onClick={handleMarkAsHighRisk}
            fullWidth
          >
            Mark as High Risk
          </Button>
        </>
      ) : (
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          onClick={handleMarkAsNormal}
          fullWidth
        >
          Mark as Normal
        </Button>
      )}
      
      {/* Download button */}
      <Button
        variant="outlined"
        color="info"
        startIcon={<Download />}
        onClick={handleDownload}
        fullWidth
      >
        Download Details
      </Button>
    </Box>
  );

  // Render loading state
  if (isLoading || isUpdating) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render placeholder if no transaction
  if (!transaction) {
    return null;
  }

  return (
    <Box sx={{ 
      width: '100%',
      maxHeight: '100%',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={handleBack}
        sx={{ mb: 3 }}
      >
        Back to {view === 'action-required' ? 'Action Required' : 'Suspicious'} List
      </Button>

      {/* Show Actions Container first on mobile */}
      {isMobileScreen && (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            backgroundColor: 'white',
            mb: 3
          }}
        >
          <Typography variant="h6" gutterBottom>
            Actions
          </Typography>
          <ActionButtons />
        </Paper>
      )}

      {/* Main content */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: isMobileScreen ? 'column' : 'row',
        gap: 3
      }}>
        {/* Left side content */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            {/* Transaction header and details */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ 
                color: transaction.riskLevel === 'high' ? '#dc2626' : '#eab308',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Warning />
                {transaction.riskLevel === 'high' ? 'High Risk Transaction' : 'Suspicious Transaction'}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccountBalance color="primary" />
                  <Typography variant="subtitle2">Amount</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {formatAmount(transaction.amount)}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Category color="primary" />
                  <Typography variant="subtitle2">Transaction Type</Typography>
                </Box>
                <Typography variant="body1">{transaction.type}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccessTime color="primary" />
                  <Typography variant="subtitle2">Date & Time</Typography>
                </Box>
                <Typography variant="body1">{transaction.date}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ 
              backgroundColor: transaction.riskLevel === 'high' ? '#fee2e2' : '#fef3c7',
              p: 2,
              borderRadius: 2
            }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: transaction.riskLevel === 'high' ? '#dc2626' : '#92400e' }}>
                Risk Factors
              </Typography>
              <Typography variant="body2">
                {transaction.reason}
              </Typography>
            </Box>
          </Paper>

          {/* Location Information */}
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ 
              mb: 2,
              display: 'flex', 
              alignItems: 'center', 
              gap: 1 
            }}>
              <LocationOn color="primary" />
              Location Information
            </Typography>

            {hasLocation ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography>
                    {locationInfo.address || 'Address not available'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Coordinates
                  </Typography>
                  <Typography>
                    {`${locationInfo.lat}, ${locationInfo.lng}`}
                  </Typography>
                </Box>

                <TransactionMap location={locationInfo} />
              </>
            ) : (
              <Box sx={{ 
                p: 3,
                textAlign: 'center', 
                color: 'text.secondary',
                backgroundColor: 'action.hover',
                borderRadius: 1
              }}>
                <LocationOn sx={{ fontSize: 40, mb: 2, opacity: 0.5 }} />
                <Typography>
                  No location information available
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Right side - Actions Container (hide on mobile since it's shown at top) */}
        {!isMobileScreen && (
          <Paper 
            elevation={1} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              backgroundColor: 'white',
              width: '300px'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            <ActionButtons />
          </Paper>
        )}
      </Box>

      <ConfirmationDialog />
      <DownloadDialog />
    </Box>
  );
};

TransactionDetail.propTypes = {
  transaction: PropTypes.object,
  onBack: PropTypes.func,
  onStatusUpdate: PropTypes.func,
  isPhoneScreen: PropTypes.bool
};

export default TransactionDetail; 