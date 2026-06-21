// Voorcap translations — data lives in locales.json (generated/merged).
// Add UI strings to the 'en' base + run the locale workflow to translate.
import data from './locales.json';

export const translations = data;
export type Locale = keyof typeof translations;
