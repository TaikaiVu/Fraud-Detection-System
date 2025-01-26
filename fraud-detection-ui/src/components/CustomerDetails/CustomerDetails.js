import { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import { fetchCustomerProfile, fetchCustomerTransactions } from '../../services/dynamoDBService';
import WebSocketService from '../../services/websocketService';
import { formatCurrency } from '../../utils/formatters';

const CustomerDetails = ({ customer, onViewChange, setSelectedTransaction }) => {
  const [customerData, setCustomerData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!customer?.id) return;

      try {
        setLoading(true);
        const [profile, customerTransactions] = await Promise.all([
          fetchCustomerProfile(customer.id),
          fetchCustomerTransactions(customer.id)
        ]);

        const formattedTransactions = customerTransactions
          .map(transaction => ({
            ...transaction,
            transactionId: transaction.SK.split('#')[1],
            userName: profile.name,
            amount: formatCurrency(transaction.amount),
            dateObj: new Date(transaction.date)
          }))
          .sort((a, b) => b.dateObj - a.dateObj);

        setCustomerData(profile);
        setTransactions(formattedTransactions);
      } catch (err) {
        console.error('Error loading customer data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCustomerData();
  }, [customer?.id]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!customer?.id) return;

    const ws = WebSocketService.getInstance();
    console.log('Subscribing to customer updates:', customer.id);
    
    const handleUpdate = (data) => {
      console.log('CustomerDetails received update:', data);
      
      if (data.type === 'TRANSACTION_UPDATE') {
        const updatedTransaction = data.transaction;
        if (!updatedTransaction) return;

        const transactionCustomerId = updatedTransaction.PK?.split('#')[1];
        if (transactionCustomerId !== customer.id) return;

        setTransactions(prev => {
          const updated = [...prev];
          const newTransaction = {
            ...updatedTransaction,
            transactionId: updatedTransaction.SK.split('#')[1],
            userName: customerData?.name,
            amount: formatCurrency(updatedTransaction.amount),
            dateObj: new Date(updatedTransaction.date)
          };

          const index = updated.findIndex(t => t.SK === updatedTransaction.SK);
          if (index >= 0) {
            updated[index] = newTransaction;
          } else {
            updated.push(newTransaction);
          }

          return updated.sort((a, b) => b.dateObj - a.dateObj);
        });
      }
    };

    ws.subscribe(`customer-${customer.id}`, handleUpdate);

    return () => {
      console.log('Unsubscribing from customer updates:', customer.id);
      ws.unsubscribe(`customer-${customer.id}`);
    };
  }, [customer?.id, customerData?.name]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render your customer details and transactions here
  return (
    <Box sx={{ p: 3 }}>
      {/* Customer Profile */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Customer Profile
        </Typography>
        {customerData && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Name</Typography>
              <Typography>{customerData.name}</Typography>
            </Grid>
            {/* Add more customer details as needed */}
          </Grid>
        )}
      </Paper>

      {/* Transactions List */}
      <Typography variant="h6" gutterBottom>
        Recent Transactions
      </Typography>
      {transactions.map(transaction => (
        <Paper
          key={transaction.transactionId}
          elevation={1}
          sx={{ p: 2, mb: 2, cursor: 'pointer' }}
          onClick={() => setSelectedTransaction(transaction)}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Amount</Typography>
              <Typography>{transaction.amount}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Date</Typography>
              <Typography>{new Date(transaction.date).toLocaleString()}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Status</Typography>
              <Typography color={transaction.riskLevel === 'high' ? 'error' : 'inherit'}>
                {transaction.status}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      ))}
    </Box>
  );
};

export default CustomerDetails; 