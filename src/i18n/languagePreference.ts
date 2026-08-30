import { loadCatalog, type Language } from './catalogs';

const KEY = 'structureCo.languageHint';

const isLanguage = (value: string | null): value is Language => value === 'es' || value === 'en';

/** Guarda una pista de rendimiento; el proyecto sigue siendo la fuente de verdad. */
export const rememberLanguage = (language: Language): void => {
  try {
    window.localStorage.setItem(KEY, language);
  } catch {
    // El almacenamiento puede estar bloqueado sin afectar el producto.
  }
};

/** Pide inglés en paralelo con la hidratación si fue el último idioma usado. */
export const preloadPreferredCatalog = (): Language => {
  let hint: string | null = null;
  try {
    hint = window.localStorage.getItem(KEY);
  } catch {
    hint = null;
  }
  const language: Language = isLanguage(hint) ? hint : 'es';
  if (language === 'en') void loadCatalog(language);
  return language;
};
