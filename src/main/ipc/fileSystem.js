const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const chokidar = require('chokidar');

const watchers = new Map();

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'release', '.next', '__pycache__']);

async function buildTree(dirPath, depth = 0, maxDepth = 6) {
  const stat = await fsp.stat(dirPath);
  const name = path.basename(dirPath);
  if (!stat.isDirectory()) {
    return { name, path: dirPath, type: 'file', size: stat.size };
  }
  if (depth >= maxDepth) {
    return { name, path: dirPath, type: 'folder', children: [] };
  }
  let entries = [];
  try {
    entries = await fsp.readdir(dirPath, { withFileTypes: true });
  } catch (e) {
    return { name, path: dirPath, type: 'folder', children: [], error: e.message };
  }
  const children = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.gitignore' && entry.name !== '.env') continue;
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      children.push({ name: entry.name, path: fullPath, type: 'folder', lazy: true });
    } else {
      let size = 0;
      try { size = (await fsp.stat(fullPath)).size; } catch {}
      children.push({ name: entry.name, path: fullPath, type: 'file', size });
    }
  }
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { name, path: dirPath, type: 'folder', children };
}

function registerFileHandlers(ipcMain, getWindow) {
  ipcMain.handle('fs:readDir', async (_e, dirPath) => {
    try {
      return { success: true, tree: await buildTree(dirPath) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('fs:readFile', async (_e, filePath) => {
    try {
      const buffer = await fsp.readFile(filePath);
      // Detect if binary
      const isBinary = buffer.slice(0, 8000).includes(0);
      if (isBinary) {
        return { success: true, binary: true, base64: buffer.toString('base64') };
      }
      return { success: true, binary: false, content: buffer.toString('utf-8') };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('fs:writeFile', async (_e, filePath, content) => {
    try {
      await fsp.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('fs:createFile', async (_e, filePath) => {
    try {
      await fsp.writeFile(filePath, '', { flag: 'wx' });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('fs:createFolder', async (_e, folderPath) => {
    try {
      await fsp.mkdir(folderPath, { recursive: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('fs:rename', async (_e, oldPath, newPath) => {
    try {
      await fsp.rename(oldPath, newPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('fs:delete', async (_e, targetPath) => {
    try {
      await fsp.rm(targetPath, { recursive: true, force: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('fs:exists', async (_e, targetPath) => {
    try {
      await fsp.access(targetPath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('fs:watch', async (_e, dirPath) => {
    if (watchers.has(dirPath)) return { success: true };
    const watcher = chokidar.watch(dirPath, {
      ignored: (p) => {
        const base = path.basename(p);
        return IGNORED_DIRS.has(base);
      },
      ignoreInitial: true,
      depth: 8
    });
    watcher.on('all', (event, changedPath) => {
      const win = getWindow();
      if (win) win.webContents.send('fs:changed', { event, path: changedPath, root: dirPath });
    });
    watchers.set(dirPath, watcher);
    return { success: true };
  });

  ipcMain.handle('fs:unwatch', async (_e, dirPath) => {
    const watcher = watchers.get(dirPath);
    if (watcher) {
      await watcher.close();
      watchers.delete(dirPath);
    }
    return { success: true };
  });

  ipcMain.handle('fs:search', async (_e, rootPath, query, options = {}) => {
    const results = [];
    const maxResults = options.maxResults || 200;
    const exts = options.extensions;

    async function walk(dir) {
      if (results.length >= maxResults) return;
      let entries;
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch { return; }
      for (const entry of entries) {
        if (results.length >= maxResults) return;
        if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          if (options.fileNameOnly) {
            if (entry.name.toLowerCase().includes(query.toLowerCase())) {
              results.push({ path: fullPath, name: entry.name, match: 'filename' });
            }
          } else {
            if (exts && !exts.some(e => entry.name.endsWith(e))) continue;
            try {
              const content = await fsp.readFile(fullPath, 'utf-8');
              const lines = content.split('\n');
              lines.forEach((line, idx) => {
                if (results.length >= maxResults) return;
                if (line.toLowerCase().includes(query.toLowerCase())) {
                  results.push({ path: fullPath, name: entry.name, line: idx + 1, text: line.trim().slice(0, 200) });
                }
              });
            } catch {}
          }
        }
      }
    }
    await walk(rootPath);
    return { success: true, results };
  });
}

module.exports = { registerFileHandlers };
