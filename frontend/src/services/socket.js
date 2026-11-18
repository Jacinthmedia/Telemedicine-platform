let socket = null;
let listeners = new Set();
let shouldReconnect = true;
let reconnectTimer = null;
let tokenWatcher = null;

const API_URL = 'http://192.168.137.1:8000/api';
const WS_URL = API_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws/chat/';

function getToken() {
  return localStorage.getItem('access_token') || '';
}

function startTokenWatcher() {
  if (tokenWatcher) return;
  let lastToken = getToken();
  tokenWatcher = setInterval(() => {
    const current = getToken();
    if (current && current !== lastToken) {
      lastToken = current;
      if (socket) {
        shouldReconnect = false;
        try { socket.close(); } catch (e) {}
        socket = null;
      }
      shouldReconnect = true;
      connectChatSocket();
    }
  }, 3000);
}

export function connectChatSocket() {
  startTokenWatcher();
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return socket;

  const token = getToken();
  if (!token) {
    setTimeout(connectChatSocket, 1000);
    return null;
  }

  shouldReconnect = true;
  const url = WS_URL + '?token=' + encodeURIComponent(token);
  socket = new WebSocket(url);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      listeners.forEach((fn) => fn(data));
    } catch (e) {}
  };

  socket.onclose = () => {
    socket = null;
    if (shouldReconnect) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectChatSocket, 2000);
    }
  };

  return socket;
}

export function sendChatMessage(receiverId, message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) connectChatSocket();
  const payload = JSON.stringify({ receiver: receiverId, message });
  if (socket && socket.readyState === WebSocket.CONNECTING) {
    socket.addEventListener('open', () => socket.send(payload), { once: true });
  } else if (socket) {
    socket.send(payload);
  }
}

export function sendTypingStatus(receiverId, isTyping) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: 'typing', receiver: receiverId, is_typing: isTyping }));
  }
}

export function onChatMessage(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
