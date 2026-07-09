const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { app } = require('electron');
const unzipper = require('unzipper');

function getExtensionsDir() {
  return path.join(app.getPath('userData'), 'extensions');
}

function getSettingsFile() {
  return path.join(app.getPath('userData'), 'settings', 'extensions.json');
}

async function loadExtensionSettings() {
  const file = getSettingsFile();
  try {
    const raw = await fsp.readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveExtensionSettings(settings) {
  const file = getSettingsFile();
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify(settings, null, 2));
}

/**
 * Extract a .vsix (which is just a zip file) into the extensions directory.
 * VS Code extensions store their real files under an "extension/" folder inside the vsix.
 */
async function extractVsix(vsixPath, destFolderName) {
  const extDir = getExtensionsDir();
  const targetPath = path.join(extDir, destFolderName);
  await fsp.mkdir(targetPath, { recursive: true });

  await new Promise((resolve, reject) => {
    fs.createReadStream(vsixPath)
      .pipe(unzipper.Parse())
      .on('entry', async (entry) => {
        const entryPath = entry.path;
        // VSIX contents live under "extension/*"
        if (entryPath.startsWith('extension/')) {
          const relative = entryPath.replace(/^extension\//, '');
          if (!relative) { entry.autodrain(); return; }
          const outPath = path.join(targetPath, relative);
          if (entry.type === 'Directory') {
            await fsp.mkdir(outPath, { recursive: true });
            entry.autodrain();
          } else {
            await fsp.mkdir(path.dirname(outPath), { recursive: true });
            entry.pipe(fs.createWriteStream(outPath));
          }
        } else {
          entry.autodrain();
        }
      })
      .on('close', resolve)
      .on('error', reject);
  });

  return targetPath;
}

async function readManifest(extFolderPath) {
  const pkgPath = path.join(extFolderPath, 'package.json');
  const raw = await fsp.readFile(pkgPath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Build a normalized capability descriptor from a VS Code extension manifest.
 * This tells the renderer what the extension actually provides so Berto IDE
 * can load themes / grammars / snippets / language configs directly, and
 * flag which "contributes" sections need a full VS Code Extension Host
 * (which Berto does not fully emulate) so the user gets an honest status.
 */
function analyzeManifest(manifest, extFolderPath) {
  const contributes = manifest.contributes || {};
  const supported = [];
  const partial = [];

  if (contributes.themes && contributes.themes.length) supported.push({ type: 'themes', items: contributes.themes });
  if (contributes.iconThemes && contributes.iconThemes.length) supported.push({ type: 'iconThemes', items: contributes.iconThemes });
  if (contributes.snippets && contributes.snippets.length) supported.push({ type: 'snippets', items: contributes.snippets });
  if (contributes.grammars && contributes.grammars.length) supported.push({ type: 'grammars', items: contributes.grammars });
  if (contributes.languages && contributes.languages.length) supported.push({ type: 'languages', items: contributes.languages });

  if (contributes.commands) partial.push({ type: 'commands', note: 'Commands are registered but require the extension activation function (Node API) to run.' });
  if (manifest.main) partial.push({ type: 'jsExtensionHost', note: 'This extension has a Node.js entry point. Berto IDE runs a lightweight compatible host for simple activation events; complex VS Code API usage may not be fully supported.' });
  if (contributes.debuggers) partial.push({ type: 'debuggers', note: 'Debugger contribution detected; requires Debug Adapter Protocol support.' });

  return {
    id: `${manifest.publisher || 'unknown'}.${manifest.name}`,
    displayName: manifest.displayName || manifest.name,
    description: manifest.description || '',
    version: manifest.version,
    publisher: manifest.publisher,
    engines: manifest.engines,
    main: manifest.main,
    supported,
    partial,
    folderPath: extFolderPath
  };
}

function registerExtensionHandlers(ipcMain, getWindow) {
  ipcMain.handle('ext:install', async (_e, vsixPath) => {
    try {
      const baseName = path.basename(vsixPath, '.vsix');
      const folderPath = await extractVsix(vsixPath, baseName);
      const manifest = await readManifest(folderPath);
      const info = analyzeManifest(manifest, folderPath);

      const settings = await loadExtensionSettings();
      settings[info.id] = { enabled: true, folderPath, installedAt: Date.now(), source: 'vsix' };
      await saveExtensionSettings(settings);

      return { success: true, extension: info };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Fetch extension metadata + VSIX download URL from the public Open VSX registry
  // (an open, non-Microsoft marketplace that serves real .vsix packages).
  ipcMain.handle('ext:installFromMarketplace', async (_e, extId) => {
    try {
      const [publisher, name] = extId.split('.');
      if (!publisher || !name) throw new Error('Extension id must be in the form publisher.name');

      const metaUrl = `https://open-vsx.org/api/${publisher}/${name}`;
      const metaRes = await fetch(metaUrl);
      if (!metaRes.ok) throw new Error(`Extension "${extId}" not found on Open VSX (${metaRes.status})`);
      const meta = await metaRes.json();

      const downloadUrl = meta.files && meta.files.download;
      if (!downloadUrl) throw new Error('No downloadable VSIX found for this extension');

      const tmpPath = path.join(app.getPath('temp'), `${name}-${Date.now()}.vsix`);
      const fileRes = await fetch(downloadUrl);
      const buf = Buffer.from(await fileRes.arrayBuffer());
      await fsp.writeFile(tmpPath, buf);

      const folderPath = await extractVsix(tmpPath, `${publisher}.${name}`);
      const manifest = await readManifest(folderPath);
      const info = analyzeManifest(manifest, folderPath);

      const settings = await loadExtensionSettings();
      settings[info.id] = { enabled: true, folderPath, installedAt: Date.now(), source: 'open-vsx' };
      await saveExtensionSettings(settings);

      await fsp.unlink(tmpPath).catch(() => {});

      return { success: true, extension: info };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ext:search', async (_e, query) => {
    try {
      const url = `https://open-vsx.org/api/-/search?query=${encodeURIComponent(query)}&size=20`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      const results = (data.extensions || []).map(e => ({
        id: `${e.namespace}.${e.name}`,
        displayName: e.displayName || e.name,
        description: e.description,
        version: e.version,
        publisher: e.namespace,
        downloads: e.downloadCount,
        averageRating: e.averageRating
      }));
      return { success: true, results };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ext:uninstall', async (_e, extId) => {
    try {
      const settings = await loadExtensionSettings();
      const entry = settings[extId];
      if (entry && entry.folderPath) {
        await fsp.rm(entry.folderPath, { recursive: true, force: true });
      }
      delete settings[extId];
      await saveExtensionSettings(settings);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ext:list', async () => {
    try {
      const settings = await loadExtensionSettings();
      const list = [];
      for (const [id, entry] of Object.entries(settings)) {
        try {
          const manifest = await readManifest(entry.folderPath);
          const info = analyzeManifest(manifest, entry.folderPath);
          list.push({ ...info, enabled: entry.enabled, source: entry.source });
        } catch (e) {
          list.push({ id, error: 'Failed to load manifest: ' + e.message, enabled: false });
        }
      }
      return { success: true, extensions: list };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ext:toggle', async (_e, extId, enabled) => {
    const settings = await loadExtensionSettings();
    if (settings[extId]) {
      settings[extId].enabled = enabled;
      await saveExtensionSettings(settings);
    }
    return { success: true };
  });

  ipcMain.handle('ext:getManifest', async (_e, extId) => {
    try {
      const settings = await loadExtensionSettings();
      const entry = settings[extId];
      if (!entry) throw new Error('Extension not installed');
      const manifest = await readManifest(entry.folderPath);
      return { success: true, manifest, folderPath: entry.folderPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerExtensionHandlers };
