import { query, closest, translated } from './dom.ts';
import type { LanguagePreference } from './types.ts';
import './style.css';
import { createHeaderNavigation } from './navigation.ts';
import { createPageTransitions } from './page-transitions.ts';
import { createViewportLayout } from './viewport-layout.ts';
import { createSeedExplorer } from './seed-explorer.ts';
import { createBiomeFinder } from './biome-finder.ts';
import { explorerRoute } from './start-biome-core.ts';
import { LANGUAGE_STORAGE_KEY, normalizePreference, resolveLanguage, translations } from './language.ts';

let preference: LanguagePreference = 'auto';
let headerNavigation: ReturnType<typeof createHeaderNavigation> = null;
let seedExplorer: ReturnType<typeof createSeedExplorer> | null = null;
let biomeFinder: ReturnType<typeof createBiomeFinder> | null = null;
const pageTransitions = createPageTransitions();
const viewportLayout = createViewportLayout();
function onRouteChange() {
  clearGridGlow();
  pageTransitions.update(renderPage);
}
function renderPage() {
  seedExplorer?.dispose();
  seedExplorer = null;
  biomeFinder?.dispose();
  biomeFinder = null;
  const container = document.querySelector<HTMLElement>('main .page-container');
  container?.replaceChildren();
  const route = explorerRoute(location.hash);
  if (!route.path || route.path === '#') route.path = '#/home';
  if (container && ['#/home', '#/seed-crafter'].includes(route.path)) {
    const page = document.createElement('section');
    page.dataset.page = route.path.slice(2);
    page.dataset.i18nAriaLabel = route.path === '#/home' ? 'home' : 'seedCrafter';
    page.setAttribute('aria-label', translated(translations[document.documentElement.lang === 'de' ? 'de' : 'en'], page.dataset.i18nAriaLabel));
    container.append(page);
  }
  if (container && route.path === '#/seed-explorer') seedExplorer = createSeedExplorer(container, { initialConfig: route.config, invalidConfig: route.error });
  if (container && route.path === '#/biome-finder') biomeFinder = createBiomeFinder(container);
  document.querySelectorAll<HTMLAnchorElement>('.navigation-link').forEach(link => {
    if (link.hash === route.path && ['#/home', '#/seed-crafter', '#/seed-explorer', '#/biome-finder'].includes(route.path)) link.setAttribute('aria-current', 'page');
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
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
    const text = translated(translations[language], element.dataset.i18n);
    if (text) element.textContent = text;
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach(element => {
    const text = translated(translations[language], element.dataset.i18nAriaLabel);
    if (text) element.setAttribute('aria-label', text);
  });
  document.querySelectorAll<HTMLInputElement>('input[name="language"]').forEach(input => {
    input.checked = input.value === language;
  });
  const flag = document.querySelector<HTMLImageElement>('#language-flag');
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
  pageTransitions.cancel();
  applyLanguage();
  initializeNavigation();
  renderPage();
}

function onLanguageSelect(event: Event) {
  const input = closest(event.target, 'input[name="language"]');
  if (!input) return;
  preference = normalizePreference(query(document, 'input[name="language"]:checked', 'input').value);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, preference);
  } catch {
    // Keep the selection for this visit even if it cannot be persisted.
  }
  applyLanguage();
  closeLanguagePicker(true);
}

function closeLanguagePicker(restoreFocus = false) {
  const picker = document.querySelector<HTMLDetailsElement>('#language-picker');
  if (!picker?.open) return;
  picker.open = false;
  if (restoreFocus) query(picker, 'summary').focus();
}

function onOutsideClick(event: MouseEvent) {
  if (!closest(event.target, '#language-picker')) closeLanguagePicker();
}

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') closeLanguagePicker(true);
}

function onStorageChange(event: StorageEvent) {
  if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) return;
  preference = normalizePreference(event.newValue);
  applyLanguage();
}

document.addEventListener('change', onLanguageSelect);
document.addEventListener('click', onOutsideClick);
document.addEventListener('keydown', onEscape);

let gridFrame = 0;
let glowingGrid: HTMLElement | null = null;
let pointerPosition: { x: number; y: number } | null = null;

function clearGridGlow() {
  cancelAnimationFrame(gridFrame);
  gridFrame = 0;
  glowingGrid?.removeAttribute('data-pointer-active');
  glowingGrid = null;
}

function onGridPointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  const grid = closest(event.target, '.page-content');
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
    if (!glowingGrid || !pointerPosition) return;
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
window.addEventListener('hashchange', onRouteChange);

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
    window.removeEventListener('hashchange', onRouteChange);
    pageTransitions.dispose();
    viewportLayout.dispose();
    seedExplorer?.dispose();
    biomeFinder?.dispose();
  });
}
