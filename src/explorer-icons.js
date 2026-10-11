// Local SVGs keep controls consistent without depending on an icon font.
const paths = {
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  map: '<path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3ZM9 3v15m6-12v15"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7.5 7.5h.01M16.5 7.5h.01M12 12h.01M7.5 16.5h.01M16.5 16.5h.01" stroke-width="3"/>',
  version: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  seed: '<path d="M12 21v-9m0 3C5 15 3 11 3 5c6 0 9 3 9 7m0 0c0-5 3-8 9-8 0 6-3 9-9 9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  reset: '<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><circle cx="12" cy="12" r="1"/>',
  pin: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1.8 1.8 0 0 1 1-3.3h2a4 4 0 0 0 4-4c0-4-4-7-9-7Z"/><path d="M7 10h.01M10 7h.01M15 7h.01" stroke-width="3"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
};
export function icon(name, className = '') {
  return `<svg class="explorer-icon ${className}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] ?? paths.map}</svg>`;
}
