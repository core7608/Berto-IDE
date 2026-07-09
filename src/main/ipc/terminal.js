const os = require('os');

let pty;
try {
  pty = require('node-pty');
} catch (e) {
  pty = null;
  console.error('node-pty failed to load. Terminal features will be disabled until rebuilt for this platform.', e.message);
}

const sessions = new Map();
let counter = 0;

function registerTerminalHandlers(ipcMain) {
  ipcMain.handle('terminal:create', (event, cwd) => {
    if (!pty) {
      return { success: false, error: 'Terminal (node-pty) is not available on this build.' };
    }
    const id = `term-${++counter}`;
    const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: cwd || os.homedir(),
      env: process.env
    });

    const sender = event.sender;

    ptyProcess.onData((data) => {
      if (!sender.isDestroyed()) {
        sender.send('terminal:data', { id, data });
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      if (!sender.isDestroyed()) {
        sender.send('terminal:exit', { id, exitCode });
      }
      sessions.delete(id);
    });

    sessions.set(id, ptyProcess);
    return { success: true, id };
  });

  ipcMain.handle('terminal:write', (_e, id, data) => {
    const proc = sessions.get(id);
    if (proc) proc.write(data);
    return { success: !!proc };
  });

  ipcMain.handle('terminal:resize', (_e, id, cols, rows) => {
    const proc = sessions.get(id);
    if (proc) proc.resize(cols, rows);
    return { success: !!proc };
  });

  ipcMain.handle('terminal:kill', (_e, id) => {
    const proc = sessions.get(id);
    if (proc) {
      proc.kill();
      sessions.delete(id);
    }
    return { success: true };
  });
}

module.exports = { registerTerminalHandlers };
