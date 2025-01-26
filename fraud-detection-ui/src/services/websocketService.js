class WebSocketService {
  static instance = null;
  callbacks = new Map();

  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        // Validate the data format before processing
        if (this.isValidTransactionUpdate(data)) {
          // Notify all subscribers in a batch
          Promise.all(
            Array.from(this.callbacks.values())
              .map(callback => Promise.resolve(callback(data)))
          ).catch(error => {
            console.error('Error processing WebSocket callbacks:', error);
          });
        } else {
          console.error('Invalid transaction update format:', data);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      this.isConnected = false;
    };
  }

  // Add data validation
  isValidTransactionUpdate(data) {
    return (
      data &&
      data.type === 'TRANSACTION_UPDATE' &&
      data.data &&
      data.data.transactionId &&
      data.data.status &&
      data.data.riskLevel
    );
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 3000);
    }
  }

  subscribe(id, callback) {
    this.callbacks.set(id, callback);
    if (!this.isConnected) {
      this.connect();
    }
  }

  unsubscribe(id) {
    this.callbacks.delete(id);
  }

  sendMessage(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export default WebSocketService;
  