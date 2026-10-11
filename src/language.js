export const LANGUAGE_STORAGE_KEY = 'seed-atlas.language';

export function normalizePreference(value) {
  return ['auto', 'de', 'en'].includes(value) ? value : 'auto';
}

export function resolveLanguage(preference, languages = []) {
  if (preference === 'de' || preference === 'en') return preference;
  for (const locale of languages) {
    const language = String(locale).toLowerCase().split(/[-_]/)[0];
    if (language === 'de' || language === 'en') return language;
  }
  return 'en';
}

export const translations = {
  de: {
    home: 'Startseite',
    mainNavigation: 'Hauptnavigation',
    toggleNavigation: 'Menü öffnen oder schließen',
    biomeFinder: 'Biom Finder',
    structureFinder: 'Struktur Finder',
    seedExplorer: 'Seed Explorer',
    seedCrafter: 'Seed Crafter',
    tagline: 'Finde deinen Minecraft Seed',
    languageLabel: 'Sprache auswählen',
    legalNotice: 'Impressum',
    privacyPolicy: 'Datenschutz',
    cookieSettings: 'Cookies',
  },
  en: {
    home: 'Home',
    mainNavigation: 'Main navigation',
    toggleNavigation: 'Open or close menu',
    biomeFinder: 'Biome Finder',
    structureFinder: 'Structure Finder',
    seedExplorer: 'Seed Explorer',
    seedCrafter: 'Seed Crafter',
    tagline: 'Find your Minecraft seed',
    languageLabel: 'Select language',
    legalNotice: 'Legal notice',
    privacyPolicy: 'Privacy',
    cookieSettings: 'Cookies',
  },
};
