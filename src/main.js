import './style.css';
import { createHeaderNavigation } from './navigation.js';
import { createSeedExplorer } from './seed-explorer.js';
import { LANGUAGE_STORAGE_KEY, normalizePreference, resolveLanguage, translations } from './language.js';

let preference = 'auto';
let headerNavigation = null;
let seedExplorer = null;
function renderPage() {
  seedExplorer?.dispose();
  seedExplorer = null;
  const container = document.querySelector('main .page-container');
  if (container && location.hash === '#/seed-explorer') seedExplorer = createSeedExplorer(container);
  document.querySelectorAll('.navigation-link').forEach(link => {
    if (link.hash === location.hash && location.hash === '#/seed-explorer') link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
try {
  preference = normalizePreference(localStorage.getItem(LANGUAGE_STORAGE_KEY));
} catch {
  // Language selection also works when browser storage is unavailable.
}

function applyLanguage() {
  const language = resolveLanguage(preference, navigator.languages?.length ? navigator.languages : [navigator.language]);
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const text = translations[language][element.dataset.i18n];
    if (text) element.textContent = text;
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
    const text = translations[language][element.dataset.i18nAriaLabel];
    if (text) element.setAttribute('aria-label', text);
  });
  document.querySelectorAll('input[name="language"]').forEach(input => {
    input.checked = input.value === language;
  });
  const flag = document.getElementById('language-flag');
  if (flag) flag.src = `/flags/${language === 'de' ? 'de' : 'gb'}.svg`;
  const trigger = document.querySelector('.language-trigger');
  if (trigger) trigger.setAttribute('aria-label', `${translations[language].languageLabel}: ${language === 'de' ? 'Deutsch' : 'English'}`);
  headerNavigation?.refresh();
}

function initializeNavigation() {
  headerNavigation?.dispose();
  headerNavigation = createHeaderNavigation();
}

function onHtmlUpdated() {
  applyLanguage();
  initializeNavigation();
  renderPage();
}

function onLanguageSelect(event) {
  if (!event.target.matches('input[name="language"]')) return;
  preference = normalizePreference(event.target.value);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, preference);
  } catch {
    // Keep the selection for this visit even if it cannot be persisted.
  }
  applyLanguage();
  closeLanguagePicker(true);
}

function closeLanguagePicker(restoreFocus = false) {
  const picker = document.getElementById('language-picker');
  if (!picker?.open) return;
  picker.open = false;
  if (restoreFocus) picker.querySelector('summary').focus();
}

function onOutsideClick(event) {
  if (!event.target.closest('#language-picker')) closeLanguagePicker();
}

function onEscape(event) {
  if (event.key === 'Escape') closeLanguagePicker(true);
}

function onStorageChange(event) {
  if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) return;
  preference = normalizePreference(event.newValue);
  applyLanguage();
}

document.addEventListener('change', onLanguageSelect);
document.addEventListener('click', onOutsideClick);
document.addEventListener('keydown', onEscape);

let gridFrame = 0;
let glowingGrid = null;
let pointerPosition = null;

function clearGridGlow() {
  cancelAnimationFrame(gridFrame);
  gridFrame = 0;
  glowingGrid?.removeAttribute('data-pointer-active');
  glowingGrid = null;
}

function onGridPointerMove(event) {
  if (event.pointerType === 'touch') return;
  const grid = event.target.closest('.page-content');
  if (!grid) {
    clearGridGlow();
    return;
  }
  if (glowingGrid !== grid) clearGridGlow();
  glowingGrid = grid;
  pointerPosition = { x: event.clientX, y: event.clientY };
  if (gridFrame) return;
  gridFrame = requestAnimationFrame(() => {
    gridFrame = 0;
    if (!glowingGrid) return;
    const bounds = glowingGrid.getBoundingClientRect();
    glowingGrid.style.setProperty('--pointer-x', `${pointerPosition.x - bounds.left}px`);
    glowingGrid.style.setProperty('--pointer-y', `${pointerPosition.y - bounds.top}px`);
    glowingGrid.setAttribute('data-pointer-active', '');
  });
}

document.addEventListener('pointermove', onGridPointerMove, { passive: true });
document.documentElement.addEventListener('pointerleave', clearGridGlow);
window.addEventListener('blur', clearGridGlow);
window.addEventListener('scroll', clearGridGlow, { passive: true });
window.addEventListener('languagechange', applyLanguage);
window.addEventListener('storage', onStorageChange);
window.addEventListener('app:html-updated', onHtmlUpdated);
applyLanguage();
initializeNavigation();
renderPage();
window.addEventListener('hashchange', renderPage);

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    document.removeEventListener('change', onLanguageSelect);
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('keydown', onEscape);
    document.removeEventListener('pointermove', onGridPointerMove);
    document.documentElement.removeEventListener('pointerleave', clearGridGlow);
    window.removeEventListener('blur', clearGridGlow);
    window.removeEventListener('scroll', clearGridGlow);
    clearGridGlow();
    window.removeEventListener('languagechange', applyLanguage);
    window.removeEventListener('storage', onStorageChange);
    window.removeEventListener('app:html-updated', onHtmlUpdated);
    headerNavigation?.dispose();
    window.removeEventListener('hashchange', renderPage);
    seedExplorer?.dispose();
  });
}
