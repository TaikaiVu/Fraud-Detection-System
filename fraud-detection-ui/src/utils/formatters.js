/**
 * Formats a number or string as currency with $ symbol
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  // Handle null, undefined or empty string
  if (!amount) return '$0.00';

  try {
    // Convert to string if it's a number
    const amountStr = typeof amount === 'number' ? amount.toString() : amount;

    // Remove any existing $ and commas
    const number = parseFloat(amountStr.replace(/[$,]/g, ''));
    
    // Handle invalid numbers
    if (isNaN(number)) return '$0.00';

    // Format with $ and commas
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '$0.00';
  }
};

/**
 * Formats a date string to a more readable format
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
};

/**
 * Formats a risk level to be more readable
 * @param {string} riskLevel - Risk level (high, medium, low)
 * @returns {string} Formatted risk level
 */
export const formatRiskLevel = (riskLevel) => {
  if (!riskLevel) return 'Unknown';
  
  const formatted = riskLevel.toLowerCase();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

/**
 * Formats a transaction status to be more readable
 * @param {string} status - Transaction status
 * @returns {string} Formatted status
 */
export const formatStatus = (status) => {
  if (!status) return 'Unknown';
  
  const formatted = status.toLowerCase();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

/**
 * Formats a transaction type to be more readable
 * @param {string} type - Transaction type
 * @returns {string} Formatted transaction type
 */
export const formatTransactionType = (type) => {
  if (!type) return '';
  
  // Convert snake_case or camelCase to Title Case
  return type
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
    .trim();
}; 