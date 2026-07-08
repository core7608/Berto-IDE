// Command Palette: fuzzy-searchable list of commands and quick file open.

export class CommandPalette {
  constructor(overlayEl, inputEl, resultsEl, commands) {
    this.overlay = overlayEl;
    this.input = inputEl;
    this.results = resultsEl;
    this.commands = commands; // [{ id, label, shortcut, run }]
    this.filtered = [];
    this.highlightedIndex = 0;

    this.input.addEventListener('input', () => this._filter());
    this.input.addEventListener('keydown', (e) => this._onKeyDown(e));
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  }

  open() {
    this.overlay.classList.remove('hidden');
    this.input.value = '';
    this.input.focus();
    this._filter();
  }

  close() {
    this.overlay.classList.add('hidden');
  }

  isOpen() {
    return !this.overlay.classList.contains('hidden');
  }

  _filter() {
    const query = this.input.value.toLowerCase();
    this.filtered = this.commands.filter(c => c.label.toLowerCase().includes(query));
    this.highlightedIndex = 0;
    this._render();
  }

  _render() {
    this.results.innerHTML = '';
    this.filtered.forEach((cmd, idx) => {
      const row = document.createElement('div');
      row.className = 'cp-result' + (idx === this.highlightedIndex ? ' highlighted' : '');
      row.innerHTML = `<span>${cmd.label}</span>` + (cmd.shortcut ? `<span class="cp-result-shortcut">${cmd.shortcut}</span>` : '');
      row.addEventListener('click', () => {
        this.close();
        cmd.run();
      });
      this.results.appendChild(row);
    });
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') { this.close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filtered.length - 1);
      this._render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
      this._render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = this.filtered[this.highlightedIndex];
      if (cmd) {
        this.close();
        cmd.run();
      }
    }
  }
}
