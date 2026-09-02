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
 * señales para el dominio, una escala de movimiento corta y —desde la adopción
 * de la arcilla leve— un escalón de volumen con UNA sola luz.
 *
 * Estas pruebas existían para que el claymorphism de los dos productos de
 * origen no pudiera volver por la puerta de atrás. El producto decidió que
 * vuelva, pero acotado, así que la guarda no se retira: cambia de polaridad.
 * Lo que antes se prohibía —que una sombra proyecte y realce a la vez— ahora
 * se EXIGE, y lo que sigue prohibido es lo que hacía ilegible al original:
 * que cada pieza finja su propia fuente de luz, que la profundidad tiña, que
 * el volumen crezca sin límite y que el dato se redondee.
 *
 * Sigue en pie, sin tocar, la guarda del marfil cálido, el acento menta y la
 * capa de parches con `!important`: eso no vuelve.
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

describe('materia · la arcilla tiene una sola luz', () => {
  /** Cada capa de una sombra, como (x, y, difuminado).
   *  El desplazamiento en X puede venir como `0` pelado —así se escriben las
   *  sombras de contacto verticales—, así que el `px` sólo se exige en Y y en
   *  el difuminado. El ancla al principio del valor o a una coma es lo que
   *  impide que los tres enteros de un `rgb(23 26 28 …)` se lean como una capa. */
  const capasDe = (valor: string) =>
    [...valor.matchAll(/(?:^|,)\s*(?:inset\s+)?(-?\d+)(?:px)?\s+(-?\d+)px\s+(\d+)px/g)]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]), difuminado: Number(m[3]) }));

  /** Los tokens de sombra con un valor propio, en el bloque que se pida. */
  const sombrasDe = (bloque: string) =>
    [...bloque.matchAll(/^\s*(--sc-shadow-[a-z-]+):\s*([^;]+);/gm)]
      .map(([, nombre, valor]) => ({ nombre, valor: valor.trim() }))
      .filter(({ valor }) => valor !== 'none' && !valor.startsWith('var('));

  it('la luz entra por una sola esquina: nada proyecta abajo-izquierda ni arriba-derecha', () => {
    // Ésta es la prueba que sostiene toda la materia. Con la luz arriba-
    // izquierda, una capa que se aleja a la derecha tiene que bajar y una que
    // se aleja a la izquierda tiene que subir. Una capa con signos opuestos
    // sería una segunda fuente de luz, que es exactamente lo que hacía
    // ilegible al claymorphism de origen.
    for (const { nombre, valor } of sombrasDe(bloqueRaiz).concat(sombrasDe(bloqueNoche))) {
      for (const capa of capasDe(valor)) {
        const opuestos = (capa.x > 0 && capa.y < 0) || (capa.x < 0 && capa.y > 0);
        expect(opuestos, `${nombre}: capa ${capa.x}px ${capa.y}px contradice la luz del sistema`).toBe(false);
      }
    }
  });

  it('ninguna capa de profundidad tiñe', () => {
    // La sombra es tinta neutra y el realce es papel. En cuanto una capa tiene
    // hue, la profundidad empieza a competir con las seis señales del dominio,
    // que son lo único que puede significar color en este producto.
    for (const { nombre, valor } of sombrasDe(bloqueRaiz).concat(sombrasDe(bloqueNoche))) {
      for (const [, r, g, b] of valor.matchAll(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)/g)) {
        const canales = [Number(r), Number(g), Number(b)];
        const desviacion = Math.max(...canales) - Math.min(...canales);
        expect(desviacion, `${nombre}: rgb(${canales.join(' ')}) tiene tinte`).toBeLessThanOrEqual(12);
      }
    }
  });

  it('la escalera de elevación es monótona y no se dispara', () => {
    // Un escalón, no una escalera de adorno: cada nivel se separa del anterior
    // y el que más flota sigue siendo una sombra de contacto, no un cráter.
    const difuminadoDe = (nombre: string) =>
      Math.max(...capasDe(valorEn(bloqueRaiz, nombre) ?? '').map((c) => c.difuminado));
    const escalera = ['--sc-shadow-xs', '--sc-shadow-raised', '--sc-shadow-lifted', '--sc-shadow-lg'].map(difuminadoDe);
    for (let i = 1; i < escalera.length; i += 1) {
      expect(escalera[i], `el escalón ${i} no supera al anterior`).toBeGreaterThan(escalera[i - 1]);
    }
    expect(Math.max(...escalera), 'la sombra más alta se despegó del contacto').toBeLessThanOrEqual(32);
  });

  it('cada escalón de arcilla se recalibra en Noche', () => {
    // Un realce blanco sobre carbón es una fuente que no existe: de noche lo
    // que recoge un canto es ambiente.
    for (const nombre of ['--sc-shadow-raised', '--sc-shadow-lifted', '--sc-shadow-xs', '--sc-shadow-inset', '--sc-shadow-pressed', '--sc-shadow-lg']) {
      expect(valorEn(bloqueNoche, nombre), `${nombre} debe recalibrarse en Noche`).toBeTruthy();
    }
    expect(valorEn(bloqueNoche, '--sc-shadow-raised')).not.toMatch(/255\s+255\s+255/);
  });

  it('un control pulsado se hunde un píxel, ni más ni menos', () => {
    // Dos píxeles ya no es responder: es despegarse.
    expect(valorEn(bloqueRaiz, '--sc-press-transform')).toBe('translateY(1px)');
    expect(valorEn(bloqueRaiz, '--sc-press-transform-flat')).toBe('translateY(1px)');
  });

  it('la luz sigue siendo del sistema y no de la pieza', () => {
    // Lo que NO vuelve: el anillo interior de brillo, el glow y los degradados
    // con los que cada superficie fingía su propia fuente.
    for (const nombre of ['--sc-ring-inset', '--sc-glow-accent', '--sc-glow-aula', '--sc-gradient-brand-soft', '--sc-gradient-display', '--sc-gradient-sheen']) {
      expect(valorEn(bloqueRaiz, nombre), `${nombre} debe seguir en none`).toBe('none');
    }
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

  /** Las seis del brandbook, con los nombres que el brandbook les da. */
  const SENALES = ['axial', 'moment', 'shear', 'deformed', 'yield', 'attention'] as const;
  /** La séptima familia: lo que se APLICA a la estructura. */
  const CARGAS = ['point', 'distributed', 'moment'] as const;

  it('cada señal declara su par Día/Noche', () => {
    // Esta guarda cambió de polaridad al adoptar el brandbook. Antes prohibía
    // que una señal se redefiniera en Noche: el trazo era invariante y sólo la
    // tinta se recalibraba. El brandbook publica doce valores —seis por tema—
    // porque un mismo hex no puede estar medido a la vez contra papel y contra
    // carbón, y ahora eso es lo que se EXIGE. Una señal declarada sólo en Día
    // es una señal que en Noche está sin medir.
    for (const senal of SENALES) {
      const rol = `--fs-signal-${senal}`;
      expect(valorEn(bloqueRaiz, rol), `${rol} debe declararse en Día`).toMatch(/^#/);
      expect(valorEn(bloqueNoche, rol), `${rol} debe recalibrarse en Noche`).toMatch(/^#/);
    }
    for (const carga of CARGAS) {
      const rol = `--fs-load-${carga}`;
      expect(valorEn(bloqueRaiz, rol), `${rol} debe declararse en Día`).toMatch(/^#/);
      expect(valorEn(bloqueNoche, rol), `${rol} debe recalibrarse en Noche`).toMatch(/^#/);
    }
    // Los alias por familia y los de migración siguen existiendo para el CSS
    // heredado, y siguen apuntando a la única verdad en vez de declarar un
    // segundo valor: si declararan uno propio, se descuadrarían en Noche.
    for (const alias of ['--fs-red', '--fs-blue', '--fs-green', '--fs-yellow', '--fs-pink', '--fs-purple', '--fs-signal-alert', '--fs-signal-action']) {
      expect(valorEn(bloqueRaiz, alias), `${alias} debe declararse en :root`).toMatch(/^var\(--fs-signal-/);
      expect(valorEn(bloqueNoche, alias), `${alias} no puede declarar valor propio en Noche`).toBeNull();
    }
  });

  it('cada señal y cada carga se leen contra el papel de SU tema', () => {
    // Mínimo gráfico de WCAG para un elemento no textual: 3:1.
    //
    // Antes esta prueba medía un solo valor contra los dos fondos, y ahí el
    // amarillo no cabía: ningún amarillo llega a 3:1 sobre papel sin dejar de
    // ser amarillo. Con el par del brandbook la excepción desaparece — el
    // amarillo de Día es `#8a6110`, que es ámbar oscuro y pasa —, así que la
    // lista ya no tiene huecos.
    const papel = aRgb(resolver(valorEn(bloqueRaiz, '--sc-color-bg-canvas')!, bloqueRaiz))!;
    const carbon = aRgb(resolver(valorEn(bloqueNoche, '--sc-color-bg-canvas')!, bloqueNoche))!;
    for (const senal of SENALES) {
      const dia = aRgb(valorEn(bloqueRaiz, `--fs-signal-${senal}`)!)!;
      const noche = aRgb(valorEn(bloqueNoche, `--fs-signal-${senal}`)!)!;
      expect(contraste(dia, papel), `${senal} no se lee sobre papel`).toBeGreaterThanOrEqual(3);
      expect(contraste(noche, carbon), `${senal} no se lee sobre carbón`).toBeGreaterThanOrEqual(3);
    }
    // Las cargas son pastel a propósito, y «pastel» y «legible» se contradicen
    // sobre papel: sin esta prueba, el tono apagado de Día se iría deslizando
    // hacia el pastel literal hasta desaparecer, que es de donde venimos.
    for (const carga of CARGAS) {
      const dia = aRgb(valorEn(bloqueRaiz, `--fs-load-${carga}`)!)!;
      const noche = aRgb(valorEn(bloqueNoche, `--fs-load-${carga}`)!)!;
      expect(contraste(dia, papel), `la carga ${carga} no se lee sobre papel`).toBeGreaterThanOrEqual(3);
      expect(contraste(noche, carbon), `la carga ${carga} no se lee sobre carbón`).toBeGreaterThanOrEqual(3);
    }
  });

  it('una carga aplicada no se confunde con ninguna señal de resultado', () => {
    // Esta guarda cambió de criterio cuando las cargas pasaron de apagadas a
    // vivas. Antes medía CROMA y exigía que la carga estuviera menos saturada
    // que la señal de su mismo hue; ése era el único separador, y su precio
    // era que el dato que el usuario dibuja —su propia entrada— fuera lo más
    // apagado del lienzo, con la flecha de una distribuida leyéndose como una
    // mancha sucia sobre el papel.
    //
    // Lo que separa ahora a una carga de una señal es la DISTANCIA de color, y
    // se mide contra las SEIS señales, no sólo contra la de su tono: una carga
    // viva que se acercara a `deformed` o a `yield` sería igual de confusa que
    // una que se acercara a `axial`. El umbral es 55 sobre la diagonal RGB,
    // que es la separación que ya tenía la familia apagada (56 en su par más
    // ajustado), de modo que la migración a vivo no pudo empeorarla.
    const SEPARACION_MINIMA = 55;
    const distancia = (a: [number, number, number], b: [number, number, number]) =>
      Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    for (const [tema, bloque] of [['día', bloqueRaiz], ['noche', bloqueNoche]] as const) {
      for (const carga of CARGAS) {
        const cargaRgb = aRgb(valorEn(bloque, `--fs-load-${carga}`)!)!;
        for (const senal of SENALES) {
          const senalRgb = aRgb(valorEn(bloque, `--fs-signal-${senal}`)!)!;
          expect(distancia(cargaRgb, senalRgb), `en ${tema} la carga ${carga} se confunde con la señal ${senal}`)
            .toBeGreaterThanOrEqual(SEPARACION_MINIMA);
        }
      }
    }
  });

  it('una carga aplicada se lee viva y no como un apunte apagado', () => {
    // La contrapartida de la prueba anterior: sin un suelo de croma, la
    // familia podría deslizarse de vuelta al pastel —que es de donde viene— y
    // seguir pasando la separación, porque apagarse también aleja. El suelo es
    // 140, por debajo del croma de las tres cargas actuales (155-216) y muy por
    // encima del de la familia apagada que se retiró (35-74).
    const croma = (rgb: [number, number, number]) => Math.max(...rgb) - Math.min(...rgb);
    const CROMA_MINIMO = 140;
    for (const [tema, bloque] of [['día', bloqueRaiz], ['noche', bloqueNoche]] as const) {
      for (const carga of CARGAS) {
        const rgb = aRgb(valorEn(bloque, `--fs-load-${carga}`)!)!;
        expect(croma(rgb), `en ${tema} la carga ${carga} volvió a ser un pastel`)
          .toBeGreaterThanOrEqual(CROMA_MINIMO);
      }
    }
  });

  it('las siete familias y los cuatro estados existen en los dos temas', () => {
    // Dos escalas que el brandbook publica y que el producto no tenía. Sin
    // ellas, el landing pintaba «Modelo» con el color de una carga aplicada y
    // «Experimental» con el de un aviso del solver.
    const familias = ['nucleo', 'analisis', 'modelo', 'civil', 'proyecto', 'interop', 'aprendizaje'];
    const estados = ['disponible', 'experimental', 'planeado', 'no-comprometido'];
    for (const nombre of familias) {
      expect(valorEn(bloqueRaiz, `--fs-family-${nombre}`), `--fs-family-${nombre} no existe`).toBeTruthy();
    }
    for (const nombre of estados) {
      expect(valorEn(bloqueRaiz, `--fs-status-${nombre}`), `--fs-status-${nombre} no existe`).toBeTruthy();
    }
    // Los dos neutrales que no cuelgan de una señal tienen que recalibrarse
    // solos: son los únicos que no heredan el par de nadie.
    for (const rol of ['--fs-family-nucleo', '--fs-status-planeado', '--fs-status-no-comprometido']) {
      expect(valorEn(bloqueNoche, rol), `${rol} debe recalibrarse en Noche`).toMatch(/^#/);
    }
    const papel = aRgb(resolver(valorEn(bloqueRaiz, '--sc-color-bg-app')!, bloqueRaiz))!;
    const carbon = aRgb(resolver(valorEn(bloqueNoche, '--sc-color-bg-app')!, bloqueNoche))!;
    for (const nombre of familias) {
      const dia = aRgb(resolver(valorEn(bloqueRaiz, `--fs-family-${nombre}`)!, bloqueRaiz))!;
      const noche = aRgb(resolver(valorEn(bloqueNoche, `--fs-family-${nombre}`) ?? valorEn(bloqueRaiz, `--fs-family-${nombre}`)!, bloqueNoche))!;
      expect(contraste(dia, papel), `la familia ${nombre} no se lee en Día`).toBeGreaterThanOrEqual(3);
      expect(contraste(noche, carbon), `la familia ${nombre} no se lee en Noche`).toBeGreaterThanOrEqual(3);
    }
  });

  it('el color de una herramienta se lee sobre el papel de la consola', () => {
    // Ésta es la prueba que faltaba y por la que en Día los iconos no elegidos
    // del riel se perdían: tomaban el valor de trazo —medido contra el lienzo—
    // y se pintaban sobre una tecla de la consola. Aquí se mide contra la
    // superficie sobre la que de verdad se dibujan.
    const roles = ['navigation', 'structure', 'point-load', 'distributed-load', 'moment', 'dimension', 'cut', 'destructive'];
    for (const [tema, bloque] of [['día', bloqueRaiz], ['noche', bloqueNoche]] as const) {
      const tecla = aRgb(resolver(valorEn(bloque, '--sc-color-surface-1') ?? valorEn(bloqueRaiz, '--sc-color-surface-1')!, bloque))!;
      for (const rol of roles) {
        const nombre = `--sc-color-tool-${rol}`;
        const valor = valorEn(bloque, nombre) ?? valorEn(bloqueRaiz, nombre);
        const rgb = aRgb(resolver(valor!, bloque))!;
        expect(contraste(rgb, tecla), `en ${tema}, ${nombre} no se lee sobre la tecla`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('forma · la escala de radios acompaña al volumen sin inflarlo', () => {
  it('la escala es la del brandbook, y crece con el rol', () => {
    // El radio acompaña a la sombra: sin curva, el canto duro delata que el
    // volumen es un adorno pegado. El producto había bajado un escalón en todo
    // argumentando densidad; el brandbook publica 12 / 18 / 18 / 24 y es lo que
    // se implementa.
    const escala = ['--sc-radius-control', '--sc-radius-card', '--sc-radius-panel', '--sc-radius-modal']
      .map((rol) => Number((valorEn(bloqueRaiz, rol) ?? '').replace('px', '')));
    expect(escala).toEqual([12, 18, 18, 24]);

    // El dato deja de ser el escalón cero. Era la excepción mejor argumentada
    // del sistema —redondear una celda comparable rompe el barrido lineal de la
    // columna— y el brandbook la contradice con 6px. Se implementa el 6px, y la
    // comprobación de si la columna sigue leyendo bien es visual: está en las
    // capturas de hoja de datos, BOM y tabla de resultados, no aquí.
    expect(valorEn(bloqueRaiz, '--sc-radius-data')).toBe('6px');
  });

  it('ninguna hoja declara un radio literal fuera de la escala', () => {
    const infractoras: string[] = [];
    for (const hoja of rutas()) {
      if (hoja.endsWith('tokens.css')) continue;
      for (const m of contenido(hoja).matchAll(/border-radius:\s*(\d+)px/g)) {
        // `0` sigue siendo un valor válido —una barra a sangre no tiene canto—
        // y `999` es la píldora: los dos son roles, no medidas sueltas.
        if (!['0', '999'].includes(m[1])) infractoras.push(`${hoja}: ${m[0]}`);
      }
    }
    expect(infractoras).toEqual([]);
  });
});

describe('movimiento · la escala del brandbook, con un trabajo por duración', () => {
  it('las seis duraciones son las publicadas', () => {
    // Seis duraciones, no seis números: Instante acusa recibo, Rápido responde
    // al dedo, Puente cambia de plano, Revelar trae contenido, Trazar dibuja un
    // resultado y Pulso acompaña una espera. La guarda existe para que nadie
    // añada una séptima a ojo dentro de una hoja de feature.
    const escala: Record<string, string> = {
      '--sc-motion-instant': '90ms',
      '--sc-motion-quick': '140ms',
      '--sc-motion-bridge': '200ms',
      '--sc-motion-reveal': '280ms',
      '--sc-motion-trace': '520ms',
      '--sc-motion-pulse': '1400ms',
    };
    for (const [rol, valor] of Object.entries(escala)) {
      expect(valorEn(bloqueRaiz, rol), `${rol} fuera de la escala`).toBe(valor);
    }
  });

  it('trazar es la única duración que pasa de revelar sin estar procesando', () => {
    // Dibujar un diagrama de momento es la explicación de un resultado y verlo
    // aparecer de golpe no explica nada; cualquier OTRA cosa que dure más que
    // Revelar sin estar calculando es una animación de adorno.
    const ms = (rol: string) => Number((valorEn(bloqueRaiz, rol) ?? '').replace('ms', ''));
    expect(ms('--sc-motion-trace')).toBeGreaterThan(ms('--sc-motion-reveal'));
    expect(ms('--sc-motion-slow') || ms('--sc-motion-reveal')).toBeLessThanOrEqual(ms('--sc-motion-reveal'));
  });

  it('ninguna hoja declara una duración literal fuera de la escala', () => {
    const permitidas = new Set(['0', '90', '140', '200', '280', '520', '1400']);
    const infractoras: string[] = [];
    for (const hoja of rutas()) {
      if (hoja.endsWith('tokens.css')) continue;
      // El `(?<![\d.])` deja fuera el interruptor de movimiento reducido
      // (`0.01ms`, `0.001ms`): eso no es una duración, es un apagado.
      for (const m of contenido(hoja).matchAll(/(?:transition|animation)(?:-duration)?:[^;]*?(?<![\d.])(\d+)ms/g)) {
        if (!permitidas.has(m[1])) infractoras.push(`${hoja}: ${m[0].trim()}`);
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
