const { Menu, app, shell } = require('electron');

function createAppMenu(win) {
  const send = (action) => win && win.webContents.send('menu:action', action);

  const template = [
    {
      label: 'Berto IDE',
      submenu: [
        { label: 'About Berto IDE', click: () => send('about') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => send('settings') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => send('new-file') },
        { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => send('open-file') },
        { label: 'Open Folder...', accelerator: 'CmdOrCtrl+Shift+O', click: () => send('open-folder') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('save-as') },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => send('close-tab') }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => send('find') },
        { label: 'Replace', accelerator: 'CmdOrCtrl+H', click: () => send('replace') },
        { label: 'Find in Files', accelerator: 'CmdOrCtrl+Shift+F', click: () => send('find-in-files') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+Shift+P', click: () => send('command-palette') },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => send('toggle-sidebar') },
        { label: 'Toggle Terminal', accelerator: 'CmdOrCtrl+`', click: () => send('toggle-terminal') },
        { label: 'Toggle AI Assistant', accelerator: 'CmdOrCtrl+Shift+A', click: () => send('toggle-ai') },
        { type: 'separator' },
        { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Extensions',
      submenu: [
        { label: 'Extension Marketplace', click: () => send('open-extensions') },
        { label: 'Install VSIX...', click: () => send('install-vsix') }
      ]
    },
    {
      label: 'Collaboration',
      submenu: [
        { label: 'Start Live Session', click: () => send('collab-start') },
        { label: 'Join Session...', click: () => send('collab-join') },
        { label: 'Leave Session', click: () => send('collab-leave') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Berto IDE on GitHub', click: () => shell.openExternal('https://github.com/YOUR_USERNAME/berto-ide') },
        { label: 'Report an Issue', click: () => shell.openExternal('https://github.com/YOUR_USERNAME/berto-ide/issues') }
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { createAppMenu };
