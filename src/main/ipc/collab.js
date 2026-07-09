const WebSocket = require('ws');
const crypto = require('crypto');

let wss = null; // when hosting
let ws = null;  // when joining as client
let peers = new Map(); // socket -> peerInfo (host side)
let currentSessionId = null;
let currentPeerId = null;

function generateSessionId() {
  return crypto.randomBytes(4).toString('hex');
}

function registerCollabHandlers(ipcMain, getWindow) {
  // Host a new session: starts a local WebSocket server other Berto IDE
  // instances (on the same network, or via port-forwarding/tunnel) can join.
  ipcMain.handle('collab:start', async (_e, opts = {}) => {
    try {
      if (wss) return { success: false, error: 'A session is already running.' };
      const port = opts.port || 5577;
      currentSessionId = generateSessionId();
      currentPeerId = 'host';

      wss = new WebSocket.Server({ port });

      wss.on('connection', (socket) => {
        const peerId = crypto.randomBytes(3).toString('hex');
        peers.set(socket, { id: peerId, name: `Peer-${peerId}` });

        const win = getWindow();
        if (win) win.webContents.send('collab:peerJoined', { id: peerId });

        socket.on('message', (raw) => {
          let msg;
          try { msg = JSON.parse(raw); } catch { return; }
          const win2 = getWindow();
          if (msg.type === 'edit' && win2) {
            win2.webContents.send('collab:remoteEdit', { peerId, edit: msg.edit });
          } else if (msg.type === 'cursor' && win2) {
            win2.webContents.send('collab:cursorUpdate', { peerId, cursor: msg.cursor });
          }
          // Relay to all other connected peers too (star topology via host)
          for (const [otherSocket] of peers) {
            if (otherSocket !== socket && otherSocket.readyState === WebSocket.OPEN) {
              otherSocket.send(raw.toString());
            }
          }
        });

        socket.on('close', () => {
          peers.delete(socket);
          const win3 = getWindow();
          if (win3) win3.webContents.send('collab:peerLeft', { id: peerId });
        });
      });

      return { success: true, sessionId: currentSessionId, port };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Join an existing session hosted by another Berto IDE user.
  ipcMain.handle('collab:join', async (_e, sessionId, opts = {}) => {
    try {
      if (ws) return { success: false, error: 'Already connected to a session.' };
      const address = opts.address || 'ws://localhost:5577';

      return await new Promise((resolve) => {
        ws = new WebSocket(address);

        ws.on('open', () => {
          currentSessionId = sessionId;
          resolve({ success: true, sessionId });
        });

        ws.on('message', (raw) => {
          let msg;
          try { msg = JSON.parse(raw); } catch { return; }
          const win = getWindow();
          if (!win) return;
          if (msg.type === 'edit') win.webContents.send('collab:remoteEdit', { peerId: msg.peerId || 'host', edit: msg.edit });
          if (msg.type === 'cursor') win.webContents.send('collab:cursorUpdate', { peerId: msg.peerId || 'host', cursor: msg.cursor });
        });

        ws.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });

        ws.on('close', () => {
          const win = getWindow();
          if (win) win.webContents.send('collab:peerLeft', { id: 'host' });
          ws = null;
        });
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('collab:leave', async () => {
    if (wss) {
      for (const [socket] of peers) socket.close();
      peers.clear();
      wss.close();
      wss = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    currentSessionId = null;
    return { success: true };
  });

  ipcMain.handle('collab:sendEdit', async (_e, edit) => {
    const payload = JSON.stringify({ type: 'edit', edit, peerId: currentPeerId });
    if (wss) {
      for (const [socket] of peers) {
        if (socket.readyState === WebSocket.OPEN) socket.send(payload);
      }
      return { success: true };
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      return { success: true };
    }
    return { success: false, error: 'No active collaboration session.' };
  });
}

module.exports = { registerCollabHandlers };
