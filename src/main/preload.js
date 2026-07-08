const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bertoAPI', {
  // App
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getUserDataPath: () => ipcRenderer.invoke('app:getUserDataPath'),

  // Dialogs
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (defaultPath) => ipcRenderer.invoke('dialog:saveFile', defaultPath),

  // File system
  fs: {
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    createFile: (filePath) => ipcRenderer.invoke('fs:createFile', filePath),
    createFolder: (folderPath) => ipcRenderer.invoke('fs:createFolder', folderPath),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    delete: (targetPath) => ipcRenderer.invoke('fs:delete', targetPath),
    exists: (targetPath) => ipcRenderer.invoke('fs:exists', targetPath),
    watch: (dirPath) => ipcRenderer.invoke('fs:watch', dirPath),
    unwatch: (dirPath) => ipcRenderer.invoke('fs:unwatch', dirPath),
    onFileChange: (callback) => ipcRenderer.on('fs:changed', (_e, data) => callback(data)),
    search: (rootPath, query, options) => ipcRenderer.invoke('fs:search', rootPath, query, options)
  },

  // Terminal
  terminal: {
    create: (cwd) => ipcRenderer.invoke('terminal:create', cwd),
    write: (id, data) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    kill: (id) => ipcRenderer.invoke('terminal:kill', id),
    onData: (callback) => ipcRenderer.on('terminal:data', (_e, data) => callback(data)),
    onExit: (callback) => ipcRenderer.on('terminal:exit', (_e, data) => callback(data))
  },

  // Extensions (VSIX support)
  extensions: {
    install: (vsixPath) => ipcRenderer.invoke('ext:install', vsixPath),
    installFromMarketplace: (extId) => ipcRenderer.invoke('ext:installFromMarketplace', extId),
    uninstall: (extId) => ipcRenderer.invoke('ext:uninstall', extId),
    list: () => ipcRenderer.invoke('ext:list'),
    toggle: (extId, enabled) => ipcRenderer.invoke('ext:toggle', extId, enabled),
    getManifest: (extId) => ipcRenderer.invoke('ext:getManifest', extId),
    search: (query) => ipcRenderer.invoke('ext:search', query)
  },

  // Git
  git: {
    status: (repoPath) => ipcRenderer.invoke('git:status', repoPath),
    init: (repoPath) => ipcRenderer.invoke('git:init', repoPath),
    add: (repoPath, files) => ipcRenderer.invoke('git:add', repoPath, files),
    commit: (repoPath, message) => ipcRenderer.invoke('git:commit', repoPath, message),
    push: (repoPath) => ipcRenderer.invoke('git:push', repoPath),
    pull: (repoPath) => ipcRenderer.invoke('git:pull', repoPath),
    log: (repoPath) => ipcRenderer.invoke('git:log', repoPath),
    diff: (repoPath, file) => ipcRenderer.invoke('git:diff', repoPath, file),
    branches: (repoPath) => ipcRenderer.invoke('git:branches', repoPath),
    checkout: (repoPath, branch) => ipcRenderer.invoke('git:checkout', repoPath, branch)
  },

  // AI Assistant
  ai: {
    chat: (messages, opts) => ipcRenderer.invoke('ai:chat', messages, opts),
    setApiKey: (provider, key) => ipcRenderer.invoke('ai:setApiKey', provider, key),
    getConfig: () => ipcRenderer.invoke('ai:getConfig'),
    explainCode: (code, lang) => ipcRenderer.invoke('ai:explainCode', code, lang),
    fixCode: (code, lang, error) => ipcRenderer.invoke('ai:fixCode', code, lang, error)
  },

  // Live collaboration
  collab: {
    startSession: (opts) => ipcRenderer.invoke('collab:start', opts),
    joinSession: (sessionId, opts) => ipcRenderer.invoke('collab:join', sessionId, opts),
    leaveSession: () => ipcRenderer.invoke('collab:leave'),
    sendEdit: (edit) => ipcRenderer.invoke('collab:sendEdit', edit),
    onRemoteEdit: (callback) => ipcRenderer.on('collab:remoteEdit', (_e, data) => callback(data)),
    onPeerJoined: (callback) => ipcRenderer.on('collab:peerJoined', (_e, data) => callback(data)),
    onPeerLeft: (callback) => ipcRenderer.on('collab:peerLeft', (_e, data) => callback(data)),
    onCursorUpdate: (callback) => ipcRenderer.on('collab:cursorUpdate', (_e, data) => callback(data))
  },

  // Menu events from main -> renderer
  onMenuAction: (callback) => ipcRenderer.on('menu:action', (_e, action) => callback(action))
});
