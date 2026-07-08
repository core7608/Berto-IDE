// xterm and xterm-addon-fit are loaded as classic <script> tags in index.html
// (they are UMD bundles, not ES modules), exposing window.Terminal and
// window.FitAddon.FitAddon globally.
const Terminal = window.Terminal;
const FitAddon = window.FitAddon.FitAddon;

export class TerminalManager {
  constructor(containerEl) {
    this.container = containerEl;
    this.terminals = new Map(); // id -> { term, fitAddon }
    this.activeId = null;

    window.bertoAPI.terminal.onData(({ id, data }) => {
      const entry = this.terminals.get(id);
      if (entry) entry.term.write(data);
    });

    window.bertoAPI.terminal.onExit(({ id }) => {
      const entry = this.terminals.get(id);
      if (entry) {
        entry.term.dispose();
        this.terminals.delete(id);
      }
    });
  }

  async createTerminal(cwd) {
    const result = await window.bertoAPI.terminal.create(cwd);
    if (!result.success) {
      const div = document.createElement('div');
      div.style.cssText = 'padding:12px;color:#ff6b6b;font-family:monospace;font-size:12px;';
      div.textContent = result.error || 'Failed to start terminal.';
      this.container.appendChild(div);
      return null;
    }

    const term = new Terminal({
      theme: {
        background: '#161a20',
        foreground: '#e6e8eb',
        cursor: '#ff9d4d',
        selectionBackground: '#2a3441'
      },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      cursorBlink: true
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%;height:100%;';
    this.container.appendChild(wrapper);
    term.open(wrapper);
    fitAddon.fit();

    term.onData((data) => {
      window.bertoAPI.terminal.write(result.id, data);
    });

    term.onResize(({ cols, rows }) => {
      window.bertoAPI.terminal.resize(result.id, cols, rows);
    });

    this.terminals.set(result.id, { term, fitAddon, wrapper });
    this.activeId = result.id;

    window.addEventListener('resize', () => fitAddon.fit());

    return result.id;
  }

  fitActive() {
    if (this.activeId) {
      const entry = this.terminals.get(this.activeId);
      if (entry) entry.fitAddon.fit();
    }
  }
}
