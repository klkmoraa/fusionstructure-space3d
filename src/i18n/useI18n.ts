import { useCallback, useSyncExternalStore } from 'react';
import { useProject } from '../store/ProjectContext';
import { isCatalogReady, loadCatalog, subscribeToCatalogs, translate, type TranslationKey } from './catalogs';

let catalogVersion = 0;
subscribeToCatalogs(() => { catalogVersion += 1; });

const getCatalogVersion = () => catalogVersion;

const ensureCatalog = (language: 'es' | 'en') => {
  if (!isCatalogReady(language)) void loadCatalog(language);
};

export const useI18n = () => {
  const { project } = useProject();
  const language = project.settings.language;
  useSyncExternalStore(subscribeToCatalogs, getCatalogVersion, getCatalogVersion);
  ensureCatalog(language);
  const t = useCallback(
    (key: TranslationKey, variables?: Record<string, string | number>) =>
      translate(language, key, variables),
    [language],
  );
  return { language, t };
};
