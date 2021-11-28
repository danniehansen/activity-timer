import { getWebsocket } from './settings';
import { getMemberId } from './trello';
import { getAutoTimerListId, hasAutoTimer } from '../utils/auto-timer';

let lastWebsocketConnection: number | null = null;
let requestedTimerStart: string | null = null;

async function initiateWebsocket () {
  const websocketUri = getWebsocket();

  if (!websocketUri) {
    throw new Error('Websocket environment variable unavailable');
  }

  const memberId = await getMemberId();

  // Security measures to avoid spamming new connections
  if (lastWebsocketConnection !== null && Math.abs(new Date().getTime() - lastWebsocketConnection) < 5000) {
    // TODO: Investigate other ways of showing an alert. Doesn't look like .alert() is available through the capability initializer.
    /* getTrelloCard().alert({
      message: 'Attempted to establish too many connections. Auto-timer will be de-activated for this session.',
      duration: 6
    }); */

    return;
  }

  lastWebsocketConnection = new Date().getTime();

  const socket = new WebSocket(websocketUri);

  socket.onopen = (e) => {
    socket.send(JSON.stringify({ listen_member_id: memberId }));
  };

  socket.onerror = (e) => {
    socket.close();
  };

  socket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);

      if (data.type && data.type === 'startTimer' && data.cardId) {
        requestedTimerStart = data.cardId;
      }
    } catch (e) {
    }
  };

  socket.onclose = (e) => {
    // API Gateway websockets auto-close after 10 minutes. So we just initiate a new connection.
    initiateWebsocket();
  };
}

export async function initializeWebsocket () {
  const hasAutoTimerFeature = await hasAutoTimer();
  const autoTimerListId = await getAutoTimerListId();

  if (hasAutoTimerFeature && autoTimerListId) {
    initiateWebsocket();
  }
}

export function getRequestedTimerStart () {
  return requestedTimerStart;
}

export function clearRequestedTimerStart () {
  requestedTimerStart = null;
}