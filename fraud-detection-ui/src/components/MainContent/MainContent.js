import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, useTheme, useMediaQuery, IconButton, Button, Typography } from '@mui/material';
import Sidebar from '../Sidebar/Sidebar';
import CustomerList from '../CustomerList/CustomerList';
import CustomerDetailPanel from '../CustomerDetailPanel/CustomerDetailPanel';
import ActionRequired from '../ActionRequired/ActionRequired';
import Suspicious from '../Suspicious/Suspicious';
import TransactionDetail from '../TransactionDetail/TransactionDetail';
import { 
  fetchTransactionById,
  fetchFlaggedTransactions,
  fetchCustomerTransactions
} from '../../services/dynamoDBService';
import Alert from '../Alert/Alert';
import Analysis from '../Analysis/Analysis';
import WebSocketService from '../../services/websocketService';
import { contentContainerStyle, dashboardContainerStyle, listContainerStyle, detailContainerStyle } from '../../styles/sharedStyles';
import { Menu as MenuIcon, ArrowBack, Warning } from '@mui/icons-material';

const MainContent = () => {
  const { view, transactionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery('(max-width:1179px)');
  const is1280Screen = useMediaQuery('(min-width:1180px) and (max-width:1280px)');
  const isPhoneScreen = useMediaQuery('(max-width:600px)');
  const isTabletScreen = useMediaQuery('(max-width:1366px) and (max-height:1024px)');
  const isMobileScreen = useMediaQuery('(max-width:430px) and (max-height:932px)');
  const [state, setState] = useState({
    notificationCounts: {
      actionRequired: 0,
      suspicious: 0
    },
    selectedCustomer: null,
    transactions: [],
    selectedTransaction: null
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerForMobile, setSelectedCustomerForMobile] = useState(null);

  // Update how we determine the current view and customerId
  const isAnalysisView = location.pathname.includes('/analysis/');
  const currentView = isAnalysisView ? 'analysis' : view;
  const analysisCustomerId = location.pathname.match(/\/analysis\/([^/]+)/)?.[1];

  // Find transaction when ID is present in URL
  useEffect(() => {
    if (transactionId) {
      const fetchTransactionDetails = async () => {
        try {
          const transaction = await fetchTransactionById(transactionId);
          setState(prev => ({
            ...prev,
            selectedTransaction: transaction
          }));
        } catch (error) {
          console.error('Error fetching transaction details:', error);
        }
      };

      fetchTransactionDetails();
    }
  }, [transactionId]);

  // Add WebSocket URL logging at the top level
  useEffect(() => {
    console.log('WebSocket URL detected');
  }, []);

  // Improve state management with atomic updates
  const updateNotificationCounts = useCallback(async () => {
    try {
      const [highRisk, mediumRisk] = await Promise.all([
        fetchFlaggedTransactions('high'),
        fetchFlaggedTransactions('medium')
      ]);
      
      setState(prevState => ({
        ...prevState,
        notificationCounts: {
          actionRequired: highRisk.length,
          suspicious: mediumRisk.length
        }
      }));
    } catch (error) {
      // Handle error
    }
  }, []);

  // WebSocket subscription for notifications
  useEffect(() => {
    const ws = WebSocketService.getInstance();
    let isSubscribed = true;

    const handleUpdate = async (data) => {
      if (!isSubscribed) return;

      if (data.type === 'NOTIFICATION_UPDATE' || data.type === 'TRANSACTION_UPDATE') {
        await updateNotificationCounts();
      }
    };

    ws.subscribe('main-content-notifications', handleUpdate);

    // Initial load
    updateNotificationCounts();

    return () => {
      isSubscribed = false;
      ws.unsubscribe('main-content-notifications');
    };
  }, [updateNotificationCounts]);

  // Improve memoization with proper dependencies
  const memoizedValues = useMemo(() => ({
    notificationCounts: state.notificationCounts,
    selectedCustomer: state.selectedCustomer,
    transactions: state.transactions
  }), [
    state.notificationCounts,
    state.selectedCustomer,
    state.transactions
  ]);

  // Use memoized callback for customer selection
  const handleSelectCustomer = useCallback((customer) => {
    setState(prevState => ({
      ...prevState,
      selectedCustomer: customer
    }));
    navigate('/dashboard');
  }, [navigate, setState]);

  const handleViewChange = useCallback((newView) => {
    if (newView === view) return; // Don't navigate if we're already on that view
    
    if (newView === 'analysis' && !analysisCustomerId) {
      return; // Don't navigate to analysis without a customerId
    }
    
    navigate(`/${newView}`);
  }, [view, analysisCustomerId, navigate]);

  const handleBack = () => {
    if (view === 'suspicious') {
      navigate('/suspicious');
    } else if (view === 'action-required') {
      navigate('/action-required');
    } else {
      navigate('/dashboard');
    }
  };

  const handleViewAnalysis = useCallback((customerId) => {
    if (!customerId) {
      console.error('No customer ID provided for analysis view');
      return;
    }
    // Force a hard navigation to the analysis view
    window.location.href = `/analysis/${customerId}`;
  }, []);

  const handleMobileCustomerSelect = (customer) => {
    setSelectedCustomerForMobile(customer);
  };

  const handleMobileCustomerClose = () => {
    setSelectedCustomerForMobile(null);
  };

  const renderMobileView = () => {
    if (selectedCustomerForMobile) {
      return (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#f1f5f9',
          zIndex: 1200,
          overflow: 'auto'
        }}>
          <Box sx={{ p: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={handleMobileCustomerClose}
              sx={{ mb: 2 }}
            >
              Back to Customer List
            </Button>
            <CustomerDetailPanel
              customer={selectedCustomerForMobile}
              onClose={handleMobileCustomerClose}
              onAnalysis={handleViewAnalysis}
            />
          </Box>
        </Box>
      );
    }

    return (
      <CustomerList 
        onSelectCustomer={handleMobileCustomerSelect}
        selectedCustomerId={selectedCustomerForMobile?.customerId}
      />
    );
  };

  const renderView = () => {
    const commonContainerStyles = {
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      backgroundColor: '#f1f5f9',
      overflow: 'auto',  // Allow scrolling if content is too long
      pt: 3  // Add some padding at the top
    };

    const commonContentStyles = {
      width: '90%',
      maxWidth: '1200px',
      backgroundColor: '#f1f5f9'
    };

    // First check if we're viewing a transaction detail
    if (transactionId && state.selectedTransaction) {
      return (
        <Box sx={commonContainerStyles}>
          <Box sx={commonContentStyles}>
            <TransactionDetail 
              transaction={state.selectedTransaction}
              onBack={() => {
                setState(prev => ({
                  ...prev,
                  selectedTransaction: null
                }));
              }}
              view={view}
              onStatusUpdate={updateNotificationCounts}
            />
          </Box>
        </Box>
      );
    }

    switch(view) {
      case 'action-required':
        return (
          <Box sx={{
            ...commonContainerStyles,
            alignItems: 'flex-start'
          }}>
            <Box sx={commonContentStyles}>
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ 
                  color: '#dc2626', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  justifyContent: 'center'
                }}>
                  <Warning />
                  Action Required
                </Typography>
              </Box>
              <ActionRequired 
                onTransactionSelect={(transaction) => {
                  setState(prev => ({
                    ...prev,
                    selectedTransaction: transaction
                  }));
                  navigate(`/dashboard/action-required/${transaction.transactionId}`);
                }}
                onStatusUpdate={updateNotificationCounts}
              />
            </Box>
          </Box>
        );

      case 'suspicious':
        return (
          <Box sx={{
            ...commonContainerStyles,
            alignItems: 'flex-start'
          }}>
            <Box sx={commonContentStyles}>
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ 
                  color: '#f59e0b', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  justifyContent: 'center'
                }}>
                  <Warning />
                  Suspicious Transactions
                </Typography>
              </Box>
              <Suspicious 
                onTransactionSelect={(transaction) => {
                  setState(prev => ({
                    ...prev,
                    selectedTransaction: transaction
                  }));
                  navigate(`/dashboard/suspicious/${transaction.transactionId}`);
                }}
                onStatusUpdate={updateNotificationCounts}
              />
            </Box>
          </Box>
        );

      default:
        return (
          <Box sx={{ 
            display: 'flex',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}>
            <CustomerList 
              onSelectCustomer={(customer) => setSelectedCustomer(customer)}
              selectedCustomerId={selectedCustomer?.customerId}
            />
            <CustomerDetailPanel
              customer={selectedCustomer}
              onClose={() => setSelectedCustomer(null)}
              onAnalysis={handleViewAnalysis}
            />
          </Box>
        );
    }
  };

  useEffect(() => {
    updateNotificationCounts();
  }, []);

  useEffect(() => {
    // Remove these console.logs
    // console.log('Current view:', view);
    // console.log('Current location:', location.pathname);
    // console.log('Selected customer:', memoizedValues.selectedCustomer);
  }, [view, location.pathname, memoizedValues.selectedCustomer]);

  return (
    <Box sx={{ 
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Menu Button - Only show on smaller screens */}
      {isSmallScreen && (
        <Box sx={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          padding: 2,
          backgroundColor: '#fff',
          zIndex: 1200,
          borderBottom: '1px solid rgba(0,0,0,0.1)',
        }}>
          <IconButton
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            sx={{
              backgroundColor: 'secondary.light',
              '&:hover': { backgroundColor: 'secondary.main' },
              display: isSidebarOpen ? 'none' : 'flex'
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      )}

      {/* Sidebar */}
      <Box sx={{
        width: '280px',
        position: is1280Screen ? 'static' : isSmallScreen ? 'fixed' : 'relative',
        left: isSmallScreen ? (isSidebarOpen ? 0 : '-280px') : 'auto',
        height: '100vh',
        transition: 'left 0.3s ease',
        zIndex: 1100,
        backgroundColor: 'secondary.light',
        display: isSmallScreen && !isSidebarOpen ? 'none' : 'block',
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider'
      }}>
        <Sidebar 
          currentView={view}
          onNavigate={(newView) => navigate(`/dashboard/${newView}`)}
          notificationCounts={{ high: state.notificationCounts.actionRequired, medium: state.notificationCounts.suspicious }}
          onClose={() => setIsSidebarOpen(false)}
          isSmallScreen={isSmallScreen}
        />
      </Box>

      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1,
        height: '100vh',
        backgroundColor: '#f1f5f9',
        ml: 0,
        width: is1280Screen ? 'calc(100% - 280px)' : isSmallScreen ? '100%' : 'calc(100% - 280px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {isMobileScreen && !view ? (
          renderMobileView()
        ) : (
          renderView()
        )}
      </Box>

      {/* Overlay for smaller screens */}
      {isSmallScreen && isSidebarOpen && (
        <Box
          onClick={() => setIsSidebarOpen(false)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1050
          }}
        />
      )}

      {/* Full screen transaction detail for phone screens */}
      {isPhoneScreen && state.selectedTransaction && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#fff',
            zIndex: 1300,
            overflow: 'auto',
            p: 2
          }}
        >
          <TransactionDetail
            transaction={state.selectedTransaction}
            onBack={() => setState(prev => ({ ...prev, selectedTransaction: null }))}
            isPhoneScreen={true}
          />
        </Box>
      )}
    </Box>
  );
};

export default MainContent; 