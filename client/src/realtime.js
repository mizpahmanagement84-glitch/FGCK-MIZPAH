import { io as Client } from 'socket.io-client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const origin = apiBaseUrl ? apiBaseUrl.replace(/\/api\/?$/, '') : window.location.origin;

const socket = Client(origin, { transports: ['websocket'], autoConnect: true });

socket.on('connect', () => {
  console.log('Realtime connected', socket.id);
});

socket.on('data-changed', (payload) => {
  // dispatch a global event components can listen to
  try {
    window.dispatchEvent(new CustomEvent('data-changed', { detail: payload }));
  } catch (e) {
    // ignore
  }
});

export default socket;
