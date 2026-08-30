import { esWorkspace } from './catalogs/es-workspace';
import { esAnalysis } from './catalogs/es-analysis';
import { esModeling } from './catalogs/es-modeling';
import { esResults } from './catalogs/es-results';
import { esInterchange } from './catalogs/es-interchange';

export const es = {
  ...esWorkspace,
  ...esAnalysis,
  ...esModeling,
  ...esResults,
  ...esInterchange,
  // Adiciones locales conservadas durante la extracción modular.
  'canvas.keyboardEditAlternative': 'Con un objeto seleccionado, pulsa F2 para editarlo con campos numéricos en lugar de arrastrarlo',
  'canvas.structuralEditConnectedHelp': 'Los miembros incidentes permanecen conectados y acompañan a sus nodos.',
  'canvas.structuralEditDescription': 'Vista previa local · una confirmación y un deshacer',
  'generator.support.detail.fixed': 'Restringe Ux, Uy y Rz en cada nudo de apoyo candidato.',
  'generator.support.detail.none': 'No restringe GDL. Completa los apoyos antes de analizar.',
  'generator.support.detail.pin': 'Restringe Ux y Uy en cada nudo de apoyo candidato.',
  'generator.support.detail.roller': 'Restringe el desplazamiento normal (Uy con ángulo de 90°) en cada nudo de apoyo candidato.',
  'generator.support.hint': 'Opcional y explícito: el generador no inventa apoyos. El preset se aplica exactamente a los nudos de apoyo de esta familia.',
  'generator.support.label': 'Preset de apoyo',
  'inspector.loadCaseCategoryAccidental': 'Accidental',
  'inspector.loadCaseCategoryOther': 'Otro',
  'inspector.loadCaseCategoryPermanent': 'Permanente',
  'inspector.loadCaseCategoryVariable': 'Variable',
  'palette.activeCommand': 'Comando activo: {label}.',
  'palette.resultCount': '{count} comandos disponibles.',
  'palette.reviewBody': 'Esta acción puede abrir el diálogo del sistema o descargar un archivo. Revísala antes de continuar.',
  'palette.reviewCancel': 'Volver a la paleta',
  'palette.reviewConfirm': 'Continuar',
  'palette.reviewTitle': 'Revisar acción',
  'results.compactForTarget': 'Caso actual: {target}',
  'results.compactGoverning': '{symbol} gobernante {value} {unit} · {member}',
  'results.compactNoGoverning': 'Revisa el resumen completo',
  'results.compactResolvedDetail': 'Resuelto · {target} · actualizado · {reliability}',
  'results.compactUnresolved': 'La corrida necesita corrección',
  'results.compactWaiting': 'Aún no hay resultados calculados',
  'results.criticalEnd': 'Extremo',
  'results.criticalJump': 'Salto',
  'results.criticalMaximum': 'Máximo',
  'results.criticalMinimum': 'Mínimo',
  'results.criticalPoints': 'Puntos notables',
  'results.criticalZero': 'Cruce por cero',
  'results.pinCriticalPoint': 'Fijar lectura en {point}',
  'results.unpinCriticalPoint': 'Quitar lectura fijada de {point}',
  'space3d.bridgeCompleteNow': 'Completar ahora',
  'space3d.bridgeNextRequirement': 'Siguiente requisito para analizar: {requirement}',
} as const;

export type TranslationKey = keyof typeof es;
export type Language = 'es' | 'en';
export type Catalog = Record<TranslationKey, string>;

export const catalogs: Partial<Record<Language, Catalog>> & { es: Catalog } = { es };

const listeners = new Set<() => void>();
const pendingCatalogs = new Map<Language, Promise<Catalog>>();

/** Registra una traducción que acaba de llegar y despierta a los consumidores. */
export const registerCatalog = (language: Language, catalog: Catalog): void => {
  if (catalogs[language] === catalog) return;
  catalogs[language] = catalog;
  listeners.forEach((listener) => listener());
};

export const subscribeToCatalogs = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const isCatalogReady = (language: Language): boolean => catalogs[language] !== undefined;

/**
 * Español siempre está disponible. Inglés se solicita una vez y queda en caché
 * para todas las superficies que usan `useI18n`.
 */
export const loadCatalog = (language: Language): Promise<Catalog> => {
  const available = catalogs[language];
  if (available) return Promise.resolve(available);
  const pending = pendingCatalogs.get(language);
  if (pending) return pending;

  const request = import('./catalogEn')
    .then(({ en }) => {
      registerCatalog('en', en);
      return en;
    })
    .catch(() => es);
  pendingCatalogs.set(language, request);
  return request;
};

export const translate = (
  language: Language,
  key: TranslationKey,
  variables?: Record<string, string | number>,
): string => {
  const template = catalogs[language]?.[key] ?? es[key];
  if (!variables) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
    Object.hasOwn(variables, name) ? String(variables[name]) : match);
};
