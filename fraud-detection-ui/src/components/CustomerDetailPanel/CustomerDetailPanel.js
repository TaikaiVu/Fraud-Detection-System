import { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Chip,
  CircularProgress,
  Button
} from '@mui/material';
import { 
  Person, 
  Email, 
  LocationOn, 
  Warning,
  Flag,
  Analytics,
  TrendingUp
} from '@mui/icons-material';
import { fetchCustomerTransactions } from '../../services/dynamoDBService';
import { useNavigate } from 'react-router-dom';
import WebSocketService from '../../services/websocketService';
import PropTypes from 'prop-types';

const sortTransactionsByDate = (transactions) => {
  return [...transactions].sort((a, b) => {
    const timeA = a.date;
    const timeB = b.date;
    return timeB.localeCompare(timeA);
  });
};

const CustomerDetailPanel = ({ customer, onClose, onAnalysis }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadTransactions = async () => {
    if (!customer?.id) return;
    
    try {
      setLoading(true);
      const data = await fetchCustomerTransactions(customer.id);
      
      const formattedTransactions = data.map(transaction => ({
        ...transaction,
        date: transaction.date || new Date().toISOString()
      }));
      
      const sortedTransactions = sortTransactionsByDate(formattedTransactions);
      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [customer?.id]);

  useEffect(() => {
    if (!customer?.id) return;

    const ws = WebSocketService.getInstance();
    let isSubscribed = true; // For cleanup
    
    const handleUpdate = async (data) => {
      console.log('CustomerDetailPanel received WebSocket update:', data);
      
      if (!isSubscribed) return;
      
      if (data.type === 'TRANSACTION_UPDATE' && 
          (data.customerId === customer.id || data.PK?.includes(customer.id))) {
        try {
          setLoading(true);
          const newData = await fetchCustomerTransactions(customer.id);
          
          if (!isSubscribed) return;

          const formattedTransactions = newData.map(transaction => ({
            ...transaction,
            date: transaction.date || new Date().toISOString()
          }));
          
          const sortedTransactions = sortTransactionsByDate(formattedTransactions);
          setTransactions(sortedTransactions);
        } catch (error) {
          console.error('Error updating transactions:', error);
        } finally {
          if (isSubscribed) {
            setLoading(false);
          }
        }
      }
    };

    ws.subscribe(`customer-${customer.id}`, handleUpdate);
    
    // Cleanup function
    return () => {
      isSubscribed = false;
      ws.unsubscribe(`customer-${customer.id}`);
    };
  }, [customer?.id]);

  // Display the date in a more readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!customer) {
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 'calc(100vh - 80px)',  // Match the container height
      }}>
        <CircularProgress />
      </Box>
    );
  }

  const flaggedTransactions = sortTransactionsByDate(
    transactions.filter(t => t.riskLevel === 'high')
  );

  const calculateRiskScore = (transactions) => {
    const baseScore = 0;
    const highRiskWeight = 30;
    const mediumRiskWeight = 15;

    return transactions.reduce((score, t) => {
      if (t.riskLevel === 'high') {
        return score + highRiskWeight;
      }
      if (t.riskLevel === 'medium') {
        return score + mediumRiskWeight;
      }
      return score;
    }, baseScore);
  };

  const riskScore = calculateRiskScore(transactions);

  const getRiskColor = (score) => {
    const numScore = parseInt(score);
    if (numScore >= 70) return 'error.main';
    if (numScore >= 40) return 'warning.main';
    return 'success.main';
  };

  const handleViewDetail = (transaction) => {
    // Navigate to the appropriate transaction detail view based on risk level
    if (transaction.riskLevel === 'high') {
      navigate(`/dashboard/action-required/${transaction.transactionId || transaction.id}`);
    } else if (transaction.riskLevel === 'medium') {
      navigate(`/dashboard/suspicious/${transaction.transactionId || transaction.id}`);
    }
  };

  return (
    <Box sx={{ 
      p: 3, 
      height: '100%', 
      overflowY: 'auto',
      backgroundColor: 'white',
      color: 'text.primary'
    }}>
      <Grid container spacing={4}>
        {/* Top Row - Split into two equal columns */}
        <Grid item xs={12} md={6}>
          {/* Customer Information */}
          <Paper elevation={2} sx={{ 
            p: 3,
            height: '200px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              background: 'linear-gradient(to bottom, #3b82f6, #1d4ed8)'
            }
          }}>
            <Typography variant="h6" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              color: '#1e293b'
            }}>
              <Person color="primary" />
              Customer Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                <Typography>{customer.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography>{customer.email}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                <Typography>{customer.address}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          {/* Flagged Transactions */}
          <Paper elevation={2} sx={{ 
            p: 3,
            height: '200px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              background: 'linear-gradient(to bottom, #f97316, #c2410c)'
            }
          }}>
            <Typography variant="h6" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1 
            }}>
              <Warning color="error" />
              Flagged Transactions
            </Typography>
            {flaggedTransactions.length > 0 ? (
              <Box sx={{ maxHeight: '120px', overflowY: 'auto' }}>
                {flaggedTransactions.map((transaction, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 1.5,
                      mb: 1,
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        borderColor: '#d1d5db'
                      }
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 600,
                      minWidth: '80px',
                      flexShrink: 0
                    }}>
                      ${transaction.amount}
                    </Typography>
                    <Button
                      variant="outlined"
                      color={transaction.riskLevel === 'high' ? 'error' : 'warning'}
                      size="small"
                      onClick={() => handleViewDetail(transaction)}
                      sx={{ 
                        minWidth: '90px',
                        height: '30px',
                        fontSize: '0.75rem',
                        p: '4px 8px',
                        flexShrink: 0
                      }}
                    >
                      View Detail
                    </Button>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '120px'
              }}>
                <Typography color="text.secondary">No flagged transactions found</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Box sx={{ width: '100%', height: '2rem' }} />

        {/* Transaction List */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ 
            p: 3,
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              background: 'linear-gradient(to bottom, #64748b, #475569)'
            }
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2 
            }}>
              <Typography variant="h6" sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#1e293b',
                letterSpacing: '0.025em'
              }}>
                <Flag color="primary" />
                Recent Transactions
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  console.log('Navigating to analysis for customer:', customer.id);
                  onAnalysis(customer.id);
                }}
                startIcon={<TrendingUp />}
                size="small"
              >
                View Analysis
              </Button>
            </Box>
            <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
              {sortTransactionsByDate(transactions).map((transaction, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      borderColor: '#d1d5db'
                    }
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Amount
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        ${transaction.amount}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Date
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(transaction.date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Status
                      </Typography>
                      <Chip
                        size="small"
                        label={transaction.status?.toUpperCase()}
                        color={transaction.status === 'flagged' ? 'error' : 'default'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Risk Level
                      </Typography>
                      <Chip
                        size="small"
                        label={transaction.riskLevel?.toUpperCase()}
                        color={
                          transaction.riskLevel === 'high' ? 'error' : 
                          transaction.riskLevel === 'medium' ? 'warning' : 
                          'success'
                        }
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

CustomerDetailPanel.propTypes = {
  customer: PropTypes.object,
  onClose: PropTypes.func,
  onAnalysis: PropTypes.func
};

export default CustomerDetailPanel; 