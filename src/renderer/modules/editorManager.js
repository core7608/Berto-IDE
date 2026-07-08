// Manages Monaco editor instances, open tabs, and file lifecycle.

const LANG_MAP = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cc: 'cpp',
  cs: 'csharp', php: 'php', swift: 'swift', kt: 'kotlin',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
  json: 'json', yml: 'yaml', yaml: 'yaml', xml: 'xml', md: 'markdown',
  sh: 'shell', bash: 'shell', sql: 'sql', dockerfile: 'dockerfile',
  vue: 'html', txt: 'plaintext'
};

function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return LANG_MAP[ext] || 'plaintext';
}

export class EditorManager {
  constructor(monacoInstance, containerEl) {
    this.monaco = monacoInstance;
    this.container = containerEl;
    this.models = new Map(); // filePath -> { model, viewState }
    this.openOrder = [];     // tab order
    this.activePath = null;
    this.editor = null;
    this.onDirtyChange = null;
    this.onActiveChange = null;
    this.onCursorChange = null;

    this._initEditor();
  }

  _initEditor() {
    this.editor = this.monaco.editor.create(this.container, {
      value: '',
      language: 'plaintext',
      theme: 'berto-dark',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
      fontLigatures: true,
      minimap: { enabled: true },
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      renderLineHighlight: 'all',
      scrollBeyondLastLine: false,
      padding: { top: 10 }
    });

    this.editor.onDidChangeCursorPosition((e) => {
      if (this.onCursorChange) {
        this.onCursorChange({ line: e.position.lineNumber, column: e.position.column });
      }
    });

    this.editor.onDidChangeModelContent(() => {
      if (this.activePath && this.onDirtyChange) {
        const entry = this.models.get(this.activePath);
        if (entry) {
          entry.dirty = true;
          this.onDirtyChange(this.activePath, true);
        }
      }
    });
  }

  hasFile(filePath) {
    return this.models.has(filePath);
  }

  openFile(filePath, content) {
    if (this.models.has(filePath)) {
      this.setActive(filePath);
      return;
    }
    const language = detectLanguage(filePath);
    const uri = this.monaco.Uri.file(filePath);
    const model = this.monaco.editor.createModel(content, language, uri);
    this.models.set(filePath, { model, viewState: null, dirty: false, language });
    this.openOrder.push(filePath);
    this.setActive(filePath);
  }

  setActive(filePath) {
    if (this.activePath && this.models.has(this.activePath)) {
      this.models.get(this.activePath).viewState = this.editor.saveViewState();
    }
    this.activePath = filePath;
    const entry = this.models.get(filePath);
    if (entry) {
      this.editor.setModel(entry.model);
      if (entry.viewState) this.editor.restoreViewState(entry.viewState);
      this.editor.focus();
    }
    if (this.onActiveChange) this.onActiveChange(filePath);
  }

  closeFile(filePath) {
    const entry = this.models.get(filePath);
    if (!entry) return;
    entry.model.dispose();
    this.models.delete(filePath);
    this.openOrder = this.openOrder.filter(p => p !== filePath);

    if (this.activePath === filePath) {
      const next = this.openOrder[this.openOrder.length - 1];
      if (next) this.setActive(next);
      else {
        this.activePath = null;
        this.editor.setModel(null);
        if (this.onActiveChange) this.onActiveChange(null);
      }
    }
  }

  getContent(filePath) {
    const entry = this.models.get(filePath);
    return entry ? entry.model.getValue() : null;
  }

  markSaved(filePath) {
    const entry = this.models.get(filePath);
    if (entry) {
      entry.dirty = false;
      if (this.onDirtyChange) this.onDirtyChange(filePath, false);
    }
  }

  isDirty(filePath) {
    const entry = this.models.get(filePath);
    return entry ? entry.dirty : false;
  }

  getSelection() {
    if (!this.editor) return '';
    const sel = this.editor.getSelection();
    return this.editor.getModel()?.getValueInRange(sel) || '';
  }

  setTheme(themeName) {
    this.monaco.editor.setTheme(themeName);
  }

  updateOptions(opts) {
    this.editor.updateOptions(opts);
  }

  applyRemoteEdit(filePath, edit) {
    const entry = this.models.get(filePath);
    if (!entry) return;
    entry.model.applyEdits([edit]);
  }
}

export function defineBertoThemes(monacoInstance) {
  monacoInstance.editor.defineTheme('berto-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6572', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff9d4d' },
      { token: 'string', foreground: '9ece6a' },
      { token: 'number', foreground: 'ff9e64' },
      { token: 'type', foreground: '5b9dff' },
      { token: 'function', foreground: 'b58aff' }
    ],
    colors: {
      'editor.background': '#161a20',
      'editor.foreground': '#e6e8eb',
      'editor.lineHighlightBackground': '#1c2128',
      'editorLineNumber.foreground': '#3d444d',
      'editorLineNumber.activeForeground': '#9099a6',
      'editor.selectionBackground': '#2a3441',
      'editorCursor.foreground': '#ff9d4d',
      'editorIndentGuide.background': '#1e242c',
      'editorWhitespace.foreground': '#22272e'
    }
  });
}

export { detectLanguage };
