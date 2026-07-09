// Renders and manages the file explorer tree.
import { icon } from './icons.js';

const EXT_ICON_MAP = {
  js: 'fileCode', jsx: 'fileCode', mjs: 'fileCode', cjs: 'fileCode',
  ts: 'fileCode', tsx: 'fileCode', py: 'fileCode', rb: 'fileCode',
  go: 'fileCode', rs: 'fileCode', java: 'fileCode', c: 'fileCode',
  cpp: 'fileCode', cs: 'fileCode', php: 'fileCode', html: 'fileCode',
  css: 'fileCode', scss: 'fileCode',
  json: 'fileConfig', yml: 'fileConfig', yaml: 'fileConfig', toml: 'fileConfig',
  png: 'fileImage', jpg: 'fileImage', jpeg: 'fileImage', svg: 'fileImage', gif: 'fileImage', webp: 'fileImage',
  env: 'fileLock', lock: 'fileLock', pem: 'fileLock', key: 'fileLock'
};

function iconNameFor(node) {
  if (node.type === 'folder') return node.__open ? 'folderOpenSm' : 'folder';
  const ext = node.name.includes('.') ? node.name.split('.').pop().toLowerCase() : '';
  return EXT_ICON_MAP[ext] || 'fileGeneric';
}

export class FileTree {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks; // { onOpenFile, onContextMenu }
    this.rootPath = null;
    this.rootNode = null;
    this.selectedPath = null;
  }

  async setRoot(rootPath) {
    this.rootPath = rootPath;
    const result = await window.bertoAPI.fs.readDir(rootPath);
    if (!result.success) {
      this.container.innerHTML = `<div style="padding:12px;color:#ff6b6b;font-size:12px;">${result.error}</div>`;
      return;
    }
    this.rootNode = result.tree;
    this.rootNode.__open = true;
    await window.bertoAPI.fs.watch(rootPath);
    this.render();
  }

  async refresh() {
    if (this.rootPath) await this.setRoot(this.rootPath);
  }

  async _loadChildren(node) {
    if (!node.lazy) return;
    const result = await window.bertoAPI.fs.readDir(node.path);
    if (result.success) {
      node.children = result.tree.children;
      delete node.lazy;
    }
  }

  render() {
    this.container.innerHTML = '';
    if (!this.rootNode) return;
    const list = this._renderNode(this.rootNode, 0);
    this.container.appendChild(list);
  }

  _renderNode(node, depth) {
    const wrapper = document.createElement('div');

    const row = document.createElement('div');
    row.className = 'tree-item';
    if (node.path === this.selectedPath) row.classList.add('selected');
    row.style.paddingLeft = `${6 + depth * 14}px`;
    row.dataset.path = node.path;
    row.dataset.type = node.type;

    const chevron = document.createElement('span');
    chevron.className = 'tree-chevron';
    if (node.type === 'folder') {
      chevron.innerHTML = icon(node.__open ? 'chevronDown' : 'chevronRight', 14);
    }
    row.appendChild(chevron);

    const iconSpan = document.createElement('span');
    iconSpan.className = 'tree-icon';
    iconSpan.innerHTML = icon(iconNameFor(node), 15);
    row.appendChild(iconSpan);

    const label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = node.name;
    row.appendChild(label);

    wrapper.appendChild(row);

    let childrenContainer = null;
    if (node.type === 'folder') {
      childrenContainer = document.createElement('div');
      childrenContainer.className = 'tree-children';
      if (node.__open) childrenContainer.classList.add('open');
      wrapper.appendChild(childrenContainer);

      row.addEventListener('click', async () => {
        node.__open = !node.__open;
        chevron.innerHTML = icon(node.__open ? 'chevronDown' : 'chevronRight', 14);
        iconSpan.innerHTML = icon(iconNameFor(node), 15);
        if (node.__open) {
          await this._loadChildren(node);
          childrenContainer.innerHTML = '';
          for (const child of node.children || []) {
            childrenContainer.appendChild(this._renderNode(child, depth + 1));
          }
          childrenContainer.classList.add('open');
        } else {
          childrenContainer.classList.remove('open');
        }
      });

      if (node.__open && node.children) {
        for (const child of node.children) {
          childrenContainer.appendChild(this._renderNode(child, depth + 1));
        }
      }
    } else {
      row.addEventListener('click', () => {
        this.selectedPath = node.path;
        this.container.querySelectorAll('.tree-item.selected').forEach(el => el.classList.remove('selected'));
        row.classList.add('selected');
        if (this.callbacks.onOpenFile) this.callbacks.onOpenFile(node.path);
      });
    }

    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.callbacks.onContextMenu) this.callbacks.onContextMenu(node, e.clientX, e.clientY);
    });

    return wrapper;
  }

  handleExternalChange(changedPath) {
    // Simple strategy: refresh whole tree on any change under root.
    // (Good enough for a first-class experience without excessive complexity.)
    this.refresh();
  }
}
