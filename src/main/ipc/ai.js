const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { app, safeStorage } = require('electron');

function getConfigFile() {
  return path.join(app.getPath('userData'), 'settings', 'ai.json');
}

async function loadConfig() {
  try {
    const raw = await fsp.readFile(getConfigFile(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { provider: 'anthropic', keys: {} };
  }
}

async function saveConfig(config) {
  const file = getConfigFile();
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify(config, null, 2));
}

function encryptKey(key) {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(key).toString('base64');
  }
  return Buffer.from(key).toString('base64'); // fallback, not secure
}

function decryptKey(encoded) {
  const buf = Buffer.from(encoded, 'base64');
  if (safeStorage.isEncryptionAvailable()) {
    try { return safeStorage.decryptString(buf); } catch { return buf.toString('utf-8'); }
  }
  return buf.toString('utf-8');
}

const PROVIDER_ENDPOINTS = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    buildBody: (messages, model) => ({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    }),
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }),
    extractText: (data) => (data.content || []).map(c => c.text || '').join('\n')
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    buildBody: (messages, model) => ({
      model: model || 'gpt-4o-mini',
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    }),
    headers: (key) => ({ Authorization: `Bearer ${key}`, 'content-type': 'application/json' }),
    extractText: (data) => data.choices?.[0]?.message?.content || ''
  }
};

async function callProvider(provider, apiKey, messages, model) {
  const cfg = PROVIDER_ENDPOINTS[provider];
  if (!cfg) throw new Error(`Unsupported provider: ${provider}`);
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: cfg.headers(apiKey),
    body: JSON.stringify(cfg.buildBody(messages, model))
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Provider error (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return cfg.extractText(data);
}

function registerAIHandlers(ipcMain) {
  ipcMain.handle('ai:setApiKey', async (_e, provider, key) => {
    try {
      const config = await loadConfig();
      config.keys = config.keys || {};
      config.keys[provider] = encryptKey(key);
      config.provider = provider;
      await saveConfig(config);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ai:getConfig', async () => {
    const config = await loadConfig();
    return {
      provider: config.provider,
      configuredProviders: Object.keys(config.keys || {})
    };
  });

  ipcMain.handle('ai:chat', async (_e, messages, opts = {}) => {
    try {
      const config = await loadConfig();
      const provider = opts.provider || config.provider || 'anthropic';
      const encKey = config.keys?.[provider];
      if (!encKey) {
        return { success: false, error: `No API key configured for "${provider}". Add one in Settings > AI Assistant.` };
      }
      const apiKey = decryptKey(encKey);
      const text = await callProvider(provider, apiKey, messages, opts.model);
      return { success: true, text };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ai:explainCode', async (_e, code, lang) => {
    try {
      const config = await loadConfig();
      const provider = config.provider || 'anthropic';
      const encKey = config.keys?.[provider];
      if (!encKey) return { success: false, error: 'No API key configured.' };
      const apiKey = decryptKey(encKey);
      const messages = [{ role: 'user', content: `Explain this ${lang} code concisely:\n\n${code}` }];
      const text = await callProvider(provider, apiKey, messages);
      return { success: true, text };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ai:fixCode', async (_e, code, lang, error) => {
    try {
      const config = await loadConfig();
      const provider = config.provider || 'anthropic';
      const encKey = config.keys?.[provider];
      if (!encKey) return { success: false, error: 'No API key configured.' };
      const apiKey = decryptKey(encKey);
      const messages = [{
        role: 'user',
        content: `This ${lang} code has an error: "${error}".\n\nCode:\n${code}\n\nProvide a corrected version and explain the fix briefly.`
      }];
      const text = await callProvider(provider, apiKey, messages);
      return { success: true, text };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerAIHandlers };
