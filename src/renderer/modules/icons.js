// Professional SVG icon set for Berto IDE — replaces all emoji.
// Each icon is a minimal, monochrome stroke/fill icon using currentColor,
// so it inherits the surrounding text color automatically (like Codicons).

const ICONS = {
  // ---- Activity bar ----
  files: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M9.5 1H3.5A1.5 1.5 0 0 0 2 2.5v11A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V5.5L9.5 1Zm0 1.5L12.5 6H10a.5.5 0 0 1-.5-.5V2.5ZM3.5 2h5v3.5A1.5 1.5 0 0 0 10 7h3v6.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5Z"/></svg>',
  search: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M11.02 9.98a5 5 0 1 0-1.04 1.04l3.5 3.5 1.04-1.04-3.5-3.5ZM6.5 10.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/></svg>',
  branch: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M5 2.5A1.5 1.5 0 1 1 3.5 4v1.6c0 .6.4 1.1.9 1.3l2.1.9a2.5 2.5 0 0 0 1-.05V4a1.5 1.5 0 1 1 1 0v3.35a2.5 2.5 0 1 1-2 4.42V13.5a1.5 1.5 0 1 1-1 0v-1.85a2.6 2.6 0 0 1-1.5-2.15V5.5A1.5 1.5 0 0 1 5 2.5Zm7.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/></svg>',
  extensions: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M10 1.5a1.5 1.5 0 0 0-3 0V2H3.5A1.5 1.5 0 0 0 2 3.5V7h.5a1.5 1.5 0 0 1 0 3H2v3.5A1.5 1.5 0 0 0 3.5 15H7v-.5a1.5 1.5 0 0 1 3 0v.5h3.5a1.5 1.5 0 0 0 1.5-1.5V10h-.5a1.5 1.5 0 0 1 0-3h.5V3.5A1.5 1.5 0 0 0 12.5 2H10V1.5Z"/></svg>',
  assistant: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M8 1.5 9.2 5 12.7 6.2 9.2 7.4 8 10.9 6.8 7.4 3.3 6.2 6.8 5 8 1.5Zm4.7 7.3.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7Zm-8.9.5.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z"/></svg>',
  collab: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M5.5 7A2.25 2.25 0 1 0 5.5 2.5 2.25 2.25 0 0 0 5.5 7Zm5-.25a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5.5 8c-2 0-4 1.02-4 2.5V12h8v-1.5C9.5 9.02 7.5 8 5.5 8Zm5.13.06c1.66.2 3.37 1.1 3.37 2.44V12h-2v-1.5c0-.9-.42-1.68-1.37-2.44Z"/></svg>',
  settings: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M9.1 1 9.4 2.6a5.4 5.4 0 0 1 1.3.75l1.55-.5.9 1.55-1.2 1.1c.06.25.1.5.1.75s-.04.5-.1.75l1.2 1.1-.9 1.55-1.55-.5c-.4.32-.83.57-1.3.75L9.1 11h-1.8l-.3-1.6a5.4 5.4 0 0 1-1.3-.75l-1.55.5-.9-1.55 1.2-1.1A3.6 3.6 0 0 1 4.35 6c0-.25.04-.5.1-.75l-1.2-1.1.9-1.55 1.55.5c.4-.32.83-.57 1.3-.75L7.3 1h1.8ZM8 4.25A1.75 1.75 0 1 0 8 7.75 1.75 1.75 0 0 0 8 4.25Z"/></svg>',

  // ---- File explorer actions ----
  folderOpen: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M1.5 3A1.5 1.5 0 0 1 3 1.5h3.1c.4 0 .77.16 1.06.44l.9.9H13A1.5 1.5 0 0 1 14.5 4.34V5H3.2a1.2 1.2 0 0 0-1.16.9L1 10.2V3Zm.36 10.2 1.28-5.1A.6.6 0 0 1 3.72 7.7H14.4a.6.6 0 0 1 .58.76l-1.28 4.9a1.2 1.2 0 0 1-1.16.9H2.7a.6.6 0 0 1-.58-.75Z"/></svg>',
  newFile: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M9.5 1H3.5A1.5 1.5 0 0 0 2 2.5v11A1.5 1.5 0 0 0 3.5 15H8v-1H3.5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5h5V5.5A1.5 1.5 0 0 0 10 7h2.5v.5h1V5.5L9.5 1Zm.5 1.5L12.5 6H10a.5.5 0 0 1-.5-.5V2.5ZM12.5 9v2h2v1h-2v2h-1v-2h-2v-1h2V9h1Z"/></svg>',
  newFolder: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M1.5 3A1.5 1.5 0 0 1 3 1.5h3.1c.4 0 .77.16 1.06.44l.9.9H13A1.5 1.5 0 0 1 14.5 4.34V6h-1V4.5a.5.5 0 0 0-.5-.5H7.66L6.4 2.7a.4.4 0 0 0-.3-.2H3a.5.5 0 0 0-.5.5V13a.5.5 0 0 0 .5.5h4v1H3A1.5 1.5 0 0 1 1.5 13V3Zm10 5v2h2v1h-2v2h-1v-2h-2v-1h2V8h1Z"/></svg>',
  refresh: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M13.5 8a5.5 5.5 0 0 1-9.68 3.6L2.9 12.5v-3.2h3.2l-.98.98A4 4 0 0 0 12 8h1.5ZM2.5 8a5.5 5.5 0 0 1 9.68-3.6L13.1 3.5v3.2H9.9l.98-.98A4 4 0 0 0 4 8H2.5Z"/></svg>',
  collapseAll: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M3 3h10v1H3V3Zm2 3h6v1H5V6Zm-2 3h10v1H3V9Zm2 3h6v1H5v-1Z"/></svg>',

  // ---- File type icons (used inside the tree) ----
  fileGeneric: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M9.5 1.5H4A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8A1.5 1.5 0 0 0 13.5 13V5.5L9.5 1.5Zm0 1.41 2.59 2.59H10a.5.5 0 0 1-.5-.5V2.91Z"/></svg>',
  fileCode: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M9.5 1.5H4A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8A1.5 1.5 0 0 0 13.5 13V5.5L9.5 1.5Zm0 1.41 2.59 2.59H10a.5.5 0 0 1-.5-.5V2.91ZM6.4 8.2 5 9.5l1.4 1.3-.6.7L4 9.5l1.8-2 .6.7Zm3.2 0 .6-.7L11.9 9.5l-1.8 2-.6-.7L10.9 9.5l-1.3-1.3Z"/></svg>',
  fileConfig: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M9.5 1.5H4A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8A1.5 1.5 0 0 0 13.5 13V5.5L9.5 1.5Zm0 1.41 2.59 2.59H10a.5.5 0 0 1-.5-.5V2.91ZM8 7.2a1.3 1.3 0 0 1 1.26 1H10v.6h-.74a1.3 1.3 0 0 1-2.52 0H6v-.6h.74A1.3 1.3 0 0 1 8 7.2Zm0 .7a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2Z"/></svg>',
  fileImage: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M9.5 1.5H4A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8A1.5 1.5 0 0 0 13.5 13V5.5L9.5 1.5Zm0 1.41 2.59 2.59H10a.5.5 0 0 1-.5-.5V2.91ZM6 7.5a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm-1 4.5 1.6-2 1.2 1.5.7-.9L11 13H5Z"/></svg>',
  fileLock: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M9.5 1.5H4A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8A1.5 1.5 0 0 0 13.5 13V5.5L9.5 1.5Zm0 1.41 2.59 2.59H10a.5.5 0 0 1-.5-.5V2.91ZM8 7c.66 0 1.2.54 1.2 1.2v.4h.3v2.2H6.5V8.6h.3v-.4C6.8 7.54 7.34 7 8 7Zm0 .6c-.34 0-.6.26-.6.6v.4h1.2v-.4c0-.34-.26-.6-.6-.6Z"/></svg>',
  folder: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M1.5 3.5A1.5 1.5 0 0 1 3 2h3.1c.4 0 .77.16 1.06.44l.9.9H13A1.5 1.5 0 0 1 14.5 4.84v7.66A1.5 1.5 0 0 1 13 14H3a1.5 1.5 0 0 1-1.5-1.5v-9Z"/></svg>',
  folderOpenSm: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M1.5 3.5A1.5 1.5 0 0 1 3 2h3.1c.4 0 .77.16 1.06.44l.9.9H13a1.5 1.5 0 0 1 1.46 1.16H3.6a.9.9 0 0 0-.87.68L1.5 9.9V3.5Zm.5 9.3.9-3.9a1.5 1.5 0 0 1 1.46-1.16H14a.9.9 0 0 1 .87 1.12l-.98 3.9A1.5 1.5 0 0 1 12.42 14H2.87a.9.9 0 0 1-.87-1.2Z"/></svg>',

  // ---- Chevrons / carets ----
  chevronRight: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M6 3.5 10.5 8 6 12.5 5.3 11.8 9.1 8 5.3 4.2 6 3.5Z"/></svg>',
  chevronDown: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M3.5 6 8 10.5 12.5 6l-.7-.7L8 9.1 4.2 5.3 3.5 6Z"/></svg>',
  close: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M8 7.06 11.3 3.76l.94.94L8.94 8l3.3 3.3-.94.94L8 8.94l-3.3 3.3-.94-.94L7.06 8 3.76 4.7l.94-.94L8 7.06Z"/></svg>',
  ellipsis: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M4 8a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 4 8Zm5.25 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM14.5 8a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z"/></svg>',

  // ---- Live / status indicator ----
  broadcast: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M8 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-3.5 2a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Zm-2-4.2.8.8a5.9 5.9 0 0 0 0 6.8l-.8.8a7 7 0 0 1 0-8.4Zm11 0a7 7 0 0 1 0 8.4l-.8-.8a5.9 5.9 0 0 0 0-6.8l.8-.8Z"/></svg>',
  send: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M14 2 1.8 7.4a.5.5 0 0 0 .02.92L6.4 9.9l1.58 4.58a.5.5 0 0 0 .92.03L14 2Zm-1.2 1.9-4.6 8.35-1.1-3.2 3.9-3.9-4.62 3.32-2.9-1.14L12.8 3.9Z"/></svg>',

  // ---- Panel tabs ----
  terminal: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M1.5 3A1.5 1.5 0 0 1 3 1.5h10A1.5 1.5 0 0 1 14.5 3v10a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 13V3Zm1 .3v9.4a.2.2 0 0 0 .2.2h10.6a.2.2 0 0 0 .2-.2V3.3a.2.2 0 0 0-.2-.2H2.7a.2.2 0 0 0-.2.2ZM4.2 5.9l2.9 2.1-2.9 2.1-.6-.8L5.7 8 3.6 6.7l.6-.8ZM7.5 10h3v1h-3v-1Z"/></svg>',
  warning: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M8 1.5 15 13.5H1L8 1.5Zm0 2L2.8 12.5h10.4L8 3.5ZM7.5 6h1v4h-1V6Zm0 5h1v1h-1v-1Z"/></svg>',
  output: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M2 2.5h12v1H2v-1Zm1.5 2.8 2.3 2.2-2.3 2.2.7.7 3-2.9-3-2.9-.7.7Zm4.5 4.9h6v1H8v-1Z"/></svg>'
};

export function icon(name, size = 16) {
  const svg = ICONS[name] || ICONS.fileGeneric;
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
}

export function iconEl(name, size = 16) {
  const span = document.createElement('span');
  span.className = 'icon-svg';
  span.innerHTML = icon(name, size);
  return span;
}

export default ICONS;
