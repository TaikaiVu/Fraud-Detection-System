import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  Avatar,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Chip,
  useMediaQuery
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { fetchAllCustomers } from '../../services/dynamoDBService';
import { Warning } from '@mui/icons-material';

const CustomerList = ({ onSelectCustomer, selectedCustomerId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isSmallScreen = useMediaQuery('(max-width:1179px)');
  const is1280Screen = useMediaQuery('(min-width:1180px) and (max-width:1280px)');

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        const data = await fetchAllCustomers();
        const formattedCustomers = data.map(customer => ({
          id: customer.PK.split('#')[1],
          name: customer.name,
          email: customer.email,
          deviceInfo: customer.deviceInfo,
          address: customer.address,
          ordersCount: customer.ordersCount
        }));
        setCustomers(formattedCustomers);
      } catch (err) {
        console.error('Error loading customers:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase().trim();
    return customers.filter(customer => {
      return (
        customer.name?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.id?.toString().includes(query)
      );
    });
  }, [searchQuery, customers]);

  const handleCustomerClick = (customer) => {
    if (typeof onSelectCustomer !== 'function') {
      console.error('onSelectCustomer is not a function:', onSelectCustomer);
      return;
    }
    onSelectCustomer(customer);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: 'calc(100vh - 80px)',  // Match the container height
          p: 3 
        }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 4 }}>
          <Alert severity="error">Error loading customers: {error}</Alert>
        </Box>
      );
    }

    if (customers.length === 0) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: 'calc(100vh - 80px)',  // Match the container height
          p: 3 
        }}>
          <Typography color="text.secondary">
            No customers found
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ 
        width: is1280Screen ? '380px' : isSmallScreen ? '80%' : '380px',
        height: '100%',
        borderRight: isSmallScreen ? 'none' : '1px solid',
        borderColor: 'divider',
        backgroundColor: 'white',
        p: 3,
        margin: isSmallScreen ? '0 auto' : '0',
        position: 'relative',
        '@media (max-width: 600px)': {
          width: '95%'
        },
        '@media (max-width: 430px)': {
          width: '85%',  // Make width shorter
          ml: 2,        // Move slightly to the left
          mr: 'auto'    // Keep right margin auto to maintain left alignment
        }
      }}>
        {/* Search Box */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Customer List */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          height: 'calc(100% - 48px)',
          overflowY: 'auto'
        }}>
          {filteredCustomers.map((customer) => (
            <Paper
              key={customer.id}
              elevation={0}
              onClick={() => handleCustomerClick(customer)}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderRadius: 2,
                border: '1px solid',
                borderColor: selectedCustomerId === customer.id ? 'primary.main' : 'divider',
                backgroundColor: selectedCustomerId === customer.id ? 'primary.lighter' : 'white',
                '&:hover': {
                  backgroundColor: selectedCustomerId === customer.id ? 'primary.lighter' : 'rgba(0, 0, 0, 0.02)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar>{customer.name[0]}</Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{customer.name}</Typography>
                  <Typography variant="body2" color="text.secondary">ID: {customer.id}</Typography>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    );
  };

  return renderContent();
};

CustomerList.propTypes = {
  onSelectCustomer: PropTypes.func.isRequired,
  selectedCustomerId: PropTypes.string
};

export default CustomerList; 