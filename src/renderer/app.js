import { EditorManager, defineBertoThemes } from './modules/editorManager.js';
import { FileTree } from './modules/fileTree.js';
import { CommandPalette } from './modules/commandPalette.js';
import { TerminalManager } from './modules/terminalManager.js';

let editorManager = null;
let fileTree = null;
let commandPalette = null;
let terminalManager = null;
let currentRootPath = null;
let currentTermId = null;

// ---------- Monaco bootstrap ----------
require.config({ paths: { vs: '../../node_modules/monaco-editor/min/vs' } });
require(['vs/editor/editor.main'], () => {
  defineBertoThemes(monaco);
  editorManager = new EditorManager(monaco, document.getElementById('editor-container'));

  editorManager.onDirtyChange = (path, dirty) => updateTabDirty(path, dirty);
  editorManager.onActiveChange = (path) => onActiveFileChange(path);
  editorManager.onCursorChange = ({ line, column }) => {
    document.getElementById('status-position').textContent = `Ln ${line}, Col ${column}`;
    sendCollabCursor(line, column);
  };

  initApp();
});

// ---------- Tabs ----------
const tabsBar = document.getElementById('tabs-bar');
const welcomeScreen = document.getElementById('welcome-screen');

function renderTabs() {
  tabsBar.innerHTML = '';
  if (!editorManager) return;
  if (editorManager.openOrder.length === 0) {
    welcomeScreen.classList.remove('hidden');
    return;
  }
  welcomeScreen.classList.add('hidden');

  for (const path of editorManager.openOrder) {
    const tab = document.createElement('div');
    tab.className = 'tab' + (path === editorManager.activePath ? ' active' : '');
    if (editorManager.isDirty(path)) tab.classList.add('dirty');
    const name = path.split(/[\\/]/).pop();

    tab.innerHTML = `<span class="tab-dot"></span><span class="tab-label">${name}</span><span class="tab-close">✕</span>`;
    tab.querySelector('.tab-label').addEventListener('click', () => editorManager.setActive(path));
    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeFile(path);
    });
    tabsBar.appendChild(tab);
  }
}

function updateTabDirty(path, dirty) {
  renderTabs();
}

function onActiveFileChange(path) {
  renderTabs();
  const statusLang = document.getElementById('status-language');
  if (path) {
    const entry = editorManager.models.get(path);
    statusLang.textContent = entry ? entry.language : '';
  } else {
    statusLang.textContent = '';
  }
}

async function openFile(filePath) {
  if (editorManager.hasFile(filePath)) {
    editorManager.setActive(filePath);
    return;
  }
  const result = await window.bertoAPI.fs.readFile(filePath);
  if (!result.success) {
    alert(`Could not open file: ${result.error}`);
    return;
  }
  if (result.binary) {
    alert('Binary file preview is not supported yet.');
    return;
  }
  editorManager.openFile(filePath, result.content);
  renderTabs();
}

async function saveActiveFile() {
  const path = editorManager.activePath;
  if (!path) return;
  const content = editorManager.getContent(path);
  const result = await window.bertoAPI.fs.writeFile(path, content);
  if (result.success) {
    editorManager.markSaved(path);
  } else {
    alert(`Save failed: ${result.error}`);
  }
}

function closeFile(path) {
  editorManager.closeFile(path);
  renderTabs();
}

// ---------- Sidebar view switching ----------
document.querySelectorAll('.activity-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.activity-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
  });
});

// ---------- File tree ----------
async function initFileTree() {
  fileTree = new FileTree(document.getElementById('file-tree'), {
    onOpenFile: openFile,
    onContextMenu: onTreeContextMenu
  });
  window.bertoAPI.fs.onFileChange(({ root }) => {
    if (fileTree.rootPath === root) fileTree.handleExternalChange();
  });
}

function onTreeContextMenu(node, x, y) {
  // Minimal context action set via native confirm/prompt to keep this dependency-free.
  const action = prompt(`Actions for "${node.name}": type "rename", "delete", or cancel.`);
  if (action === 'rename') {
    const newName = prompt('New name:', node.name);
    if (newName) {
      const newPath = node.path.replace(/[^\\/]+$/, newName);
      window.bertoAPI.fs.rename(node.path, newPath).then(() => fileTree.refresh());
    }
  } else if (action === 'delete') {
    if (confirm(`Delete "${node.name}"? This cannot be undone.`)) {
      window.bertoAPI.fs.delete(node.path).then(() => fileTree.refresh());
    }
  }
}

async function openFolder(rootPath) {
  if (!rootPath) return;
  currentRootPath = rootPath;
  await fileTree.setRoot(rootPath);
  document.title = `Berto IDE — ${rootPath.split(/[\\/]/).pop()}`;
  refreshGitStatus();
}

document.getElementById('btn-open-folder').addEventListener('click', async () => {
  const folder = await window.bertoAPI.openFolderDialog();
  if (folder) openFolder(folder);
});
document.getElementById('welcome-open-folder').addEventListener('click', async () => {
  const folder = await window.bertoAPI.openFolderDialog();
  if (folder) openFolder(folder);
});
document.getElementById('welcome-new-file').addEventListener('click', createNewFileFlow);
document.getElementById('btn-new-file').addEventListener('click', createNewFileFlow);
document.getElementById('btn-new-folder').addEventListener('click', async () => {
  if (!currentRootPath) return alert('Open a folder first.');
  const name = prompt('Folder name:');
  if (!name) return;
  await window.bertoAPI.fs.createFolder(`${currentRootPath}/${name}`);
  fileTree.refresh();
});
document.getElementById('btn-refresh').addEventListener('click', () => fileTree && fileTree.refresh());

async function createNewFileFlow() {
  if (!currentRootPath) {
    const folder = await window.bertoAPI.openFolderDialog();
    if (!folder) return;
    await openFolder(folder);
  }
  const name = prompt('File name (e.g. index.js):');
  if (!name) return;
  const fullPath = `${currentRootPath}/${name}`;
  const res = await window.bertoAPI.fs.createFile(fullPath);
  if (res.success) {
    fileTree.refresh();
    openFile(fullPath);
  } else {
    alert(res.error);
  }
}

// ---------- Search ----------
const searchInput = document.getElementById('search-input');
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(runSearch, 350);
});
async function runSearch() {
  const query = searchInput.value.trim();
  const resultsEl = document.getElementById('search-results');
  if (!query || !currentRootPath) { resultsEl.innerHTML = ''; return; }
  const res = await window.bertoAPI.fs.search(currentRootPath, query, { maxResults: 150 });
  resultsEl.innerHTML = '';
  if (!res.success) return;
  for (const r of res.results) {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    div.innerHTML = `<span class="search-result-file">${r.name}</span><span class="search-result-line">${r.line ? ':' + r.line : ''}</span><br/><span style="color:var(--text-muted)">${escapeHtml(r.text || '')}</span>`;
    div.addEventListener('click', () => openFile(r.path));
    resultsEl.appendChild(div);
  }
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ---------- Git panel ----------
document.getElementById('git-init-btn').addEventListener('click', async () => {
  if (!currentRootPath) return alert('Open a folder first.');
  await window.bertoAPI.git.init(currentRootPath);
  refreshGitStatus();
});
document.getElementById('git-stage-all').addEventListener('click', async () => {
  if (!currentRootPath) return;
  await window.bertoAPI.git.add(currentRootPath, '.');
  refreshGitStatus();
});
document.getElementById('git-commit-btn').addEventListener('click', async () => {
  if (!currentRootPath) return;
  const msg = document.getElementById('commit-message').value.trim();
  if (!msg) return alert('Enter a commit message.');
  const res = await window.bertoAPI.git.commit(currentRootPath, msg);
  if (res.success) {
    document.getElementById('commit-message').value = '';
    refreshGitStatus();
  } else {
    alert(res.error);
  }
});
document.getElementById('git-push-btn').addEventListener('click', async () => {
  const res = await window.bertoAPI.git.push(currentRootPath);
  alert(res.success ? 'Pushed successfully.' : `Push failed: ${res.error}`);
});
document.getElementById('git-pull-btn').addEventListener('click', async () => {
  const res = await window.bertoAPI.git.pull(currentRootPath);
  if (res.success) { alert('Pulled successfully.'); fileTree.refresh(); }
  else alert(`Pull failed: ${res.error}`);
});

async function refreshGitStatus() {
  const listEl = document.getElementById('git-status-list');
  const branchEl = document.getElementById('status-branch');
  if (!currentRootPath) { listEl.innerHTML = ''; branchEl.textContent = ''; return; }
  const res = await window.bertoAPI.git.status(currentRootPath);
  if (!res.success || !res.isRepo) {
    listEl.innerHTML = '<p style="font-size:11px;color:var(--text-muted)">Not a Git repository.</p>';
    branchEl.textContent = '';
    return;
  }
  branchEl.textContent = `⎇ ${res.status.current || 'main'}`;
  listEl.innerHTML = '';
  const files = [...res.status.not_added.map(f => ({ f, code: 'U' })),
                  ...res.status.modified.map(f => ({ f, code: 'M' })),
                  ...res.status.created.map(f => ({ f, code: 'A' })),
                  ...res.status.deleted.map(f => ({ f, code: 'D' }))];
  for (const { f, code } of files) {
    const row = document.createElement('div');
    row.className = 'git-status-row';
    row.innerHTML = `<span class="git-status-code">${code}</span><span>${f}</span>`;
    listEl.appendChild(row);
  }
}

// ---------- Extensions panel ----------
const extSearchInput = document.getElementById('ext-search-input');
let extSearchTimeout;
extSearchInput.addEventListener('input', () => {
  clearTimeout(extSearchTimeout);
  extSearchTimeout = setTimeout(runExtensionSearch, 400);
});

async function runExtensionSearch() {
  const query = extSearchInput.value.trim();
  const resultsEl = document.getElementById('ext-search-results');
  if (!query) { resultsEl.innerHTML = ''; return; }
  resultsEl.innerHTML = '<div style="padding:8px;font-size:11px;color:var(--text-muted)">Searching Open VSX...</div>';
  const res = await window.bertoAPI.extensions.search(query);
  resultsEl.innerHTML = '';
  if (!res.success) {
    resultsEl.innerHTML = `<div style="padding:8px;color:#ff6b6b;font-size:11px;">${res.error}</div>`;
    return;
  }
  for (const ext of res.results) {
    const div = document.createElement('div');
    div.className = 'ext-item';
    div.innerHTML = `
      <div class="ext-item-header">
        <span class="ext-item-name">${ext.displayName}</span>
        <button data-id="${ext.id}">Install</button>
      </div>
      <div class="ext-item-desc">${ext.publisher} · v${ext.version} · ${ext.description || ''}</div>
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
        alert(installRes.error);
      }
    });
    resultsEl.appendChild(div);
  }
}

document.getElementById('ext-install-vsix-btn').addEventListener('click', async () => {
  const files = await window.bertoAPI.openFileDialog();
  if (!files || !files.length) return;
  const vsixPath = files[0];
  if (!vsixPath.endsWith('.vsix')) return alert('Please select a .vsix file.');
  const res = await window.bertoAPI.extensions.install(vsixPath);
  if (res.success) {
    alert(`Installed: ${res.extension.displayName}`);
    loadInstalledExtensions();
  } else {
    alert(`Install failed: ${res.error}`);
  }
});

async function loadInstalledExtensions() {
  const listEl = document.getElementById('ext-installed-list');
  const res = await window.bertoAPI.extensions.list();
  const countEl = document.getElementById('status-extensions-count');
  listEl.innerHTML = '';
  if (!res.success) return;
  countEl.textContent = `🧩 ${res.extensions.length}`;
  for (const ext of res.extensions) {
    const div = document.createElement('div');
    div.className = 'ext-item';
    const badges = [
      ...(ext.supported || []).map(s => `<span class="ext-badge">${s.type}</span>`),
      ...(ext.partial || []).map(p => `<span class="ext-badge partial">${p.type} (partial)</span>`)
    ].join('');
    div.innerHTML = `
      <div class="ext-item-header">
        <span class="ext-item-name">${ext.displayName || ext.id}</span>
        <button data-action="uninstall" data-id="${ext.id}">Remove</button>
      </div>
      <div class="ext-item-desc">${ext.description || ''}</div>
      <div>${badges}</div>
    `;
    div.querySelector('button').addEventListener('click', async () => {
      if (confirm(`Remove extension "${ext.displayName}"?`)) {
        await window.bertoAPI.extensions.uninstall(ext.id);
        loadInstalledExtensions();
      }
    });
    listEl.appendChild(div);
  }
}

// ---------- AI Assistant panel ----------
const aiMessages = document.getElementById('ai-chat-messages');
let aiHistory = [];

async function checkAIConfig() {
  const cfg = await window.bertoAPI.ai.getConfig();
  const banner = document.getElementById('ai-config-banner');
  if (!cfg.configuredProviders || cfg.configuredProviders.length === 0) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

document.getElementById('ai-save-key-btn').addEventListener('click', async () => {
  const provider = document.getElementById('ai-provider-select').value;
  const key = document.getElementById('ai-key-input').value.trim();
  if (!key) return alert('Enter an API key.');
  const res = await window.bertoAPI.ai.setApiKey(provider, key);
  if (res.success) {
    document.getElementById('ai-key-input').value = '';
    checkAIConfig();
  }
});

function appendAIMessage(role, text) {
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.textContent = text;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

async function sendAIMessage(promptOverride) {
  const input = document.getElementById('ai-chat-input');
  const text = promptOverride || input.value.trim();
  if (!text) return;
  appendAIMessage('user', text);
  aiHistory.push({ role: 'user', content: text });
  input.value = '';

  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'ai-msg assistant';
  thinkingDiv.textContent = 'Thinking...';
  aiMessages.appendChild(thinkingDiv);
  aiMessages.scrollTop = aiMessages.scrollHeight;

  const res = await window.bertoAPI.ai.chat(aiHistory);
  thinkingDiv.remove();
  if (res.success) {
    appendAIMessage('assistant', res.text);
    aiHistory.push({ role: 'assistant', content: res.text });
  } else {
    appendAIMessage('assistant', `⚠️ ${res.error}`);
  }
}

document.getElementById('ai-send-btn').addEventListener('click', () => sendAIMessage());
document.getElementById('ai-chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAIMessage();
  }
});
document.getElementById('ai-explain-btn').addEventListener('click', () => {
  const selection = editorManager?.getSelection();
  if (!selection) return alert('Select some code in the editor first.');
  sendAIMessage(`Explain this code:\n\n${selection}`);
});
document.getElementById('ai-fix-btn').addEventListener('click', () => {
  const selection = editorManager?.getSelection();
  if (!selection) return alert('Select some code in the editor first.');
  const errMsg = prompt('Describe the error/issue (optional):') || 'unspecified issue';
  sendAIMessage(`Fix this code. Issue: "${errMsg}"\n\n${selection}`);
});

// ---------- Collaboration panel ----------
document.getElementById('collab-start-btn').addEventListener('click', async () => {
  const res = await window.bertoAPI.collab.startSession({});
  if (res.success) {
    document.getElementById('collab-session-info').classList.remove('hidden');
    document.getElementById('collab-session-id').textContent = res.sessionId;
    document.getElementById('collab-indicator').classList.remove('hidden');
    document.getElementById('collab-leave-btn').classList.remove('hidden');
  } else {
    alert(res.error);
  }
});
document.getElementById('collab-join-btn').addEventListener('click', async () => {
  const address = document.getElementById('collab-address-input').value.trim();
  if (!address) return alert('Enter a session address, e.g. ws://192.168.1.10:5577');
  const res = await window.bertoAPI.collab.joinSession('joined', { address });
  if (res.success) {
    document.getElementById('collab-indicator').classList.remove('hidden');
    document.getElementById('collab-leave-btn').classList.remove('hidden');
  } else {
    alert(res.error);
  }
});
document.getElementById('collab-leave-btn').addEventListener('click', async () => {
  await window.bertoAPI.collab.leaveSession();
  document.getElementById('collab-indicator').classList.add('hidden');
  document.getElementById('collab-session-info').classList.add('hidden');
  document.getElementById('collab-leave-btn').classList.add('hidden');
  document.getElementById('collab-peers-list').innerHTML = '';
});

window.bertoAPI.collab.onPeerJoined(({ id }) => {
  const row = document.createElement('div');
  row.className = 'peer-row';
  row.dataset.peer = id;
  row.innerHTML = `<span class="peer-dot"></span><span>Peer-${id}</span>`;
  document.getElementById('collab-peers-list').appendChild(row);
});
window.bertoAPI.collab.onPeerLeft(({ id }) => {
  document.querySelector(`.peer-row[data-peer="${id}"]`)?.remove();
});
window.bertoAPI.collab.onRemoteEdit(({ edit }) => {
  if (editorManager && editorManager.activePath) {
    editorManager.applyRemoteEdit(editorManager.activePath, edit);
  }
});

let lastCursorSend = 0;
function sendCollabCursor(line, column) {
  const now = Date.now();
  if (now - lastCursorSend < 150) return;
  lastCursorSend = now;
  window.bertoAPI.collab.sendEdit({ __cursor: true, line, column }).catch(() => {});
}

// ---------- Settings ----------
document.getElementById('theme-select').addEventListener('change', (e) => {
  editorManager?.setTheme(e.target.value);
});
document.getElementById('font-size-slider').addEventListener('input', (e) => {
  document.getElementById('font-size-value').textContent = `${e.target.value}px`;
  editorManager?.updateOptions({ fontSize: parseInt(e.target.value, 10) });
});
document.getElementById('word-wrap-toggle').addEventListener('change', (e) => {
  editorManager?.updateOptions({ wordWrap: e.target.checked ? 'on' : 'off' });
});
document.getElementById('minimap-toggle').addEventListener('change', (e) => {
  editorManager?.updateOptions({ minimap: { enabled: e.target.checked } });
});

// ---------- Terminal panel ----------
const panelContainer = document.getElementById('panel-container');
document.getElementById('panel-close-btn').addEventListener('click', () => {
  panelContainer.classList.add('collapsed');
});
document.querySelectorAll('.panel-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel-view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
  });
});

async function toggleTerminalPanel() {
  panelContainer.classList.toggle('collapsed');
  if (!panelContainer.classList.contains('collapsed') && !currentTermId) {
    terminalManager = new TerminalManager(document.getElementById('panel-terminal'));
    currentTermId = await terminalManager.createTerminal(currentRootPath);
  }
  setTimeout(() => terminalManager?.fitActive(), 50);
}

// ---------- Command palette setup ----------
function buildCommands() {
  return [
    { id: 'save', label: 'File: Save', shortcut: 'Ctrl+S', run: saveActiveFile },
    { id: 'open-folder', label: 'File: Open Folder', shortcut: 'Ctrl+Shift+O', run: async () => { const f = await window.bertoAPI.openFolderDialog(); if (f) openFolder(f); } },
    { id: 'new-file', label: 'File: New File', run: createNewFileFlow },
    { id: 'toggle-terminal', label: 'View: Toggle Terminal', shortcut: 'Ctrl+`', run: toggleTerminalPanel },
    { id: 'toggle-sidebar', label: 'View: Toggle Sidebar', shortcut: 'Ctrl+B', run: () => document.getElementById('sidebar').classList.toggle('hidden') },
    { id: 'ai-panel', label: 'View: Show AI Assistant', run: () => document.querySelector('.activity-btn[data-view="ai"]').click() },
    { id: 'ext-panel', label: 'View: Show Extensions', run: () => document.querySelector('.activity-btn[data-view="extensions"]').click() },
    { id: 'collab-panel', label: 'View: Show Live Collaboration', run: () => document.querySelector('.activity-btn[data-view="collab"]').click() },
    { id: 'git-panel', label: 'View: Show Source Control', run: () => document.querySelector('.activity-btn[data-view="git"]').click() }
  ];
}

// ---------- Keyboard shortcuts ----------
window.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === 's') { e.preventDefault(); saveActiveFile(); }
  if (ctrl && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); commandPalette?.open(); }
  if (ctrl && e.key === '`') { e.preventDefault(); toggleTerminalPanel(); }
  if (ctrl && e.key.toLowerCase() === 'b') { e.preventDefault(); document.getElementById('sidebar').classList.toggle('hidden'); }
  if (ctrl && e.key.toLowerCase() === 'w') {
    e.preventDefault();
    if (editorManager?.activePath) closeFile(editorManager.activePath);
  }
});

// ---------- Menu actions from main process ----------
window.bertoAPI.onMenuAction(async (action) => {
  switch (action) {
    case 'new-file': createNewFileFlow(); break;
    case 'open-file': {
      const files = await window.bertoAPI.openFileDialog();
      for (const f of files) openFile(f);
      break;
    }
    case 'open-folder': {
      const folder = await window.bertoAPI.openFolderDialog();
      if (folder) openFolder(folder);
      break;
    }
    case 'save': saveActiveFile(); break;
    case 'close-tab': if (editorManager?.activePath) closeFile(editorManager.activePath); break;
    case 'command-palette': commandPalette?.open(); break;
    case 'toggle-sidebar': document.getElementById('sidebar').classList.toggle('hidden'); break;
    case 'toggle-terminal': toggleTerminalPanel(); break;
    case 'toggle-ai': document.querySelector('.activity-btn[data-view="ai"]').click(); break;
    case 'open-extensions': document.querySelector('.activity-btn[data-view="extensions"]').click(); break;
    case 'install-vsix': document.getElementById('ext-install-vsix-btn').click(); break;
    case 'collab-start': document.getElementById('collab-start-btn').click(); break;
    case 'collab-leave': document.getElementById('collab-leave-btn').click(); break;
    case 'about': alert('Berto IDE\nA VS Code–extension-compatible editor with a built-in AI assistant and live collaboration.'); break;
  }
});

// ---------- Init ----------
async function initApp() {
  await initFileTree();
  commandPalette = new CommandPalette(
    document.getElementById('command-palette-overlay'),
    document.getElementById('command-palette-input'),
    document.getElementById('command-palette-results'),
    buildCommands()
  );
  loadInstalledExtensions();
  checkAIConfig();

  const version = await window.bertoAPI.getVersion();
  console.log(`Berto IDE v${version} ready.`);
}
