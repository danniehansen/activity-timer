import { getWebsocket } from './settings';
import { getMemberId } from './trello';
import { getAutoTimerListId, hasAutoTimer } from '../utils/auto-timer';
import * as Sentry from '@sentry/vue';

// Connection state enum
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// Constants for reconnection logic
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 10;
const BACKOFF_MULTIPLIER = 2;

// State management
let currentSocket: WebSocket | null = null;
let connectionState: ConnectionState = ConnectionState.DISCONNECTED;
let retryCount = 0;
let retryTimeoutId: number | null = null;
let requestedTimerStart: string | null = null;
let connectionStateListeners: Array<(state: ConnectionState) => void> = [];

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateRetryDelay(): number {
  const exponentialDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, retryCount),
    MAX_RETRY_DELAY
  );
  // Add jitter (±20%) to prevent thundering herd
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Update connection state and notify listeners
 */
function setConnectionState(state: ConnectionState) {
  if (connectionState !== state) {
    connectionState = state;
    console.debug(
      `[ActivityTimer][WebSocket] Connection state changed to: ${state}`
    );
    connectionStateListeners.forEach((listener) => listener(state));
  }
}

/**
 * Clean up existing socket and retry timeout
 */
function cleanupSocket() {
  if (retryTimeoutId !== null) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }

  if (currentSocket) {
    currentSocket.onopen = null;
    currentSocket.onclose = null;
    currentSocket.onerror = null;
    currentSocket.onmessage = null;

    if (
      currentSocket.readyState === WebSocket.OPEN ||
      currentSocket.readyState === WebSocket.CONNECTING
    ) {
      currentSocket.close();
    }

    currentSocket = null;
  }
}

/**
 * Attempt to connect to WebSocket
 */
async function connectWebsocket() {
  const websocketUri = getWebsocket();

  if (!websocketUri) {
    console.debug('[ActivityTimer][WebSocket] URI not configured');
    setConnectionState(ConnectionState.FAILED);
    return;
  }

  // Clean up any existing connection
  cleanupSocket();

  const memberId = await getMemberId();

  setConnectionState(
    retryCount === 0 ? ConnectionState.CONNECTING : ConnectionState.RECONNECTING
  );

  console.debug(
    `[ActivityTimer][WebSocket] Connecting... (attempt ${
      retryCount + 1
    }/${MAX_RETRY_ATTEMPTS})`
  );

  try {
    const socket = new WebSocket(websocketUri);
    currentSocket = socket;

    socket.onopen = () => {
      console.debug('[ActivityTimer][WebSocket] Connection established');
      retryCount = 0; // Reset retry count on successful connection
      setConnectionState(ConnectionState.CONNECTED);

      try {
        socket.send(JSON.stringify({ listen_member_id: memberId }));
      } catch (e) {
        console.debug('[ActivityTimer][WebSocket] Failed to send member ID', e);
        Sentry.captureException(e);
        socket.close();
      }
    };

    socket.onerror = (error) => {
      console.debug('[ActivityTimer][WebSocket] Connection error', error);
      Sentry.captureMessage('WebSocket connection error', {
        level: Sentry.Severity.Warning,
        extra: { retryCount, error }
      });
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type && data.type === 'startTimer' && data.cardId) {
          console.debug(
            `[ActivityTimer][WebSocket] Received startTimer for card: ${data.cardId}`
          );
          requestedTimerStart = data.cardId;
        }
      } catch (e) {
        console.debug('[ActivityTimer][WebSocket] Failed to parse message', e);
      }
    };

    socket.onclose = (event) => {
      console.debug('[ActivityTimer][WebSocket] Connection closed', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });

      // Only attempt reconnection if we haven't exceeded max retries
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        scheduleReconnection();
      } else {
        console.debug(
          '[ActivityTimer][WebSocket] Max retry attempts reached, giving up'
        );
        setConnectionState(ConnectionState.FAILED);
        Sentry.captureMessage('WebSocket connection failed after max retries', {
          level: Sentry.Severity.Error,
          extra: { retryCount, code: event.code, reason: event.reason }
        });
      }
    };
  } catch (e) {
    console.debug('[ActivityTimer][WebSocket] Failed to create socket', e);
    Sentry.captureException(e);

    if (retryCount < MAX_RETRY_ATTEMPTS) {
      scheduleReconnection();
    } else {
      setConnectionState(ConnectionState.FAILED);
    }
  }
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnection() {
  const delay = calculateRetryDelay();
  retryCount++;

  setConnectionState(ConnectionState.RECONNECTING);

  console.debug(
    `[ActivityTimer][WebSocket] Scheduling reconnection in ${delay}ms (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS})`
  );

  retryTimeoutId = window.setTimeout(() => {
    connectWebsocket();
  }, delay);
}

/**
 * Initialize WebSocket connection if auto-timer is enabled
 */
export async function initializeWebsocket() {
  const hasAutoTimerFeature = await hasAutoTimer();
  const autoTimerListId = await getAutoTimerListId();

  if (hasAutoTimerFeature && autoTimerListId) {
    console.debug('[ActivityTimer][WebSocket] Initializing connection');
    connectWebsocket();
  } else {
    console.debug(
      '[ActivityTimer][WebSocket] Auto-timer not enabled, skipping connection'
    );
  }
}

/**
 * Manually disconnect WebSocket
 */
export function disconnectWebsocket() {
  console.debug('[ActivityTimer][WebSocket] Manual disconnect requested');
  retryCount = MAX_RETRY_ATTEMPTS; // Prevent reconnection
  cleanupSocket();
  setConnectionState(ConnectionState.DISCONNECTED);
}

/**
 * Manually reconnect WebSocket (resets retry count)
 */
export async function reconnectWebsocket() {
  console.debug('[ActivityTimer][WebSocket] Manual reconnect requested');
  retryCount = 0;
  await connectWebsocket();
}

/**
 * Get current connection state
 */
export function getConnectionState(): ConnectionState {
  return connectionState;
}

/**
 * Check if connection is active
 */
export function isConnected(): boolean {
  return connectionState === ConnectionState.CONNECTED;
}

/**
 * Subscribe to connection state changes
 */
export function onConnectionStateChange(
  callback: (state: ConnectionState) => void
): () => void {
  connectionStateListeners.push(callback);

  // Return unsubscribe function
  return () => {
    connectionStateListeners = connectionStateListeners.filter(
      (listener) => listener !== callback
    );
  };
}

/**
 * Get requested timer start (from WebSocket message)
 */
export function getRequestedTimerStart() {
  return requestedTimerStart;
}

/**
 * Clear requested timer start
 */
export function clearRequestedTimerStart() {
  requestedTimerStart = null;
}

// Export ConnectionState enum for use in other modules
export { ConnectionState };
