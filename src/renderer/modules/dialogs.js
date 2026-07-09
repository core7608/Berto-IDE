// Professional modal + toast notification system.
// Replaces native alert()/prompt()/confirm() which look out of place
// in a desktop IDE and (in Electron) block the whole renderer thread.

let modalOverlay, modalTitle, modalBody, modalActions;
let toastContainer;

export function initDialogs() {
  modalOverlay = document.getElementById('modal-overlay');
  modalTitle = document.getElementById('modal-title');
  modalBody = document.getElementById('modal-body');
  modalActions = document.getElementById('modal-actions');

  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  document.body.appendChild(toastContainer);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalBody.innerHTML = '';
  modalActions.innerHTML = '';
}

/** Simple confirmation dialog. Returns a Promise<boolean>. */
export function confirmDialog(title, message, confirmLabel = 'Confirm') {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalBody.innerHTML = '';
    const p = document.createElement('p');
    p.style.margin = '0';
    p.textContent = message;
    modalBody.appendChild(p);

    modalActions.innerHTML = '';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => { closeModal(); resolve(false); });

    const okBtn = document.createElement('button');
    okBtn.className = 'primary';
    okBtn.textContent = confirmLabel;
    okBtn.addEventListener('click', () => { closeModal(); resolve(true); });

    modalActions.appendChild(cancelBtn);
    modalActions.appendChild(okBtn);
    modalOverlay.classList.remove('hidden');
    okBtn.focus();
  });
}

/** Single text-input dialog. Returns a Promise<string|null>. */
export function promptDialog(title, placeholder = '', defaultValue = '') {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalBody.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.value = defaultValue;
    modalBody.appendChild(input);

    const submit = () => { closeModal(); resolve(input.value.trim() || null); };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') { closeModal(); resolve(null); }
    });

    modalActions.innerHTML = '';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => { closeModal(); resolve(null); });

    const okBtn = document.createElement('button');
    okBtn.className = 'primary';
    okBtn.textContent = 'OK';
    okBtn.addEventListener('click', submit);

    modalActions.appendChild(cancelBtn);
    modalActions.appendChild(okBtn);
    modalOverlay.classList.remove('hidden');
    setTimeout(() => { input.focus(); input.select(); }, 0);
  });
}

/**
 * A small menu of choices (replaces the old prompt()-based context menu).
 * Returns a Promise<string|null> resolving to the chosen action id.
 */
export function choiceDialog(title, choices) {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalBody.innerHTML = '';
    modalActions.innerHTML = '';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => { closeModal(); resolve(null); });
    modalActions.appendChild(cancelBtn);

    for (const choice of choices) {
      const btn = document.createElement('button');
      btn.textContent = choice.label;
      if (choice.primary) btn.className = 'primary';
      btn.addEventListener('click', () => { closeModal(); resolve(choice.id); });
      modalActions.appendChild(btn);
    }

    modalOverlay.classList.remove('hidden');
  });
}

/** Non-blocking toast notification. type: 'info' | 'success' | 'error' */
export function toast(message, type = 'info', durationMs = 4000) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  toastContainer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 200);
  }, durationMs);
}
