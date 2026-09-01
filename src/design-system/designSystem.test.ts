/// <reference types="node" />

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** Los saltos de línea CRLF no pueden desactivar los emparejadores por línea. */
const leer = (ruta: string) => readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n');

/** `URL.pathname` antepone una barra al drive en Windows (`/C:/…`). */
const SRC = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]$/, '');
const tokens = leer(`${SRC}/design-system/tokens.css`);

/**
 * Guarda de la identidad visual de FusionStructure.
 *
 * La fundación implementa el brandbook: papel y carbón para el chrome, seis
 * señales para el dominio y una escala de movimiento corta. Estas pruebas
 * existen para que la dirección visual de los dos productos de origen
 * —claymorphism, marfil cálido, acento menta, y la capa de parches que la
 * tapaba de blanco con `!important`— no pueda volver por la puerta de atrás:
 * no basta con haberla quitado una vez, porque cualquier regla nueva copiada de
 * cualquiera de los dos la reintroduce.
 */

/** Todas las hojas del producto, en rutas relativas estables entre máquinas. */
const rutas = (): string[] => {
  const salida: string[] = [];
  const recorrer = (dir: string) => {
    for (const entrada of readdirSync(dir).sort()) {
      const ruta = `${dir}/${entrada}`;
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (entrada.endsWith('.css')) salida.push(ruta.slice(SRC.length - 3));
    }
  };
  recorrer(SRC);
  return salida;
};
const contenido = (ruta: string): string => leer(`${SRC}/${ruta.replace(/^src\//, '')}`);

/** Valor declarado de un token dentro de un bloque concreto. */
const valorEn = (bloque: string, nombre: string): string | null => {
  const m = bloque.match(new RegExp(`^\\s*${nombre}:\\s*([^;]+);`, 'm'));
  return m ? m[1].trim() : null;
};

const bloqueRaiz = tokens.slice(tokens.indexOf(':root {'), tokens.indexOf(":root[data-theme='dark']"));
const bloqueNoche = tokens.slice(tokens.indexOf(":root[data-theme='dark']"));

/** Resuelve `var(--x)` encadenado hasta llegar a un literal. */
const resolver = (valor: string, bloque: string, saltos = 0): string => {
  const m = valor.match(/^var\((--[a-z0-9-]+)\)$/);
  if (!m || saltos > 8) return valor;
  const siguiente = valorEn(bloque, m[1]) ?? valorEn(bloqueRaiz, m[1]);
  return siguiente ? resolver(siguiente, bloque, saltos + 1) : valor;
};

const aRgb = (hex: string): [number, number, number] | null => {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Luminancia relativa y contraste WCAG, para medir señales contra su papel. */
const luminancia = ([r, g, b]: [number, number, number]): number => {
  const canal = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};
const contraste = (a: [number, number, number], b: [number, number, number]): number => {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
};

describe('materia · el claymorphism no puede volver', () => {
  it('ninguna sombra del sistema tiene luz interior blanca', () => {
    // La firma del claymorphism es una capa `inset` clara que finge una fuente
    // de luz propia dentro de cada pieza.
    const sospechosas = tokens
      .split('\n')
      .filter((linea: string) => /--sc-shadow-|--sc-depth-/.test(linea) && /inset/.test(linea) && /255,\s*255,\s*255|#fff/i.test(linea));
    expect(sospechosas).toEqual([]);
  });

  it('ninguna sombra proyecta en dos direcciones opuestas a la vez', () => {
    // La otra firma: una capa hacia abajo-derecha y otra hacia arriba-izquierda.
    for (const linea of tokens.split('\n').filter((l: string) => /--sc-shadow-[a-z-]+:/.test(l))) {
      const capas = linea.slice(linea.indexOf(':') + 1);
      const desplazamientosX = [...capas.matchAll(/(-?\d+)px\s+-?\d+px\s+\d+px/g)].map((m) => Number(m[1]));
      const haciaAmbos = desplazamientosX.some((x) => x > 0) && desplazamientosX.some((x) => x < 0);
      expect(haciaAmbos, `sombra bidireccional en: ${linea.trim()}`).toBe(false);
    }
  });

  it('sólo el escalón de contacto y sus alias declaran sombra', () => {
    const conSombra = [...tokens.matchAll(/^\s*(--sc-shadow-[a-z-]+):\s*([^;]+);/gm)]
      .filter(([, , valor]) => valor.trim() !== 'none' && !valor.includes('var(--sc-shadow-lg)'))
      .map(([, nombre]) => nombre);
    // `lg` es el escalón de contacto; `modal`, `sheet` y `drop` son su familia.
    expect(new Set(conSombra)).toEqual(new Set(['--sc-shadow-lg', '--sc-shadow-modal', '--sc-shadow-sheet', '--sc-shadow-drop']));
  });

  it('un control pulsado no se desplaza', () => {
    expect(valorEn(bloqueRaiz, '--sc-press-transform')).toBe('none');
    expect(valorEn(bloqueRaiz, '--sc-press-transform-flat')).toBe('none');
  });
});

describe('color · la interfaz es acromática y el dominio es el único que tiñe', () => {
  const rolesDeChrome = [
    '--sc-color-bg-app', '--sc-color-surface-1', '--sc-color-surface-2', '--sc-color-surface-3',
    '--sc-color-surface-inset', '--sc-color-surface-pressed',
    '--sc-color-text-primary', '--sc-color-text-secondary', '--sc-color-text-muted',
    '--sc-color-border', '--sc-color-border-soft', '--sc-color-border-strong',
    '--sc-color-action-primary', '--sc-color-action-hover', '--sc-color-action-foreground',
    '--sc-color-focus', '--sc-color-selection-stroke',
  ];

  /**
   * Papel y carbón tienen temperatura: el papel del brandbook es cálido y el
   * carbón es frío. Esa desviación es identidad, no color de marca, así que la
   * guarda mide su AMPLITUD en vez de exigir tres canales idénticos. Doce
   * puntos sobre 255 es el techo: por debajo el chrome se lee neutro junto a
   * una señal; por encima empieza a competir con el dominio.
   */
  const DESVIACION_MAXIMA_DE_CHROME = 12;

  for (const [tema, bloque] of [['día', bloqueRaiz], ['noche', bloqueNoche]] as const) {
    it(`los roles de chrome se mantienen neutros en tema ${tema}`, () => {
      for (const rol of rolesDeChrome) {
        const declarado = valorEn(bloque, rol) ?? valorEn(bloqueRaiz, rol);
        expect(declarado, `${rol} no está declarado`).toBeTruthy();
        const rgb = aRgb(resolver(declarado!, bloque));
        expect(rgb, `${rol} no resuelve a un hex: ${declarado}`).not.toBeNull();
        const desviacion = Math.max(...rgb!) - Math.min(...rgb!);
        expect(desviacion, `${rol} tiene hue propio (${declarado} → desviación ${desviacion})`)
          .toBeLessThanOrEqual(DESVIACION_MAXIMA_DE_CHROME);
      }
    });
  }

  it('la acción primaria invierte entre temas en vez de tener color propio', () => {
    expect(aRgb(resolver(valorEn(bloqueRaiz, '--sc-color-action-primary')!, bloqueRaiz))![0]).toBeLessThan(32);
    expect(aRgb(resolver(valorEn(bloqueNoche, '--sc-color-action-primary')!, bloqueNoche))![0]).toBeGreaterThan(223);
  });

  it('las seis señales del dominio se declaran una vez y no se redefinen en Noche', () => {
    const senales = ['axial', 'shear', 'moment', 'action', 'deformed', 'alert'];
    for (const senal of senales) {
      const trazo = `--fs-signal-${senal}`;
      expect(valorEn(bloqueRaiz, trazo), `${trazo} debe declararse en :root`).toBeTruthy();
      expect(valorEn(bloqueNoche, trazo), `${trazo} no puede redefinirse en Noche`).toBeNull();
    }
    // Los alias por familia siguen existiendo para el CSS heredado, y siguen
    // apuntando a la misma verdad en vez de declarar un segundo valor.
    for (const alias of ['--fs-red', '--fs-blue', '--fs-green', '--fs-yellow', '--fs-pink', '--fs-purple']) {
      expect(valorEn(bloqueRaiz, alias), `${alias} debe declararse en :root`).toMatch(/^var\(--fs-signal-/);
      expect(valorEn(bloqueNoche, alias), `${alias} no puede redefinirse en Noche`).toBeNull();
    }
  });

  it('cada señal se separa del papel y del carbón lo suficiente para leerse como trazo', () => {
    // Mínimo gráfico de WCAG para un elemento no textual: 3:1. Una señal que no
    // lo cumple en los dos temas no es una señal, es una decoración.
    //
    // El aviso queda fuera de esta lista por una razón física, no por una
    // excepción cómoda: ningún amarillo llega a 3:1 sobre papel sin dejar de
    // ser amarillo. Por eso el rol que lo pinta en Día es su tinta —lo
    // comprueba la prueba siguiente— y el valor de trazo se reserva a Noche.
    const papel = aRgb(resolver(valorEn(bloqueRaiz, '--sc-color-bg-canvas')!, bloqueRaiz))!;
    const carbon = aRgb(resolver(valorEn(bloqueNoche, '--sc-color-bg-canvas')!, bloqueNoche))!;
    for (const senal of ['axial', 'shear', 'moment', 'action', 'deformed']) {
      const rgb = aRgb(valorEn(bloqueRaiz, `--fs-signal-${senal}`)!)!;
      expect(contraste(rgb, papel), `${senal} no se separa del papel`).toBeGreaterThanOrEqual(3);
      expect(contraste(rgb, carbon), `${senal} no se separa del carbón`).toBeGreaterThanOrEqual(3);
    }
  });

  it('el aviso se pinta con su tinta sobre papel y con su trazo sobre carbón', () => {
    const papel = aRgb(resolver(valorEn(bloqueRaiz, '--sc-color-bg-canvas')!, bloqueRaiz))!;
    const carbon = aRgb(resolver(valorEn(bloqueNoche, '--sc-color-bg-canvas')!, bloqueNoche))!;
    const dia = aRgb(resolver(valorEn(bloqueRaiz, '--sc-color-technical-dimension')!, bloqueRaiz))!;
    const noche = aRgb(resolver(valorEn(bloqueNoche, '--sc-color-technical-dimension')!, bloqueNoche))!;
    expect(contraste(dia, papel), 'la cota no se lee sobre papel').toBeGreaterThanOrEqual(3);
    expect(contraste(noche, carbon), 'la cota no se lee sobre carbón').toBeGreaterThanOrEqual(3);
  });

  it('las acciones internas mantienen su significado en los dos temas', () => {
    // Un momento flector no cambia de color al apagar la luz.
    for (const rol of ['--sc-color-technical-axial', '--sc-color-technical-shear', '--sc-color-technical-moment', '--sc-color-technical-load', '--sc-color-technical-deformed']) {
      expect(valorEn(bloqueNoche, rol), `${rol} no puede redefinirse en Noche`).toBeNull();
    }
  });

  it('cada señal tiene una tinta legible declarada en los dos temas', () => {
    for (const senal of ['axial', 'shear', 'moment', 'action', 'deformed', 'alert']) {
      const rol = `--sc-color-signal-${senal}-ink`;
      expect(valorEn(bloqueRaiz, rol), `${rol} debe declararse en Día`).toBeTruthy();
      expect(valorEn(bloqueNoche, rol), `${rol} debe recalibrarse en Noche`).toBeTruthy();
    }
  });
});

describe('forma · la escala de radios es la del sistema sin volumen', () => {
  it('ningún radio de rol supera los 8px', () => {
    for (const rol of ['--sc-radius-control', '--sc-radius-card', '--sc-radius-panel', '--sc-radius-modal', '--sc-radius-sheet']) {
      const px = Number((valorEn(bloqueRaiz, rol) ?? '').replace('px', ''));
      expect(px, `${rol} = ${px}px`).toBeLessThanOrEqual(8);
    }
  });

  it('ninguna hoja declara un radio literal fuera de la escala', () => {
    const infractoras: string[] = [];
    for (const hoja of rutas()) {
      if (hoja.endsWith('tokens.css')) continue;
      for (const m of contenido(hoja).matchAll(/border-radius:\s*(\d+)px/g)) {
        // `0` es el escalón cero de la rejilla y `999` es la píldora: son roles.
        if (!['0', '999'].includes(m[1])) infractoras.push(`${hoja}: ${m[0]}`);
      }
    }
    expect(infractoras).toEqual([]);
  });
});

describe('arquitectura · una sola verdad, sin capa de parches', () => {
  it('el documento inicial no conserva colores de los productos de origen', () => {
    const index = leer(`${ROOT}/index.html`).toLowerCase();
    expect(index).not.toMatch(/#(?:007d61|168a6c|468c09|65a323|2f73c8|d85c4a|7657d5|c65f86|f3eee4|f7f1e8|fbf8f2|102b2d|ded8ce)/);
  });

  it('no existe una hoja de reconciliación que tape la fundación', () => {
    const parches = rutas().filter((h) => /minimal\.css$|\/minimal\/|Minimal\.css$/.test(h));
    expect(parches).toEqual([]);
  });

  it('ninguna hoja de feature redeclara tokens de la fundación en `:root`', () => {
    // La razón por la que la capa anterior necesitaba `!important` era ésta: un
    // `:root` en una hoja de feature llega DESPUÉS y gana. Los dos estudios de
    // ilustración sí declaran tokens, pero acotados a su propia clase, porque
    // previsualizan Día y Noche a la vez sin seguir al tema de la aplicación.
    const declaraEnRaiz = (texto: string) =>
      [...texto.matchAll(/(^|\})\s*(:root[^{]*)\{([^}]*)\}/g)]
        .some(([, , selector, cuerpo]) => !selector.includes(' ') && /--sc-(color|shadow|radius)-[a-z-]+\s*:/.test(cuerpo));
    const infractoras = rutas()
      .filter((h) => !h.endsWith('design-system/tokens.css'))
      .filter((h) => declaraEnRaiz(contenido(h)));
    expect(infractoras).toEqual([]);
  });

  it('la paleta de los dos productos de origen no queda en ninguna hoja', () => {
    const heredados = ['#007d61', '#168a6c', '#468c09', '#65a323', '#2f73c8', '#d85c4a', '#7657d5', '#c65f86', '#f3eee4', '#f7f1e8', '#fbf8f2', '#102b2d', '#ded8ce'];
    const encontrados: string[] = [];
    for (const hoja of rutas()) {
      const texto = contenido(hoja).toLowerCase();
      for (const hex of heredados) if (texto.includes(hex)) encontrados.push(`${hoja} → ${hex}`);
    }
    expect(encontrados).toEqual([]);
  });
});
