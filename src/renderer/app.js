import { EditorManager, defineBertoThemes } from './modules/editorManager.js';
import { FileTree } from './modules/fileTree.js';
import { CommandPalette } from './modules/commandPalette.js';
import { TerminalManager } from './modules/terminalManager.js';
import { icon } from './modules/icons.js';
import { initDialogs, confirmDialog, promptDialog, choiceDialog, toast } from './modules/dialogs.js';

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------
let editorManager = null;
let fileTree = null;
let commandPalette = null;
let terminalManager = null;
let currentRootPath = null;
let currentTermId = null;
let aiHistory = [];
let extSearchTimeout = null;
let searchTimeout = null;
let lastCursorSend = 0;

// DOM element cache, populated in init(). Using a plain object (not const
// destructuring at module scope) means a single missing element never
// throws and silently kills every listener below it — each getter here
// is looked up only once DOM is guaranteed ready.
const el = {};

function cacheElements() {
  const ids = [
    'file-tree', 'explorer-empty', 'btn-open-folder', 'btn-new-file', 'btn-new-folder', 'btn-refresh',
    'search-input', 'search-results',
    'git-init-btn', 'git-stage-all', 'git-commit-btn', 'git-push-btn', 'git-pull-btn',
    'commit-message', 'git-status-list', 'status-branch',
    'ext-search-input', 'ext-search-results', 'ext-install-vsix-btn', 'ext-installed-list', 'status-extensions-count',
    'ai-config-banner', 'ai-provider-select', 'ai-key-input', 'ai-save-key-btn',
    'ai-chat-messages', 'ai-chat-input', 'ai-send-btn', 'ai-explain-btn', 'ai-fix-btn',
    'collab-start-btn', 'collab-session-info', 'collab-session-id', 'collab-indicator',
    'collab-address-input', 'collab-join-btn', 'collab-leave-btn', 'collab-peers-list',
    'theme-select', 'font-size-slider', 'font-size-value', 'word-wrap-toggle', 'minimap-toggle',
    'tabs-bar', 'welcome-screen', 'welcome-open-folder', 'welcome-new-file', 'welcome-version',
    'panel-container', 'panel-close-btn', 'status-position', 'status-language',
    'command-palette-overlay', 'command-palette-input', 'command-palette-results',
    'sidebar', 'panel-terminal'
  ];
  for (const id of ids) el[id] = document.getElementById(id);
}

function renderStaticIcons() {
  // Any element with data-icon="name" gets its SVG injected. This runs once
  // so buttons never rely on emoji or external icon fonts.
  document.querySelectorAll('[data-icon]').forEach((node) => {
    node.innerHTML = icon(node.dataset.icon, node.classList.contains('activity-btn') ? 20 : 15);
  });
}

// ---------------------------------------------------------------------------
// Tabs / editor
// ---------------------------------------------------------------------------
function renderTabs() {
  el['tabs-bar'].innerHTML = '';
  if (!editorManager) return;
  if (editorManager.openOrder.length === 0) {
    el['welcome-screen'].classList.remove('hidden');
    return;
  }
  el['welcome-screen'].classList.add('hidden');

  for (const path of editorManager.openOrder) {
    const tab = document.createElement('div');
    tab.className = 'tab' + (path === editorManager.activePath ? ' active' : '');
    if (editorManager.isDirty(path)) tab.classList.add('dirty');
    const name = path.split(/[\\/]/).pop();

    const labelSpan = document.createElement('span');
    labelSpan.className = 'tab-label';
    labelSpan.textContent = name;

    const dotSpan = document.createElement('span');
    dotSpan.className = 'tab-dot';

    const closeSpan = document.createElement('span');
    closeSpan.className = 'tab-close';
    closeSpan.innerHTML = icon('close', 12);

    tab.appendChild(dotSpan);
    tab.appendChild(labelSpan);
    tab.appendChild(closeSpan);

    labelSpan.addEventListener('click', () => editorManager.setActive(path));
    closeSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      closeFile(path);
    });
    el['tabs-bar'].appendChild(tab);
  }
}

function onActiveFileChange(path) {
  renderTabs();
  if (path) {
    const entry = editorManager.models.get(path);
    el['status-language'].textContent = entry ? entry.language : '';
  } else {
    el['status-language'].textContent = '';
  }
}

async function openFile(filePath) {
  if (editorManager.hasFile(filePath)) {
    editorManager.setActive(filePath);
    return;
  }
  const result = await window.bertoAPI.fs.readFile(filePath);
  if (!result.success) {
    toast(`Could not open file: ${result.error}`, 'error');
    return;
  }
  if (result.binary) {
    toast('Binary file preview is not supported yet.', 'info');
    return;
  }
  editorManager.openFile(filePath, result.content);
  renderTabs();
}

async function saveActiveFile() {
  const path = editorManager?.activePath;
  if (!path) return;
  const content = editorManager.getContent(path);
  const result = await window.bertoAPI.fs.writeFile(path, content);
  if (result.success) {
    editorManager.markSaved(path);
    toast('Saved.', 'success', 1500);
  } else {
    toast(`Save failed: ${result.error}`, 'error');
  }
}

async function saveActiveFileAs() {
  const path = editorManager?.activePath;
  if (!path) return;
  const newPath = await window.bertoAPI.saveFileDialog(path);
  if (!newPath) return;
  const content = editorManager.getContent(path);
  const result = await window.bertoAPI.fs.writeFile(newPath, content);
  if (result.success) {
    toast('Saved.', 'success', 1500);
    if (currentRootPath) fileTree.refresh();
  } else {
    toast(`Save failed: ${result.error}`, 'error');
  }
}

function closeFile(path) {
  editorManager.closeFile(path);
  renderTabs();
}

// ---------------------------------------------------------------------------
// Activity bar / sidebar view switching
// ---------------------------------------------------------------------------
function switchSidebarView(viewName) {
  document.querySelectorAll('.activity-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));
  const btn = document.querySelector(`.activity-btn[data-view="${viewName}"]`);
  const view = document.getElementById(`view-${viewName}`);
  if (btn) btn.classList.add('active');
  if (view) view.classList.add('active');
}

function initActivityBar() {
  document.querySelectorAll('.activity-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSidebarView(btn.dataset.view));
  });
}

// ---------------------------------------------------------------------------
// File explorer
// ---------------------------------------------------------------------------
async function onTreeContextMenu(node) {
  const action = await choiceDialog(node.name, [
    { id: 'rename', label: 'Rename' },
    { id: 'delete', label: 'Delete', primary: true }
  ]);
  if (action === 'rename') {
    const newName = await promptDialog('Rename', 'New name', node.name);
    if (newName) {
      const newPath = node.path.replace(/[^\\/]+$/, newName);
      const res = await window.bertoAPI.fs.rename(node.path, newPath);
      if (res.success) fileTree.refresh();
      else toast(res.error, 'error');
    }
  } else if (action === 'delete') {
    const ok = await confirmDialog('Delete', `Delete "${node.name}"? This cannot be undone.`, 'Delete');
    if (ok) {
      const res = await window.bertoAPI.fs.delete(node.path);
      if (res.success) fileTree.refresh();
      else toast(res.error, 'error');
    }
  }
}

function updateExplorerEmptyState() {
  if (currentRootPath) {
    el['explorer-empty'].classList.add('hidden');
    el['file-tree'].classList.remove('hidden');
  } else {
    el['explorer-empty'].classList.remove('hidden');
    el['file-tree'].classList.add('hidden');
  }
}

async function openFolder(rootPath) {
  if (!rootPath) return;
  currentRootPath = rootPath;
  updateExplorerEmptyState();
  await fileTree.setRoot(rootPath);
  const version = await window.bertoAPI.getVersion();
  document.title = `Berto IDE ${version} — ${rootPath.split(/[\\/]/).pop()}`;
  refreshGitStatus();
}

async function pickAndOpenFolder() {
  const folder = await window.bertoAPI.openFolderDialog();
  if (folder) await openFolder(folder);
}

async function createNewFileFlow() {
  if (!currentRootPath) {
    await pickAndOpenFolder();
    if (!currentRootPath) return;
  }
  const name = await promptDialog('New File', 'File name, e.g. index.js');
  if (!name) return;
  const fullPath = `${currentRootPath}/${name}`;
  const res = await window.bertoAPI.fs.createFile(fullPath);
  if (res.success) {
    fileTree.refresh();
    openFile(fullPath);
  } else {
    toast(res.error, 'error');
  }
}

async function createNewFolderFlow() {
  if (!currentRootPath) {
    toast('Open a folder first.', 'info');
    return;
  }
  const name = await promptDialog('New Folder', 'Folder name');
  if (!name) return;
  const res = await window.bertoAPI.fs.createFolder(`${currentRootPath}/${name}`);
  if (res.success) fileTree.refresh();
  else toast(res.error, 'error');
}

function initFileExplorer() {
  fileTree = new FileTree(el['file-tree'], {
    onOpenFile: openFile,
    onContextMenu: onTreeContextMenu
  });
  window.bertoAPI.fs.onFileChange(({ root }) => {
    if (fileTree.rootPath === root) fileTree.handleExternalChange();
  });

  el['btn-open-folder'].addEventListener('click', pickAndOpenFolder);
  el['welcome-open-folder'].addEventListener('click', pickAndOpenFolder);
  el['welcome-new-file'].addEventListener('click', createNewFileFlow);
  el['btn-new-file'].addEventListener('click', createNewFileFlow);
  el['btn-new-folder'].addEventListener('click', createNewFolderFlow);
  el['btn-refresh'].addEventListener('click', () => fileTree && fileTree.refresh());

  updateExplorerEmptyState();
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function runSearch() {
  const query = el['search-input'].value.trim();
  const resultsEl = el['search-results'];
  if (!query || !currentRootPath) { resultsEl.innerHTML = ''; return; }
  const res = await window.bertoAPI.fs.search(currentRootPath, query, { maxResults: 150 });
  resultsEl.innerHTML = '';
  if (!res.success) return;
  for (const r of res.results) {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    div.innerHTML = `<span class="search-result-file">${escapeHtml(r.name)}</span><span class="search-result-line">${r.line ? ':' + r.line : ''}</span><div class="search-result-text">${escapeHtml(r.text || '')}</div>`;
    div.addEventListener('click', () => openFile(r.path));
    resultsEl.appendChild(div);
  }
}

function initSearch() {
  el['search-input'].addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(runSearch, 350);
  });
}

// ---------------------------------------------------------------------------
// Git panel
// ---------------------------------------------------------------------------
async function refreshGitStatus() {
  const listEl = el['git-status-list'];
  const branchEl = el['status-branch'];
  if (!currentRootPath) { listEl.innerHTML = ''; branchEl.textContent = ''; return; }
  const res = await window.bertoAPI.git.status(currentRootPath);
  if (!res.success || !res.isRepo) {
    listEl.innerHTML = '<p class="hint">Not a Git repository.</p>';
    branchEl.textContent = '';
    return;
  }
  branchEl.innerHTML = `${icon('branch', 12)}<span>${res.status.current || 'main'}</span>`;
  listEl.innerHTML = '';
  const files = [
    ...res.status.not_added.map(f => ({ f, code: 'U' })),
    ...res.status.modified.map(f => ({ f, code: 'M' })),
    ...res.status.created.map(f => ({ f, code: 'A' })),
    ...res.status.deleted.map(f => ({ f, code: 'D' }))
  ];
  if (files.length === 0) {
    listEl.innerHTML = '<p class="hint">No changes.</p>';
    return;
  }
  for (const { f, code } of files) {
    const row = document.createElement('div');
    row.className = 'git-status-row';
    row.innerHTML = `<span class="git-status-code">${code}</span><span>${escapeHtml(f)}</span>`;
    listEl.appendChild(row);
  }
}

function initGitPanel() {
  el['git-init-btn'].addEventListener('click', async () => {
    if (!currentRootPath) return toast('Open a folder first.', 'info');
    const res = await window.bertoAPI.git.init(currentRootPath);
    if (res.success) toast('Repository initialized.', 'success');
    else toast(res.error, 'error');
    refreshGitStatus();
  });

  el['git-stage-all'].addEventListener('click', async () => {
    if (!currentRootPath) return toast('Open a folder first.', 'info');
    await window.bertoAPI.git.add(currentRootPath, '.');
    refreshGitStatus();
  });

  el['git-commit-btn'].addEventListener('click', async () => {
    if (!currentRootPath) return toast('Open a folder first.', 'info');
    const msg = el['commit-message'].value.trim();
    if (!msg) return toast('Enter a commit message.', 'info');
    const res = await window.bertoAPI.git.commit(currentRootPath, msg);
    if (res.success) {
      el['commit-message'].value = '';
      toast('Committed.', 'success');
      refreshGitStatus();
    } else {
      toast(res.error, 'error');
    }
  });

  el['git-push-btn'].addEventListener('click', async () => {
    if (!currentRootPath) return toast('Open a folder first.', 'info');
    const res = await window.bertoAPI.git.push(currentRootPath);
    toast(res.success ? 'Pushed successfully.' : `Push failed: ${res.error}`, res.success ? 'success' : 'error');
  });

  el['git-pull-btn'].addEventListener('click', async () => {
    if (!currentRootPath) return toast('Open a folder first.', 'info');
    const res = await window.bertoAPI.git.pull(currentRootPath);
    if (res.success) { toast('Pulled successfully.', 'success'); fileTree.refresh(); }
    else toast(`Pull failed: ${res.error}`, 'error');
  });
}

// ---------------------------------------------------------------------------
// Extensions panel
// ---------------------------------------------------------------------------
async function runExtensionSearch() {
  const query = el['ext-search-input'].value.trim();
  const resultsEl = el['ext-search-results'];
  if (!query) { resultsEl.innerHTML = ''; return; }
  resultsEl.innerHTML = '<div class="hint" style="padding:8px 12px;">Searching Open VSX...</div>';
  const res = await window.bertoAPI.extensions.search(query);
  resultsEl.innerHTML = '';
  if (!res.success) {
    resultsEl.innerHTML = `<div class="hint error-text" style="padding:8px 12px;">${escapeHtml(res.error)}</div>`;
    return;
  }
  for (const ext of res.results) {
    const div = document.createElement('div');
    div.className = 'ext-item';
    div.innerHTML = `
      <div class="ext-item-header">
        <span class="ext-item-name">${escapeHtml(ext.displayName)}</span>
        <button type="button">Install</button>
      </div>
      <div class="ext-item-desc">${escapeHtml(ext.publisher)} · v${escapeHtml(ext.version)} · ${escapeHtml(ext.description || '')}</div>
    `;
    div.querySelector('button').addEventListener('click', async (e) => {
      e.target.textContent = 'Installing...';
      e.target.disabled = true;
      const installRes = await window.bertoAPI.extensions.installFromMarketplace(ext.id);
      if (installRes.success) {
        e.target.textContent = 'Installed';
        loadInstalledExtensions();
      } else {
        e.target.textContent = 'Failed';
        toast(installRes.error, 'error');
      }
    });
    resultsEl.appendChild(div);
  }
}

async function loadInstalledExtensions() {
  const listEl = el['ext-installed-list'];
  const res = await window.bertoAPI.extensions.list();
  listEl.innerHTML = '';
  if (!res.success) return;
  el['status-extensions-count'].textContent = String(res.extensions.length);
  if (res.extensions.length === 0) {
    listEl.innerHTML = '<p class="hint" style="padding:0 12px;">No extensions installed.</p>';
    return;
  }
  for (const ext of res.extensions) {
    const div = document.createElement('div');
    div.className = 'ext-item';
    const badges = [
      ...(ext.supported || []).map(s => `<span class="ext-badge">${escapeHtml(s.type)}</span>`),
      ...(ext.partial || []).map(p => `<span class="ext-badge partial">${escapeHtml(p.type)} (partial)</span>`)
    ].join('');
    div.innerHTML = `
      <div class="ext-item-header">
        <span class="ext-item-name">${escapeHtml(ext.displayName || ext.id)}</span>
        <button type="button">Remove</button>
      </div>
      <div class="ext-item-desc">${escapeHtml(ext.description || '')}</div>
      <div>${badges}</div>
    `;
    div.querySelector('button').addEventListener('click', async () => {
      const ok = await confirmDialog('Remove Extension', `Remove "${ext.displayName}"?`, 'Remove');
      if (ok) {
        await window.bertoAPI.extensions.uninstall(ext.id);
        loadInstalledExtensions();
      }
    });
    listEl.appendChild(div);
  }
}

function initExtensionsPanel() {
  el['ext-search-input'].addEventListener('input', () => {
    clearTimeout(extSearchTimeout);
    extSearchTimeout = setTimeout(runExtensionSearch, 400);
  });

  el['ext-install-vsix-btn'].addEventListener('click', async () => {
    const files = await window.bertoAPI.openFileDialog();
    if (!files || !files.length) return;
    const vsixPath = files[0];
    if (!vsixPath.endsWith('.vsix')) return toast('Please select a .vsix file.', 'info');
    const res = await window.bertoAPI.extensions.install(vsixPath);
    if (res.success) {
      toast(`Installed: ${res.extension.displayName}`, 'success');
      loadInstalledExtensions();
    } else {
      toast(`Install failed: ${res.error}`, 'error');
    }
  });
}

// ---------------------------------------------------------------------------
// AI Assistant panel
// ---------------------------------------------------------------------------
async function checkAIConfig() {
  const cfg = await window.bertoAPI.ai.getConfig();
  if (!cfg.configuredProviders || cfg.configuredProviders.length === 0) {
    el['ai-config-banner'].classList.remove('hidden');
  } else {
    el['ai-config-banner'].classList.add('hidden');
  }
}

function appendAIMessage(role, text) {
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.textContent = text;
  el['ai-chat-messages'].appendChild(div);
  el['ai-chat-messages'].scrollTop = el['ai-chat-messages'].scrollHeight;
  return div;
}

async function sendAIMessage(promptOverride) {
  const text = promptOverride || el['ai-chat-input'].value.trim();
  if (!text) return;
  appendAIMessage('user', text);
  aiHistory.push({ role: 'user', content: text });
  el['ai-chat-input'].value = '';

  const thinkingDiv = appendAIMessage('assistant', 'Thinking...');

  const res = await window.bertoAPI.ai.chat(aiHistory);
  thinkingDiv.remove();
  if (res.success) {
    appendAIMessage('assistant', res.text);
    aiHistory.push({ role: 'assistant', content: res.text });
  } else {
    const errDiv = appendAIMessage('assistant', res.error);
    errDiv.classList.add('error-text');
  }
}

function initAIPanel() {
  el['ai-save-key-btn'].addEventListener('click', async () => {
    const provider = el['ai-provider-select'].value;
    const key = el['ai-key-input'].value.trim();
    if (!key) return toast('Enter an API key.', 'info');
    const res = await window.bertoAPI.ai.setApiKey(provider, key);
    if (res.success) {
      el['ai-key-input'].value = '';
      toast('API key saved.', 'success');
      checkAIConfig();
    } else {
      toast(res.error, 'error');
    }
  });

  el['ai-send-btn'].addEventListener('click', () => sendAIMessage());
  el['ai-chat-input'].addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAIMessage();
    }
  });

  el['ai-explain-btn'].addEventListener('click', () => {
    const selection = editorManager?.getSelection();
    if (!selection) return toast('Select some code in the editor first.', 'info');
    switchSidebarView('ai');
    sendAIMessage(`Explain this code:\n\n${selection}`);
  });

  el['ai-fix-btn'].addEventListener('click', async () => {
    const selection = editorManager?.getSelection();
    if (!selection) return toast('Select some code in the editor first.', 'info');
    const errMsg = (await promptDialog('Fix Error', 'Describe the error or issue (optional)')) || 'unspecified issue';
    switchSidebarView('ai');
    sendAIMessage(`Fix this code. Issue: "${errMsg}"\n\n${selection}`);
  });
}

// ---------------------------------------------------------------------------
// Collaboration panel
// ---------------------------------------------------------------------------
function sendCollabCursor(line, column) {
  const now = Date.now();
  if (now - lastCursorSend < 150) return;
  lastCursorSend = now;
  window.bertoAPI.collab.sendEdit({ __cursor: true, line, column }).catch(() => {});
}

function initCollabPanel() {
  el['collab-start-btn'].addEventListener('click', async () => {
    const res = await window.bertoAPI.collab.startSession({});
    if (res.success) {
      el['collab-session-info'].classList.remove('hidden');
      el['collab-session-id'].textContent = res.sessionId;
      el['collab-indicator'].classList.remove('hidden');
      el['collab-leave-btn'].classList.remove('hidden');
      el['collab-start-btn'].classList.add('hidden');
    } else {
      toast(res.error, 'error');
    }
  });

  el['collab-join-btn'].addEventListener('click', async () => {
    const address = el['collab-address-input'].value.trim();
    if (!address) return toast('Enter a session address, e.g. ws://192.168.1.10:5577', 'info');
    const res = await window.bertoAPI.collab.joinSession('joined', { address });
    if (res.success) {
      el['collab-indicator'].classList.remove('hidden');
      el['collab-leave-btn'].classList.remove('hidden');
      toast('Joined session.', 'success');
    } else {
      toast(res.error, 'error');
    }
  });

  el['collab-leave-btn'].addEventListener('click', async () => {
    await window.bertoAPI.collab.leaveSession();
    el['collab-indicator'].classList.add('hidden');
    el['collab-session-info'].classList.add('hidden');
    el['collab-leave-btn'].classList.add('hidden');
    el['collab-start-btn'].classList.remove('hidden');
    el['collab-peers-list'].innerHTML = '';
  });

  window.bertoAPI.collab.onPeerJoined(({ id }) => {
    const row = document.createElement('div');
    row.className = 'peer-row';
    row.dataset.peer = id;
    row.innerHTML = `<span class="peer-dot"></span><span>Peer ${id}</span>`;
    el['collab-peers-list'].appendChild(row);
  });
  window.bertoAPI.collab.onPeerLeft(({ id }) => {
    document.querySelector(`.peer-row[data-peer="${id}"]`)?.remove();
  });
  window.bertoAPI.collab.onRemoteEdit(({ edit }) => {
    if (editorManager && editorManager.activePath) {
      editorManager.applyRemoteEdit(editorManager.activePath, edit);
    }
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
function initSettingsPanel() {
  el['theme-select'].addEventListener('change', (e) => {
    editorManager?.setTheme(e.target.value);
  });
  el['font-size-slider'].addEventListener('input', (e) => {
    el['font-size-value'].textContent = `${e.target.value}px`;
    editorManager?.updateOptions({ fontSize: parseInt(e.target.value, 10) });
  });
  el['word-wrap-toggle'].addEventListener('change', (e) => {
    editorManager?.updateOptions({ wordWrap: e.target.checked ? 'on' : 'off' });
  });
  el['minimap-toggle'].addEventListener('change', (e) => {
    editorManager?.updateOptions({ minimap: { enabled: e.target.checked } });
  });
}

// ---------------------------------------------------------------------------
// Terminal / bottom panel
// ---------------------------------------------------------------------------
async function toggleTerminalPanel() {
  el['panel-container'].classList.toggle('collapsed');
  if (!el['panel-container'].classList.contains('collapsed') && !currentTermId) {
    terminalManager = new TerminalManager(el['panel-terminal']);
    currentTermId = await terminalManager.createTerminal(currentRootPath);
  }
  setTimeout(() => terminalManager?.fitActive(), 50);
}

function initPanel() {
  el['panel-close-btn'].addEventListener('click', () => {
    el['panel-container'].classList.add('collapsed');
  });
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel-view').forEach(v => v.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
    });
  });
}

// ---------------------------------------------------------------------------
// Command palette
// ---------------------------------------------------------------------------
function buildCommands() {
  return [
    { id: 'save', label: 'File: Save', shortcut: 'Ctrl+S', run: saveActiveFile },
    { id: 'open-folder', label: 'File: Open Folder', shortcut: 'Ctrl+Shift+O', run: pickAndOpenFolder },
    { id: 'new-file', label: 'File: New File', run: createNewFileFlow },
    { id: 'new-folder', label: 'File: New Folder', run: createNewFolderFlow },
    { id: 'toggle-terminal', label: 'View: Toggle Terminal', shortcut: 'Ctrl+`', run: toggleTerminalPanel },
    { id: 'toggle-sidebar', label: 'View: Toggle Sidebar', shortcut: 'Ctrl+B', run: () => el['sidebar'].classList.toggle('hidden') },
    { id: 'explorer-panel', label: 'View: Show Explorer', run: () => switchSidebarView('explorer') },
    { id: 'search-panel', label: 'View: Show Search', run: () => switchSidebarView('search') },
    { id: 'ai-panel', label: 'View: Show AI Assistant', run: () => switchSidebarView('ai') },
    { id: 'ext-panel', label: 'View: Show Extensions', run: () => switchSidebarView('extensions') },
    { id: 'collab-panel', label: 'View: Show Live Collaboration', run: () => switchSidebarView('collab') },
    { id: 'git-panel', label: 'View: Show Source Control', run: () => switchSidebarView('git') },
    { id: 'settings-panel', label: 'View: Show Settings', run: () => switchSidebarView('settings') }
  ];
}

function initCommandPalette() {
  commandPalette = new CommandPalette(
    el['command-palette-overlay'],
    el['command-palette-input'],
    el['command-palette-results'],
    buildCommands()
  );
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 's') { e.preventDefault(); saveActiveFile(); }
    if (ctrl && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); commandPalette?.open(); }
    if (ctrl && e.key === '`') { e.preventDefault(); toggleTerminalPanel(); }
    if (ctrl && e.key.toLowerCase() === 'b') { e.preventDefault(); el['sidebar'].classList.toggle('hidden'); }
    if (ctrl && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      if (editorManager?.activePath) closeFile(editorManager.activePath);
    }
  });
}

// ---------------------------------------------------------------------------
// Menu actions from the main process
// ---------------------------------------------------------------------------
function initMenuBridge() {
  window.bertoAPI.onMenuAction(async (action) => {
    switch (action) {
      case 'new-file': createNewFileFlow(); break;
      case 'open-file': {
        const files = await window.bertoAPI.openFileDialog();
        for (const f of files) openFile(f);
        break;
      }
      case 'open-folder': pickAndOpenFolder(); break;
      case 'save': saveActiveFile(); break;
      case 'save-as': saveActiveFileAs(); break;
      case 'close-tab': if (editorManager?.activePath) closeFile(editorManager.activePath); break;
      case 'command-palette': commandPalette?.open(); break;
      case 'find': editorManager?.editor.getAction('actions.find')?.run(); break;
      case 'replace': editorManager?.editor.getAction('editor.action.startFindReplaceAction')?.run(); break;
      case 'find-in-files': switchSidebarView('search'); el['search-input'].focus(); break;
      case 'toggle-sidebar': el['sidebar'].classList.toggle('hidden'); break;
      case 'toggle-terminal': toggleTerminalPanel(); break;
      case 'toggle-ai': switchSidebarView('ai'); break;
      case 'open-extensions': switchSidebarView('extensions'); break;
      case 'install-vsix': el['ext-install-vsix-btn'].click(); break;
      case 'collab-start': el['collab-start-btn'].click(); break;
      case 'collab-join': switchSidebarView('collab'); el['collab-address-input'].focus(); break;
      case 'collab-leave': el['collab-leave-btn'].click(); break;
      case 'about':
        toast('Berto IDE — an extensible editor with VS Code extension support, a built-in AI assistant, and live collaboration.', 'info', 6000);
        break;
      case 'settings': switchSidebarView('settings'); break;
    }
  });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
function initMonaco() {
  return new Promise((resolve) => {
    require.config({ paths: { vs: '../../node_modules/monaco-editor/min/vs' } });
    require(['vs/editor/editor.main'], () => {
      defineBertoThemes(monaco);
      editorManager = new EditorManager(monaco, document.getElementById('editor-container'));
      editorManager.onDirtyChange = () => renderTabs();
      editorManager.onActiveChange = (path) => onActiveFileChange(path);
      editorManager.onCursorChange = ({ line, column }) => {
        el['status-position'].textContent = `Ln ${line}, Col ${column}`;
        sendCollabCursor(line, column);
      };
      resolve();
    });
  });
}

async function init() {
  cacheElements();
  renderStaticIcons();
  initDialogs();

  await initMonaco();

  initActivityBar();
  initFileExplorer();
  initSearch();
  initGitPanel();
  initExtensionsPanel();
  initAIPanel();
  initCollabPanel();
  initSettingsPanel();
  initPanel();
  initCommandPalette();
  initKeyboardShortcuts();
  initMenuBridge();

  loadInstalledExtensions();
  checkAIConfig();
  renderTabs();

  const version = await window.bertoAPI.getVersion();
  el['welcome-version'].textContent = `Version ${version}`;
  if (!currentRootPath) document.title = `Berto IDE ${version}`;
  console.log(`Berto IDE v${version} ready.`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
