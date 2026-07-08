const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { registerFileHandlers } = require('./ipc/fileSystem');
const { registerTerminalHandlers } = require('./ipc/terminal');
const { registerExtensionHandlers } = require('./ipc/extensions');
const { registerGitHandlers } = require('./ipc/git');
const { registerAIHandlers } = require('./ipc/ai');
const { registerCollabHandlers } = require('./ipc/collab');
const { createAppMenu } = require('./menu');

let mainWindow;

const isDev = process.argv.includes('--dev');

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    title: 'Berto IDE',
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

app.whenReady().then(() => {
  const win = createMainWindow();
  Menu.setApplicationMenu(createAppMenu(win));

  registerFileHandlers(ipcMain, () => mainWindow);
  registerTerminalHandlers(ipcMain);
  registerExtensionHandlers(ipcMain, () => mainWindow);
  registerGitHandlers(ipcMain);
  registerAIHandlers(ipcMain);
  registerCollabHandlers(ipcMain, () => mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Ensure user data dirs exist (extensions, settings, snippets)
const userDataPath = app.getPath('userData');
const dirs = ['extensions', 'settings', 'snippets', 'themes', 'workspaces'];
for (const d of dirs) {
  const p = path.join(userDataPath, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

ipcMain.handle('app:getUserDataPath', () => app.getPath('userData'));
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'] });
  return result.canceled ? [] : result.filePaths;
});
ipcMain.handle('dialog:saveFile', async (_e, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath });
  return result.canceled ? null : result.filePath;
});
