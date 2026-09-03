/// <reference types="node" />

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Guarda de las superficies que se montan encima de todo.
 *
 * Un modal sin hoja no falla: se monta, y su contenido cae al final del flujo
 * del documento, debajo de la pantalla que lo abrió. En un teléfono queda fuera
 * de la ventana y el botón que lo lanza parece muerto. Eso es exactamente lo
 * que le pasó a dos superficies del producto:
 *
 *  · la paleta de comandos, cuyas reglas vivían en `features/topbar/topbar.css`
 *    y desaparecieron enteras al retirar la barra superior (ad45103);
 *  · la orientación de entrada a Space 3D, que nunca tuvo hoja: el botón
 *    «Abrir Space 3D» se veía inerte porque el diálogo se dibujaba fuera de
 *    pantalla, sin fondo, sin caja y sin posición.
 *
 * Ninguna prueba de comportamiento las habría detectado —el DOM era correcto en
 * los dos casos—, así que la guarda mira lo único que faltaba: que cada clase
 * que estas superficies escriben tenga al menos una regla declarada en alguna
 * hoja del producto.
 */

const leer = (ruta: string) => readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n');
const SRC = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');

/** Toda clase con al menos una regla, en cualquier hoja de `src`. */
const clasesConRegla = (): Set<string> => {
  const salida = new Set<string>();
  const recorrer = (dir: string) => {
    for (const entrada of readdirSync(dir).sort()) {
      const ruta = `${dir}/${entrada}`;
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (entrada.endsWith('.css')) {
        for (const m of leer(ruta).matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) salida.add(m[1]);
      }
    }
  };
  recorrer(SRC);
  return salida;
};

/**
 * Clases estáticas que un componente escribe en `className`. Los tramos
 * interpolados (`--${id}`) se descartan: su valor no se conoce aquí y la
 * cobertura de esas variantes es cosa de la prueba de la superficie.
 */
const clasesDe = (ruta: string): string[] => {
  const fuente = leer(`${SRC}/${ruta}`);
  const literales: string[] = [];
  for (const m of fuente.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    literales.push(...(m[1] ?? m[2] ?? '').split(/\s+/));
  }
  return [...new Set(literales.filter((clase) => clase && !clase.includes('${') && /^[A-Za-z_][\w-]*$/.test(clase)))];
};

const SUPERFICIES = [
  'features/workspace/CommandPalette.tsx',
  'features/space3d/Space3DEntryDialog.tsx',
];

describe('una superficie modal no puede montarse sin hoja', () => {
  const declaradas = clasesConRegla();

  for (const superficie of SUPERFICIES) {
    it(`${superficie} declara una regla para cada clase que escribe`, () => {
      const clases = clasesDe(superficie);
      // Si la extracción deja de encontrar clases, la prueba pasaría vacía y
      // dejaría de guardar nada: el suelo evita ese falso verde.
      expect(clases.length, `no se encontraron clases en ${superficie}`).toBeGreaterThan(4);
      const huerfanas = clases.filter((clase) => !declaradas.has(clase));
      expect(huerfanas, `${superficie} escribe clases sin ninguna regla en src/**/*.css`).toEqual([]);
    });
  }

  it('la paleta y la orientación 3D llevan su hoja junto al componente', () => {
    // La lección de ad45103: mientras la hoja de una superficie viva en la de
    // otra, retirar la vecina se lleva la propia por delante.
    expect(leer(`${SRC}/features/workspace/CommandPalette.tsx`)).toContain("import './commandPalette.css'");
    expect(leer(`${SRC}/features/space3d/Space3DEntryDialog.tsx`)).toContain("import './space3dEntry.css'");
  });

  /**
   * La segunda mitad de la misma lección. Tener la hoja junto al componente no
   * basta cuando el componente se carga con `lazy()`: sus reglas viajan
   * entonces en un trozo diferido y no existen hasta que ese trozo llega. La
   * paleta se monta con el atajo, toma el foco y, sin hoja, cae al final del
   * flujo del documento —sin posición, sin fondo, sin caja—: exactamente el
   * «tiene foco pero no se ve» que reporta la auditoría de la versión
   * publicada.
   *
   * Por eso la hoja entra TAMBIÉN por la entrada estable que ya está cargada
   * antes de que la paleta pueda abrirse. La prueba mira las dos cosas a la
   * vez: que la superficie sea diferida y que su hoja no dependa de serlo.
   */
  it('una superficie diferida no deja sus reglas en el trozo diferido', () => {
    const shell = leer(`${SRC}/features/workspace/WorkspaceShell.tsx`);
    expect(shell, 'la paleta sigue siendo diferida').toMatch(/lazy\(\(\) => import\('\.\/CommandPalette'\)/);
    expect(shell, 'y su hoja entra por la entrada estable').toContain("import './commandPalette.css'");
  });
});

describe('una hoja sin quien la importe no es una hoja: es peso muerto', () => {
  /**
   * `features/welcome/home.css` llevaba 305 líneas sin que nadie la importara,
   * junto al componente que estilaba —`StructuralPortalHero`, otras 306 líneas
   * sin una sola referencia—, cuyo propio comentario documentaba un enganche
   * (`.portal-hero__body { filter: url(#…) }`) que nunca llegó a existir: su
   * acabado no se vio nunca. Nada falla cuando eso pasa; simplemente hay
   * reglas que ningún navegador llega a leer y que el siguiente que abra el
   * archivo creerá vivas.
   */
  it('cada hoja de `src` la carga alguien', () => {
    const importadas = new Set(['design-system/tokens.css', 'design-system/fonts.css']);
    const recorrer = (dir: string, salida: string[] = []): string[] => {
      for (const entrada of readdirSync(dir).sort()) {
        const ruta = `${dir}/${entrada}`;
        if (statSync(ruta).isDirectory()) recorrer(ruta, salida);
        else salida.push(ruta);
      }
      return salida;
    };
    const todos = recorrer(SRC);
    const relativa = (ruta: string) => ruta.slice(SRC.length + 1);

    for (const archivo of todos) {
      if (!/\.(ts|tsx|css)$/.test(archivo)) continue;
      const carpeta = relativa(archivo).split('/').slice(0, -1);
      for (const encontrado of leer(archivo).matchAll(/(?:import|@import)\s+['"]([^'"]+\.css)['"]/g)) {
        const partes = [...carpeta, ...encontrado[1].split('/')];
        const resuelta: string[] = [];
        for (const parte of partes) {
          if (parte === '.' || parte === '') continue;
          if (parte === '..') resuelta.pop();
          else resuelta.push(parte);
        }
        importadas.add(resuelta.join('/'));
      }
    }

    const huerfanas = todos
      .filter((archivo) => archivo.endsWith('.css'))
      .map(relativa)
      .filter((archivo) => !importadas.has(archivo));

    expect(huerfanas, 'hojas que ningún módulo carga').toEqual([]);
  });
});
