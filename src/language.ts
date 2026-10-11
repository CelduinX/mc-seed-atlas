import type { Language, LanguagePreference } from './types.ts';
export const LANGUAGE_STORAGE_KEY = 'seed-atlas.language';

export function normalizePreference(value: unknown): LanguagePreference {
  return (value === 'auto' || value === 'de' || value === 'en') ? value : 'auto';
}

export function resolveLanguage(preference: LanguagePreference, languages: readonly string[] = []): Language {
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
    biomeFinder: 'Startbiom',
    structureFinder: 'Struktur Seed',
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
    biomeFinder: 'Starting Biome',
    structureFinder: 'Structure Seeds',
    seedExplorer: 'Seed Explorer',
    seedCrafter: 'Seed Crafter',
    tagline: 'Find your Minecraft seed',
    languageLabel: 'Select language',
    legalNotice: 'Legal notice',
    privacyPolicy: 'Privacy',
    cookieSettings: 'Cookies',
  },
};
