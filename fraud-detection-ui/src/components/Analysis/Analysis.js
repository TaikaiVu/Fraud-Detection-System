import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  useMediaQuery
} from '@mui/material';
import { ArrowBack, TrendingUp, LightbulbOutlined, Warning, NavigateBefore, NavigateNext } from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { fetchCustomerTransactions, fetchCustomerProfile, fetchCustomerInsights } from '../../services/dynamoDBService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { DateRangePicker } from '@mui/lab';
import WebSocketService from '../../services/websocketService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const calculateRiskScore = (transactions) => {
  if (!transactions || transactions.length === 0) return 0;

  let totalScore = 0;
  
  // Calculate score based on transaction risk levels
  transactions.forEach(t => {
    switch (t.riskLevel?.toLowerCase()) {
      case 'high':
        totalScore += 20;  
        break;
      case 'medium':
        totalScore += 10;  
        break;
      default:
        break;    
    }
  });

 
  return Math.min(totalScore, 100);
};

const getRiskColor = (score) => {
  if (score >= 80) return '#dc2626'; 
  if (score >= 50) return '#f59e0b'; 
  if (score >= 30) return '#facc15'; 
  return '#22c55e'; 
};

const generateDatePoints = (baseDate, timeRange, count = 5) => {
  const dates = [];
  const startDate = new Date(baseDate);
  
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    switch (timeRange) {
      case 'daily':
        date.setDate(date.getDate() + i);
        break;
      case 'weekly':
        date.setDate(date.getDate() + (i * 7));
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + i);
        break;
    }
    dates.push(date);
  }
  
  return dates;
};

const formatDateForDisplay = (date, timeRange) => {
  switch (timeRange) {
    case 'daily':
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    case 'weekly':
      // Format as "Week of MMM DD, YYYY"
      const weekStart = new Date(date);
      return `Week of ${weekStart.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })}`;
    case 'monthly':
      return date.toLocaleDateString('en-US', { 
        month: 'long',
        year: 'numeric'
      });
    default:
      return date.toLocaleDateString();
  }
};

const Analysis = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [timeRange, setTimeRange] = useState('daily');
  const [dateRange, setDateRange] = useState([null, null]);
  const [currentDateRange, setCurrentDateRange] = useState({
    start: null,
    end: null
  });
  const [datePoints, setDatePoints] = useState([]);
  const [baseDate] = useState(new Date('2025-01-01')); // Set base date
  const [insights, setInsights] = useState([]);
  const isTabletScreen = useMediaQuery(
    '(max-width:1280px) and (max-height:800px), ' +  // Explicitly target 1280x800
    '(max-width:1366px) and (max-height:1024px), ' + 
    '(max-width:1024px) and (max-height:1366px)'
  );
  const isMobileScreen = useMediaQuery('(max-width:430px) and (max-height:932px)');

  useEffect(() => {
    const loadData = async () => {
      if (!customerId) {
        navigate('/dashboard');
        return;
      }

      try {
        setLoading(true);
        
        const [transactionData, customerData, insightData] = await Promise.all([
          fetchCustomerTransactions(customerId),
          fetchCustomerProfile(customerId),
          fetchCustomerInsights(customerId)
        ]);


        if (!Array.isArray(transactionData)) {
          console.error('Transaction data is not an array:', transactionData);
          setTransactions([]);
          return;
        }

        // Process transactions with validation
        const processedTransactions = transactionData
          .filter(t => t !== null && typeof t === 'object')
          .map(t => ({
            ...t,
            date: t.date || new Date().toISOString(),
            amount: typeof t.amount === 'number' ? t.amount.toString() : 
                   typeof t.amount === 'string' ? t.amount : '0',
            riskLevel: t.riskLevel || 'low',
            status: t.status || 'normal',
            type: t.type || 'unknown'
          }));

        setTransactions(processedTransactions);
        setCustomer(customerData);
        setInsights(insightData);

      } catch (error) {
        console.error('Error loading analysis data:', error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [customerId, navigate]);

  // Initialize date points on mount and when time range changes
  useEffect(() => {
    const points = generateDatePoints(baseDate, timeRange);
    setDatePoints(points);
    setCurrentDateRange({
      start: points[0],
      end: points[points.length - 1]
    });
  }, [timeRange, baseDate]);

  const filterTransactionsByTimeRange = (transactions, range) => {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (range) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return transactions;
    }

    return transactions.filter(t => new Date(t.date) >= cutoffDate);
  };

  const handleTimeNavigation = (direction) => {
    const step = direction === 'next' ? 1 : -1;

    const newPoints = datePoints.map(date => {
      const newDate = new Date(date);
      switch (timeRange) {
        case 'daily':
          newDate.setDate(newDate.getDate() + (step * 5)); // Move 5 days at a time
          break;
        case 'weekly':
          newDate.setDate(newDate.getDate() + (step * 7 * 5)); // Move 5 weeks at a time
          break;
        case 'monthly':
          newDate.setMonth(newDate.getMonth() + (step * 5)); // Move 5 months at a time
          break;
      }
      return newDate;
    });

    setDatePoints(newPoints);
    setCurrentDateRange({
      start: newPoints[0],
      end: newPoints[newPoints.length - 1]
    });
  };

  const prepareChartData = () => {
    if (!Array.isArray(transactions) || transactions.length === 0 || !datePoints.length) return null;

    try {
      let accumulatedScore = 0; // Track accumulated score
      const dataPoints = datePoints.map((date, index) => {
        const dateStr = formatDateForDisplay(date, timeRange);
        
        // Get all transactions up to this date point
        const relevantTransactions = transactions.filter(t => {
          if (!t.date) return false;
          
          const transactionDate = new Date(t.date);
          const currentDate = new Date(date);
          
          // Include all transactions up to current date
          return transactionDate <= currentDate;
        });

        // Calculate accumulated risk score
        accumulatedScore = calculateRiskScore(relevantTransactions);

        return {
          date: dateStr,
          riskScore: accumulatedScore
        };
      });

      dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));

      return {
        labels: dataPoints.map(point => point.date),
        datasets: [{
          label: 'Accumulated Risk Score',
          data: dataPoints.map(point => point.riskScore),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: dataPoints.map(point => getRiskColor(point.riskScore)),
          pointBorderColor: dataPoints.map(point => getRiskColor(point.riskScore))
        }]
      };
    } catch (error) {
      console.error('Error preparing chart data:', error);
      return null;
    }
  };

  // Calculate risk score for a single transaction
  const calculateTransactionRiskScore = (transaction) => {
    let score = 0;
    
    // Base risk level score
    switch (transaction.riskLevel?.toLowerCase()) {
      case 'high':
        score += 70;
        break;
      case 'medium':
        score += 40;
        break;
      default:
        score += 10;
    }

    // Additional risk factors
    if (transaction.status?.toLowerCase() === 'flagged') {
      score += 20;
    }

    // Amount-based risk
    const amount = parseFloat(transaction.amount.replace(/[^0-9.-]+/g, ''));
    if (amount > 10000) score += 10;
    if (amount > 50000) score += 10;
    if (amount > 100000) score += 10;

    // Ensure score doesn't exceed 100
    return Math.min(score, 100);
  };

  // Add WebSocket subscription
  useEffect(() => {
    if (!customerId) return;

    const ws = WebSocketService.getInstance();
    
    const handleUpdate = (data) => {
      if (data.type === 'TRANSACTION_UPDATE' && data.customerId === customerId) {
        // Refresh transactions
        fetchCustomerTransactions(customerId).then(newTransactions => {
          setTransactions(newTransactions);
        });
      }
    };

    ws.subscribe(`analysis-${customerId}`, handleUpdate);

    return () => {
      ws.unsubscribe(`analysis-${customerId}`);
    };
  }, [customerId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const chartData = prepareChartData();

  const riskScore = calculateRiskScore(transactions);
  const flaggedTransactions = transactions.filter(t => t.riskLevel === 'high');

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Accumulated Risk Score'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const score = context.raw;
            return `Accumulated Risk Score: ${score} (${score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low'} Risk)`;
          }
        }
      }
    }
  };

  return (
    <Box sx={{ 
      flex: 1,
      display: 'flex',
      flexDirection: {
        xs: 'column',
        lg: 'row'
      },
      overflow: {
        xs: 'auto',
        lg: 'hidden'
      },
      gap: 4,
      p: 3,
      '@media (max-width: 1279px)': {
        width: '95%',
        margin: '0 auto',
        minWidth: 'auto'
      }
    }}>
      {/* Back button - ensure visibility for 1280x800 */}
      {isTabletScreen && (
        <Box sx={{ 
          width: '100%',
          mb: 2,
          position: 'sticky',
          top: 0,
          zIndex: 1200,  // Increased z-index
          backgroundColor: '#f1f5f9',
          pb: 2
        }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
      )}

      {/* Right side panels - Move to top for small screens */}
      <Box sx={{ 
        width: {
          xs: '100%',
          lg: '320px'
        },
        order: {
          xs: 1,
          lg: 2
        },
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        flexShrink: 0,
        '@media (max-width: 1279px)': {
          flexDirection: isMobileScreen ? 'column' : 'row',
          width: '100%',
          position: 'static',
          '& > *': {
            flex: 1,
            maxWidth: isMobileScreen ? '100%' : '48%'
          }
        }
      }}>
        {/* Risk Assessment */}
        <Paper elevation={0} sx={{ 
          p: 3,
          backgroundColor: '#f8faff',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'rgba(66, 153, 225, 0.1)',
          backdropFilter: 'blur(8px)',
          background: 'linear-gradient(145deg, #f8faff 0%, #ffffff 100%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          order: isMobileScreen ? 1 : 'unset'
        }}>
          <Typography variant="h6" gutterBottom sx={{ 
            fontSize: '1rem',
            color: '#1a237e',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <Warning fontSize="small" sx={{ color: '#3949ab' }} />
            Risk Assessment
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Risk Score
                </Typography>
                <Typography variant="h4" color={getRiskColor(riskScore)}>
                  {Math.min(riskScore, 100)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Flagged
                </Typography>
                <Typography variant="h4" color="error.main">
                  {flaggedTransactions.length}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Insights Panel */}
        <Paper elevation={0} sx={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '12px',
          border: '1px solid rgba(66, 153, 225, 0.1)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          background: 'linear-gradient(145deg, #f8faff 0%, #ffffff 100%)',
          order: isMobileScreen ? 2 : 'unset'
        }}>
          <Box sx={{ p: 3, position: 'relative' }}>
            <Typography variant="h6" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: '1rem',
              color: '#1a237e',
              fontWeight: 600
            }}>
              <LightbulbOutlined fontSize="small" sx={{ color: '#3949ab' }} />
              Insights
            </Typography>

            {insights.length > 0 ? (
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'rgba(66, 153, 225, 0.03)',
                borderRadius: '8px',
                border: '1px dashed rgba(66, 153, 225, 0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(66, 153, 225, 0.05)',
                  borderColor: 'rgba(66, 153, 225, 0.15)'
                }
              }}>
                {insights.map((insight, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      p: 2, 
                      mb: index < insights.length - 1 ? 2 : 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      borderRadius: '8px',
                      border: '1px dashed rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <Typography variant="body2" sx={{ 
                      mb: 1,
                      fontSize: '0.875rem'
                    }}>
                      {insight.description}
                    </Typography>
                    {insight.value && (
                      <Typography variant="body2" color="text.secondary" sx={{
                        fontSize: '0.875rem'
                      }}>
                        Value: {insight.value}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ 
                p: 2, 
                textAlign: 'center',
                color: 'text.secondary'
              }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  No insights available for this customer
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Main content - Graph */}
      <Box sx={{ 
        flex: 1,
        minWidth: 0,
        backgroundColor: 'white',
        borderRadius: '16px',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        order: {
          xs: isMobileScreen ? 3 : 2,
          lg: 1
        },
        '@media (max-width: 1279px)': {
          width: '100%',
          minWidth: 'auto',
          maxWidth: '100%',
          margin: '0 auto',
          '& > *': {
            width: '100%'
          },
          '& .MuiTypography-h5': {
            fontSize: '1.1rem'
          },
          '& .MuiTypography-body1': {
            fontSize: '0.9rem'
          },
          '& .MuiButton-root': {
            fontSize: '0.85rem'
          }
        }
      }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 3,
          position: 'relative',
          px: 3,
          py: 2,
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
        }}>
          <Typography 
            variant="h5" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              margin: '0 auto',
              color: '#1a237e',
              fontWeight: 600
            }}
          >
            <TrendingUp sx={{ color: '#3949ab' }} />
            Transaction Analysis
          </Typography>
        </Box>

        {/* Time Range Filter */}
        <Box sx={{ 
          mb: 3,
          p: 2,
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(66, 153, 225, 0.08)'
        }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl 
                fullWidth 
                size="small"
                sx={{
                  '@media (max-width: 430px)': {
                    maxWidth: '200px',
                    margin: '0 auto'
                  }
                }}
              >
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  label="Time Range"
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mb: 2,
          px: 3,
          '@media (max-width: 430px)': {
            px: 1,
            '& .MuiButton-root': {
              minWidth: 'unset',
              px: 1,
              fontSize: '0.75rem'
            }
          }
        }}>
          <Button
            variant="outlined"
            onClick={() => handleTimeNavigation('prev')}
            startIcon={<NavigateBefore />}
            sx={{
              '@media (max-width: 430px)': {
                '& .MuiButton-startIcon': {
                  margin: 0
                }
              }
            }}
          >
            {isMobileScreen ? 'Prev' : `Previous ${timeRange}`}
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleTimeNavigation('next')}
            endIcon={<NavigateNext />}
            sx={{ 
              mr: 1,
              '@media (max-width: 430px)': {
                '& .MuiButton-endIcon': {
                  margin: 0
                }
              }
            }}
          >
            {isMobileScreen ? 'Next' : `Next ${timeRange}`}
          </Button>
        </Box>

        {/* Graph Container */}
        <Paper sx={{ 
          p: 2,  // Reduced padding
          height: '350px',  // Slightly reduced height
          '@media (max-width: 1279px)': {
            width: '100%',
            '& canvas': {
              width: '100% !important',
              height: '100% !important'
            }
          }
        }}>
          {chartData ? (
            <Line
              data={chartData}
              options={{
                ...chartOptions,
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                  ...chartOptions.scales,
                  x: {
                    ...chartOptions.scales.x,
                    ticks: {
                      font: {
                        size: 10  // Smaller axis labels
                      }
                    }
                  },
                  y: {
                    ...chartOptions.scales.y,
                    ticks: {
                      font: {
                        size: 10  // Smaller axis labels
                      }
                    }
                  }
                },
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    ...chartOptions.plugins.legend,
                    labels: {
                      font: {
                        size: 11  // Smaller legend font
                      }
                    }
                  }
                }
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default Analysis; 