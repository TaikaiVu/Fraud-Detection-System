import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import WebSocketService from "../services/websocketService";

const client = new DynamoDBClient({
  region: 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: `https://dynamodb.ap-southeast-2.amazonaws.com`,
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true,
  },
});

const logAndThrowError = (error, operation) => {
  console.error(`Error during ${operation}:`, error);
  console.log('Current AWS Config:', {
    region: 'ap-southeast-2',
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || 'Not loaded',
    hasSecretKey: !!process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  });
  throw error;
};

export const fetchCustomerProfile = async (customerId) => {
  
  // First, let's try to get the customer profile
  const params = {
    TableName: 'CustomersTransactions',
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `CUSTOMER#${customerId}`,
      ':sk': 'PROFILE'  // Make sure we're querying for PROFILE
    }
  };

  try {
    const command = new QueryCommand(params);
    const result = await docClient.send(command);
    if (result.Items && result.Items.length > 0) {
      const customer = result.Items[0];
      
      // Make sure we're accessing the correct attributes
      const customerProfile = {
        name: customer.name,
        email: customer.email,
        deviceInfo: customer.deviceInfo,
        id: customerId,
        address: customer.address
      };
      
      return customerProfile;
    } else {
      // If we don't find the profile, let's log what we're looking for
      console.log('No profile found for customer:', customerId);
      console.log('Query params used:', params);
      return null;
    }
  } catch (error) {
    console.error('Error in fetchCustomerProfile:', error);
    return logAndThrowError(error, 'fetchCustomerProfile');
  }
};

export const fetchCustomerTransactions = async (customerId) => {
  if (!customerId) {
    throw new Error('No customer ID provided');
  }

  const params = {
    TableName: 'CustomersTransactions',
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `CUSTOMER#${customerId}`,
      ':sk': 'TRANSACTION#'
    }
  };

  try {
    const command = new QueryCommand(params);
    const result = await docClient.send(command);
    
    // Process all transactions, not just flagged ones
    return result.Items?.map(item => ({
      ...item,
      transactionId: item.SK.split('#')[1],
      date: item.date || new Date().toISOString(),
      amount: item.amount?.toString() || '0',
      riskLevel: item.riskLevel || 'low',
      status: item.status || 'normal'
    })) || [];
  } catch (error) {
    throw error;
  }
};

export const fetchAllCustomers = async () => {
  const params = {
    TableName: 'CustomersTransactions',
    FilterExpression: 'SK = :sk',
    ExpressionAttributeValues: {
      ':sk': 'PROFILE'
    }
  };

  try {
    const command = new ScanCommand(params);
    const result = await docClient.send(command);
    return result.Items;
  } catch (error) {
    return logAndThrowError(error, 'fetchAllCustomers');
  }
};

export const fetchFlaggedTransactions = async (riskLevel) => {
  const params = {
    TableName: 'CustomersTransactions',
    FilterExpression: 'riskLevel = :riskLevel',
    ExpressionAttributeValues: {
      ':riskLevel': riskLevel
    }
  };

  try {
    const command = new ScanCommand(params);
    const result = await docClient.send(command);
    
    // Process transactions and fetch customer names
    const processedTransactions = await Promise.all(result.Items.map(async (transaction) => {
      const customerId = transaction.PK.split('#')[1];
      const customerProfile = await fetchCustomerProfile(customerId);
      
      return {
        ...transaction,
        transactionId: transaction.SK.split('#')[1],
        userName: customerProfile?.name || 'Unknown User',
        customerId: customerId
      };
    }));

    return processedTransactions;
  } catch (error) {
    console.error('Error in fetchFlaggedTransactions:', error);
    throw error;
  }
};

export const fetchTransactionById = async (transactionId) => {
  if (!transactionId) {
    console.error('No transaction ID provided');
    return null;
  }


  // Extract customer ID from transaction ID (e.g., "T-1001-052" -> "1001")
  const customerId = transactionId.split('-')[1];
  
  if (!customerId) {
    console.error('Could not extract customer ID from:', transactionId);
    return null;
  }

  // First try with a scan to see what's in the database
  const scanParams = {
    TableName: 'CustomersTransactions',
    FilterExpression: 'contains(SK, :tid)',
    ExpressionAttributeValues: {
      ':tid': transactionId
    }
  };

  try {
    // First, scan to find the exact format
    const scanCommand = new ScanCommand(scanParams);
    const scanResult = await docClient.send(scanCommand);

    if (scanResult.Items && scanResult.Items.length > 0) {
      // Found the transaction, now we know the exact format
      const transaction = scanResult.Items[0];

      // Get customer name
      const customerProfile = await fetchCustomerProfile(customerId);
      
      return {
        ...transaction,
        transactionId: transactionId,
        userName: customerProfile?.name || 'Unknown User',
        customerId: customerId
      };
    }

    // If scan didn't work, try the exact query
    const queryParams = {
      TableName: 'CustomersTransactions',
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `CUSTOMER#${customerId}`,
        ':sk': `TRANSACTION#${transactionId}`
      }
    };

    console.log('Querying with params:', queryParams);
    const queryCommand = new QueryCommand(queryParams);
    const queryResult = await docClient.send(queryCommand);
    console.log('Query result:', queryResult);

    if (queryResult.Items && queryResult.Items[0]) {
      const customerProfile = await fetchCustomerProfile(customerId);
      return {
        ...queryResult.Items[0],
        transactionId: transactionId,
        userName: customerProfile?.name || 'Unknown User',
        customerId: customerId
      };
    }
    
    console.error('Transaction not found with any method. Scan and Query failed.');
    return null;
  } catch (error) {
    console.error('Error in fetchTransactionById:', error);
    return logAndThrowError(error, 'fetchTransactionById');
  }
};

export const updateTransactionStatus = async (transactionId) => {
  if (!transactionId) {
    throw new Error('No transaction ID provided');
  }

  const customerId = transactionId.split('-')[1];
  
  try {
    // First, let's try to find the exact transaction
    const queryParams = {
      TableName: 'CustomersTransactions',
      KeyConditionExpression: 'PK = :pk AND SK = :sk',  // Changed to exact match
      ExpressionAttributeValues: {
        ':pk': `CUSTOMER#${customerId}`,
        ':sk': `TRANSACTION#${transactionId}`
      }
    };

    console.log('Querying for transaction:', queryParams);
    const queryCommand = new QueryCommand(queryParams);
    const queryResult = await docClient.send(queryCommand);
    console.log('Query result:', queryResult);

    // If exact match fails, try a scan to see what's in the database
    if (!queryResult.Items || queryResult.Items.length === 0) {
      console.log('Transaction not found with exact match, trying scan...');
      const scanParams = {
        TableName: 'CustomersTransactions',
        FilterExpression: 'contains(SK, :tid)',
        ExpressionAttributeValues: {
          ':tid': transactionId
        }
      };

      const scanCommand = new ScanCommand(scanParams);
      const scanResult = await docClient.send(scanCommand);
      console.log('Scan result:', scanResult);

      if (!scanResult.Items || scanResult.Items.length === 0) {
        throw new Error(`Transaction not found for ID: ${transactionId}`);
      }

      // Use the first matching item from scan
      const transaction = scanResult.Items[0];
      console.log('Found transaction via scan:', transaction);

      // Now update using the found keys
      const updateParams = {
        TableName: 'CustomersTransactions',
        Key: {
          PK: transaction.PK,
          SK: transaction.SK
        },
        UpdateExpression: 'SET riskLevel = :riskLevel, #st = :status',
        ExpressionAttributeNames: {
          '#st': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'unflagged',
          ':riskLevel': 'normal'
        },
        ReturnValues: 'ALL_NEW'
      };

      console.log('Updating transaction:', updateParams);
      const command = new UpdateCommand(updateParams);
      const result = await docClient.send(command);
      console.log('Update successful:', result);

      // Notify WebSocket after successful update
      const ws = WebSocketService.getInstance();
      ws.sendMessage({
        type: 'TRANSACTION_UPDATE',
        data: {
          transactionId,
          status: 'unflagged',
          riskLevel: 'normal'
        }
      });

      return result.Attributes;
    }

    // If we found it with the exact match, update it
    const transaction = queryResult.Items[0];
    const updateParams = {
      TableName: 'CustomersTransactions',
      Key: {
        PK: transaction.PK,
        SK: transaction.SK
      },
      UpdateExpression: 'SET riskLevel = :riskLevel, #st = :status',
      ExpressionAttributeNames: {
        '#st': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'unflagged',
        ':riskLevel': 'normal'
      },
      ReturnValues: 'ALL_NEW'
    };

    console.log('Updating transaction:', updateParams);
    const command = new UpdateCommand(updateParams);
    const result = await docClient.send(command);
    console.log('Update successful:', result);

    // Notify WebSocket after successful update
    const ws = WebSocketService.getInstance();
    ws.sendMessage({
      type: 'TRANSACTION_UPDATE',
      data: {
        transactionId,
        status: 'unflagged',
        riskLevel: 'normal'
      }
    });

    return result.Attributes;

  } catch (error) {
    console.error('DynamoDB update error:', error);
    throw error;
  }
};

export const fetchCustomerInsights = async (customerId) => {
  if (!customerId) {
    throw new Error('No customer ID provided');
  }

  const params = {
    TableName: 'CustomersTransactions',
    Key: {
      PK: `CUSTOMER#${customerId}`,
      SK: 'PROFILE'
    }
  };

  try {
    const command = new GetCommand(params);
    const result = await docClient.send(command);
    
    // Extract insight from profile
    const insight = result.Item?.insight || null;
    
    // Return in the format expected by the Analysis component
    return insight ? [{
      description: insight,
      type: 'risk_assessment'
    }] : [];
  } catch (error) {
    throw error;
  }
}; 