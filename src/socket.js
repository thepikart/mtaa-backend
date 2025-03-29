
let wss;

module.exports = {
  init: (server) => {
    const WebSocket = require('ws');
    wss = new WebSocket.Server({ server });
    wss.on('connection', (ws) => {
      console.log('New WebSocket client connected');
      ws.on('message', (message) => {
        console.log('Received via WS:', message);
      });
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
    return wss;
  },
  getWss: () => {
    if (!wss) {
      throw new Error('WebSocket server not initialized!');
    }
    return wss;
  }
};
